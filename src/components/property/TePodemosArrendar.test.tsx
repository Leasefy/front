/**
 * «¿Te podemos arrendar este inmueble?» — lo que ve la persona con cada ingreso.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { TePodemosArrendar } from './TePodemosArrendar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let contenedor: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  contenedor?.remove();
  root = null;
  contenedor = null;
});

function montar() {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  act(() => {
    root!.render(<TePodemosArrendar canon={2_000_000} ciudad="Medellín" tipo="apartment" />);
  });
}

function escribir(id: string, texto: string) {
  const input = contenedor!.querySelector<HTMLInputElement>(`#${id}`)!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(input, texto);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const hay = (testid: string) => contenedor!.querySelector(`[data-testid="${testid}"]`);

describe('<TePodemosArrendar>', () => {
  it('sin ingreso no dice ni sí ni no', () => {
    montar();
    expect(hay('estimado-vacio')).toBeTruthy();
    expect(hay('estimado-alcanza')).toBeNull();
    expect(hay('estimado-no-alcanza')).toBeNull();
  });

  it('con 1,5 veces el canon le alcanza', () => {
    montar();
    escribir('tpa-ingreso', '3000000');
    expect(hay('estimado-alcanza')).toBeTruthy();
  });

  it('con menos no le alcanza y le dice cuánto le falta', () => {
    montar();
    escribir('tpa-ingreso', '2000000');
    expect(hay('estimado-no-alcanza')).toBeTruthy();
    expect(hay('estimado-faltante')?.textContent?.replace(/\D/g, '')).toContain('1000000');
  });

  it('el codeudor suma y cambia la respuesta', () => {
    montar();
    escribir('tpa-ingreso', '2000000');
    escribir('tpa-codeudor', '1000000');
    expect(hay('estimado-alcanza')).toBeTruthy();
  });

  it('sin ingreso, o si no le alcanza, no se le ofrece verificar', () => {
    montar();
    expect(hay('verificar-arriendo')).toBeNull();
    escribir('tpa-ingreso', '2000000');
    expect(hay('estimado-no-alcanza')).toBeTruthy();
    expect(hay('verificar-arriendo')).toBeNull();
  });

  it('cuando le alcanza, «Verificar» abre el estudio con el canon, la ciudad y el tipo del inmueble', () => {
    montar();
    escribir('tpa-ingreso', '3000000');
    const boton = hay('verificar-arriendo');
    expect(boton?.textContent?.trim()).toBe('Verificar');
    expect(boton?.getAttribute('href')).toBe(
      '/aprobacion?canon=2000000&ciudad=Medell%C3%ADn&tipo=apartamento',
    );
  });

  it('la nota sólo dice que es un estimado', () => {
    montar();
    expect(contenedor!.textContent).toContain('Es un estimado.');
    expect(contenedor!.textContent).not.toMatch(/1,5|Fianly/);
  });
});
