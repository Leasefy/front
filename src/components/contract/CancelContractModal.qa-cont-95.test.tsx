/** QA-CONT-95 (D-11): el diálogo de cancelar dice postulación (no «aplicación») y que el inmueble queda libre. */
import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { CancelContractModal } from './CancelContractModal';

void React;
let root: Root | null = null;
let container: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

function montar(conPostulacion: boolean) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<CancelContractModal open onClose={() => {}} onConfirm={() => {}} conPostulacion={conPostulacion} />);
  });
  return document.body.textContent ?? '';
}

describe('QA-CONT-95 · cancelar un contrato', () => {
  it('🔴 armado a mano: sin «aplicación» y diciendo que el inmueble queda disponible', () => {
    const t = montar(false);
    expect(t).not.toMatch(/aplicación/);
    expect(t).toContain('el inmueble vuelve a quedar disponible');
  });
  it('con postulación: la postulación queda cerrada', () => {
    expect(montar(true)).toContain('la postulación queda cerrada');
  });
});
