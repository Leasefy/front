'use client'

import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User, AuthContextType, Agency, AgencyMemberRole, UserRole } from './types'
import { toFrontendRole } from './types'
import { fetchAgencyProfile, agencyResultFromBootstrap, type AgencyFetchResult } from './agency-fetch'
import { toast } from 'sonner'
import { getSupabase } from '@/lib/supabase/client'
import { apiClient, ApiError, getAccessToken, setAccessToken, setUnauthorizedHandler, setTokenRefresher, clearInFlightGets, setMfaPendingFlag } from '@/lib/api/client'
import { getBootstrap } from '@/lib/api/bootstrap.service'
import { mapBootstrapSubscription } from '@/lib/api/subscriptions.service'
import type { AgencySubscriptionState } from '@/lib/api/agency-subscription.types'
import type { BackendSubscriptionMeResponse } from '@/lib/api/subscriptions.types'
import { setBootstrapSeed, clearBootstrapSeed } from './bootstrap-seed'
import {
  terminarSesion,
  terminarSesionSiMurio,
  registrarConfirmacionDeSesion,
  purgarSesionLocal,
  registrarCierreDeSesion,
  haySesionGuardada,
} from './session-terminal'
import { claimSession } from '@/lib/api/session.service'
import { revocarSesion } from './revocar-sesion'
import { CLAVE_DE_PERFIL_ELEGIDO, leerPerfilElegido, type PerfilDeOnboarding } from './perfil-de-onboarding'
import { getDeviceId } from '@/lib/auth/device-id'
import {
  readActiveContext,
  writeActiveContext,
  clearActiveContext,
  isDualContextUser,
  type ActiveContext,
} from './active-context'
import { requestNotificationPermission, removeFcmToken } from '@/lib/firebase/messaging'
import type { Session } from '@supabase/supabase-js'

/**
 * Auth Context
 *
 * Provides authentication state and methods throughout the app.
 * Uses Supabase Auth for session management and the NestJS backend for user profile data.
 * Falls back to Supabase session data when backend is unavailable.
 */
export const AuthContext = createContext<AuthContextType | null>(null)

/**
 * sessionStorage key used to hand a fatal auth-bootstrap error message
 * (e.g. 409 duplicate-identity on GET /users/me) to the /auth screen across
 * the forced sign-out redirect. AuthForm reads and clears it on mount.
 */
export const AUTH_BOOTSTRAP_ERROR_KEY = 'leasefy:auth:bootstrap-error'

interface AuthProviderProps {
  children: ReactNode
}

/** Map a backend user response to our frontend User type.
 *  `emailConfirmedAt` comes from the Supabase session (the backend does not
 *  track email confirmation) — pass it through when a session is at hand. */
function mapBackendUser(data: Record<string, unknown>, emailConfirmedAt?: string): User {
  const backendRole = (data.role as string) || 'TENANT'
  const firstName = (data.firstName as string) || ''
  const lastName = (data.lastName as string) || ''
  const frontendRole = toFrontendRole(backendRole as import('./types').BackendRole)

  // Map role-specific onboarding data stored as JSON in the backend
  const raw = (data.onboardingData as Record<string, unknown> | null) ?? null
  const onboardingData = frontendRole === 'landlord' && raw ? {
    preferredContact: raw.preferredContact as import('./types').PreferredContact | undefined,
    propertyType: raw.propertyType as import('./types').OnboardingData['propertyType'] | undefined,
    propertyCity: raw.propertyCity as string | undefined,
    expectedRent: raw.expectedRent as number | undefined,
  } : undefined

  const tenantOnboardingData = frontendRole === 'tenant' && raw ? {
    preferredContact: raw.preferredContact as import('./types').PreferredContact | undefined,
    employmentType: raw.employmentType as import('./types').EmploymentType | undefined,
    companyName: raw.companyName as string | undefined,
    monthlyIncome: raw.monthlyIncome as number | undefined,
    additionalIncome: raw.additionalIncome as number | undefined,
    budgetMin: raw.budgetMin as number | undefined,
    budgetMax: raw.budgetMax as number | undefined,
    preferredZones: raw.preferredZones as string[] | undefined,
    preferredAmenities: raw.preferredAmenities as string[] | undefined,
    moveInDate: raw.moveInDate as string | undefined,
    hasPets: raw.hasPets as boolean | undefined,
    petDetails: raw.petDetails as string | undefined,
  } : undefined

  return {
    id: data.id as string,
    email: data.email as string,
    name: firstName && lastName ? `${firstName} ${lastName}` : (data.email as string),
    firstName,
    lastName,
    phone: (data.phone as string) || undefined,
    avatar: (data.avatarUrl as string) || undefined,
    rut: (data.rut as string) || undefined,
    address: (data.address as string) || undefined,
    birthDate: (data.birthDate as string) || undefined,
    emergencyContactName: (data.emergencyContactName as string) || undefined,
    emergencyContactPhone: (data.emergencyContactPhone as string) || undefined,
    emailConfirmedAt,
    role: frontendRole,
    backendRole: backendRole as import('./types').BackendRole,
    profileSource: 'backend',
    // Flag-based (backend contract): onboardingCompletedAt is stamped ONLY
    // when POST /users/me/onboarding actually completes. Auto-provisioned
    // OAuth users have a firstName from Google metadata but a null flag —
    // they must still confirm their data through the wizard.
    onboardingCompleted: data.onboardingCompletedAt != null,
    onboardingData,
    tenantOnboardingData,
  }
}

/** Build a User from Supabase session when backend is unavailable */
function mapSupabaseUser(session: Session): User {
  const supabaseUser = session.user
  const meta = supabaseUser.user_metadata || {}
  const fullName = meta.full_name || meta.name || ''
  const email = supabaseUser.email || ''

  return {
    id: supabaseUser.id,
    email,
    name: fullName || email,
    firstName: meta.first_name || fullName.split(' ')[0] || '',
    lastName: meta.last_name || fullName.split(' ').slice(1).join(' ') || '',
    avatar: meta.avatar_url || meta.picture || undefined,
    emailConfirmedAt: supabaseUser.email_confirmed_at ?? undefined,
    /*
     * 🔴 El perfil elegido al registrarse, y SÓLO si no hay, 'tenant'.
     *
     * Nico, 2026-09-11: se le cayó el back mientras trabajaba en el panel de
     * la inmobiliaria y la app lo mandó al portal del INQUILINO. La cadena:
     * `GET /users/me` no responde → este fallback → `role: 'tenant'` fijo →
     * ProtectedRoute ve un rol que no puede entrar al panel y redirige.
     *
     * Un rol inventado no puede ser la base de una decisión de navegación.
     * `intended_role` al menos es un dato REAL de la persona (lo escribió el
     * registro). Y como red de verdad, quien lee esto tiene `profileSource:
     * 'session'` para saber que NADA de acá es autoritativo — ver el gate de
     * ProtectedRoute, que con un perfil degradado no expulsa a nadie.
     */
    role: leerPerfilElegido(meta) ?? 'tenant',
    profileSource: 'session',
    // When the backend is unreachable we have no way to confirm onboarding status.
    // Default to true so the user isn't incorrectly sent to the onboarding flow —
    // the panel will gracefully degrade on its own since all API calls will fail too.
    onboardingCompleted: true,
  }
}

/**
 * Detects the specific 401 case where Supabase Auth has a valid JWT but the
 * user has no record in `public.users` on the backend (onboarding never ran).
 * The backend returns: "User not found. Please ensure your account is set up correctly."
 *
 * See .planning/FRONTEND-AUTH-CONTEXT-FIX.md for full context.
 */
function isUserNotFoundError(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 401) return false
  const msg = err.message?.toLowerCase() ?? ''
  return msg.includes('user not found')
}

/** Single delay (ms) for the agency self-heal backstop's ONE guarded retry —
 *  see `AuthProvider`'s agency self-healing effect below. T-0082 WU-1 (F3)
 *  collapsed the old 3-attempt backoff (`[0, 2000, 8000]`, up to 4 probes per
 *  session) into a single re-probe, gated on the previous probe having failed
 *  TRANSIENTLY (never after a definitive "not a member" result). */
const AGENCY_SELF_HEAL_RETRY_DELAY_MS = 2000

/** Bounded backoff schedule (ms) for the DEGRADED PROFILE self-heal below —
 *  a separate concern from the agency backstop above. Merge note (T-0082):
 *  `develop` wrote this self-heal against the agency backstop's pre-T-0082
 *  3-attempt schedule (`AGENCY_SELF_HEAL_DELAYS_MS`, since collapsed to
 *  `AGENCY_SELF_HEAL_RETRY_DELAY_MS`); T-0082 never touched the profile
 *  self-heal or its retry count, so this keeps `develop`'s intended 0s/2s/8s
 *  behavior under its own name instead of silently reducing it to one retry. */
const PROFILE_SELF_HEAL_DELAYS_MS = [0, 2000, 8000]

/** Hard ceiling for a single membership probe. apiClient has no
 *  AbortController, so we RACE the fetch against this timeout — a hung
 *  `/inmobiliaria/agency` resolves as a TRANSIENT failure instead of leaving
 *  `agencyMembershipChecked` false forever (which would hang the panel gate). */
const AGENCY_PROBE_TIMEOUT_MS = 8000

/** Race a `fetchAgencyProfile` call against a timeout. On timeout, resolves as
 *  a transient failure (keep last state, self-heal retries) — never hangs. */
export function fetchAgencyWithTimeout(
  fetchFn: (token?: string) => Promise<AgencyFetchResult>,
  token?: string,
  timeoutMs: number = AGENCY_PROBE_TIMEOUT_MS,
): Promise<AgencyFetchResult> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<AgencyFetchResult>((resolve) => {
    timer = setTimeout(
      () =>
        resolve({
          agency: null,
          role: null,
          memberStatus: null,
          confirmedNoMembership: false,
          transientFailure: true,
        }),
      timeoutMs,
    )
  })
  return Promise.race([fetchFn(token), timeout]).finally(() => clearTimeout(timer))
}

/**
 * Recover a previously-known agency tuple from localStorage so consumers that
 * read `useAuth().agency` immediately on mount (cobranza/cotizador hooks)
 * have a non-null identifier before the Supabase session re-hydrates.
 *
 * Mirrors the localStorage-fallback pattern already used in
 * `ProtectedRoute.tsx` (line 49-60) and `PermissionsContext.readAgencyIdFromStorage`.
 * Net behavior in production: identical — the storage entry is populated by
 * the login flow, so this just front-loads it onto first render instead of
 * waiting for `onAuthStateChange` to fire. In tests, the synthetic seed in
 * `tests/e2e/panel-a11y/_helpers/auth-helpers.ts` provides the same shape.
 */
const AUTH_STORAGE_KEY = 'arriendo-facil-auth'
function readAgencyFromStorage(): Agency | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      agencyId?: string
      agency?: { id?: string; name?: string } & Record<string, unknown>
    }
    const id = parsed.agency?.id ?? parsed.agencyId
    if (!id) return null
    // Preserve all known fields; downstream consumers only read `id` today
    // but PermissionsContext / page hooks may grow over time.
    return { id, name: parsed.agency?.name ?? 'Agency', ...parsed.agency } as Agency
  } catch {
    return null
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Se lee UNA vez, en el primer render: para cuando corren los efectos,
  // auth-js ya pudo haber descartado la sesión y borrado el rastro.
  const [sesionGuardadaAlCargar] = useState(haySesionGuardada)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mfaRequired, setMfaRequired] = useState(false)
  // T-0099 — see AuthState['mfaEnrollRequired'] in types.ts.
  const [mfaEnrollRequired, setMfaEnrollRequired] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  // El perfil elegido en «Selecciona tu perfil». Vive en `user_metadata` de
  // Supabase y se relee de la sesión en cada evento (ver perfil-de-onboarding.ts).
  const [perfilElegido, setPerfilElegido] = useState<PerfilDeOnboarding | null>(null)
  // Initialize from localStorage so cobranza/cotizador hooks that gate on
  // `agency?.id` can fire their first fetch in parallel with the Supabase
  // session hydration. The `onAuthStateChange` handler still calls
  // `setAgencyState(agencyData)` on INITIAL_SESSION / SIGNED_IN / TOKEN_REFRESHED
  // with the canonical backend payload, which overwrites this seed.
  const [agency, setAgencyState] = useState<Agency | null>(() => readAgencyFromStorage())
  const [agencyRole, setAgencyRole] = useState<AgencyMemberRole | null>(null)
  // Membership status within the agency ('ACTIVE' | 'INVITED' | …). Only
  // 'ACTIVE' grants agency-panel access (an INVITED member hasn't accepted).
  const [agencyMemberStatus, setAgencyMemberStatus] = useState<string | null>(null)
  // True once the membership probe has settled for the current session — gates
  // the agency panel's "hold vs redirect" decision for personal-role users.
  const [agencyMembershipChecked, setAgencyMembershipChecked] = useState(false)
  // True when the last probe was a TRANSIENT failure (5xx/network/timeout) —
  // arms the self-heal backstop even for personal-role (dual-context) users,
  // without storming for confirmed-no-membership tenants.
  const [lastProbeTransient, setLastProbeTransient] = useState(false)
  // Persisted active-context choice for dual-context users (null = unset).
  const [persistedContext, setPersistedContext] = useState<ActiveContext | null>(null)

  /**
   * ¿El SIGNED_OUT que viene es porque el usuario apretó "Cerrar sesión"?
   *
   * Supabase emite el MISMO evento en los dos casos: cuando el usuario se va por
   * su cuenta y cuando auth-js descarta una sesión que ya no puede renovar. La
   * diferencia importa: uno termina en la home sin decir nada, el otro tiene que
   * avisar "tu sesión expiró". Un ref y no un estado porque lo lee el handler de
   * `onAuthStateChange`, que se registra una sola vez y capturaría un valor viejo.
   */
  const cierreVoluntarioRef = useRef(false)
  /** Un cierre en curso: un 401 de sesión desplazada no abre otro (ver signOut). */
  const cerrandoRef = useRef(false)

  /**
   * ¿Hubo alguna sesión viva en esta carga de página?
   *
   * Se siembra con lo que había guardado ANTES de que auth-js pudiera tocarlo
   * (por eso se lee en el primer render y no en un efecto), y se levanta en
   * cuanto llega una sesión de verdad. Es lo que separa "se te venció la
   * sesión" de "nunca entraste": sin esto, un visitante anónimo en la landing
   * —que también recibe SIGNED_OUT al arrancar— iría a parar a /auth con un
   * cartel de sesión vencida.
   */
  const huboSesionRef = useRef(sesionGuardadaAlCargar)

  /**
   * Session generation counter (T-0082 WU-1 remediation round 2,
   * verify-3.md CRITICAL). Bumped on `SIGNED_OUT`, in `signOut()`, and at the
   * start of every NEW `INITIAL_SESSION`/`SIGNED_IN` bootstrap.
   *
   * Round 1 cleared `agencyProbeInFlightRef`/`enVuelo` on sign-out, which
   * stops a NEW caller from joining an OLD promise — but it does nothing
   * about a coroutine that is ALREADY running: `apiClient` has no
   * `AbortController` (a pre-existing, documented fact), so an in-flight
   * `probeAgencyMembership`/`fetchUser` call for the session that just ended
   * keeps executing in the background and, when it finally settles, used to
   * write its result into shared `AuthProvider` state UNCONDITIONALLY —
   * mixing identity A's stale data into identity B's session the moment A's
   * orphaned call lands, even though the ref/map were cleared the instant B
   * signed in. Proven reachable via the shipped `SesionYaAbierta` "cambiar de
   * cuenta" flow (`await signOut()` then the login form, same tab, no
   * reload) and via a forced sign-out (`SessionRevocationHandler`) racing an
   * in-flight bootstrap.
   *
   * The fix: every fire-and-forget async path that writes shared state after
   * an `await` captures this counter at its own start and re-checks it right
   * before each write; a mismatch means the session moved on while the call
   * was in flight, and the write is dropped silently instead of clobbering
   * the CURRENT session's state. This is NOT solved by adding
   * `AbortController` plumbing to `apiClient` — even an aborted/cancelled
   * request still races the state write on the client side (the async
   * function's `await` settles and its continuation runs regardless of
   * whether the underlying request was told to cancel), so an epoch check is
   * required either way and is sufficient on its own.
   */
  const sessionGenerationRef = useRef(0)

  /**
   * T-0099: mirrors the bootstrap's `segundoFactor.exigido` (contract.md
   * T-0099 §2) outside React state — `checkMfaLevel` reads it without
   * needing it in its `useCallback` deps (keeping that callback's identity
   * stable, same reasoning as every other ref in this file). Written by
   * `fetchBootstrap`, gated on the session generation like everything else
   * it sets.
   */
  const segundoFactorExigidoRef = useRef(false)

  /**
   * Fetch the user profile from the backend.
   * Returns one of three states:
   *  - { user: User }            → authenticated, profile loaded
   *  - { needsOnboarding: true } → JWT valid but no backend record yet → go to /onboarding
   *  - { user: null }            → real auth failure (logout) or fallback to Supabase session
   */
  const fetchUser = useCallback(async (
    session?: Session | null,
  ): Promise<{ user: User | null; needsOnboarding: boolean }> => {
    // Use token directly from session to avoid calling getSession() again (can deadlock during init)
    const token = session?.access_token
    try {
      const data = await apiClient.get<Record<string, unknown>>('/users/me', token)
      // 🔴 El «ya vio el recorrido del panel» YA NO sale de acá (23-09).
      // `data.preferences` son las preferencias de búsqueda del INQUILINO y
      // nunca traían esa marca: el aviso que se mandaba desde aquí decía
      // siempre «no visto» y el recorrido volvía a salir. Ahora lo lee
      // `PanelPrefsContext` de `/inmobiliaria/onboarding-visto`, por agencia.
      return {
        user: mapBackendUser(data, session?.user?.email_confirmed_at ?? undefined),
        needsOnboarding: false,
      }
    } catch (err) {
      // JWT valid but user doesn't exist in public.users yet → needs onboarding
      if (isUserNotFoundError(err)) {
        return { user: null, needsOnboarding: true }
      }
      // 409: this Supabase identity's email already belongs to another account.
      // Never fall back to the degraded session user (that would loop on every
      // request) — surface the backend message and drop the Supabase session
      // so the user can log in with their original account.
      // The message travels via sessionStorage (decoupled from any UI in
      // this file): a toast fired here would unmount with the panel during
      // the sign-out redirect, and the /auth screen (AuthForm) owns the
      // visible error banner.
      if (err instanceof ApiError && err.status === 409) {
        const message =
          err.message ||
          'Ya existe una cuenta registrada con este correo. Inicia sesión con tu cuenta original.'
        if (typeof window !== 'undefined') {
          try {
            window.sessionStorage.setItem(AUTH_BOOTSTRAP_ERROR_KEY, message)
          } catch {}
        }
        try {
          getSupabase()?.auth.signOut({ scope: 'local' }).catch(() => {})
        } catch {}
        return { user: null, needsOnboarding: false }
      }
      // Any other 401 = real token failure → logout (handled by caller returning null user)
      if (err instanceof ApiError && err.status === 401) {
        return { user: null, needsOnboarding: false }
      }
      // Backend unavailable (5xx, network) — fallback to Supabase session data so
      // the user isn't kicked out just because the API is down
      if (session) {
        return { user: mapSupabaseUser(session), needsOnboarding: false }
      }
      console.error('[Auth] Error fetching user profile:', err)
      return { user: null, needsOnboarding: false }
    }
  }, [])

  /**
   * T-0082 WU-2b: replaces `fetchUser` + the fire-and-forget agency probe for
   * the login bootstrap — INITIAL_SESSION, SIGNED_IN, `refreshUser()` — with
   * ONE call to `GET /users/me/bootstrap` (contract.md §3.2, Surface A).
   * `TOKEN_REFRESHED` deliberately keeps calling `fetchUser` +
   * `probeAgencyMembership` unchanged — it is a token rotation for an
   * existing session, not a new bootstrap, and out of this unit's scope
   * (wu-2b-front-brief.md §4).
   *
   * Same error contract as `fetchUser`, because the bootstrap's `user` row
   * says so verbatim (contract.md §3.2): 401 user-not-found → onboarding, 409
   * duplicate identity → sign out + sessionStorage message (never the
   * degraded session fallback, which would loop), any other 401 → null,
   * 5xx/network → the degraded Supabase-session fallback.
   *
   * `agencyResult: null` in the return means bootstrap never produced a
   * membership verdict at all (any of the failure branches below, including
   * the 5xx/network fallback) — the caller falls back to the standalone
   * `probeAgencyMembership`, exactly like today's unconditional
   * fire-and-forget probe. A non-null `agencyResult` means the bootstrap DID
   * resolve — success, confirmed no-membership, or `agency_unavailable` — and
   * the caller applies it directly via `applyAgencyFetchResult`, with zero
   * extra network calls.
   *
   * `miGeneracion` (verify-5.md §3, CRITICAL, WU-2b remediation): every
   * caller captures `sessionGenerationRef.current` before awaiting this
   * function and re-checks it before writing `user`/`agency` state — but
   * `bootstrap-seed.ts`'s `setBootstrapSeed` is module-level singleton
   * state, not React state, and was being written UNCONDITIONALLY inside
   * this function, before the caller's own generation check ever runs. A
   * stale bootstrap for a session that has since ended (SIGNED_OUT, or
   * another SIGNED_IN in the same tab) could overwrite the CURRENT session's
   * still-unconsumed seed with the wrong identity's permissions/subscription
   * — a not-yet-mounted `PermissionsProvider`/`useAgencySubscription`/
   * `useMySubscription` would then consume the WRONG user's data on its
   * first mount, with no self-correcting re-fetch. Required (not optional,
   * unlike `checkMfaLevel`'s `miGeneracion?`) precisely so no call site can
   * forget to pass it — this function itself decides nothing about which
   * session it belongs to.
   */
  const fetchBootstrap = useCallback(async (
    session: Session | null | undefined,
    miGeneracion: number,
  ): Promise<{ user: User | null; needsOnboarding: boolean; agencyResult: AgencyFetchResult | null }> => {
    const token = session?.access_token
    try {
      const data = await getBootstrap(token)
      // Same PanelPrefsContext seed `fetchUser` already did for /users/me —
      // see the comment there. The bootstrap's `user.preferences` is the
      // exact same field, just nested one level deeper.
      if (typeof window !== 'undefined') {
        const prefs = data.user.preferences as Record<string, unknown> | undefined | null
        const dismissed = prefs?.panel_tour_dismissed_v1 === true
        window.dispatchEvent(
          new CustomEvent('leasefy:preferences:loaded', {
            detail: { panel_tour_dismissed_v1: dismissed },
          }),
        )
      }
      // Seed the hooks/contexts that would otherwise re-fetch this on mount.
      // Only ever seeds a field the bootstrap actually resolved — a null
      // section here means "do the standalone fallback", never a seeded
      // null (contract.md §3.2's degradation column; see bootstrap-seed.ts).
      // GATED on the generation (see this function's doc comment above) —
      // a session that has since ended must never plant a seed for whatever
      // session replaced it.
      if (sessionGenerationRef.current === miGeneracion) {
        setBootstrapSeed({
          permissions: data.agency?.permissions ?? null,
          agencySubscription: data.role === 'AGENT' ? (data.subscription as AgencySubscriptionState | null) : null,
          mySubscription: data.role !== 'AGENT'
            ? mapBootstrapSubscription(data.subscription as BackendSubscriptionMeResponse | null)
            : null,
        })
        // T-0099: read BEFORE the deferred `checkMfaLevel` runs (it reads this
        // ref) — `fetchBootstrap` always resolves before `alSoltarElLock`
        // schedules that check in every caller.
        segundoFactorExigidoRef.current = data.segundoFactor.exigido
      }
      return {
        user: mapBackendUser({ ...data.user, role: data.role }, session?.user?.email_confirmed_at ?? undefined),
        needsOnboarding: false,
        agencyResult: agencyResultFromBootstrap(data.agency, data.errors),
      }
    } catch (err) {
      if (isUserNotFoundError(err)) {
        return { user: null, needsOnboarding: true, agencyResult: null }
      }
      if (err instanceof ApiError && err.status === 409) {
        const message =
          err.message ||
          'Ya existe una cuenta registrada con este correo. Inicia sesión con tu cuenta original.'
        if (typeof window !== 'undefined') {
          try {
            window.sessionStorage.setItem(AUTH_BOOTSTRAP_ERROR_KEY, message)
          } catch {}
        }
        try {
          getSupabase()?.auth.signOut({ scope: 'local' }).catch(() => {})
        } catch {}
        return { user: null, needsOnboarding: false, agencyResult: null }
      }
      if (err instanceof ApiError && err.status === 401) {
        return { user: null, needsOnboarding: false, agencyResult: null }
      }
      if (session) {
        return { user: mapSupabaseUser(session), needsOnboarding: false, agencyResult: null }
      }
      console.error('[Auth] Error fetching bootstrap:', err)
      return { user: null, needsOnboarding: false, agencyResult: null }
    }
  }, [])

  /** Set the agency and role in context (called after registration or when user loads) */
  const setAgency = useCallback((agencyData: Agency | null, role: AgencyMemberRole | null) => {
    setAgencyState(agencyData)
    setAgencyRole(role)
  }, [])

  /** Fetch agency membership for agency/agent roles. Delegates to
   *  `fetchAgencyProfile` (agency-fetch.ts) which tolerates legacy/partial
   *  response shapes and logs (console.warn) the reason on any failure —
   *  instead of silently collapsing every failure mode (no membership yet,
   *  network blip, malformed body) into an unexplained null. */
  const fetchAgency = useCallback((token?: string) => fetchAgencyProfile(token), [])

  /** Apply a `fetchAgencyProfile` result to state WITHOUT ever downgrading an
   *  already-loaded agency. A failed fetch (`agency: null`) leaves whatever
   *  is currently in state untouched — only a successful fetch overwrites it.
   *  This is the single write path used by the auth-event handlers, the
   *  self-heal backstop, and `refreshAgency()` below. */
  const applyAgencyFetchResult = useCallback((result: AgencyFetchResult) => {
    if (result.agency) {
      // Success — adopt the fresh membership.
      setAgencyState(result.agency)
      setAgencyRole(result.role)
      setAgencyMemberStatus(result.memberStatus)
    } else if (result.confirmedNoMembership) {
      // Backend CONFIRMED no membership (403/404/410) — DOWNGRADE so a revoked
      // member loses agency access on the next probe (no stale UI access).
      setAgencyState(null)
      setAgencyRole(null)
      setAgencyMemberStatus(null)
    }
    // else: transient failure / malformed 200 → KEEP the last known values so a
    // blip never wipes a healthy 'ACTIVE' membership.
    setLastProbeTransient(!!result.transientFailure)
  }, [])

  /** In-flight `/inmobiliaria/agency` probe, shared by every caller — auth
   *  events, the self-heal retry below, `refreshUser`, and `refreshAgency`.
   *  T-0082 WU-1 (F3): the probe used to fire once per caller (up to 4x per
   *  session — SIGNED_IN, `refreshUser`, and the old 3-attempt self-heal),
   *  because each call started its own fetch. Sharing by this ref means an
   *  overlapping trigger reuses the same in-flight request instead of racing
   *  a parallel one. */
  const agencyProbeInFlightRef = useRef<Promise<AgencyFetchResult> | null>(null)

  /** THE single membership-probe path used by every auth handler + refreshUser
   *  + refreshAgency + the self-heal retry. Bounds the fetch with a timeout,
   *  ALWAYS flips `agencyMembershipChecked` in a `finally` — so a hung/slow/
   *  failed probe can never leave the agency panel gate holding a spinner
   *  forever — and returns the raw result so a caller can decide whether to
   *  arm a retry (see `refreshAgency` below). */
  const probeAgencyMembership = useCallback(async (token?: string): Promise<AgencyFetchResult> => {
    const enVuelo = agencyProbeInFlightRef.current
    if (enVuelo) return enVuelo
    // Captured NOW, before the fetch even starts — this is the identity of
    // "which session asked for this." See `sessionGenerationRef`'s doc
    // comment: an uncancellable probe that outlives its own session must not
    // write into whatever session is current by the time it settles.
    const miGeneracion = sessionGenerationRef.current
    const promesa = (async () => {
      try {
        const result = await fetchAgencyWithTimeout(fetchAgency, token)
        if (sessionGenerationRef.current === miGeneracion) {
          applyAgencyFetchResult(result)
        }
        return result
      } finally {
        // Same guard on the "checked" flag: a stale probe settling after
        // sign-out must not touch the NEW session's gate state either.
        if (sessionGenerationRef.current === miGeneracion) {
          setAgencyMembershipChecked(true)
        }
      }
    })()
    agencyProbeInFlightRef.current = promesa
    try {
      return await promesa
    } finally {
      agencyProbeInFlightRef.current = null
    }
  }, [applyAgencyFetchResult, fetchAgency])

  // ---------------------------------------------------------------------
  // Agency self-healing backstop
  //
  // fetchAgency() only ever ran inside onAuthStateChange handlers — one shot
  // per auth event. If that single shot failed (network blip, dev HMR partial
  // reload losing state), `agency` stayed null for the rest of the session
  // with nothing ever re-requesting it, silently breaking anything gated on
  // `agency?.id` (useBetaChat, the postulaciones panel).
  //
  // T-0082 WU-1 (F3): collapsed from a 3-attempt backoff (`[0, 2000, 8000]`)
  // into a SINGLE guarded retry, fired only when the probe that just ran
  // failed TRANSIENTLY (network/timeout) — never after a definitive "not a
  // member" result (403/404/410), for ANY role. A retry that fails
  // transiently again is not retried further automatically; from there the
  // user's manual "Intentar de nuevo" (`refreshAgency`) is the path forward.
  // ---------------------------------------------------------------------
  const agencySelfHealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Arms the single retry, unless one is already scheduled. No-ops instead of
   *  stacking a second timer on an overlapping call (effect re-run, manual
   *  refresh). */
  const scheduleAgencySelfHeal = useCallback(() => {
    if (agencySelfHealTimeoutRef.current) return
    const miGeneracion = sessionGenerationRef.current
    agencySelfHealTimeoutRef.current = setTimeout(() => {
      agencySelfHealTimeoutRef.current = null
      // Don't even fire the retry for a session that has since ended —
      // `probeAgencyMembership` would gate its own write anyway, but there's
      // no reason to spend a network call on an abandoned session.
      if (sessionGenerationRef.current !== miGeneracion) return
      void probeAgencyMembership()
    }, AGENCY_SELF_HEAL_RETRY_DELAY_MS)
  }, [probeAgencyMembership])

  useEffect(() => {
    // Only ever retries on a TRANSIENT failure — a confirmed no-membership
    // result sets lastProbeTransient=false, so it's a terminal state here
    // regardless of role (pure agency included: T-0082 dropped the old
    // "always retry an agency-capable user" special case, which used to keep
    // storming a revoked/never-a-member AGENT indefinitely).
    if (!user || agency || !lastProbeTransient) return
    scheduleAgencySelfHeal()
    return () => {
      if (agencySelfHealTimeoutRef.current) {
        clearTimeout(agencySelfHealTimeoutRef.current)
        agencySelfHealTimeoutRef.current = null
      }
    }
  }, [user, agency, lastProbeTransient, scheduleAgencySelfHeal])

  /** Manually retry the agency fetch (e.g. a page's "Intentar de nuevo"
   *  button). Reuses an in-flight probe if one is already running
   *  (`probeAgencyMembership`'s own dedup); if the fresh result is still
   *  transient, arms one more guarded retry — mirrors the automatic path. */
  const refreshAgency = useCallback(async () => {
    console.warn('[Auth] agency manual refresh requested')
    const result = await probeAgencyMembership()
    if (result.transientFailure) {
      scheduleAgencySelfHeal()
    }
  }, [probeAgencyMembership, scheduleAgencySelfHeal])

  /** Refresh user data from backend (e.g. after onboarding).
   *  T-0082 WU-2b: uses the SAME bootstrap `fetchBootstrap` (one call) the
   *  login path uses, preserving this function's existing semantics — still
   *  awaited (unlike the auth-event listener's fire-and-forget probe), still
   *  gated on the session generation so a stale refresh from an ended session
   *  can never clobber the session that replaced it. */
  const refreshUser = useCallback(async () => {
    // Use the already-stored token to avoid an extra getSession() lock acquisition.
    // If the stored token is still valid the backend will respond; if not,
    // fetchBootstrap handles the 401 gracefully (same contract as fetchUser).
    const miGeneracion = sessionGenerationRef.current
    const { user: userData, needsOnboarding: needsOnb, agencyResult } = await fetchBootstrap(undefined, miGeneracion)
    // The session that asked for this refresh may have ended (sign-out, a
    // new sign-in) while the bootstrap was in flight — never let a stale
    // refresh write over whatever session is current now.
    if (sessionGenerationRef.current !== miGeneracion) return
    setUser(userData)
    setNeedsOnboarding(needsOnb)
    // Probe agency membership for EVERY authenticated user (personal-role
    // coexistence): a TENANT/LANDLORD may hold an agency membership.
    if (userData) {
      if (agencyResult) {
        // The bootstrap already resolved membership — apply directly, no
        // extra network call.
        applyAgencyFetchResult(agencyResult)
        setAgencyMembershipChecked(true)
      } else {
        // The bootstrap failed wholesale (network/5xx) before it could
        // produce a verdict — fall back to the standalone probe, exactly
        // like this function did before WU-2b.
        await probeAgencyMembership()
      }
    }
  }, [fetchBootstrap, probeAgencyMembership, applyAgencyFetchResult])

  /* ------------------------------------------------------------------
   * 🔴 Self-heal del PERFIL degradado.
   *
   * Cuando `/users/me` no responde, `fetchUser` devuelve un usuario armado
   * con la sesión de Supabase (`profileSource: 'session'`). Ese estado no se
   * reintentaba NUNCA: quedaba pegado hasta que algo disparara otro evento de
   * auth. Nico, 2026-09-11: se le cayó el back, la app lo mandó al portal del
   * inquilino, y volver a levantarlo no arreglaba nada porque nadie
   * re-preguntaba quién era.
   *
   * Espejo exacto del backstop de la agencia, incluido el porqué de los
   * plazos: 0s / 2s / 8s cubre un reinicio de back sin martillar al servidor.
   *
   * Merge T-0082: este `await fetchUser()` es exactamente el tipo de
   * escritura-después-de-await que la generación de sesión existe para
   * proteger (ver `sessionGenerationRef` arriba). El token local
   * (`perfilSelfHealTokenRef`) ya invalida un reintento cuando ESTE efecto
   * se reprograma (p.ej. `user` cambia a null en el propio SIGNED_OUT), pero
   * no conocía la generación compartida cuando se escribió en `develop` —
   * se captura y re-chequea acá igual que en `refreshAgency`/`refreshUser`,
   * belt and suspenders, para que un self-heal huérfano de una sesión que ya
   * terminó nunca resucite un perfil viejo sobre la sesión que la reemplazó.
   * ------------------------------------------------------------------ */
  const perfilSelfHealActivoRef = useRef(false)
  const perfilSelfHealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const perfilSelfHealTokenRef = useRef(0)

  useEffect(() => {
    // Sólo un perfil DEGRADADO se reintenta. Uno real ('backend') es la
    // verdad y no hay nada que curar.
    if (!user || user.profileSource !== 'session') return
    if (perfilSelfHealActivoRef.current) return
    perfilSelfHealActivoRef.current = true
    const miToken = ++perfilSelfHealTokenRef.current
    const miGeneracion = sessionGenerationRef.current

    const intentar = (indice: number) => {
      perfilSelfHealTimeoutRef.current = setTimeout(async () => {
        if (miToken !== perfilSelfHealTokenRef.current) return
        if (sessionGenerationRef.current !== miGeneracion) return
        console.warn(
          `[Auth] profile self-heal retry ${indice + 1}/${PROFILE_SELF_HEAL_DELAYS_MS.length} (perfil degradado)`,
        )
        const { user: fresco } = await fetchUser()
        if (miToken !== perfilSelfHealTokenRef.current) return
        if (sessionGenerationRef.current !== miGeneracion) return
        // Sólo se adopta un perfil REAL: otro degradado no es una mejora, y
        // pisarlo reiniciaría el efecto en un bucle.
        if (fresco?.profileSource === 'backend') {
          setUser(fresco)
          void probeAgencyMembership()
          perfilSelfHealActivoRef.current = false
          return
        }
        const siguiente = indice + 1
        if (siguiente < PROFILE_SELF_HEAL_DELAYS_MS.length) {
          intentar(siguiente)
        } else {
          console.warn('[Auth] profile self-heal agotado — queda el botón «Reintentar ahora»')
          perfilSelfHealActivoRef.current = false
        }
      }, PROFILE_SELF_HEAL_DELAYS_MS[indice])
    }
    intentar(0)

    return () => {
      perfilSelfHealTokenRef.current += 1
      if (perfilSelfHealTimeoutRef.current) {
        clearTimeout(perfilSelfHealTimeoutRef.current)
        perfilSelfHealTimeoutRef.current = null
      }
      perfilSelfHealActivoRef.current = false
    }
  }, [user, fetchUser, probeAgencyMembership])

  /** Check MFA assurance level and update mfaRequired/mfaEnrollRequired.
   *  `miGeneracion`, when passed, gates the write: a deferred MFA check
   *  (see `alSoltarElLock` below) that settles after the session has moved
   *  on must not flip these for whoever is signed in NOW.
   *
   *  T-0099: two DIFFERENT pending states share this one check, per
   *  contract.md T-0099 §3 —
   *    - `mfaRequired` ("verify-pending"): a factor exists, the session just
   *      hasn't stepped up to it THIS sign-in. Supabase's own `nextLevel`
   *      already answers this — unchanged from before this task.
   *    - `mfaEnrollRequired` ("enroll-pending"): the back's role policy
   *      (`segundoFactor.exigido`, mirrored in `segundoFactorExigidoRef`)
   *      requires aal2 but there is NO factor to even step up to —
   *      something Supabase's aal pair alone cannot say (`nextLevel` stays
   *      `'aal1'` with nothing enrolled, identical to "no requirement at
   *      all"). `listFactors()` is only called to break that tie — never
   *      when `nextLevel === 'aal2'` already proves a factor exists. */
  const checkMfaLevel = useCallback(async (miGeneracion?: number) => {
    const supabase = getSupabase()
    if (!supabase) return
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (miGeneracion !== undefined && sessionGenerationRef.current !== miGeneracion) return
      if (aal?.nextLevel === 'aal2' && aal?.currentLevel === 'aal1') {
        setMfaRequired(true)
      } else if (aal?.currentLevel === 'aal2') {
        setMfaRequired(false)
      }
      if (aal?.currentLevel === 'aal2' || !segundoFactorExigidoRef.current || aal?.nextLevel === 'aal2') {
        setMfaEnrollRequired(false)
      } else {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        if (miGeneracion !== undefined && sessionGenerationRef.current !== miGeneracion) return
        const tieneFactorVerificado = (factors?.totp ?? []).some((f) => f.status === 'verified')
        setMfaEnrollRequired(!tieneFactorVerificado)
      }
    } catch {
      // MFA not available — ignore
    }
  }, [])

  const setMfaVerified = useCallback(() => {
    setMfaRequired(false)
  }, [])

  // T-0099: `clasificar.ts` no puede leer contexto de React — mirror de
  // `mfaRequired` hacia `apiClient` (mismo patrón que `_accessToken`) para
  // que un 403 SEGUNDO_FACTOR_REQUERIDO que llegue en la ventana de la
  // carrera se pueda distinguir de alguien que nunca activó el factor.
  useEffect(() => {
    setMfaPendingFlag(mfaRequired)
  }, [mfaRequired])

  // Load the persisted active-context choice whenever the authenticated user
  // changes (userId-scoped read → a foreign entry reads as unset), and keep it
  // in sync with same-tab writes ('active-context-updated') AND cross-tab writes
  // ('storage') so a switch in one tab reflects in another.
  useEffect(() => {
    const load = () => setPersistedContext(readActiveContext(user?.id))
    load()
    window.addEventListener('active-context-updated', load)
    window.addEventListener('storage', load)
    return () => {
      window.removeEventListener('active-context-updated', load)
      window.removeEventListener('storage', load)
    }
  }, [user?.id])

  /** Switch the active context for a dual-context user (persisted per-user). */
  const setActiveContext = useCallback((context: ActiveContext) => {
    if (!user?.id) return
    writeActiveContext(user.id, context)
    setPersistedContext(context)
  }, [user?.id])

  /**
   * Guarda el perfil elegido en «Selecciona tu perfil». Va a `user_metadata`
   * de Supabase —no a nuestro back— para que la próxima entrada, desde el
   * dispositivo que sea, retome en el onboarding de ese perfil y no en el
   * selector (Nico, 2026-09-07). El estado se adelanta: si guardar falla, la
   * pantalla igual sigue con lo elegido y la próxima entrada vuelve al selector.
   */
  const elegirPerfil = useCallback(async (perfil: PerfilDeOnboarding) => {
    setPerfilElegido(perfil)
    const supabase = getSupabase()
    if (!supabase) return
    const { error } = await supabase.auth.updateUser({
      data: { [CLAVE_DE_PERFIL_ELEGIDO]: perfil },
    })
    if (error) throw error
  }, [])

  /**
   * Single-session: claim this device's session as the active one. Must run
   * BEFORE the first authenticated request (fetchUser) so a device that only
   * opened the app (INITIAL_SESSION, not SIGNED_IN) becomes active instead of
   * getting 401'd by the backend's single-session guard. Best-effort with a
   * hard timeout so a hung/failed claim can never stall the auth bootstrap
   * (matches signOut's timeout-race style). A `superseded` result means this
   * device just displaced another one — tell the user.
   */
  const claimActiveSession = useCallback(async (token: string, miGeneracion?: number) => {
    // El id de ESTE navegador. Sin él, el back sólo sabe que había una sesión
    // anterior y la reporta como «otro dispositivo» aunque fuera la de este
    // mismo navegador — el cartel salía en cada login.
    const result = await Promise.race([
      claimSession(token, { deviceId: getDeviceId() }).catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ])
    // Session-generation guard (see `sessionGenerationRef`'s doc comment): a
    // claim started for a session that has since ended must not show ITS
    // "cerramos tu sesión en otro dispositivo" toast over whatever session is
    // current now — that would be as wrong as writing stale identity data.
    if (miGeneracion !== undefined && sessionGenerationRef.current !== miGeneracion) return
    if (result?.superseded) {
      toast('Cerramos tu sesión en otro dispositivo')
    }
  }, [])

  /**
   * T-0082 WU-1 (F1): `signInWithEmail` used to run its OWN
   * claim→fetchUser→MFA sequence, in parallel with the `onAuthStateChange`
   * listener's SIGNED_IN handling of the very same sign-in — doubling
   * `/users/me` (and, via the explicit token, bypassing `compartirGet`'s
   * dedup too — see client.ts). The listener's SIGNED_IN branch is now the
   * ONLY place that runs the bootstrap; `signInWithEmail` arms this resolver
   * before calling Supabase and awaits it instead, so it still returns the
   * loaded user (or null) to its caller (`AuthForm`'s inline 409 handling)
   * without ever calling `fetchUser`/`checkMfaLevel` itself. A SIGNED_IN
   * triggered by something other than `signInWithEmail` (e.g. a magic-link
   * session exchange) finds no waiter registered — resolving it is then a
   * no-op.
   */
  const signInBootstrapWaiterRef = useRef<((user: User | null) => void) | null>(null)

  // Initialize auth on mount.
  // We rely exclusively on onAuthStateChange (which fires INITIAL_SESSION on setup)
  // to avoid calling getSession() in parallel, which triggers an AbortError from
  // Supabase's internal Navigator Locks when both compete for the same lock.
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return

    // Safety net: if no known auth event fires within 5s of mount, release the
    // loader so ProtectedRoute can decide what to do with whatever state we have.
    // Covers edge cases where Supabase never emits INITIAL_SESSION (some refresh flows).
    const safetyTimeout = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          console.warn('[Auth] onAuthStateChange did not settle within 5s — releasing loader')
        }
        return false
      })
      // NOTE: this 5s net releases isLoading ONLY. It must NOT touch
      // agencyMembershipChecked — that flag is flipped solely by the probe's
      // own bounded completion (probeAgencyMembership's finally, capped at
      // AGENCY_PROBE_TIMEOUT_MS). Flipping it here would redirect a slow-network
      // dual-context user (probe 5-8s) out of the panel at t=5s before the real
      // ACTIVE result lands. The 8s-bounded probe is sufficient to guarantee no
      // infinite spinner.
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        /** Derive hasPassword from session providers — no extra API call needed */
        const getHasPassword = (s: typeof session) => {
          const providers = (s?.user?.app_metadata?.providers as string[]) ?? []
          return providers.includes('email')
        }

        /**
         * auth-js corre este callback ADENTRO de su lock de sesión y espera a
         * que devuelva. Cualquier método de auth-js llamado acá (`mfa.*`,
         * `getSession`, `updateUser`, `refreshSession`…) pide ese mismo lock y
         * se queda esperando al callback, que a su vez lo espera a él. Medido
         * con `navigator.locks.query()` el 2026-09-07: el lock quedaba «held»
         * para siempre en cada carga con sesión. Sin lock libre no hay
         * auto-refresh del token, `updateUser` no vuelve nunca, y todo lo que
         * seguía al `await checkMfaLevel()` de INITIAL_SESSION —la sonda de
         * membresía, soltar el loader— sólo llegaba por la red de 5 s (el
         * spinner de 5 s en cada recarga era esto).
         *
         * Por eso el chequeo de MFA sale a un `setTimeout(0)`: corre recién
         * cuando el callback ya devolvió y el lock está libre, que es lo que
         * pide la documentación de Supabase para llamar a auth desde acá.
         */
        const alSoltarElLock = (tarea: () => Promise<void>) => {
          setTimeout(() => {
            void tarea()
          }, 0)
        }

        if (event === 'INITIAL_SESSION') {
          if (!session) {
            // Sin sesión hay que decirlo EXPLÍCITAMENTE. `setAccessToken` es lo
            // único que marca la pregunta como contestada (`_sesionResuelta` en
            // api/client.ts); sin esta línea la compuerta queda abierta y CADA
            // petición paga los 3 s de `esperarRespuestaDeSesion` antes de
            // salir igual sin `Authorization`. Con el refresh token muerto —el
            // caso en que este `else` es la primera noticia— eso eran ~4 s por
            // pantalla para terminar en un cartel de error equivocado.
            setAccessToken(null)
          }
          if (session) {
            // A NEW bootstrap starts: bump the session generation before
            // anything async runs, and capture it now. Every write below that
            // follows an `await` re-checks this — if a SIGNED_OUT (or another
            // sign-in) lands while this bootstrap is still in flight, this
            // generation no longer matches the current one and the stale
            // write is dropped instead of clobbering whatever session is
            // current by the time it lands. See `sessionGenerationRef`'s doc
            // comment.
            sessionGenerationRef.current += 1
            const miGeneracion = sessionGenerationRef.current
            huboSesionRef.current = true
            setAccessToken(session.access_token)
            // Claim the active session BEFORE any other authenticated request.
            await claimActiveSession(session.access_token, miGeneracion)
            if (sessionGenerationRef.current !== miGeneracion) return
            // T-0082 WU-2b: ONE call (GET /users/me/bootstrap) replaces
            // fetchUser + the separate agency probe below.
            const { user: userData, needsOnboarding: needsOnb, agencyResult } = await fetchBootstrap(session, miGeneracion)
            if (sessionGenerationRef.current !== miGeneracion) return
            if (userData) userData.hasPassword = getHasPassword(session)
            setUser(userData)
            setNeedsOnboarding(needsOnb)
            setPerfilElegido(leerPerfilElegido(session.user?.user_metadata))
            // Apply the bootstrap's own membership verdict — no second
            // request. Fire-and-forget ONLY as a fallback when the bootstrap
            // failed wholesale (agencyResult null): the global loader must
            // NOT wait on /inmobiliaria/agency latency (only the agency-route
            // gate waits, on agencyMembershipChecked). Matches SIGNED_IN's
            // ordering.
            if (userData) {
              if (agencyResult) {
                applyAgencyFetchResult(agencyResult)
                setAgencyMembershipChecked(true)
              } else {
                void probeAgencyMembership(session.access_token)
              }
            }
            // El loader se suelta recién con el MFA resuelto (como siempre se
            // quiso), pero fuera del callback — ver `alSoltarElLock`.
            const yaHizoOnboarding = userData?.onboardingCompleted === true
            alSoltarElLock(async () => {
              await checkMfaLevel(miGeneracion)
              if (sessionGenerationRef.current !== miGeneracion) return
              setIsLoading(false)
              if (yaHizoOnboarding) {
                requestNotificationPermission().catch(() => {})
              }
            })
            return
          }
          setIsLoading(false)
        } else if (event === 'SIGNED_IN' && session) {
          // Same reasoning as INITIAL_SESSION above: a NEW bootstrap, a new
          // generation. See `sessionGenerationRef`'s doc comment.
          sessionGenerationRef.current += 1
          const miGeneracion = sessionGenerationRef.current
          huboSesionRef.current = true
          setAccessToken(session.access_token)
          // Claim the active session BEFORE any other authenticated request.
          await claimActiveSession(session.access_token, miGeneracion)
          if (sessionGenerationRef.current !== miGeneracion) return
          // T-0082 WU-2b: ONE call (GET /users/me/bootstrap) replaces
          // fetchUser + the separate agency probe below.
          const { user: userData, needsOnboarding: needsOnb, agencyResult } = await fetchBootstrap(session, miGeneracion)
          if (sessionGenerationRef.current !== miGeneracion) return
          if (userData) userData.hasPassword = getHasPassword(session)
          setUser(userData)
          setNeedsOnboarding(needsOnb)
          setPerfilElegido(leerPerfilElegido(session.user?.user_metadata))
          // Apply the bootstrap's own membership verdict — no second request.
          // Fire-and-forget — the global loader does not wait on this either
          // (only the agency-route gate waits, on agencyMembershipChecked).
          if (userData) {
            if (agencyResult) {
              applyAgencyFetchResult(agencyResult)
              setAgencyMembershipChecked(true)
            } else {
              void probeAgencyMembership(session.access_token)
            }
          }
          // SIGNED_IN también puede venir de adentro del lock (`setSession` en
          // /auth/enlace, el canje del código): el MFA se chequea al soltarlo.
          //
          // T-0099: `isLoading` se suelta ACÁ ADENTRO, después del chequeo de
          // MFA — no antes, como estaba (línea `setIsLoading(false)` seguía
          // directo al `setUser`, sin esperar `checkMfaLevel`). Ese hueco de
          // UN macrotask —el que separa el callback devuelto del
          // `setTimeout(0)` de `alSoltarElLock`— era la ventana en la que
          // ProtectedRoute veía `isLoading=false` + `mfaRequired=false`
          // (todavía el default, no el valor real) y dejaba montar el panel
          // de la inmobiliaria un tick antes de que el MFA check lo
          // corrigiera y redirigiera a /auth/mfa-verify. En ese tick se
          // disparaban TODOS los fetches protegidos del layout (config,
          // members, subscription, migración…) con el token aal1 — el bug
          // que reporta esta tarea. Alineado con INITIAL_SESSION, que ya
          // soltaba el loader en este mismo punto.
          const yaHizoOnboarding = userData?.onboardingCompleted === true
          alSoltarElLock(async () => {
            await checkMfaLevel(miGeneracion)
            if (sessionGenerationRef.current === miGeneracion) {
              setIsLoading(false)
            }
            // NOTE: the waiter handoff to `signInWithEmail` below is
            // intentionally NOT gated on the generation — it resolves a
            // promise local to the specific sign-in call that armed it (not
            // shared `AuthProvider` state), so a caller still awaiting it
            // must not be left hanging forever. `checkMfaLevel` itself
            // already dropped its own stale write above.
            if (yaHizoOnboarding) {
              requestNotificationPermission().catch(() => {})
            }
            // Hand the bootstrap result back to `signInWithEmail`, if it's the
            // one waiting on it (see the ref's doc comment above) — this is
            // the same point at which `signInWithEmail` used to return,
            // directly, before this became the bootstrap's single owner.
            signInBootstrapWaiterRef.current?.(userData)
            signInBootstrapWaiterRef.current = null
          })
        } else if (event === 'SIGNED_OUT') {
          // Bump FIRST, before anything else in this branch: every in-flight
          // coroutine for the session that just ended (an un-awaited
          // `fetchUser`/`probeAgencyMembership`, a deferred `checkMfaLevel`
          // via `alSoltarElLock`, a pending `claimActiveSession`) captured the
          // OLD generation and will find a mismatch — and drop its write
          // silently — whenever it eventually settles. See
          // `sessionGenerationRef`'s doc comment.
          sessionGenerationRef.current += 1
          // auth-js emite SIGNED_OUT cuando descarta una sesión que no pudo
          // renovar (`_removeSession`). Si NO fue el usuario el que se fue y
          // había alguien adentro, esto es la muerte del refresh token: hay que
          // salir a /auth, no quedarse en un panel que ya no puede cargar nada.
          // Sin esto la salida dependía de que ProtectedRoute estuviera montado
          // y reaccionara por estado de React — indirecto y tarde.
          if (!cierreVoluntarioRef.current && huboSesionRef.current) {
            terminarSesion('expirada')
          }
          // Mixing two identities in one response is the worst possible error
          // here (T-0082 WU-1 remediation, verify-1.md §2): `agencyProbeInFlightRef`
          // shares ONE in-flight `/inmobiliaria/agency` promise across every
          // caller with no token/identity check at all, so a probe still
          // pending for the session that just ended could resolve straight
          // into the NEXT session's own probe if left set. Clearing both refs
          // here — before the next SIGNED_IN can ever run — closes that gap
          // for the ref-level dedup and for `apiClient.get`'s implicit
          // (no-token) GETs (`clearInFlightGets`, see `client.ts`). Same
          // reasoning extends to the bootstrap seed (T-0082 WU-2b): a seed
          // set for the session that just ended must never be handed to the
          // next sign-in's first mount of PermissionsContext/
          // useAgencySubscription/useMySubscription in the same tab.
          agencyProbeInFlightRef.current = null
          clearInFlightGets()
          clearBootstrapSeed()
          setAccessToken(null)
          setUser(null)
          setAgencyState(null)
          setAgencyRole(null)
          setAgencyMemberStatus(null)
          setAgencyMembershipChecked(false)
          setLastProbeTransient(false)
          setPersistedContext(null)
          clearActiveContext()
          setMfaRequired(false)
          // T-0099 WU-4: mfaEnrollRequired/segundoFactorExigidoRef were left
          // out of this reset — an asymmetry with mfaRequired above. Inert
          // today (isLoading gating + hard redirects mean nothing reads the
          // stale value before the next sign-in's own bootstrap overwrites
          // it), but a logout while enroll-pending followed by a DIFFERENT
          // user logging in must start clean, not carry the previous
          // member's pending state for even one render.
          setMfaEnrollRequired(false)
          segundoFactorExigidoRef.current = false
          setNeedsOnboarding(false)
          setPerfilElegido(null)
          setIsLoading(false)
        } else if (event === 'USER_UPDATED' && session) {
          // `updateUser` (por ejemplo, guardar el perfil elegido) trae el
          // usuario nuevo en la misma sesión: releer los metadatos acá.
          setPerfilElegido(leerPerfilElegido(session.user?.user_metadata))
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // A refresh is NOT a new session — do NOT bump the generation here.
          // Just capture the CURRENT one: if a sign-out/sign-in genuinely
          // races this refresh's `fetchUser` call, that other event bumps the
          // generation itself and this stale write is dropped below same as
          // any other path; if nothing races it (the common case), the
          // generation is unchanged and this legitimate in-flight result is
          // still applied. See `sessionGenerationRef`'s doc comment.
          const miGeneracion = sessionGenerationRef.current
          huboSesionRef.current = true
          setAccessToken(session.access_token)
          const { user: userData, needsOnboarding: needsOnb } = await fetchUser(session)
          if (sessionGenerationRef.current !== miGeneracion) return
          if (userData) userData.hasPassword = getHasPassword(session)
          setUser(userData)
          setNeedsOnboarding(needsOnb)
          setPerfilElegido(leerPerfilElegido(session.user?.user_metadata))
          // Probe agency membership for every authenticated user (coexistence).
          // Fire-and-forget so the global loader isn't blocked by agency latency
          // (the agency-route gate still waits on agencyMembershipChecked).
          if (userData) {
            void probeAgencyMembership(session.access_token)
          }
          // El refresco corre adentro del lock de auth-js: el MFA se chequea al
          // soltarlo.
          //
          // T-0099: `isLoading` se suelta ACÁ ADENTRO, después del chequeo de
          // MFA — antes se soltaba afuera, sin esperarlo (comentario
          // "CRITICAL" de abajo, que documentaba la razón real de por qué el
          // loader tenía que soltarse igual: TOKEN_REFRESHED puede ser el
          // PRIMER evento de la carga, ej. una pestaña del panel dormida toda
          // la noche cuyo access token venció — Supabase lo renueva solo
          // ANTES de emitir INITIAL_SESSION). Esa es justo la ventana en la
          // que este bug se ve: `isLoading` ya en false, `mfaRequired`
          // todavía en su default `false` un tick antes de que el chequeo
          // deferred lo corrigiera — tiempo de sobra para que ProtectedRoute
          // montara el panel entero con el token aal1. Soltarlo acá adentro
          // sigue cumpliendo la garantía original (el loader se suelta pase
          // lo que pase, sin depender de otro evento) sin la ventana falsa.
          alSoltarElLock(async () => {
            await checkMfaLevel(miGeneracion)
            if (sessionGenerationRef.current === miGeneracion) {
              setIsLoading(false)
            }
          })
        } else if (event === 'MFA_CHALLENGE_VERIFIED' && session) {
          /**
           * T-0099: `supabase.auth.mfa.verify()` (llamado desde
           * /auth/mfa-verify) sube la sesión a aal2 y avisa con este evento —
           * que hasta acá NO tenía handler. `session` acá es la respuesta de
           * `/factors/:id/verify` (ver GoTrueClient#_verify en
           * @supabase/auth-js): trae un `access_token` NUEVO, ya en aal2.
           *
           * Sin este branch, `apiClient` seguía sirviendo el token VIEJO
           * (aal1) — `setAccessToken` nunca se llamaba acá — hasta el
           * próximo refresh natural o una recarga completa. El primer fetch
           * protegido después de "verificar" podía seguir dando 403 con un
           * token que a los ojos de React YA se veía liberado (la página
           * llama a `setMfaVerified()` apenas `mfa.verify()` resuelve).
           *
           * No es una sesión nueva — no bumpear la generación (mismo
           * razonamiento que TOKEN_REFRESHED). `setAccessToken` corre
           * SINCRÓNICO, antes de cualquier `await`, así que para cuando el
           * `mfa.verify()` que llamó la página resuelve, el token ya está
           * puesto — `_notifyAllSubscribers` espera a este callback (ver
           * GoTrueClient#_notifyAllSubscribers) antes de devolver el
           * control. El chequeo de MFA sigue diferido: mismo lock de auth-js
           * que todo lo demás acá.
           */
          const miGeneracion = sessionGenerationRef.current
          huboSesionRef.current = true
          setAccessToken(session.access_token)
          alSoltarElLock(() => checkMfaLevel(miGeneracion))
        }
      }
    )

    return () => {
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [fetchUser, fetchBootstrap, checkMfaLevel, probeAgencyMembership, applyAgencyFetchResult, claimActiveSession])

  /** Sign in with Google OAuth via Supabase */
  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not initialized')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      throw error
    }
  }, [])

  /**
   * Sign in with email and password. Returns the loaded user so callers can
   * redirect based on role (and so `AuthForm` can detect a bootstrap failure
   * that resolves to `null` without throwing — e.g. the 409 duplicate-identity
   * case in `fetchUser`).
   *
   * T-0082 WU-1 (F1): this used to call `fetchUser` + `checkMfaLevel` itself,
   * IN ADDITION to the `onAuthStateChange` listener's SIGNED_IN handler doing
   * the exact same thing for the exact same sign-in — `/users/me` fired
   * twice on every login. The listener is now the bootstrap's single owner;
   * this function only authenticates against Supabase and then waits for the
   * listener's own run to settle.
   */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not initialized')

    // Armed BEFORE calling signInWithPassword: supabase-js notifies
    // onAuthStateChange (SIGNED_IN) as part of establishing the session,
    // which can happen before signInWithPassword's own promise settles —
    // arming the waiter afterward would risk missing that notification.
    let resolveBootstrap!: (user: User | null) => void
    const bootstrapPromise = new Promise<User | null>((resolve) => {
      resolveBootstrap = resolve
    })
    signInBootstrapWaiterRef.current = resolveBootstrap

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      signInBootstrapWaiterRef.current = null
      throw error
    }
    if (!data.session) {
      // No session to bootstrap from — no SIGNED_IN event will fire for this
      // attempt, so nothing will ever resolve the waiter above.
      signInBootstrapWaiterRef.current = null
      return null
    }
    return bootstrapPromise
  }, [])

  /**
   * Sign up with email and password. Returns whether email confirmation is required.
   *
   * `perfil` lleva datos que ya conocemos de la persona **antes** de que tenga
   * cuenta — hoy los del recorrido de aprobación (nombre, celular, cédula,
   * ciudad). Van a `user_metadata`, que sobrevive al link de confirmación y se
   * puede leer del lado del servidor. Sin esto habría que volver a pedirle cosas
   * que acaba de escribir dos pantallas atrás.
   */
  const signUpWithEmail = useCallback(async (email: string, password: string, redirectTo?: string, intendedRole?: UserRole, perfil?: Record<string, string>) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not initialized')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
        // Persist the profile chosen at signup as user_metadata so it survives
        // regardless of the confirmation link (readable server-side too).
        ...(intendedRole || perfil
          ? { data: { ...(intendedRole ? { intended_role: intendedRole } : {}), ...(perfil ?? {}) } }
          : {}),
      },
    })
    if (error) throw error
    const requiresConfirmation = !data.session
    return { requiresConfirmation }
  }, [])

  /** Send password reset email */
  const sendPasswordReset = useCallback(async (email: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not initialized')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?returnUrl=/auth/update-password`,
    })
    if (error) throw error
  }, [])

  /**
   * Reenvía el correo de confirmación del registro. Con el MISMO `redirectTo`
   * que el primero: sin él, el enlace nuevo vuelve a la raíz del sitio y la
   * persona pierde el onboarding al que iba (Nico, 2026-09-07: «Revisa tu
   * correo» no ofrecía reenviar).
   */
  const resendSignUpEmail = useCallback(async (email: string, redirectTo?: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not initialized')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {}),
    })
    if (error) throw error
  }, [])

  /** Update password for authenticated user (works for both email and Google users) */
  const updatePassword = useCallback(async (newPassword: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not initialized')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }, [])

  /** Verify current password by re-authenticating. Returns true if password is correct. */
  const verifyCurrentPassword = useCallback(async (password: string): Promise<boolean> => {
    const supabase = getSupabase()
    if (!supabase) return false
    const email = user?.email
    if (!email) return false
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return !error
  }, [user?.email])

  /** Change password via backend: verifies current password then updates.
   *  currentPassword is optional — omit for Google-only accounts. */
  const changePassword = useCallback(async (currentPassword: string | undefined, newPassword: string): Promise<void> => {
    await apiClient.patch('/users/me/password', { currentPassword, newPassword })
  }, [])

  /** Update user profile fields and refresh local user state */
  const updateProfile = useCallback(async (data: { firstName?: string | null; lastName?: string | null; phone?: string | null; rut?: string | null; address?: string | null; birthDate?: string | null; emergencyContactName?: string | null; emergencyContactPhone?: string | null }): Promise<void> => {
    const updated = await apiClient.patch<Record<string, unknown>>('/users/me', data)
    // PATCH /users/me has no session at hand — keep the confirmation stamp we already had
    setUser((prev) => ({ ...mapBackendUser(updated, prev?.emailConfirmedAt) }))
  }, [])

  /** Sign out and clear state. Synchronous cleanup runs first; backend
   *  cleanup (FCM, Supabase) is fire-and-forget so a hung lock or network
   *  failure can never block the UI from logging out. */
  const signOut = useCallback(async () => {
    // El SIGNED_OUT que va a emitir Supabase más abajo es consecuencia de ESTA
    // llamada, no de un token muerto: marcarlo evita el cartel "tu sesión
    // expiró" sobre una salida que el usuario pidió.
    cierreVoluntarioRef.current = true
    // Bump the session generation NOW, synchronously, before any of the
    // async work below — this invalidates every in-flight bootstrap/probe/
    // refresh for the session that's ending, so an uncancellable coroutine
    // that outlives it drops its write instead of applying it to whatever
    // session starts next in this tab. See `sessionGenerationRef`'s doc
    // comment. (The `SIGNED_OUT` event this triggers bumps it again — that's
    // fine, we only ever compare for equality, never for a specific delta.)
    sessionGenerationRef.current += 1
    // Best-effort FCM cleanup with the token still in memory.
    // Awaited but with a hard timeout so a slow backend can't stall logout.
    //
    // Y la revocación en el SERVIDOR, con el mismo tope. Sin esto el cierre
    // era sólo local: el back seguía teniendo esta sesión como la activa, y
    // el siguiente login la encontraba y avisaba «cerramos tu sesión en otro
    // dispositivo» — sobre una sesión que el usuario mismo cerró. Es lo que
    // ya hace el cierre por inactividad (IdleSessionGuard).
    //
    // 🔴 `cerrandoRef`: si la sesión ya fue desplazada por otro dispositivo,
    // el revoke responde 401 SESSION_SUPERSEDED, y ese 401 vuelve a caer en
    // el backstop de abajo, que llama a signOut, que revoca, que da 401… La
    // bandera corta la cadena: mientras se está cerrando, un 401 de sesión
    // desplazada no abre otro cierre.
    cerrandoRef.current = true
    const tokenVivo = getAccessToken()
    try {
      await Promise.race([
        Promise.all([
          removeFcmToken().catch(() => {}),
          // Back + Supabase (el refresh token), ANTES de borrar las cookies:
          // ver `revocar-sesion.ts`.
          tokenVivo ? revocarSesion(tokenVivo) : Promise.resolve(),
        ]),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ])
    } finally {
      cerrandoRef.current = false
    }

    // Limpieza síncrona — tiene que salir bien aunque Supabase se cuelgue abajo.
    // Vive en session-terminal.ts porque el cierre por sesión vencida necesita
    // exactamente lo mismo: una sola definición de "qué es limpiar la sesión".
    purgarSesionLocal()

    // Same reason as the `SIGNED_OUT` branch above in the auth-event listener
    // (T-0082 WU-1 remediation, verify-1.md §2): mixing two identities in one
    // response is the worst possible error here. This user-initiated path is
    // the one `AuthForm.tsx`'s "cambiar de cuenta" actually exercises before
    // the next sign-in can start, and it must not wait on the fire-and-forget
    // `supabase.auth.signOut()` below (or its own async SIGNED_OUT event) to
    // clear these — that could still lose the race against an immediate
    // sign-in in the same tab.
    agencyProbeInFlightRef.current = null
    clearInFlightGets()
    clearBootstrapSeed()

    setAccessToken(null)
    setUser(null)
    setNeedsOnboarding(false)
    setPerfilElegido(null)
    setAgencyState(null)
    setAgencyRole(null)
    setAgencyMemberStatus(null)
    setAgencyMembershipChecked(false)
    setLastProbeTransient(false)
    setPersistedContext(null)
    clearActiveContext()
    setMfaRequired(false)

    // Fire-and-forget — never await, supabase's internal lock can hang here.
    try {
      const supabase = getSupabase()
      supabase?.auth.signOut({ scope: 'local' }).catch(() => {})
    } catch {}
  }, [])

  // Backstop global de 401. `apiClient` sólo llama acá con un código de sesión
  // muerta, así que no hace falta volver a filtrar: un 401 de onboarding o de
  // permisos nunca llega a este handler.
  //
  // Los dos códigos NO se tratan igual, y por eso la decisión vive acá y no en
  // apiClient:
  //   - vencida/inválida → salida dura a /auth con el motivo.
  //   - SESSION_SUPERSEDED → el camino bueno es el modal "iniciaste sesión en
  //     otro dispositivo" (SessionRevocationHandler, por Realtime). Redirigir
  //     duro acá se lo comería y el usuario nunca sabría por qué lo sacaron;
  //     con signOut, ProtectedRoute lo lleva a /auth igual.
  useEffect(() => {
    setUnauthorizedHandler((code) => {
      if (code === 'SESSION_SUPERSEDED') {
        if (!cerrandoRef.current) void signOut()
        return
      }
      // No se cierra por lo que diga el 401: se cierra si el refresh token
      // tampoco vive. Un back apuntando a otro proyecto de Supabase manda
      // `AUTH_TOKEN_INVALID` con la sesión del usuario intacta, y antes eso
      // lo sacaba del panel diciéndole que había expirado.
      void terminarSesionSiMurio('expirada')
    })
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  // Un access token vencido se renueva acá antes de dar la sesión por muerta:
  // el apiClient lo pide cuando el back contesta `AUTH_TOKEN_EXPIRED`
  // (pestaña dormida, primera petición al volver). Si el refresh token
  // también murió, Supabase devuelve error y el cliente sí cierra sesión.
  useEffect(() => {
    setTokenRefresher(async () => {
      const supabase = getSupabase()
      if (!supabase) return null
      const { data, error } = await supabase.auth.refreshSession()
      if (error || !data.session) return null
      return data.session.access_token
    })
    return () => setTokenRefresher(null)
  }, [])

  // Quién puede decir que la sesión murió DE VERDAD: el refresh token. Vive
  // acá porque es el único lugar con el cliente de Supabase; `session-terminal`
  // lo consulta antes de sacar a nadie del panel.
  useEffect(() => {
    registrarConfirmacionDeSesion(async () => {
      const supabase = getSupabase()
      // Sin cliente no hay forma de corroborar: se conserva el cierre.
      if (!supabase) return true
      const { data, error } = await supabase.auth.refreshSession()
      if (error || !data.session) return true
      // Renovó: la sesión está viva y este token es el bueno. Dejarlo puesto
      // evita que la siguiente petición repita el 401 con el token viejo.
      setAccessToken(data.session.access_token)
      return false
    })
    return () => registrarConfirmacionDeSesion(null)
  }, [])

  // `terminarSesion` corre fuera de React (lo dispara apiClient). Le pasamos
  // signOut para que la limpieza asíncrona —FCM, signOut de Supabase— también
  // ocurra en el cierre por vencimiento, no sólo en el voluntario.
  useEffect(() => {
    registrarCierreDeSesion(() => {
      cierreVoluntarioRef.current = true
      void signOut()
    })
    return () => registrarCierreDeSesion(null)
  }, [signOut])

  // ── Derived membership / active-context signals ────────────────────────────
  // Agency-panel access hinges on this ONE signal (ACTIVE membership only).
  const hasActiveAgencyMembership = agencyMemberStatus === 'ACTIVE'
  // Use the SHARED predicate (also used by PlanHeader's switcher) so context
  // resolution and switcher visibility can never disagree.
  const isDualContext = isDualContextUser(user, hasActiveAgencyMembership)
  // Effective context: pure agency → always 'agency'; dual-context → persisted
  // choice (default personal); everyone else → 'personal'. A stale persisted
  // 'agency' from a user who lost membership is ignored (not dual → 'personal').
  const activeContext: ActiveContext =
    user?.role === 'agency'
      ? 'agency'
      : isDualContext
        ? persistedContext ?? 'personal'
        : 'personal'

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    mfaRequired,
    mfaEnrollRequired,
    needsOnboarding,
    perfilElegido,
    agency,
    agencyRole,
    agencyMemberStatus,
    hasActiveAgencyMembership,
    agencyMembershipChecked,
    activeContext,
    refreshAgency,
    setActiveContext,
    elegirPerfil,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    resendSignUpEmail,
    updatePassword,
    verifyCurrentPassword,
    changePassword,
    signOut,
    logout: signOut,
    refreshUser,
    updateProfile,
    setMfaVerified,
    setAgency,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
