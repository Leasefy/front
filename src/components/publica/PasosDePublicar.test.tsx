/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { PasosDePublicar, type MomentoDePublicar } from './PasosDePublicar';

let raiz: Root | null = null;
let caja: HTMLDivElement | null = null;
async function montar(momento: MomentoDePublicar) {
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  await act(async () => {
    raiz!.render(<PasosDePublicar momento={momento} />);
  });
}
afterEach(() => {
  act(() => raiz?.unmount());
  caja?.remove();
  document.body.innerHTML = '';
});
const estado = (clave: string) => document.querySelector(`[data-testid="paso-de-publicar-${clave}"]`)?.getAttribute('data-estado');

describe('Los pasos de publicar gratis, como los del asistente', () => {
  it('en el registro corto: la cuenta hecha, «Tus datos» en curso y el inmueble por hacer', async () => {
    await montar('datos');
    expect([estado('cuenta'), estado('datos'), estado('inmueble')]).toEqual(['hecho', 'actual', 'pendiente']);
    expect(document.querySelector('[aria-current="step"]')?.getAttribute('data-testid')).toBe('paso-de-publicar-datos');
  });
  it('al publicar: «Tu inmueble» en curso; publicado: los tres hechos', async () => {
    await montar('inmueble');
    expect(estado('inmueble')).toBe('actual');
    act(() => raiz?.unmount());
    await montar('listo');
    expect([estado('cuenta'), estado('datos'), estado('inmueble')]).toEqual(['hecho', 'hecho', 'hecho']);
    expect(document.body.textContent).toContain('¡Publicado!');
  });
});
