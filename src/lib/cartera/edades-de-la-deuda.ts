/**
 * La cartera de PROPIETARIOS por edades, del lado del front.
 *
 * El back manda los cuatro tramos ya calculados
 * (`back-erp/src/inmobiliaria/deducciones/edades-de-la-deuda.ts`): acá no se
 * reparte nada por edad, sólo se lee. Este archivo existe para dos cosas:
 *
 *   1. **Buscar un tramo sin adivinar el orden del arreglo.** Indexar por
 *      posición funciona hasta el día que el back agregue un tramo.
 *   2. **Tener los cuatro en cero cuando no hay deuda**, para que una tabla
 *      que se dibuja antes de que llegue la respuesta no cambie de ancho.
 *
 * 🔴 Los NOMBRES en pantalla salen de `NOMBRE_DE_EDAD` (`lib/cartera/edades`),
 * los mismos que usa la cartera del inquilino. El back manda su propio
 * `nombre` para sus exportaciones; si el front lo pintara, las dos carteras
 * dirían distinto («0-30 días» acá y «0 a 30 días» al lado) para el mismo
 * tramo.
 */

import { EDADES, type Edad } from '@/lib/cartera/edades';
import type { DeudaPorEdades, TramoDeLaDeuda } from '@/lib/types/deducciones';

/** Los cuatro tramos en cero, en orden. */
export function tramosVacios(): TramoDeLaDeuda[] {
  return EDADES.map((tramo) => ({
    tramo,
    nombre: tramo,
    debeCop: 0,
    renglones: 0,
  }));
}

/** Un informe por edades sin nada adentro. */
export function sinEdades(): DeudaPorEdades {
  return { tramos: tramosVacios(), diasDelMasViejo: 0 };
}

/**
 * Lo que hay en un tramo. Devuelve cero —no `undefined`— cuando el back no lo
 * mandó: una celda vacía en una tabla de plata se lee como «no sé», y acá sí
 * se sabe.
 */
export function enElTramo(edades: DeudaPorEdades | undefined, edad: Edad): number {
  return edades?.tramos.find((t) => t.tramo === edad)?.debeCop ?? 0;
}

/** Cuántos renglones hay en un tramo. */
export function renglonesEnElTramo(
  edades: DeudaPorEdades | undefined,
  edad: Edad,
): number {
  return edades?.tramos.find((t) => t.tramo === edad)?.renglones ?? 0;
}
