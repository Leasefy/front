/**
 * «¿Cómo funciona?» de Lotes al banco (05-10-2026): los cinco pasos que iban
 * dibujados en la tarjeta del mes viven en el cajón del botón del encabezado.
 * El aviso que se queda a la vista («armar no gira plata») lo prueba
 * `ListaDeLotes.test.tsx`.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { ComoSaleUnLote } from './ComoSaleUnLote';

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

describe('<ComoSaleUnLote>', () => {
  it('cerrado no pinta los pasos; abierto, los cinco en orden y en el cajón', async () => {
    await act(async () => raiz.render(<ComoSaleUnLote />));
    expect(document.body.querySelector('[data-testid="como-sale-un-lote"]')).toBeNull();

    const boton = contenedor.querySelector<HTMLButtonElement>('[data-testid="para-entender-mas"]')!;
    expect(boton.textContent).toContain('¿Cómo funciona?');
    await act(async () => boton.click());

    const cajon = document.body.querySelector('[data-testid="para-entender-mas-contenido"]');
    expect(cajon?.getAttribute('data-sheet-side')).toBe('right');
    const pasos = [...document.body.querySelectorAll('[data-testid="como-sale-un-lote"] li')];
    expect(pasos).toHaveLength(5);
    expect(pasos[0].textContent).toContain('Armas el lote eligiendo el banco');
    expect(pasos[0].textContent).toContain('todavía no se gira nada');
    expect(pasos[1].textContent).toContain('Otra persona lo aprueba con un código');
    expect(pasos[2].textContent).toContain('Descargas el archivo de ese banco');
    expect(pasos[3].textContent).toContain('Lo subes al portal del banco');
    expect(pasos[3].textContent).toContain('Desde Leasefy no sale ningún giro');
    expect(pasos[4].textContent).toContain('Marcas el lote pagado');
  });
});
