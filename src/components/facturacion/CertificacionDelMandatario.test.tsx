/**
 * La certificación del mandatario, y los terceros sin correo.
 *
 * Las dos viven en la misma pestaña porque son las dos mitades de la emisión
 * POR MANDATO: lo que el propietario necesita para declarar, y a quién no le
 * podemos entregar su documento.
 *
 * Lo que protege esta prueba:
 *  · la certificación se genera por PROPIETARIO y PERÍODO, y su detalle se
 *    puede descargar (el CSV se arma en el front con lo que ya vino);
 *  · la lista de sin correo distingue a quien le llega por WhatsApp de quien
 *    no recibe NADA — su documento queda esperando en un enlace.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { certificaciones, generarCertificacion, tercerosSinCorreo } = vi.hoisted(
  () => ({
    certificaciones: vi.fn(),
    generarCertificacion: vi.fn(),
    tercerosSinCorreo: vi.fn(),
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
      certificaciones,
      generarCertificacion,
      tercerosSinCorreo,
    },
  };
});

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  CertificacionDelMandatario,
  comoCsv,
} from './CertificacionDelMandatario';
import { TercerosSinCorreo } from './TercerosSinCorreo';

let host: HTMLDivElement;
let root: Root;

async function pintar(nodo: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(nodo);
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

const GENERADA = {
  id: 'c-1',
  propietario: { id: 'p-1', nombre: 'Ana Propietaria', documento: '71234567' },
  periodo: {
    desde: '2026-01-01T00:00:00.000Z',
    hasta: '2026-12-31T00:00:00.000Z',
    enPalabras: 'del 1 de enero de 2026 al 31 de diciembre de 2026',
  },
  facturasContadas: 12,
  baseCop: 12_000_000,
  ivaCop: 0,
  retefuenteCop: 420_000,
  reteivaCop: 0,
  reteicaCop: 0,
  totalCop: 12_000_000,
  detalle: [
    {
      facturaId: 'f-1',
      numeroDian: 'FE-1042',
      mes: '2026-01',
      contractId: 'ct-1',
      inmueble: 'Apto 302; con punto y coma',
      inquilino: 'Pedro Inquilino',
      inquilinoDocumento: '1020304050',
      fecha: '2026-01-01T12:00:00.000Z',
      baseCop: 1_000_000,
      ivaCop: 0,
      retefuenteCop: 35_000,
      reteivaCop: 0,
      reteicaCop: 0,
      totalCop: 1_000_000,
      notasCreditoCop: 0,
    },
  ],
  generadaAt: '2026-09-17T12:00:00.000Z',
};

describe('CertificacionDelMandatario', () => {
  it('genera la certificación por propietario y período', async () => {
    certificaciones.mockResolvedValue({
      disponible: true,
      migracion: null,
      certificaciones: [],
      explicacion: null,
    });
    await pintar(<CertificacionDelMandatario />);

    const input = q('[data-testid="cert-propietario"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!;
    await act(async () => {
      setter.call(input, 'p-1');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    generarCertificacion.mockResolvedValue(GENERADA);
    await act(async () => {
      (q('[data-testid="cert-generar"]') as HTMLButtonElement).click();
    });

    expect(generarCertificacion).toHaveBeenCalledWith(
      'p-1',
      expect.objectContaining({ desde: expect.any(String) }),
    );
    const resultado = q('[data-testid="cert-resultado"]')!;
    expect(resultado.textContent).toContain('Ana Propietaria');
    expect(resultado.textContent).toContain('12 facturas');
    expect(resultado.textContent).toContain('$420.000');
    expect(q('[data-testid="cert-exportar"]')).not.toBeNull();
  });

  it('el CSV lleva una fila por factura y no rompe con los punto y coma', () => {
    const csv = comoCsv(GENERADA);
    const lineas = csv.split('\n');
    expect(lineas).toHaveLength(2);
    expect(lineas[0]).toContain('Retefuente');
    // 🔴 El punto y coma del inmueble se cambia por una coma: si no, la fila
    // se parte en dos columnas y el contador lee otra cosa.
    expect(lineas[1]).toContain('Apto 302, con punto y coma');
    expect(lineas[1].split(';')).toHaveLength(12);
  });

  it('🔴 sin la migración lo DICE', async () => {
    certificaciones.mockResolvedValue({
      disponible: false,
      migracion: '20260918002000_nota_debito_y_certificacion_del_mandatario',
      certificaciones: [],
      explicacion:
        'La certificación del mandatario llega con las migraciones 20260918000000 y 20260918002000_nota_debito_y_certificacion_del_mandatario.',
    });
    await pintar(<CertificacionDelMandatario />);
    expect(
      q('[data-testid="certificacion-sin-migracion"]')!.textContent,
    ).toContain('20260918002000');
  });
});

describe('TercerosSinCorreo', () => {
  it('🔴 distingue a quien le llega por WhatsApp de quien NO recibe nada', async () => {
    tercerosSinCorreo.mockResolvedValue({
      total: 10,
      conCorreo: 7,
      sinCorreo: 3,
      sinCorreoConWhatsapp: 1,
      sinNingunCanal: 2,
      exigido: true,
      configurable: true,
      terceros: [
        {
          id: 't-1',
          clase: 'PROPIETARIO',
          nombre: 'Ana',
          documento: '71234567',
          telefono: null,
          contratos: 15,
          tieneWhatsapp: false,
        },
        {
          id: 't-2',
          clase: 'INQUILINO',
          nombre: 'Pedro',
          documento: '1020304050',
          telefono: '3103640479',
          contratos: 1,
          tieneWhatsapp: true,
        },
      ],
    });
    await pintar(<TercerosSinCorreo />);

    const resumen = q('[data-testid="terceros-resumen"]')!;
    expect(resumen.textContent).toContain('3 de 10');
    expect(resumen.textContent).toContain('a 2 no les llega nada');
    expect(resumen.textContent).toContain('no se crea sin correo');

    expect(q('[data-testid="tercero-t-1"]')!.textContent).toContain(
      'No le llega nada',
    );
    expect(q('[data-testid="tercero-t-2"]')!.textContent).toContain(
      'Se le entrega por WhatsApp',
    );
  });

  it('cuando todos tienen correo, lo dice y no alarma', async () => {
    tercerosSinCorreo.mockResolvedValue({
      total: 10,
      conCorreo: 10,
      sinCorreo: 0,
      sinCorreoConWhatsapp: 0,
      sinNingunCanal: 0,
      exigido: true,
      configurable: true,
      terceros: [],
    });
    await pintar(<TercerosSinCorreo />);
    expect(q('[data-testid="terceros-resumen"]')!.textContent).toContain(
      'Todos tus 10 terceros tienen correo',
    );
  });

  it('con la política apagada lo dice, sin fingir que está prendida', async () => {
    tercerosSinCorreo.mockResolvedValue({
      total: 3,
      conCorreo: 1,
      sinCorreo: 2,
      sinCorreoConWhatsapp: 0,
      sinNingunCanal: 2,
      exigido: false,
      configurable: false,
      terceros: [],
    });
    await pintar(<TercerosSinCorreo />);
    const resumen = q('[data-testid="terceros-resumen"]')!;
    expect(resumen.textContent).toContain('está apagado');
    expect(resumen.textContent).toContain('migración');
  });
});
