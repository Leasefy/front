'use client';

/**
 * 🔴 SI NO TIENES ACCESO A UNA PANTALLA, NO PUEDES HACER NADA EN ELLA.
 *
 * ── Lo que pasaba (Nico, 21-09-2026, mirando el Pipeline) ──────────────────
 *
 * «¿Por qué no me das acceso a todo? Y si no tengo acceso, ¿por qué el botón
 * no está disabled?»
 *
 * La pantalla se pintaba ENTERA —título, las cuatro fichas de arriba, el
 * buscador, los filtros y un «+ Nuevo lead» azul y vivo— y sólo el hueco del
 * centro decía «No tienes acceso a esto». Todo lo de afuera seguía usable:
 * podías teclear, filtrar y abrir el diálogo de crear un lead que el servidor
 * iba a rechazar.
 *
 * Es la misma forma del defecto L1 de los conteos —lo que estaba FUERA del
 * `EstadoDeDatos` no se enteraba de que la carga había fallado—, pero con las
 * ACCIONES en vez de los números, y con un agravante: un número equivocado se
 * lee mal, un botón que no puede funcionar se pulsa.
 *
 * ── Por qué la decisión no puede vivir sólo en `PageGuard` ─────────────────
 *
 * `PageGuard` ya decidía con `my-permissions`, que es la idea que el FRONT
 * tiene de tus permisos. Pero cada llamada la decide el BACK, con otros datos
 * (tu membresía, la inmobiliaria elegida, el segundo factor de esta sesión).
 * Cuando las dos no coinciden —el panel te deja entrar y el servidor te cierra
 * la puerta— gana el servidor, y la pantalla tiene que enterarse.
 *
 * Por eso el permiso de la pantalla se decide con DOS fuentes: lo que el front
 * cree ANTES de montar, y lo que el back respondió DESPUÉS. Esta caja es la
 * segunda: el `EstadoDeDatos` de la fuente principal avisa hacia arriba, y
 * `PageGuard` cambia la pantalla entera por el cartel.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface DenegacionDeLaPantalla {
  /** El error entero, para que el cartel lo clasifique y muestre su referencia. */
  error: unknown;
  /** Qué se estaba cargando, para que el cartel no sea genérico. */
  queEs?: string;
}

interface AccesoDeLaPantalla {
  denegado: DenegacionDeLaPantalla | null;
  denegar: (denegacion: DenegacionDeLaPantalla) => void;
}

const Contexto = createContext<AccesoDeLaPantalla | null>(null);

/**
 * `null` fuera de una pantalla con `PageGuard` — y eso está bien: hay
 * componentes compartidos que se usan en el portal del inquilino y del
 * propietario, donde no hay nada que apagar.
 */
export function useAccesoDeLaPantalla(): AccesoDeLaPantalla | null {
  return useContext(Contexto);
}

export interface ProveedorDeAccesoProps {
  /** Qué pintar cuando el servidor negó la pantalla. */
  cuandoNiega: (denegacion: DenegacionDeLaPantalla) => ReactNode;
  children: ReactNode;
}

export function ProveedorDeAcceso({ cuandoNiega, children }: ProveedorDeAccesoProps) {
  const [denegado, setDenegado] = useState<DenegacionDeLaPantalla | null>(null);
  const valor = useMemo<AccesoDeLaPantalla>(
    () => ({ denegado, denegar: setDenegado }),
    [denegado],
  );

  /*
   * Los hijos se DESMONTAN cuando se niega, no se esconden: un `hidden` o un
   * `inert` dejan vivos los efectos, los intervalos y los pedidos en curso de
   * una pantalla que la persona no puede usar — y, como ya nos pasó con
   * `inert`, congelan el clic sin cambiar cómo se ve el botón.
   */
  return (
    <Contexto.Provider value={valor}>
      {denegado ? cuandoNiega(denegado) : children}
    </Contexto.Provider>
  );
}
