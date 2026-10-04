/**
 * COLA-FRONT (04-10-2026, la recomendada): la retefuente NO viaja mientras
 * nadie la toque, para que el back la calcule con el registro del proveedor Y
 * la base mínima. El armado es el de `FormularioDeFactura.qa-conta.test.tsx`.
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


describe('<FormularioDeFactura> · retefuente sin tocar (COLA-FRONT)', () => {
  it('🔴 sin tocarla, ni la previsualización ni el registro mandan `retefuenteCop`', async () => {
    await pintar();
    await elegir('factura-proveedor', 'p1');
    await llenarTodo();
    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
      await Promise.resolve();
    });
    const [previa] = gastos.facturas.previsualizar.mock.calls.at(-1)!;
    expect(previa).not.toHaveProperty('retefuenteCop');
    // Lo que se ve es lo que calculó el back (10.000 en el doble).
    expect((q('factura-retefuente') as HTMLInputElement).value).toBe('10000');
    expect(document.body.textContent).toContain('La calcula Leasefy con el registro del proveedor y la base mínima');
    await act(async () => {
      (q('registrar-factura') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(gastos.facturas.registrar).toHaveBeenCalledTimes(1);
    const [cuerpo] = gastos.facturas.registrar.mock.calls[0];
    expect(cuerpo).not.toHaveProperty('retefuenteCop');
  });

  it('escrita a mano, viaja (en la previsualización y en el registro)', async () => {
    await pintar();
    await llenarTodo();
    await act(async () => {
      escribir('factura-retefuente', '7000');
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
      await Promise.resolve();
    });
    const [previa] = gastos.facturas.previsualizar.mock.calls.at(-1)!;
    expect(previa).toMatchObject({ retefuenteCop: 7000 });
    expect((q('factura-retefuente') as HTMLInputElement).value).toBe('7000');
    await act(async () => {
      (q('registrar-factura') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });
    const [cuerpo] = gastos.facturas.registrar.mock.calls[0];
    expect(cuerpo).toMatchObject({ retefuenteCop: 7000 });
  });
});
