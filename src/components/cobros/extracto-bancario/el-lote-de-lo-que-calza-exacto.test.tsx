/**
 * 🔴 El lote de lo que calza EXACTO (17-09-2026), con el API mockeado.
 *
 * «El sistema arma el LOTE de lo que calza exacto (referencia de recaudo +
 * valor exacto) y un funcionario aprueba el lote de una vez, lo que genera los
 * recibos. Lo que no calza va a la cola manual. Un administrador puede
 * reversar.»
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { LoteDeConciliacion } from '@/lib/api/conciliacion-bancaria.types';

const { api, toastMock, permisos } = vi.hoisted(() => ({
  api: {
    loteActual: vi.fn(),
    armarLote: vi.fn(),
    aprobarLote: vi.fn(),
    reversarLote: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn() },
  permisos: {
    canAccess: vi.fn((_m: string, _a: string) => true),
    isLoading: false,
    isAdmin: false,
    agencyRole: 'CONTADOR' as string | null,
  },
}));

vi.mock('@/lib/api/conciliacion-bancaria.service', () => ({ conciliacionBancariaApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }));

import { LoteDeLoQueCalzaExacto } from './LoteDeLoQueCalzaExacto';

function lote(sobre: Partial<LoteDeConciliacion> = {}): LoteDeConciliacion {
  return {
    id: 'l-1',
    estado: 'PROPUESTO',
    armadoPor: 'extracto',
    cantidad: 2,
    totalCop: 3_000_000,
    armadoAt: '2026-09-17T10:00:00.000Z',
    aprobadoAt: null,
    conciliados: null,
    fallidos: null,
    reversadoAt: null,
    motivoDeReversa: null,
    movimientos: [
      {
        id: 'ml-1',
        movimientoId: 'm-1',
        contractId: 'ct-1',
        tenantId: 'u-1',
        valorCop: 1_800_000,
        meses: ['2026-09'],
        referencia: '4400123',
        estado: 'INCLUIDO',
        reciboIds: [],
        motivo: null,
        tenantName: 'Laura Pérez',
        propertyTitle: 'Apto 301',
      },
      {
        id: 'ml-2',
        movimientoId: 'm-2',
        contractId: 'ct-2',
        tenantId: 'u-2',
        valorCop: 1_200_000,
        meses: ['2026-09'],
        referencia: '4400456',
        estado: 'INCLUIDO',
        reciboIds: [],
        motivo: null,
        tenantName: 'Carlos Ramírez',
        propertyTitle: 'Casa 12',
      },
    ],
    ...sobre,
  };
}

const APROBADO = lote({
  id: 'l-0',
  estado: 'APROBADO',
  aprobadoAt: '2026-09-16T15:00:00.000Z',
  conciliados: 3,
  fallidos: 0,
});

let root: Root | null = null;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar(onCambio = vi.fn()) {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root!.render(<LoteDeLoQueCalzaExacto version={0} onCambio={onCambio} />);
  });
  await esperar();
  await esperar();
  return onCambio;
}

function $(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`No se encontró ${selector}`);
  return el;
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
  await esperar();
  await esperar();
}

function escribir(el: HTMLTextAreaElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  setter.call(el, valor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  permisos.canAccess.mockReset();
  permisos.canAccess.mockReturnValue(true);
  permisos.isAdmin = false;
  permisos.agencyRole = 'CONTADOR';
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  root = null;
  document.body.innerHTML = '';
});

describe('el lote de lo que calza exacto', () => {
  it('muestra el lote propuesto con cada línea y el total, y lo aprueba de una vez', async () => {
    api.loteActual.mockResolvedValue({ disponible: true, propuesto: lote(), recientes: [] });
    api.aprobarLote.mockResolvedValue(lote({ estado: 'APROBADO', conciliados: 2, fallidos: 0 }));
    const onCambio = await montar();

    const propuesto = $('[data-testid="lote-propuesto"]');
    expect(propuesto.textContent).toContain('2 movimientos');
    expect(propuesto.textContent).toContain('3.000.000');
    expect($('[data-testid="lote-movimiento-m-1"]').textContent).toContain('Laura Pérez');
    expect($('[data-testid="lote-movimiento-m-2"]').textContent).toContain('4400456');

    await clic($('[data-testid="aprobar-lote"]'));
    expect(document.body.textContent).toContain('Aprobar 2 movimientos');
    await clic($('[data-testid="confirmar-aprobar-lote"]'));

    expect(api.aprobarLote).toHaveBeenCalledWith('l-1');
    expect(toastMock.success).toHaveBeenCalledWith('2 recibos emitidos.');
    expect(onCambio).toHaveBeenCalled();
  });

  it('lo que ya no calzaba al aprobar se dice: pasó a la cola manual', async () => {
    api.loteActual.mockResolvedValue({ disponible: true, propuesto: lote(), recientes: [] });
    api.aprobarLote.mockResolvedValue(lote({ estado: 'APROBADO', conciliados: 1, fallidos: 1 }));
    await montar();
    await clic($('[data-testid="aprobar-lote"]'));
    await clic($('[data-testid="confirmar-aprobar-lote"]'));
    expect(toastMock.error).toHaveBeenCalledWith(
      '1 recibo emitido · 1 ya no calzaban y pasaron a la cola manual',
    );
  });

  it('armar el lote no emite nada; sin nada que calce lo dice', async () => {
    api.loteActual.mockResolvedValue({ disponible: true, propuesto: null, recientes: [] });
    api.armarLote.mockResolvedValue(null);
    await montar();
    expect($('[data-testid="lote-vacio"]')).toBeTruthy();
    await clic($('[data-testid="armar-lote"]'));
    expect(api.armarLote).toHaveBeenCalledTimes(1);
    expect(api.aprobarLote).not.toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith(
      'Nada calza exacto (referencia de recaudo + valor): todo queda en la cola manual.',
    );
  });

  it('sin cobros:create se ve el lote, pero no se arma ni se aprueba', async () => {
    permisos.canAccess.mockImplementation((_m: string, a: string) => a === 'view');
    api.loteActual.mockResolvedValue({ disponible: true, propuesto: lote(), recientes: [] });
    await montar();
    expect($('[data-testid="lote-propuesto"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="aprobar-lote"]')).toBeNull();
    expect(document.querySelector('[data-testid="armar-lote"]')).toBeNull();
  });

  it('🔴 reversar es SÓLO de un administrador', async () => {
    api.loteActual.mockResolvedValue({ disponible: true, propuesto: null, recientes: [APROBADO] });
    await montar();
    expect($('[data-testid="lote-aprobado-l-0"]').textContent).toContain('3 recibos');
    expect(document.querySelector('[data-testid="reversar-lote-l-0"]')).toBeNull();
  });

  it('un administrador reversa con motivo: sin 5 caracteres no se puede', async () => {
    permisos.isAdmin = true;
    permisos.agencyRole = 'ADMIN';
    api.loteActual.mockResolvedValue({ disponible: true, propuesto: null, recientes: [APROBADO] });
    api.reversarLote.mockResolvedValue({ ...APROBADO, estado: 'REVERSADO' });
    const onCambio = await montar();

    await clic($('[data-testid="reversar-lote-l-0"]'));
    expect(($('[data-testid="confirmar-reversar-lote"]') as HTMLButtonElement).disabled).toBe(true);
    await act(async () => {
      escribir($('#motivo-reversa') as HTMLTextAreaElement, 'Se cargó el extracto de otra cuenta.');
    });
    await esperar();
    await clic($('[data-testid="confirmar-reversar-lote"]'));

    expect(api.reversarLote).toHaveBeenCalledWith('l-0', 'Se cargó el extracto de otra cuenta.');
    expect(onCambio).toHaveBeenCalled();
  });

  it('sin la migración lo dice y se sigue conciliando una por una', async () => {
    api.loteActual.mockResolvedValue({ disponible: false, propuesto: null, recientes: [] });
    await montar();
    expect($('[data-testid="lote-no-disponible"]').textContent).toContain('20260917160000');
  });
});
