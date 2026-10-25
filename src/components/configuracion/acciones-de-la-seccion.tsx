'use client';

/**
 * Las acciones de una sección de Configuración van ARRIBA, a la derecha de su título (Nico, 23-10-2026: «el título y en
 * esa misma jerarquía del título … debe quedar el botón de acción, a la derecha … ahí deberían quedar todos los primary
 * de configuración y secondary al lado izquierdo del primary»).
 *
 * El marco (`MarcoDeConfiguracion`) deja una ranura junto al título; la sección pone ahí sus botones con
 * `<AccionesDeLaSeccion>`, en orden: los secundarios primero y el principal al final (queda a la derecha). Fuera del marco
 * (una sección suelta, una prueba) los botones se pintan en su lugar, alineados a la derecha.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** `undefined` = no hay marco; `null` = el marco todavía no montó su ranura. */
const RanuraDeAcciones = createContext<HTMLElement | null | undefined>(undefined);

export function ProveedorDeLaRanura({ ranura, children }: { ranura: HTMLElement | null; children: ReactNode }) {
  return <RanuraDeAcciones.Provider value={ranura}>{children}</RanuraDeAcciones.Provider>;
}

export function AccionesDeLaSeccion({ children }: { children: ReactNode }) {
  const ranura = useContext(RanuraDeAcciones);
  if (ranura === undefined) {
    return <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>;
  }
  if (!ranura) return null;
  return createPortal(children, ranura);
}
