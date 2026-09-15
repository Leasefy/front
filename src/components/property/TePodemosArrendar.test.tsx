/**
 * «¿Te podemos arrendar este inmueble?» — paso 1: nada hasta «Verificar»;
 * si no alcanza se dice acá, si alcanza se sigue al paso 2 (el estudio).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const pushMock = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

import { TePodemosArrendar } from './TePodemosArrendar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let contenedor: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  contenedor?.remove();
  root = null;
  contenedor = null;
  pushMock.mockReset();
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

const hay = (testid: string) => contenedor!.querySelector<HTMLElement>(`[data-testid="${testid}"]`);
const verificar = () => act(() => hay('verificar-arriendo')!.click());

describe('<TePodemosArrendar>', () => {
  it('mientras escribe no dice si le alcanza', () => {
    montar();
    expect((hay('verificar-arriendo') as HTMLButtonElement).disabled).toBe(true);
    escribir('tpa-ingreso', '1000000');
    expect(hay('estimado-no-alcanza')).toBeNull();
    expect(hay('estimado-vacio')).toBeTruthy();
  });

  it('al verificar sin alcanzar lo dice acá, con lo que falta, y no sigue al estudio', () => {
    montar();
    escribir('tpa-ingreso', '2000000');
    verificar();
    expect(hay('estimado-no-alcanza')).toBeTruthy();
    expect(hay('estimado-faltante')?.textContent?.replace(/\D/g, '')).toContain('1000000');
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('cambiar el ingreso borra el resultado viejo', () => {
    montar();
    escribir('tpa-ingreso', '2000000');
    verificar();
    escribir('tpa-ingreso', '2500000');
    expect(hay('estimado-no-alcanza')).toBeNull();
  });

  it('al verificar con un ingreso que alcanza sigue al paso 2, el estudio prellenado', () => {
    montar();
    escribir('tpa-ingreso', '2000000');
    escribir('tpa-codeudor', '1000000');
    verificar();
    expect(pushMock).toHaveBeenCalledWith('/aprobacion?paso=2&canon=2000000&ciudad=Medell%C3%ADn&tipo=apartamento');
    expect(hay('estimado-no-alcanza')).toBeNull();
  });

  it('la nota dice que es un cálculo rápido y qué sigue, sin citar la regla', () => {
    montar();
    const nota = hay('nota-estimado')?.textContent ?? '';
    expect(nota).toContain('no una aprobación');
    expect(nota).toContain('siguiente paso');
    expect(nota).not.toMatch(/1,5|Fianly/);
  });
});
