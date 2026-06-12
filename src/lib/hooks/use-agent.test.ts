/**
 * use-agent.test.ts — tenant-scoring execution hook
 *
 * Covers runScoring against the MAIN BACKEND evaluations contract
 * (Leasefy/back, FRONTEND-API-CONTRACTS.md). The front never hits the agent
 * micro directly:
 *   POST /evaluations/:applicationId        → 202 { runId, status: 'PENDING' }
 *   GET  /evaluations/:applicationId/result → EvaluationResponseDto
 *
 * Scenarios:
 *   (1) dispatch (no body) → poll → COMPLETED maps to result
 *   (2) PENDING then COMPLETED (active poll loop)
 *   (3) FAILED surfaces an error + failed trace
 *   (4) dispatch error (e.g. 429) surfaces an error, never polls
 *   (5) AWAITING_EVALUATION exits the poll with awaiting state, no throw
 *   (6) every awaiting_reason surfaces (7 values incl. consent_unavailable)
 *   (7) recheckScoring transitions awaiting → completed (by applicationId)
 *   (8) background slow poll for study_in_progress auto-completes
 *   (9) clearResult clears awaiting + stops the background poll
 *  (10) paths: POST/GET use /evaluations/:applicationId (by applicationId, not runId)
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockPost = vi.fn()
const mockGet = vi.fn()
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
    get: (...args: unknown[]) => mockGet(...args),
  },
  getAccessToken: () => 'test-token',
  ApiError: class ApiError extends Error {
    constructor(public status: number, msg: string) { super(msg); this.name = 'ApiError' }
  },
}))

import { useAgentExecution } from './use-agent'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const COMPLETED = {
  runId: 'run_1',
  status: 'COMPLETED',
  score: 82,
  level: 'B',
  score_breakdown: { financial: 30, stability: 20, history: 15, integrity: 10, payment_history: 7 },
  observations: [{ doc_type: 'extracto_bancario', code: 'OK', severity: 'info', message: 'Sin observaciones' }],
  integrity_flags: [],
  documents_summary: { total_sent: 2, processed: 2, skipped: 0, types_present: ['cedula', 'extracto_bancario'] },
  explanation: 'Ingresos consistentes',
  requires_manual_review: false,
  createdAt: '2026-06-08T00:00:00Z',
}

function awaitingBody(reason: string, extra: Record<string, unknown> = {}) {
  return { runId: 'run_aw', status: 'AWAITING_EVALUATION', awaiting_reason: reason, ...extra }
}

// ── Harness ──────────────────────────────────────────────────────────────────

let container: HTMLDivElement
let root: Root

type Hook = ReturnType<typeof useAgentExecution>

function renderHook(): { get: () => Hook } {
  let latest: Hook | null = null
  function TestComponent() {
    latest = useAgentExecution()
    return null
  }
  act(() => { root.render(React.createElement(TestComponent)) })
  return { get: () => latest as Hook }
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  mockPost.mockReset()
  mockGet.mockReset()
  // Default happy-path dispatch.
  mockPost.mockResolvedValue({ runId: 'run_1', status: 'PENDING' })
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// ── (1) dispatch → poll → completed ──────────────────────────────────────────

describe('runScoring — dispatch then completed', () => {
  it('POSTs without a body and maps a COMPLETED result', async () => {
    mockGet.mockResolvedValueOnce(COMPLETED)

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_1') })

    // Dispatch is a bodyless POST to /evaluations/:applicationId.
    expect(mockPost).toHaveBeenCalledTimes(1)
    expect(mockPost.mock.calls[0][0]).toBe('/evaluations/app_1')
    expect(mockPost.mock.calls[0][1]).toBeUndefined()

    expect(hook.get().error).toBeNull()
    expect(hook.get().result).toMatchObject({ score: 82, level: 'B' })
    expect(hook.get().trace?.status).toBe('completed')
    expect(hook.get().trace?.steps.every((s) => s.status === 'completed')).toBe(true)
  })

  it('maps score_breakdown, documents_summary and requires_manual_review', async () => {
    mockGet.mockResolvedValueOnce(COMPLETED)

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_1') })

    const result = hook.get().result as { scoreBreakdown?: unknown; documentsSummary?: unknown; requiresManualReview?: boolean }
    expect(result.scoreBreakdown).toMatchObject({ financial: 30, payment_history: 7 })
    expect(result.documentsSummary).toMatchObject({ total_sent: 2, processed: 2 })
    expect(result.requiresManualReview).toBe(false)
  })
})

// ── (2) PENDING then COMPLETED ───────────────────────────────────────────────

describe('runScoring — active poll loop', () => {
  it('keeps polling while PENDING and resolves on COMPLETED', async () => {
    vi.useFakeTimers()
    mockGet
      .mockResolvedValueOnce({ runId: 'run_1', status: 'PENDING' })
      .mockResolvedValueOnce(COMPLETED)

    const hook = renderHook()
    let p: Promise<void>
    act(() => { p = hook.get().runScoring('app_1') })
    // Advance past the 1.8s poll interval so the loop runs the second GET.
    await act(async () => { await vi.advanceTimersByTimeAsync(1800) })
    await act(async () => { await p })

    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(hook.get().result).toMatchObject({ score: 82, level: 'B' })
    expect(hook.get().trace?.status).toBe('completed')
  })
})

// ── (3) FAILED ───────────────────────────────────────────────────────────────

describe('runScoring — failed run', () => {
  it('surfaces an error and a failed trace when status is FAILED', async () => {
    mockGet.mockResolvedValueOnce({ runId: 'run_1', status: 'FAILED', error: 'Documentos ilegibles' })

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_1') })

    expect(hook.get().error).toBe('Documentos ilegibles')
    expect(hook.get().result).toBeNull()
    expect(hook.get().trace?.status).toBe('failed')
  })
})

// ── (4) dispatch error ───────────────────────────────────────────────────────

describe('runScoring — dispatch error', () => {
  it('surfaces the backend error and never polls', async () => {
    mockPost.mockReset()
    mockPost.mockRejectedValueOnce(new Error('Límite PRO de 30 evaluaciones/mes alcanzado'))

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_1') })

    expect(mockGet).not.toHaveBeenCalled()
    expect(hook.get().error).toMatch(/límite pro/i)
    expect(hook.get().trace?.status).toBe('failed')
    expect(hook.get().result).toBeNull()
  })
})

// ── (5) AWAITING_EVALUATION from poll ────────────────────────────────────────

describe('runScoring — awaiting_evaluation', () => {
  it('exits the poll with awaiting state, no error, no result', async () => {
    vi.useFakeTimers()
    mockPost.mockResolvedValueOnce({ runId: 'run_aw', status: 'PENDING' })
    mockGet.mockResolvedValueOnce(
      awaitingBody('study_in_progress', {
        documents_summary: { total_sent: 2, processed: 2, types_present: ['cedula', 'extracto_bancario'] },
      }),
    )

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_1') })

    expect(hook.get().error).toBeNull()
    expect(hook.get().result).toBeNull()
    expect(hook.get().awaiting?.reason).toBe('study_in_progress')
    expect(hook.get().awaiting?.runId).toBe('run_aw')
    expect(hook.get().awaiting?.documentsSummary).toMatchObject({ total_sent: 2, processed: 2 })
    expect(hook.get().isRunning).toBe(false)
  })

  it('does not time out when status is AWAITING_EVALUATION (terminal reason)', async () => {
    mockGet.mockResolvedValueOnce(awaitingBody('no_consent'))

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_1') })

    expect(hook.get().error).toBeNull()
    expect(hook.get().awaiting?.reason).toBe('no_consent')
  })
})

// ── (6) every awaiting_reason ────────────────────────────────────────────────

describe('runScoring — all awaiting_reason values', () => {
  const reasons = [
    'study_in_progress',
    'no_consent',
    'consent_unavailable',
    'cannot_launch',
    'no_cedula',
    'study_not_completed',
    'no_db',
  ] as const

  for (const reason of reasons) {
    it(`surfaces awaiting.reason = "${reason}"`, async () => {
      vi.useFakeTimers()
      mockGet.mockResolvedValueOnce(awaitingBody(reason))

      const hook = renderHook()
      await act(async () => { await hook.get().runScoring('app_1') })

      expect(hook.get().awaiting?.reason).toBe(reason)
      expect(hook.get().error).toBeNull()
    })
  }
})

// ── (7) recheckScoring ───────────────────────────────────────────────────────

describe('runScoring — recheckScoring transitions awaiting → completed', () => {
  it('re-queries the result by applicationId and sets the result', async () => {
    vi.useFakeTimers()
    mockPost.mockResolvedValueOnce({ runId: 'run_recheck', status: 'PENDING' })
    mockGet
      .mockResolvedValueOnce(awaitingBody('study_in_progress'))
      .mockResolvedValueOnce(COMPLETED)

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_recheck') })
    expect(hook.get().awaiting).not.toBeNull()

    await act(async () => { await hook.get().recheckScoring() })

    // recheck GETs the same applicationId result endpoint.
    expect(mockGet).toHaveBeenLastCalledWith('/evaluations/app_recheck/result')
    expect(hook.get().awaiting).toBeNull()
    expect(hook.get().result).toMatchObject({ score: 82, level: 'B' })
  })
})

// ── (8) background slow poll ──────────────────────────────────────────────────

describe('runScoring — background slow poll for study_in_progress', () => {
  it('auto-transitions to completed when the background poll resolves', async () => {
    vi.useFakeTimers()
    mockPost.mockResolvedValueOnce({ runId: 'run_bg', status: 'PENDING' })
    mockGet
      .mockResolvedValueOnce(awaitingBody('study_in_progress')) // initial poll
      .mockResolvedValueOnce(COMPLETED) // background poll after 20s

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_bg') })
    expect(hook.get().awaiting?.reason).toBe('study_in_progress')

    await act(async () => { await vi.advanceTimersByTimeAsync(20_000) })

    expect(hook.get().result).toMatchObject({ score: 82, level: 'B' })
    expect(hook.get().awaiting).toBeNull()
  })
})

// ── (9) clearResult ──────────────────────────────────────────────────────────

describe('runScoring — clearResult stops the background poll', () => {
  it('clears awaiting state and prevents further polls', async () => {
    vi.useFakeTimers()
    mockPost.mockResolvedValueOnce({ runId: 'run_clr', status: 'PENDING' })
    mockGet.mockResolvedValueOnce(awaitingBody('study_in_progress'))

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_clr') })
    expect(hook.get().awaiting).not.toBeNull()

    act(() => { hook.get().clearResult() })
    expect(hook.get().awaiting).toBeNull()
    expect(hook.get().result).toBeNull()
    expect(hook.get().error).toBeNull()

    const callsBefore = mockGet.mock.calls.length
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000) })
    expect(mockGet.mock.calls.length).toBe(callsBefore)
  })
})

// ── (10) paths ───────────────────────────────────────────────────────────────

describe('runScoring — endpoint paths', () => {
  it('POSTs and polls /evaluations/:applicationId (by applicationId, not runId)', async () => {
    mockPost.mockResolvedValueOnce({ runId: 'run_path', status: 'PENDING' })
    mockGet.mockResolvedValueOnce(COMPLETED)

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_xyz') })

    expect(mockPost.mock.calls[0][0]).toBe('/evaluations/app_xyz')
    expect(mockGet.mock.calls[0][0]).toBe('/evaluations/app_xyz/result')
  })
})

// ── (11) credit_check field ───────────────────────────────────────────────────

const CREDIT_CHECK_APPROVED = {
  status: 'approved' as const,
  bureauScore: 832,
  monthlyCapacity: 2500000,
  reasonCode: null,
  progressPercentage: null,
}

const CREDIT_CHECK_REJECTED_CREDIT = {
  status: 'rejected_credit' as const,
  bureauScore: 320,
  monthlyCapacity: null,
  reasonCode: 'credit_history_rejection',
  progressPercentage: null,
}

const CREDIT_CHECK_AWAITING = {
  status: 'awaiting_authorization' as const,
  bureauScore: null,
  monthlyCapacity: null,
  reasonCode: 'awaiting_habeas_data',
  progressPercentage: 20,
}

const CREDIT_CHECK_BLOCKED_ADMIN = {
  status: 'blocked_admin' as const,
  bureauScore: 250,
  monthlyCapacity: null,
  reasonCode: null,
  progressPercentage: null,
}

describe('runScoring — credit_check mapping', () => {
  it('threads credit_check verbatim into ScoringResult when COMPLETED with credit_check present', async () => {
    const bodyWithCreditCheck = {
      ...COMPLETED,
      credit_check: CREDIT_CHECK_APPROVED,
    }
    mockGet.mockResolvedValueOnce(bodyWithCreditCheck)

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_cc') })

    const r = hook.get().result as { creditCheck?: typeof CREDIT_CHECK_APPROVED }
    expect(r.creditCheck).toEqual(CREDIT_CHECK_APPROVED)
  })

  it('leaves creditCheck undefined when COMPLETED response has no credit_check (backward compat)', async () => {
    mockGet.mockResolvedValueOnce(COMPLETED) // no credit_check key

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_no_cc') })

    const r = hook.get().result as { creditCheck?: unknown; score: number }
    expect(r.creditCheck).toBeUndefined()
    // existing fields still work
    expect(r.score).toBe(82)
  })

  it('maps rejected_credit credit_check through correctly', async () => {
    mockGet.mockResolvedValueOnce({ ...COMPLETED, credit_check: CREDIT_CHECK_REJECTED_CREDIT })

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_rej') })

    const r = hook.get().result as { creditCheck?: typeof CREDIT_CHECK_REJECTED_CREDIT }
    expect(r.creditCheck?.status).toBe('rejected_credit')
    expect(r.creditCheck?.reasonCode).toBe('credit_history_rejection')
  })

  it('maps awaiting_authorization credit_check with progressPercentage', async () => {
    mockGet.mockResolvedValueOnce({ ...COMPLETED, credit_check: CREDIT_CHECK_AWAITING })

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_await_auth') })

    const r = hook.get().result as { creditCheck?: typeof CREDIT_CHECK_AWAITING }
    expect(r.creditCheck?.status).toBe('awaiting_authorization')
    expect(r.creditCheck?.progressPercentage).toBe(20)
  })

  it('maps blocked_admin credit_check — low bureau score does NOT change the credit_check status', async () => {
    mockGet.mockResolvedValueOnce({ ...COMPLETED, credit_check: CREDIT_CHECK_BLOCKED_ADMIN })

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_blocked') })

    const r = hook.get().result as { creditCheck?: typeof CREDIT_CHECK_BLOCKED_ADMIN }
    // blocked_admin is preserved exactly — NOT re-derived from score
    expect(r.creditCheck?.status).toBe('blocked_admin')
  })

  it('threads credit_check through recheckScoring (awaiting → completed with credit_check)', async () => {
    vi.useFakeTimers()
    mockPost.mockResolvedValueOnce({ runId: 'run_rc2', status: 'PENDING' })
    mockGet
      .mockResolvedValueOnce(awaitingBody('study_in_progress'))
      .mockResolvedValueOnce({ ...COMPLETED, credit_check: CREDIT_CHECK_APPROVED })

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_rc2') })
    await act(async () => { await hook.get().recheckScoring() })

    const r = hook.get().result as { creditCheck?: typeof CREDIT_CHECK_APPROVED }
    expect(r.creditCheck).toEqual(CREDIT_CHECK_APPROVED)
  })

  it('threads credit_check through the background slow poll (study_in_progress)', async () => {
    vi.useFakeTimers()
    mockPost.mockResolvedValueOnce({ runId: 'run_bgcc', status: 'PENDING' })
    mockGet
      .mockResolvedValueOnce(awaitingBody('study_in_progress'))
      .mockResolvedValueOnce({ ...COMPLETED, credit_check: CREDIT_CHECK_APPROVED })

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_bgcc') })
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000) })

    const r = hook.get().result as { creditCheck?: typeof CREDIT_CHECK_APPROVED }
    expect(r.creditCheck).toEqual(CREDIT_CHECK_APPROVED)
  })
})
