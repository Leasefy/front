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
    expect($('[data-testid="diferencias-por-asentar"]')?.textContent).toContain('3 diferencias aprobadas ($\u00a0125.000)');
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

/**
 * 🔴 Seguimiento 6 («"Asentarlas" no reprocesaba las salidas»): «por asentar»
 * cuenta también los gastos del banco conciliados como salida, y los gastos del
 * banco del extracto que se reconocen solos se ofrecen en el mismo clic, con
 * un diálogo que dice cuántos y cuánto. Sólo se concilian si la persona los
 * deja marcados (y puede).
 */
describe('🔴 «Asentarlas» también reprocesa las salidas', () => {
  const GASTOS = {
    cantidad: 2,
    totalCop: 14_500,
    puedeConciliar: true,
    porQueNo: null,
    salidas: [
      { movimientoId: 'g-1', fecha: '2026-09-14', descripcion: 'GMF 4X1000', valorCop: 6_000, etiqueta: '4×1000' },
      { movimientoId: 'c-1', fecha: '2026-09-15', descripcion: 'COMISION ACH', valorCop: 8_500, etiqueta: 'Comisión del banco' },
    ],
  };

  it('dice cuántas de las por asentar vienen de las salidas', async () => {
    api.porAsentar.mockResolvedValue({ total: 3, valorCop: 125_000, deLasSalidas: { total: 2, valorCop: 10_000 }, gastosDelExtracto: null });
    await montar();
    expect($('[data-testid="diferencias-por-asentar"]')?.textContent).toContain(
      '2 son gastos del banco conciliados como salidas',
    );
  });

  it('🔴 con gastos del banco del extracto: el diálogo dice cuántos y cuánto, y «Conciliar y asentar» los manda', async () => {
    api.porAsentar
      .mockResolvedValueOnce({ total: 1, valorCop: 4_000, deLasSalidas: { total: 1, valorCop: 4_000 }, gastosDelExtracto: GASTOS })
      .mockResolvedValue({ total: 0, valorCop: 0, gastosDelExtracto: { ...GASTOS, cantidad: 0, totalCop: 0, salidas: [] } });
    api.reprocesar.mockResolvedValue({
      asentadas: 3,
      sinAsentar: 0,
      motivos: [],
      gastosDelBanco: { conciliados: 2, totalCop: 14_500, yaNoSonSeguros: 0 },
    });
    await montar();
    expect($('[data-testid="gastos-del-extracto"]')?.textContent).toContain('2 gastos del banco ($\u00a014.500)');
    await act(async () => $('[data-testid="asentar-las-pendientes"]')!.click());
    expect(api.reprocesar).not.toHaveBeenCalled();
    expect($('[data-testid="dialogo-asentarlas"]')?.textContent).toContain('Se asienta 1 diferencia aprobada ($\u00a04.000)');
    expect($('[data-testid="dialogo-asentarlas"]')?.textContent).toContain('GMF 4X1000');
    // 🔴 (03-10-2026) la fecha de cada gasto en palabras, como el resto del panel (no «2026-09-14»).
    expect($('[data-testid="dialogo-asentarlas"]')?.textContent).not.toContain('2026-09-14');
    expect($('[data-testid="dialogo-asentarlas"]')?.textContent).toMatch(/14 de sept?\.? de 2026/);
    expect($('[data-testid="confirmar-asentarlas"]')?.textContent).toBe('Conciliar y asentar');
    await act(async () => $('[data-testid="confirmar-asentarlas"]')!.click());
    await act(async () => {});
    expect(api.reprocesar).toHaveBeenCalledWith(GASTOS);
    expect(toastMock.success).toHaveBeenCalledWith(
      'Se conciliaron 2 gastos del banco del extracto ($\u00a014.500). Se asentaron 3 diferencias.',
    );
  });

  it('si la persona desmarca los gastos, sólo asienta', async () => {
    api.porAsentar.mockResolvedValue({ total: 1, valorCop: 4_000, gastosDelExtracto: GASTOS });
    api.reprocesar.mockResolvedValue({ asentadas: 1, sinAsentar: 0, motivos: [], gastosDelBanco: null });
    await montar();
    await act(async () => $('[data-testid="asentar-las-pendientes"]')!.click());
    await act(async () => $('[data-testid="conciliar-los-gastos"]')!.click());
    expect($('[data-testid="confirmar-asentarlas"]')?.textContent).toBe('Asentar');
    await act(async () => $('[data-testid="confirmar-asentarlas"]')!.click());
    await act(async () => {});
    expect(api.reprocesar).toHaveBeenCalledWith(null);
  });

  it('sin el permiso de cobros: lo dice y no ofrece conciliar', async () => {
    api.porAsentar.mockResolvedValue({
      total: 1,
      valorCop: 4_000,
      gastosDelExtracto: { ...GASTOS, puedeConciliar: false, porQueNo: 'Conciliar los gastos del banco del extracto pide el permiso de cobros.' },
    });
    api.reprocesar.mockResolvedValue({ asentadas: 1, sinAsentar: 0, motivos: [], gastosDelBanco: null });
    await montar();
    await act(async () => $('[data-testid="asentar-las-pendientes"]')!.click());
    expect($('[data-testid="gastos-sin-permiso"]')?.textContent).toContain('permiso de cobros');
    expect($('[data-testid="conciliar-los-gastos"]')).toBeNull();
    await act(async () => $('[data-testid="confirmar-asentarlas"]')!.click());
    await act(async () => {});
    expect(api.reprocesar).toHaveBeenCalledWith(null);
  });
});
