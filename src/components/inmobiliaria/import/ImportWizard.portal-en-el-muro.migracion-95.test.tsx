/**
 * QA-MIGRACION-95 (IN-01, 06-10-2026): «Desde portales» termina en una pantalla
 * guiada sin «Siguiente», con un botón al pie. En la ruta suelta ese botón es
 * «Volver al portafolio» y lleva a Inmuebles. Dentro del muro de migración no
 * hay portafolio: el mismo botón sólo reinicia el asistente (`onSalir`), así
 * que el rótulo prometía algo que no pasaba (visto en el navegador, agencia B).
 */

import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('framer-motion', () => ({
  motion: { div: (p: Record<string, unknown>) => <div>{p.children as React.ReactNode}</div> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));

vi.mock('./steps/StepChooseMethod', async () => {
  const R = await import('react');
  return {
    StepChooseMethod: ({ updateState }: { updateState: (p: unknown) => void }) => {
      R.useEffect(() => {
        updateState({ method: 'portal' });
      }, [updateState]);
      return <div data-testid="paso-1" />;
    },
  };
});
vi.mock('./steps/StepUploadFile', () => ({ StepUploadFile: () => <div /> }));
vi.mock('./steps/StepColumnMapping', () => ({ StepColumnMapping: () => <div /> }));
vi.mock('./steps/StepConfirmImport', () => ({ StepConfirmImport: () => <div /> }));
vi.mock('./steps/StepSoftwareMigration', () => ({ StepSoftwareMigration: () => <div /> }));
vi.mock('./steps/StepPortalImport', () => ({ StepPortalImport: () => <div data-testid="paso-portal" /> }));
vi.mock('./steps/StepPasteLinks', () => ({ StepPasteLinks: () => <div /> }));

import { ImportWizard } from './ImportWizard';

let container: HTMLDivElement;
let root: Root | null = null;

const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;
const botones = () => [...container.querySelectorAll('button')].map((b) => b.textContent?.trim() ?? '');

async function pintar(onSalir?: () => void) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<ImportWizard congelado={false} onOcupado={vi.fn()} onSalir={onSalir} />);
  });
  await act(async () => {});
  await act(async () => {
    q('wizard-siguiente')!.click();
  });
  await act(async () => {});
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container?.remove();
  vi.clearAllMocks();
});

describe('IN-01: el pie de «Desde portales» dice lo que hace', () => {
  it('dentro del muro (con onSalir) no promete «Volver al portafolio»: vuelve a elegir el método', async () => {
    const onSalir = vi.fn();
    await pintar(onSalir);
    expect(q('paso-portal')).not.toBeNull();
    expect(botones()).not.toContain('inmobiliaria.import.portal.backToPortfolio');
    const otro = [...container.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'inmobiliaria.import.portal.otroMetodo',
    );
    expect(otro).toBeTruthy();
    await act(async () => {
      otro!.click();
    });
    expect(onSalir).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('en la ruta suelta sigue siendo «Volver al portafolio» y lleva a Inmuebles', async () => {
    await pintar();
    const volver = [...container.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'inmobiliaria.import.portal.backToPortfolio',
    );
    expect(volver).toBeTruthy();
    await act(async () => {
      volver!.click();
    });
    expect(push).toHaveBeenCalledWith('/panel/inmobiliaria/inmuebles');
  });
});
