import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from '../config';
import { logger } from '../utils/logger';

interface Session {
  transport: StreamableHTTPServerTransport;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
}

class SessionManager {
  private sessions = new Map<string, Session>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Start cleanup timer if TTL is configured
    if (config.sessionTtlMin) {
      this.startCleanupTimer();
    }
  }

  createSession(sessionId: string, transport: StreamableHTTPServerTransport, userId: string): void {
    const now = new Date();
    this.sessions.set(sessionId, {
      transport,
      userId,
      createdAt: now,
      lastActivity: now
    });

    logger.debug('Session created', { sessionId, userId, totalSessions: this.sessions.size });
  }

  getSession(sessionId: string): StreamableHTTPServerTransport | null {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      // Update last activity
      session.lastActivity = new Date();
      return session.transport;
    }
    
    return null;
  }

  removeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      try {
        // Close the transport
        session.transport.close();
      } catch (error) {
        logger.warn('Error closing transport', { sessionId, error });
      }
      
      this.sessions.delete(sessionId);
      logger.debug('Session removed', { sessionId, totalSessions: this.sessions.size });
      return true;
    }
    
    return false;
  }

  getSessionsByUser(userId: string): string[] {
    const userSessions: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        userSessions.push(sessionId);
      }
    }
    
    return userSessions;
  }

  private startCleanupTimer(): void {
    const intervalMs = (config.sessionTtlMin! * 60 * 1000) / 2; // Check every half TTL
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, intervalMs);

    logger.info('Session cleanup timer started', { 
      intervalMinutes: intervalMs / (60 * 1000),
      ttlMinutes: config.sessionTtlMin 
    });
  }

  private cleanupExpiredSessions(): void {
    if (!config.sessionTtlMin) return;

    const now = new Date();
    const ttlMs = config.sessionTtlMin * 60 * 1000;
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now.getTime() - session.lastActivity.getTime();
      
      if (age > ttlMs) {
        expiredSessions.push(sessionId);
      }
    }

    if (expiredSessions.length > 0) {
      logger.info('Cleaning up expired sessions', { 
        count: expiredSessions.length,
        sessionIds: expiredSessions 
      });

      expiredSessions.forEach(sessionId => {
        this.removeSession(sessionId);
      });
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all active sessions
    for (const sessionId of this.sessions.keys()) {
      this.removeSession(sessionId);
    }
  }
}

export const sessionManager = new SessionManager(); 