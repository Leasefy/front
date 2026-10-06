/**
 * CB-04 (QA de Contabilidad, 03-10-2026): los días de Contabilidad son el
 * selector de fecha del DS, no el `<input type="date">` del navegador (que se
 * cortaba en «dd/mm/yy'»). Escribe «30 sep 2026» y, si es un filtro opcional,
 * deja volver a «sin fecha».
 */
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { CampoDeDia } from './CampoDeDia';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

function pintar(el: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('<CampoDeDia>', () => {
  it('🔴 no es el campo de fecha del navegador: escribe el día como la casa', () => {
    pintar(<CampoDeDia id="d" value="2026-09-30" onChange={() => {}} testid="dia" />);
    expect(host.querySelector('input[type="date"]')).toBeNull();
    const boton = document.getElementById('d')!;
    expect(boton.tagName).toBe('BUTTON');
    expect(boton.textContent).toContain('30 sep 2026');
    expect(host.querySelector('[data-testid="dia"]')!.getAttribute('data-value')).toBe('2026-09-30');
  });

  it('sin fecha dice el placeholder', () => {
    pintar(<CampoDeDia id="d" value="" onChange={() => {}} placeholder="Sin fecha" />);
    expect(document.getElementById('d')!.textContent).toContain('Sin fecha');
  });

  it('quitable: «Quitar la fecha» vuelve a vacío; sin fecha no se ofrece', () => {
    const onChange = vi.fn();
    pintar(<CampoDeDia id="d" value="2026-09-30" onChange={onChange} quitable testid="dia" />);
    const quitar = host.querySelector<HTMLButtonElement>('[data-testid="dia-quitar"]')!;
    act(() => quitar.click());
    expect(onChange).toHaveBeenCalledWith('');

    act(() => root.render(<CampoDeDia id="d" value="" onChange={onChange} quitable testid="dia" />));
    expect(host.querySelector('[data-testid="dia-quitar"]')).toBeNull();
  });

  it('el error pinta el borde y nombra su texto', () => {
    pintar(<CampoDeDia id="d" value="2026-09-30" onChange={() => {}} invalido describedBy="d-error" testid="dia" />);
    expect(document.getElementById('d')!.className).toContain('border-danger');
    expect(host.querySelector('[data-testid="dia"]')!.getAttribute('aria-describedby')).toBe('d-error');
  });
});
