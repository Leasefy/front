/**
 * revisarLoteCompleto — recorre `POST .../revisar` hasta dar UNA vuelta
 * completa por las filas pendientes del lote.
 *
 * Espejo de `activarLoteCompleto`, con una diferencia que importa. En la
 * activación toda fila LISTO sale de ese estado al procesarse, así que
 * «quedan filas» (`restantes > 0`) sí significa «hay trabajo». En la revisión
 * NO: una fila que sigue pendiente por un motivo real —un `tipo` que no
 * mapea— queda pendiente DESPUÉS de mirarla, y un bucle que repitiera
 * «mientras restantes > 0» la miraría hasta el tope de llamadas. Pasó en vivo
 * el 2026-09-11: 151 llamadas sobre una sola fila en tres minutos. Por eso el
 * back devuelve un cursor (`ultimaFila`) y `terminado`; este bucle avanza con
 * el cursor y para cuando el back dice que no queda nada después.
 */

import type { ResumenRevisionInmuebles } from '@/lib/api/inmuebles-importacion.service';

export interface ProgresoDeRevision {
  /** Filas miradas hasta ahora, sumando las llamadas. */
  revisadas: number;
  /** De ésas, cuántas pasaron a LISTO. */
  liberadas: number;
  /** Cuántas siguen pendientes en el lote, según la última llamada. */
  restantes: number;
  llamadas: number;
}

export interface ResultadoRevisionCompleta extends ProgresoDeRevision {
  /** El último seguro contra un back que nunca diga `terminado`. */
  detenidoPorLimite: boolean;
  /**
   * Una llamada no trajo un cursor que avance (un back viejo sin cursor, o
   * uno que devolvió la misma fila): insistir repetiría exactamente lo mismo,
   * así que se corta y se dice.
   */
  detenidoSinAvance: boolean;
}

/** Mismo techo que la activación: ~11 filas por llamada contra la base remota. */
const MAX_LLAMADAS = 1_000;

export async function revisarLoteCompleto(
  lote: string,
  revisar: (lote: string, desdeFila: number) => Promise<ResumenRevisionInmuebles>,
  onProgreso?: (progreso: ProgresoDeRevision) => void,
): Promise<ResultadoRevisionCompleta> {
  let desdeFila = 0;
  let revisadas = 0;
  let liberadas = 0;
  let restantes = 0;
  let llamadas = 0;

  for (;;) {
    const r = await revisar(lote, desdeFila);
    llamadas += 1;
    revisadas += r.revisadas;
    liberadas += r.liberadas;
    restantes = r.restantes;
    const progreso = { revisadas, liberadas, restantes, llamadas };
    onProgreso?.(progreso);

    // La vuelta terminó: el back no tiene nada pendiente después del cursor.
    // `revisadas === 0` es lo mismo dicho por un back que no miró ninguna.
    if (r.terminado === true || r.revisadas === 0) {
      return { ...progreso, detenidoPorLimite: false, detenidoSinAvance: false };
    }

    // Sin un cursor que avance no hay siguiente llamada distinta de ésta.
    if (typeof r.ultimaFila !== 'number' || r.ultimaFila <= desdeFila) {
      return { ...progreso, detenidoPorLimite: false, detenidoSinAvance: true };
    }
    desdeFila = r.ultimaFila;

    if (llamadas >= MAX_LLAMADAS) {
      return { ...progreso, detenidoPorLimite: true, detenidoSinAvance: false };
    }
  }
}
