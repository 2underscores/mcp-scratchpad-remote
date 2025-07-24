import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    oid: string;
    preferred_username?: string;
    scopes: string[];
  };
}

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${config.azure.tenantId}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000 // 10 minutes
});

function getKey(header: any, callback: (err: Error | null, key?: string) => void) {
  client.getSigningKey(header.kid, (err: Error | null, key: any) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey?.() || key?.rsaPublicKey;
    callback(null, signingKey);
  });
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: 'Authorization header missing or invalid',
        details: 'Expected: Bearer <token>'
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify JWT
    const decoded = await new Promise<any>((resolve, reject) => {
      jwt.verify(token, getKey, {
        audience: config.azure.audience,
        issuer: [`https://login.microsoftonline.com/${config.azure.tenantId}/v2.0`],
        algorithms: ['RS256']
      }, (err: Error | null, decoded: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      });
    });

    // Validate required claims
    if (!decoded.sub || !decoded.oid) {
      res.status(401).json({ 
        error: 'Invalid token claims',
        details: 'Missing required user identifiers'
      });
      return;
    }

    // Check audience
    if (decoded.aud !== config.azure.audience) {
      res.status(401).json({ 
        error: 'Invalid audience',
        details: `Expected: ${config.azure.audience}`
      });
      return;
    }

    // Extract and validate scopes
    const tokenScopes = (decoded.scp || '').split(' ').filter(Boolean);
    const hasRequiredScope = config.azure.allowedScopes.some(scope => 
      tokenScopes.includes(scope)
    );

    if (!hasRequiredScope) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        details: `Required scopes: ${config.azure.allowedScopes.join(', ')}`,
        provided: tokenScopes
      });
      return;
    }

    // Attach user info to request
    req.user = {
      sub: decoded.sub,
      oid: decoded.oid,
      preferred_username: decoded.preferred_username,
      scopes: tokenScopes
    };

    logger.debug('User authenticated', {
      userId: decoded.oid,
      username: decoded.preferred_username,
      scopes: tokenScopes
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', { error: error instanceof Error ? error.message : error });
    
    res.status(401).json({ 
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export type { AuthenticatedRequest }; 