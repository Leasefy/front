import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Keep the import chain node-safe (agent-auth → supabase client). Echo the
// extra headers back so the certify test can assert content-type was set.
vi.mock('@/lib/api/agent-auth', () => ({
  agentAuthHeaders: (extra?: HeadersInit) => new Headers(extra),
}));

import {
  getChatLessons,
  certifyChatLesson,
  isAgentConfigured,
  type ChatLessonsResponse,
  type CertifyLessonResponse,
} from './ai-hub-lessons';

const AGENCY = 'ag_123';
const BASE = 'https://agent.test';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', BASE);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('isAgentConfigured', () => {
  it('reflects NEXT_PUBLIC_AGENT_URL presence (fail-soft posture)', () => {
    expect(isAgentConfigured()).toBe(true);
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', '');
    expect(isAgentConfigured()).toBe(false);
  });
});

describe('getChatLessons', () => {
  it('GETs the lessons url and parses the payload', async () => {
    const payload: ChatLessonsResponse = {
      enabled: true,
      generatedAt: '2026-06-25T12:00:00.000Z',
      lessons: [
        {
          id: 'les_1',
          kind: 'routing',
          pattern: { agent: 'cobranza', tags: ['mora'] },
          recommendation: 'Enruta preguntas de mora a cobranza.',
          status: 'candidate',
          evidence: {
            support: 8,
            lastSeen: '2026-06-24T10:00:00.000Z',
            sampleQuestion: '¿Cómo va la cartera en mora?',
          },
          createdAt: '2026-06-20T00:00:00.000Z',
          updatedAt: '2026-06-24T10:00:00.000Z',
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
    vi.stubGlobal('fetch', fetchMock);

    const res = await getChatLessons(AGENCY);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/agency/${AGENCY}/ai-hub/chat/lessons`);
    expect(init.method).toBe('GET');
    expect(res.enabled).toBe(true);
    expect(res.lessons).toHaveLength(1);
    expect(res.lessons[0].recommendation).toContain('mora');
  });

  it('forwards the abort signal when provided', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ lessons: [], enabled: false, generatedAt: 'x' }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await getChatLessons(AGENCY, controller.signal);

    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it('throws with the status on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false, 500)));
    await expect(getChatLessons(AGENCY)).rejects.toThrow('ai-hub chat lessons 500');
  });

  it('throws when NEXT_PUBLIC_AGENT_URL is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', '');
    await expect(getChatLessons(AGENCY)).rejects.toThrow('NEXT_PUBLIC_AGENT_URL not configured');
  });
});

describe('certifyChatLesson', () => {
  it('POSTs the decision in the body to the certify url with JSON content-type', async () => {
    const payload: CertifyLessonResponse = {
      lessonId: 'les_1',
      decision: 'certified',
      found: true,
      applied: true,
      reason: '',
      resolvedAt: '2026-06-25T12:01:00.000Z',
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
    vi.stubGlobal('fetch', fetchMock);

    const res = await certifyChatLesson({
      agencyId: AGENCY,
      lessonId: 'les_1',
      decision: 'certified',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/agency/${AGENCY}/ai-hub/chat/lessons/les_1/certify`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ decision: 'certified' });
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');
    expect(res.applied).toBe(true);
  });

  it('returns applied:false + reason from the fail-closed fence (NOT an error)', async () => {
    const payload: CertifyLessonResponse = {
      lessonId: 'les_2',
      decision: 'certified',
      found: true,
      applied: false,
      reason: 'Evidencia insuficiente: se requieren al menos 5 observaciones.',
      resolvedAt: '2026-06-25T12:02:00.000Z',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)));

    const res = await certifyChatLesson({
      agencyId: AGENCY,
      lessonId: 'les_2',
      decision: 'certified',
    });

    // The fence resolves — the caller must read `applied`/`reason`, not catch.
    expect(res.applied).toBe(false);
    expect(res.reason).toContain('Evidencia insuficiente');
  });

  it('throws on 403 (VIEWER cannot certify)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false, 403)));
    await expect(
      certifyChatLesson({ agencyId: AGENCY, lessonId: 'les_1', decision: 'certified' }),
    ).rejects.toThrow('ai-hub chat lessons certify 403');
  });

  it('rejecting always sends decision:rejected', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        lessonId: 'les_3',
        decision: 'rejected',
        found: true,
        applied: true,
        reason: '',
        resolvedAt: 'now',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await certifyChatLesson({
      agencyId: AGENCY,
      lessonId: 'les_3',
      decision: 'rejected',
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ decision: 'rejected' });
    expect(res.applied).toBe(true);
  });
});
