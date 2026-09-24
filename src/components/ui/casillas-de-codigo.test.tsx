/**
 * Las casillas del código de verificación.
 *
 * Lo que se protege acá es lo que el campo único NO podía hacer, y que es la
 * razón de que exista la pieza: pegar el código de la app de autenticación y
 * que se reparta, borrar y retroceder, y avisar cuando está completo para que
 * la pantalla se envíe sola.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { CasillasDeCodigo } from './casillas-de-codigo';

let host: HTMLDivElement;
let root: Root;

/** Un control gobernado desde afuera, como lo usa la pantalla de verdad. */
function Sujeto({ onCompleto }: { onCompleto?: (c: string) => void }) {
  const [valor, setValor] = React.useState('');
  return (
    <CasillasDeCodigo
      aria-label="Código de verificación de 6 dígitos"
      value={valor}
      onChange={setValor}
      onCompleto={onCompleto}
    />
  );
}

async function pintar(onCompleto?: (c: string) => void) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<Sujeto onCompleto={onCompleto} />);
  });
}

const casilla = (i: number) =>
  document.querySelector<HTMLInputElement>(`[data-testid="casilla-${i}"]`)!;

const valorDeLasCasillas = () =>
  [...document.querySelectorAll<HTMLInputElement>('[data-testid^="casilla-"]')]
    .map((c) => c.value)
    .join('');

/** React escucha el `input` nativo, no la asignación a `.value`. */
async function escribir(i: number, texto: string) {
  const el = casilla(i);
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )!.set!;
  await act(async () => {
    setter.call(el, texto);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

beforeEach(() => {
  host = document.createElement('div');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host.remove();
});

describe('CasillasDeCodigo', () => {
  it('pinta una casilla por dígito y ninguna trae un valor puesto', async () => {
    await pintar();
    const todas = document.querySelectorAll('[data-testid^="casilla-"]');
    expect(todas).toHaveLength(6);
    // 🔴 Sin marcador: el `000000` del campo único se leía como un código ya
    // escrito, con el botón apagado al lado.
    for (const c of todas) {
      expect((c as HTMLInputElement).value).toBe('');
      expect(c.getAttribute('placeholder')).toBeNull();
    }
  });

  it('escribir avanza a la siguiente', async () => {
    await pintar();
    await escribir(0, '4');
    expect(valorDeLasCasillas()).toBe('4');
    expect(document.activeElement).toBe(casilla(1));
  });

  it('🔴 pegar el código lo reparte entre las seis', async () => {
    await pintar();
    await act(async () => {
      casilla(0).dispatchEvent(
        Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
          clipboardData: { getData: () => '481902' },
        }),
      );
    });
    expect(valorDeLasCasillas()).toBe('481902');
  });

  it('pegar con espacios o guiones se queda con los dígitos', async () => {
    await pintar();
    await act(async () => {
      casilla(0).dispatchEvent(
        Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
          clipboardData: { getData: () => '481 902' },
        }),
      );
    });
    expect(valorDeLasCasillas()).toBe('481902');
  });

  it('🔴 borrar sobre una casilla vacía se lleva la anterior', async () => {
    await pintar();
    await escribir(0, '4');
    await escribir(1, '8');
    // El foco quedó en la tercera, que está vacía.
    await act(async () => {
      casilla(2).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }),
      );
    });
    expect(valorDeLasCasillas()).toBe('4');
    expect(document.activeElement).toBe(casilla(1));
  });

  it('no deja escribir letras', async () => {
    await pintar();
    await escribir(0, 'a');
    expect(valorDeLasCasillas()).toBe('');
  });

  it('🔴 avisa cuando está completo, con el código entero', async () => {
    const completo = vi.fn();
    await pintar(completo);
    for (let i = 0; i < 6; i++) await escribir(i, String(i + 1));
    expect(completo).toHaveBeenCalledTimes(1);
    // El código va por parámetro: la pantalla no puede leerlo del estado
    // todavía, y verificar el de antes sería rechazar uno bueno.
    expect(completo).toHaveBeenCalledWith('123456');
  });

  it('sólo la primera casilla pide el autorrelleno del código', async () => {
    await pintar();
    expect(casilla(0).getAttribute('autocomplete')).toBe('one-time-code');
    for (let i = 1; i < 6; i++) {
      expect(casilla(i).getAttribute('autocomplete')).toBe('off');
    }
  });
});
