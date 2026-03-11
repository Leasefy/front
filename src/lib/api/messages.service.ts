import { apiClient } from './client';
import type {
  BackendConversationsResponse,
  BackendConversationWithMessages,
} from './messages.types';

export const messagesApi = {
  /** GET /messages/conversations - List all conversations for current user */
  getConversations() {
    return apiClient.get<BackendConversationsResponse>('/messages/conversations');
  },

  /** GET /messages/unread-count - Total unread messages across all conversations */
  getUnreadCount() {
    return apiClient.get<{ count: number }>('/messages/unread-count');
  },

  /** GET /applications/:id/chat - Get conversation messages */
  getMessages(applicationId: string) {
    return apiClient.get<BackendConversationWithMessages>(
      `/applications/${applicationId}/chat`,
    );
  },

  /** POST /applications/:id/chat/messages - Send a message */
  sendMessage(applicationId: string, content: string) {
    return apiClient.post<{ id: string; content: string; senderId: string; createdAt: string }>(
      `/applications/${applicationId}/chat/messages`,
      { content },
    );
  },

  /** PATCH /applications/:id/chat/read - Mark all messages as read */
  markAsRead(applicationId: string) {
    return apiClient.patch<{ message: string }>(
      `/applications/${applicationId}/chat/read`,
    );
  },
};
