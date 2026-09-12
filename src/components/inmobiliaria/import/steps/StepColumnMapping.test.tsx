/**
 * StepColumnMapping.test.tsx — una columna que trae dos datos en la celda.
 *
 * El caso real (Nico, 2026-09-11): «Propiedad» = «3 - CR 50 127 SUR 61 OF
 * 502». Mapearla a «Dirección» a secas perdía el código. Ahora se detecta,
 * se parte, y la persona dice qué es cada parte — o vuelve a un solo dato.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { ImportWizardState } from '../lib/importTypes';
import { autoMapColumns } from '../lib/columnMapping';
import { StepColumnMapping } from './StepColumnMapping';

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, params?: Record<string, unknown>) => (params ? `${k}::${JSON.stringify(params)}` : k),
    locale: 'es',
  }),
}));

const FILAS = [
  { _rowIndex: 1, Consecutivo: '1', Propiedad: '3 - CR 50 127 SUR 61 OF 502', 'Estrato Propiedad': 'Tres', Inquilino: '[1] 71211270 - FRAN', 'Fecha Inicio': '2022-04-01', 'Día de pago': '2022-05-01' },
  { _rowIndex: 2, Consecutivo: '2', Propiedad: '1 - CR 50 100 B SUR 810', 'Estrato Propiedad': 'Cinco', Inquilino: '[1] 1036599828 - CRIS', 'Fecha Inicio': '2022-02-01', 'Día de pago': '2022-03-01' },
  { _rowIndex: 3, Consecutivo: '3', Propiedad: '2 - CL 129 SUR 56 53 LC 01', 'Estrato Propiedad': 'Dos', Inquilino: '[1] 8 - X', 'Fecha Inicio': '2022-04-01', 'Día de pago': '2022-05-01' },
];
const HEADERS = ['Consecutivo', 'Propiedad', 'Estrato Propiedad', 'Inquilino', 'Fecha Inicio', 'Día de pago'];

function estado(over: Partial<ImportWizardState> = {}): ImportWizardState {
  return {
    rawRows: FILAS,
    headers: HEADERS,
    columnMappings: autoMapColumns(HEADERS, FILAS),
    ...over,
  } as unknown as ImportWizardState;
}

let root: Root | null = null;
let container: HTMLDivElement;

function render(state: ImportWizardState, updateState = vi.fn()) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<StepColumnMapping state={state} updateState={updateState} />);
  });
  return updateState;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
});

describe('<StepColumnMapping> — dos datos en una celda', () => {
  it('la columna «Propiedad» llega partida desde la lectura: código + dirección, con sus muestras', () => {
    render(estado());

    const bloque = container.querySelector('[data-testid="partes-Propiedad"]');
    expect(bloque).not.toBeNull();
    expect(bloque!.textContent).toContain('Dos datos en una celda');
    expect(bloque!.textContent).toContain('«3»');
    expect(bloque!.textContent).toContain('CR 50 127');
    // Sin selector propio: la columna partida no tiene un solo campo.
    expect(container.querySelector('[data-testid="dividir-Propiedad"]')).toBeNull();
  });

  it('«Es un solo dato» vuelve la columna a Dirección, entera', () => {
    const updateState = render(estado());

    act(() => {
      (container.querySelector('[data-testid="unir-Propiedad"]') as HTMLButtonElement).click();
    });

    const [{ columnMappings }] = updateState.mock.calls.at(-1)!;
    const propiedad = columnMappings.find((m: { sourceColumn: string }) => m.sourceColumn === 'Propiedad');
    expect(propiedad.partes).toBeUndefined();
    expect(propiedad.targetField).toBe('propertyAddress');
  });

  it('una columna sin campo cuyas celdas traen dos datos ofrece separarlas, y al hacerlo propone qué es cada parte', () => {
    // Sin el encabezado que ayude: «Inquilino» no tiene campo acá, pero sus
    // celdas son «[1] documento - nombre». Se ofrece, no se impone.
    const updateState = render(estado());
    const enlace = container.querySelector('[data-testid="dividir-Inquilino"]') as HTMLButtonElement | null;
    expect(enlace).not.toBeNull();
    expect(enlace!.textContent).toContain('Trae dos datos');

    act(() => enlace!.click());

    const [{ columnMappings }] = updateState.mock.calls.at(-1)!;
    const inquilino = columnMappings.find((m: { sourceColumn: string }) => m.sourceColumn === 'Inquilino');
    expect(inquilino.partes).toBeDefined();
    expect(inquilino.targetField).toBeNull();
  });

  it('una columna de valores simples no ofrece nada', () => {
    render(estado());
    expect(container.querySelector('[data-testid="dividir-Estrato Propiedad"]')).toBeNull();
    expect(container.querySelector('[data-testid="partes-Estrato Propiedad"]')).toBeNull();
  });

  it('con «Inquilino», «Fecha Inicio», «Día de pago» dice que esto parece el archivo de contratos', () => {
    render(estado());
    const aviso = container.querySelector('[data-testid="parece-archivo-de-contratos"]');
    expect(aviso).not.toBeNull();
    expect(aviso!.textContent).toContain('Contratos');
    expect(aviso!.textContent).toContain('«Inquilino»');
  });

  it('el archivo de inmuebles no recibe ese aviso', () => {
    const headers = ['Código', 'Clase', 'Dirección', 'Valor Arriendo'];
    const filas = [{ _rowIndex: 1, Código: '2945', Clase: 'Apartamento', Dirección: 'CR 50 127 SUR 61', 'Valor Arriendo': '1000000' }];
    render(estado({ headers, rawRows: filas, columnMappings: autoMapColumns(headers, filas) } as Partial<ImportWizardState>));
    expect(container.querySelector('[data-testid="parece-archivo-de-contratos"]')).toBeNull();
    expect(container.querySelector('[data-testid="partes-Dirección"]')).toBeNull();
  });
});
