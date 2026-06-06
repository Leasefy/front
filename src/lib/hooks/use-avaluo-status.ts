'use client'

/**
 * useAvaluoStatus — polls the status endpoint for a submitted avalúo.
 *
 * Polls every 15s; stops on terminal states. Status endpoint mocked in service.
 */

import { useState, useEffect } from 'react'
import { getAvaluoStatus } from '@/lib/api/avaluo.service'
import type { AvaluoStatusResponse } from '@/lib/types/avaluo'
import { TERMINAL_STATUSES } from '@/lib/types/avaluo'

interface UseAvaluoStatusReturn {
  statusData: AvaluoStatusResponse | null
  isLoading: boolean
}

export function useAvaluoStatus(
  submissionId: string | null
): UseAvaluoStatusReturn {
  const [statusData, setStatusData] = useState<AvaluoStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    if (!submissionId) return

    // Stop polling once we reach a terminal state
    if (statusData && TERMINAL_STATUSES.includes(statusData.status)) return

    const poll = async () => {
      try {
        const res = await getAvaluoStatus(submissionId)
        setStatusData(res)
        setIsLoading(false)
      } catch {
        setIsLoading(false)
      }
    }

    // Immediate first fetch
    poll()

    const id = setInterval(poll, 15_000)
    // CRITICAL: clear the interval to avoid memory leaks and stale callbacks
    return () => clearInterval(id)
  }, [submissionId, statusData?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  return { statusData, isLoading }
}
