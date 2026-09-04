/**
 * navigation-source — qué chip lleva cada fila del ⌘K.
 *
 * En el buscador cada página venía con una cápsula «Página». No decía nada que
 * el encabezado del grupo («Navegación») y el contexto de la derecha («Dinero»,
 * «Contratos») no dijeran ya, y le ponía un semáforo a cada fila de la lista.
 * Sólo lo que ES una acción se marca.
 */

import { describe, it, expect } from 'vitest';

import { navigationSource } from '../navigation-source';
import type { SearchSourceContext } from '@/lib/hooks/useFederatedSearch';

const CTX: SearchSourceContext = { agencyId: 'agency-1', canAccess: () => true };

async function buscar(q: string) {
  return navigationSource.run(q, CTX, new AbortController().signal);
}

describe('navigationSource — chips', () => {
  it('una página no lleva chip', async () => {
    const filas = await buscar('cobranza');
    const pagina = filas.find((f) => f.title === 'Cobranza');
    expect(pagina, 'la página Cobranza tiene que estar en el catálogo').toBeDefined();
    expect(pagina?.type).toBe('pagina');
    expect(pagina?.badges).toEqual([]);
  });

  it('una acción lleva un solo chip «Acción»', async () => {
    const filas = await buscar('nueva consignación');
    const accion = filas.find((f) => f.title === 'Nueva consignación');
    expect(accion, 'la acción Nueva consignación tiene que estar en el catálogo').toBeDefined();
    expect(accion?.type).toBe('accion');
    expect(accion?.badges).toEqual([{ label: 'Acción', color: 'violet' }]);
  });

  it('ninguna fila trae más de un chip (la fila mide 40px, no es un tablero)', async () => {
    const filas = await buscar('a');
    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      expect((fila.badges ?? []).length, fila.title).toBeLessThanOrEqual(1);
    }
  });

  it('el contexto viaja en subtitle: es lo que se pinta a la derecha', async () => {
    const filas = await buscar('cartera');
    const cartera = filas.find((f) => f.title === 'Cartera');
    expect(cartera?.subtitle).toBe('Cobros');
  });

  it('respeta canAccess: sin permiso de portafolio no sale la consignación', async () => {
    const sinPortafolio: SearchSourceContext = {
      agencyId: 'agency-1',
      canAccess: (module) => module !== 'portafolio',
    };
    const filas = await navigationSource.run(
      'consignación',
      sinPortafolio,
      new AbortController().signal,
    );
    expect(filas.find((f) => f.title === 'Nueva consignación')).toBeUndefined();
  });
});
