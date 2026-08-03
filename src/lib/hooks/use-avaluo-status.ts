'use client'

/**
 * useAvaluoStatus — polls the status endpoint for a submitted avalúo.
 *
 * - Polls every 15s.
 * - Stops on terminal states (entregado / rechazado).
 * - Also stops when status is 'firmado' AND certId is present (payment ready —
 *   no point polling further until after payment).
 * - Exposes error state: if getAvaluoStatus throws, isError=true and polling
 *   continues (transient network errors should self-heal).
 */

import { useState, useEffect } from 'react'
import { getAvaluoStatus } from '@/lib/api/avaluo.service'
import type { AvaluoStatusResponse } from '@/lib/types/avaluo'
import { TERMINAL_STATUSES } from '@/lib/types/avaluo'

interface UseAvaluoStatusReturn {
  statusData: AvaluoStatusResponse | null
  isLoading: boolean
  /** Set when the last poll threw an error. Cleared on next successful poll. */
  isError: boolean
  error: Error | null
}

function shouldStopPolling(data: AvaluoStatusResponse | null): boolean {
  if (!data) return false
  // Terminal states: no more transitions possible
  if (TERMINAL_STATUSES.includes(data.status)) return true
  // firmado + certId: payment can be initiated; no need to keep polling
  if (data.status === 'firmado' && !!data.certId) return true
  return false
}

export function useAvaluoStatus(
  submissionId: string | null
): UseAvaluoStatusReturn {
  const [statusData, setStatusData] = useState<AvaluoStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isError, setIsError] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!submissionId) return

    // Stop polling once we reach a stable state
    if (shouldStopPolling(statusData)) return

    const poll = async () => {
      try {
        const res = await getAvaluoStatus(submissionId)
        setStatusData(res)
        setIsError(false)
        setError(null)
      } catch (err) {
        // Expose the error to the caller — do NOT mask it or return a fake status.
        // Polling continues so transient network failures self-heal.
        setIsError(true)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsLoading(false)
      }
    }

    // Immediate first fetch
    poll()

    const id = setInterval(poll, 15_000)
    return () => clearInterval(id)
  }, [submissionId, statusData?.status, statusData?.certId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { statusData, isLoading, isError, error }
}
