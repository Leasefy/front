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

export async function activarLoteCompleto(
  lote: string,
  activar: (lote: string) => Promise<ResumenActivacionInmuebles>,
): Promise<ResultadoActivacionCompleta> {
  let activados = 0;
  const omitidas: FilaOmitida[] = [];
  let llamadas = 0;

  for (;;) {
    const r = await activar(lote);
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
