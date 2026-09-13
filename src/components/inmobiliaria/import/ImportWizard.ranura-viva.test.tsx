/**
 * ImportWizard — la ranura viva de la tarjeta.
 *
 * 🔴 Tres intentos costó esto, y los tres fallaron por el mismo hecho:
 * **`inert` congela el subárbol entero y no se puede desactivar en un
 * descendiente.** No hay `inert="false"`, y un `createPortal` tampoco escapa,
 * porque `inert` es del DOM y no del árbol de React.
 *
 *  1. El botón de parar, dibujado junto a la barra: nacía muerto — se veía
 *     normal y no respondía (Nico, 2026-09-09).
 *  2. El botón mudado al pie del muro: funcionaba, pero a dos secciones de la
 *     barra que controla, en una espera de 53 minutos («está súper mal
 *     ubicado»).
 *  3. La barra entera sacada a un nodo del muro: funcionaba, pero flotando
 *     fuera de la tarjeta («ahí afuera se ve horrible»).
 *
 * La cuarta —ésta— baja el `inert` al asistente, que es quien conoce su propia
 * tarjeta: congela el cuerpo del paso y deja viva una ranura ADENTRO, encima
 * del pie, donde el paso portaliza su barra.
 *
 * Lo que se congela acá es la única propiedad de la que depende todo: la
 * ranura está dentro de la tarjeta Y fuera del `inert`. Si alguien la mueve
 * adentro del nodo congelado, todo se seguiría viendo igual y el botón
 * volvería a nacer muerto — el fallo 1, otra vez, en silencio.
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

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

// Los pasos no importan acá: lo que se prueba es la tarjeta. El componente va
// inline en cada factory porque `vi.mock` se iza al principio del archivo y
// una variable de arriba todavía no existe cuando corre.
vi.mock('./steps/StepChooseMethod', () => ({
  StepChooseMethod: () => <div data-testid="cuerpo-del-paso" />,
}));
vi.mock('./steps/StepUploadFile', () => ({
  StepUploadFile: () => <div data-testid="cuerpo-del-paso" />,
}));
vi.mock('./steps/StepColumnMapping', () => ({
  StepColumnMapping: () => <div data-testid="cuerpo-del-paso" />,
}));
vi.mock('./steps/StepAIReview', () => ({
  StepAIReview: () => <div data-testid="cuerpo-del-paso" />,
}));
vi.mock('./steps/StepConfirmImport', () => ({
  StepConfirmImport: () => <div data-testid="cuerpo-del-paso" />,
}));
vi.mock('./steps/StepSoftwareMigration', () => ({
  StepSoftwareMigration: () => <div data-testid="cuerpo-del-paso" />,
}));
vi.mock('./steps/StepPortalImport', () => ({
  StepPortalImport: () => <div data-testid="cuerpo-del-paso" />,
}));
vi.mock('./steps/StepPasteLinks', () => ({
  StepPasteLinks: () => <div data-testid="cuerpo-del-paso" />,
}));

import { ImportWizard } from './ImportWizard';

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar(congelado: boolean) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<ImportWizard congelado={congelado} onOcupado={vi.fn()} />);
  });
  await act(async () => {});
}

const q = (t: string) => container.querySelector(`[data-testid="${t}"]`);

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

describe('<ImportWizard> — la ranura viva', () => {
  it('sin operación en vuelo, nada está congelado', async () => {
    await pintar(false);
    expect(q('paso-congelado')?.hasAttribute('inert')).toBe(false);
    expect(q('ranura-viva')).not.toBeNull();
  });

  it('con operación en vuelo, el CUERPO del paso queda inerte', async () => {
    await pintar(true);
    expect(q('paso-congelado')?.hasAttribute('inert')).toBe(true);
  });

  it('🔴 la ranura viva NO cuelga del nodo congelado, y sigue DENTRO de la tarjeta', async () => {
    await pintar(true);

    const congelado = q('paso-congelado')!;
    const ranura = q('ranura-viva')!;

    // Fuera del `inert`: si estuviera adentro, el botón nacería muerto.
    expect(congelado.contains(ranura)).toBe(false);
    // Y sin un solo `inert` en su camino hacia arriba.
    let nodo: HTMLElement | null = ranura as HTMLElement;
    while (nodo && nodo !== container) {
      expect(nodo.hasAttribute('inert')).toBe(false);
      nodo = nodo.parentElement;
    }

    // Y DENTRO de la tarjeta: comparte el contenedor con el cuerpo del paso.
    // Sacarla afuera fue el intento 3, y se veía flotando sobre la página.
    expect(ranura.parentElement).toBe(congelado.parentElement);
  });

  it('la ranura va ENCIMA del pie, no debajo: es donde vivía la barra', async () => {
    await pintar(true);
    const tarjeta = q('ranura-viva')!.parentElement!.parentElement!;
    const pie = tarjeta.querySelector('.rounded-b-lg');
    expect(pie).not.toBeNull();
    // `compareDocumentPosition` mirando el ORDEN del documento: la ranura
    // aparece antes que el pie.
    expect(
      q('ranura-viva')!.compareDocumentPosition(pie!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
