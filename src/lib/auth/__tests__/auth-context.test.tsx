/**
 * auth-context.test.tsx — self-healing agency fetch.
 *
 * Bug under test: fetchAgency() only ever runs inside onAuthStateChange
 * handlers (one shot per auth event). If that single shot fails (network
 * blip, dev HMR partial reload), `agency` stays null for the rest of the
 * session with nothing ever re-requesting it — breaking useBetaChat and
 * the postulaciones panel, which both gate on `agency?.id`.
 *
 * This suite verifies AuthProvider:
 *   (1) self-heals: when `user` is agency-capable and `agency` is null,
 *       it retries `fetchAgencyProfile` with bounded backoff (0s/2s/8s)
 *       WITHOUT needing another Supabase auth event,
 *   (2) gives up after the backoff schedule is exhausted (no infinite loop),
 *   (3) exposes `refreshAgency()` to manually retry and re-arm the backstop,
 *   (4) never lets a failed fetch downgrade an already-loaded agency.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ---------------------------------------------------------------------------
// Mocks — declared before importing the module under test.
// ---------------------------------------------------------------------------

type AuthEventHandler = (event: string, session: unknown) => void | Promise<void>

// `vi.mock` factories are hoisted above regular top-level declarations, so
// any mock fn referenced inside them must come from `vi.hoisted`.
const { fetchUserGetMock, fetchAgencyProfileMock, unsubscribeSpy } = vi.hoisted(() => ({
  fetchUserGetMock: vi.fn(),
  fetchAgencyProfileMock: vi.fn(),
  unsubscribeSpy: vi.fn(),
}))

let capturedHandler: AuthEventHandler | null = null

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: {
      onAuthStateChange: (handler: AuthEventHandler) => {
        capturedHandler = handler
        return { data: { subscription: { unsubscribe: unsubscribeSpy } } }
      },
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } }),
      },
    },
  }),
}))

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client')
  return {
    ...actual,
    // `post` mockeado: neutraliza el single-session claim (POST
    // /auth/session/claim) que corre en el bootstrap, para que los tests de
    // self-heal no dependan de la red real (si hay backend en :3000 el claim
    // real devolvía 401 y colgaba el test bajo fake timers).
    apiClient: {
      ...actual.apiClient,
      get: fetchUserGetMock,
      post: vi.fn().mockResolvedValue({ superseded: false }),
    },
    setAccessToken: vi.fn(),
  }
})

// T-0082 WU-2b: `agency-fetch.ts` gained `agencyResultFromBootstrap` — a pure
// translation function `auth-context.tsx`'s `fetchBootstrap` calls on EVERY
// bootstrap resolution (INITIAL_SESSION/SIGNED_IN/refreshUser), not just the
// self-heal path this suite exercises. Mocking the module without carrying
// the real export through makes it `undefined` here, so every bootstrap call
// throws internally and silently degrades to the session-fallback branch —
// only `fetchAgencyProfile` (the standalone probe) is meant to be mocked.
vi.mock('../agency-fetch', async () => {
  const actual = await vi.importActual<typeof import('../agency-fetch')>('../agency-fetch')
  return {
    ...actual,
    fetchAgencyProfile: (...args: unknown[]) => fetchAgencyProfileMock(...args),
  }
})

vi.mock('@/lib/firebase/messaging', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue(null),
  removeFcmToken: vi.fn().mockResolvedValue(undefined),
}))

import { AuthProvider } from '../auth-context'
import { useAuth } from '../use-auth'
import type { AuthContextType } from '../types'
import { resetSessionTerminal } from '../session-terminal'
import { consumePermissionsSeed, clearBootstrapSeed } from '../bootstrap-seed'

interface HarnessRef {
  current: AuthContextType | null
}

function mountHarness(): { ref: HarnessRef; root: Root; container: HTMLDivElement } {
  const ref: HarnessRef = { current: null }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  const Harness = () => {
    ref.current = useAuth()
    return null
  }

  act(() => {
    root.render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    )
  })

  return { ref, root, container }
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

const AGENT_USER_BACKEND = {
  id: 'user-1',
  email: 'agente@test.com',
  firstName: 'Agente',
  lastName: 'Test',
  role: 'AGENT',
}

const SESSION = {
  access_token: 'token-abc',
  user: { app_metadata: { providers: ['email'] }, email_confirmed_at: '2026-01-01T00:00:00Z' },
}

async function fireInitialSession() {
  await act(async () => {
    await capturedHandler?.('INITIAL_SESSION', SESSION)
  })
}

/**
 * T-0082 WU-2b: `apiClient.get` is mocked generically to `fetchUserGetMock`
 * here (no path filtering in the original suite), which used to be fine
 * because only `/users/me` was ever fetched through it — the agency side
 * went through the separately-mocked `fetchAgencyProfile`. Now
 * `GET /users/me/bootstrap` ALSO goes through `apiClient.get`, and its shape
 * (`{user, role, agency, ...}`) is different from `/users/me`'s flat body —
 * so every mock in this file routes by path. `/users/me` stays flat (still
 * used, unchanged, by TOKEN_REFRESHED's `fetchUser`).
 */
function mockBootstrapAndUser(
  user: Record<string, unknown>,
  role: string,
  agency: Record<string, unknown> | null = null,
  errors: string[] = [],
) {
  fetchUserGetMock.mockImplementation((path: string) =>
    path === '/users/me/bootstrap'
      ? Promise.resolve({ user, role, agency, subscription: null, onboarding: null, errors })
      : Promise.resolve(user),
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  capturedHandler = null
  fetchUserGetMock.mockReset()
  fetchAgencyProfileMock.mockReset()
  mockBootstrapAndUser(AGENT_USER_BACKEND, 'AGENT')
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/**
 * T-0082 WU-1 (F3) rewrote this suite: the self-heal backstop used to retry
 * with a 3-attempt backoff (`[0, 2000, 8000]` ms — up to 4 probes per
 * session) whenever the user was agency-capable, REGARDLESS of whether the
 * failure was transient or a confirmed "not a member". It now fires exactly
 * ONE guarded retry (at `AGENCY_SELF_HEAL_RETRY_DELAY_MS` = 2s), and only
 * when the previous probe result was `transientFailure: true` — for every
 * role, agency-capable included. A confirmed no-membership result is
 * terminal; `refreshAgency()` (the user's "Intentar de nuevo") is the only
 * way back from there.
 */
describe('AuthProvider — agency self-healing (single guarded retry)', () => {
  it('retries ONCE, after the retry delay, when the bootstrap reports agency_unavailable — and adopts a later success', async () => {
    // T-0082 WU-2b: the bootstrap now composes agency in the SAME response as
    // the user — no more "direct fetch inside INITIAL_SESSION" call to the
    // standalone probe. `agency_unavailable` in the bootstrap's `errors[]` is
    // what arms the self-heal, which STILL uses the unchanged standalone
    // `fetchAgencyProfile` for its one guarded retry.
    mockBootstrapAndUser(AGENT_USER_BACKEND, 'AGENT', null, ['agency_unavailable'])
    fetchAgencyProfileMock
      .mockResolvedValueOnce({ agency: { id: 'AGY-1', name: 'Test Agency' }, role: 'ADMIN', memberStatus: 'ACTIVE', confirmedNoMembership: false, transientFailure: false }) // the single retry

    const { ref, root, container } = mountHarness()
    await fireInitialSession()

    // The bootstrap resolved the initial verdict itself — zero standalone
    // probe calls yet.
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(0)
    expect(ref.current?.agency).toBeNull()

    // The single retry fires after the retry delay (2s) — never at +0ms.
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)
    expect(ref.current?.agency).toEqual({ id: 'AGY-1', name: 'Test Agency' })
    expect(ref.current?.agencyRole).toBe('ADMIN')

    act(() => root.unmount())
    container.remove()
  })

  it('does NOT retry a second time even if the single retry also fails transiently — no infinite loop', async () => {
    mockBootstrapAndUser(AGENT_USER_BACKEND, 'AGENT', null, ['agency_unavailable'])
    fetchAgencyProfileMock.mockResolvedValue({ agency: null, role: null, memberStatus: null, confirmedNoMembership: false, transientFailure: true })

    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(0)

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })
    // The single retry — no further attempt scheduled.
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)
    expect(ref.current?.agency).toBeNull()

    // Advancing well past the old (removed) 8s attempt must not trigger a
    // second automatic call.
    await act(async () => {
      vi.advanceTimersByTime(60_000)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)

    act(() => root.unmount())
    container.remove()
  })

  it('a CONFIRMED no-membership bootstrap result on a pure-agency (AGENT) user is NOT retried either', async () => {
    // Old behavior: an agency-capable role retried on ANY missing agency,
    // including a confirmed 404/403/410 — this could storm a revoked or
    // never-a-member AGENT indefinitely. That special case is gone: only
    // `agency_unavailable` (transient) arms a retry, for every role. Here the
    // bootstrap's OWN verdict is "confirmed no membership" (agency: null,
    // errors: []) — no standalone probe call at all, ever.
    mockBootstrapAndUser(AGENT_USER_BACKEND, 'AGENT', null, [])

    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(0)

    await act(async () => {
      vi.advanceTimersByTime(60_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(0)
    expect(ref.current?.agency).toBeNull()

    act(() => root.unmount())
    container.remove()
  })

  it('refreshAgency() reuses a fresh probe and re-arms one more guarded retry when the result is still transient', async () => {
    mockBootstrapAndUser(AGENT_USER_BACKEND, 'AGENT', null, ['agency_unavailable'])
    fetchAgencyProfileMock.mockResolvedValue({ agency: null, role: null, memberStatus: null, confirmedNoMembership: false, transientFailure: true })

    const { ref, root, container } = mountHarness()
    await fireInitialSession()

    // Exhaust the single automatic retry (armed by the bootstrap's own
    // agency_unavailable verdict).
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)

    // Manual refresh — still transient, so it re-arms one more retry.
    await act(async () => {
      await (ref.current as AuthContextType & { refreshAgency: () => Promise<void> }).refreshAgency()
    })
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(2)
    expect(ref.current?.agency).toBeNull()

    // The re-armed retry succeeds.
    fetchAgencyProfileMock.mockResolvedValueOnce({ agency: { id: 'AGY-2', name: 'Recovered' }, role: 'VIEWER', memberStatus: 'ACTIVE', confirmedNoMembership: false, transientFailure: false })
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(3)
    expect(ref.current?.agency).toEqual({ id: 'AGY-2', name: 'Recovered' })

    act(() => root.unmount())
    container.remove()
  })

  it('preserves an already-loaded agency when a later fetch fails (never downgrade)', async () => {
    // The initial load now comes from the bootstrap's OWN embedded agency —
    // no standalone probe call for this path anymore.
    mockBootstrapAndUser(AGENT_USER_BACKEND, 'AGENT', { id: 'AGY-1', name: 'Loaded Agency', memberRole: 'ADMIN', memberStatus: 'ACTIVE', permissions: null })

    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(0)
    expect(ref.current?.agency).toEqual({ id: 'AGY-1', name: 'Loaded Agency' })

    // A subsequent TOKEN_REFRESHED event whose agency fetch fails must not
    // wipe it. TOKEN_REFRESHED is unchanged by WU-2b — still fetchUser (flat
    // /users/me) + the standalone probe.
    fetchAgencyProfileMock.mockResolvedValueOnce({ agency: null, role: null })
    await act(async () => {
      await capturedHandler?.('TOKEN_REFRESHED', SESSION)
    })

    expect(ref.current?.agency).toEqual({ id: 'AGY-1', name: 'Loaded Agency' })
    expect(ref.current?.agencyRole).toBe('ADMIN')

    act(() => root.unmount())
    container.remove()
  })
})

describe('AuthProvider — dual-context TENANT self-heal (lastProbeTransient path)', () => {
  const TENANT_BACKEND = {
    id: 'u-tenant',
    email: 'tenant@test.com',
    firstName: 'Tina',
    lastName: 'Tenant',
    role: 'TENANT',
    onboardingCompletedAt: '2026-01-01T00:00:00Z',
  }

  it('a TRANSIENT probe failure arms self-heal for a personal-role TENANT and resolves ACTIVE', async () => {
    // The bootstrap's own agency_unavailable verdict arms lastProbeTransient —
    // the standalone probe fires only for the single guarded retry.
    mockBootstrapAndUser(TENANT_BACKEND, 'TENANT', null, ['agency_unavailable'])
    fetchAgencyProfileMock
      // the single guarded retry → ACTIVE
      .mockResolvedValueOnce({ agency: { id: 'AGY-9', name: 'Recovered' }, role: 'AGENTE', memberStatus: 'ACTIVE', confirmedNoMembership: false, transientFailure: false })

    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    await flushPromises()

    // A TENANT is NOT agency-capable, so only the transient signal armed self-heal.
    expect(ref.current?.user?.role).toBe('tenant')
    expect(ref.current?.agency).toBeNull()

    // The single retry fires after the retry delay (2s), not at +0ms.
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(ref.current?.agency).toEqual({ id: 'AGY-9', name: 'Recovered' })
    expect(ref.current?.hasActiveAgencyMembership).toBe(true)

    act(() => root.unmount())
    container.remove()
  })

  it('a CONFIRMED no-membership TENANT is NOT retried (no self-heal storm)', async () => {
    // The bootstrap's own verdict is "confirmed no membership" (agency: null,
    // errors: []) — the standalone probe is never called for this path.
    mockBootstrapAndUser(TENANT_BACKEND, 'TENANT', null, [])

    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    await flushPromises()
    const callsAfterInitial = fetchAgencyProfileMock.mock.calls.length

    // Advance well past the single retry delay.
    await act(async () => {
      vi.advanceTimersByTime(60_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    // Confirmed no-membership does NOT arm lastProbeTransient → zero retries.
    expect(fetchAgencyProfileMock.mock.calls.length).toBe(callsAfterInitial)
    expect(ref.current?.agency).toBeNull()
    expect(ref.current?.hasActiveAgencyMembership).toBe(false)

    act(() => root.unmount())
    container.remove()
  })
})

/**
 * T-0082 WU-1 (F3) — every caller of the standalone agency probe shares ONE
 * in-flight promise via `probeAgencyMembership`. T-0082 WU-2b changes WHEN
 * this matters: a successful bootstrap now composes agency inline (no
 * standalone probe call at all — see the self-healing describe block above),
 * so `refreshUser()` no longer fires a redundant probe on its OWN success
 * path (its `agencyResult` is non-null whenever the bootstrap itself
 * succeeds, seeded straight from the SAME response — see `auth-context.tsx`).
 * The dedup still matters for two STANDALONE callers racing each other: the
 * self-heal's automatic retry and a user's manual "Intentar de nuevo"
 * (`refreshAgency()`).
 */
describe('AuthProvider — probeAgencyMembership de-dup (concurrent standalone callers share one in-flight probe)', () => {
  it('refreshAgency() reuses an already-in-flight self-heal retry instead of firing a second /inmobiliaria/agency request', async () => {
    let resolveProbe!: (v: unknown) => void
    // The bootstrap's own agency_unavailable verdict arms the self-heal.
    mockBootstrapAndUser(AGENT_USER_BACKEND, 'AGENT', null, ['agency_unavailable'])
    fetchAgencyProfileMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveProbe = resolve
        }),
    )

    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(0)

    // The single self-heal retry fires after the retry delay (2s) and hangs
    // (resolveProbe not called yet) — still "in flight".
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)

    // A manual "Intentar de nuevo" while the retry is still pending must
    // reuse the SAME in-flight promise, not fire a second request.
    let refreshAgencySettled = false
    const refreshPromise = ref.current!.refreshAgency().then(() => {
      refreshAgencySettled = true
    })
    await flushPromises()
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)
    expect(refreshAgencySettled).toBe(false)

    await act(async () => {
      resolveProbe({ agency: { id: 'AGY-1', name: 'X' }, role: 'ADMIN', memberStatus: 'ACTIVE', confirmedNoMembership: false, transientFailure: false })
      await refreshPromise
    })

    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)
    expect(ref.current?.agency).toEqual({ id: 'AGY-1', name: 'X' })

    act(() => root.unmount())
    container.remove()
  })
})

/**
 * T-0082 WU-1 remediation (verify-1.md §2 CRITICAL) — `agencyProbeInFlightRef`
 * shares ONE in-flight `/inmobiliaria/agency` promise across every caller with
 * NO token/identity check at all (unlike `apiClient.get`'s `compartirGet`,
 * which is now keyed by path+token). Without clearing the ref on `SIGNED_OUT`,
 * a probe still pending for the session that just ended would be handed,
 * unchanged, to the NEXT session's own probe — mixing two identities in one
 * response, the worst possible error here. `AuthProvider` now sets
 * `agencyProbeInFlightRef.current = null` in its `SIGNED_OUT` handler.
 */
describe('AuthProvider — agencyProbeInFlightRef is cleared on SIGNED_OUT', () => {
  afterEach(() => resetSessionTerminal())

  it('a probe left pending by the previous session is discarded on SIGNED_OUT — the next session starts its OWN probe, not the stale one', async () => {
    // T-0082 WU-2b: a successful bootstrap composes agency inline and never
    // calls the standalone probe at all (see the self-healing describe block
    // above). To exercise the standalone probe here — the thing this test is
    // actually about — the bootstrap call itself must fail wholesale for
    // BOTH sessions, which is a real, contract-documented fallback path
    // (contract.md §3.2: "5xx/network → the degraded Supabase-session
    // fallback", `fetchBootstrap`'s `if (session)` branch): the caller then
    // falls back to firing the standalone probe fire-and-forget, exactly
    // like before WU-2b.
    fetchUserGetMock.mockImplementation(() => Promise.reject(new Error('bootstrap down (test)')))

    // User A's probe never resolves within this test — it stays "in flight"
    // forever, exactly the scenario that must not leak into user B.
    fetchAgencyProfileMock.mockImplementationOnce(() => new Promise(() => {}))

    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)
    expect(ref.current?.agency).toBeNull()

    await act(async () => {
      await capturedHandler?.('SIGNED_OUT', null)
    })

    // User B signs in, in the same tab, while A's probe is still (forever)
    // pending. Without the SIGNED_OUT clear, `probeAgencyMembership` would see
    // `agencyProbeInFlightRef.current` still set to A's promise and return it
    // directly — B would inherit A's null/never-resolving result and
    // `fetchAgencyProfileMock` would NOT be called again. B's bootstrap call
    // also fails wholesale (mock above is unconditional), so B falls back to
    // the standalone probe too.
    fetchAgencyProfileMock.mockResolvedValueOnce({
      agency: { id: 'AGY-B', name: 'Otra Agencia' },
      role: 'ADMIN',
      memberStatus: 'ACTIVE',
      confirmedNoMembership: false,
      transientFailure: false,
    })
    await act(async () => {
      await capturedHandler?.('SIGNED_IN', { ...SESSION, access_token: 'token-de-B' })
    })
    await flushPromises()

    // A fresh probe fired for B — proves the stale ref was cleared, not reused.
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(2)
    expect(ref.current?.agency).toEqual({ id: 'AGY-B', name: 'Otra Agencia' })

    act(() => root.unmount())
    container.remove()
  })
})

/**
 * T-0082 WU-1 remediation round 2 (verify-3.md CRITICAL) — clearing
 * `agencyProbeInFlightRef` on SIGNED_OUT (round 1, above) stops a NEW caller
 * from joining an OLD promise, but does nothing about the OLD coroutine
 * itself: `probeAgencyMembership`'s async IIFE keeps running in the
 * background (no `AbortController` in this client) and, when it finally
 * settles, used to call `applyAgencyFetchResult` UNCONDITIONALLY — mixing
 * identity A's stale agency data into identity B's already-correct session
 * state the moment A's orphaned probe landed. Same for a stale `/users/me`
 * write. `sessionGenerationRef` closes this: every fire-and-forget async path
 * captures the generation at its own start and drops its write silently if
 * the generation has moved on by the time it would write.
 */
describe('AuthProvider — session generation guard (verify-3.md CRITICAL)', () => {
  afterEach(() => resetSessionTerminal())

  it("an orphaned agency probe for the PREVIOUS session must not clobber the NEXT session's agency state when it finally resolves late", async () => {
    // T-0082 WU-2b: force both sessions' bootstrap calls to fail wholesale —
    // a real, contract-documented fallback (§3.2's "5xx/network → the
    // degraded Supabase-session fallback") — so both fall back to firing the
    // standalone probe, which is the mechanism this test exercises. A
    // successful bootstrap would compose agency inline and never call it.
    fetchUserGetMock.mockImplementation(() => Promise.reject(new Error('bootstrap down (test)')))

    // User A's probe never resolves until we explicitly settle it below —
    // simulating a real late network response landing after the tab has
    // already moved on to a different signed-in user.
    let resolveA!: (v: unknown) => void
    fetchAgencyProfileMock.mockImplementationOnce(
      () => new Promise((resolve) => { resolveA = resolve }),
    )

    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)
    expect(ref.current?.agency).toBeNull()

    await act(async () => {
      await capturedHandler?.('SIGNED_OUT', null)
    })

    // User B signs in, in the same tab, while A's probe is still pending.
    fetchAgencyProfileMock.mockResolvedValueOnce({
      agency: { id: 'AGY-B', name: 'Agencia de B' },
      role: 'ADMIN',
      memberStatus: 'ACTIVE',
      confirmedNoMembership: false,
      transientFailure: false,
    })
    await act(async () => {
      await capturedHandler?.('SIGNED_IN', { ...SESSION, access_token: 'token-de-B' })
    })
    await flushPromises()
    expect(ref.current?.agency).toEqual({ id: 'AGY-B', name: 'Agencia de B' })

    // NOW A's orphaned probe finally resolves, late, with A's real data.
    await act(async () => {
      resolveA({
        agency: { id: 'AGY-A', name: 'Agencia de A' },
        role: 'VIEWER',
        memberStatus: 'ACTIVE',
        confirmedNoMembership: false,
        transientFailure: false,
      })
      await flushPromises()
    })

    // B's already-correct agency state must remain untouched by A's stale,
    // late-arriving result — this is the exact scenario verify-3.md proved
    // reachable with a scratch test against the un-fixed code.
    expect(ref.current?.agency).toEqual({ id: 'AGY-B', name: 'Agencia de B' })
    expect(ref.current?.agencyRole).toBe('ADMIN')

    act(() => root.unmount())
    container.remove()
  })

  it("an orphaned refreshUser() call from the PREVIOUS session must not clobber the NEXT session's user when its /users/me resolves late", async () => {
    // A signs in normally first.
    fetchAgencyProfileMock.mockResolvedValue({
      agency: null,
      role: null,
      memberStatus: null,
      confirmedNoMembership: false,
      transientFailure: false,
    })
    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    expect(ref.current?.user?.id).toBe('user-1')

    // A calls refreshUser() (e.g. after saving a profile edit) — its
    // /users/me resolves LATE, after A has since signed out and B has signed
    // in in the same tab. Nothing in this client can cancel the request, so
    // this is a realistic race, not a contrived one.
    let resolveA!: (v: unknown) => void
    fetchUserGetMock.mockImplementationOnce(() => new Promise((resolve) => { resolveA = resolve }))
    let refreshSettled = false
    const refreshPromise = ref.current!.refreshUser().then(() => {
      refreshSettled = true
    })
    await flushPromises()
    expect(refreshSettled).toBe(false)

    // A signs out, then B signs in — while A's refreshUser() is still pending.
    await act(async () => {
      await capturedHandler?.('SIGNED_OUT', null)
    })
    // T-0082 WU-2b: SIGNED_IN now goes through `fetchBootstrap` (the bootstrap
    // envelope shape), not the old flat `fetchUser` body.
    fetchUserGetMock.mockResolvedValueOnce({
      user: { ...AGENT_USER_BACKEND, id: 'user-2', email: 'b@test.com' },
      role: 'AGENT',
      agency: null,
      subscription: null,
      onboarding: null,
      errors: [],
    })
    await act(async () => {
      await capturedHandler?.('SIGNED_IN', { ...SESSION, access_token: 'token-de-B' })
    })
    await flushPromises()
    expect(ref.current?.user?.id).toBe('user-2')

    // NOW A's orphaned refreshUser() call finally resolves with A's stale
    // data — also a bootstrap envelope, since `refreshUser` uses
    // `fetchBootstrap` too (T-0082 WU-2b).
    await act(async () => {
      resolveA({ user: AGENT_USER_BACKEND, role: 'AGENT', agency: null, subscription: null, onboarding: null, errors: [] }) // id: 'user-1'
      await refreshPromise
      await flushPromises()
    })

    // B's user must remain untouched by A's stale, late-arriving result.
    expect(ref.current?.user?.id).toBe('user-2')

    act(() => root.unmount())
    container.remove()
  })

  it('a same-user TOKEN_REFRESHED does NOT bump the generation — its in-flight /users/me result is still applied normally', async () => {
    // TOKEN_REFRESHED also fires a fire-and-forget agency probe — give it a
    // resolvable mock so it doesn't throw on an unmocked `undefined` return.
    fetchAgencyProfileMock.mockResolvedValue({
      agency: null,
      role: null,
      memberStatus: null,
      confirmedNoMembership: false,
      transientFailure: false,
    })
    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    expect(ref.current?.user?.id).toBe('user-1')

    let resolveRefresh!: (v: unknown) => void
    fetchUserGetMock.mockImplementationOnce(() => new Promise((resolve) => { resolveRefresh = resolve }))

    const refreshedHandlerPromise = capturedHandler?.('TOKEN_REFRESHED', { ...SESSION, access_token: 'rotated-token' })

    // Nothing else happens meanwhile — same session, just a token rotation.
    // A refresh must NOT be treated as a new generation, or this legitimate
    // in-flight result would be wrongly dropped.
    await act(async () => {
      resolveRefresh({ ...AGENT_USER_BACKEND, firstName: 'ActualizadoPorRefresh' })
      await refreshedHandlerPromise
      await flushPromises()
    })

    expect(ref.current?.user?.firstName).toBe('ActualizadoPorRefresh')

    act(() => root.unmount())
    container.remove()
  })
})

/**
 * T-0082 WU-2b remediation (verify-5.md §3 CRITICAL) — `fetchBootstrap`'s
 * `setBootstrapSeed(...)` call was NOT generation-guarded, unlike every
 * other write in this file. `bootstrap-seed.ts`'s `seed` is module-level
 * singleton state (not React state), so a stale bootstrap for a session
 * that has since ended could overwrite the CURRENT session's still-
 * unconsumed seed with the WRONG identity's `agency.permissions`/
 * `subscription` — a not-yet-mounted `PermissionsProvider`/
 * `useAgencySubscription`/`useMySubscription` would then consume the wrong
 * user's data on its first mount, with no self-correcting re-fetch. Fixed
 * by threading `miGeneracion` into `fetchBootstrap` and gating the seed
 * write exactly like every other write in this file.
 */
describe('AuthProvider — bootstrap seed generation guard (verify-5.md §3 CRITICAL)', () => {
  afterEach(() => {
    resetSessionTerminal()
    clearBootstrapSeed()
  })

  const PERMS_A = {
    memberId: 'member-A',
    role: 'ADMIN',
    isAdmin: true,
    permissions: null,
    effectivePermissions: 'FULL_ACCESS' as const,
    usingDefaults: false,
  }
  const PERMS_B = {
    memberId: 'member-B',
    role: 'VIEWER',
    isAdmin: false,
    permissions: null,
    effectivePermissions: null,
    usingDefaults: true,
  }

  it("a stale bootstrap for A resolving after B signs in must NOT overwrite B's unconsumed permissions seed", async () => {
    // Real timers — awaiting a hung mock under fake timers deadlocks (see
    // verify-4.md §1b's documented technique).
    vi.useRealTimers()
    fetchAgencyProfileMock.mockResolvedValue({
      agency: null, role: null, memberStatus: null, confirmedNoMembership: false, transientFailure: false,
    })

    // A signs in — A's bootstrap hangs until resolved explicitly below.
    let resolveA!: (v: unknown) => void
    fetchUserGetMock.mockImplementationOnce((path: string) =>
      path === '/users/me/bootstrap'
        ? new Promise((resolve) => { resolveA = resolve })
        : Promise.resolve(AGENT_USER_BACKEND),
    )
    mountHarness()
    // Fire WITHOUT awaiting — the handler itself awaits the hung bootstrap.
    act(() => { void capturedHandler?.('INITIAL_SESSION', SESSION) })
    await flushPromises()

    // A signs out while their bootstrap is still pending.
    await act(async () => {
      await capturedHandler?.('SIGNED_OUT', null)
    })

    // B signs in, in the same tab, and B's bootstrap resolves immediately,
    // seeding PERMS_B. B's PermissionsProvider has NOT mounted yet in this
    // test (nothing calls consumePermissionsSeed) — exactly the real window
    // verify-5.md describes (PermissionsProvider mounts deeper in the route
    // tree than AuthProvider).
    mockBootstrapAndUser(
      { ...AGENT_USER_BACKEND, id: 'user-2', email: 'b@test.com' },
      'AGENT',
      { id: 'agy-b', name: 'Agencia B', memberRole: 'VIEWER', memberStatus: 'ACTIVE', permissions: PERMS_B },
      [],
    )
    await act(async () => {
      await capturedHandler?.('SIGNED_IN', { ...SESSION, access_token: 'token-de-B' })
    })
    await flushPromises()

    // NOW A's orphaned bootstrap finally resolves, late, with A's real data.
    await act(async () => {
      resolveA({
        user: AGENT_USER_BACKEND,
        role: 'AGENT',
        agency: { id: 'agy-a', name: 'Agencia A', memberRole: 'ADMIN', memberStatus: 'ACTIVE', permissions: PERMS_A },
        subscription: null,
        onboarding: null,
        errors: [],
      })
      await flushPromises()
    })

    // B's still-unconsumed seed must hold B's data, never A's stale write.
    expect(consumePermissionsSeed()).toEqual(PERMS_B)
  })

  it("an orphaned refreshUser() call from the PREVIOUS session must not overwrite the NEXT session's unconsumed permissions seed", async () => {
    vi.useRealTimers()
    fetchAgencyProfileMock.mockResolvedValue({
      agency: null, role: null, memberStatus: null, confirmedNoMembership: false, transientFailure: false,
    })

    // A signs in normally, with agency.permissions seeded — consume it right
    // away so the store starts clean for what follows.
    mockBootstrapAndUser(
      AGENT_USER_BACKEND,
      'AGENT',
      { id: 'agy-a', name: 'Agencia A', memberRole: 'ADMIN', memberStatus: 'ACTIVE', permissions: PERMS_A },
      [],
    )
    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    expect(ref.current?.user?.id).toBe('user-1')
    expect(consumePermissionsSeed()).toEqual(PERMS_A)

    // A calls refreshUser() — its bootstrap resolves LATE, after A has since
    // signed out and B has signed in in the same tab.
    let resolveA!: (v: unknown) => void
    fetchUserGetMock.mockImplementationOnce((path: string) =>
      path === '/users/me/bootstrap'
        ? new Promise((resolve) => { resolveA = resolve })
        : Promise.resolve(AGENT_USER_BACKEND),
    )
    const refreshPromise = ref.current!.refreshUser()
    await flushPromises()

    await act(async () => {
      await capturedHandler?.('SIGNED_OUT', null)
    })
    mockBootstrapAndUser(
      { ...AGENT_USER_BACKEND, id: 'user-2', email: 'b@test.com' },
      'AGENT',
      { id: 'agy-b', name: 'Agencia B', memberRole: 'VIEWER', memberStatus: 'ACTIVE', permissions: PERMS_B },
      [],
    )
    await act(async () => {
      await capturedHandler?.('SIGNED_IN', { ...SESSION, access_token: 'token-de-B' })
    })
    await flushPromises()
    expect(ref.current?.user?.id).toBe('user-2')

    // NOW A's orphaned refreshUser() bootstrap resolves late with A's stale data.
    await act(async () => {
      resolveA({
        user: AGENT_USER_BACKEND,
        role: 'AGENT',
        agency: { id: 'agy-a', name: 'Agencia A', memberRole: 'ADMIN', memberStatus: 'ACTIVE', permissions: PERMS_A },
        subscription: null,
        onboarding: null,
        errors: [],
      })
      await refreshPromise
      await flushPromises()
    })

    // B's seed (set during B's own SIGNED_IN) must remain untouched by A's
    // stale, late-arriving refreshUser() write.
    expect(consumePermissionsSeed()).toEqual(PERMS_B)

    act(() => root.unmount())
    container.remove()
  })
})
