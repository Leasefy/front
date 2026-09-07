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

/**
 * Los países que ofrece el `PhoneInput` de cadence, con cuántos dígitos tiene
 * un número nacional (sin el indicativo) en cada uno. Pedido de Nico
 * (2026-09-07): «que sepamos máximos y mínimos del número».
 *
 * Son los largos del plan de numeración de cada país, no una adivinanza:
 * Colombia unificó a 10 dígitos (fijos con «60x») en 2021; Argentina va de
 * 10 a 11 porque el «9» del celular a veces se escribe y a veces no; Perú y
 * Ecuador tienen fijos de 8 y celulares de 9.
 */
export const LARGO_DEL_TELEFONO: Record<string, { min: number; max: number; nombre: string }> = {
  CO: { min: 10, max: 10, nombre: 'Colombia' },
  US: { min: 10, max: 10, nombre: 'Estados Unidos' },
  MX: { min: 10, max: 10, nombre: 'México' },
  AR: { min: 10, max: 11, nombre: 'Argentina' },
  CL: { min: 9, max: 9, nombre: 'Chile' },
  PE: { min: 8, max: 9, nombre: 'Perú' },
  EC: { min: 8, max: 9, nombre: 'Ecuador' },
  ES: { min: 9, max: 9, nombre: 'España' },
}

/**
 * Sólo los dígitos, sin el «0» de troncal con el que en Argentina y Ecuador la
 * gente escribe su propio número («011 4…», «099…»): ése no viaja con el
 * indicativo y no cuenta para el largo.
 */
export function digitosDelTelefono(valor: string, pais: string): string {
  const digitos = valor.replace(/\D/g, '')
  return (pais === 'AR' || pais === 'EC') && digitos.startsWith('0') ? digitos.slice(1) : digitos
}

/** Cuántos dígitos se esperan, para decirlo debajo del campo. */
export function pistaDelTelefono(pais: string): string {
  const regla = LARGO_DEL_TELEFONO[pais]
  if (!regla) return 'Sin el indicativo del país.'
  return regla.min === regla.max
    ? `${regla.min} dígitos, sin el indicativo.`
    : `Entre ${regla.min} y ${regla.max} dígitos, sin el indicativo.`
}

/** El mensaje de error del teléfono para ese país, o `null` si está bien. */
export function errorDelTelefono(valor: string, pais: string): string | null {
  const digitos = digitosDelTelefono(valor, pais)
  const regla = LARGO_DEL_TELEFONO[pais]
  if (!regla) {
    // Un país que no está en la tabla: el rango de E.164 y nada más.
    return digitos.length >= 7 && digitos.length <= 15 ? null : 'Ingresa un teléfono válido.'
  }
  if (digitos.length >= regla.min && digitos.length <= regla.max) return null
  const cuantos =
    regla.min === regla.max ? `${regla.min} dígitos` : `entre ${regla.min} y ${regla.max} dígitos`
  return `Un número de ${regla.nombre} tiene ${cuantos}; este tiene ${digitos.length}.`
}

const camposDelPaso = z.object({
  legalName: z.string().trim().min(1, 'La razón social es obligatoria.'),
  nit: z.string().trim().min(1, 'El NIT es obligatorio.'),
  address: z.object({
    // `calle` (contract key) is surfaced to the user as "Dirección"; `ciudad`
    // as "Municipio". The keys stay as the agent contract defines them.
    calle: z.string().trim().min(1, 'La dirección es obligatoria.'),
    ciudad: z.string().trim().min(1, 'El municipio es obligatorio.'),
    departamento: z.string().trim().min(1, 'El departamento es obligatorio.'),
    codigoPostal: z.string().trim().optional(),
  }),
  primaryContactEmail: z.string().trim().min(1, 'El correo es obligatorio.').email('Ingresa un correo válido.'),
  primaryContactPhone: z.string().trim().min(1, 'El teléfono es obligatorio.'),
  /**
   * El país del selector del teléfono. No viaja al agente: el contrato lleva
   * el número sin indicativo, como siempre. Está acá para validar el largo.
   */
  primaryContactCountry: z.string().default('CO'),
})

export const agencyStepSchema = camposDelPaso.superRefine((valores, ctx) => {
  // Vacío ya lo dijo el `min(1)`; acá sólo el largo del número que sí escribió.
  if (!valores.primaryContactPhone) return
  const mensaje = errorDelTelefono(valores.primaryContactPhone, valores.primaryContactCountry)
  if (mensaje) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['primaryContactPhone'], message: mensaje })
  }
})

export type AgencyStepFormValues = z.infer<typeof agencyStepSchema>

export const AGENCY_STEP_DEFAULT_VALUES: AgencyStepFormValues = {
  legalName: '',
  nit: '',
  address: { calle: '', ciudad: '', departamento: '', codigoPostal: '' },
  primaryContactEmail: '',
  primaryContactPhone: '',
  primaryContactCountry: 'CO',
}

/**
 * Drops the empty-string `codigoPostal` so it's omitted, not sent as `''`.
 * `billingModel` is required by the agent contract but no longer user-facing,
 * so it is always sent as `'standard'`.
 */
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
    billingModel: 'standard',
  }
}
