/**
 * ImportWizard — aviso antes de cerrar la pestaña.
 *
 * T-0125. Cerrar la pestaña con el archivo leído y sin subir pierde ese
 * trabajo: sólo vive en el navegador. Desde la primera tanda el lote vive en
 * el servidor (`loteRetomado`) y se retoma: ahí el asistente ya no avisa.
 *
 * T-0130 acotó la regla a propósito: subir y ubicar (lo único que todavía corre
 * en el navegador) los avisa `StepConfirmImport` con su propio
 * `useAvisoAlSalir`; crear y revisar son del servidor y reanudables, así que el
 * «ocupado» de un paso ya NO hace preguntar al asistente — sólo se le pasa al
 * muro.
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

  /*
   * Antes: «con un paso trabajando (geocodificar, preparar, activar), cerrar
   * pregunta aunque el lote exista». T-0130 (5409c377) lo cambió a propósito:
   * el paso dice «ocupado» también mientras crea, revisa, descarta o reintenta
   * —todo reanudable en el servidor: «Puedes cerrar esta página: las seguimos
   * creando» (T-0131)—, así que preguntar por eso sería un aviso falso. Lo que
   * sí se pierde a mitad (subir, ubicar) lo avisa `StepConfirmImport` por su
   * cuenta. Lo que el asistente sigue cuidando: el archivo que sólo vive acá.
   */
  it('🔴 el «ocupado» de un paso no decide el aviso: con el archivo sin subir pregunta aunque el paso se suelte, y con el lote en el servidor (crear, revisar) no pregunta', async () => {
    const onOcupado = await pintar();
    await clic('leer');
    await clic('en-vuelo');
    expect(intentarSalir()).toBe(true);
    // El paso se suelta, pero el archivo sigue sin subir: perderlo es perderlo todo.
    await clic('libre');
    expect(intentarSalir()).toBe(true);

    await clic('preparar');
    await clic('en-vuelo');
    expect(intentarSalir()).toBe(false);
    // …y el muro igual se entera de que hay algo corriendo.
    expect(onOcupado).toHaveBeenLastCalledWith(true, undefined);
  });

  it('sigue avisándole al muro lo que el paso reporta (el aviso no se lo traga)', async () => {
    const onOcupado = await pintar();
    await clic('en-vuelo');
    expect(onOcupado.mock.calls.some((c) => c[0] === true)).toBe(true);
  });
});
