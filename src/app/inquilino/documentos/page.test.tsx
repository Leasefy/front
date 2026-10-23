/**
 * Documentos del inquilino (glow up 22-10): sin nada todavía, UNA sola salida (antes, tres vacíos seguidos);
 * con documentos de postulaciones, LA RESPUESTA arriba (cuántos aprobados de cuántos) y lo rechazado primero,
 * con su motivo en una línea.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const estado = vi.hoisted(() => ({
  applications: [] as Array<{ id: string }>,
  contracts: [] as Array<Record<string, unknown>>,
  recibos: [] as unknown[],
  docs: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es', formatCurrency: (n: number) => String(n) }),
}));
vi.mock('@/lib/hooks/use-onboarding-status', () => ({
  useOnboardingStatus: () => ({ isComplete: true, isLoading: false }),
}));
vi.mock('@/lib/hooks/useApplications', () => ({
  useMyApplications: () => ({ applications: estado.applications, isLoading: false, errorCrudo: null, refetch: vi.fn() }),
}));
vi.mock('@/lib/hooks/useContracts', () => ({
  useContracts: () => ({ contracts: estado.contracts, isLoading: false }),
}));
vi.mock('@/lib/hooks/use-recibos-del-inquilino', () => ({
  useRecibosDelInquilino: () => ({ recibos: estado.recibos, isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('@/lib/hooks/useDocuments', () => ({ useSignedDocUrl: () => ({ url: null, isLoading: false }) }));
vi.mock('@/lib/api/documents.service', () => ({
  documentsApi: {
    getByApplication: vi.fn(async () => estado.docs),
    recordConsent: vi.fn(async () => undefined),
    getSignedUrl: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('@/lib/api/applications.service', () => ({ applicationsApi: {} }));
vi.mock('@/components/tenant/MisCertificados', () => ({ MisCertificados: () => null }));
vi.mock('@/components/tenant/RecibosDeCaja', () => ({ RecibosDeCaja: () => <div data-testid="recibos" /> }));
vi.mock('@/components/contract/DownloadContractPdfButton', () => ({ DownloadContractPdfButton: () => <button type="button">Descargar contrato</button> }));
vi.mock('@/components/tenant/CompleteProfileFirst', () => ({ CompleteProfileFirst: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import DocumentosPage from './page';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  estado.applications = [];
  estado.contracts = [];
  estado.recibos = [];
  estado.docs = [];
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
});

async function montar() {
  act(() => root.render(<DocumentosPage />));
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
}

const doc = (id: string, reviewStatus: string, extra: Record<string, unknown> = {}) => ({
  id,
  type: 'CEDULA',
  fileName: `${id}.pdf`,
  mimeType: 'application/pdf',
  size: 2048,
  createdAt: '2026-10-17T15:00:00.000Z',
  reviewStatus,
  ...extra,
});

describe('Documentos del inquilino', () => {
  it('sin nada todavía: una sola salida, sin cifras ni vacíos repetidos', async () => {
    await montar();
    expect(host.querySelector('[data-testid="documentos-vacio"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="cifras-de-documentos"]')).toBeNull();
    expect(host.querySelector('[data-testid="documentos-del-arriendo"]')).toBeNull();
    expect(host.textContent).not.toContain('Aún no tienes documentos del arriendo');
    expect(host.querySelector('a[href="/inquilino/para-ti"]')).not.toBeNull();
  });

  it('postulándose: la respuesta arriba y lo rechazado primero, con su motivo', async () => {
    estado.applications = [{ id: 'app-1' }];
    estado.docs = [
      doc('d1', 'APPROVED'),
      doc('d2', 'IN_REVIEW'),
      doc('d3', 'REJECTED', { rejectionReason: 'La foto está borrosa' }),
    ];
    await montar();
    const cifra = host.querySelector('[data-testid="cifras-de-documentos"]');
    expect(cifra).not.toBeNull();
    expect(cifra?.textContent).toContain('de 3 documentos que subiste');
    expect(cifra?.textContent).toContain('El rechazado va primero en la lista');
    // Lo de las postulaciones va antes que la línea del arriendo que todavía no hay.
    const orden = Array.from(
      host.querySelectorAll('[data-testid="documentos-de-postulaciones"], [data-testid="sin-documentos-del-arriendo"]'),
    ).map((n) => n.getAttribute('data-testid'));
    expect(orden).toEqual(['documentos-de-postulaciones', 'sin-documentos-del-arriendo']);
    // El rechazado es la primera tarjeta y dice por qué.
    const motivo = host.querySelector('[data-testid="motivo-del-rechazo-d3"]');
    expect(motivo?.textContent).toContain('La foto está borrosa');
    const lista = host.querySelector('[data-testid="documentos-de-postulaciones"]')?.textContent ?? '';
    expect(lista.indexOf('d3.pdf')).toBeGreaterThan(-1);
    expect(lista.indexOf('d3.pdf')).toBeLessThan(lista.indexOf('d1.pdf'));
    expect(lista.indexOf('d3.pdf')).toBeLessThan(lista.indexOf('d2.pdf'));
  });

  it('con contrato firmado: el arriendo primero y lo de las postulaciones en una línea', async () => {
    estado.contracts = [{ id: 'c-1', status: 'active', propertyAddress: 'Calle 10 # 43-20', propertyCity: 'Medellín' }];
    await montar();
    expect(host.querySelector('[data-testid="documentos-del-arriendo"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="sin-documentos-de-postulacion"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="documentos-vacio"]')).toBeNull();
  });
});
