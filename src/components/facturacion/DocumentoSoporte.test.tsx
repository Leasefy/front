/**
 * El documento soporte del proveedor no obligado a facturar.
 *
 * Lo que protege esta prueba es lo que NO se puede callar: que una retención
 * no se pudo liquidar porque falta el dato que la decide. «Este proveedor no
 * tiene retención» y «no sabemos cuál es su retención» no pueden verse iguales.
 *
 * Y la regla de la vista previa: el documento se ve con sus retenciones ANTES
 * de emitirse, porque después lleva un número que no se borra.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const {
  documentosSoporte,
  proveedores,
  previsualizarDocumentoSoporte,
  emitirDocumentoSoporte,
} = vi.hoisted(() => ({
  documentosSoporte: vi.fn(),
  proveedores: vi.fn(),
  previsualizarDocumentoSoporte: vi.fn(),
  emitirDocumentoSoporte: vi.fn(),
}));

vi.mock('@/lib/api/facturacion-electronica.service', async () => {
  const real =
    await vi.importActual<
      typeof import('@/lib/api/facturacion-electronica.service')
    >('@/lib/api/facturacion-electronica.service');
  return {
    ...real,
    facturacionElectronicaService: {
      documentosSoporte,
      proveedores,
      previsualizarDocumentoSoporte,
      emitirDocumentoSoporte,
    },
  };
});

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { DocumentoSoporte } from './DocumentoSoporte';

const PROVEEDOR = {
  id: 'p-1',
  nombre: 'Plomería Martínez',
  tipoDocumento: 'CC',
  documento: '71234567',
  email: null,
  telefono: null,
  direccion: null,
  ciudad: null,
  responsableIva: false,
  regimenSimple: null,
  retefuentePct: null,
  activo: true,
  faltaPerfilTributario: true,
};

let host: HTMLDivElement;
let root: Root;

async function pintar(
  docs: Record<string, unknown>,
  provs: Record<string, unknown>,
) {
  documentosSoporte.mockResolvedValue(docs);
  proveedores.mockResolvedValue(provs);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<DocumentoSoporte />);
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

/**
 * 🔴 En `document` y no en `host`: desde el 22-09 «Emitir un documento soporte»
 * vive en el cajón de la casa, que Radix monta en un PORTAL colgado de
 * `document.body`. Es el mismo cambio que en «Resolución», y por la misma
 * razón: cuatro campos debajo de una tabla se leen como sus filtros.
 */
const q = (s: string) => document.querySelector(s);

/** El formulario ya no está puesto en la pantalla: lo saca su CTA. */
async function abrirEmision() {
  const boton = q('[data-testid="ds-abrir"]') as HTMLButtonElement;
  await act(async () => {
    boton.click();
  });
}

async function escribir(sel: string, valor: string) {
  const el = q(sel) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )!.set!;
  await act(async () => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function elegirProveedor() {
  const sel = q('[data-testid="ds-proveedor"]') as HTMLSelectElement;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    'value',
  )!.set!;
  await act(async () => {
    setter.call(sel, 'p-1');
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

const VACIO = {
  disponible: true,
  migracion: null,
  documentos: [],
  explicacion: null,
};

const CON_PROVEEDOR = {
  disponible: true,
  migracion: null,
  proveedores: [PROVEEDOR],
  explicacion: null,
};

describe('DocumentoSoporte', () => {
  it('marca en la lista el proveedor al que le falta su perfil tributario', async () => {
    await pintar(VACIO, CON_PROVEEDOR);
    await abrirEmision();
    expect(q('[data-testid="ds-proveedor"]')!.textContent).toContain(
      'falta su perfil',
    );
  });

  it('🔴 no deja emitir sin ver primero la liquidación', async () => {
    await pintar(VACIO, CON_PROVEEDOR);
    await abrirEmision();
    await elegirProveedor();
    await escribir('[data-testid="ds-fecha"]', '2026-09-17');
    await escribir('[data-testid="ds-concepto"]', 'Cambio de la llave');
    await escribir('[data-testid="ds-valor"]', '200000');
    expect((q('[data-testid="ds-emitir"]') as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (q('[data-testid="ds-previsualizar"]') as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('🔴 la vista previa dice qué quedó SIN CONFIRMAR y por qué', async () => {
    await pintar(VACIO, CON_PROVEEDOR);
    await abrirEmision();
    await elegirProveedor();
    await escribir('[data-testid="ds-fecha"]', '2026-09-17');
    await escribir('[data-testid="ds-concepto"]', 'Cambio de la llave');
    await escribir('[data-testid="ds-valor"]', '200000');

    previsualizarDocumentoSoporte.mockResolvedValue({
      proveedor: { id: 'p-1', nombre: 'Plomería Martínez', documento: '71234567' },
      baseCop: 200_000,
      ivaCop: 0,
      retefuenteCop: 0,
      reteivaCop: 0,
      reteicaCop: 0,
      totalCop: 200_000,
      netoCop: 200_000,
      impuestos: [],
      sinConfirmar: true,
      notas: [
        'Plomería Martínez no tiene tarifa de retención en la fuente en su ficha: el documento soporte salió SIN retención.',
      ],
    });
    await act(async () => {
      (q('[data-testid="ds-previsualizar"]') as HTMLButtonElement).click();
    });

    const previa = q('[data-testid="ds-previa"]')!;
    expect(previa.textContent).toContain('se le paga $200.000');
    expect(q('[data-testid="ds-sin-confirmar"]')).not.toBeNull();
    expect(previa.textContent).toContain('SIN retención');
    // 🔴 Pero sale igual: al técnico hay que pagarle.
    expect((q('[data-testid="ds-emitir"]') as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('🔴 cambiar el formulario invalida la vista previa: nunca se emite contra otra cuenta', async () => {
    await pintar(VACIO, CON_PROVEEDOR);
    await abrirEmision();
    await elegirProveedor();
    await escribir('[data-testid="ds-fecha"]', '2026-09-17');
    await escribir('[data-testid="ds-concepto"]', 'Cambio de la llave');
    await escribir('[data-testid="ds-valor"]', '200000');
    previsualizarDocumentoSoporte.mockResolvedValue({
      proveedor: { id: 'p-1', nombre: 'x', documento: null },
      baseCop: 200_000,
      ivaCop: 0,
      retefuenteCop: 0,
      reteivaCop: 0,
      reteicaCop: 0,
      totalCop: 200_000,
      netoCop: 200_000,
      impuestos: [],
      sinConfirmar: false,
      notas: [],
    });
    await act(async () => {
      (q('[data-testid="ds-previsualizar"]') as HTMLButtonElement).click();
    });
    expect(q('[data-testid="ds-previa"]')).not.toBeNull();

    await escribir('[data-testid="ds-valor"]', '300000');
    expect(q('[data-testid="ds-previa"]')).toBeNull();
    expect((q('[data-testid="ds-emitir"]') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('el listado muestra lo que se le paga al proveedor, no sólo la base', async () => {
    await pintar(
      {
        ...VACIO,
        documentos: [
          {
            id: 'ds-1',
            numeroInterno: 'DS-1',
            numeroDian: null,
            estado: 'EMITIDO',
            proveedorId: 'p-1',
            proveedorNombre: 'Plomería Martínez',
            proveedorDocumento: '71234567',
            origenTipo: 'MANTENIMIENTO',
            origenNombre: 'Mantenimiento',
            origenId: 'm-1',
            fecha: '2026-09-17T00:00:00.000Z',
            concepto: 'Cambio de la llave del baño',
            baseCop: 200_000,
            ivaCop: 0,
            retefuenteCop: 8_000,
            reteivaCop: 0,
            reteicaCop: 1_400,
            totalCop: 200_000,
            netoCop: 190_600,
            createdAt: '2026-09-17T12:00:00.000Z',
            transmision: {
              estado: 'SIN_PROVEEDOR',
              estadoNombre: 'Sin proveedor configurado',
              cufe: null,
              ultimoError: null,
            },
          },
        ],
      },
      CON_PROVEEDOR,
    );
    const fila = q('[data-testid="documento-soporte-ds-1"]')!;
    expect(fila.textContent).toContain('DS-1');
    expect(fila.textContent).toContain('$9.400');
    expect(fila.textContent).toContain('$190.600');
    expect(fila.textContent).toContain('Sin proveedor configurado');
  });

  it('🔴 sin la migración lo DICE y no ofrece el formulario', async () => {
    await pintar(
      {
        disponible: false,
        migracion: '20260918003000_documento_soporte',
        documentos: [],
        explicacion:
          'El documento soporte llega con la migración 20260918003000_documento_soporte, que todavía no está aplicada en esta base.',
      },
      {
        disponible: false,
        migracion: '20260918003000_documento_soporte',
        proveedores: [],
        explicacion: 'idem',
      },
    );
    expect(
      q('[data-testid="documento-soporte-sin-migracion"]')!.textContent,
    ).toContain('20260918003000');
    expect(q('[data-testid="documento-soporte-formulario"]')).toBeNull();
  });
});

/**
 * 🔴 Nico, 22-09: «así hay muchas cosas no sólo en estas tablas dentro de
 * facturación que deberían ser mejor un CTA que saque toda la información y ya
 * funcione desde ahí». Este guardián no deja que el formulario vuelva a quedar
 * puesto debajo de la tabla, que es donde se leía como sus filtros.
 */
describe('DocumentoSoporte · el formulario lo saca un CTA', () => {
  it('🔴 no está puesto en la pantalla: primero está el botón', async () => {
    await pintar(VACIO, CON_PROVEEDOR);
    expect(q('[data-testid="ds-proveedor"]')).toBeNull();
    expect(q('[data-testid="ds-emitir"]')).toBeNull();
    expect(q('[data-testid="ds-abrir"]')).not.toBeNull();

    await abrirEmision();
    expect(q('[data-testid="ds-proveedor"]')).not.toBeNull();
    expect(q('[data-testid="ds-emitir"]')).not.toBeNull();
  });
});
