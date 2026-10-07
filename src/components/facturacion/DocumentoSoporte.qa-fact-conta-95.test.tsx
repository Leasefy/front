/**
 * 🔴 QA-FACT-CONTA-95 (05-10-2026) · FA-E-03 / FA-E-04: un doble clic en
 * «Emitir» sacaba DOS documentos soporte (la guarda era estado de React y el
 * segundo clic llega antes del siguiente render), y una fecha futura se emitía
 * sin decir nada.
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
  crearProveedor,
} = vi.hoisted(() => ({
  documentosSoporte: vi.fn(),
  proveedores: vi.fn(),
  previsualizarDocumentoSoporte: vi.fn(),
  emitirDocumentoSoporte: vi.fn(),
  crearProveedor: vi.fn(),
}));

/*
 * QA-FACT (03-10-2026): el proveedor y la fecha usan el `Select` y el selector
 * de fecha del DS (FA-R29 / FA-R30), que no abren en happy-dom. Dobles con el
 * mismo contrato: las opciones son botones con `data-opcion` y la fecha es un
 * input con su `data-testid`.
 */
vi.mock('@/components/ui/select', async () => {
  const R = await import('react');
  const Ctx = R.createContext<(v: string) => void>(() => undefined);
  return {
    Select: ({ onValueChange, children }: { onValueChange: (v: string) => void; children?: React.ReactNode }) =>
      R.createElement(Ctx.Provider, { value: onValueChange }, R.createElement('div', null, children)),
    SelectTrigger: ({ children, ...resto }: { children?: React.ReactNode } & Record<string, unknown>) =>
      R.createElement('div', resto, children),
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: React.ReactNode }) => R.createElement('div', null, children),
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => {
      const elegir = R.useContext(Ctx);
      return R.createElement('button', { type: 'button', 'data-opcion': value, onClick: () => elegir(value) }, children);
    },
  };
});

vi.mock('./CampoDeFecha', async () => {
  const R = await import('react');
  return {
    CampoDeFecha: ({ value, onChange, testid }: { value: string; onChange: (v: string) => void; testid?: string }) =>
      R.createElement('input', {
        'data-testid': testid,
        value,
        onChange: (e: { target: { value: string } }) => onChange(e.target.value),
      }),
  };
});

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
      crearProveedor,
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

async function elegirProveedor(id = 'p-1') {
  await act(async () => {
    (q(`[data-opcion="${id}"]`) as HTMLButtonElement).click();
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

const PREVIA = {
  proveedor: { id: 'p-1', nombre: 'Plomería Martínez', documento: '71234567' },
  baseCop: 350_000,
  ivaCop: 0,
  retefuenteCop: 0,
  reteivaCop: 0,
  reteicaCop: 0,
  totalCop: 350_000,
  netoCop: 350_000,
  impuestos: [],
  sinConfirmar: false,
  notas: [],
};

async function llenar(fecha: string) {
  await pintar(VACIO, CON_PROVEEDOR);
  await abrirEmision();
  await elegirProveedor();
  await escribir('[data-testid="ds-fecha"]', fecha);
  await escribir('[data-testid="ds-concepto"]', 'Poda de jardín');
  await escribir('[data-testid="ds-valor"]', '350000');
}

describe('QA-FACT-CONTA-95 · documento soporte: un solo documento y nunca con fecha futura', () => {
  it('🔴 un doble clic en «Emitir» emite UNO', async () => {
    await llenar('2026-09-17');
    previsualizarDocumentoSoporte.mockResolvedValue(PREVIA);
    await act(async () => {
      (q('[data-testid="ds-previsualizar"]') as HTMLButtonElement).click();
    });
    let soltar: (v: unknown) => void = () => undefined;
    emitirDocumentoSoporte.mockImplementation(() => new Promise((r) => { soltar = r; }));
    const boton = q('[data-testid="ds-emitir"]') as HTMLButtonElement;
    await act(async () => {
      boton.click();
      boton.click();
    });
    await act(async () => {
      soltar({ numeroInterno: 'DS-4' });
    });
    expect(emitirDocumentoSoporte).toHaveBeenCalledTimes(1);
  });

  it('🔴 una fecha futura se dice bajo el campo y no deja seguir', async () => {
    await llenar('2099-01-01');
    expect(q('#ds-fecha-error')?.textContent).toContain('no puede ser futura');
    expect((q('[data-testid="ds-previsualizar"]') as HTMLButtonElement).disabled).toBe(true);
  });
});
