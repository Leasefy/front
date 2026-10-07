/**
 * QA-MIGRACION-95 (MP-06, 06-10-2026): cuando la detección de hoja o de fila de
 * encabezado se equivoca, la persona la corrige sin tocar el archivo.
 *
 * Visto en el navegador (agencia B):
 *  - un libro con las hojas «Inquilinos» y «Propietarios» subido en
 *    Propietarios se leía desde «Inquilinos», sin decirlo ni ofrecer la otra
 *    (b-MP06a-1.png);
 *  - un listado con un título arriba y sólo «Nombre, Cédula» se quedaba en la
 *    fila 1: «Listado de propietarios…» → Nombre, y el encabezado entraba como
 *    una fila de datos (b-MP06b-1.png).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, parseMock, primerasMock } = vi.hoisted(() => ({
  api: {
    plantilla: vi.fn(),
    lotesAbiertos: vi.fn(),
  },
  parseMock: vi.fn(),
  primerasMock: vi.fn(),
}));

vi.mock('./TercerosYaCargados', async () => {
  const { useEffect } = await import('react');
  return {
    TercerosYaCargados: ({ onEstado }: { onEstado: (e: unknown) => void }) => {
      useEffect(() => onEstado({ cargando: false, fallo: false, total: 0 }), [onEstado]);
      return null;
    },
  };
});

vi.mock('@/lib/api/migracion-terceros.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/migracion-terceros.service')>(
    '@/lib/api/migracion-terceros.service',
  );
  return { ...actual, migracionTercerosApi: api };
});

vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  parseSpreadsheetFile: parseMock,
  leerPrimerasFilasDeCadaHoja: primerasMock,
}));

/* El Select de Radix no se abre en happy-dom: un <select> nativo con el mismo contrato. */
vi.mock('@/components/ui/select', async () => {
  const React = await import('react');
  type Ctx = { value?: string; onValueChange?: (v: string) => void; trigger: Record<string, unknown> };
  const Contexto = React.createContext<Ctx>({ trigger: {} });
  return {
    Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children?: React.ReactNode }) => {
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
  };
});

import { MigrarTerceros } from './MigrarTerceros';

const PLANTILLA = {
  tipo: 'PROPIETARIO' as const,
  columnas: [
    { campo: 'nombre', titulo: 'Nombre completo', obligatoria: true, ejemplo: 'Ana', alias: ['nombre'] },
    { campo: 'tipoDocumento', titulo: 'Tipo de documento', obligatoria: true, ejemplo: 'CC', alias: [] },
    { campo: 'documento', titulo: 'Número de documento', obligatoria: true, ejemplo: '1', alias: ['cedula'] },
    { campo: 'correo', titulo: 'Correo', obligatoria: false, ejemplo: 'a@x.co', alias: [] },
  ],
};

const ENCABEZADOS = ['Nombre completo', 'Tipo de documento', 'Número de documento', 'Correo'];

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<MigrarTerceros tipoFijo="PROPIETARIO" />);
  });
  await act(async () => {});
}

async function subir(nombre: string) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const archivo = new File(['x'], nombre);
  Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await act(async () => {});
  return archivo;
}

async function elegir(testid: string, valor: string) {
  const select = container.querySelector<HTMLSelectElement>(`select[data-testid="${testid}"]`);
  if (!select) throw new Error(`No hay [data-testid="${testid}"]`);
  await act(async () => {
    select.value = valor;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await act(async () => {});
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => {
  api.plantilla.mockResolvedValue(PLANTILLA);
  api.lotesAbiertos.mockResolvedValue([]);
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container?.remove();
  vi.clearAllMocks();
});

describe('MP-06: elegir la hoja y la fila de los encabezados (terceros)', () => {
  it('un libro con dos hojas iguales: dice cuál leyó y deja leer la otra', async () => {
    primerasMock.mockResolvedValue([
      { hoja: 'Inquilinos', filas: [ENCABEZADOS, ['Inquilina Uno', 'CC', '52119101', 'i1@x.co']] },
      { hoja: 'Propietarios', filas: [ENCABEZADOS, ['Propietaria Tres', 'CC', '52119111', 'p3@x.co']] },
    ]);
    parseMock.mockImplementation(async (_f: File, hoja?: string) =>
      hoja === 'Propietarios'
        ? { rows: [{ 'Nombre completo': 'Propietaria Tres', _rowIndex: 1 }], headers: ENCABEZADOS }
        : { rows: [{ 'Nombre completo': 'Inquilina Uno', _rowIndex: 1 }], headers: ENCABEZADOS },
    );
    await pintar();
    const archivo = await subir('libro.xlsx');

    const hoja = container.querySelector<HTMLSelectElement>('select[data-testid="elegir-hoja"]');
    expect(hoja).not.toBeNull();
    expect(hoja?.value).toBe('Inquilinos');
    expect(q('donde-esta-la-tabla')?.textContent).toContain('El libro trae 2 hojas');

    await elegir('elegir-hoja', 'Propietarios');
    expect(parseMock).toHaveBeenLastCalledWith(archivo, 'Propietarios', { filaDeEncabezado: 0 });
    expect(container.querySelector<HTMLSelectElement>('select[data-testid="elegir-hoja"]')?.value).toBe(
      'Propietarios',
    );
  });

  it('un título arriba que la detección no salta: se elige la fila de los encabezados', async () => {
    primerasMock.mockResolvedValue([
      {
        hoja: 'Hoja1',
        filas: [
          ['Listado de propietarios', 'Corte 06-10-2026'],
          ['Nombre', 'Cédula'],
          ['Propietaria Cinco', '52119121'],
        ],
      },
    ]);
    parseMock.mockImplementation(async (_f: File, _hoja?: string, op?: { filaDeEncabezado?: number }) =>
      op?.filaDeEncabezado === 1
        ? { rows: [{ Nombre: 'Propietaria Cinco', 'Cédula': '52119121', _rowIndex: 2 }], headers: ['Nombre', 'Cédula'] }
        : {
            rows: [
              { 'Listado de propietarios': 'Nombre', 'Corte 06-10-2026': 'Cédula', _rowIndex: 1 },
              { 'Listado de propietarios': 'Propietaria Cinco', 'Corte 06-10-2026': '52119121', _rowIndex: 2 },
            ],
            headers: ['Listado de propietarios', 'Corte 06-10-2026'],
          },
    );
    await pintar();
    const archivo = await subir('listado.xlsx');

    expect(q('elegir-hoja')).toBeNull();
    const fila = container.querySelector<HTMLSelectElement>('select[data-testid="elegir-fila-de-encabezado"]');
    expect(fila).not.toBeNull();
    expect(fila?.value).toBe('0');
    expect(fila?.textContent).toContain('fila 2 · Nombre, Cédula');

    await elegir('elegir-fila-de-encabezado', '1');
    expect(parseMock).toHaveBeenLastCalledWith(archivo, undefined, { filaDeEncabezado: 1 });
    expect(q('mapeo-Nombre')).not.toBeNull();
    expect(q('mapeo-Listado de propietarios')).toBeNull();
  });
});
