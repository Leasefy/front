/**
 * Zod schema for the wizard's `habeas_data` step form.
 *
 * Unlike the other steps, this one does NOT map 1:1 to a single request type
 * — the flow spans 3 agent calls (presign → S3 PUT → confirm), so the schema
 * only validates what the USER supplies: the signed PDF file plus the two
 * signer-identity fields (`signedByFullName`, `signedByCedula`). `s3Key` and
 * `sha256` are derived at submit time (see `HabeasDataStepForm.tsx`), not
 * user input, so they aren't part of this schema.
 *
 * Same pattern as `policy-step-schema.ts` / `payment-provider-step-schema.ts`
 * — react-hook-form holds the field state, zod is the single source of truth
 * for validation, validated on submit.
 */
import { z } from 'zod'
import type {
  OnboardingSessionHabeasDataConfirmRequest,
  OnboardingSessionHabeasDataPresignRequest,
} from '@/lib/api/generated/agency'

/** Enforced client-side BEFORE the presign call — the S3 PUT itself does not enforce a size limit. */
export const HABEAS_DATA_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export const habeasDataStepSchema = z.object({
  file: z
    .custom<File>((value) => value instanceof File, { message: 'Selecciona el PDF firmado.' })
    .refine((file) => file.type === 'application/pdf', {
      message: 'El archivo debe ser un PDF.',
    })
    .refine((file) => file.size <= HABEAS_DATA_MAX_FILE_SIZE_BYTES, {
      message: 'El archivo no puede superar 10MB.',
    }),
  signedByFullName: z.string().trim().min(1, 'El nombre completo del firmante es obligatorio.'),
  signedByCedula: z.string().trim().min(1, 'La cédula del firmante es obligatoria.'),
})

export type HabeasDataStepFormValues = z.infer<typeof habeasDataStepSchema>

export const HABEAS_DATA_STEP_DEFAULT_VALUES: HabeasDataStepFormValues = {
  file: null as unknown as File,
  signedByFullName: '',
  signedByCedula: '',
}

export function toHabeasDataPresignRequest(
  values: HabeasDataStepFormValues,
): OnboardingSessionHabeasDataPresignRequest {
  return {
    fileName: values.file.name,
    contentType: 'application/pdf',
    fileSize: values.file.size,
  }
}

export function toHabeasDataConfirmRequest(
  values: HabeasDataStepFormValues,
  s3Key: string,
  sha256: string,
): OnboardingSessionHabeasDataConfirmRequest {
  return {
    s3Key,
    sha256,
    signedByFullName: values.signedByFullName,
    signedByCedula: values.signedByCedula,
  }
}
