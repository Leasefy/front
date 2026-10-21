import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;

import { SelectorDeCaracteristicas } from './SelectorDeCaracteristicas';
import { CARACTERISTICAS, CARACTERISTICAS_MAXIMAS } from '@/lib/inmuebles/caracteristicas';

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

function pintar(value: string[], onChange = vi.fn()) {
  act(() => {
    raiz.render(<SelectorDeCaracteristicas value={value} onChange={onChange} testId="selector" />);
  });
  return onChange;
}

const $ = (sel: string) => contenedor.querySelector<HTMLElement>(sel);
const casilla = (id: string) => $(`[data-testid="amenidad-${id}"] [role="checkbox"]`)!;

describe('SelectorDeCaracteristicas', () => {
  it('pinta las de la lista en sus tres grupos, cada una con la casilla de la casa', () => {
    pintar([]);
    expect($('[data-testid="caracteristicas-inmueble"] legend')!.textContent).toBe('Del inmueble');
    expect($('[data-testid="caracteristicas-conjunto"] legend')!.textContent).toBe('Del edificio o conjunto');
    expect($('[data-testid="caracteristicas-sector"] legend')!.textContent).toBe('Del sector');
    expect(contenedor.querySelectorAll('[data-testid^="amenidad-"]')).toHaveLength(CARACTERISTICAS.length);
    expect(casilla('jacuzzi')).not.toBeNull();
    expect($('[data-testid="cuantas-caracteristicas"]')!.textContent).toBe('Ninguna marcada todavía.');
  });

  it('marcar suma y desmarcar quita, sin tocar las demás', () => {
    let onChange = pintar(['pool']);
    expect($('[data-testid="amenidad-pool"]')!.getAttribute('data-activa')).toBe('si');
    act(() => casilla('gym').click());
    expect(onChange).toHaveBeenLastCalledWith(['pool', 'gym']);
    onChange = pintar(['pool', 'gym']);
    act(() => casilla('pool').click());
    expect(onChange).toHaveBeenLastCalledWith(['gym']);
    expect($('[data-testid="cuantas-caracteristicas"]')!.textContent).toBe('2 marcadas.');
  });

  it('🔴 una guardada que ya no está en la lista se ve aparte y se puede quitar (el back no deja guardar con ella)', () => {
    const onChange = pintar(['pool', 'Jacuzzi privado']);
    const aparte = $('[data-testid="caracteristicas-desconocidas"]')!;
    expect(aparte.textContent).toContain('Jacuzzi privado');
    expect(aparte.textContent).toContain('Quítalas para poder guardar');
    act(() => aparte.querySelector<HTMLElement>('[role="checkbox"]')!.click());
    expect(onChange).toHaveBeenLastCalledWith(['pool']);
  });

  it(`con ${CARACTERISTICAS_MAXIMAS} marcadas las demás se apagan y lo dice`, () => {
    const llenas = CARACTERISTICAS.slice(0, CARACTERISTICAS_MAXIMAS).map((c) => c.id);
    const libre = CARACTERISTICAS[CARACTERISTICAS_MAXIMAS].id;
    const onChange = pintar(llenas);
    expect(casilla(libre).hasAttribute('disabled')).toBe(true);
    expect($('[data-testid="cuantas-caracteristicas"]')!.textContent).toContain('es el máximo');
    // Quitar una sí se puede.
    act(() => casilla(llenas[0]).click());
    expect(onChange).toHaveBeenLastCalledWith(llenas.slice(1));
  });

  it('el error del back marca el grupo entero', () => {
    act(() => {
      raiz.render(
        <SelectorDeCaracteristicas
          value={[]}
          onChange={vi.fn()}
          testId="selector"
          ariaDelError={{ 'aria-invalid': true, 'aria-describedby': 'x-error' }}
        />,
      );
    });
    const grupo = $('[data-testid="selector"]')!;
    expect(grupo.getAttribute('role')).toBe('group');
    expect(grupo.getAttribute('aria-invalid')).toBe('true');
    expect(grupo.getAttribute('aria-describedby')).toBe('x-error');
  });
});
