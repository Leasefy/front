/**
 * La barra de abajo del celular, por SECCIONES (Nico, 21-10-2026: «el menú en
 * mobile debe ser otro, eso de los agentes ahí no creo que quede bien, ahí es
 * mejor colocar las secciones»; eligió «Secciones con hoja»).
 *
 * Antes la barra tomaba las cinco primeras filas del menú, y como «Agentes IA»
 * va arriba de todo en escritorio, en el celular salían Chat, Avalúos, Calidad
 * y Matching: lo que menos se usa en la calle.
 *
 * Ahora: Inicio (un toque) + las cuatro secciones del trabajo diario
 * (Captación, Operación, Dinero, Directorio). Tocar una sección sube una hoja
 * con sus pantallas; una sección con UNA sola pantalla va directo. «Más» junta
 * el resto: Chat, los agentes y Reportes. Nada se pierde: cada fila del menú
 * de escritorio queda en una casilla o en «Más».
 *
 * Un menú que no tiene al menos dos de esas secciones (otro panel, un rol con
 * muy poco) sigue con la barra de siempre: las primeras filas + «Más».
 */
import { agruparEnSecciones, resumenDeSeccion, type FilaAgrupable } from './secciones-del-menu';

/** Las secciones que van en la barra, en este orden (claves de `sidebar-del-panel.ts`). */
export const SECCIONES_DE_LA_BARRA = ['sec-captacion', 'sec-operacion', 'sec-dinero', 'sec-directorio'] as const;
export type SeccionDeLaBarra = (typeof SECCIONES_DE_LA_BARRA)[number];

export type CasillaDeLaBarra<T extends FilaAgrupable> =
  /** Un enlace directo (Inicio, o una sección con una sola pantalla). */
  | { tipo: 'fila'; fila: T; seccion?: SeccionDeLaBarra }
  /** Una sección: abre su hoja. */
  | { tipo: 'seccion'; clave: SeccionDeLaBarra; titulo: string; icono: T; filas: T[]; pendientes: number };

export interface GrupoDeMas<T> {
  /** La cabecera del grupo en la hoja de «Más» (null = sin cabecera). */
  titulo: string | null;
  filas: T[];
}

export interface BarraDelCelular<T extends FilaAgrupable> {
  casillas: CasillaDeLaBarra<T>[];
  mas: GrupoDeMas<T>[];
}

const esDeLaBarra = (clave: string): clave is SeccionDeLaBarra =>
  (SECCIONES_DE_LA_BARRA as readonly string[]).includes(clave);

/**
 * Arma la barra con las filas del menú (las de `filterAgencyNav`, con sus
 * cabeceras `kind: 'section'`). Devuelve `null` cuando el menú no tiene al
 * menos dos secciones de la barra: entonces se usa la barra plana de siempre.
 */
export function armarLaBarraDelCelular<T extends FilaAgrupable & { disabled?: boolean }>(
  filas: readonly T[],
): BarraDelCelular<T> | null {
  const bloques = agruparEnSecciones(filas.filter((f) => f.kind === 'section' || !f.disabled));
  const seccionesEnLaBarra = bloques.filter((b) => b.tipo === 'seccion' && esDeLaBarra(b.clave));
  if (seccionesEnLaBarra.length < 2) return null;

  const casillas: CasillaDeLaBarra<T>[] = [];
  const mas: GrupoDeMas<T>[] = [];

  // Inicio: la primera fila suelta de arriba (el Piloto). Las demás sueltas de
  // ese primer bloque (el Chat) van a «Más».
  const primero = bloques[0];
  if (primero && primero.tipo === 'sueltas') {
    const [inicio, ...resto] = primero.filas;
    if (inicio) casillas.push({ tipo: 'fila', fila: inicio });
    if (resto.length > 0) mas.push({ titulo: null, filas: resto });
  }

  for (const clave of SECCIONES_DE_LA_BARRA) {
    const bloque = seccionesEnLaBarra.find((b) => b.tipo === 'seccion' && b.clave === clave);
    if (!bloque || bloque.tipo !== 'seccion') continue;
    if (bloque.filas.length === 1) {
      casillas.push({ tipo: 'fila', fila: bloque.filas[0]!, seccion: clave });
    } else {
      casillas.push({
        tipo: 'seccion',
        clave,
        titulo: bloque.cabecera.label,
        icono: bloque.cabecera,
        filas: bloque.filas,
        pendientes: resumenDeSeccion(bloque.filas).pendientes,
      });
    }
  }

  // Lo demás, en el orden del menú: los agentes, el pie (Reportes) y
  // cualquier sección nueva que todavía no tenga casilla.
  bloques.forEach((b, i) => {
    if (i === 0 && b.tipo === 'sueltas') return;
    if (b.tipo === 'seccion' && esDeLaBarra(b.clave)) return;
    mas.push({ titulo: b.tipo === 'seccion' ? b.cabecera.label : null, filas: b.filas });
  });

  return { casillas, mas };
}

/** ¿La fila marcada (`hrefDeLaFilaActiva`) está dentro de esta casilla? */
export function casillaActiva<T extends FilaAgrupable>(casilla: CasillaDeLaBarra<T>, hrefActivo: string | null): boolean {
  if (!hrefActivo) return false;
  if (casilla.tipo === 'fila') return casilla.fila.href === hrefActivo;
  return casilla.filas.some((f) => f.href === hrefActivo);
}

