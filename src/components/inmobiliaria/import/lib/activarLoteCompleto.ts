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
}

/** Hard ceiling on `activar()` calls per import. At 500 rows/call this
 * covers a 50,000-row batch — far beyond anything this UI's own import
 * flow can stage in one go. */
const MAX_LLAMADAS = 100;

/**
 * Un corte a mitad del loop — red caída, sesión vencida, 5xx — con lo que
 * SÍ alcanzó a pasar antes del corte. Sin esto, el error de la llamada 3
 * tiraba a la basura el conteo de las dos primeras y la pantalla sólo podía
 * decir «no pudimos activar», cuando la verdad era «activamos 1.000 y el
 * resto espera: reintentá y sigue donde quedó» (el back no repite filas).
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
      return { activados, omitidas, llamadas, detenidoPorLimite: false };
    }
    if (llamadas >= MAX_LLAMADAS) {
      return { activados, omitidas, llamadas, detenidoPorLimite: true };
    }
  }
}
