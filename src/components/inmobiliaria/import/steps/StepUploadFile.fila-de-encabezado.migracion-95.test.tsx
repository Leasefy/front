/**
 * QA-MIGRACION-95 (MP-06, 06-10-2026): el importador de inmuebles ya deja
 * elegir la hoja, pero la fila de los encabezados sólo se adivinaba. Un
 * listado con un título arriba y pocas columnas reconocibles se quedaba en la
 * fila 1 (el título como encabezado) sin forma de corregirlo.
 */

import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, useState } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { parseMock, primerasMock } = vi.hoisted(() => ({ parseMock: vi.fn(), primerasMock: vi.fn() }));

vi.mock('../lib/parseFile', () => ({
  parseSpreadsheetFile: parseMock,
  leerPrimerasFilasDeCadaHoja: primerasMock,
  downloadTemplate: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));

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

import { StepUploadFile } from './StepUploadFile';
import type { ImportWizardState } from '../lib/importTypes';

const ESTADO: ImportWizardState = {
  method: 'excel' as ImportWizardState['method'],
  file: null,
  fileName: '',
  enlacesPegados: '',
  rawRows: [],
  headers: [],
  sheetNames: [],
  selectedSheet: '',
  columnMappings: [],
  properties: [],
  aiAnalyzed: false,
  importProgress: 0,
  importedCount: 0,
  loteRetomado: null,
  subidaRetomada: null,
};

function Paso() {
  const [estado, setEstado] = useState(ESTADO);
  return <StepUploadFile state={estado} updateState={(p) => setEstado((e) => ({ ...e, ...p }))} />;
}

let container: HTMLDivElement;
let root: Root | null = null;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container?.remove();
  vi.clearAllMocks();
});

describe('MP-06: la fila de los encabezados en inmuebles', () => {
  it('con un título arriba que la detección no salta, se elige la fila y se vuelve a leer', async () => {
    primerasMock.mockResolvedValue([
      {
        hoja: 'Hoja1',
        filas: [
          ['Inventario QA', 'Octubre'],
          ['Dirección', 'Propietario'],
          ['CR 43A 1 50', 'Ana Gómez'],
        ],
      },
    ]);
    parseMock.mockImplementation(async (_f: File, _hoja?: string, op?: { filaDeEncabezado?: number }) =>
      op?.filaDeEncabezado === 1
        ? { rows: [{ Dirección: 'CR 43A 1 50', Propietario: 'Ana Gómez', _rowIndex: 2 }], headers: ['Dirección', 'Propietario'], sheetNames: ['Hoja1'] }
        : {
            rows: [
              { 'Inventario QA': 'Dirección', Octubre: 'Propietario', _rowIndex: 1 },
              { 'Inventario QA': 'CR 43A 1 50', Octubre: 'Ana Gómez', _rowIndex: 2 },
            ],
            headers: ['Inventario QA', 'Octubre'],
            sheetNames: ['Hoja1'],
          },
    );
    container = document.createElement('div');
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<Paso />);
    });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const archivo = new File(['x'], 'inventario.xlsx');
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {});
    await act(async () => {});

    const fila = container.querySelector<HTMLSelectElement>('select[data-testid="elegir-fila-de-encabezado"]');
    expect(fila).not.toBeNull();
    expect(fila?.value).toBe('0');
    await act(async () => {
      fila!.value = '1';
      fila!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {});
    await act(async () => {});
    expect(parseMock).toHaveBeenLastCalledWith(archivo, 'Hoja1', { filaDeEncabezado: 1 });
    expect(container.textContent).toContain('CR 43A 1 50');
    expect(container.querySelector<HTMLSelectElement>('select[data-testid="elegir-fila-de-encabezado"]')?.value).toBe('1');
  });
});
