'use client'

/**
 * PIIRevealContext — Phase 31 plan 31-09 (D-31-05/06/07/08).
 *
 * In-memory bag of revealed PII tokens keyed by FieldKey. NOT persisted to
 * localStorage / sessionStorage (D-31-06): navigating away or refreshing the
 * page re-masks every field. The provider also runs a 1s interval that calls
 * clearExpired() — entries whose expires_at < Date.now() are removed and the
 * context value updates, triggering consuming <Mask> instances to re-mask.
 *
 * On debtorId change the provider state resets (React keying handled by the
 * caller — see DebtorDetailClient which mounts a single provider per page).
 */

import * as React from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

void React

export type PIIFieldKey = 'cedula' | 'phone' | 'email' | 'fiador_cedula'

export interface RevealEntry {
  /** Server-minted JWT (HS256, 5 min exp per D-31-06). */
  token: string
  /** Raw revealed value. */
  value: string
  /** Epoch milliseconds at which the token expires. */
  expiresAt: number
}

interface PIIRevealContextValue {
  debtorId: string
  getRevealed: (field: PIIFieldKey) => RevealEntry | undefined
  setRevealed: (field: PIIFieldKey, entry: RevealEntry) => void
  clearExpired: () => void
  /** Bump-tick to drive countdown re-renders in consumer components. */
  tick: number
}

const PIIRevealContext = createContext<PIIRevealContextValue | null>(null)

interface ProviderProps {
  debtorId: string
  children: ReactNode
}

export function PIIRevealContextProvider({ debtorId, children }: ProviderProps) {
  // tokens map: field -> RevealEntry | undefined
  // D-31-06: useState only — NEVER localStorage/sessionStorage.
  const [tokens, setTokens] = useState<Partial<Record<PIIFieldKey, RevealEntry>>>({})
  const [tick, setTick] = useState<number>(0)

  // Reset bag whenever debtorId changes (provider remount via React keying
  // is the canonical pattern; this guard is belt-and-suspenders).
  const lastDebtorId = useRef<string>(debtorId)
  useEffect(() => {
    if (lastDebtorId.current !== debtorId) {
      lastDebtorId.current = debtorId
      setTokens({})
    }
  }, [debtorId])

  const getRevealed = useCallback(
    (field: PIIFieldKey): RevealEntry | undefined => {
      const entry = tokens[field]
      if (!entry) return undefined
      if (entry.expiresAt <= Date.now()) return undefined
      return entry
    },
    [tokens],
  )

  const setRevealed = useCallback((field: PIIFieldKey, entry: RevealEntry) => {
    setTokens((prev) => ({ ...prev, [field]: entry }))
  }, [])

  const clearExpired = useCallback(() => {
    setTokens((prev) => {
      const now = Date.now()
      let changed = false
      const next: Partial<Record<PIIFieldKey, RevealEntry>> = {}
      ;(Object.keys(prev) as PIIFieldKey[]).forEach((k) => {
        const entry = prev[k]
        if (!entry) return
        if (entry.expiresAt > now) {
          next[k] = entry
        } else {
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [])

  // 1-second ticker — drives both clearExpired() and the countdown re-render
  // hint via `tick`. The interval runs unconditionally; cost is negligible
  // (1 setState per second only when something changes).
  useEffect(() => {
    const id = setInterval(() => {
      clearExpired()
      setTick((t) => t + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [clearExpired])

  const value = useMemo<PIIRevealContextValue>(
    () => ({ debtorId, getRevealed, setRevealed, clearExpired, tick }),
    [debtorId, getRevealed, setRevealed, clearExpired, tick],
  )

  return <PIIRevealContext.Provider value={value}>{children}</PIIRevealContext.Provider>
}

/** Throws if used outside the provider. */
export function usePIIRevealContext(): PIIRevealContextValue {
  const ctx = useContext(PIIRevealContext)
  if (!ctx) {
    throw new Error('usePIIRevealContext must be used inside <PIIRevealContextProvider>')
  }
  return ctx
}

/** Returns null outside the provider — for cases where the wrapper is optional. */
export function usePIIRevealContextSafe(): PIIRevealContextValue | null {
  return useContext(PIIRevealContext)
}
