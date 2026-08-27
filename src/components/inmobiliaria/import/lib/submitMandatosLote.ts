/**
 * submitMandatosLote — creates the mandate for a whole batch of just-imported
 * properties with ONE shared set of terms (T-0030 WU-3, Slice A / R1).
 *
 * Reuses `buildMandatoPayload` (T-0030 WU-2) as-is — the per-row omission
 * rules (ROOM, empty zone, null thumbnail, zero adminFee) are exactly the
 * same for a batch row as for the single-row completion dialog; there is no
 * batch-specific wire shape here, only the loop and the outcome bookkeeping.
 *
 * Runs sequentially, not in parallel: a batch mandate assignment is not on
 * the hot path the way geocoding 200 rows is (StepConfirmImport.tsx already
 * throttles that one), and sequential keeps "which one failed" unambiguous
 * without extra bookkeeping.
 */

import { ApiError } from '@/lib/api/client';
import { consignacionesApi } from '@/lib/api/inmobiliaria.service';
import { buildMandatoPayload, type MandatoFormValues } from '@/components/inmobiliaria/CompletarMandatoDialog';
import type { InmuebleSinConsignacion } from '@/lib/types/inmobiliaria';

export interface MandatoLoteOutcome {
  propertyId: string;
  propertyTitle: string;
  status: 'created' | 'alreadyExists' | 'failed';
  /** Present only when status === 'failed'. */
  errorMessage?: string;
}

export interface MandatoLoteResult {
  outcomes: MandatoLoteOutcome[];
  /** created + alreadyExists — both leave the property WITH a mandate. */
  succeededCount: number;
  failedCount: number;
}

export async function submitMandatosLote(
  inmuebles: InmuebleSinConsignacion[],
  values: MandatoFormValues,
): Promise<MandatoLoteResult> {
  const outcomes: MandatoLoteOutcome[] = [];

  for (const inmueble of inmuebles) {
    try {
      const payload = buildMandatoPayload(inmueble, values);
      // Same documented, contract-safe assertion CompletarMandatoDialog uses
      // for this exact payload shape (propertyZone/propertyType optional
      // here, required on ConsignacionFormData — toConsignacionPayload just
      // spreads whatever keys are present).
      await consignacionesApi.create(
        payload as unknown as Parameters<typeof consignacionesApi.create>[0],
      );
      outcomes.push({
        propertyId: inmueble.propertyId,
        propertyTitle: inmueble.propertyTitle,
        status: 'created',
      });
    } catch (error) {
      // contract.md T-0030 §3.3 — a duplicate mandate is success-equivalent:
      // the mandate exists, which is what the user wanted.
      if (error instanceof ApiError && error.status === 409) {
        outcomes.push({
          propertyId: inmueble.propertyId,
          propertyTitle: inmueble.propertyTitle,
          status: 'alreadyExists',
        });
        continue;
      }
      // A genuine failure — this property must NOT be reported as mandated.
      // It stays in the mandate-less list (WU-2's portfolio merge already
      // surfaces it with the "Falta mandato" alert); nothing here silently
      // upgrades it to "done".
      const errorMessage =
        error instanceof ApiError && error.messages
          ? error.messages.join(' · ')
          : error instanceof Error && error.message
            ? error.message
            : 'Error desconocido';
      outcomes.push({
        propertyId: inmueble.propertyId,
        propertyTitle: inmueble.propertyTitle,
        status: 'failed',
        errorMessage,
      });
    }
  }

  const failedCount = outcomes.filter((o) => o.status === 'failed').length;
  return {
    outcomes,
    succeededCount: outcomes.length - failedCount,
    failedCount,
  };
}
