/**
 * Zod schema for the wizard's `agency` step form.
 *
 * Mirrors `OnboardingSessionAgencyRequest` / `OnboardingSessionAgencyAddress`
 * (src/lib/api/generated/agent.ts) field-for-field. Validated on submit inside
 * `AgencyStepForm` (react-hook-form holds the field state; zod is the single
 * source of truth for validation rules — same pattern as `ThresholdEditor`).
 */
import { z } from 'zod'
import type { OnboardingSessionAgencyRequest } from '@/lib/api/generated/agency'

export const agencyStepSchema = z.object({
  legalName: z.string().trim().min(1, 'La razón social es obligatoria.'),
  nit: z.string().trim().min(1, 'El NIT es obligatorio.'),
  address: z.object({
    calle: z.string().trim().min(1, 'La calle es obligatoria.'),
    ciudad: z.string().trim().min(1, 'La ciudad es obligatoria.'),
    departamento: z.string().trim().min(1, 'El departamento es obligatorio.'),
    codigoPostal: z.string().trim().optional(),
  }),
  primaryContactEmail: z.string().trim().min(1, 'El correo es obligatorio.').email('Ingresa un correo válido.'),
  primaryContactPhone: z.string().trim().min(7, 'Ingresa un teléfono válido.'),
  billingModel: z.enum(['standard', 'performance', 'hybrid'], {
    errorMap: () => ({ message: 'Selecciona un modelo de facturación.' }),
  }),
})

export type AgencyStepFormValues = z.infer<typeof agencyStepSchema>

export const AGENCY_STEP_DEFAULT_VALUES: AgencyStepFormValues = {
  legalName: '',
  nit: '',
  address: { calle: '', ciudad: '', departamento: '', codigoPostal: '' },
  primaryContactEmail: '',
  primaryContactPhone: '',
  billingModel: 'standard',
}

export const BILLING_MODEL_OPTIONS: { value: AgencyStepFormValues['billingModel']; label: string }[] = [
  { value: 'standard', label: 'Estándar' },
  { value: 'performance', label: 'Por desempeño' },
  { value: 'hybrid', label: 'Híbrido' },
]

/** Drops the empty-string `codigoPostal` so it's omitted, not sent as `''`. */
export function toAgencyRequest(values: AgencyStepFormValues): OnboardingSessionAgencyRequest {
  const { calle, ciudad, departamento, codigoPostal } = values.address
  return {
    legalName: values.legalName,
    nit: values.nit,
    address: {
      calle,
      ciudad,
      departamento,
      ...(codigoPostal ? { codigoPostal } : {}),
    },
    primaryContactEmail: values.primaryContactEmail,
    primaryContactPhone: values.primaryContactPhone,
    billingModel: values.billingModel,
  }
}
