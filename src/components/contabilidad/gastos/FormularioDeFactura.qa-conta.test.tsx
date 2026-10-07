/**
 * Registrar una factura de proveedor, QA de Contabilidad (CB-20 / CB-21,
 * 03-10-2026). El armado es el de `FormularioDeFactura.test.tsx`.
 *
 *   · es un CAJÓN con el `Select` del DS;
 *   · elegir un proveedor del registro propone su retefuente y, si no es
 *     responsable de IVA, las líneas sin IVA (editable);
 *   · un 400 `ASIENTO_DESCUADRADO` se dice con sus números, en el formulario;
 *   · las notas de la previsualización se ven antes de causar, con su enlace.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { gastos, toastMock } = vi.hoisted(() => ({
  gastos: {
    facturas: { registrar: vi.fn(), previsualizar: vi.fn() },
  },
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/gastos.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/gastos.service')>(
    '@/lib/api/gastos.service',
  );
  return { ...actual, gastosApi: gastos };
});
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
// CB-17 (03-10-2026): los selectores son el `Select` del DS (Radix), que no se
// abre en happy-dom. Este doble lo vuelve un `<select>` nativo con el MISMO
// `data-testid` del disparador, su valor y sus opciones: lo que estas pruebas
// miran no cambió.
vi.mock('@/components/ui/select', async () => {
  const React = await import('react');
  type Ctx = { value?: string; onValueChange?: (v: string) => void; trigger: Record<string, unknown> };
  const Contexto = React.createContext<Ctx>({ trigger: {} });
  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value?: string;
      onValueChange?: (v: string) => void;
      children?: React.ReactNode;
    }) => {
      const trigger = React.useRef<Record<string, unknown>>({}).current;
      return <Contexto.Provider value={{ value, onValueChange, trigger }}>{children}</Contexto.Provider>;
    },
    SelectTrigger: (props: Record<string, unknown>) => {
      Object.assign(React.useContext(Contexto).trigger, props);
      return null;
    },
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: React.ReactNode }) => {
      const ctx = React.useContext(Contexto);
      return (
        <select
          data-testid={ctx.trigger['data-testid'] as string | undefined}
          aria-label={ctx.trigger['aria-label'] as string | undefined}
          disabled={Boolean(ctx.trigger.disabled)}
          value={ctx.value ?? ''}
          onChange={(e) => ctx.onValueChange?.(e.target.value)}
        >
          {children}
        </select>
      );
    },
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
      <option value={value}>{children}</option>
    ),
    SelectGroup: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    SelectLabel: () => null,
    SelectSeparator: () => null,
  };
});
// CB-21 (03-10-2026): las fechas son el selector del DS (`CampoDeDia`, un botón
// con calendario). Este doble lo vuelve un campo de texto con el MISMO
// `data-testid`: lo que estas pruebas miran no cambió.
vi.mock('../CampoDeDia', () => ({
  CampoDeDia: ({
    id,
    value,
    onChange,
    testid,
  }: {
    id: string;
    value: string;
    onChange: (v: string) => void;
    testid?: string;
  }) => <input id={id} value={value} data-testid={testid} onChange={(e) => onChange(e.target.value)} />,
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}` }),
}));

import { ApiError } from '@/lib/api/client';
import { MENSAJES_DE_GASTOS } from '@/lib/contabilidad/limites-de-contabilidad';
import { FormularioDeFactura } from './FormularioDeFactura';

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

const registrada = vi.fn();
const cerrar = vi.fn();

beforeEach(() => {
  gastos.facturas.registrar.mockReset().mockResolvedValue({ id: 'f1', asientoId: null });
  gastos.facturas.previsualizar.mockReset().mockResolvedValue({
    subtotalCop: 400_000,
    ivaCop: 76_000,
    ivaDescontableCop: 76_000,
    retefuenteCop: 10_000,
    reteivaCop: 0,
    reteicaCop: 3_040,
    totalCop: 476_000,
    netoCop: 462_960,
    impuestos: [],
    sinConfirmar: false,
    notas: [],
  });
  registrada.mockReset();
  cerrar.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(
      <FormularioDeFactura
        abierto
        onCerrar={cerrar}
        onRegistrada={registrada}
        cuentas={[]}
        proveedores={[
          {
            id: 'p1',
            nombre: 'Ferretería El Tornillo SAS',
            tipoDocumento: 'NIT',
            documento: '900123456',
            email: null,
            telefono: null,
            direccion: 'Cra 43 #1-2',
            ciudad: 'Medellín',
            responsableIva: true,
            regimenSimple: null,
            retefuentePct: 2.5,
            activo: true,
            faltaPerfilTributario: false,
          },
          {
            id: 'p2',
            nombre: 'Plomero Juan Gómez',
            tipoDocumento: 'CC',
            documento: '71000111',
            email: null,
            telefono: null,
            direccion: null,
            ciudad: 'Medellín',
            responsableIva: false,
            regimenSimple: null,
            retefuentePct: 4,
            activo: true,
            faltaPerfilTributario: false,
          },
        ]}
        rubros={[
          {
            rubro: 'oficina',
            nombre: 'Oficina',
            naturaleza: 'COSTO',
            fuenteDelReal: 'CUENTAS_DEL_PUC',
            motivoSinReal: null,
          },
        ]}
        sedes={[]}
      />,
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
}

/**
 * Escribe en un input CONTROLADO por React.
 *
 * Con `input.value = x` a secas no alcanza: React 18 lleva su propio rastreador
 * del valor y, al ver que el valor del nodo ya es el nuevo, se salta el
 * `onChange`. Hay que pasar por el setter nativo del prototipo, que es lo que el
 * rastreador intercepta. Mismo patrón que `configuracion/SeccionSedes.test.tsx`.
 */
function escribir(testId: string, valor: string) {
  const input = q(testId) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter ? setter.call(input, valor) : (input.value = valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Llena lo mínimo para que el formulario quede sin problemas. */
async function llenarTodo() {
  await act(async () => {
    escribir('factura-nombre', 'Ferretería El Tornillo SAS');
    escribir('factura-documento', '900123456');
    escribir('factura-numero', '4521');
    escribir('factura-concepto', 'Cerraduras para la oficina');
    escribir('linea-descripcion-0', 'Cerradura');
    escribir('linea-base-0', '400000');
    escribir('factura-total', '476000');
    await Promise.resolve();
  });
}


async function elegir(testId: string, valor: string) {
  await act(async () => {
    const select = q(testId) as HTMLSelectElement;
    select.value = valor;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
  });
}

describe('<FormularioDeFactura> · CB-21', () => {
  it('🔴 es un cajón de la casa, no un modal', async () => {
    await pintar();
    const cajon = q('formulario-de-factura')!;
    expect(cajon.getAttribute('role')).toBe('dialog');
    expect(cajon.className).toMatch(/rounded-\[24px\]/);
    expect(cajon.querySelector('[data-testid="registrar-y-causar"]')).not.toBeNull();
  });

  it('🔴 elegir un proveedor propone su retefuente sobre la base, y sigue a la base hasta que se escriba', async () => {
    await pintar();
    await elegir('factura-proveedor', 'p1');
    await act(async () => {
      escribir('linea-base-0', '400000');
      await Promise.resolve();
    });
    expect((q('factura-retefuente') as HTMLInputElement).value).toBe('10000');
    expect(document.body.textContent).toContain('Propuesta: 2,5 % de la base');
    // Escrita a mano, ya no se toca.
    await act(async () => {
      escribir('factura-retefuente', '12000');
      escribir('linea-base-0', '800000');
      await Promise.resolve();
    });
    expect((q('factura-retefuente') as HTMLInputElement).value).toBe('12000');
  });

  it('🔴 un proveedor que no es responsable de IVA deja las líneas sin IVA (editable)', async () => {
    await pintar();
    await elegir('factura-proveedor', 'p2');
    expect((q('linea-iva-0') as HTMLInputElement).value).toBe('0');
    expect(q('lineas-sin-iva')).not.toBeNull();
    await act(async () => {
      (q('agregar-linea') as HTMLButtonElement).click();
      await Promise.resolve();
    });
    expect((q('linea-iva-1') as HTMLInputElement).value).toBe('0');
    await act(async () => {
      escribir('linea-iva-0', '19');
      await Promise.resolve();
    });
    expect((q('linea-iva-0') as HTMLInputElement).value).toBe('19');
  });
});

describe('<FormularioDeFactura> · CB-20', () => {
  it('🔴 un 400 ASIENTO_DESCUADRADO se dice con sus números, y queda en el formulario', async () => {
    const mensaje = 'El asiento no cuadra: débitos $100.000 contra créditos $119.000.';
    gastos.facturas.registrar.mockRejectedValue(
      new ApiError(400, mensaje, 'ASIENTO_DESCUADRADO', {
        statusCode: 400,
        code: 'ASIENTO_DESCUADRADO',
        message: mensaje,
      }),
    );
    await pintar();
    await llenarTodo();
    await act(async () => {
      (q('registrar-y-causar') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });
    const rechazo = q('rechazo-del-back')!.textContent ?? '';
    expect(rechazo).toContain('débitos $ 100.000 contra créditos $ 119.000');
    expect(toastMock.error.mock.calls.at(-1)![0]).toContain('débitos $ 100.000');
  });

  it('🔴 la nota de la previsualización sale antes de causar, sin emoji y con el enlace a donde se configura', async () => {
    gastos.facturas.previsualizar.mockResolvedValue({
      subtotalCop: 400_000,
      ivaCop: 76_000,
      ivaDescontableCop: 0,
      retefuenteCop: 0,
      reteivaCop: 0,
      reteicaCop: 0,
      totalCop: 476_000,
      netoCop: 476_000,
      impuestos: [],
      sinConfirmar: false,
      notas: [
        '⚠️ No está configurado si la inmobiliaria es responsable de IVA: el IVA de esta factura queda SIN descontar. Se configura en Ajustes → Perfil tributario.',
      ],
    });
    await pintar();
    await llenarTodo();
    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
      await Promise.resolve();
    });
    const notas = q('notas-de-la-liquidacion')!;
    expect(notas.textContent).not.toContain('⚠');
    expect(notas.textContent).toContain('responsable de IVA');
    expect(notas.querySelector('a')!.getAttribute('href')).toBe('/panel/inmobiliaria/configuracion/mandato');
    // Va ANTES de los botones del pie.
    const boton = q('registrar-y-causar')!;
    expect(notas.compareDocumentPosition(boton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
