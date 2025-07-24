import { Router } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { AuthenticatedRequest } from '../middleware/auth';
import { sessionManager } from '../services/sessionManager';
import { scratchpadTools } from '../tools/scratchpad';
import { logger } from '../utils/logger';
import { config } from '../config';

const router = Router();

// POST /mcp - Start or continue MCP session
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.oid;
    const sessionId = req.headers['mcp-session-id'] as string || 
                     `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('MCP session request', { userId, sessionId });

    // Get or create session
    let transport = sessionManager.getSession(sessionId);
    
    if (!transport) {
      // Create new MCP server instance for this session
      const server = new Server({
        name: 'mcp-scratchpad',
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {}
        }
      });

      // Register scratchpad tools
      scratchpadTools.register(server, userId, sessionId);

      // Create transport
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => sessionId
      });
      await server.connect(transport);
      
      // Store session
      sessionManager.createSession(sessionId, transport, userId);
    }

    // Set response headers for MCP
    res.setHeader('Content-Type', 'application/vnd.modelcontextprotocol+json');
    res.setHeader('X-Session-Id', sessionId);
    
    // Process the MCP request
    await transport.handleRequest(req, res, req.body);

  } catch (error) {
    logger.error('MCP request failed', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'MCP request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /mcp - End session
router.delete('/', (req: AuthenticatedRequest, res) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'X-Session-Id header required' });
    }

    const removed = sessionManager.removeSession(sessionId);
    
    if (removed) {
      logger.info('MCP session ended', { sessionId, userId: req.user!.oid });
      res.json({ message: 'Session ended successfully' });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (error) {
    logger.error('Session deletion failed', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Session deletion failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as mcpRoutes }; 