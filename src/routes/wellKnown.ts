import { Router } from 'express';
import { config } from '../config';

const router = Router();

router.get(['/oauth-protected-resource', '/oauth-protected-resource/mcp'], (req, res) => {
  res.json({
    resource: config.appBaseUrl,
    authorization_servers: [
      `https://login.microsoftonline.com/${config.azure.tenantId}/v2.0`,
    ],
    scopes_supported: config.azure.allowedScopes,
    jwks_uri: `https://login.microsoftonline.com/${config.azure.tenantId}/discovery/v2.0/keys`
  });
});

export { router as wellKnownRoutes };