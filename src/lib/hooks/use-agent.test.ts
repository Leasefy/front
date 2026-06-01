/**
 * use-agent.test.ts — tenant-scoring execution hook (v6.0-01 item #4)
 *
 * Covers the runScoring flow against the real agent contract
 * (agent/src/server/routes/tenant-scoring.ts):
 *   (1) payload shape: { applicationId, tenantId, monthlyRent, documents[] }
 *       with backend doc types mapped to the agent enum
 *   (2) 202 → poll GET /tenant-scoring/:runId → completed
 *   (3) fromCache short-circuit (no polling)
 *   (4) failed status surfaces an error + failed trace
 *   (5) zero usable documents → clear error (never hits the agent)
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/agent-auth', () => ({
  agentAuthHeaders: (extra?: HeadersInit) => new Headers(extra),
}))

const mockApiGet = vi.fn()
vi.mock('@/lib/api/client', () => ({
  apiClient: { get: (...args: unknown[]) => mockApiGet(...args) },
  getAccessToken: () => 'test-token',
}))

const mockGetDocuments = vi.fn()
const mockGetDownloadUrl = vi.fn()
vi.mock('@/lib/api/applications.service', () => ({
  applicationsApi: { getDocuments: (...a: unknown[]) => mockGetDocuments(...a) },
  landlordApplicationsApi: { getDocumentDownloadUrl: (...a: unknown[]) => mockGetDownloadUrl(...a) },
}))

import { useAgentExecution } from './use-agent'

// ── Harness ──────────────────────────────────────────────────────────────────

let container: HTMLDivElement
let root: Root

const APPLICATION = {
  id: 'app_1',
  tenantId: 'tenant_99',
  property: { id: 'prop_1', title: 'Apto', city: 'Bogotá', neighborhood: 'Chapinero', monthlyRent: 2_500_000 },
}

const BACKEND_DOCS = [
  { id: 'doc_id', applicationId: 'app_1', type: 'ID_DOCUMENT', originalName: 'cedula.pdf', mimeType: 'application/pdf', size: 1, createdAt: '' },
  { id: 'doc_bank', applicationId: 'app_1', type: 'BANK_STATEMENT', originalName: 'extracto.pdf', mimeType: 'application/pdf', size: 1, createdAt: '' },
  { id: 'doc_letter', applicationId: 'app_1', type: 'EMPLOYMENT_LETTER', originalName: 'carta.pdf', mimeType: 'application/pdf', size: 1, createdAt: '' },
  { id: 'doc_unknown', applicationId: 'app_1', type: 'SOMETHING_ELSE', originalName: 'x.pdf', mimeType: 'application/pdf', size: 1, createdAt: '' },
]

const COMPLETED_RESULT = {
  success: true,
  applicationId: 'app_1',
  score: 82,
  level: 'B' as const,
  recommendation: 'Aprobar con depósito',
  explanation: 'Ingresos consistentes',
  escalate: false,
  storedSuccessfully: true,
}

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
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://agent.test'
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  mockApiGet.mockReset()
  mockGetDocuments.mockReset()
  mockGetDownloadUrl.mockReset()
  // Default happy-path resolvers
  mockApiGet.mockResolvedValue(APPLICATION)
  mockGetDocuments.mockResolvedValue(BACKEND_DOCS)
  mockGetDownloadUrl.mockImplementation((_appId: string, docId: string) =>
    Promise.resolve({ url: `https://signed.test/${docId}`, expiresAt: '' }),
  )
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// ── (3) fromCache short-circuit ───────────────────────────────────────────────

describe('runScoring — fromCache short-circuit', () => {
  it('uses cached data and never polls when POST returns fromCache=true', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, fromCache: true, runId: 'run_cached', data: COMPLETED_RESULT }),
    })
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_1') })

    // Only the POST happened — no GET poll
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://agent.test/tenant-scoring')
    expect((init as RequestInit).method).toBe('POST')

    expect(hook.get().error).toBeNull()
    expect(hook.get().result).toMatchObject({ score: 82, level: 'B' })
    expect(hook.get().trace?.status).toBe('completed')
  })
})

// ── (1) payload shape + (2) 202 → poll → completed ────────────────────────────

describe('runScoring — payload shape + 202 then poll', () => {
  it('sends mapped documents and polls runId until completed', async () => {
    const fetchMock = vi.fn()
      // POST → 202 with runId
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, runId: 'run_42', status: 'pending' }),
      })
      // First poll → still pending
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, runId: 'run_42', status: 'pending' }),
      })
      // Second poll → completed
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, runId: 'run_42', status: 'completed', data: COMPLETED_RESULT }),
      })
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_1') })

    // POST body matches the agent contract
    const postBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(postBody.applicationId).toBe('app_1')
    expect(postBody.tenantId).toBe('tenant_99')
    expect(postBody.monthlyRent).toBe(2_500_000)
    // Unknown doc type dropped; three known docs mapped to the agent enum
    expect(postBody.documents).toEqual([
      { url: 'https://signed.test/doc_id', type: 'cedula' },
      { url: 'https://signed.test/doc_bank', type: 'extracto_bancario' },
      { url: 'https://signed.test/doc_letter', type: 'contrato_laboral' },
    ])

    // Polled GET /tenant-scoring/run_42 twice (pending, then completed)
    const getCalls = fetchMock.mock.calls.filter((c) => c[0] === 'http://agent.test/tenant-scoring/run_42')
    expect(getCalls.length).toBe(2)

    expect(hook.get().result).toMatchObject({ score: 82, level: 'B' })
    expect(hook.get().trace?.status).toBe('completed')
    expect(hook.get().trace?.steps.every((s) => s.status === 'completed')).toBe(true)
  })
})

// ── (4) failed status ─────────────────────────────────────────────────────────

describe('runScoring — failed run', () => {
  it('surfaces an error and a failed trace when the run fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, runId: 'run_x', status: 'pending' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, runId: 'run_x', status: 'failed', error: 'Documentos ilegibles' }),
      })
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_1') })

    expect(hook.get().error).toBe('Documentos ilegibles')
    expect(hook.get().result).toBeNull()
    expect(hook.get().trace?.status).toBe('failed')
  })
})

// ── (5) zero documents ────────────────────────────────────────────────────────

describe('runScoring — zero usable documents', () => {
  it('errors without calling the agent when no documents map to the enum', async () => {
    mockGetDocuments.mockResolvedValue([
      { id: 'doc_x', applicationId: 'app_1', type: 'SOMETHING_ELSE', originalName: 'x.pdf', mimeType: 'application/pdf', size: 1, createdAt: '' },
    ])
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_1') })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(hook.get().error).toMatch(/documentos/i)
    expect(hook.get().trace?.status).toBe('failed')
  })

  it('errors when the application has no documents at all', async () => {
    mockGetDocuments.mockResolvedValue([])
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const hook = renderHook()
    await act(async () => { await hook.get().runScoring('app_1') })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(hook.get().error).toBeTruthy()
    expect(hook.get().result).toBeNull()
  })
})
