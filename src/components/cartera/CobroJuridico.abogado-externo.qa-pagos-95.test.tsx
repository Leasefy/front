/**
 * 🔴 B-17 (QA-PAGOS-95, 05-10-2026): el ABOGADO EXTERNO entraba a Jurídico y
 * veía la pantalla ENTERA negada: la página pedía también lo pactado y los
 * sugeridos (403 `SOLO_SUS_CASOS_JURIDICOS`) y ese 403 tumbaba todo. Él ve y
 * trabaja SUS casos y SUS honorarios: lo de la inmobiliaria ni se pide ni se
 * muestra (pactar, registrar abogados, pasar un caso, pagarle).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { api, permisos } = vi.hoisted(() => ({
  api: {
    abogados: vi.fn(),
    crearAbogado: vi.fn(),
    actualizarAbogado: vi.fn(),
    configuracion: vi.fn(),
    guardarConfiguracion: vi.fn(),
    sugeridos: vi.fn(),
    casos: vi.fn(),
    cerrar: vi.fn(),
    pasar: vi.fn(),
    pactarEnElContrato: vi.fn(),
    honorarios: vi.fn(),
    pagarHonorarios: vi.fn(),
  },
  permisos: { canAccess: vi.fn(() => true), isLoading: false, agencyRole: 'ABOGADO_EXTERNO' as string | null },
}));

vi.mock('@/lib/api/juridico.service', () => ({ juridicoApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }));
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error }: { error: unknown }) => <div data-testid="fallo">{String(error)}</div>,
}));

import { CobroJuridico } from './CobroJuridico';

const CASO = {
  id: 'caso-1', contractId: 'ct-1', tenantId: 'u-1', estado: 'EN_JURIDICO', pasadoAt: '2026-09-17T10:00:00.000Z',
  motivo: null, diasDeMora: 132, deudaAlPasarCop: 4_000_000, pactaHonorarios: true, honorariosPct: 10,
  honorariosTopeCop: 3_000_000, cerradoAt: null, motivoDeCierre: null,
  abogado: { id: 'ab-1', nombre: 'Martínez & Asociados', documento: null },
  honorariosCausadosCop: 100_000, honorariosPorPagarCop: 100_000,
};
const HONORARIO = {
  id: 'h-1', casoId: 'caso-1', contractId: 'ct-1', abogado: { id: 'ab-1', nombre: 'Martínez & Asociados' },
  origen: 'AL_PASAR', baseCop: 4_000_000, honorarioCop: 400_000, estado: 'POR_PAGAR_AL_ABOGADO',
  conceptoDeUnaVezId: 'cargo-1', reciboId: null, pagadoAt: null, createdAt: '2026-09-17T10:00:00.000Z',
};
const PROHIBIDO = Object.assign(new Error('Como abogado externo sólo ves y trabajas tus casos'), { status: 403 });

let root: Root | null = null;
async function montar() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root!.render(<CobroJuridico />); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.abogados.mockRejectedValue(PROHIBIDO);
  api.configuracion.mockRejectedValue(PROHIBIDO);
  api.sugeridos.mockRejectedValue(PROHIBIDO);
  api.casos.mockResolvedValue([CASO]);
  api.honorarios.mockResolvedValue([HONORARIO]);
  permisos.agencyRole = 'ABOGADO_EXTERNO';
});
afterEach(async () => {
  if (root) await act(async () => { root!.unmount(); });
  root = null;
  document.body.innerHTML = '';
});

describe('B-17 · el abogado externo en Jurídico', () => {
  it('🔴 ve SUS casos y SUS honorarios; no se pide lo de la inmobiliaria y la pantalla no se cae', async () => {
    await montar();
    expect(api.configuracion).not.toHaveBeenCalled();
    expect(api.sugeridos).not.toHaveBeenCalled();
    expect(api.abogados).not.toHaveBeenCalled();
    expect(document.querySelector('[data-testid="fallo"]')).toBeNull();
    expect(document.querySelector('[data-testid="caso-caso-1"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="honorario-h-1"]')).not.toBeNull();
    for (const ajeno of ['pactado', 'abogados', 'sugeridos']) {
      expect(document.querySelector(`[data-testid="${ajeno}"]`), ajeno).toBeNull();
    }
    // Cierra SUS casos; pactar y pagarle es de la inmobiliaria.
    expect(document.querySelector('[data-testid="cerrar-caso-1"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="pactar-ct-1"]')).toBeNull();
    expect(document.querySelector('[data-testid="pagar-h-1"]')).toBeNull();
  });

  it('la inmobiliaria (cualquier otro rol) sigue viendo todo', async () => {
    permisos.agencyRole = 'ADMIN';
    api.abogados.mockResolvedValue([]);
    api.configuracion.mockResolvedValue({ pactaHonorarios: true, honorariosPct: 10, honorariosTopeCop: 3_000_000 });
    api.sugeridos.mockResolvedValue([]);
    await montar();
    for (const seccion of ['pactado', 'abogados', 'sugeridos', 'casos', 'honorarios']) {
      expect(document.querySelector(`[data-testid="${seccion}"]`), seccion).not.toBeNull();
    }
    expect(document.querySelector('[data-testid="pactar-ct-1"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="pagar-h-1"]')).not.toBeNull();
  });
});
