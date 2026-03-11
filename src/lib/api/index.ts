/**
 * Leasefy AI API module.
 *
 * Single import path for all API client functionality:
 *   import { aiClient, isMockMode, type ChatStreamEvent } from '@/lib/api';
 *   import { parseSSEStream, connectChatStream } from '@/lib/api';
 *   import { mockChatStream, mockApi } from '@/lib/api';
 */

export * from './types';
export * from './config';
export { aiClient, LeasefyAIClient } from './client';
export { parseSSEStream, connectChatStream } from './streaming';
export { mockChatStream, mockApi } from './mock';
