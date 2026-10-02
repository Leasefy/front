/**
 * El asiento manual y el sistema de errores (02-10-2026).
 *
 * Lo que este archivo fija:
 *
 *  1. Un 400 con `campos` del back va a SU campo: `movimientos.1.creditoCop` es
 *     la línea 2, y se enfoca.
 *  2. Un código de negocio de la fecha (`PERIODO_CERRADO`) va bajo la fecha.
 *  3. Un 5xx dice «de nuestro lado» con la referencia; un status 0 habla de la
 *     conexión. Ninguno de los dos culpa a la persona ni pinta el código crudo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { CuentaPuc } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * El `Combobox` del plan de cuentas y el `CurrencyInput` de cadence, por sus
 * equivalentes nativos: el botón «Crear asiento» está `disabled` hasta que el
 * asiento cuadre y hay que poder LLENARLO de verdad (mismo patrón que
 * `migracion/AsientoDeApertura.test.tsx`).
 */
vi.mock('../SelectorDeCuenta', () => ({
  SelectorDeCuenta: ({
    value,
    onChange,
    cuentas,
  }: {
    value: string;
    onChange: (v: string) => void;
    cuentas: readonly { id: string }[];
  }) => (
    <select data-testid="linea-cuenta" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {cuentas.map((c) => (
        <option key={c.id} value={c.id}>
          {c.id}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@leasefy/cadence', async () => {
  const actual = await vi.importActual<typeof import('@leasefy/cadence')>('@leasefy/cadence');
  return {
    ...actual,
    CurrencyInput: ({
      value,
      onChange,
      invalid: _invalid,
      ...resto
    }: {
      value?: number;
      onChange: (v: number) => void;
      invalid?: boolean;
      [k: string]: unknown;
    }) => (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
        {...resto}
      />
    ),
  };
});

const { api, toastMock } = vi.hoisted(() => ({
  api: { asientos: { crear: vi.fn() } },
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: { ...actual.contabilidadApi, asientos: api.asientos } };
});
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}` }),
}));

import { ApiError } from '@/lib/api/client';
import { AsientoManual } from './AsientoManual';

const cuenta = (id: string): CuentaPuc =>
  ({
    id,
    agencyId: 'ag-1',
    codigo: id,
    nombre: `Cuenta ${id}`,
    naturaleza: 'DEBITO',
    padreId: null,
    imputable: true,
    activa: true,
    nivel: 4,
  }) as unknown as CuentaPuc;

let host: HTMLDivElement;
let root: Root;
const todos = (t: string) => Array.from(document.querySelectorAll<HTMLElement>(`[data-testid="${t}"]`));
const q = (t: string) => document.querySelector<HTMLElement>(`[data-testid="${t}"]`);

function escribir(el: HTMLElement, valor: string) {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, valor);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}

beforeEach(() => {
  api.asientos.crear.mockReset().mockResolvedValue({ id: 'a1', numero: 7, yaExistia: false });
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

async function pintar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(
      <AsientoManual abierto onCerrar={() => {}} onCreado={() => {}} cuentas={[cuenta('c1'), cuenta('c2')]} />,
    );
  });
}

/** Un asiento de dos líneas que cuadra: 100.000 a débito y a crédito. */
async function llenar() {
  await act(async () => {
    escribir(q('asiento-descripcion')!, 'Causación de febrero');
    const [c1, c2] = todos('linea-cuenta');
    escribir(c1, 'c1');
    escribir(c2, 'c2');
    escribir(todos('linea-debito')[0], '100000');
    escribir(todos('linea-credito')[1], '100000');
  });
}

async function crear() {
  await act(async () => {
    q('crear-asiento')!.click();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function textoDelBanner(): string {
  return document.body.textContent ?? '';
}

describe('<AsientoManual> · errores en su campo', () => {
  it('cuadrado, el botón se prende y manda el asiento', async () => {
    await pintar();
    await llenar();
    expect((q('crear-asiento') as HTMLButtonElement).disabled).toBe(false);
    await crear();
    expect(api.asientos.crear).toHaveBeenCalledTimes(1);
  });

  it('🔴 un 400 con `campos` pinta el error bajo la línea 2 y le da el foco', async () => {
    const mensaje = 'El crédito de la línea no puede ser mayor que 2.147.483.647.';
    api.asientos.crear.mockRejectedValue(
      new ApiError(400, [mensaje], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [mensaje],
        campos: [{ campo: 'movimientos.1.creditoCop', regla: 'maximo', mensaje }],
      }),
    );
    await pintar();
    await llenar();
    await crear();

    const credito2 = todos('linea-credito')[1];
    const idDelError = credito2.getAttribute('aria-describedby')!;
    expect(document.getElementById(idDelError)?.textContent).toBe(mensaje);
    // El foco va a la línea (su débito, el primer monto de la fila).
    expect(document.activeElement).toBe(todos('linea-debito')[1]);
    // La línea 1 no tiene nada.
    expect(todos('linea-debito')[0].getAttribute('aria-describedby')).toBeNull();
  });

  it('🔴 `PERIODO_CERRADO` va bajo la fecha, con su frase, y la enfoca', async () => {
    api.asientos.crear.mockRejectedValue(
      new ApiError(400, 'periodo cerrado', 'PERIODO_CERRADO', {
        statusCode: 400,
        code: 'PERIODO_CERRADO',
        message: 'periodo cerrado',
      }),
    );
    await pintar();
    await llenar();
    await crear();

    const fecha = q('asiento-fecha')!;
    expect(fecha.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(fecha.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Esa fecha cae en un período que ya se cerró.',
    );
    expect(document.activeElement).toBe(fecha);
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia', async () => {
    api.asientos.crear.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'f00dbabe',
      }),
    );
    await pintar();
    await llenar();
    await crear();

    const texto = textoDelBanner();
    expect(texto).toMatch(/No pudimos crear el asiento: algo falló de nuestro lado/);
    expect(texto).toContain('f00dbabe');
    expect(texto).not.toMatch(/Error interno del servidor/);
  });

  it('🔴 sin respuesta (status 0) habla de la conexión', async () => {
    api.asientos.crear.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    await pintar();
    await llenar();
    await crear();

    expect(textoDelBanner()).toMatch(/conexi[oó]n/i);
    expect(textoDelBanner()).not.toContain('Failed to fetch');
  });
});
