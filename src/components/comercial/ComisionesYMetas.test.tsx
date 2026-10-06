/**
 * «Comisiones y metas» (COMERCIAL, Nico 04-10-2026).
 *
 * C1 — Sin regla no se inventa comisión: la pantalla dice «Configura la
 *      comisión de tus asesores» (al gerente con el botón para hacerlo).
 * C2 — El asesor ve «Mi comisión del mes», con el detalle (inmueble, qué hizo,
 *      base, regla, valor, estado) y sin el botón de exportar.
 * C3 — El gerente ve a todos y exporta el CSV para nómina.
 * C4 — Las metas: el gerente las pone; el asesor ve su avance.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  isAdmin: false,
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  api: { comisiones: vi.fn(), metas: vi.fn(), guardarMeta: vi.fn() },
  descargar: vi.fn(),
}));

vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => ({ isAdmin: h.isAdmin, canAccess: () => true }) }));
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/lib/comercial/comercial', async (orig) => ({
  ...(await orig<typeof import('@/lib/comercial/comercial')>()),
  comercialApi: h.api,
  descargarCsv: h.descargar,
}));

import { ComisionesYMetas } from './ComisionesYMetas';

const LINEA = {
  asesorUserId: 'sara',
  contractId: 'k1',
  codigo: 7,
  inmueble: 'Apto 402 COMERCIAL',
  consignacionId: 'm1',
  accion: 'CAPTO' as const,
  baseCop: 410000,
  baseCausadaCop: 123000,
  regla: { id: 'r', forma: 'PORCENTAJE' as const, desdeMes: '2026-01', deTodos: true, texto: '10 % de la comisión por captar (regla de todos, desde enero de 2026)' },
  valorCop: 41000,
  ganadoCop: 12300,
  porCausarCop: 28700,
  estado: 'PARCIAL' as const,
};

function comision(over: Record<string, unknown> = {}) {
  return {
    mes: '2026-10',
    hayReglas: true,
    soloLaMia: true,
    sinAsesor: 0,
    totales: { ganadoCop: 12300, porCausarCop: 28700, lineas: 1, sinRegla: 0 },
    asesores: [
      {
        userId: 'sara',
        nombre: 'Sara Gómez',
        regla: { id: 'r', asesorUserId: null, desdeMes: '2026-01', forma: 'PORCENTAJE', pctCaptar: 10, pctCerrar: 20, fijoPorCierreCop: null },
        ganadoCop: 12300,
        porCausarCop: 28700,
        lineas: 1,
        sinRegla: 0,
        detalle: [LINEA],
      },
    ],
    ...over,
  };
}

const METAS = {
  mes: '2026-10',
  soloLaMia: true,
  asesores: [{ userId: 'sara', nombre: 'Sara Gómez', meta: { cierres: 4, captaciones: 6 }, avance: { cierres: 1, captaciones: 3 } }],
};

let contenedor: HTMLDivElement;
let raiz: Root;

async function pintar() {
  await act(async () => {
    raiz.render(<ComisionesYMetas />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

const $ = (sel: string) => contenedor.querySelector(sel);

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  h.isAdmin = false;
  h.api.comisiones.mockReset();
  h.api.metas.mockReset().mockResolvedValue(METAS);
  h.api.guardarMeta.mockReset();
  h.descargar.mockReset();
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

describe('ComisionesYMetas', () => {
  it('C1 — sin regla: «Configura la comisión de tus asesores», y el gerente tiene el botón', async () => {
    h.isAdmin = true;
    h.api.comisiones.mockResolvedValue(comision({ hayReglas: false, soloLaMia: false, asesores: [] }));
    await pintar();
    expect($('[data-testid="sin-regla"]')?.textContent).toContain('Configura la comisión de tus asesores');
    expect($('[data-testid="ir-a-configurar"]')?.getAttribute('href')).toBe('/panel/inmobiliaria/configuracion/comercial');
    expect($('[data-testid="exportar-nomina"]')).toBeNull();
  });

  it('C2 — el asesor ve «Mi comisión del mes» con el detalle y sin exportar', async () => {
    h.api.comisiones.mockResolvedValue(comision());
    await pintar();
    expect(contenedor.textContent).toContain('Mi comisión del mes');
    const tabla = $('[data-testid="detalle-tabla"]');
    expect(tabla?.textContent).toContain('Apto 402 COMERCIAL');
    expect(tabla?.textContent).toContain('Captó');
    expect(tabla?.textContent).toContain('$\u00a0410.000');
    expect(tabla?.textContent).toContain('causada $\u00a0123.000');
    expect(tabla?.textContent).toContain('$\u00a041.000');
    expect(tabla?.textContent).toContain('Parte por causar');
    expect($('[data-testid="exportar-nomina"]')).toBeNull();
    expect($('[data-testid="poner-meta"]')).toBeNull();
    expect(contenedor.textContent).toContain('Mi meta del mes');
  });

  it('C3 — el gerente exporta el CSV para nómina', async () => {
    h.isAdmin = true;
    h.api.comisiones.mockResolvedValue(comision({ soloLaMia: false }));
    await pintar();
    const boton = $('[data-testid="exportar-nomina"]') as HTMLButtonElement;
    await act(async () => boton.click());
    expect(h.descargar).toHaveBeenCalledWith('comisiones-asesores-2026-10.csv', expect.stringContaining('Sara Gómez'));
  });

  it('C4 — el gerente pone la meta del mes', async () => {
    h.isAdmin = true;
    h.api.comisiones.mockResolvedValue(comision({ soloLaMia: false }));
    h.api.guardarMeta.mockResolvedValue({ ...METAS.asesores[0], meta: { cierres: 5, captaciones: 6 } });
    await pintar();
    await act(async () => ($('[data-testid="poner-meta"]') as HTMLButtonElement).click());
    const input = $('[data-testid="meta-cierres"]') as HTMLInputElement;
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      set.call(input, '5');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => ($('[data-testid="guardar-meta"]') as HTMLButtonElement).click());
    expect(h.api.guardarMeta).toHaveBeenCalledWith({ asesorUserId: 'sara', mes: '2026-10', cierres: 5, captaciones: 6 });
  });
});
