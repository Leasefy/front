/**
 * PropietarioSelector — elegir y SOLTAR.
 *
 * Una vez elegido un propietario no había forma de quedarse sin ninguno:
 * tocar la tarjeta elegida «no hacía nada» (Nico, 2026-09-01). Tocarla de
 * nuevo la suelta, con el mismo `''` que los formularios ya leen como
 * «sin propietario».
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  motion: {
    button: ({ children, whileHover: _h, whileTap: _t, layout: _l, ...props }: React.ComponentProps<'button'> & Record<string, unknown>) =>
      React.createElement('button', props, children),
    div: ({ children, initial: _i, animate: _a, exit: _e, transition: _tr, layout: _l, ...props }: React.ComponentProps<'div'> & Record<string, unknown>) =>
      React.createElement('div', props, children),
    svg: ({ children, initial: _i, animate: _a, ...props }: React.ComponentProps<'svg'> & Record<string, unknown>) =>
      React.createElement('svg', props, children),
  },
}));
vi.mock('./PropietarioForm', () => ({ PropietarioForm: () => null }));

import { PropietarioSelector } from './PropietarioSelector';
import type { Propietario } from '@/lib/types/inmobiliaria';

const propietarios = [
  { id: 'p1', name: 'Yolanda Cardona', email: null, phone: null, documentType: 'CC', documentNumber: '1', propertyCount: 0 },
  { id: 'p2', name: 'Yesica López', email: null, phone: null, documentType: 'CC', documentNumber: '2', propertyCount: 0 },
] as unknown as Propietario[];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(value: string | null, onChange: (id: string) => void) {
  act(() => {
    root.render(React.createElement(PropietarioSelector, { propietarios, value, onChange }));
  });
}

function tarjeta(nombre: string): HTMLButtonElement {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(nombre)) as HTMLButtonElement;
}

describe('<PropietarioSelector>', () => {
  it('tocar una tarjeta la elige', () => {
    const onChange = vi.fn();
    render(null, onChange);
    act(() => tarjeta('Yolanda').click());
    expect(onChange).toHaveBeenCalledWith('p1');
  });

  it('tocar la tarjeta ya elegida la SUELTA (manda «» = sin propietario)', () => {
    const onChange = vi.fn();
    render('p1', onChange);
    act(() => tarjeta('Yolanda').click());
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('tocar OTRA tarjeta cambia la elección', () => {
    const onChange = vi.fn();
    render('p1', onChange);
    act(() => tarjeta('Yesica').click());
    expect(onChange).toHaveBeenCalledWith('p2');
  });
});
