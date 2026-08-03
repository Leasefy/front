'use client'

/**
 * use-enabled-profiles.ts — reads which signup profiles an admin left enabled.
 *
 * FAIL-OPEN by design. Signup is the top of the funnel; hiding a profile is a
 * deliberate admin action, but a backend hiccup must never hide ALL of them.
 * So the hook:
 *   - starts with every profile enabled (optimistic, before the fetch),
 *   - narrows to the backend set only on a valid NON-EMPTY response,
 *   - reverts to all-enabled on error OR on an empty response.
 *
 * Consumers use `isEnabled(key)` to filter their role cards.
 */

import { useEffect, useMemo, useState } from 'react'

import { fetchEnabledRegistrationProfiles } from '@/lib/api/registration-profiles.service'
import {
  REGISTRATION_PROFILE_KEYS,
  type RegistrationProfileKey,
} from '@/lib/constants/registration-profiles'

const ALL_ENABLED: readonly RegistrationProfileKey[] = REGISTRATION_PROFILE_KEYS

export interface UseEnabledProfilesResult {
  /** The enabled keys as a set. Defaults to all while loading / on failure. */
  enabled: Set<RegistrationProfileKey>
  isEnabled: (key: RegistrationProfileKey) => boolean
  isLoading: boolean
}

export function useEnabledProfiles(): UseEnabledProfilesResult {
  const [keys, setKeys] = useState<readonly RegistrationProfileKey[]>(ALL_ENABLED)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetchEnabledRegistrationProfiles()
      .then((enabledKeys) => {
        if (cancelled) return
        // Empty set → treat as misconfiguration and fail open, never a dead signup.
        setKeys(enabledKeys.length > 0 ? enabledKeys : ALL_ENABLED)
      })
      .catch(() => {
        if (cancelled) return
        setKeys(ALL_ENABLED)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const enabled = useMemo(() => new Set(keys), [keys])

  return {
    enabled,
    isEnabled: (key) => enabled.has(key),
    isLoading,
  }
}
