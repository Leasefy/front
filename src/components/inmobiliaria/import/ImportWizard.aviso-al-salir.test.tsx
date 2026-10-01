/**
 * ImportWizard — aviso antes de cerrar la pestaña.
 *
 * T-0125. El asistente de inmuebles geocodifica y prepara en un bucle del
 * navegador (53 minutos con 2.864 direcciones). Cerrar la pestaña a mitad, o
 * con el archivo leído y sin preparar, pierde ese trabajo. Preparado, el lote
 * vive en el servidor (`loteRetomado`) y se retoma: ahí ya no hay que avisar.
 *
 * Los pasos se reemplazan por un doble que mueve el estado del asistente: lo
 * que se prueba es la regla del asistente, no los pasos.
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

vi.mock('./steps/StepChooseMethod', () => ({
  StepChooseMethod: ({
    updateState,
    onOcupado,
  }: {
    updateState: (p: Record<string, unknown>) => void;
    onOcupado?: (o: boolean) => void;
  }) => (
    <div data-testid="cuerpo-del-paso">
      <button data-testid="leer" onClick={() => updateState({ rawRows: [{ a: 1 }] })} />
      <button data-testid="preparar" onClick={() => updateState({ loteRetomado: 'lote-1' })} />
      <button data-testid="en-vuelo" onClick={() => onOcupado?.(true)} />
      <button data-testid="libre" onClick={() => onOcupado?.(false)} />
    </div>
  ),
}));
vi.mock('./steps/StepUploadFile', () => ({ StepUploadFile: () => <div /> }));
vi.mock('./steps/StepColumnMapping', () => ({ StepColumnMapping: () => <div /> }));
vi.mock('./steps/StepAIReview', () => ({ StepAIReview: () => <div /> }));
vi.mock('./steps/StepConfirmImport', () => ({ StepConfirmImport: () => <div /> }));
vi.mock('./steps/StepSoftwareMigration', () => ({ StepSoftwareMigration: () => <div /> }));
vi.mock('./steps/StepPortalImport', () => ({ StepPortalImport: () => <div /> }));
vi.mock('./steps/StepPasteLinks', () => ({ StepPasteLinks: () => <div /> }));

import { ImportWizard } from './ImportWizard';

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar(onOcupado = vi.fn()) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<ImportWizard onOcupado={onOcupado} />);
  });
  await act(async () => {});
  return onOcupado;
}

async function clic(testid: string) {
  const el = container.querySelector(`[data-testid="${testid}"]`);
  if (!el) throw new Error(`no está ${testid}`);
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function intentarSalir(): boolean {
  const evento = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(evento);
  return evento.defaultPrevented;
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

describe('<ImportWizard> — aviso al salir', () => {
  it('recién abierto, cerrar no pregunta', async () => {
    await pintar();
    expect(intentarSalir()).toBe(false);
  });

  it('🔴 con el archivo leído y sin preparar, cerrar pregunta', async () => {
    await pintar();
    await clic('leer');
    expect(intentarSalir()).toBe(true);
  });

  it('con el lote ya preparado en el servidor, cerrar no pregunta: se retoma', async () => {
    await pintar();
    await clic('leer');
    await clic('preparar');
    expect(intentarSalir()).toBe(false);
  });

  it('🔴 con un paso trabajando (geocodificar, preparar, activar), cerrar pregunta aunque el lote exista', async () => {
    await pintar();
    await clic('leer');
    await clic('preparar');
    await clic('en-vuelo');
    expect(intentarSalir()).toBe(true);

    await clic('libre');
    expect(intentarSalir()).toBe(false);
  });

  it('sigue avisándole al muro lo que el paso reporta (el aviso no se lo traga)', async () => {
    const onOcupado = await pintar();
    await clic('en-vuelo');
    expect(onOcupado.mock.calls.some((c) => c[0] === true)).toBe(true);
  });
});
