/**
 * 🔴 8.ª tanda de la migración de Portofino (14-10-2026): «Subir el balance».
 *
 * Nico eligió «saldos al cierre + movimientos del año»: el balance de prueba
 * POR TERCERO al 31-12 del año anterior entra como la apertura. Lo que este
 * archivo congela, de punta a punta en la pantalla:
 *
 *  1. El balance se lee, se busca a cada tercero por su documento y el
 *     resumen dice cuántas líneas, si cuadra y qué quedó sin nombre.
 *  2. «Usar estas N líneas» llena el formulario de siempre con la fecha del
 *     cierre del año anterior, y «Registrar» manda esas líneas con su tercero.
 *  3. Con los saldos crédito en positivo, la casilla sale marcada sola (así
 *     el balance cuadra).
 *  4. Si la búsqueda de terceros falla, se puede seguir sin nombres.
 *  5. Al registrar, si ya había libro diario migrado hasta el corte, se dice.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { CuentaPuc } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
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
      <input type="number" value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))} {...resto} />
    ),
  };
});

vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  parseSpreadsheetFile: vi.fn(),
}));

const { api } = vi.hoisted(() => ({
  api: {
    asientos: { crear: vi.fn() },
    migracion: { tercerosPorDocumento: vi.fn() },
  },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return {
    ...actual,
    contabilidadApi: {
      ...actual.contabilidadApi,
      asientos: { ...actual.contabilidadApi.asientos, ...api.asientos },
      migracion: { ...actual.contabilidadApi.migracion, ...api.migracion },
    },
  };
});

import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile';
import { AsientoDeApertura } from './AsientoDeApertura';

function cuenta(codigo: string, nombre: string, naturaleza: 'DEBITO' | 'CREDITO'): CuentaPuc {
  return {
    id: `c-${codigo}`,
    agencyId: 'ag-1',
    codigo,
    nombre,
    naturaleza,
    padreId: null,
    imputable: true,
    activa: true,
    createdAt: '2026-01-01T00:00:00Z',
  } as CuentaPuc;
}

const PLAN = [
  cuenta('110505', 'Caja general', 'DEBITO'),
  cuenta('130505', 'Clientes nacionales', 'DEBITO'),
  cuenta('281505', 'Valores recibidos para terceros', 'CREDITO'),
  cuenta('310505', 'Capital suscrito y pagado', 'CREDITO'),
];

/** Siigo Pyme: CUENTA, DESCRIPCION, NIT, NOMBRE, NUEVO SALDO (con signo). */
const ENCABEZADOS = ['CUENTA', 'DESCRIPCION', 'NIT', 'NOMBRE', 'NUEVO SALDO'];
type Fila = [string, string, string, string, number];
const balance = (filas: Fila[]) =>
  filas.map(([CUENTA, DESCRIPCION, NIT, NOMBRE, saldo]) => ({
    CUENTA,
    DESCRIPCION,
    NIT,
    NOMBRE,
    'NUEVO SALDO': saldo,
  }));

const CON_SIGNO: Fila[] = [
  ['1', 'ACTIVO', '', '', 4_000_000],
  ['110505', 'CAJA GENERAL', '', '', 1_000_000],
  ['130505', 'CLIENTES', '', '', 3_000_000],
  ['130505', 'CLIENTES', '1017000222', 'LUISA GOMEZ', 2_000_000],
  ['130505', 'CLIENTES', '1020304050', 'ANDRES SIN CUENTA', 1_000_000],
  ['281505', 'TERCEROS', '1037636779', 'MARIA VALDERRAMA', -2_500_000],
  ['310505', 'CAPITAL', '', '', -1_500_000],
];

const TERCEROS = [
  { documento: '1017000222', propietario: null, inquilino: { id: 'u-luisa', nombre: 'Luisa Gómez' } },
  { documento: '1020304050', propietario: null, inquilino: 'SIN_CUENTA' },
  { documento: '1037636779', propietario: { id: 'po-maria', nombre: 'María Valderrama' }, inquilino: null },
];

let container: HTMLDivElement;
let root: Root | null = null;

const q = (testid: string) => container.querySelector<HTMLElement>(`[data-testid="${testid}"]`);

async function pintar(props: Partial<React.ComponentProps<typeof AsientoDeApertura>> = {}) {
  root = createRoot(container);
  await act(async () => {
    root!.render(<AsientoDeApertura cuentas={PLAN} onCreado={vi.fn()} {...props} />);
  });
}

async function tocar(testid: string) {
  const el = q(testid);
  if (!el) throw new Error(`no está ${testid}`);
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {});
}

async function subirBalance(filas: Fila[]) {
  vi.mocked(parseSpreadsheetFile).mockResolvedValue({
    rows: balance(filas),
    headers: ENCABEZADOS,
    sheetNames: ['Hoja1'],
  } as never);
  const input = q('input-balance') as HTMLInputElement;
  const file = new File(['x'], 'balance-2025.csv', { type: 'text/csv' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
  });
  await act(async () => {});
  await act(async () => {});
}

const ANIO_ANTERIOR = new Date().getFullYear() - 1;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  api.migracion.tercerosPorDocumento.mockResolvedValue(TERCEROS);
  api.asientos.crear.mockImplementation(async (cuerpo: { fecha: string; movimientos: { debitoCop?: number }[] }) => ({
    id: 'as-1',
    numero: 1,
    fecha: cuerpo.fecha,
    descripcion: 'Saldos iniciales',
    movimientos: cuerpo.movimientos.map((m) => ({ debitoCop: m.debitoCop ?? 0, creditoCop: 0 })),
    yaExistia: false,
    asientosMigradosHastaElCorte: 12,
  }));
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container.remove();
  vi.clearAllMocks();
});

describe('🔴 Portofino (14-10) · «Subir el balance» en los saldos iniciales', () => {
  it('lee el balance, busca a cada tercero y dice qué va a entrar', async () => {
    await pintar();
    await tocar('apertura-subir-balance');
    await subirBalance(CON_SIGNO);

    expect(api.migracion.tercerosPorDocumento).toHaveBeenCalledWith([
      '1017000222',
      '1020304050',
      '1037636779',
    ]);
    const resumen = q('balance-resumen')!;
    expect(resumen.textContent).toContain('5 líneas para los saldos iniciales');
    expect(q('balance-cuadra')).not.toBeNull();
    expect(q('balance-sin-cuenta')!.textContent).toContain('ANDRES SIN CUENTA (1020304050)');
    expect(q('balance-usar')!.textContent).toBe('Usar estas 5 líneas');
  });

  it('«Usar estas líneas» llena el formulario, con la fecha del cierre del año anterior, y se registra con sus terceros', async () => {
    await pintar();
    await tocar('apertura-subir-balance');
    await subirBalance(CON_SIGNO);
    await tocar('balance-usar');

    expect(q('balance-de-apertura')).toBeNull();
    expect(q('apertura-del-balance')!.textContent).toContain('5 líneas del balance «balance-2025.csv»');
    expect(q('apertura-fila-4')).not.toBeNull();
    expect(q('apertura-totales')!.textContent).toContain('Cuadra');

    await tocar('apertura-enviar');

    const [cuerpo] = api.asientos.crear.mock.calls[0] as [
      { fecha: string; esApertura: boolean; movimientos: Record<string, unknown>[] },
    ];
    expect(cuerpo.fecha).toBe(`${ANIO_ANTERIOR}-12-31`);
    expect(cuerpo.esApertura).toBe(true);
    expect(cuerpo.movimientos).toEqual([
      { cuentaId: 'c-110505', debitoCop: 1_000_000 },
      // El inquilino sin cuenta: el saldo entra sin nombre.
      { cuentaId: 'c-130505', debitoCop: 1_000_000 },
      {
        cuentaId: 'c-130505',
        debitoCop: 2_000_000,
        terceroTipo: 'ARRENDATARIO',
        terceroId: 'u-luisa',
        descripcion: 'Luisa Gómez',
      },
      {
        cuentaId: 'c-281505',
        creditoCop: 2_500_000,
        terceroTipo: 'PROPIETARIO',
        terceroId: 'po-maria',
        descripcion: 'María Valderrama',
      },
      { cuentaId: 'c-310505', creditoCop: 1_500_000 },
    ]);
    // Y si ya había libro diario migrado hasta el corte, se dice.
    expect(q('apertura-migrados-antes')!.textContent).toContain('Ya había 12 asientos del libro diario');
  });

  it('con los saldos crédito en positivo, la casilla sale marcada sola y cuadra', async () => {
    await pintar();
    await tocar('apertura-subir-balance');
    await subirBalance(
      CON_SIGNO.map(([c, d, n, t, s]): Fila => [c, d, n, t, /^[23]/.test(c) ? -s : s]),
    );

    const casilla = q('balance-credito-en-positivo')!;
    expect(casilla.getAttribute('data-state')).toBe('checked');
    expect(q('balance-cuadra')).not.toBeNull();
  });

  it('una cuenta que no está en el plan se lista con su saldo y el resumen dice que no cuadra', async () => {
    await pintar();
    await tocar('apertura-subir-balance');
    // El archivo cuadra (el capital baja lo que pesa la depreciación); sin la
    // 159205, la apertura no.
    await subirBalance([
      ...CON_SIGNO.filter(([c]) => c !== '310505'),
      ['159205', 'DEPRECIACION', '', '', -300_000],
      ['310505', 'CAPITAL', '', '', -1_200_000],
    ]);

    expect(q('balance-fuera-del-plan')!.textContent).toContain('159205');
    expect(q('balance-fuera-del-plan')!.textContent).toContain('no está en tu plan');
    expect(q('balance-no-cuadra')).not.toBeNull();
  });

  it('si no se puede buscar a los terceros, se puede seguir sin nombres', async () => {
    api.migracion.tercerosPorDocumento.mockRejectedValue(new Error('se cayó'));
    await pintar();
    await tocar('apertura-subir-balance');
    await subirBalance(CON_SIGNO);

    expect(q('balance-resumen')).toBeNull();
    const seguir = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Seguir sin nombres')!;
    await act(async () => {
      seguir.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {});

    expect(q('balance-resumen')!.textContent).toContain('4 líneas');
  });

  it('con el archivo que reconoció «Sube tu archivo contable», abre el balance y lo lee solo', async () => {
    vi.mocked(parseSpreadsheetFile).mockResolvedValue({
      rows: balance(CON_SIGNO),
      headers: ENCABEZADOS,
      sheetNames: ['Hoja1'],
    } as never);
    await pintar({ archivoInicial: new File(['x'], 'balance-2025.xlsx') });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    await act(async () => {});

    expect(q('archivo-del-balance')!.textContent).toContain('balance-2025.xlsx');
    expect(q('balance-resumen')).not.toBeNull();
  });
});
