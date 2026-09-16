/**
 * La portada de Contabilidad con el API mockeado.
 *
 * Auditoría de casos de error 13-09:
 *   · CT1 — una consulta que falla lo dice en SU tarjeta («No cargó: …») con
 *     un «Reintentar» que vuelve a pedir sólo esa; y si cae una revisión que
 *     alimenta las alertas, la portada no se queda callada como si todo
 *     estuviera en orden.
 *   · CT2 — «Reprocesar» no escribe en el libro sin decir antes cuántos
 *     movimientos y de qué tipo va a asentar.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock } = vi.hoisted(() => ({
  api: {
    puc: { listar: vi.fn() },
    asientos: {
      listar: vi.fn(),
      cierre: vi.fn(),
      faltantes: vi.fn(),
      reprocesar: vi.fn(),
    },
    reportes: { balanceDePrueba: vi.fn() },
  },
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/lib/api/contabilidad.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/contabilidad.service')>()),
  contabilidadApi: api,
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$ ${n}` }),
}));
vi.mock('./Monto', () => ({
  Monto: ({ valor }: { valor: number }) => <span>{valor}</span>,
}));
vi.mock('./RangoDeFechas', () => ({ RangoDeFechas: () => <div /> }));
vi.mock('./asientos/CierreDePeriodo', () => ({
  CierreDePeriodo: ({ fallo }: { fallo?: boolean }) => (
    <div data-testid="cierre" data-fallo={String(Boolean(fallo))} />
  ),
}));

import { HubDeContabilidad } from './HubDeContabilidad';

const SIN_FALTANTES = {
  recibos: 0,
  lotes: 0,
  cobros: 0,
  total: 0,
  mapeoCompleto: true,
  eventosSinCuenta: [],
};

let host: HTMLDivElement;
let root: Root;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<HubDeContabilidad />);
  });
  await esperar();
  await esperar();
}

const $ = (s: string) => document.querySelector<HTMLElement>(s);

async function clic(el: HTMLElement | null) {
  if (!el) throw new Error('no hay elemento para hacer clic');
  await act(async () => {
    el.click();
  });
  await esperar();
  await esperar();
}

beforeEach(() => {
  api.puc.listar.mockReset().mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]);
  api.asientos.listar.mockReset().mockResolvedValue({ asientos: [], total: 0 });
  api.asientos.cierre.mockReset().mockResolvedValue({ cerradaHasta: null });
  api.asientos.faltantes.mockReset().mockResolvedValue(SIN_FALTANTES);
  api.asientos.reprocesar.mockReset();
  api.reportes.balanceDePrueba.mockReset().mockResolvedValue({ cuadra: true, diferenciaCop: 0 });
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  toastMock.warning.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

describe('HubDeContabilidad — CT1: cada tarjeta dice si no cargó', () => {
  it('🔴 la cifra que falló dice «No cargó» con su motivo; las demás cargan igual', async () => {
    api.puc.listar.mockRejectedValue(new ApiError(500, 'boom'));
    await montar();

    const linea = $('[data-testid="no-cargo-cuentas"]');
    expect(linea).not.toBeNull();
    expect(linea!.textContent).toContain('No cargó');
    expect(linea!.textContent).toContain('servidor');
    // Las otras dos cifras llegaron: no hay línea de fallo para ellas.
    expect($('[data-testid="no-cargo-delMes"]')).toBeNull();
    expect($('[data-testid="no-cargo-libro"]')).toBeNull();
  });

  it('🔴 «Reintentar» vuelve a pedir SÓLO esa consulta y, si responde, muestra el número', async () => {
    api.puc.listar.mockRejectedValueOnce(new ApiError(500, 'boom'));
    await montar();
    const listadosAntes = api.asientos.listar.mock.calls.length;

    await clic($('[data-testid="reintentar-cuentas"]'));

    expect(api.puc.listar).toHaveBeenCalledTimes(2);
    expect(api.asientos.listar.mock.calls.length).toBe(listadosAntes);
    expect($('[data-testid="no-cargo-cuentas"]')).toBeNull();
    expect(host.querySelector('[aria-label="Resumen del libro"]')!.textContent).toContain('2');
  });

  it('sobre un 403 no ofrece reintentar: da lo mismo', async () => {
    api.puc.listar.mockRejectedValue(new ApiError(403, 'Forbidden'));
    await montar();
    expect($('[data-testid="no-cargo-cuentas"]')!.textContent).toContain('tu rol');
    expect($('[data-testid="reintentar-cuentas"]')).toBeNull();
  });

  it('🔴 si cae una revisión de las alertas, lo dice: «ninguna alerta» no es «todo en orden»', async () => {
    api.asientos.faltantes.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    await montar();

    const bloque = $('[data-testid="revisiones-caidas"]');
    expect(bloque).not.toBeNull();
    expect(bloque!.textContent).toContain('no quiere decir que esté todo en orden');
    expect(bloque!.textContent).toContain('Si hay movimientos sin asiento');
    expect(bloque!.querySelector('[data-testid="reintentar-faltantes"]')).not.toBeNull();
  });

  it('el libro que no cargó lo dice en «Últimos asientos», con reintento', async () => {
    api.asientos.listar.mockImplementation(async (f: { limite?: number; desde?: string }) => {
      if (f.limite === 5) throw new ApiError(503, 'no');
      return { asientos: [], total: 0 };
    });
    await montar();
    // Aparece en la cifra «Asientos en el libro» y en la tarjeta de últimos.
    expect(document.querySelectorAll('[data-testid="no-cargo-libro"]').length).toBe(2);
  });

  it('el cierre que no cargó lo marca y ofrece reintentar', async () => {
    api.asientos.cierre.mockRejectedValue(new ApiError(500, 'boom'));
    await montar();
    expect($('[data-testid="cierre"]')!.getAttribute('data-fallo')).toBe('true');
    expect($('[data-testid="reintentar-cierre"]')).not.toBeNull();
  });
});

describe('HubDeContabilidad — CT2: reprocesar pide confirmación', () => {
  beforeEach(() => {
    api.asientos.faltantes.mockResolvedValue({
      ...SIN_FALTANTES,
      cobros: 2,
      recibos: 1,
      total: 3,
    });
  });

  it('🔴 el botón de la alerta NO escribe: abre un diálogo que dice cuántos y de qué tipo', async () => {
    await montar();
    await clic($('[data-testid="reprocesar-asientos"]'));

    expect(api.asientos.reprocesar).not.toHaveBeenCalled();
    const detalle = $('[data-testid="confirmar-reproceso-detalle"]')!;
    expect(document.body.textContent).toContain('¿Asentar 3 movimientos sin asiento?');
    expect(detalle.textContent).toContain('2 cobros y 1 recibo de caja');
    // Lo que el back hace de verdad: no reemplaza asientos existentes.
    expect(detalle.textContent).toContain('los asientos que ya existen no se tocan');
  });

  it('confirmar reprocesa una vez, avisa y vuelve a leer la portada', async () => {
    api.asientos.reprocesar.mockResolvedValue({ asentados: 3, sinResolver: 0, motivos: [] });
    await montar();
    const pedidosAntes = api.puc.listar.mock.calls.length;

    await clic($('[data-testid="reprocesar-asientos"]'));
    await clic($('[data-testid="confirmar-reproceso"]'));

    expect(api.asientos.reprocesar).toHaveBeenCalledTimes(1);
    expect(toastMock.success).toHaveBeenCalledWith('3 asientos generados.');
    expect(api.puc.listar.mock.calls.length).toBe(pedidosAntes + 1);
    expect($('[data-testid="confirmar-reproceso-dialogo"]')).toBeNull();
  });

  it('si reprocesar falla, lo dice y el diálogo sigue abierto', async () => {
    api.asientos.reprocesar.mockRejectedValue(new ApiError(500, 'El servidor no pudo.'));
    await montar();
    await clic($('[data-testid="reprocesar-asientos"]'));
    await clic($('[data-testid="confirmar-reproceso"]'));

    expect(toastMock.error).toHaveBeenCalledTimes(1);
    expect(toastMock.success).not.toHaveBeenCalled();
    expect($('[data-testid="confirmar-reproceso-dialogo"]')).not.toBeNull();
  });
});
