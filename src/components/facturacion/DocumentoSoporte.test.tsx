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
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';

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

describe('DocumentoSoporte', () => {
  it('marca en la lista el proveedor al que le falta su perfil tributario', async () => {
    await pintar(VACIO, CON_PROVEEDOR);
    await abrirEmision();
    expect(q('[data-opcion="p-1"]')!.textContent).toContain('falta su perfil');
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
    // FA-R28: la plata con un solo formato, «$ 200.000».
    expect(previa.textContent).toContain('se le paga $ 200.000');
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
    expect(fila.textContent).toContain('$ 9.400');
    expect(fila.textContent).toContain('$ 190.600');
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
    // FA-R27 (03-10): lo dice, sin el id de la migración.
    const aviso = q('[data-testid="documento-soporte-sin-migracion"]')!.textContent!;
    expect(aviso).toContain('todavía no está disponible en esta base');
    expect(aviso).not.toContain('20260918003000');
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

describe('DocumentoSoporte · el sistema de errores (02-10)', () => {
  it('🔴 calcular la vista previa con un 5xx dice «de nuestro lado» con la referencia', async () => {
    await pintar(VACIO, CON_PROVEEDOR);
    await abrirEmision();
    await elegirProveedor();
    await escribir('[data-testid="ds-fecha"]', '2026-09-17');
    await escribir('[data-testid="ds-concepto"]', 'Cambio de la llave');
    await escribir('[data-testid="ds-valor"]', '200000');
    previsualizarDocumentoSoporte.mockRejectedValue(new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'ab12cd34',
      }));
    await act(async () => {
      (q('[data-testid="ds-previsualizar"]') as HTMLButtonElement).click();
    });
    const texto = vi.mocked(toast.error).mock.calls.at(-1)?.[0] as string;
    expect(texto).toContain('No pudimos calcular el documento soporte: algo falló de nuestro lado');
    expect(texto).toContain('ab12cd34');
  });
});

/**
 * 🔴 FA-R12 (QA-FACT, 03-10-2026): no había dónde registrar al proveedor que no
 * factura; una inmobiliaria nueva no podía emitir ni un documento soporte.
 */
describe('DocumentoSoporte · registrar al proveedor (FA-R12)', () => {
  const SIN_PROVEEDORES = { disponible: true, migracion: null, proveedores: [], explicacion: null };

  it('🔴 sin ningún proveedor, el cajón abre en el registro y lo deja elegido', async () => {
    await pintar(VACIO, SIN_PROVEEDORES);
    await abrirEmision();
    expect(q('[data-testid="ds-registrar-proveedor"]')).not.toBeNull();
    const guardar = q('[data-testid="ds-prov-guardar"]') as HTMLButtonElement;
    // Sin nombre no se puede.
    expect(guardar.disabled).toBe(true);
    await escribir('[data-testid="ds-prov-nombre"]', 'QA-FA Plomero');
    await escribir('[data-testid="ds-prov-documento"]', '1037600999');
    await escribir('[data-testid="ds-prov-retencion"]', '4');
    crearProveedor.mockResolvedValue({ ...PROVEEDOR, id: 'p-nuevo', nombre: 'QA-FA Plomero' });
    proveedores.mockResolvedValue({
      ...CON_PROVEEDOR,
      proveedores: [{ ...PROVEEDOR, id: 'p-nuevo', nombre: 'QA-FA Plomero', faltaPerfilTributario: false }],
    });
    await act(async () => {
      (q('[data-testid="ds-prov-guardar"]') as HTMLButtonElement).click();
    });
    expect(crearProveedor).toHaveBeenCalledWith({
      nombre: 'QA-FA Plomero',
      tipoDocumento: 'CC',
      documento: '1037600999',
      email: undefined,
      telefono: undefined,
      responsableIva: undefined,
      retefuentePct: 4,
    });
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Proveedor QA-FA Plomero registrado');
    expect(q('[data-testid="ds-registrar-proveedor"]')).toBeNull();
    // Queda elegido: con fecha, concepto y valor ya se puede ver la liquidación.
    await escribir('[data-testid="ds-fecha"]', '2026-10-03');
    await escribir('[data-testid="ds-concepto"]', 'Arreglo del baño');
    await escribir('[data-testid="ds-valor"]', '350000');
    expect((q('[data-testid="ds-previsualizar"]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('con proveedores, el registro está a un clic y una retención imposible se dice bajo su campo', async () => {
    await pintar(VACIO, CON_PROVEEDOR);
    await abrirEmision();
    expect(q('[data-testid="ds-registrar-proveedor"]')).toBeNull();
    await act(async () => {
      (q('[data-testid="ds-abrir-registro"]') as HTMLButtonElement).click();
    });
    await escribir('[data-testid="ds-prov-nombre"]', 'Pintor');
    await escribir('[data-testid="ds-prov-retencion"]', '140');
    expect(q('#ds-prov-retencion-error')?.textContent).toContain('entre 0 y 100');
    expect((q('[data-testid="ds-prov-guardar"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('un 409 del back (documento repetido) se dice, sin cerrar el registro', async () => {
    await pintar(VACIO, SIN_PROVEEDORES);
    await abrirEmision();
    await escribir('[data-testid="ds-prov-nombre"]', 'QA-FA Plomero');
    crearProveedor.mockRejectedValue(
      new ApiError(409, 'Ya tienes un proveedor con ese documento en esta inmobiliaria.', 'YA_EXISTE', {
        statusCode: 409,
        code: 'YA_EXISTE',
        message: 'Ya tienes un proveedor con ese documento en esta inmobiliaria.',
      }),
    );
    await act(async () => {
      (q('[data-testid="ds-prov-guardar"]') as HTMLButtonElement).click();
    });
    expect(String(vi.mocked(toast.error).mock.calls.at(-1)?.[0])).toContain('Ya tienes un proveedor con ese documento');
    expect(q('[data-testid="ds-registrar-proveedor"]')).not.toBeNull();
  });
});
