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

/**
 * Lo que va pasando mientras corre el loop, llamada por llamada.
 *
 * 🔴 Existe porque el 2026-09-11 Nico miró «Activando…» girando durante
 * cinco minutos y preguntó si se había dañado. No se había dañado: iban
 * 1.809 de 2.824 a 40 por minuto. Pero un botón que sólo gira no puede
 * decirlo, y una espera de 40 minutos sin un número es indistinguible de
 * un cuelgue.
 */
export interface ProgresoDeActivacion {
  /** Inmuebles creados hasta ahora, sumando las llamadas. */
  activados: number;
  /** Filas que ya tenían su inmueble y se re-apuntaron (cuentan como hechas). */
  reusados: number;
  /** Filas que en el momento de crear resultaron con algo pendiente. */
  omitidas: number;
  /** Cuántas siguen LISTO en el lote, según la última llamada. */
  restantes: number;
  llamadas: number;
}

export interface ResultadoActivacionCompleta {
  activados: number;
  /**
   * 🔴 Filas cuyo inmueble YA EXISTÍA (mismo «Código») y se re-apuntaron en
   * vez de duplicarlo.
   *
   * Cuenta aparte de `activados`, y tiene que llegar hasta la pantalla. Nico,
   * 2026-09-11: «¿por qué dices que se importaron 679 propiedades si le subí
   * 2800 y algo?». Porque 2.145 de esas 2.824 filas ya tenían su inmueble —de
   * la carga anterior— y sólo 679 eran nuevas. Las dos cosas son ciertas y
   * decir sólo la primera hace ver una importación de 2.824 como un fracaso
   * de 679.
   */
  reusados: number;
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
  /**
   * La persona tocó «Detener» (o se fue del paso): se paró DESPUÉS de la
   * llamada en curso. Lo que esa llamada activó ya está activado — el back no
   * deshace tandas— y volver a tocar «Activar» sigue donde quedó.
   */
  detenidoPorPersona: boolean;
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
  onProgreso?: (progreso: ProgresoDeActivacion) => void,
  opciones: { debeParar?: () => boolean } = {},
): Promise<ResultadoActivacionCompleta> {
  let activados = 0;
  let reusados = 0;
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
    reusados += r.reusados ?? 0;
    omitidas.push(...r.omitidas);
    onProgreso?.({
      activados,
      reusados,
      omitidas: omitidas.length,
      restantes: r.restantes,
      llamadas,
    });

    if (r.restantes <= 0) {
      return {
        activados,
        reusados,
        omitidas,
        llamadas,
        detenidoPorLimite: false,
        detenidoSinAvance: false,
        detenidoPorPersona: false,
      };
    }

    // La persona pidió parar: se respeta después de la llamada en curso (una
    // tanda no se deshace, y lo que activó ya está activado).
    if (opciones.debeParar?.() === true) {
      return {
        activados,
        reusados,
        omitidas,
        llamadas,
        detenidoPorLimite: false,
        detenidoSinAvance: false,
        detenidoPorPersona: true,
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
        reusados,
        omitidas,
        llamadas,
        detenidoPorLimite: false,
        detenidoSinAvance: true,
        detenidoPorPersona: false,
      };
    }

    if (llamadas >= MAX_LLAMADAS) {
      return {
        activados,
        reusados,
        omitidas,
        llamadas,
        detenidoPorLimite: true,
        detenidoSinAvance: false,
        detenidoPorPersona: false,
      };
    }
  }
}
