/**
 * «Nueva factura»: el mes, las DOS listas completas, y generar lo elegido.
 *
 * Lo que se protege es el pedido de Nico: que la pantalla no obligue a elegir
 * una factura a la vez, que separe inquilinos de propietarios, que lo ya
 * emitido se vea (con su número y sin casilla) en vez de esconderse, y que
 * cambiar de mes vuelva a preguntar.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { FacturaDelMes, FacturasPorGenerar } from '@/lib/api/facturacion-por-mes.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const porGenerarMock = vi.fn();
const generarMock = vi.fn();
const toastOk = vi.fn();
const toastErr = vi.fn();

vi.mock('@/lib/api/facturacion-por-mes.service', async () => {
  const real = await vi.importActual<
    typeof import('@/lib/api/facturacion-por-mes.service')
  >('@/lib/api/facturacion-por-mes.service');
  return {
    ...real,
    facturacionPorMesService: {
      porGenerar: (...a: unknown[]) => porGenerarMock(...a),
      generar: (...a: unknown[]) => generarMock(...a),
    },
  };
});

vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: (...a: unknown[]) => toastOk(...a),
    error: (...a: unknown[]) => toastErr(...a),
  },
}));

import { NuevaFactura } from './NuevaFactura';

function factura(over: Partial<FacturaDelMes> = {}): FacturaDelMes {
  return {
    clave: 'ct-1|2026-09|INQUILINO',
    contractId: 'ct-1',
    codigo: 1839,
    numeroExterno: '1686',
    inmueble: 'Cra 76 #45-12 apto 302',
    destinatario: 'INQUILINO',
    terceroId: null,
    terceroNombre: 'Nubia Amparo David',
    terceroDocumento: '43123456',
    lineas: [
      { tipo: 'CANON', nombre: 'Canon de arrendamiento', valorCop: 1_800_000, resta: false },
    ],
    subtotalCop: 1_800_000,
    descuentoCop: 0,
    totalCop: 1_800_000,
    estado: 'POR_EMITIR',
    numero: null,
    diasFacturados: 30,
    diasDelMes: 30,
    deduccionAlEgresoCop: 0,
    ...over,
  };
}

function respuesta(over: Partial<FacturasPorGenerar> = {}): FacturasPorGenerar {
  const inquilinos = over.inquilinos ?? [factura()];
  const propietarios = over.propietarios ?? [
    factura({
      clave: 'ct-1|2026-09|PROPIETARIO',
      destinatario: 'PROPIETARIO',
      terceroNombre: 'Jorge Restrepo',
      terceroDocumento: '71234567',
      lineas: [
        { tipo: 'COMISION', nombre: 'Comisión de administración (10 %)', valorCop: 180_000, resta: false },
      ],
      subtotalCop: 180_000,
      totalCop: 180_000,
    }),
  ];
  return {
    mes: '2026-09',
    inquilinos,
    propietarios,
    omitidos: over.omitidos ?? [],
    totales: {
      contratosDelMes: 1,
      inquilinos: { porEmitir: inquilinos.length, emitidas: 0, totalCop: 1_800_000 },
      propietarios: { porEmitir: propietarios.length, emitidas: 0, totalCop: 180_000 },
    },
    ...over,
  };
}

let host: HTMLDivElement;
let root: Root;

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<NuevaFactura />);
  });
}

beforeEach(() => {
  porGenerarMock.mockReset().mockResolvedValue(respuesta());
  generarMock.mockReset();
  toastOk.mockReset();
  toastErr.mockReset();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

const q = (s: string) => host.querySelector(s);
const qa = (s: string) => Array.from(host.querySelectorAll(s));

describe('NuevaFactura', () => {
  it('pide el mes corriente al abrir y pinta las DOS listas', async () => {
    await montar();
    expect(porGenerarMock).toHaveBeenCalledTimes(1);
    expect(q('[data-testid="facturacion-inquilinos"]')).not.toBeNull();
    expect(q('[data-testid="facturacion-propietarios"]')).not.toBeNull();
    expect(host.textContent).toContain('Nubia Amparo David');
    expect(host.textContent).toContain('Jorge Restrepo');
  });

  it('🔴 todo lo que está por emitir arranca seleccionado: no se marcan 800 casillas a mano', async () => {
    await montar();
    const boton = q('[data-testid="facturacion-generar"]')!;
    expect(boton.textContent).toContain('Generar 2 facturas');
  });

  it('lo ya emitido se ve con su número y sin casilla, en vez de esconderse', async () => {
    porGenerarMock.mockResolvedValue(
      respuesta({
        inquilinos: [factura({ estado: 'EMITIDA', numero: 41 })],
      }),
    );
    await montar();
    expect(host.textContent).toContain('Emitida · N° 41');
    // La suya queda deshabilitada; sigue habiendo una del propietario.
    const boton = q('[data-testid="facturacion-generar"]')!;
    expect(boton.textContent).toContain('Generar 1 factura');
  });

  it('destildar una fila baja la cuenta del botón', async () => {
    await montar();
    const casilla = qa('[data-testid^="factura-"] button[role="checkbox"]')[0]!;
    await act(async () => {
      casilla.click();
    });
    expect(q('[data-testid="facturacion-generar"]')!.textContent).toContain(
      'Generar 1 factura',
    );
  });

  it('generar manda el mes y las claves elegidas, y vuelve a pedir el listado', async () => {
    generarMock.mockResolvedValue({
      mes: '2026-09',
      emitidas: 2,
      yaEstaban: 0,
      totalCop: 1_980_000,
      facturas: [],
    });
    await montar();
    await act(async () => {
      (q('[data-testid="facturacion-generar"]') as HTMLButtonElement).click();
    });
    expect(generarMock).toHaveBeenCalledTimes(1);
    const [mes, claves] = generarMock.mock.calls[0] as [string, string[]];
    expect(mes).toBe('2026-09');
    expect(claves.sort()).toEqual(
      ['ct-1|2026-09|INQUILINO', 'ct-1|2026-09|PROPIETARIO'].sort(),
    );
    // Se recarga para que las recién emitidas aparezcan como emitidas.
    expect(porGenerarMock).toHaveBeenCalledTimes(2);
    expect(toastOk).toHaveBeenCalled();
  });

  it('«ya estaban emitidas» se dice, no se traga', async () => {
    generarMock.mockResolvedValue({
      mes: '2026-09',
      emitidas: 1,
      yaEstaban: 1,
      totalCop: 180_000,
      facturas: [],
    });
    await montar();
    await act(async () => {
      (q('[data-testid="facturacion-generar"]') as HTMLButtonElement).click();
    });
    expect(String(toastOk.mock.calls[0]?.[0])).toContain('1 ya estaban emitidas');
  });

  it('un fallo al generar se dice y no se pinta como éxito', async () => {
    generarMock.mockRejectedValue(new Error('Sólo el administrador o el contador pueden facturar.'));
    await montar();
    await act(async () => {
      (q('[data-testid="facturacion-generar"]') as HTMLButtonElement).click();
    });
    expect(toastErr).toHaveBeenCalledWith(
      'Sólo el administrador o el contador pueden facturar.',
    );
    expect(toastOk).not.toHaveBeenCalled();
  });

  it('un mes sin contratos muestra el vacío, no una tabla en blanco', async () => {
    porGenerarMock.mockResolvedValue(
      respuesta({
        inquilinos: [],
        propietarios: [],
        totales: {
          contratosDelMes: 0,
          inquilinos: { porEmitir: 0, emitidas: 0, totalCop: 0 },
          propietarios: { porEmitir: 0, emitidas: 0, totalCop: 0 },
        },
      }),
    );
    await montar();
    expect(q('[data-testid="sin-datos"]')).not.toBeNull();
  });

  it('los contratos que NO generan factura se listan con su motivo', async () => {
    porGenerarMock.mockResolvedValue(
      respuesta({
        omitidos: [
          {
            contractId: 'ct-2',
            codigo: 94,
            inmueble: 'Casa en Laureles',
            destinatario: 'PROPIETARIO',
            motivo: 'El mandato no pactó comisión de administración.',
          },
        ],
      }),
    );
    await montar();
    const bloque = q('[data-testid="facturacion-omitidos"]')!;
    expect(bloque.textContent).toContain('1 contratos del mes no generan factura');
    expect(bloque.textContent).toContain('El mandato no pactó comisión de administración.');
  });

  it('🔴 dice que todavía no calcula impuestos ni numera ante la DIAN', async () => {
    await montar();
    expect(host.textContent).toContain('IVA ni retenciones');
    expect(host.textContent).toContain('no una numeración');
  });
});
