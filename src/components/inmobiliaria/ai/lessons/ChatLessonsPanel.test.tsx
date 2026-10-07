/**
 * Certificar una lección del chat (02-10-2026): el fallo llega ENTERO
 * (`ApiError`, por `certifyChatLesson`) y el toast lo dice por el traductor.
 *
 * Antes: `toast.error(\`No se pudo procesar la acción: ${message}\`)` con
 * «ai-hub chat lessons certify 403» crudo, y el 403 se detectaba buscando
 * «403» en el texto. El motivo de la cerca (`reason`, en inglés del micro)
 * también salía crudo: «No se pudo certificar: insufficient evidence…».
 *
 * De punta a punta: el `fetch` es falso; el cliente, el hook y el panel, de
 * verdad.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const AGENCIA = '504bdd59-d05f-4ae2-99c5-b71e6accb58c';
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: '504bdd59-d05f-4ae2-99c5-b71e6accb58c' } }) }));
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ isAdmin: true, agencyRole: 'ADMIN' }),
}));
vi.mock('@/lib/api/agent-auth', () => ({
  agentAuthHeaders: (extra?: HeadersInit) => new Headers(extra),
}));

import { ChatLessonsPanel, motivoDeLaCerca } from './ChatLessonsPanel';

void React;

const LECCIONES = {
  enabled: true,
  generatedAt: '2026-10-02T12:00:00.000Z',
  lessons: [
    {
      id: 'les_1',
      kind: 'routing',
      pattern: { agent: 'cobranza', tags: ['mora'] },
      recommendation: 'Las preguntas de mora van a cobranza.',
      status: 'candidate',
      evidence: { support: 8, lastSeen: '2026-10-01T10:00:00.000Z', sampleQuestion: '¿Cómo va la mora?' },
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
    },
  ],
};

/** Lo que nunca puede llegar a la persona. */
const CRUDO = /\b[1-5]\d\d\b|ai-hub|certify|lessons|Forbidden|Internal Server Error|insufficient|evidence|support/i;

let certificar: () => Response | Promise<Response>;
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://micro.test');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      if (String(url).endsWith('/certify') && init.method === 'POST') return certificar();
      if (String(url).endsWith(`/api/agency/${AGENCIA}/ai-hub/chat/lessons`)) {
        return new Response(JSON.stringify(LECCIONES), { status: 200 });
      }
      return new Response(null, { status: 404 });
    }),
  );
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function esperarA(cond: () => boolean, ms = 3000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin && !cond()) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
  expect(cond()).toBe(true);
}

async function tocar(etiqueta: 'Certificar' | 'Descartar') {
  act(() => {
    root.render(<ChatLessonsPanel />);
  });
  const boton = () => [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(etiqueta));
  await esperarA(() => !!boton());
  await act(async () => {
    boton()!.click();
  });
  await esperarA(() => toastMock.error.mock.calls.length + toastMock.success.mock.calls.length > 0);
}

const elToast = () => toastMock.error.mock.calls[0]?.[0] as string;

describe('certificar una lección: el fallo por el traductor', () => {
  it('un 403 del cuerpo viejo dice quién puede, nunca «certify 403» ni «Forbidden»', async () => {
    certificar = () =>
      new Response(
        JSON.stringify({ error: 'Forbidden — tu rol sólo puede consultar, no ejecutar acciones', code: 'ROL_SOLO_CONSULTA' }),
        { status: 403 },
      );
    await tocar('Certificar');
    expect(elToast()).toBe('No tienes permiso para certificar lecciones.');
  });

  it('un 403 del sobre dice lo que escribió el micro', async () => {
    certificar = () =>
      new Response(JSON.stringify({ statusCode: 403, code: 'SIN_PERMISO', message: 'Tu rol sólo puede leer las lecciones.' }), {
        status: 403,
      });
    await tocar('Certificar');
    expect(elToast()).toBe('Tu rol sólo puede leer las lecciones.');
  });

  it('un 5xx dice «de nuestro lado» con la referencia', async () => {
    certificar = () =>
      new Response(
        JSON.stringify({ statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor', referencia: 'ab12cd34' }),
        { status: 500 },
      );
    await tocar('Certificar');
    expect(elToast()).toContain('No pudimos certificar la lección: algo falló de nuestro lado');
    expect(elToast()).toContain('ab12cd34');
    expect(elToast()).not.toMatch(CRUDO);
  });

  it('sin cuerpo: lo de por defecto, sin el status', async () => {
    certificar = () => new Response(null, { status: 502 });
    await tocar('Descartar');
    expect(elToast()).toContain('No pudimos descartar la lección');
    expect(elToast()).not.toMatch(CRUDO);
  });

  it('sin internet en el navegador, la red caída es «la conexión»', async () => {
    const enLinea = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      certificar = () => Promise.reject(new TypeError('Failed to fetch'));
      await tocar('Certificar');
      expect(elToast()).toMatch(/conexi[oó]n/);
    } finally {
      enLinea.mockRestore();
    }
  });

  it('🔴 ARREGLOS-4 · el micro caído con el back sano dice que el asistente no está disponible', async () => {
    certificar = () => Promise.reject(new TypeError('Failed to fetch'));
    await tocar('Certificar');
    expect(elToast()).toMatch(/asistente de Leasefy/);
    expect(elToast()).not.toMatch(CRUDO);
  });

  it('la cerca (200 con `applied: false`) dice su motivo en español', async () => {
    certificar = () =>
      new Response(
        JSON.stringify({
          lessonId: 'les_1',
          decision: 'certified',
          found: true,
          applied: false,
          reason: 'insufficient evidence (support 2 < 3)',
          resolvedAt: '2026-10-02T12:00:00.000Z',
        }),
        { status: 200 },
      );
    await tocar('Certificar');
    expect(elToast()).toBe('No se pudo certificar: todavía no hay evidencia suficiente; el asistente necesita verlo más veces.');
    expect(elToast()).not.toMatch(CRUDO);
  });
});

describe('motivoDeLaCerca', () => {
  it('traduce lo que el micro dice en inglés y deja lo que ya dice en español', () => {
    expect(motivoDeLaCerca('empty recommendation')).toBe('la lección no tiene una recomendación escrita.');
    expect(motivoDeLaCerca('lesson not found')).toBe('esa lección ya no existe. Recarga la lista.');
    expect(motivoDeLaCerca('sólo el administrador certifica lo que el chat aprende de la conversación')).toBe(
      'sólo el administrador certifica lo que el chat aprende de la conversación.',
    );
    expect(motivoDeLaCerca('some brand new english reason')).not.toMatch(/english/);
    // Un motivo que no es de la evidencia no se disfraza de «falta evidencia».
    expect(motivoDeLaCerca('store error')).toBe('no se pudo aplicar en este momento. Prueba de nuevo.');
    expect(motivoDeLaCerca('')).toBe('todavía no hay evidencia suficiente.');
  });
});
