/**
 * activarContratosCompleto — recorre `POST /contracts/migrar/activar` hasta
 * que el back dice que no queda nada.
 *
 * 🔴 Nico, 2026-09-12: «el activar contratos también puede tomar mucho tiempo,
 * debemos colocar una progress bar real que muestre porcentaje y tiempo».
 *
 * Para que exista una barra, la llamada tiene que volver. Desde el 2026-09-12
 * el back corta por reloj (`PRESUPUESTO_DE_ACTIVACION_DE_CONTRATOS_MS`) y
 * devuelve `restantes`; este bucle da la vuelta entera y va informando.
 *
 * Espejo exacto de `activarLoteCompleto` (inmuebles), y por las mismas
 * razones, que se pagaron caras el 2026-09-10: un lote de 1.240 filas se dio
 * por atascado porque la cuarta llamada nunca volvió.
 */

import type { ResumenActivacion } from '@/lib/api/contracts.service';

export interface ProgresoDeContratos {
  /**
   * Filas PROCESADAS hasta ahora, sumando las llamadas.
   *
   * Es lo que mide la barra, y es a propósito más ancho que «activadas»:
   * crear, enlazar a un contrato que ya existía, fallar y quedar frenada son
   * las cuatro formas de sacar una fila del pendiente, y las cuatro avanzan.
   * Una barra que contara sólo los éxitos se quedaría corta para siempre en
   * un lote con filas incompletas.
   */
  hechas: number;
  /** De ésas, contratos efectivamente creados. */
  activadas: number;
  /** De ésas, las que no se pudieron crear. */
  fallidas: number;
  /** Cuántas quedan, según la última llamada. */
  restantes: number;
  llamadas: number;
}

export interface ResultadoDeContratos extends ProgresoDeContratos {
  /** El resumen de la ÚLTIMA llamada: es el que la pantalla ya sabe pintar. */
  ultimo: ResumenActivacion;
  /** La persona tocó «Detener»: se paró después de la tanda en curso. */
  detenidoPorPersona: boolean;
  /** Una vuelta no movió ninguna fila: insistir haría exactamente lo mismo. */
  detenidoSinAvance: boolean;
  /** El último seguro contra un back que diga «quedan» para siempre. */
  detenidoPorLimite: boolean;
}

/** Mismo techo que inmuebles: ~10 filas por llamada contra la base remota. */
const MAX_LLAMADAS = 1_000;

export async function activarContratosCompleto(
  activar: () => Promise<ResumenActivacion>,
  onProgreso?: (p: ProgresoDeContratos) => void,
  opciones: { debeParar?: () => boolean } = {},
): Promise<ResultadoDeContratos> {
  let hechas = 0;
  let activadas = 0;
  let fallidas = 0;
  let llamadas = 0;

  for (;;) {
    const r = await activar();
    llamadas += 1;
    hechas += r.intentadas;
    activadas += r.activadas;
    fallidas += r.fallidas;

    const progreso: ProgresoDeContratos = {
      hechas,
      activadas,
      fallidas,
      restantes: r.restantes ?? 0,
      llamadas,
    };
    onProgreso?.(progreso);

    const salir = (
      extra: Partial<Pick<ResultadoDeContratos, 'detenidoPorPersona' | 'detenidoSinAvance' | 'detenidoPorLimite'>>,
    ): ResultadoDeContratos => ({
      ...progreso,
      ultimo: r,
      detenidoPorPersona: false,
      detenidoSinAvance: false,
      detenidoPorLimite: false,
      ...extra,
    });

    /*
     * Un back viejo no manda `restantes`. Ausente ⇒ 0 ⇒ una sola vuelta, que
     * es exactamente el comportamiento de siempre: nunca se asume que queda
     * trabajo por un campo que no vino.
     */
    if ((r.restantes ?? 0) <= 0) return salir({});

    // La persona pidió parar: se respeta después de la tanda en curso. Lo que
    // esa tanda activó ya está activado — el back no deshace contratos.
    if (opciones.debeParar?.() === true) return salir({ detenidoPorPersona: true });

    /*
     * ¿Esta llamada movió algo? `intentadas` es exactamente «filas que esta
     * llamada procesó», sin importar cómo terminaron. Si es cero y el back
     * dice que quedan, la siguiente llamada haría lo mismo.
     */
    if (r.intentadas === 0) return salir({ detenidoSinAvance: true });

    if (llamadas >= MAX_LLAMADAS) return salir({ detenidoPorLimite: true });
  }
}
