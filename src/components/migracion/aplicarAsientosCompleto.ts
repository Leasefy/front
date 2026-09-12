/**
 * aplicarAsientosCompleto — recorre `aplicar` hasta que no queda nada.
 *
 * 🔴 Nico, 2026-09-12, pidiendo la misma barra que inmuebles y contratos para
 * los registros contables. Para dibujarla, la llamada tiene que VOLVER: su
 * archivo real trae 116.469 filas y escribirlas en un solo request es media
 * hora colgado de una conexión HTTP, sin un dato de avance y a merced del
 * timeout de un proxy.
 *
 * Reenviar el MISMO lote es seguro y es justo lo que hace este bucle: la
 * idempotencia es por `(lote, clave)` y `preparar` marca `YA_MIGRADA` lo que
 * ya entró, así que cada vuelta trabaja sólo lo que falta.
 */

import type { InformeDeMigracion } from '@/lib/api/contabilidad.service';

export interface ProgresoDeAsientos {
  /** Asientos escritos hasta ahora, sumando las vueltas. */
  aplicados: number;
  /** Cuántos quedan, según la última vuelta. */
  restantes: number;
  llamadas: number;
}

export interface ResultadoDeAsientos extends ProgresoDeAsientos {
  /** El informe de la ÚLTIMA vuelta: es el que la pantalla ya sabe pintar. */
  ultimo: InformeDeMigracion;
  detenidoPorPersona: boolean;
  detenidoSinAvance: boolean;
  detenidoPorLimite: boolean;
}

/** 116.469 filas a ~200 por vuelta son ~580 llamadas: el techo las cubre. */
const MAX_LLAMADAS = 2_000;

export async function aplicarAsientosCompleto(
  aplicar: () => Promise<InformeDeMigracion>,
  onProgreso?: (p: ProgresoDeAsientos) => void,
  opciones: { debeParar?: () => boolean } = {},
): Promise<ResultadoDeAsientos> {
  let aplicados = 0;
  let llamadas = 0;

  for (;;) {
    const r = await aplicar();
    llamadas += 1;
    aplicados += r.aplicados;
    const progreso: ProgresoDeAsientos = {
      aplicados,
      restantes: r.restantes ?? 0,
      llamadas,
    };
    onProgreso?.(progreso);

    const salir = (
      extra: Partial<
        Pick<
          ResultadoDeAsientos,
          'detenidoPorPersona' | 'detenidoSinAvance' | 'detenidoPorLimite'
        >
      >,
    ): ResultadoDeAsientos => ({
      ...progreso,
      ultimo: r,
      detenidoPorPersona: false,
      detenidoSinAvance: false,
      detenidoPorLimite: false,
      ...extra,
    });

    // Ausente ⇒ 0 ⇒ una sola vuelta: nunca se asume que queda trabajo por un
    // campo que no vino.
    if ((r.restantes ?? 0) <= 0) return salir({});
    if (opciones.debeParar?.() === true) return salir({ detenidoPorPersona: true });
    // Una vuelta que no escribió nada y deja restantes: la siguiente haría lo
    // mismo. Se corta y se dice.
    if (r.aplicados === 0) return salir({ detenidoSinAvance: true });
    if (llamadas >= MAX_LLAMADAS) return salir({ detenidoPorLimite: true });
  }
}
