/**
 * submitMandatosLote — creates the mandate for a whole batch of just-imported
 * properties, publishing each one afterwards (T-0030 WU-3 Slice A / R1,
 * WU-4, contract.md §3.4 amendment A-1.1).
 *
 * Two entry points, ONE loop:
 *
 *   - `submitMandatosLote(inmuebles, values)` — one shared set of terms for
 *     every property («Mismo propietario para todos»). Unchanged signature.
 *   - `submitMandatosPorInmueble(asignaciones)` — each property carries its
 *     own terms («Uno por uno», Nico 2026-09-02: «si importo 100 inmuebles
 *     debería poder decidir para CADA inmueble quién es el propietario»).
 *
 * Both return the same `MandatoLoteResult`, so the dialog's summary and
 * `StepConfirmImport.onDone` do not care which mode produced it.
 *
 * Delegates the per-property "mandate, then publish" outcome to
 * `completeMandatoAndPublish` (T-0030 WU-2/WU-4,
 * `CompletarMandatoDialog.tsx`) — the ordering rule (mandate first, publish
 * only on success, 409 counts as success, a failed publish never rolls back
 * a good mandate) lives in exactly one place and is identical for both
 * completion paths. There is no batch-specific wire shape or publish logic
 * here, only the loop and the outcome bookkeeping.
 *
 * Runs sequentially, not in parallel: a batch mandate assignment is not on
 * the hot path the way geocoding 200 rows is (StepConfirmImport.tsx already
 * throttles that one), and sequential keeps "which one failed" unambiguous
 * without extra bookkeeping.
 */

import {
  completeMandatoAndPublish,
  type MandatoFormValues,
  type MandatoOutcome,
} from '@/components/inmobiliaria/CompletarMandatoDialog';
import type { InmuebleSinConsignacion } from '@/lib/types/inmobiliaria';

/** @deprecated kept as an alias — use `MandatoOutcome` directly. */
export type MandatoLoteOutcome = MandatoOutcome;

export interface MandatoLoteResult {
  outcomes: MandatoLoteOutcome[];
  /** created + alreadyExists — both leave the property WITH a mandate. */
  succeededCount: number;
  failedCount: number;
  /** Of the succeeded ones, how many also got PATCHed to AVAILABLE. */
  publishedCount: number;
  /** succeededCount - publishedCount — mandate kept, publish failed. */
  publishFailedCount: number;
}

/**
 * One property with the terms it gets. `values.propietarioId` MUST already
 * be a persisted id (never a `new-*` temp id): persisting a new owner is the
 * dialog's job (`persistPropietarioIfNeeded`), done once per owner even when
 * several rows chose the same new one.
 */
export interface AsignacionDeMandato {
  inmueble: InmuebleSinConsignacion;
  values: MandatoFormValues;
}

export async function submitMandatosPorInmueble(
  asignaciones: readonly AsignacionDeMandato[],
): Promise<MandatoLoteResult> {
  const outcomes: MandatoLoteOutcome[] = [];

  for (const { inmueble, values } of asignaciones) {
    outcomes.push(await completeMandatoAndPublish(inmueble, values));
  }

  const failedCount = outcomes.filter((o) => o.status === 'failed').length;
  const succeededCount = outcomes.length - failedCount;
  const publishedCount = outcomes.filter((o) => o.published).length;

  return {
    outcomes,
    succeededCount,
    failedCount,
    publishedCount,
    publishFailedCount: succeededCount - publishedCount,
  };
}

export async function submitMandatosLote(
  inmuebles: InmuebleSinConsignacion[],
  values: MandatoFormValues,
): Promise<MandatoLoteResult> {
  return submitMandatosPorInmueble(inmuebles.map((inmueble) => ({ inmueble, values })));
}
