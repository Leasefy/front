/**
 * «Ponerles título a todas» — el atajo para quien sube miles de inmuebles.
 *
 * Nico, 2026-09-10: de las 2.895 filas del archivo real, CERO traen título.
 * El caso normal no es corregir un título, es no tener ninguno; nadie va a
 * nombrar 2.864 inmuebles uno por uno.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { ImportProperty, ImportWizardState } from '../lib/importTypes';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}));

import { StepAIReview } from './StepAIReview';

function inmueble(parcial: Partial<ImportProperty> = {}): ImportProperty {
  return {
    _rowIndex: 0,
    propertyAddress: 'CRA 51 #96 SUR 50',
    propertyCity: 'Sabaneta',
    propertyZone: 'UNIDAD SIERRA MORENA',
    propertyType: 'apartment',
    monthlyRent: 1_900_000,
    suggestions: [],
    selected: true,
    hasErrors: false,
    errorMessages: [],
    ...parcial,
  };
}

function estado(properties: ImportProperty[]): ImportWizardState {
  return {
    method: 'excel', file: null, fileName: 'inmuebles.csv', enlacesPegados: '',
    rawRows: [], headers: [], sheetNames: [], selectedSheet: '',
    columnMappings: [], properties, aiAnalyzed: true,
    importProgress: 0, importedCount: 0,
  };
}

let container: HTMLDivElement;
let root: Root;
let updateState: ReturnType<typeof vi.fn>;

beforeEach(() => {
  updateState = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function render(properties: ImportProperty[]) {
  act(() => {
    root.render(
      React.createElement(StepAIReview, {
        state: estado(properties),
        updateState,
      } as never),
    );
  });
}

const boton = () =>
  container.querySelector<HTMLButtonElement>('[data-testid="titulos-a-todas"]');

describe('StepAIReview — ponerles título a todas', () => {
  it('dice por qué: recomendado, obligatorio, marketplace — y cuántas entran pendientes sin él', () => {
    render([inmueble(), inmueble({ _rowIndex: 1 }), inmueble({ _rowIndex: 2, propertyTitle: 'Ya tiene' })]);
    const porQue = container.querySelector('[data-testid="titulos-por-que"]');
    expect(porQue).not.toBeNull();
    expect(porQue!.textContent).toContain('Recomendado');
    expect(porQue!.textContent).toContain('marketplace');
    expect(porQue!.textContent).toContain('esas 2 entran pendientes');
  });

  it('con todas tituladas no hay nada que recomendar', () => {
    render([inmueble({ propertyTitle: 'Apartamento en Sierra Morena, Sabaneta' })]);
    expect(container.querySelector('[data-testid="titulos-por-que"]')).toBeNull();
  });

  it('el botón dice cuántas van a recibir título', () => {
    render([
      inmueble({ _rowIndex: 0 }),
      inmueble({ _rowIndex: 1 }),
      inmueble({ _rowIndex: 2, propertyTitle: 'Ya tiene nombre' }),
    ]);
    expect(boton()?.textContent).toContain('2');
  });

  it('no aparece cuando todas ya tienen título', () => {
    render([inmueble({ propertyTitle: 'Mi apartamento' })]);
    expect(boton()).toBeNull();
  });

  it('escribe «Clase en Barrio, Municipio» y NO pisa el que ya existía', () => {
    render([
      inmueble({ _rowIndex: 0 }),
      inmueble({ _rowIndex: 1, propertyTitle: 'Nombre escrito a mano' }),
    ]);
    act(() => boton()!.click());

    const escritas = (updateState.mock.calls.at(-1)?.[0] as {
      properties: ImportProperty[];
    }).properties;
    expect(escritas[0].propertyTitle).toBe(
      'Apartamento en Unidad Sierra Morena, Sabaneta',
    );
    expect(escritas[1].propertyTitle).toBe('Nombre escrito a mano');
  });

  it('toca SÓLO el título: las demás sugerencias siguen esperando', () => {
    render([
      inmueble({
        suggestions: [
          { field: 'commissionPercent', suggestedValue: '10', confidence: 'alta', reasoning: '', accepted: null },
          { field: 'propertyTitle', suggestedValue: 'X', confidence: 'media', reasoning: '', accepted: null },
        ] as ImportProperty['suggestions'],
      }),
    ]);
    act(() => boton()!.click());

    const p = (updateState.mock.calls.at(-1)?.[0] as {
      properties: ImportProperty[];
    }).properties[0];
    const porCampo = Object.fromEntries(p.suggestions.map((s) => [s.field, s.accepted]));
    expect(porCampo.propertyTitle).toBe(true);
    expect(porCampo.commissionPercent).toBeNull();
  });
});
