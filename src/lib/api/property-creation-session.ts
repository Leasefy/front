/**
 * Creation session for `POST /properties` (T-0141 contract §7).
 *
 * A form that creates a property keeps ONE session for as long as the user is
 * on it:
 *  - `key` is the `Idempotency-Key` (UUID v4). It is reused on every retry, so
 *    a request that reached the back but whose answer was lost never becomes a
 *    second row.
 *  - `property` remembers the created property. Once it exists, `create` is
 *    never called again; the caller resumes at the next pending step.
 *
 * The session is reset only after a successful completion or an explicit
 * "start over".
 */

export interface PropertyCreationSession<T extends { id: string } = { id: string }> {
  key: string;
  property: T | null;
}

/** UUID v4. `crypto.randomUUID` needs a secure context; fall back for plain http dev hosts. */
export function newIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

export function newPropertyCreationSession<T extends { id: string } = { id: string }>(): PropertyCreationSession<T> {
  return { key: newIdempotencyKey(), property: null };
}

/**
 * Creates the property once per session. If it already exists, returns it
 * without calling `create`. A failed `create` leaves the session untouched, so
 * the retry carries the same key.
 */
export async function createPropertyOnce<T extends { id: string }>(
  session: PropertyCreationSession<T>,
  create: (idempotencyKey: string) => Promise<T>,
): Promise<T> {
  if (session.property) return session.property;
  const property = await create(session.key);
  session.property = property;
  return property;
}

/** Successful completion or explicit "start over": next creation gets a fresh key. */
export function resetPropertyCreationSession<T extends { id: string }>(session: PropertyCreationSession<T>): void {
  session.key = newIdempotencyKey();
  session.property = null;
}
