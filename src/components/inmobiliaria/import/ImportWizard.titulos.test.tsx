/**
 * ImportWizard.titulos.test.tsx — los inmuebles salen del mapeo con título.
 *
 * El título es obligatorio y es lo primero que se ve en el marketplace: sin
 * él cada fila entra PENDIENTE. Antes, «Siguiente» se los llevaba así sin
 * decir nada (Nico, 2026-09-11: «debemos dejar claro que debería aceptar la
 * sugerencia de los títulos»), y la primera respuesta fue un diálogo al salir
 * de la revisión con «Ponerles título y seguir» como opción principal.
 *
 * T-0131 (a2b267c6) cambió eso a propósito: la «Revisión con IA» y su diálogo
 * se eliminaron y los títulos se ponen SOLOS al salir del mapeo
 * (`prepararFilas` → `ponerTitulosATodas`): clase + barrio + municipio, sin
 * preguntar. Se pueden cambiar después, en bloque o en cada inmueble. Lo que
 * estas pruebas cuidan ahora: que lleguen titulados, que «Siguiente» no
 * pregunte, y que sólo se toque el título y sólo donde falta.
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

/*
 * El archivo tal como llega del paso de subir: filas crudas y su mapeo. Los
 * inmuebles NO se dan hechos: los arma el asistente al salir del mapeo, que es
 * justo lo que se prueba.
 */
const { ESTADO } = vi.hoisted(() => {
  const fila = (i: number, extra: Record<string, unknown> = {}) => ({
    _rowIndex: i,
    Dirección: `CRA 51 #96 SUR 5${i}`,
    Ciudad: 'Sabaneta',
    Barrio: 'UNIDAD SIERRA MORENA',
    Clase: 'Apartamento',
    Canon: '1900000',
    ...extra,
  });
  const mapeo = (sourceColumn: string, targetField: string) => ({ sourceColumn, targetField, confidence: 1, isManual: false });
  const mapeos = [
    mapeo('Dirección', 'propertyAddress'),
    mapeo('Ciudad', 'propertyCity'),
    mapeo('Barrio', 'propertyZone'),
    mapeo('Clase', 'propertyType'),
    mapeo('Canon', 'monthlyRent'),
  ];
  const base = {
    method: 'excel',
    fileName: 'inmuebles.csv',
    headers: ['Dirección', 'Ciudad', 'Barrio', 'Clase', 'Canon'],
    columnMappings: mapeos,
  };
  return {
    ESTADO: {
      sinTitulos: { ...base, rawRows: [fila(0), fila(1)] },
      // Una trae título en el archivo; la otra no trae título NI canon.
      mixto: {
        ...base,
        headers: [...base.headers, 'Título'],
        columnMappings: [...mapeos, mapeo('Título', 'propertyTitle')],
        rawRows: [fila(0, { Título: 'Casa en Sabaneta' }), fila(1, { Título: '', Canon: '' })],
      },
      conTitulos: {
        ...base,
        headers: [...base.headers, 'Título'],
        columnMappings: [...mapeos, mapeo('Título', 'propertyTitle')],
        rawRows: [fila(0, { Título: 'Casa en Sabaneta' })],
      },
    },
  };
});

// El primer paso carga el estado entero al montarse: es la forma de llegar al
// mapeo sin subir un archivo de verdad. El resto de pasos no importa.
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
vi.mock('./steps/StepConfirmImport', () => ({
  StepConfirmImport: ({
    state,
  }: {
    state: { properties: Array<{ propertyTitle?: string; monthlyRent?: number }> };
  }) => (
    <div data-testid="paso-5">
      <span data-testid="titulos">{state.properties.map((p) => p.propertyTitle ?? '∅').join('|')}</span>
      <span data-testid="canones">{state.properties.map((p) => p.monthlyRent ?? '∅').join('|')}</span>
    </div>
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

async function irAlMapeo() {
  await siguiente(); // 1 → 2
  await siguiente(); // 2 → 3
  expect(q('paso-3')).not.toBeNull();
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

describe('<ImportWizard> — salir del mapeo con inmuebles sin título', () => {
  // Antes: «"Siguiente" pregunta en vez de seguir, y dice cuántos». T-0131 quitó
  // el diálogo: los títulos se ponen solos, así que ya no hay nada que preguntar.
  it('«Siguiente» al salir del mapeo no pregunta: sigue derecho y ya van titulados', async () => {
    await pintar('sinTitulos');
    await irAlMapeo();

    await siguiente();

    expect(q('dialogo-titulos')).toBeNull();
    expect(document.querySelector('[role="alertdialog"], [role="dialog"]')).toBeNull();
    expect(q('paso-5')).not.toBeNull();
    const titulos = q('titulos')!.textContent!.split('|');
    expect(titulos.filter((t) => t.trim() && t !== '∅')).toHaveLength(2);
  });

  // Antes: el botón «Ponerles título y seguir» del diálogo. Hoy lo hace «Siguiente» solo.
  it('los titula solos con clase + barrio + municipio y avanza', async () => {
    await pintar('sinTitulos');
    await irAlMapeo();
    await siguiente();

    expect(q('paso-5')).not.toBeNull();
    expect(q('titulos')!.textContent).toBe(
      'Apartamento en Unidad Sierra Morena, Sabaneta|Apartamento en Unidad Sierra Morena, Sabaneta',
    );
  });

  /*
   * Antes: «"Seguir sin título" respeta la decisión: avanza sin tocar nada». Esa
   * opción ya no existe (T-0131). Lo que la reemplaza como respeto a lo que la
   * persona no decidió: se pone SÓLO el título y SÓLO donde falta — el que trae
   * el archivo no se pisa y un canon vacío sigue vacío (entra por confirmar,
   * T-0129; nunca inventado).
   */
  it('sólo pone el título y sólo donde falta: respeta el del archivo y no inventa el canon', async () => {
    await pintar('mixto');
    await irAlMapeo();
    await siguiente();

    expect(q('paso-5')).not.toBeNull();
    expect(q('titulos')!.textContent).toBe(
      'Casa en Sabaneta|Apartamento en Unidad Sierra Morena, Sabaneta',
    );
    expect(q('canones')!.textContent).toBe('1900000|∅');
  });

  it('con todas tituladas no pregunta nada', async () => {
    await pintar('conTitulos');
    await irAlMapeo();

    await siguiente();

    expect(q('dialogo-titulos')).toBeNull();
    expect(document.querySelector('[role="alertdialog"], [role="dialog"]')).toBeNull();
    expect(q('titulos')!.textContent).toBe('Casa en Sabaneta');
  });
});
