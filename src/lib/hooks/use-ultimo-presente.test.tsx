/**
 * El hook que hace que un cajón pueda cerrarse animado: mientras se va, sigue
 * mostrando lo que mostraba.
 *
 * Render con `createRoot` + `act` y el componente MONTADO entre rerenders —
 * `renderHook` de `__test-utils__` desmonta al terminar y acá justamente hay
 * que ver qué pasa cuando el valor cambia sin desmontar nada.
 */

import { describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { useUltimoPresente } from './use-ultimo-presente';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Monta el hook y lo deja vivo; `poner()` cambia la entrada, `leer()` da la salida. */
function montar(inicial: string | null) {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  const root: Root = createRoot(contenedor);
  let ultimo: string | null = null;

  function Sonda({ valor }: { valor: string | null }) {
    ultimo = useUltimoPresente(valor);
    return null;
  }

  act(() => root.render(<Sonda valor={inicial} />));

  return {
    poner(valor: string | null) {
      act(() => root.render(<Sonda valor={valor} />));
    },
    leer: () => ultimo,
    soltar() {
      act(() => root.unmount());
      contenedor.remove();
    },
  };
}

describe('useUltimoPresente', () => {
  it('devuelve el valor cuando lo hay', () => {
    const s = montar('uno');
    expect(s.leer()).toBe('uno');
    s.soltar();
  });

  it('🔴 al pasar a null conserva el último: el cajón se va con contenido, no en blanco', () => {
    const s = montar('uno');
    s.poner(null);
    expect(s.leer()).toBe('uno');
    s.soltar();
  });

  it('un valor nuevo se ve en el MISMO render, sin un cuadro con el viejo', () => {
    const s = montar('uno');
    s.poner('dos');
    expect(s.leer()).toBe('dos');
    s.soltar();
  });

  it('abrir, cerrar y volver a abrir con otro valor no arrastra el anterior', () => {
    const s = montar('uno');
    s.poner(null);
    expect(s.leer()).toBe('uno');
    s.poner('dos');
    expect(s.leer()).toBe('dos');
    s.poner(null);
    expect(s.leer()).toBe('dos');
    s.soltar();
  });

  it('arranca en null si nunca hubo valor', () => {
    const s = montar(null);
    expect(s.leer()).toBeNull();
    s.soltar();
  });
});
