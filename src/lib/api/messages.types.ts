// ============================================================================
// Backend response types (from /messages/* and /applications/:id/chat)
// ============================================================================

export interface BackendParticipant {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  email: string;
}

export interface BackendLastMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
}

export interface BackendConversation {
  id: string;
  applicationId: string;
  /**
   * Lease this conversation belongs to. OPTIONAL — the current backend groups
   * chat by `applicationId` only and does NOT return this yet (COMU-01 external
   * dep: NestJS lease-scoped `messages.service.ts`). Present only once the
   * server groups by lease; never derived from `applicationId` client-side.
   */
  leaseId?: string;
  /**
   * Caso this conversation belongs to. OPTIONAL — same external dep as
   * `leaseId`; carried through only when the backend returns it.
   */
  caseId?: string;
  property: { id: string; title: string };
  otherParticipant: BackendParticipant;
  lastMessage: BackendLastMessage | null;
  unreadCount: number;
  updatedAt: string;
}

export interface BackendConversationsResponse {
  conversations: BackendConversation[];
}

export interface BackendChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  sender: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
}

export interface BackendConversationWithMessages {
  id: string;
  applicationId: string;
  /** Lease this thread belongs to — OPTIONAL (COMU-01 external dep; see `BackendConversation.leaseId`). */
  leaseId?: string;
  /** Caso this thread belongs to — OPTIONAL (COMU-01 external dep; see `BackendConversation.caseId`). */
  caseId?: string;
  messages: BackendChatMessage[];
}

// ============================================================================
// Frontend mapped types
// ============================================================================

export interface ChatConversation {
  id: string;
  applicationId: string;
  /** Lease id — OPTIONAL, carried through only when the backend returns it (COMU-01 external dep). */
  leaseId?: string;
  /** Caso id — OPTIONAL, carried through only when the backend returns it (COMU-01 external dep). */
  caseId?: string;
  name: string;
  role: string;
  email: string;
  property: string;
  propertyId: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  isMine: boolean;
  senderName: string;
  readAt: string | null;
  createdAt: string;
}

// ============================================================================
// Mappers
// ============================================================================

function formatName(firstName: string | null, lastName: string | null): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Usuario';
}

function formatRole(role: string): string {
  switch (role) {
    case 'LANDLORD': return 'Propietario';
    case 'TENANT': return 'Inquilino';
    case 'AGENT': return 'Agente';
    default: return role;
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) {
    return date.toLocaleDateString('es-CO', { weekday: 'short' });
  }
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export function mapToConversation(backend: BackendConversation): ChatConversation {
  const { otherParticipant, lastMessage, property } = backend;
  return {
    id: backend.id,
    applicationId: backend.applicationId,
    // Passthrough ONLY when the backend returns them (COMU-01 external dep) —
    // stays `undefined` today; never fabricated or derived from applicationId.
    leaseId: backend.leaseId,
    caseId: backend.caseId,
    name: formatName(otherParticipant.firstName, otherParticipant.lastName),
    role: formatRole(otherParticipant.role),
    email: otherParticipant.email,
    property: property.title,
    propertyId: property.id,
    lastMessage: lastMessage?.content ?? '',
    lastMessageTime: lastMessage ? formatTime(lastMessage.createdAt) : '',
    unreadCount: backend.unreadCount,
    updatedAt: backend.updatedAt,
  };
}

export function mapToMessage(backend: BackendChatMessage, currentUserId: string): ChatMessage {
  return {
    id: backend.id,
    content: backend.content,
    isMine: backend.senderId === currentUserId,
    senderName: formatName(backend.sender.firstName, backend.sender.lastName),
    readAt: backend.readAt,
    createdAt: backend.createdAt,
  };
}
