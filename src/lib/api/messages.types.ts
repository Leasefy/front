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
  /** BREAKING: era obligatorio. `null` en un hilo DIRECTO, que no cuelga de
   * ningún aviso. La clave viaja siempre. */
  property: { id: string; title: string } | null;
  /** NUEVO. La inmobiliaria del hilo DIRECTO; `null` en los otros dos. */
  agency?: { id: string; name: string; logoUrl: string | null } | null;
  /** BREAKING: era obligatorio. `null` cuando el «otro» no es una persona —
   * pasa cuando un inquilino o un propietario mira su hilo con la
   * inmobiliaria, que es una organización y no un usuario. */
  otherParticipant: BackendParticipant | null;
  lastMessage: BackendLastMessage | null;
  unreadCount: number;
  updatedAt: string;
}

export interface BackendConversationsResponse {
  conversations: BackendConversation[];
}

/**
 * A single chat message as the backend returns it TODAY. NOTE: there is no
 * `attachment` field — in-thread attachments are a backend seam (COMU-02, see
 * `ChatMessageAttachment` + `messagesApi.sendAttachment`). Do NOT add one
 * client-side and do NOT fabricate an attachment bubble; the picker discloses an
 * honest "Próximamente" until the server both accepts and returns attachments.
 */
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
  /** Lease this thread belongs to — OPTIONAL (COMU-01 external dep; see `BackendConversation.leaseId`). */
  leaseId?: string;
  /** Caso this thread belongs to — OPTIONAL (COMU-01 external dep; see `BackendConversation.caseId`). */
  caseId?: string;
  messages: BackendChatMessage[];
}

// ============================================================================
// Chat attachments + conversation actions — CONTRACT ONLY (COMU-02)
//
// Two backend gaps block real in-thread attachments today (RESEARCH §2):
//   1. No chat-attachment endpoint (no POST bound to the conversation).
//   2. `BackendChatMessage` has NO attachment field — the server never returns
//      one, so the UI cannot render an in-thread attachment bubble.
// Until BOTH land, the composer's file picker is REAL but the SEND resolves to an
// honest "Próximamente" (see `messagesApi.sendAttachment`). These types are the
// forward contract; they are intentionally NOT wired into `BackendChatMessage`
// (the backend seam) so nothing fabricates a persisted attachment.
// ============================================================================

/** A file the user picked in the chat composer, pending a real attachment endpoint. */
export interface ChatAttachmentDraft {
  file: File;
}

/**
 * Shape of an attachment once the backend returns one in-thread (FUTURE). Declared
 * here so the eventual `BackendChatMessage.attachment` has a typed target; it is
 * intentionally NOT added to `BackendChatMessage` yet (backend seam). Any future
 * bytes retrieval MUST go through `documentsApi.getSignedUrl` (no raw URL — IDOR).
 */
export interface ChatMessageAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
}

/**
 * Result of a conversation action (archive/mute/report): `'ok'` when the endpoint
 * answered, `'unavailable'` when the route is not live yet (404/403/0) — the UI
 * then shows an honest "Próximamente", never a fabricated success.
 */
export type ConversationActionResult = 'ok' | 'unavailable';

// ============================================================================
// Frontend mapped types
// ============================================================================

export type ConversationKind = 'APPLICATION' | 'PROPERTY_INQUIRY' | 'DIRECT';

/**
 * El distintivo de perfil que se pinta al lado del nombre en la conversación.
 *
 * Sale del rol REAL del interlocutor, no del hilo: en la misma bandeja de la
 * inmobiliaria conviven inquilinos, propietarios y agentes, y sin la insignia
 * no se sabe con quién se está hablando hasta leer el mensaje.
 */
export type PerfilEnLaConversacion =
  | 'TENANT'
  | 'LANDLORD'
  | 'AGENT'
  | 'AGENCY'
  | 'DESCONOCIDO';

export interface ChatConversation {
  /** contract-addendum-2.md §B.3 — the identity. Selection MUST key on this,
   * never on `applicationId` (which is `null` on many rows). */
  id: string;
  kind: ConversationKind;
  /** Display / deep-link hint only. Always null-guard — never a selection key. */
  applicationId: string | null;
  /** Lease id — OPTIONAL, carried through only when the backend returns it (COMU-01 external dep). */
  leaseId?: string;
  /** Caso id — OPTIONAL, carried through only when the backend returns it (COMU-01 external dep). */
  caseId?: string;
  name: string;
  role: string;
  /** El rol crudo, para elegir el color de la insignia sin parsear la etiqueta. */
  perfil: PerfilEnLaConversacion;
  email: string;
  /** Cadena vacía cuando el hilo no cuelga de un inmueble (hilo directo). */
  property: string;
  /** Cadena vacía en un hilo directo — nunca `'null'` ni `'undefined'`. */
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
  /**
   * El perfil de quien escribió. En un hilo directo del lado de la
   * inmobiliaria pueden contestar varios agentes distintos, así que sin esto
   * no se sabe quién dijo qué.
   */
  perfil: PerfilEnLaConversacion;
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
  if (raw === 'DIRECT') return 'DIRECT';
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
    case 'ADMIN': return 'Administrador';
    case 'AGENCY': return 'Inmobiliaria';
    default: return role;
  }
}

/** El rol crudo, normalizado. Lo desconocido se dice, no se disfraza. */
function resolverPerfil(role: string | undefined): PerfilEnLaConversacion {
  switch (role) {
    case 'TENANT': return 'TENANT';
    case 'LANDLORD': return 'LANDLORD';
    case 'AGENT': return 'AGENT';
    case 'AGENCY': return 'AGENCY';
    default: return 'DESCONOCIDO';
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
  const { otherParticipant, lastMessage, property, agency } = backend;

  // Cuando del otro lado NO hay una persona, el interlocutor es la
  // inmobiliaria. No se la disfraza de usuario: se la nombra como lo que es y
  // el perfil pasa a 'AGENCY', que es lo que pinta la insignia.
  const esLaAgencia = !otherParticipant && !!agency;
  const rolCrudo = esLaAgencia ? 'AGENCY' : otherParticipant?.role;

  return {
    id: backend.id,
    kind: resolveConversationKind(backend.kind),
    // `applicationId` passes straight through — `null` is a real, valid
    // value (a PROPERTY_INQUIRY thread), never coerced to `''`/`'null'`.
    applicationId: backend.applicationId,
    // Passthrough ONLY when the backend returns them (COMU-01 external dep) —
    // stays `undefined` today; never fabricated or derived from applicationId.
    leaseId: backend.leaseId,
    caseId: backend.caseId,
    name: esLaAgencia
      ? agency!.name
      : otherParticipant
        ? formatName(otherParticipant.firstName, otherParticipant.lastName)
        : 'Usuario',
    role: formatRole(rolCrudo ?? ''),
    perfil: resolverPerfil(rolCrudo),
    email: otherParticipant?.email ?? '',
    // Vacío, no `'null'`: la pantalla ya trata la cadena vacía como «sin
    // inmueble» y la pinta omitiéndola.
    property: property?.title ?? '',
    // NEW top-level field; older back build → fall back to `property.id`.
    propertyId: backend.propertyId ?? property?.id ?? '',
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
    perfil: resolverPerfil(backend.sender.role),
    readAt: backend.readAt,
    createdAt: backend.createdAt,
  };
}

// ============================================================================
// Hilos directos — a quién puedo escribirle
// ============================================================================

/** Una persona a la que la inmobiliaria le puede escribir. */
export interface DestinatarioPersona {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  email: string;
  avatarUrl: string | null;
}

/** Una inmobiliaria a la que un inquilino o un propietario le puede escribir. */
export interface DestinatarioAgencia {
  id: string;
  name: string;
  logoUrl: string | null;
}

/**
 * Las dos claves viajan SIEMPRE, una vacía. `tipo` dice cuál mirar, pero el
 * front no necesita ramificar antes de leer: recorrer la vacía no rompe nada.
 */
export interface DestinatariosDirectos {
  tipo: 'PERSONAS' | 'AGENCIAS';
  personas: DestinatarioPersona[];
  agencias: DestinatarioAgencia[];
}

/** Cómo nombrar a un destinatario en la lista. */
export function nombreDelDestinatario(p: DestinatarioPersona): string {
  const partes = [p.firstName, p.lastName].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : p.email;
}
