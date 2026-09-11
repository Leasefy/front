/**
 * ImportWizard.titulos.test.tsx — «Siguiente» con inmuebles sin título.
 *
 * El título es obligatorio y es lo primero que se ve en el marketplace: sin
 * él cada fila entra PENDIENTE. Antes, «Siguiente» se los llevaba así sin
 * decir nada (Nico, 2026-09-11: «debemos dejar claro que debería aceptar la
 * sugerencia de los títulos»). Ahora pregunta, y ponérselos es la opción
 * principal.
 */

import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('framer-motion', () => ({
  motion: { div: (p: Record<string, unknown>) => <div>{p.children as React.ReactNode}</div> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));

const { ESTADO } = vi.hoisted(() => {
  const inmueble = (i: number, propertyTitle?: string) => ({
    _rowIndex: i,
    propertyAddress: `CRA 51 #96 SUR 5${i}`,
    propertyCity: 'Sabaneta',
    propertyZone: 'UNIDAD SIERRA MORENA',
    propertyType: 'apartment',
    monthlyRent: 1_900_000,
    propertyTitle,
    suggestions: [],
    selected: true,
    hasErrors: false,
    errorMessages: [],
  });
  const mapeo = (sourceColumn: string, targetField: string) => ({ sourceColumn, targetField, confidence: 1, isManual: false });
  return {
    ESTADO: {
      sinTitulos: {
        method: 'excel',
        fileName: 'inmuebles.csv',
        rawRows: [{ _rowIndex: 1, Dirección: 'x' }],
        headers: ['Dirección', 'Ciudad', 'Clase', 'Canon'],
        columnMappings: [mapeo('Dirección', 'propertyAddress'), mapeo('Ciudad', 'propertyCity'), mapeo('Clase', 'propertyType'), mapeo('Canon', 'monthlyRent')],
        aiAnalyzed: true,
        properties: [inmueble(0), inmueble(1)],
      },
      conTitulos: {
        method: 'excel',
        fileName: 'inmuebles.csv',
        rawRows: [{ _rowIndex: 1, Dirección: 'x' }],
        headers: ['Dirección', 'Ciudad', 'Clase', 'Canon'],
        columnMappings: [mapeo('Dirección', 'propertyAddress'), mapeo('Ciudad', 'propertyCity'), mapeo('Clase', 'propertyType'), mapeo('Canon', 'monthlyRent')],
        aiAnalyzed: true,
        properties: [inmueble(0, 'Casa en Sabaneta')],
      },
    },
  };
});

// El primer paso carga el estado entero al montarse: es la forma de llegar a
// la revisión sin subir un archivo de verdad. El resto de pasos no importa.
let estadoInicial: keyof typeof ESTADO = 'sinTitulos';
vi.mock('./steps/StepChooseMethod', async () => {
  const R = await import('react');
  return {
    StepChooseMethod: ({ updateState }: { updateState: (p: unknown) => void }) => {
      R.useEffect(() => {
        updateState(ESTADO[estadoInicial]);
      }, [updateState]);
      return <div data-testid="paso-1" />;
    },
  };
});
vi.mock('./steps/StepUploadFile', () => ({ StepUploadFile: () => <div data-testid="paso-2" /> }));
vi.mock('./steps/StepColumnMapping', () => ({ StepColumnMapping: () => <div data-testid="paso-3" /> }));
vi.mock('./steps/StepAIReview', () => ({ StepAIReview: () => <div data-testid="paso-4" /> }));
vi.mock('./steps/StepConfirmImport', () => ({
  StepConfirmImport: ({ state }: { state: { properties: Array<{ propertyTitle?: string }> } }) => (
    <div data-testid="paso-5">{state.properties.map((p) => p.propertyTitle ?? '∅').join('|')}</div>
  ),
}));
vi.mock('./steps/StepSoftwareMigration', () => ({ StepSoftwareMigration: () => <div /> }));
vi.mock('./steps/StepPortalImport', () => ({ StepPortalImport: () => <div /> }));
vi.mock('./steps/StepPasteLinks', () => ({ StepPasteLinks: () => <div /> }));

import { ImportWizard } from './ImportWizard';

let container: HTMLDivElement;
let root: Root | null = null;

const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

async function pintar(estado: keyof typeof ESTADO) {
  estadoInicial = estado;
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<ImportWizard congelado={false} onOcupado={vi.fn()} />);
  });
  await act(async () => {});
}

async function siguiente() {
  await act(async () => {
    q('wizard-siguiente')!.click();
  });
}

async function irALaRevision() {
  await siguiente(); // 1 → 2
  await siguiente(); // 2 → 3
  await siguiente(); // 3 → 4
  expect(q('paso-4')).not.toBeNull();
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

describe('<ImportWizard> — salir de la revisión con inmuebles sin título', () => {
  it('«Siguiente» pregunta en vez de seguir, y dice cuántos', async () => {
    await pintar('sinTitulos');
    await irALaRevision();

    await siguiente();

    expect(q('paso-5')).toBeNull();
    expect(q('dialogo-titulos')).not.toBeNull();
    expect(q('dialogo-titulos')!.textContent).toContain('2 inmuebles sin título');
    expect(q('dialogo-titulos')!.textContent).toContain('marketplace');
  });

  it('«Ponerles título y seguir» los titula con clase + barrio + municipio y avanza', async () => {
    await pintar('sinTitulos');
    await irALaRevision();
    await siguiente();

    await act(async () => {
      q('poner-titulos-y-seguir')!.click();
    });

    expect(q('paso-5')).not.toBeNull();
    expect(q('paso-5')!.textContent).toBe(
      'Apartamento en Unidad Sierra Morena, Sabaneta|Apartamento en Unidad Sierra Morena, Sabaneta',
    );
  });

  it('«Seguir sin título» respeta la decisión: avanza sin tocar nada', async () => {
    await pintar('sinTitulos');
    await irALaRevision();
    await siguiente();

    await act(async () => {
      q('seguir-sin-titulo')!.click();
    });

    expect(q('paso-5')).not.toBeNull();
    expect(q('paso-5')!.textContent).toBe('∅|∅');
  });

  it('con todas tituladas no pregunta nada', async () => {
    await pintar('conTitulos');
    await irALaRevision();

    await siguiente();

    expect(q('dialogo-titulos')).toBeNull();
    expect(q('paso-5')!.textContent).toBe('Casa en Sabaneta');
  });
});
