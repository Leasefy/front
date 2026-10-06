/**
 * 🔴 Nico, 06-10-2026 16:23: al abrir la pantalla del código el PRIMER cuadro
 * queda seleccionado, con foco; también al volver a la pantalla y después de un
 * código rechazado, con los cuadros limpios.
 *
 * En el navegador, una casilla deshabilitada pierde el foco (mientras se
 * verifica lo están). happy-dom no lo hace solo: `soltarElFocoComoElNavegador`
 * lo imita, que es exactamente lo que pasa en Chrome.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { CasillasDeCodigo } from './casillas-de-codigo';

let host: HTMLDivElement;
let root: Root;

const casilla = (i: number) => host.querySelector(`[data-testid="casilla-${i}"]`) as HTMLInputElement;
const valores = () => Array.from({ length: 6 }, (_, i) => casilla(i).value).join('');

function pintar(props: { value: string; disabled?: boolean; autoFocus?: boolean }) {
  act(() => {
    root.render(
      <CasillasDeCodigo
        aria-label="Código de verificación de 6 dígitos"
        value={props.value}
        onChange={() => {}}
        disabled={props.disabled}
        autoFocus={props.autoFocus}
      />,
    );
  });
}

function soltarElFocoComoElNavegador() {
  const activo = document.activeElement as HTMLElement | null;
  if (activo && (activo as HTMLInputElement).disabled) activo.blur();
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('<CasillasDeCodigo autoFocus> — el foco en el primer cuadro', () => {
  it('al montar, la primera casilla tiene el foco', () => {
    pintar({ value: '', autoFocus: true });
    expect(document.activeElement).toBe(casilla(0));
  });

  it('🔴 tras un código rechazado (se deshabilitó al verificar y vuelve limpia): foco en la primera y cuadros vacíos', () => {
    pintar({ value: '', autoFocus: true });
    // La persona escribió los seis; el sexto quedó con el foco.
    act(() => casilla(5).focus());
    pintar({ value: '123456', autoFocus: true });
    // Se verifica: deshabilitadas (el navegador les quita el foco).
    pintar({ value: '123456', autoFocus: true, disabled: true });
    soltarElFocoComoElNavegador();
    // Rechazado: la pantalla limpia el código y las vuelve a habilitar.
    pintar({ value: '', autoFocus: true, disabled: false });

    expect(valores()).toBe('');
    expect(document.activeElement).toBe(casilla(0));
  });

  it('montada deshabilitada y habilitada después: el foco llega a la primera', () => {
    pintar({ value: '', autoFocus: true, disabled: true });
    soltarElFocoComoElNavegador();
    pintar({ value: '', autoFocus: true, disabled: false });
    expect(document.activeElement).toBe(casilla(0));
  });

  it('sin autoFocus no toma el foco (las demás pantallas que las usan quedan igual)', () => {
    pintar({ value: '' });
    expect(document.activeElement).not.toBe(casilla(0));
    pintar({ value: '', disabled: true });
    pintar({ value: '', disabled: false });
    expect(document.activeElement).not.toBe(casilla(0));
  });

  it('no persigue cada tecla: escribir mueve el foco como siempre, no lo devuelve a la primera', () => {
    pintar({ value: '', autoFocus: true });
    act(() => casilla(2).focus());
    pintar({ value: '12', autoFocus: true });
    expect(document.activeElement).toBe(casilla(2));
  });
});
