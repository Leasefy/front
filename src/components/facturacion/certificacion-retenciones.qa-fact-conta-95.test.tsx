/**
 * 🔴 QA-FACT-CONTA-95 r2 (05-10-2026, FA3-12): el resumen de la certificación
 * dice cada retención por su lado (el propietario las declara en renglones
 * distintos) y el total; antes las juntaba en «Retenciones».
 * (Arnés copiado de CertificacionDelMandatario.test.tsx.)
 * La certificación del mandatario, y los terceros sin correo.
 *
 * Las dos viven en la misma pestaña porque son las dos mitades de la emisión
 * POR MANDATO: lo que el propietario necesita para declarar, y a quién no le
 * podemos entregar su documento.
 *
 * Lo que protege esta prueba:
 *  · la certificación se genera por PROPIETARIO y PERÍODO, y su detalle se
 *    puede descargar (el CSV se arma en el front con lo que ya vino);
 *  · la lista de sin correo dice que su documento queda «Sin entregar · falta
 *    el correo» (Nico, 03-10-2026; antes prometía WhatsApp o un enlace).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { certificaciones, generarCertificacion, tercerosSinCorreo, buscarPropietarios, pdfDeLaCertificacion, descargarBlob } =
  vi.hoisted(() => ({
    certificaciones: vi.fn(),
    generarCertificacion: vi.fn(),
    tercerosSinCorreo: vi.fn(),
    buscarPropietarios: vi.fn(),
    pdfDeLaCertificacion: vi.fn(),
    descargarBlob: vi.fn(),
  }));

vi.mock('@/lib/reportes/exportables', async () => {
  const real = await vi.importActual<typeof import('@/lib/reportes/exportables')>('@/lib/reportes/exportables');
  return { ...real, descargarBlob };
});

/**
 * 🔴 El cajón busca propietarios por NOMBRE contra la misma ruta que la lista
 * de propietarios. Antes el formulario pedía escribir el id: la prueba mandaba
 * «p-1» a mano y pasaba, porque la pantalla aceptaba cualquier texto — también
 * el que ninguna persona podría adivinar.
 */
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  propietariosApi: { getAll: buscarPropietarios },
}));

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
      pdfDeLaCertificacion,
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
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';

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
  buscarPropietarios.mockResolvedValue([]);
  host = document.createElement('div');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host.remove();
});

/**
 * 🔴 En `document` y no en `host`: desde el 21-09 «Generar una certificación»
 * vive en el cajón de la casa, que Radix monta en un portal colgado de
 * `document.body`. Buscando sólo en `host` los campos «no existen».
 */
const q = (s: string) => document.querySelector(s);

/** Escribe en un input controlado por React. */
async function escribir(testid: string, valor: string) {
  const input = q(`[data-testid="${testid}"]`) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )!.set!;
  await act(async () => {
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/** El buscador espera 350 ms a que la persona deje de escribir. */
async function dejarQueBusque() {
  await act(async () => {
    await new Promise((listo) => setTimeout(listo, 400));
  });
}

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

describe('FA-E-05 · «Descargar PDF» de la certificación (r2, main «va la a»)', () => {
  it('🔴 en el cajón, después de generarla, baja el PDF de ESA certificación con su nombre', async () => {
    certificaciones.mockResolvedValue({ disponible: true, migracion: null, certificaciones: [], explicacion: null });
    buscarPropietarios.mockResolvedValue([{ id: 'p-1', name: 'Ana Propietaria', documentNumber: '71234567', propertyCount: 3 }]);
    pdfDeLaCertificacion.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    await pintar(<CertificacionDelMandatario />);
    await act(async () => {
      (q('[data-testid="cert-abrir"]') as HTMLButtonElement).click();
    });
    await escribir('cert-propietario', 'Ana');
    await dejarQueBusque();
    await act(async () => {
      (q('[data-testid="cert-resultado-p-1"]') as HTMLButtonElement).click();
    });
    generarCertificacion.mockResolvedValue(GENERADA);
    await act(async () => {
      (q('[data-testid="cert-generar"]') as HTMLButtonElement).click();
    });
    const boton = q('[data-testid="cert-pdf"]') as HTMLButtonElement;
    expect(boton.textContent).toContain('Descargar PDF');
    await act(async () => {
      boton.click();
    });
    expect(pdfDeLaCertificacion).toHaveBeenCalledWith('c-1');
    expect(descargarBlob).toHaveBeenCalledWith(expect.any(Blob), 'certificacion-Ana-Propietaria-2026-01-01-a-2026-12-31.pdf');
  });

  it('🔴 cada fila de la lista trae su botón de PDF', async () => {
    certificaciones.mockResolvedValue({
      disponible: true, migracion: null, explicacion: null,
      certificaciones: [{ id: 'c-9', propietarioId: 'p-9', propietarioNombre: 'Paula Propietaria Ruiz', propietarioDocumento: '43555666', periodoDesde: '2026-01-01T00:00:00.000Z', periodoHasta: '2026-12-31T00:00:00.000Z', enPalabras: 'del 1 de enero al 31 de diciembre de 2026', facturasContadas: 1, baseCop: 1, ivaCop: 0, retefuenteCop: 0, reteivaCop: 0, reteicaCop: 0, totalCop: 1, generadaAt: '2026-10-05T00:00:00.000Z' }],
    });
    pdfDeLaCertificacion.mockResolvedValue(new Blob(['%PDF']));
    await pintar(<CertificacionDelMandatario />);
    const boton = q('[data-testid="cert-pdf-c-9"]') as HTMLButtonElement;
    expect(boton.getAttribute('aria-label')).toBe('Descargar el PDF de la certificación de Paula Propietaria Ruiz');
    await act(async () => {
      boton.click();
    });
    expect(pdfDeLaCertificacion).toHaveBeenCalledWith('c-9');
  });
});

describe('FA3-12 · el resumen separa las retenciones', () => {
  it('🔴 retefuente, reteIVA y reteICA por separado, y el total', async () => {
    certificaciones.mockResolvedValue({ disponible: true, migracion: null, certificaciones: [], explicacion: null });
    buscarPropietarios.mockResolvedValue([{ id: 'p-1', name: 'Ana Propietaria', documentNumber: '71234567', propertyCount: 3 }]);
    await pintar(<CertificacionDelMandatario />);
    await act(async () => {
      (q('[data-testid="cert-abrir"]') as HTMLButtonElement).click();
    });
    await escribir('cert-propietario', 'Ana');
    await dejarQueBusque();
    await act(async () => {
      (q('[data-testid="cert-resultado-p-1"]') as HTMLButtonElement).click();
    });
    generarCertificacion.mockResolvedValue({ ...GENERADA, ivaCop: 1_691_000, retefuenteCop: 311_500, reteivaCop: 253_650, reteicaCop: 12_000, totalCop: 10_591_000 });
    await act(async () => {
      (q('[data-testid="cert-generar"]') as HTMLButtonElement).click();
    });
    const t = q('[data-testid="cert-resultado"]')!.textContent ?? '';
    expect(t).toContain('Retención en la fuente');
    expect(t).toContain('$\u00a0311.500');
    expect(t).toContain('Retención de IVA');
    expect(t).toContain('$\u00a0253.650');
    expect(t).toContain('Retención de ICA');
    expect(t).toContain('$\u00a012.000');
    expect(t).toContain('Total');
    expect(t).toContain('$\u00a010.591.000');
    expect(t).not.toContain('$\u00a0577.150');
  });
});
