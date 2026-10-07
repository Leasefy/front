/**
 * 🔴 Copropiedad sin porcentaje (Nico, 04-10-2026, tal cual: «vacío y giro
 * bloqueado», la regla del 22-09).
 *
 * Cuando el archivo de la migración trae varios dueños de un inmueble y no
 * dice cuánto es de cada uno, el porcentaje queda VACÍO: la ficha, la lista de
 * propietarios y el resumen de la migración dicen «Falta el porcentaje de cada
 * propietario», y el giro de ese inmueble no sale hasta ponerlo (que sumen
 * 100). El back guarda partes iguales PROVISIONALES (su CHECK exige un número)
 * con la marca `participacionesDesconocidas`: la pantalla nunca muestra ese
 * número como si fuera un dato.
 */

/** Lo que se dice, igual en todas las pantallas. */
export const FALTA_EL_PORCENTAJE = 'Falta el porcentaje de cada propietario';

/** Un inmueble que la liquidación dejó fuera por eso (`sinPorcentaje` del back). */
export interface InmuebleSinPorcentaje {
  consignacionId: string;
  propertyId: string | null;
  propertyTitle: string;
  /** La frase del back, para una persona. */
  motivo?: string;
  /** Cuotas del propietario de ese mes que no se giran. */
  cuotas?: number;
  /** Lo que no se gira de ese mes. */
  pendienteCop?: number;
}

/** A dónde se va a ponerlo: la ficha del inmueble (la ruta es la del mandato). */
export function rutaParaPonerElPorcentaje(consignacionId: string): string {
  return `/panel/inmobiliaria/inmuebles/${consignacionId}#propietarios`;
}
