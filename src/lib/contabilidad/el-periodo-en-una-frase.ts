/**
 * El estado del período contable, dicho como UNA frase.
 *
 * ── 🔴 Nico, 22-09, sobre la portada de Contabilidad ───────────────────────
 *
 * «No le hiciste el glow up y eso se ve por ahí tirado todo.» La tarjeta de
 * cierre abría con un título, un párrafo gris que decía el estado a mitad de
 * frase («Todavía no se cerró ningún período: cualquier fecha admite
 * asientos») y debajo tres bloques más que lo volvían a decir de costado: el
 * botón apagado de «Reabrir» explicaba que no había nada cerrado, y la bitácora
 * vacía que nadie había reabierto nada.
 *
 * El estado del período es LO PRIMERO que un contador busca en esta tarjeta
 * —«¿puedo asentar en agosto?»—, así que va arriba, en grande y en una frase:
 *
 *   · «Todo está abierto: cualquier fecha admite asientos.»
 *   · «Cerrado hasta el 31 de agosto de 2026.»
 *
 * y una segunda línea, más chica, SÓLO cuando agrega algo (qué significa estar
 * cerrado, o qué pasa si no se pudo preguntar). Lo abierto no tiene segunda
 * línea: la primera ya lo dice todo.
 *
 * Vive aparte de la pantalla porque es la parte que se prueba sin montar nada,
 * y porque la tarjeta la usan dos pantallas (la portada y el libro).
 */

export type EstadoDelPeriodo =
  | { tipo: 'cargando' }
  | { tipo: 'fallo' }
  | { tipo: 'abierto' }
  | { tipo: 'cerrado'; hasta: string };

export interface FraseDelPeriodo {
  /** Lo que se lee primero. */
  frase: string;
  /** Lo que la frase no alcanza a decir, o `null` si no hace falta. */
  detalle: string | null;
  /** Para elegir el candado: abierto, cerrado o no se sabe. */
  candado: 'abierto' | 'cerrado' | 'desconocido';
}

/** «2026-08-31» → «31 de agosto de 2026». Día civil: sin zona horaria. */
export function diaLargo(dia: string): string {
  const [y, m, d] = dia.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return dia;
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function estadoDelPeriodo(
  cierre: { cerradaHasta: string | null } | null,
  cargando: boolean,
  fallo: boolean,
): EstadoDelPeriodo {
  if (cargando) return { tipo: 'cargando' };
  // 🔴 Un fallo NO es «nada cerrado». Decir «todo está abierto» sobre un 500 le
  // haría creer a alguien que puede asentar en un mes que está cerrado.
  if (fallo) return { tipo: 'fallo' };
  const hasta = cierre?.cerradaHasta ?? null;
  return hasta ? { tipo: 'cerrado', hasta } : { tipo: 'abierto' };
}

/** `null` mientras carga: ahí va un esqueleto con la forma de la frase. */
export function elPeriodoEnUnaFrase(estado: EstadoDelPeriodo): FraseDelPeriodo | null {
  switch (estado.tipo) {
    case 'cargando':
      return null;
    case 'fallo':
      return {
        frase: 'No pude consultar hasta dónde está cerrado.',
        detalle:
          'Cerrar sigue disponible: la fecha se revisa al recibirla, así que no se puede cerrar dos veces el mismo día.',
        candado: 'desconocido',
      };
    case 'abierto':
      return {
        frase: 'Todo está abierto: cualquier fecha admite asientos.',
        detalle: null,
        candado: 'abierto',
      };
    case 'cerrado':
      return {
        frase: `Cerrado hasta el ${diaLargo(estado.hasta)}.`,
        detalle: 'Nada con esa fecha o anterior se puede asentar ni reversar en esa fecha.',
        candado: 'cerrado',
      };
  }
}
