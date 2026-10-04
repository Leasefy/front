/**
 * property-creation-session.test.ts — one idempotency key per creation session,
 * and a created property is never created twice (T-0141 contract §7).
 */
import { describe, it, expect, vi } from 'vitest';
import {
  newIdempotencyKey,
  newPropertyCreationSession,
  createPropertyOnce,
  resetPropertyCreationSession,
} from '../property-creation-session';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newIdempotencyKey', () => {
  it('is a UUID v4 that satisfies the back contract (8-64 chars, [A-Za-z0-9-])', () => {
    const key = newIdempotencyKey();
    expect(key).toMatch(UUID_V4);
    expect(key).toMatch(/^[A-Za-z0-9-]{8,64}$/);
  });

  it('is unique per call', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
});

describe('createPropertyOnce', () => {
  it('passes the session key to create and remembers the created property', async () => {
    const session = newPropertyCreationSession();
    const create = vi.fn().mockResolvedValue({ id: 'p1' });

    const property = await createPropertyOnce(session, create);

    expect(create).toHaveBeenCalledWith(session.key);
    expect(property).toEqual({ id: 'p1' });
    expect(session.property).toEqual({ id: 'p1' });
  });

  it('does NOT call create again once the property exists', async () => {
    const session = newPropertyCreationSession();
    const create = vi.fn().mockResolvedValue({ id: 'p1' });

    await createPropertyOnce(session, create);
    const again = await createPropertyOnce(session, create);

    expect(create).toHaveBeenCalledTimes(1);
    expect(again).toEqual({ id: 'p1' });
  });

  it('reuses the SAME key when create failed and is retried', async () => {
    const session = newPropertyCreationSession();
    const create = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ id: 'p1' });

    await expect(createPropertyOnce(session, create)).rejects.toThrow('network');
    await createPropertyOnce(session, create);

    expect(create.mock.calls[0][0]).toBe(create.mock.calls[1][0]);
    expect(session.property).toEqual({ id: "p1" });
  });
});

describe('resetPropertyCreationSession', () => {
  it('regenerates the key and forgets the property', async () => {
    const session = newPropertyCreationSession();
    const before = session.key;
    await createPropertyOnce(session, vi.fn().mockResolvedValue({ id: 'p1' }));

    resetPropertyCreationSession(session);

    expect(session.key).not.toBe(before);
    expect(session.property).toBeNull();
  });
});
