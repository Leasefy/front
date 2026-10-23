/**
 * La cifra que decide la pantalla (GLOW UP, 22-10-2026) y su regla «todo en
 * cero = una línea» (revisora r25, C3, 23-10-2026).
 *
 * Lo que fija: con plata, la cifra grande, la barra y la leyenda; con todo en
 * cero (`total={0}` y los tramos en cero, o `esCero`), UNA línea —la frase de
 * `cuandoEsCero` o «<rótulo> <cifra>»— sin barra ni leyenda de ceros, y el
 * `data-testid` de la pieza sigue vivo en los dos casos.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CifraHeroe, type TramoDeLaCifra } from './CifraHeroe';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const q = (s: string) => host.querySelector(s);

function tramos(cobrado: number, vencido: number): TramoDeLaCifra[] {
  return [
    { clave: 'cobrado', etiqueta: 'Cobrado', monto: cobrado, tono: 'exito', siempre: true, cifra: `$ ${cobrado}`, 'data-testid': 'tramo-cobrado' },
    { clave: 'vencido', etiqueta: 'Vencido', monto: vencido, tono: 'critico', siempre: true, cifra: `$ ${vencido}`, 'data-testid': 'tramo-vencido' },
  ];
}

async function pintar(el: React.ReactElement) {
  await act(async () => {
    root.render(el);
  });
}

describe('CifraHeroe', () => {
  it('con plata pinta la cifra grande, la barra y la leyenda', async () => {
    await pintar(<CifraHeroe rotulo="Falta por cobrar" cifra="$ 300" tramos={tramos(700, 300)} total={1000} data-testid="cifra" />);
    expect(q('[data-testid="cifra"]')?.getAttribute('data-en-cero')).toBeNull();
    expect(q('[data-testid="cifra-barra"]')).not.toBeNull();
    expect(q('[data-testid="tramo-cobrado"]')?.textContent).toContain('$ 700');
    expect(q('[data-testid="tramo-vencido"]')?.textContent).toContain('$ 300');
    expect(q('[data-testid="cifra-en-cero"]')).toBeNull();
  });

  it('con `total={0}` y todos los tramos en cero queda UNA línea, sin barra ni leyenda de ceros', async () => {
    await pintar(<CifraHeroe rotulo="Falta por cobrar" cifra="$ 0" contexto="de los $ 0 del mes" tramos={tramos(0, 0)} total={0} pie="Nota del pie" data-testid="cifra" />);
    const pieza = q('[data-testid="cifra"]');
    expect(pieza?.getAttribute('data-en-cero')).toBe('true');
    expect(q('[data-testid="cifra-en-cero"]')?.textContent).toBe('Falta por cobrar$ 0');
    expect(q('[data-testid="cifra-barra"]')).toBeNull();
    expect(q('[data-testid="tramo-cobrado"]')).toBeNull();
    expect(q('[data-testid="tramo-vencido"]')).toBeNull();
    // El contexto de un cero («de los $ 0 del mes») no se repite; el pie sí se queda.
    expect(pieza?.textContent).not.toContain('de los $ 0');
    expect(pieza?.textContent).toContain('Nota del pie');
  });

  it('con `cuandoEsCero` dice esa frase en vez del rótulo y la cifra', async () => {
    await pintar(
      <CifraHeroe rotulo="Falta pagar a proveedores" cifra="$ 0" tramos={tramos(0, 0)} total={0} cuandoEsCero="No hay nada por pagar a proveedores." data-testid="cifra" />,
    );
    expect(q('[data-testid="cifra-en-cero"]')?.textContent).toBe('No hay nada por pagar a proveedores.');
    expect(q('[data-testid="cifra"]')?.textContent).not.toContain('$ 0');
  });

  it('sin tramos, sólo `esCero` la vuelve una línea (la pieza no adivina el número)', async () => {
    await pintar(<CifraHeroe rotulo="Pasivo vivo" cifra="$ 0" contexto="lo provisionado" data-testid="cifra" />);
    expect(q('[data-testid="cifra"]')?.getAttribute('data-en-cero')).toBeNull();
    expect(q('[data-testid="cifra"]')?.textContent).toContain('lo provisionado');

    await pintar(<CifraHeroe rotulo="Pasivo vivo" cifra="$ 0" contexto="lo provisionado" esCero cuandoEsCero="Todavía no hay prestaciones por pagar." data-testid="cifra" />);
    expect(q('[data-testid="cifra"]')?.getAttribute('data-en-cero')).toBe('true');
    expect(q('[data-testid="cifra-en-cero"]')?.textContent).toBe('Todavía no hay prestaciones por pagar.');
  });

  it('con tramos en cero pero un total positivo no es «todo en cero»', async () => {
    await pintar(<CifraHeroe rotulo="Falta" cifra="$ 0" tramos={tramos(0, 0)} total={500} data-testid="cifra" />);
    expect(q('[data-testid="cifra"]')?.getAttribute('data-en-cero')).toBeNull();
    expect(q('[data-testid="tramo-cobrado"]')).not.toBeNull();
  });

  it('sin `total` no lo deduce: una leyenda de fichas con `monto: 0` se queda entera', async () => {
    await pintar(<CifraHeroe rotulo="Te han girado" cifra="$ 900" tramos={tramos(0, 0)} data-testid="cifra" />);
    expect(q('[data-testid="cifra"]')?.getAttribute('data-en-cero')).toBeNull();
    expect(q('[data-testid="tramo-cobrado"]')).not.toBeNull();
  });

  it('`esCero={false}` la deja completa aunque el total y los tramos estén en cero', async () => {
    await pintar(<CifraHeroe rotulo="Falta" cifra="$ 0" tramos={tramos(0, 0)} total={0} esCero={false} data-testid="cifra" />);
    expect(q('[data-testid="cifra"]')?.getAttribute('data-en-cero')).toBeNull();
    expect(q('[data-testid="tramo-vencido"]')).not.toBeNull();
  });
});
