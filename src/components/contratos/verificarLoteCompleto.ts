/**
 * verificarLoteCompleto — recorre `POST migrar/verificar` hasta dar UNA vuelta
 * completa por los contratos ya migrados del lote.
 *
 * Nico, 2026-09-15: «que el número sea del lote completo, no de una muestra».
 * El back corta por reloj y devuelve un cursor; acá se avanza con el cursor
 * hasta que el back dice `terminado`, acumulando los conteos de todas las
 * vueltas. Sin esto, la pantalla diría «50 de 50 coinciden» sobre un lote de
 * 1.836 filas.
 *
 * Mismo bucle —y mismos tres seguros— que `reconciliarLoteCompleto`: tope de
 * llamadas, corte cuando el cursor no avanza (un back viejo que no conozca
 * este endpoint incluido) y «Detener» de la persona.
 */

import type {
  ResultadoDeVerificacion,
  VeredictoDeFila,
} from '@/lib/api/contracts.service';

export interface ProgresoDeVerificacion {
  /** Filas contrastadas hasta ahora, sumando las llamadas. */
  verificadas: number;
  coinciden: number;
  difieren: number;
  /** 🔴 Estas NO son «bien»: son las que no se pudieron juzgar. */
  noVerificables: number;
  llamadas: number;
  /** Cuántas quedan por mirar según la última respuesta del servidor. */
  restantes: number;
}

export interface ResultadoVerificacionCompleta extends ProgresoDeVerificacion {
  /**
   * El detalle de TODAS las vueltas, con lo que difiere primero.
   *
   * Se topa acá también: un lote entero de diferencias no cabe en una
   * pantalla, y guardarlo todo en memoria para no mostrarlo no ayuda a nadie.
   * Los CONTADORES de arriba sí son completos — ésos son el número honesto.
   */
  veredictos: VeredictoDeFila[];
  /** `true` cuando hubo más diferencias de las que se muestran. */
  veredictosTruncados: boolean;
  /**
   * Si el veredicto quedó GUARDADO en el servidor. `false` = la migración de
   * base todavía no se aplicó: los números son ciertos, pero se pierden al
   * recargar la página.
   */
  guardado: boolean;
  /** El último seguro contra un back que nunca diga `terminado`. */
  detenidoPorLimite: boolean;
  /** El cursor no avanzó: se corta y se dice, en vez de girar para siempre. */
  detenidoSinAvance: boolean;
  /** La persona tocó «Detener»: se paró después de la llamada en curso. */
  detenidoPorPersona: boolean;
}

/** Mismo tope y misma razón que en la reconciliación. */
const MAX_LLAMADAS = 1_000;

/** Cuántos veredictos con detalle se conservan para la pantalla. */
export const MAX_VEREDICTOS_MOSTRADOS = 200;

/** Lo que difiere primero; después lo que no se pudo verificar. */
function peso(veredicto: VeredictoDeFila['veredicto']): number {
  if (veredicto === 'difiere') return 0;
  if (veredicto === 'no_verificable') return 1;
  return 2;
}

export async function verificarLoteCompleto(
  lote: string | undefined,
  verificar: (
    lote: string | undefined,
    desdeFila: number,
  ) => Promise<ResultadoDeVerificacion>,
  onProgreso?: (progreso: ProgresoDeVerificacion) => void,
  opciones: { debeParar?: () => boolean } = {},
): Promise<ResultadoVerificacionCompleta> {
  let desdeFila = 0;
  const acumulado: ProgresoDeVerificacion = {
    verificadas: 0,
    coinciden: 0,
    difieren: 0,
    noVerificables: 0,
    llamadas: 0,
    restantes: 0,
  };
  let recogidos: VeredictoDeFila[] = [];
  let truncadosPorElBack = false;
  let guardado = true;

  const cerrar = (
    extra: Partial<
      Pick<
        ResultadoVerificacionCompleta,
        'detenidoPorLimite' | 'detenidoSinAvance' | 'detenidoPorPersona'
      >
    >,
  ): ResultadoVerificacionCompleta => {
    const ordenados = [...recogidos].sort(
      (a, b) => peso(a.veredicto) - peso(b.veredicto) || a.fila - b.fila,
    );
    return {
      ...acumulado,
      veredictos: ordenados.slice(0, MAX_VEREDICTOS_MOSTRADOS),
      veredictosTruncados:
        truncadosPorElBack || ordenados.length > MAX_VEREDICTOS_MOSTRADOS,
      guardado,
      detenidoPorLimite: false,
      detenidoSinAvance: false,
      detenidoPorPersona: false,
      ...extra,
    };
  };

  for (;;) {
    const r = await verificar(lote, desdeFila);
    acumulado.llamadas += 1;
    acumulado.verificadas += r.verificadas;
    acumulado.coinciden += r.coinciden;
    acumulado.difieren += r.difieren;
    acumulado.noVerificables += r.noVerificables;
    acumulado.restantes = r.restantes ?? 0;
    recogidos = recogidos.concat(r.veredictos ?? []);
    if (r.veredictosTruncados === true) truncadosPorElBack = true;
    // Basta que UNA vuelta no haya podido guardar para que el lote no esté
    // guardado: decir que sí porque las otras pudieron sería mentir.
    if (r.guardado === false) guardado = false;
    onProgreso?.({ ...acumulado });

    if (opciones.debeParar?.() === true)
      return cerrar({ detenidoPorPersona: true });
    if (r.terminado === true || r.verificadas === 0) return cerrar({});
    if (typeof r.ultimaFila !== 'number' || r.ultimaFila < desdeFila) {
      return cerrar({ detenidoSinAvance: true });
    }
    // `+ 1` porque el back mira las filas con número MAYOR O IGUAL a
    // `desdeFila`: sin el uno, la última fila de cada vuelta se verificaría
    // dos veces y el bucle no avanzaría en un lote de una sola fila.
    desdeFila = r.ultimaFila + 1;
    if (acumulado.llamadas >= MAX_LLAMADAS)
      return cerrar({ detenidoPorLimite: true });
  }
}
