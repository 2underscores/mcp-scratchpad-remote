import { Router } from 'express';
import { config } from '../config';

const router = Router();

router.get('/oauth-protected-resource', (req, res) => {
  res.json({
    resource_id: config.azure.audience,
    issuer: `https://login.microsoftonline.com/${config.azure.tenantId}/v2.0`,
    scopes_supported: config.azure.allowedScopes,
    authorization_endpoint: `https://login.microsoftonline.com/${config.azure.tenantId}/oauth2/v2.0/authorize`,
    token_endpoint: `https://login.microsoftonline.com/${config.azure.tenantId}/oauth2/v2.0/token`,
    jwks_uri: `https://login.microsoftonline.com/${config.azure.tenantId}/discovery/v2.0/keys`,
    resource_metadata_uri: `${config.appBaseUrl}/.well-known/oauth-protected-resource`
  });
});

export { router as wellKnownRoutes }; 