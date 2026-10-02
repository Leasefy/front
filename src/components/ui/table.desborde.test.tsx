/**
 * 🔴 20-09 · Una tabla que no cabe tiene que DECIRLO.
 *
 * Nico, con Contratos abierto en 1140 px: la tabla se corta en el borde
 * derecho y nada lo avisa. En macOS la barra de scroll está escondida hasta
 * que se hace el gesto, así que la única señal de que existe una columna más
 * es que la fila termina justo donde termina la tarjeta — que es exactamente
 * cómo se ve una tabla que sí cabe.
 *
 * La prueba vive sobre el PRIMITIVO, no sobre una pantalla: el defecto estaba
 * en todas las tablas anchas del producto a la vez, y la próxima tabla ancha
 * iba a nacer con él.
 */

import { describe, expect, it, afterEach } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { Table, TableBody, TableCell, TableRow } from './table';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
});

async function montar(nodo: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(nodo);
  });
  const caja = host.querySelector('[class*="overflow-auto"]') as HTMLElement;
  expect(caja.className).toContain('overflow-auto');
  return { caja, host: host! };
}

function unaTabla(props: { avisoDeDesborde?: boolean; sombrasDeBorde?: boolean } = {}) {
  return montar(
    <Table {...props}>
      <TableBody>
        <TableRow>
          <TableCell>Un dato</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
}

/** Finge una caja de `caja` px cuyo contenido mide `contenido` px. */
function fingirAnchos(elemento: HTMLElement, caja: number, contenido: number, corrido = 0) {
  Object.defineProperty(elemento, 'clientWidth', { value: caja, configurable: true });
  Object.defineProperty(elemento, 'scrollWidth', { value: contenido, configurable: true });
  Object.defineProperty(elemento, 'scrollLeft', { value: corrido, configurable: true });
}

/** Vuelve a medir por donde el hook escucha de verdad: el scroll de la caja. */
async function remedir(caja: HTMLElement) {
  await act(async () => {
    caja.dispatchEvent(new Event('scroll'));
  });
}

describe('Table · el aviso de que no cabe', () => {
  it('una tabla que CABE no dice nada y no mete una parada de tabulación muerta', async () => {
    const { caja, host } = await unaTabla();
    fingirAnchos(caja, 800, 800);
    await remedir(caja);

    expect(host.querySelector('[data-testid="aviso-de-desborde"]')).toBeNull();
    expect(host.querySelector('[data-testid="sigue-a-la-derecha"]')).toBeNull();
    expect(caja.getAttribute('tabindex')).toBeNull();
    expect(caja.getAttribute('role')).toBeNull();
  });

  it('🔴 una tabla que NO cabe lo dice con palabras, no sólo con una sombra', async () => {
    const { caja, host } = await unaTabla();
    fingirAnchos(caja, 800, 1200);
    await remedir(caja);

    const aviso = host.querySelector('[data-testid="aviso-de-desborde"]');
    expect(aviso).not.toBeNull();
    expect(aviso!.textContent).toContain('no cabe entera');
  });

  it('y se puede correr con el teclado: el contenedor se vuelve enfocable', async () => {
    const { caja } = await unaTabla();
    fingirAnchos(caja, 800, 1200);
    await remedir(caja);

    expect(caja.getAttribute('tabindex')).toBe('0');
    expect(caja.getAttribute('role')).toBe('region');
    expect(caja.getAttribute('aria-label')).toContain('se corre a los lados');
  });

  it('la sombra marca el lado por el que SIGUE habiendo tabla, no los dos siempre', async () => {
    const { caja, host } = await unaTabla();
    const derecha = () => host.querySelector('[data-testid="sigue-a-la-derecha"]');
    const izquierda = () => host.querySelector('[data-testid="sigue-a-la-izquierda"]');

    // Sin correr: sólo sigue a la derecha.
    fingirAnchos(caja, 800, 1200, 0);
    await remedir(caja);
    expect(derecha()).not.toBeNull();
    expect(izquierda()).toBeNull();

    // A la mitad: sigue por los dos lados.
    fingirAnchos(caja, 800, 1200, 200);
    await remedir(caja);
    expect(derecha()).not.toBeNull();
    expect(izquierda()).not.toBeNull();

    // Al final: ya no sigue a la derecha.
    fingirAnchos(caja, 800, 1200, 400);
    await remedir(caja);
    expect(derecha()).toBeNull();
    expect(izquierda()).not.toBeNull();
  });

  it('medio píxel de diferencia NO es desborde (los anchos de una tabla son subpíxel)', async () => {
    const { caja, host } = await unaTabla();
    fingirAnchos(caja, 800, 800.5);
    await remedir(caja);

    expect(host.querySelector('[data-testid="aviso-de-desborde"]')).toBeNull();
  });

  it('`avisoDeDesborde={false}` calla el texto pero deja la sombra', async () => {
    const { caja, host } = await unaTabla({ avisoDeDesborde: false });
    fingirAnchos(caja, 800, 1200);
    await remedir(caja);

    expect(host.querySelector('[data-testid="aviso-de-desborde"]')).toBeNull();
    expect(host.querySelector('[data-testid="sigue-a-la-derecha"]')).not.toBeNull();
  });

  /*
   * 02-10 · El extracto del propietario fija Propiedad y Neto y pinta su
   * propio filete en el borde interior de esas columnas; las sombras de afuera
   * le sobraban y las escondía con un selector por `data-testid` en su
   * `className`. Ahora lo pide con la prop y las sombras no se pintan.
   */
  it('`sombrasDeBorde={false}` no pinta las sombras aunque la tabla no quepa, por ningún lado', async () => {
    const { caja, host } = await unaTabla({ sombrasDeBorde: false });
    const derecha = () => host.querySelector('[data-testid="sigue-a-la-derecha"]');
    const izquierda = () => host.querySelector('[data-testid="sigue-a-la-izquierda"]');

    fingirAnchos(caja, 800, 1200, 0);
    await remedir(caja);
    expect(derecha()).toBeNull();
    expect(izquierda()).toBeNull();

    // A la mitad, que es cuando por defecto salen las dos.
    fingirAnchos(caja, 800, 1200, 200);
    await remedir(caja);
    expect(derecha()).toBeNull();
    expect(izquierda()).toBeNull();

    // El resto del desborde sigue igual: el aviso escrito y el teclado.
    expect(host.querySelector('[data-testid="aviso-de-desborde"]')).not.toBeNull();
    expect(caja.getAttribute('tabindex')).toBe('0');
    expect(caja.className).toContain('overflow-auto');
  });

  it('por defecto las sombras siguen saliendo (la prop no cambia ninguna otra tabla)', async () => {
    const { caja, host } = await unaTabla();
    fingirAnchos(caja, 800, 1200, 200);
    await remedir(caja);

    expect(host.querySelector('[data-testid="sigue-a-la-derecha"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="sigue-a-la-izquierda"]')).not.toBeNull();
  });
});
