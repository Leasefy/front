/**
 * Zod schema + mappers for the admin carrier create/edit form.
 *
 * Validation runs via a MANUAL `schema.safeParse(values)` on submit (same
 * pattern as `plan-form-schema.ts` / `agency-step-schema.ts`) — NOT
 * zodResolver. Form state holds every field as a string (or boolean) so the
 * raw input is never coerced behind the user's back; the mappers below
 * convert to the snake_case backend body only after validation passes.
 *
 * Credenciales (write-only, ALL-OR-NOTHING): `config_base_url` /
 * `config_username` / `config_password` viven SOLO en el form — nunca se
 * prellenan desde el backend (que jamás las devuelve). El micro re-encripta y
 * REEMPLAZA TODO el objeto `config` cuando se lo mandás; un `config` parcial
 * borraría las claves no enviadas. Por eso:
 *   - si el usuario deja los tres campos vacíos → el body no lleva `config`
 *     (el backend preserva las credenciales ya guardadas);
 *   - si el usuario llena los tres → el body lleva `config` completo;
 *   - si llena solo alguno (no los tres) → `safeParse` falla con un error en
 *     cada campo vacío, para que nunca se llegue a mandar un `config` parcial.
 */
import { z } from 'zod'
import type {
  CarrierRow,
  CarrierWriteBody,
  CarrierMode,
  CarrierProductType,
} from '@/lib/admin/cotizador'

const UINT_RE = /^\d+$/

export const CARRIER_MODES: CarrierMode[] = [
  'stub',
  'rest',
  'form-rpa',
  'email-broker',
  'open-finance',
]

export const CARRIER_PRODUCT_TYPES: CarrierProductType[] = ['seguro', 'fianza']

export const carrierFormSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio.'),
    route: z.string().trim().min(1, 'La ruta es obligatoria.'),
    display_name: z.string().trim(),
    product_type: z.enum(['seguro', 'fianza']),
    mode: z.enum(['stub', 'rest', 'form-rpa', 'email-broker', 'open-finance']),
    enabled: z.boolean(),
    priority: z.string().trim(),
    max_canon_cop: z.string().trim(),
    config_base_url: z.string().trim(),
    config_username: z.string().trim(),
    config_password: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.priority !== '' && !UINT_RE.test(v.priority)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priority'],
        message: 'La prioridad debe ser un entero >= 0.',
      })
    }
    if (v.max_canon_cop !== '' && !UINT_RE.test(v.max_canon_cop)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['max_canon_cop'],
        message: 'El canon máximo debe ser un entero en pesos (>= 0).',
      })
    }

    // Credenciales all-or-nothing: si el usuario tocó alguna, exigimos las tres
    // (se guardan/reemplazan como un solo bloque en el backend).
    const baseUrl = v.config_base_url.trim()
    const username = v.config_username.trim()
    const password = v.config_password.trim()
    const anyFilled = baseUrl !== '' || username !== '' || password !== ''
    const allFilled = baseUrl !== '' && username !== '' && password !== ''
    if (anyFilled && !allFilled) {
      const message = 'Para cambiar las credenciales, completá los tres campos (se guardan como un bloque).'
      if (baseUrl === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['config_base_url'], message })
      if (username === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['config_username'], message })
      if (password === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['config_password'], message })
    }
  })

export type CarrierFormValues = z.infer<typeof carrierFormSchema>

/**
 * Defaults del form. Prellenados con los valores de Fianly (el primer
 * carrier): el admin puede cambiar `name`/`route` si da de alta otro.
 */
export const CARRIER_FORM_DEFAULTS: CarrierFormValues = {
  name: 'fianly',
  route: 'direct',
  display_name: '',
  product_type: 'fianza',
  mode: 'rest',
  enabled: true,
  priority: '',
  max_canon_cop: '',
  config_base_url: '',
  config_username: '',
  config_password: '',
}

/** Seeds the form from an existing carrier (edit mode). Credenciales SIEMPRE vacías. */
export function carrierToFormValues(carrier: CarrierRow): CarrierFormValues {
  return {
    name: carrier.name,
    route: carrier.route,
    display_name: carrier.displayName ?? '',
    product_type: carrier.productType,
    mode: carrier.mode,
    enabled: carrier.enabled,
    priority: carrier.priority == null ? '' : String(carrier.priority),
    max_canon_cop: carrier.maxCanonCop == null ? '' : String(carrier.maxCanonCop),
    config_base_url: '',
    config_username: '',
    config_password: '',
  }
}

/**
 * Arma `config` SOLO cuando los tres campos están presentes (all-or-nothing:
 * el micro reemplaza todo el objeto). `undefined` en cualquier otro caso —
 * incluido "alguno pero no todos", que en la práctica nunca llega acá porque
 * el `superRefine` de arriba ya rechaza el `safeParse`; se deja así por las
 * dudas de que `buildConfig` se use con datos no validados.
 */
function buildConfig(v: CarrierFormValues): CarrierWriteBody['config'] {
  const base_url = v.config_base_url.trim()
  const username = v.config_username.trim()
  const password = v.config_password.trim()
  if (!base_url || !username || !password) return undefined
  return { base_url, username, password }
}

/** Campos compartidos por create y update (todo salvo `name`, inmutable). */
function commonCarrierBody(v: CarrierFormValues): Omit<CarrierWriteBody, 'name'> {
  const config = buildConfig(v)
  return {
    route: v.route.trim(),
    mode: v.mode,
    product_type: v.product_type,
    enabled: v.enabled,
    ...(v.display_name.trim() ? { display_name: v.display_name.trim() } : {}),
    ...(v.priority.trim() !== '' ? { priority: Math.trunc(Number(v.priority)) } : {}),
    ...(v.max_canon_cop.trim() !== ''
      ? { max_canon_cop: Math.trunc(Number(v.max_canon_cop)) }
      : {}),
    ...(config ? { config } : {}),
  }
}

/** Builds the POST body. */
export function toCreateCarrierBody(v: CarrierFormValues): CarrierWriteBody {
  return { name: v.name.trim(), ...commonCarrierBody(v) }
}

/** Builds the PATCH body — nunca manda `name` (slug inmutable). */
export function toUpdateCarrierBody(v: CarrierFormValues): CarrierWriteBody {
  return commonCarrierBody(v)
}
