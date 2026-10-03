/**
 * 🔴 Las cuentas del asiento automático de las diferencias (Nico, P1,
 * 03-10-2026): se eligen por inmobiliaria; la propuesta de la semilla se usa
 * con un clic; sin migración se dice; lo aprobado sin asiento se asienta.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock } = vi.hoisted(() => ({
  api: { cuentas: vi.fn(), guardar: vi.fn(), porAsentar: vi.fn(), reprocesar: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/cuentas-de-las-diferencias', () => ({ cuentasDeLasDiferenciasApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/components/contabilidad/use-cuentas', () => ({
  useCuentas: () => ({ cuentas: [], cargando: false, error: null, recargar: vi.fn() }),
  etiquetaDeCuenta: (c: { codigo: string; nombre: string }) => `${c.codigo} · ${c.nombre}`,
}));
vi.mock('@/components/contabilidad/use-puede-escribir', () => ({
  usePuedeEscribir: () => ({ puede: true, motivo: null }),
}));

import { CuentasDeLasDiferencias } from './CuentasDeLasDiferencias';

const GASTO = { id: 'c-530505', codigo: '530505', nombre: 'Gastos bancarios' };
const DATOS = {
  disponible: true,
  motivo: null,
  eventos: [
    {
      evento: 'GASTO_BANCARIO_GMF',
      nombre: '4×1000 (gravamen a los movimientos financieros)',
      explicacion: 'Gasto bancario.',
      codigoPropuesto: '530505',
      cuenta: null,
      propuesta: GASTO,
    },
    {
      evento: 'GASTO_BANCARIO_COMISION',
      nombre: 'Comisión del banco o de la pasarela',
      explicacion: 'Gasto bancario.',
      codigoPropuesto: '530505',
      cuenta: GASTO,
      propuesta: GASTO,
    },
    {
      evento: 'RETENCION_DEL_INQUILINO',
      nombre: 'Retención que practica el inquilino',
      explicacion: 'A nombre del propietario.',
      codigoPropuesto: '28150505',
      cuenta: null,
      propuesta: null,
    },
  ],
  cuentaDelBanco: { id: 'c-banco', codigo: '111005', nombre: 'Bancos nacionales' },
  retencionEnLaLiquidacion: true,
};

let raiz: Root | null = null;
const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;

async function montar() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  raiz = createRoot(div);
  await act(async () => {
    raiz!.render(<CuentasDeLasDiferencias />);
  });
  await act(async () => {});
}

beforeEach(() => {
  api.cuentas.mockResolvedValue(DATOS);
  api.porAsentar.mockResolvedValue({ total: 0, valorCop: 0 });
  api.guardar.mockReset();
  api.reprocesar.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});

afterEach(async () => {
  await act(async () => raiz?.unmount());
  raiz = null;
  document.body.innerHTML = '';
});

describe('las cuentas de las diferencias', () => {
  it('dice de qué cuenta sale lo que no llegó y ofrece la propuesta de la semilla', async () => {
    await montar();
    expect($('[data-testid="cuenta-del-banco"]')?.textContent).toContain('111005 · Bancos nacionales');
    // El 4×1000 no tiene cuenta y hay propuesta; la comisión ya tiene; la retención no tiene propuesta.
    expect($('[data-testid="usar-propuesta-GASTO_BANCARIO_GMF"]')?.textContent).toContain('530505 · Gastos bancarios');
    expect($('[data-testid="usar-propuesta-GASTO_BANCARIO_COMISION"]')).toBeNull();
    expect($('[data-testid="usar-propuesta-RETENCION_DEL_INQUILINO"]')).toBeNull();
  });

  it('usar la propuesta guarda esa cuenta para ese evento', async () => {
    api.guardar.mockResolvedValue({
      ...DATOS,
      eventos: DATOS.eventos.map((e) => (e.evento === 'GASTO_BANCARIO_GMF' ? { ...e, cuenta: GASTO } : e)),
    });
    await montar();
    await act(async () => {
      $('[data-testid="usar-propuesta-GASTO_BANCARIO_GMF"]')!.click();
    });
    expect(api.guardar).toHaveBeenCalledWith([{ evento: 'GASTO_BANCARIO_GMF', cuentaId: 'c-530505' }]);
    expect(toastMock.success).toHaveBeenCalledWith('Cuenta guardada.');
  });

  it('sin la migración del back lo dice y no deja guardar', async () => {
    api.cuentas.mockResolvedValue({ ...DATOS, disponible: false, motivo: 'Falta la migración.' });
    await montar();
    expect($('[data-testid="cuentas-de-las-diferencias-sin-la-migracion"]')).not.toBeNull();
    expect($('[data-testid="usar-propuesta-GASTO_BANCARIO_GMF"]')).toBeNull();
  });

  it('lo aprobado sin asiento se ve, y «Asentarlas» lo asienta', async () => {
    api.porAsentar.mockResolvedValueOnce({ total: 3, valorCop: 125_000 }).mockResolvedValue({ total: 0, valorCop: 0 });
    api.reprocesar.mockResolvedValue({ asentadas: 3, sinAsentar: 0, motivos: [] });
    await montar();
    expect($('[data-testid="diferencias-por-asentar"]')?.textContent).toContain('3 diferencias aprobadas ($125.000)');
    await act(async () => {
      $('[data-testid="asentar-las-pendientes"]')!.click();
    });
    await act(async () => {});
    expect(api.reprocesar).toHaveBeenCalledTimes(1);
    expect(toastMock.success).toHaveBeenCalledWith('Se asentaron 3 diferencias.');
  });

  it('si la retención aún no puede entrar a la liquidación, lo avisa', async () => {
    api.cuentas.mockResolvedValue({ ...DATOS, retencionEnLaLiquidacion: false });
    await montar();
    expect($('[data-testid="retencion-sin-liquidacion"]')).not.toBeNull();
  });
});
