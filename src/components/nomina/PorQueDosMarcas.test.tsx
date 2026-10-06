/**
 * «Por qué hay DOS marcas y no una» (Nómina → Conceptos): desde el 05-10-2026
 * no es una caja puesta sobre el catálogo sino un botón del encabezado que abre
 * el cajón (Nico: «llévalas al botón que al dar clic abre drawer»). Fija que el
 * texto —con sus citas de ley— sigue existiendo, a un clic.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { PorQueDosMarcas } from './ConceptosDeNomina';

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

describe('<PorQueDosMarcas>', () => {
  it('cerrado no pinta la explicación; abierta, dice qué mide cada marca y por qué no se unifican', async () => {
    await act(async () => raiz.render(<PorQueDosMarcas />));
    expect(document.body.querySelector('[data-testid="por-que-dos-marcas"]')).toBeNull();

    const boton = contenedor.querySelector<HTMLButtonElement>('[data-testid="para-entender-mas"]')!;
    expect(boton.textContent).toContain('Por qué hay dos marcas');
    await act(async () => boton.click());

    const texto = document.body.querySelector('[data-testid="por-que-dos-marcas"]')?.textContent ?? '';
    expect(texto).toContain('entra al IBC de seguridad social');
    expect(texto).toContain('entra a la base de prima y cesantías');
    expect(texto).toContain('Ley 15 de 1959 art. 2');
    expect(texto).toContain('CST art. 249');
    expect(texto).toContain('Unificarlas hace cotizar de más y provisionar de menos.');
  });
});
