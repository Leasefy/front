'use client'

/**
 * PanelPrefsContext — Phase 38 plan 38-06 (D-38-06 / D-38-07).
 *
 * Hybrid localStorage + DB persistence for AI panel preferences. Currently
 * houses a single key: `panel_tour_dismissed_v1`. The DB side lives in
 * agency_members.preferences JSONB and is written through the Phase 38-03
 * endpoint `PATCH /api/agency/:agencyId/members/me/preferences`.
 *
 * State machine (D-38-07):
 *   - `tourDismissed === null` → context still hydrating from localStorage.
 *     Consumers should wait before firing the tour to avoid a flash.
 *   - `tourDismissed === false` → eligible to auto-trigger the tour.
 *   - `tourDismissed === true`  → silenced; user has already dismissed.
 *
 * Persistence rules:
 *   - setTourDismissed(true)  → writes localStorage AND fires the PATCH.
 *   - setTourDismissed(false) → writes localStorage only. (Not a code path
 *     today, but kept symmetric for future use.)
 *   - relaunchTour()          → flips in-memory state to false, no localStorage
 *     write, no API call. Survives only the current React tree.
 *
 * Server seed (D-38-06):
 *   - The auth-context dispatches a `leasefy:preferences:loaded` custom event
 *     after fetching /users/me. The detail carries `panel_tour_dismissed_v1`.
 *   - seedFromServer() honors a true server value over any false localStorage
 *     value (cross-device dismiss should win), but never downgrades local true
 *     to false (DB false is the initial state — local true means the user
 *     explicitly dismissed on this device).
 *
 * Security (T-38-06-02): localStorage key is namespaced + version-suffixed
 * (`leasefy_panel_tour_dismissed_v1`) so a future schema change can invalidate
 * stale state cleanly. Stored value is a boolean string ('true'/'false') —
 * NO PII in localStorage.
 *
 * Refs:
 *   - .planning/phases/38-polish-empty-states-onboarding-a11y/38-CONTEXT.md (D-38-05/06/07/08)
 *   - .planning/phases/38-polish-empty-states-onboarding-a11y/38-06-PLAN.md
 *   - mvp/src/lib/context/PIIRevealContext.tsx (createContext<T|null> + safe hook pattern)
 *   - mvp/src/lib/context/TenantOnboardingContext.tsx (localStorage hydration with guard)
 */

import * as React from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

void React

/** Exact namespaced localStorage key (T-38-06-02 — versioned suffix). */
export const STORAGE_KEY = 'leasefy_panel_tour_dismissed_v1'

/** Backend route on the agent service (NOT the NestJS BFF). */
const PREFERENCES_PATH = (agencyId: string) =>
  `/api/agency/${agencyId}/members/me/preferences`

/** Custom event emitted by auth-context.tsx after /users/me resolves. */
export const PREFERENCES_LOADED_EVENT = 'leasefy:preferences:loaded'

export interface PreferencesLoadedDetail {
  panel_tour_dismissed_v1: boolean
}

export interface PanelPrefsContextValue {
  /** null until localStorage has been read; boolean afterwards. */
  tourDismissed: boolean | null
  /**
   * Persist a dismiss decision. `true` writes localStorage AND fires the
   * PATCH endpoint; `false` writes localStorage only.
   */
  setTourDismissed: (value: boolean) => Promise<void>
  /**
   * Session-only relaunch — flips in-memory state to false without
   * persisting to localStorage or the DB. Used by the "Tour del panel"
   * link in the user menu.
   */
  relaunchTour: () => void
  /**
   * Server-side seed. Invoked when auth-context loads the user profile;
   * also wired internally via the PREFERENCES_LOADED_EVENT custom event so
   * this provider does not need direct access to the auth flow.
   */
  seedFromServer: (value: boolean) => void
}

const PanelPrefsContext = createContext<PanelPrefsContextValue | null>(null)

interface ProviderProps {
  children: ReactNode
}

export function PanelPrefsProvider({ children }: ProviderProps) {
  const { agency } = useAuth()
  const [tourDismissed, setTourDismissedState] = useState<boolean | null>(null)

  // Internal state-setter used by both the event listener and the public
  // seedFromServer method. The merge rule mirrors the contract above:
  // server truth wins for `true`, but a stale-localStorage `true` is kept.
  const seedFromServerInternal = useCallback((value: boolean) => {
    setTourDismissedState((prev) => {
      if (prev === null) return value
      // DB dismiss wins over any local state.
      if (value === true) {
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(STORAGE_KEY, 'true')
          } catch {
            // Storage may be unavailable in private browsing; non-fatal.
          }
        }
        return true
      }
      // Server says undismissed; if local is already true (user dismissed
      // here), keep the local truth — don't reset their choice.
      return prev
    })
  }, [])

  // 1. Hydrate from localStorage on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved !== null) {
        setTourDismissedState(saved === 'true')
      } else {
        // No prior decision → undismissed (default = show tour).
        setTourDismissedState(false)
      }
    } catch {
      // localStorage may throw in private browsing or sandboxed contexts.
      setTourDismissedState(false)
    }
  }, [])

  // 2. Listen for the auth-context preference event (D-38-06 cross-device seed).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PreferencesLoadedDetail>).detail
      if (detail && typeof detail.panel_tour_dismissed_v1 === 'boolean') {
        seedFromServerInternal(detail.panel_tour_dismissed_v1)
      }
    }
    window.addEventListener(PREFERENCES_LOADED_EVENT, handler)
    return () => window.removeEventListener(PREFERENCES_LOADED_EVENT, handler)
  }, [seedFromServerInternal])

  const setTourDismissed = useCallback(
    async (value: boolean) => {
      // Optimistic local write — survives reload even if the PATCH fails.
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_KEY, String(value))
        } catch {
          // Non-fatal — localStorage may be unavailable.
        }
      }
      setTourDismissedState(value)

      // Only the "dismissed → true" transition is persisted to the DB.
      // Re-enable (false) is intentionally session-only.
      if (value !== true) return

      const agencyId = agency?.id
      if (!agencyId) return

      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl) return

      try {
        const res = await fetch(`${agentUrl}${PREFERENCES_PATH(agencyId)}`, {
          method: 'PATCH',
          headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ panel_tour_dismissed_v1: true }),
        })
        if (!res.ok) {
          // Non-fatal: localStorage is already written; the next login will
          // re-sync the DB from the server response (which is currently false)
          // — but the local truth keeps the tour silenced anyway.
          console.warn(
            '[PanelPrefsContext] preferences PATCH failed:',
            res.status,
          )
        }
      } catch (err) {
        console.warn('[PanelPrefsContext] preferences PATCH error:', err)
      }
    },
    [agency?.id],
  )

  const relaunchTour = useCallback(() => {
    // Session-only flip: no localStorage write, no DB call. The next page
    // mount will pick this up and fire the tour.
    setTourDismissedState(false)
  }, [])

  const seedFromServer = useCallback(
    (value: boolean) => {
      seedFromServerInternal(value)
    },
    [seedFromServerInternal],
  )

  const value = useMemo<PanelPrefsContextValue>(
    () => ({
      tourDismissed,
      setTourDismissed,
      relaunchTour,
      seedFromServer,
    }),
    [tourDismissed, setTourDismissed, relaunchTour, seedFromServer],
  )

  return (
    <PanelPrefsContext.Provider value={value}>
      {children}
    </PanelPrefsContext.Provider>
  )
}

/** Throws if used outside the provider. */
export function usePanelPrefs(): PanelPrefsContextValue {
  const ctx = useContext(PanelPrefsContext)
  if (!ctx) {
    throw new Error('usePanelPrefs must be used inside <PanelPrefsProvider>')
  }
  return ctx
}

/**
 * Safe variant — returns null outside the provider. Used by PlanHeader which
 * renders across multiple layouts (only the inmobiliaria layout mounts the
 * provider).
 */
export function usePanelPrefsSafe(): PanelPrefsContextValue | null {
  return useContext(PanelPrefsContext)
}
