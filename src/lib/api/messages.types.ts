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

/**
 * contract-addendum-2.md §B.3/§B.4 — the item shape breaks for the live
 * inbox: `applicationId` goes `string` → `string | null` (a
 * PROPERTY_INQUIRY thread has none), and `kind`/`propertyId` are new. The
 * envelope itself is unchanged (E-3 — `{ conversations: [...] }`).
 */
export interface BackendConversation {
  id: string;
  /** NEW. Absent on an older back build → treat as `'APPLICATION'` (every
   * thread it can return is one). Present but not in the enum → throw (C19). */
  kind?: string;
  /** BREAKING: was `string`. `null` on a PROPERTY_INQUIRY thread. */
  applicationId: string | null;
  /** NEW top-level field. Absent on an older build → fall back to
   * `property.id`, which has always been there. */
  propertyId?: string;
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

/**
 * `GET /conversations/:id` (new) and `GET /applications/:id/chat` (the
 * compat path, still live) both return this shape. §B.1: adding `propertyId`
 * / `initiatorId` / `kind` to the raw entity is additive and safe.
 */
export interface BackendConversationWithMessages {
  id: string;
  kind?: string;
  applicationId: string | null;
  propertyId?: string;
  messages: BackendChatMessage[];
}

// ============================================================================
// Frontend mapped types
// ============================================================================

export type ConversationKind = 'APPLICATION' | 'PROPERTY_INQUIRY';

export interface ChatConversation {
  /** contract-addendum-2.md §B.3 — the identity. Selection MUST key on this,
   * never on `applicationId` (which is `null` on many rows). */
  id: string;
  kind: ConversationKind;
  /** Display / deep-link hint only. Always null-guard — never a selection key. */
  applicationId: string | null;
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

/**
 * contract-addendum-2.md §B.4 — throw-on-unknown (C19), never a silent
 * default to the wrong kind. Absent (older back build) degrades to
 * `'APPLICATION'` — every thread an older build can return is one.
 */
export function resolveConversationKind(raw: string | undefined): ConversationKind {
  if (raw === undefined) return 'APPLICATION';
  if (raw === 'APPLICATION') return 'APPLICATION';
  if (raw === 'PROPERTY_INQUIRY') return 'PROPERTY_INQUIRY';
  throw new Error(`Tipo de conversación desconocido: "${raw}".`);
}

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
    kind: resolveConversationKind(backend.kind),
    // `applicationId` passes straight through — `null` is a real, valid
    // value (a PROPERTY_INQUIRY thread), never coerced to `''`/`'null'`.
    applicationId: backend.applicationId,
    name: formatName(otherParticipant.firstName, otherParticipant.lastName),
    role: formatRole(otherParticipant.role),
    email: otherParticipant.email,
    property: property.title,
    // NEW top-level field; older back build → fall back to `property.id`.
    propertyId: backend.propertyId ?? property.id,
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
