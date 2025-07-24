import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { logger } from '../utils/logger';

// Storage maps for different scopes
const sessionStorage = new Map<string, string>(); // sessionId -> content
const userStorage = new Map<string, string>();    // userId -> content  
const globalStorage = new Map<string, string>();  // 'global' -> content

const ScopeSchema = z.enum(['session', 'user', 'global']);
type Scope = z.infer<typeof ScopeSchema>;

class ScratchpadTools {
  register(server: Server, userId: string, sessionId: string): void {
    // append tool
    server.setRequestHandler({
      method: 'tools/call',
      schema: {
        name: 'append',
        description: 'Append text to a scoped scratchpad buffer',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to append to the buffer'
            },
            scope: {
              type: 'string',
              enum: ['session', 'user', 'global'],
              description: 'Storage scope: session (current session only), user (all sessions for this user), or global (shared across all users)'
            }
          },
          required: ['text', 'scope']
        }
      }
    }, async (request) => {
      try {
        const { text, scope } = request.params;
        
        // Validate scope
        const validScope = ScopeSchema.parse(scope);
        
        const key = this.getStorageKey(validScope, userId, sessionId);
        const storage = this.getStorage(validScope);
        
        const currentContent = storage.get(key) || '';
        const newContent = currentContent + (currentContent ? '\n' : '') + text;
        
        storage.set(key, newContent);
        
        logger.debug('Text appended to scratchpad', {
          scope: validScope,
          userId,
          sessionId,
          textLength: text.length,
          totalLength: newContent.length
        });
        
        return {
          content: [{
            type: 'text',
            text: `Appended ${text.length} characters to ${validScope} scratchpad. Total length: ${newContent.length} characters.`
          }]
        };
      } catch (error) {
        logger.error('Append tool error', { error: error instanceof Error ? error.message : error });
        throw new Error(`Failed to append: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // get tool
    server.setRequestHandler({
      method: 'tools/call',
      schema: {
        name: 'get',
        description: 'Get the complete content of a scoped scratchpad buffer',
        inputSchema: {
          type: 'object',
          properties: {
            scope: {
              type: 'string',
              enum: ['session', 'user', 'global'],
              description: 'Storage scope to retrieve: session, user, or global'
            }
          },
          required: ['scope']
        }
      }
    }, async (request) => {
      try {
        const { scope } = request.params;
        
        // Validate scope
        const validScope = ScopeSchema.parse(scope);
        
        const key = this.getStorageKey(validScope, userId, sessionId);
        const storage = this.getStorage(validScope);
        
        const content = storage.get(key) || '';
        
        logger.debug('Scratchpad content retrieved', {
          scope: validScope,
          userId,
          sessionId,
          contentLength: content.length
        });
        
        return {
          content: [{
            type: 'text',
            text: content || `No content in ${validScope} scratchpad.`
          }]
        };
      } catch (error) {
        logger.error('Get tool error', { error: error instanceof Error ? error.message : error });
        throw new Error(`Failed to get content: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // clear tool (bonus)
    server.setRequestHandler({
      method: 'tools/call',
      schema: {
        name: 'clear',
        description: 'Clear the content of a scoped scratchpad buffer',
        inputSchema: {
          type: 'object',
          properties: {
            scope: {
              type: 'string',
              enum: ['session', 'user', 'global'],
              description: 'Storage scope to clear: session, user, or global'
            }
          },
          required: ['scope']
        }
      }
    }, async (request) => {
      try {
        const { scope } = request.params;
        
        // Validate scope
        const validScope = ScopeSchema.parse(scope);
        
        const key = this.getStorageKey(validScope, userId, sessionId);
        const storage = this.getStorage(validScope);
        
        const hadContent = storage.has(key);
        storage.delete(key);
        
        logger.debug('Scratchpad cleared', {
          scope: validScope,
          userId,
          sessionId,
          hadContent
        });
        
        return {
          content: [{
            type: 'text',
            text: `Cleared ${validScope} scratchpad.`
          }]
        };
      } catch (error) {
        logger.error('Clear tool error', { error: error instanceof Error ? error.message : error });
        throw new Error(`Failed to clear: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  private getStorageKey(scope: Scope, userId: string, sessionId: string): string {
    switch (scope) {
      case 'session':
        return sessionId;
      case 'user':
        return userId;
      case 'global':
        return 'global';
    }
  }

  private getStorage(scope: Scope): Map<string, string> {
    switch (scope) {
      case 'session':
        return sessionStorage;
      case 'user':
        return userStorage;
      case 'global':
        return globalStorage;
    }
  }
}

export const scratchpadTools = new ScratchpadTools(); 