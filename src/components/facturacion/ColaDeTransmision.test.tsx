/**
 * La cola de transmisión a la DIAN.
 *
 * Lo que protege esta prueba son las tres cosas que la pantalla NO puede
 * callar (Nico y Juan Camilo, 17-09):
 *
 *  · que sin proveedor tecnológico los documentos están numerados pero NO
 *    validados ante la DIAN;
 *  · que **el recaudo no se frena** por nada de acá;
 *  · que un RECHAZO de la DIAN no se reintenta solo: lo vuelve a encolar una
 *    persona, con el botón, y el motivo del rechazo está a la vista.
 *
 * Y la cuarta, la de siempre: sin la migración, la pantalla lo DICE en vez de
 * pintar una tabla vacía que parece «no tienes nada».
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { cola, reintentarTransmision, reintentarLosSinProveedor } = vi.hoisted(
  () => ({
    cola: vi.fn(),
    reintentarTransmision: vi.fn(),
    reintentarLosSinProveedor: vi.fn(),
  }),
);

vi.mock('@/lib/api/facturacion-electronica.service', async () => {
  const real =
    await vi.importActual<
      typeof import('@/lib/api/facturacion-electronica.service')
    >('@/lib/api/facturacion-electronica.service');
  return {
    ...real,
    facturacionElectronicaService: {
      cola,
      reintentarTransmision,
      reintentarLosSinProveedor,
    },
  };
});

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { ColaDeTransmision } from './ColaDeTransmision';

function documento(over: Record<string, unknown> = {}) {
  return {
    id: 't-1',
    documentoTipo: 'FACTURA',
    documentoNombre: 'Factura de venta',
    documentoId: 'f-1',
    numeroDian: 'FE-1042',
    estado: 'POR_TRANSMITIR',
    estadoNombre: 'Por transmitir',
    intentos: 2,
    proximoIntentoAt: '2026-09-17T16:00:00.000Z',
    ultimoIntentoAt: '2026-09-17T15:00:00.000Z',
    ultimoError: null,
    cufe: null,
    cude: null,
    xmlUrl: null,
    pdfUrl: null,
    encoladaAt: '2026-09-17T12:00:00.000Z',
    transmitidaAt: null,
    aceptadaAt: null,
    rechazadaAt: null,
    proveedor: null,
    reintentable: false,
    ...over,
  };
}

function respuesta(over: Record<string, unknown> = {}) {
  return {
    disponible: true,
    migracion: null,
    proveedor: 'Sin proveedor tecnológico',
    proveedorConfigurado: false,
    resumen: { POR_TRANSMITIR: 1 },
    avisos: [],
    documentos: [documento()],
    explicacion: null,
    ...over,
  };
}

let host: HTMLDivElement;
let root: Root;

async function pintar(r: Record<string, unknown>) {
  cola.mockResolvedValue(r);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<ColaDeTransmision />);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  host = document.createElement('div');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host.remove();
});

const q = (s: string) => host.querySelector(s);

describe('ColaDeTransmision', () => {
  it('🔴 sin proveedor lo dice, y dice que el recaudo no depende de esto', async () => {
    await pintar(respuesta());
    const aviso = q('[data-testid="cola-proveedor"]')!;
    expect(aviso.textContent).toContain('no hay proveedor tecnológico');
    expect(aviso.textContent).toContain('NO están validadas ante la DIAN');
    expect(aviso.textContent).toContain('recaudo no depende de esto');
  });

  it('con proveedor conectado dice cuál es, sin la advertencia', async () => {
    await pintar(
      respuesta({ proveedorConfigurado: true, proveedor: 'Proveedor X' }),
    );
    const aviso = q('[data-testid="cola-proveedor"]')!;
    expect(aviso.textContent).toContain('Proveedor X');
    expect(aviso.textContent).not.toContain('NO están validadas');
  });

  it('🔴 un RECHAZO muestra su motivo y ofrece volver a intentar', async () => {
    await pintar(
      respuesta({
        documentos: [
          documento({
            id: 't-rechazada',
            estado: 'RECHAZADA_DIAN',
            estadoNombre: 'Rechazada por la DIAN',
            ultimoError: 'NIT del adquirente inválido',
            reintentable: true,
          }),
        ],
      }),
    );
    const fila = q('[data-testid="transmision-t-rechazada"]')!;
    expect(fila.textContent).toContain('Rechazada por la DIAN');
    expect(fila.textContent).toContain('NIT del adquirente inválido');
    const boton = q(
      '[data-testid="transmision-reintentar-t-rechazada"]',
    ) as HTMLButtonElement;
    expect(boton).not.toBeNull();

    reintentarTransmision.mockResolvedValue({
      id: 't-rechazada',
      estado: 'POR_TRANSMITIR',
    });
    await act(async () => {
      boton.click();
    });
    expect(reintentarTransmision).toHaveBeenCalledWith('t-rechazada');
  });

  it('🔴 lo que TODAVÍA se reintenta solo no ofrece el botón', async () => {
    await pintar(respuesta());
    expect(q('[data-testid="transmision-reintentar-t-1"]')).toBeNull();
  });

  it('una ACEPTADA muestra su CUFE', async () => {
    await pintar(
      respuesta({
        documentos: [
          documento({
            id: 't-ok',
            estado: 'ACEPTADA_DIAN',
            estadoNombre: 'Aceptada por la DIAN',
            cufe: 'abc123cufe',
          }),
        ],
      }),
    );
    expect(q('[data-testid="transmision-t-ok"]')!.textContent).toContain(
      'abc123cufe',
    );
  });

  it('avisa lo que lleva demasiado tiempo, con las horas y los intentos', async () => {
    await pintar(
      respuesta({
        avisos: [
          {
            transmisionId: 't-1',
            documentoTipo: 'FACTURA',
            numeroDian: 'FE-1042',
            horas: 10,
            intentos: 6,
            ultimoError: 'timeout',
          },
        ],
      }),
    );
    const avisos = q('[data-testid="cola-avisos"]')!;
    expect(avisos.textContent).toContain('FE-1042');
    expect(avisos.textContent).toContain('10 horas');
    expect(avisos.textContent).toContain('timeout');
  });

  it('ofrece volver a encolar TODO lo que quedó sin proveedor', async () => {
    await pintar(respuesta({ resumen: { SIN_PROVEEDOR: 12 } }));
    const boton = q(
      '[data-testid="cola-reintentar-sin-proveedor"]',
    ) as HTMLButtonElement;
    expect(boton.textContent).toContain('12');
    reintentarLosSinProveedor.mockResolvedValue({ reencolados: 12 });
    await act(async () => {
      boton.click();
    });
    expect(reintentarLosSinProveedor).toHaveBeenCalled();
  });

  it('🔴 sin la migración lo DICE en vez de fingir un listado vacío', async () => {
    await pintar(
      respuesta({
        disponible: false,
        migracion: '20260918001000_cola_de_transmision_y_entrega',
        documentos: [],
        resumen: {},
        explicacion:
          'La cola de transmisión a la DIAN llega con la migración 20260918001000_cola_de_transmision_y_entrega, que todavía no está aplicada en esta base. Emitir, numerar y el recaudo funcionan igual.',
      }),
    );
    const aviso = q('[data-testid="cola-sin-migracion"]')!;
    expect(aviso.textContent).toContain('20260918001000');
    expect(aviso.textContent).toContain('el recaudo funcionan igual');
    // Y el vacío NO dice «no tienes nada».
    expect((q('[data-testid="sin-datos"]')?.textContent ?? '').toLowerCase()).not.toContain(
      'no tienes',
    );
  });
});
