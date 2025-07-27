import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { mcpRoutes } from './routes/mcp';
import { wellKnownRoutes } from './routes/wellKnown';
import { healthRoutes } from './routes/health';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'MCP-Session-Id', 'X-Session-Id']
}));

// Parse JSON bodies
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  next();
});

// Public routes (no auth required)
app.use('/.well-known', wellKnownRoutes);
app.use('/healthz', healthRoutes);

// Protected MCP routes (require Azure AD authentication)
app.use('/mcp', authMiddleware, mcpRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const server = app.listen(config.port, () => {
  logger.info(`MCP Scratchpad server starting on port ${config.port}`, {
    environment: process.env.NODE_ENV || 'development',
    baseUrl: config.appBaseUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export { app }; 