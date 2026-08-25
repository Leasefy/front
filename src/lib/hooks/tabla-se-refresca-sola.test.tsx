/**
 * Una acción cambia datos → la tabla se entera SOLA.
 *
 * Nico: «que evitemos decirle al usuario que recargue páginas». Antes cada
 * pantalla tenía que acordarse de llamar a su `refetch` después de cada acción,
 * y la mayoría no lo hacía: el cambio quedaba en la base y la lista seguía
 * mostrando lo de antes.
 *
 * Ahora el aviso sale del cliente HTTP —donde pasa TODO—, así que vale para las
 * acciones que ya existen y para las que se escriban después.
 *
 * Render con `createRoot` + `act`, la convención del repo
 * (`__test-utils__/render-hook`); acá hace falta uno que se quede MONTADO para
 * poder ver el refresco, en vez de devolver una foto y desmontar.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { usePropietarios } from './useInmobiliaria';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import { invalidar, _reiniciar } from '@/lib/api/refresco-de-datos';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Monta el hook y lo deja vivo. `leer()` da el último valor; `soltar()` desmonta. */
async function montar<T>(hook: () => T) {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  const root = createRoot(contenedor);
  let ultimo: T | undefined;

  function Sonda() {
    ultimo = hook();
    return null;
  }

  await act(async () => {
    root.render(<Sonda />);
  });
  await act(async () => {
    await Promise.resolve();
  });

  return {
    leer: () => ultimo as T,
    /** Deja correr los efectos pendientes. */
    asentar: async () => {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
    },
    soltar: () => {
      act(() => root.unmount());
      contenedor.remove();
    },
  };
}

const UNO = { id: 'p1', name: 'Jorge Restrepo' };
const DOS = { id: 'p2', name: 'Marcela Ochoa' };

describe('la tabla se refresca sola', () => {
  let enBase: unknown[];
  let pedidas: () => number;

  beforeEach(() => {
    _reiniciar();
    enBase = [UNO];
    const espia = vi
      .spyOn(propietariosApi, 'getAll')
      .mockImplementation(async () => enBase as never);
    pedidas = () => espia.mock.calls.length;
  });

  afterEach(() => vi.restoreAllMocks());

  it('parte mostrando lo que hay', async () => {
    const t = await montar(() => usePropietarios());
    expect(t.leer().propietarios).toHaveLength(1);
    t.soltar();
  });

  /*
   * El corazón del asunto: NADIE llama a `refetch` desde el test. Sólo se avisa
   * que el recurso cambió, que es exactamente lo que hace el cliente HTTP
   * después de un POST/PUT/PATCH/DELETE que salió bien.
   */
  it('un cambio en «propietarios» la vuelve a pedir, sin que nadie recargue', async () => {
    const t = await montar(() => usePropietarios());
    expect(t.leer().propietarios).toHaveLength(1);

    enBase = [UNO, DOS];
    await act(async () => {
      invalidar('propietarios');
    });
    await t.asentar();

    expect(t.leer().propietarios).toHaveLength(2);
    t.soltar();
  });

  it('también cuando la acción BORRA: la fila desaparece sola', async () => {
    enBase = [UNO, DOS];
    const t = await montar(() => usePropietarios());
    expect(t.leer().propietarios).toHaveLength(2);

    enBase = [UNO];
    await act(async () => {
      invalidar('propietarios');
    });
    await t.asentar();

    expect(t.leer().propietarios).toHaveLength(1);
    t.soltar();
  });

  it('un cambio en otro recurso NO la molesta', async () => {
    const t = await montar(() => usePropietarios());
    const antes = pedidas();

    await act(async () => {
      invalidar('renovaciones');
    });
    await t.asentar();

    expect(pedidas()).toBe(antes);
    t.soltar();
  });

  /*
   * El refresco NO puede parpadear a esqueleto: el dato ya está en pantalla, y
   * hacerlo desaparecer después de cada acción se ve peor que el problema.
   */
  it('refresca sin volver a «cargando»', async () => {
    const t = await montar(() => usePropietarios());
    expect(t.leer().isLoading).toBe(false);

    enBase = [UNO, DOS];
    await act(async () => {
      invalidar('propietarios');
    });
    await t.asentar();

    expect(t.leer().propietarios).toHaveLength(2);
    expect(t.leer().isLoading).toBe(false);
    t.soltar();
  });

  it('al desmontarse deja de escuchar', async () => {
    const t = await montar(() => usePropietarios());
    const antes = pedidas();

    t.soltar();
    await act(async () => {
      invalidar('propietarios');
    });
    await new Promise((r) => setTimeout(r, 20));

    expect(pedidas()).toBe(antes);
  });
});
