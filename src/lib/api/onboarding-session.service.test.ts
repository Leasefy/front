/**
 * onboarding-session.service.test.ts — session-based onboarding wizard steps.
 *
 * Covers:
 *   - happy path for submitAgency, resumeOnboarding, completeOnboarding
 *     (URL, method, Authorization header via agentAuthHeaders, parsed body)
 *   - the full error map for submitAgency (400/401/403/404/409/410/503 + network)
 *   - light happy-path smoke tests for the remaining write steps
 *
 * agent-auth.ts is NOT mocked here (unlike hook tests) — client.ts has zero
 * imports, so the real agentAuthHeaders() is safe to exercise in node and lets
 * us assert the actual `Authorization: Bearer <token>` header value.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { setAccessToken } from './client'
import {
  submitAgency,
  submitMembers,
  submitPaymentProvider,
  submitPolicy,
  presignHabeasData,
  confirmHabeasData,
  completeOnboarding,
  resumeOnboarding,
  OnboardingSessionError,
} from './onboarding-session.service'
import type {
  OnboardingSessionAgencyRequest,
  OnboardingSessionMembersRequest,
  OnboardingSessionPaymentProviderRequest,
  OnboardingSessionPaymentProviderSkipRequest,
  OnboardingSessionPolicyRequest,
  OnboardingSessionHabeasDataPresignRequest,
  OnboardingSessionHabeasDataConfirmRequest,
} from './generated/agency'

const SESSION_ID = 'session-123'
const AGENT_URL = 'http://agent.test'

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function mockFetchOnce(response: Response) {
  const fetchMock = vi.fn().mockResolvedValueOnce(response)
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
  return fetchMock
}

const AGENCY_BODY: OnboardingSessionAgencyRequest = {
  legalName: 'Inmobiliaria Acme S.A.S.',
  nit: '900123456-1',
  address: {
    calle: 'Calle 100 # 10-20',
    ciudad: 'Bogotá',
    departamento: 'Cundinamarca',
  },
  primaryContactEmail: 'contacto@acme.co',
  primaryContactPhone: '3000000000',
  billingModel: 'standard',
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = AGENT_URL
  setAccessToken('test-access-token')
})

afterEach(() => {
  vi.restoreAllMocks()
  setAccessToken(null)
})

describe('submitAgency — happy path', () => {
  it('POSTs to /onboarding/session/{sessionId}/agency with the Bearer token and returns the parsed body', async () => {
    const RESPONSE = {
      sessionId: SESSION_ID,
      currentStep: 'agency',
      nextStep: 'members',
      draft: { legalName: AGENCY_BODY.legalName },
    }
    const fetchMock = mockFetchOnce(jsonResponse(RESPONSE))

    const result = await submitAgency(SESSION_ID, AGENCY_BODY)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${AGENT_URL}/onboarding/session/${SESSION_ID}/agency`)
    expect(init.method).toBe('POST')
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer test-access-token')
    expect((init.headers as Headers).get('content-type')).toBe('application/json')
    expect(JSON.parse(init.body as string)).toEqual(AGENCY_BODY)
    expect(result).toEqual(RESPONSE)
  })
})

describe('submitAgency — error map', () => {
  it('throws OnboardingSessionError(kind=validation) on 400', async () => {
    mockFetchOnce(jsonResponse({ error: 'Malformed body' }, 400))
    await expect(submitAgency(SESSION_ID, AGENCY_BODY)).rejects.toMatchObject({
      name: 'OnboardingSessionError',
      kind: 'validation',
      status: 400,
    })
  })

  it('throws OnboardingSessionError(kind=unauthorized) on 401', async () => {
    mockFetchOnce(jsonResponse({ error: 'Missing JWT' }, 401))
    await expect(submitAgency(SESSION_ID, AGENCY_BODY)).rejects.toMatchObject({
      kind: 'unauthorized',
      status: 401,
    })
  })

  it('throws OnboardingSessionError(kind=forbidden) on 403', async () => {
    mockFetchOnce(jsonResponse({ error: 'Wrong identity' }, 403))
    await expect(submitAgency(SESSION_ID, AGENCY_BODY)).rejects.toMatchObject({
      kind: 'forbidden',
      status: 403,
    })
  })

  it('throws OnboardingSessionError(kind=notFound) on 404', async () => {
    mockFetchOnce(jsonResponse({ error: 'Session not found' }, 404))
    await expect(submitAgency(SESSION_ID, AGENCY_BODY)).rejects.toMatchObject({
      kind: 'notFound',
      status: 404,
    })
  })

  it('throws OnboardingSessionError(kind=conflict) on 409 and exposes the parsed StepConflict payload', async () => {
    const CONFLICT = { error: 'State-machine violation', requiredStep: 'members' }
    mockFetchOnce(jsonResponse(CONFLICT, 409))

    let caught: unknown
    try {
      await submitAgency(SESSION_ID, AGENCY_BODY)
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(OnboardingSessionError)
    const error = caught as OnboardingSessionError
    expect(error.kind).toBe('conflict')
    expect(error.status).toBe(409)
    expect(error.conflict).toEqual(CONFLICT)
  })

  it('throws OnboardingSessionError(kind=expired) on 410', async () => {
    mockFetchOnce(jsonResponse({ error: 'Session expired' }, 410))
    await expect(submitAgency(SESSION_ID, AGENCY_BODY)).rejects.toMatchObject({
      kind: 'expired',
      status: 410,
    })
  })

  it('throws OnboardingSessionError(kind=unavailable) on 503', async () => {
    mockFetchOnce(jsonResponse({ error: 'Database unavailable' }, 503))
    await expect(submitAgency(SESSION_ID, AGENCY_BODY)).rejects.toMatchObject({
      kind: 'unavailable',
      status: 503,
    })
  })

  it('throws OnboardingSessionError(kind=network) when fetch itself rejects', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch')) as unknown as typeof globalThis.fetch

    await expect(submitAgency(SESSION_ID, AGENCY_BODY)).rejects.toMatchObject({
      kind: 'network',
      status: null,
    })
  })
})

describe('resumeOnboarding — happy path', () => {
  it('GETs /onboarding/session/{sessionId}/resume with the Bearer token and returns the parsed body', async () => {
    const RESPONSE = {
      sessionId: SESSION_ID,
      currentStep: 'members',
      nextStep: 'payment_provider',
      draft: {},
    }
    const fetchMock = mockFetchOnce(jsonResponse(RESPONSE))

    const result = await resumeOnboarding(SESSION_ID)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${AGENT_URL}/onboarding/session/${SESSION_ID}/resume`)
    expect(init.method).toBe('GET')
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer test-access-token')
    expect(result).toEqual(RESPONSE)
  })
})

describe('completeOnboarding — happy path', () => {
  it('POSTs to /onboarding/session/{sessionId}/complete with no body and returns the parsed tenant', async () => {
    const RESPONSE = {
      tenantId: 'tenant-1',
      agencyId: 'agency-1',
      sessionId: SESSION_ID,
      status: 'COMPLETED',
      dashboardUrl: '/panel/inmobiliaria',
    }
    const fetchMock = mockFetchOnce(jsonResponse(RESPONSE))

    const result = await completeOnboarding(SESSION_ID)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${AGENT_URL}/onboarding/session/${SESSION_ID}/complete`)
    expect(init.method).toBe('POST')
    expect(init.body).toBeUndefined()
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer test-access-token')
    expect(result).toEqual(RESPONSE)
  })
})

describe('remaining write steps — happy path smoke tests', () => {
  it('submitMembers POSTs to /members', async () => {
    const body: OnboardingSessionMembersRequest = {
      members: [{ email: 'agente@acme.co', role: 'OPERATOR' }],
    }
    const RESPONSE = {
      sessionId: SESSION_ID,
      currentStep: 'members',
      nextStep: 'payment_provider',
      draft: {},
      inviteTokens: [{ email: 'agente@acme.co', rawToken: 'raw-token' }],
    }
    const fetchMock = mockFetchOnce(jsonResponse(RESPONSE))

    const result = await submitMembers(SESSION_ID, body)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${AGENT_URL}/onboarding/session/${SESSION_ID}/members`)
    expect(init.method).toBe('POST')
    expect(result).toEqual(RESPONSE)
  })

  it('submitPaymentProvider POSTs to /payment-provider', async () => {
    const body: OnboardingSessionPaymentProviderRequest = {
      provider: 'wompi',
      credentials: { apiKey: 'key', eventSecret: 'secret' },
    }
    const RESPONSE = {
      sessionId: SESSION_ID,
      currentStep: 'payment_provider',
      nextStep: 'policy',
      draft: {},
    }
    const fetchMock = mockFetchOnce(jsonResponse(RESPONSE))

    const result = await submitPaymentProvider(SESSION_ID, body)

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${AGENT_URL}/onboarding/session/${SESSION_ID}/payment-provider`)
    expect(result).toEqual(RESPONSE)
  })

  // Payment-provider gating was removed from the onboarding wizard — the
  // wizard now auto-submits `{ skip: true }` instead of showing the form.
  it('submitPaymentProvider POSTs a { skip: true } body to /payment-provider', async () => {
    const body: OnboardingSessionPaymentProviderSkipRequest = { skip: true }
    const RESPONSE = {
      sessionId: SESSION_ID,
      currentStep: 'payment_provider',
      nextStep: 'policy',
      draft: { paymentProviderSkipped: true },
    }
    const fetchMock = mockFetchOnce(jsonResponse(RESPONSE))

    const result = await submitPaymentProvider(SESSION_ID, body)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${AGENT_URL}/onboarding/session/${SESSION_ID}/payment-provider`)
    expect(JSON.parse(init.body as string)).toEqual({ skip: true })
    expect(result).toEqual(RESPONSE)
  })

  it('submitPolicy POSTs to /policy', async () => {
    const body: OnboardingSessionPolicyRequest = { maxDiscountPct: 20 }
    const RESPONSE = {
      sessionId: SESSION_ID,
      currentStep: 'policy',
      nextStep: 'habeas_data',
      draft: {},
    }
    const fetchMock = mockFetchOnce(jsonResponse(RESPONSE))

    const result = await submitPolicy(SESSION_ID, body)

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${AGENT_URL}/onboarding/session/${SESSION_ID}/policy`)
    expect(result).toEqual(RESPONSE)
  })

  it('presignHabeasData POSTs to /habeas-data/presign-url', async () => {
    const body: OnboardingSessionHabeasDataPresignRequest = {
      fileName: 'habeas-data.pdf',
      contentType: 'application/pdf',
      fileSize: 1024,
    }
    const RESPONSE = { presignedUrl: 'https://s3.test/put', s3Key: 'key.pdf', expiresIn: 900 }
    const fetchMock = mockFetchOnce(jsonResponse(RESPONSE))

    const result = await presignHabeasData(SESSION_ID, body)

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${AGENT_URL}/onboarding/session/${SESSION_ID}/habeas-data/presign-url`)
    expect(result).toEqual(RESPONSE)
  })

  it('confirmHabeasData POSTs to /habeas-data/confirm', async () => {
    const body: OnboardingSessionHabeasDataConfirmRequest = {
      s3Key: 'key.pdf',
      sha256: 'abc123',
      signedByFullName: 'Juan Perez',
      signedByCedula: '123456789',
    }
    const RESPONSE = {
      sessionId: SESSION_ID,
      currentStep: 'habeas_data',
      nextStep: 'complete',
      draft: {},
    }
    const fetchMock = mockFetchOnce(jsonResponse(RESPONSE))

    const result = await confirmHabeasData(SESSION_ID, body)

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${AGENT_URL}/onboarding/session/${SESSION_ID}/habeas-data/confirm`)
    expect(result).toEqual(RESPONSE)
  })
})
