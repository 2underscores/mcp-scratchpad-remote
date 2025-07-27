import { z } from 'zod';
import { config as loadEnv } from 'dotenv';

// Load environment variables from .env file
loadEnv();

const configSchema = z.object({
  port: z.number().int().min(1).max(65535),
  appBaseUrl: z.string().url(),
  azure: z.object({
    tenantId: z.string().uuid(),
    audience: z.string().min(1),
    allowedScopes: z.array(z.string()).min(1)
  }),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']),
  tunnelHostname: z.string().optional(),
  sessionTtlMin: z.number().int().min(1).optional()
});

export type Config = z.infer<typeof configSchema>;

function createConfig(): Config {
  const rawConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
    azure: {
      tenantId: process.env.AZURE_TENANT_ID || '',
      audience: process.env.AZURE_AUDIENCE || '',
      allowedScopes: (process.env.AZURE_ALLOWED_SCOPES || '').split(' ').filter(Boolean)
    },
    logLevel: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug',
    tunnelHostname: process.env.TUNNEL_HOSTNAME,
    sessionTtlMin: process.env.SESSION_TTL_MIN ? parseInt(process.env.SESSION_TTL_MIN, 10) : undefined
  };

  console.log(rawConfig);
  try {
    return configSchema.parse(rawConfig);
  } catch (error) {
    console.error('Configuration validation failed:', error);
    process.exit(1);
  }
}

export const config = createConfig(); 