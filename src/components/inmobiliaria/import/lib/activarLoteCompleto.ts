/**
 * activarLoteCompleto — drives `POST .../activar`'s resumable loop
 * (wu-4-report.md §6: "500 rows per call, resumable, nothing repeats —
 * call again while `restantes > 0`").
 *
 * Extracted as a pure function (the HTTP call is injected) so the loop
 * termination logic — the part most likely to hide a real bug behind a
 * "just click the button again" workaround — is unit-testable without a
 * network mock harness.
 */

import type { ResumenActivacionInmuebles, FilaOmitida } from '@/lib/api/inmuebles-importacion.service';

export interface ResultadoActivacionCompleta {
  activados: number;
  omitidas: FilaOmitida[];
  /** How many `activar()` calls this took — surfaced for diagnostics, never
   * used to decide correctness (that's `restantes === 0` alone). */
  llamadas: number;
  /** Safety net only: the back's own per-call cap (500 rows) makes this
   * astronomically unlikely to matter for a real import, but an infinite
   * loop from a backend bug must not hang the browser tab forever. */
  detenidoPorLimite: boolean;
  /**
   * Una llamada volvió con filas pendientes y sin haber movido NINGUNA.
   *
   * Es distinto del techo de llamadas: acá insistir no sirve de nada, porque
   * la siguiente llamada haría exactamente lo mismo. Se corta y se dice.
   */
  detenidoSinAvance: boolean;
}

/**
 * Techo duro de llamadas a `activar()` por importación.
 *
 * 🔴 Era 100, cuando el back cortaba por FILAS (500 por llamada) y 100
 * llamadas cubrían 50.000 filas. Desde el 2026-09-10 el back corta por TIEMPO
 * —`PRESUPUESTO_DE_ACTIVACION_MS`, 15 s— y eso cambia la cuenta por completo:
 * contra una base remota una fila cuesta ~1,4 s, así que entran ~11 por
 * llamada y un lote de 5.000 necesita ~450. Con el techo viejo, la
 * importación se habría rendido a la mitad.
 *
 * Este número ya no es lo que hace terminar el loop —para eso está
 * `detenidoSinAvance`, que corta en cuanto una llamada no mueve nada— sino el
 * último seguro contra un back que responda «quedan filas» para siempre.
 */
const MAX_LLAMADAS = 1_000;

/**
 * Un corte a mitad del loop — red caída, sesión vencida, 5xx — con lo que
 * SÍ alcanzó a pasar antes del corte. Sin esto, el error de la llamada 3
 * tiraba a la basura el conteo de las dos primeras y la pantalla sólo podía
 * decir «no pudimos activar», cuando la verdad era «activamos 1.000 y el
 * resto espera: reintenta y sigue donde quedó» (el back no repite filas).
 */
export class ActivacionInterrumpida extends Error {
  constructor(
    message: string,
    public readonly progreso: {
      activados: number;
      omitidas: FilaOmitida[];
      llamadas: number;
    },
    public readonly causa: unknown,
  ) {
    super(message);
    this.name = 'ActivacionInterrumpida';
  }
}

export async function activarLoteCompleto(
  lote: string,
  activar: (lote: string) => Promise<ResumenActivacionInmuebles>,
): Promise<ResultadoActivacionCompleta> {
  let activados = 0;
  const omitidas: FilaOmitida[] = [];
  let llamadas = 0;

  for (;;) {
    const omitidasAntes = omitidas.length;
    let r: ResumenActivacionInmuebles;
    try {
      r = await activar(lote);
    } catch (e) {
      throw new ActivacionInterrumpida(
        e instanceof Error && e.message ? e.message : 'No pudimos activar el lote.',
        { activados, omitidas, llamadas },
        e,
      );
    }
    llamadas += 1;
    activados += r.activados;
    omitidas.push(...r.omitidas);

    if (r.restantes <= 0) {
      return {
        activados,
        omitidas,
        llamadas,
        detenidoPorLimite: false,
        detenidoSinAvance: false,
      };
    }

    /*
     * ¿Esta llamada movió algo? Crear, reusar y omitir son las tres formas de
     * sacar una fila del estado LISTO. Si no pasó ninguna y todavía quedan
     * filas, la siguiente llamada haría lo mismo: insistir es colgar la
     * pestaña. Se corta acá y la pantalla lo dice.
     */
    const avanzo =
      r.activados > 0 ||
      (r.reusados ?? 0) > 0 ||
      omitidas.length > omitidasAntes;
    if (!avanzo) {
      return {
        activados,
        omitidas,
        llamadas,
        detenidoPorLimite: false,
        detenidoSinAvance: true,
      };
    }

    if (llamadas >= MAX_LLAMADAS) {
      return {
        activados,
        omitidas,
        llamadas,
        detenidoPorLimite: true,
        detenidoSinAvance: false,
      };
    }
  }
}
