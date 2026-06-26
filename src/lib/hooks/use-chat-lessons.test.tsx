import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// react-dom/client needs this flag to recognize our act() wrapping.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// ---------------------------------------------------------------------------
// Mocks (declared BEFORE importing the hook under test).
// ---------------------------------------------------------------------------

let mockAgency: { id: string } | null = { id: 'AGY-TEST' }
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: mockAgency, user: null, isAuthenticated: true }),
}))

const getChatLessonsMock = vi.fn()
const certifyChatLessonMock = vi.fn()
vi.mock('@/lib/api/ai-hub-lessons', () => ({
  getChatLessons: (...args: unknown[]) => getChatLessonsMock(...args),
  certifyChatLesson: (...args: unknown[]) => certifyChatLessonMock(...args),
}))

import { useChatLessons } from './use-chat-lessons'
import type {
  ChatLessonsResponse,
  CertifyLessonResponse,
} from '@/lib/api/ai-hub-lessons'

// ---------------------------------------------------------------------------
// renderHook harness (createRoot — same pattern as the cobranza hook tests).
// ---------------------------------------------------------------------------

type HookResult = ReturnType<typeof useChatLessons>

function renderHook() {
  const result: { current: HookResult | null } = { current: null }
  function Probe() {
    result.current = useChatLessons()
    return null
  }
  const container = document.createElement('div')
  let root: Root
  act(() => {
    root = createRoot(container)
    root.render(React.createElement(Probe))
  })
  return {
    result,
    unmount: () => act(() => root.unmount()),
  }
}

const LESSONS: ChatLessonsResponse = {
  enabled: true,
  generatedAt: '2026-06-25T12:00:00.000Z',
  lessons: [
    {
      id: 'les_1',
      kind: 'routing',
      pattern: { agent: 'cobranza', tags: [] },
      recommendation: 'Enruta mora a cobranza.',
      status: 'candidate',
      evidence: { support: 6, lastSeen: '2026-06-24T00:00:00.000Z', sampleQuestion: 'q' },
      createdAt: '2026-06-20T00:00:00.000Z',
      updatedAt: '2026-06-24T00:00:00.000Z',
    },
  ],
}

const flush = () => act(async () => { await Promise.resolve() })

beforeEach(() => {
  mockAgency = { id: 'AGY-TEST' }
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'https://agent.test')
  getChatLessonsMock.mockReset()
  certifyChatLessonMock.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('useChatLessons', () => {
  it('loads lessons + enabled and clears loading', async () => {
    getChatLessonsMock.mockResolvedValue(LESSONS)
    const { result, unmount } = renderHook()
    await flush()
    expect(result.current!.isLoading).toBe(false)
    expect(result.current!.lessons).toHaveLength(1)
    expect(result.current!.enabled).toBe(true)
    expect(result.current!.error).toBeNull()
    unmount()
  })

  it('fail-soft: no agency → not loading, no fetch, no error', async () => {
    mockAgency = null
    const { result, unmount } = renderHook()
    await flush()
    expect(result.current!.isLoading).toBe(false)
    expect(getChatLessonsMock).not.toHaveBeenCalled()
    expect(result.current!.error).toBeNull()
    unmount()
  })

  it('surfaces an error message on fetch failure', async () => {
    getChatLessonsMock.mockRejectedValue(new Error('ai-hub chat lessons 500'))
    const { result, unmount } = renderHook()
    await flush()
    expect(result.current!.error).toContain('500')
    expect(result.current!.isLoading).toBe(false)
    unmount()
  })

  it('certify success refetches and returns the verdict', async () => {
    getChatLessonsMock.mockResolvedValue(LESSONS)
    const verdict: CertifyLessonResponse = {
      lessonId: 'les_1',
      decision: 'certified',
      found: true,
      applied: true,
      reason: '',
      resolvedAt: 'now',
    }
    certifyChatLessonMock.mockResolvedValue(verdict)

    const { result, unmount } = renderHook()
    await flush()
    expect(getChatLessonsMock).toHaveBeenCalledTimes(1)

    let returned: CertifyLessonResponse | undefined
    await act(async () => {
      returned = await result.current!.certify('les_1', 'certified')
    })
    expect(certifyChatLessonMock).toHaveBeenCalledWith({
      agencyId: 'AGY-TEST',
      lessonId: 'les_1',
      decision: 'certified',
    })
    expect(returned!.applied).toBe(true)
    // refetched after certify
    expect(getChatLessonsMock).toHaveBeenCalledTimes(2)
    unmount()
  })

  it('passes through applied:false + reason from the fail-closed fence', async () => {
    getChatLessonsMock.mockResolvedValue(LESSONS)
    certifyChatLessonMock.mockResolvedValue({
      lessonId: 'les_1',
      decision: 'certified',
      found: true,
      applied: false,
      reason: 'Evidencia insuficiente.',
      resolvedAt: 'now',
    })

    const { result, unmount } = renderHook()
    await flush()

    let returned: CertifyLessonResponse | undefined
    await act(async () => {
      returned = await result.current!.certify('les_1', 'certified')
    })
    expect(returned!.applied).toBe(false)
    expect(returned!.reason).toContain('insuficiente')
    unmount()
  })
})
