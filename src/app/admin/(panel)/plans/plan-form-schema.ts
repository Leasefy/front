/**
 * Zod schema + mappers for the admin plan create/edit form.
 *
 * Validation runs via a MANUAL `schema.safeParse(values)` on submit (same
 * pattern as `agency-step-schema.ts` + `AgencyStepForm`) — NOT zodResolver.
 * Form state holds every field as a string (or boolean) so the raw input is
 * never coerced behind the user's back; the mappers below convert to the
 * numeric backend body only after validation passes.
 *
 * Notes on the contract (contrato 29):
 *   - `slug` is optional on create (backend autogenerates from name) and
 *     immutable after — the edit form never sends it.
 *   - `level` is a computed/response-only field: it is NOT in the POST/PATCH
 *     body, so it is not part of this form.
 *   - `billingMode` governs which price inputs matter: FLAT charges
 *     monthly/annual (usageFeeBps forced 0); USAGE_CANON charges a % of canon
 *     (`usageFeeBps`, entered as % ×100) and monthly/annual are forced 0.
 */
import { z } from 'zod'
import type {
  AdminPlan,
  AdminCreatePlanBody,
  AdminUpdatePlanBody,
  AgencyBillingMode,
} from '@/lib/admin/plans'

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const INT_RE = /^-?\d+$/
const UINT_RE = /^\d+$/
const DECIMAL_RE = /^\d+(\.\d+)?$/

export const planFormSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio.'),
    slug: z.string().trim(),
    description: z.string().trim(),
    monthlyPrice: z.string().trim(),
    annualPrice: z.string().trim(),
    scoringViewPrice: z.string().trim(),
    evaluationCreditPrice: z.string().trim(),
    maxProperties: z.string().trim(),
    maxUsers: z.string().trim(),
    maxScoringViews: z.string().trim(),
    monthlyEvalCap: z.string().trim(),
    monthlyCreditGrant: z.string().trim(),
    billingMode: z.enum(['FLAT', 'USAGE_CANON']),
    usageFeePct: z.string().trim(),
    scoringIncluded: z.boolean(),
    hasPremiumScoring: z.boolean(),
    hasApiAccess: z.boolean(),
    isDefault: z.boolean(),
  })
  .superRefine((v, ctx) => {
    // slug is optional; when present it must be a lowercase-kebab slug.
    if (v.slug && !SLUG_RE.test(v.slug)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['slug'],
        message: 'Slug inválido: minúsculas, números y guiones (ej. flex-pro).',
      })
    }

    const price = (key: keyof typeof v, label: string) => {
      const raw = String(v[key])
      if (raw === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${label} es obligatorio.` })
        return
      }
      if (!UINT_RE.test(raw)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${label} debe ser un entero en pesos (>= 0).` })
      }
    }

    const limit = (key: keyof typeof v, label: string) => {
      const raw = String(v[key])
      if (raw === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${label} es obligatorio.` })
        return
      }
      if (!INT_RE.test(raw)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${label} debe ser un entero.` })
        return
      }
      if (Number(raw) < -1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${label} no puede ser menor que -1.` })
      }
    }

    const uint = (key: keyof typeof v, label: string) => {
      const raw = String(v[key])
      if (raw === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${label} es obligatorio.` })
        return
      }
      if (!UINT_RE.test(raw)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${label} debe ser un entero >= 0.` })
      }
    }

    // Prices that exist regardless of billing mode.
    price('scoringViewPrice', 'El precio de scoring view')
    price('evaluationCreditPrice', 'El precio del crédito de evaluación')
    uint('monthlyCreditGrant', 'El bono mensual de créditos')

    // Limits (sentinels -1/0/N).
    limit('maxProperties', 'El máximo de propiedades')
    limit('maxUsers', 'El máximo de usuarios')
    limit('maxScoringViews', 'El máximo de scoring views')
    limit('monthlyEvalCap', 'El tope mensual de evaluaciones')

    if (v.billingMode === 'FLAT') {
      price('monthlyPrice', 'El precio mensual')
      price('annualPrice', 'El precio anual')
    } else {
      // USAGE_CANON: monthly/annual are forced 0; the % of canon is required.
      if (v.usageFeePct === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['usageFeePct'], message: 'El % de canon es obligatorio en modo USAGE_CANON.' })
      } else if (!DECIMAL_RE.test(v.usageFeePct)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['usageFeePct'], message: 'El % de canon debe ser un número >= 0 (ej. 1.5).' })
      }
    }
  })

export type PlanFormValues = z.infer<typeof planFormSchema>

export const PLAN_FORM_DEFAULTS: PlanFormValues = {
  name: '',
  slug: '',
  description: '',
  monthlyPrice: '0',
  annualPrice: '0',
  scoringViewPrice: '0',
  evaluationCreditPrice: '0',
  maxProperties: '0',
  maxUsers: '0',
  maxScoringViews: '0',
  monthlyEvalCap: '0',
  monthlyCreditGrant: '0',
  billingMode: 'FLAT',
  usageFeePct: '0',
  scoringIncluded: false,
  hasPremiumScoring: false,
  hasApiAccess: false,
  isDefault: false,
}

/** Seeds the form from an existing plan (edit mode). */
export function planToFormValues(plan: AdminPlan): PlanFormValues {
  return {
    name: plan.name,
    slug: plan.tier,
    description: plan.description ?? '',
    monthlyPrice: String(plan.monthlyPrice),
    annualPrice: String(plan.annualPrice),
    scoringViewPrice: String(plan.scoringViewPrice),
    evaluationCreditPrice: String(plan.evaluationCreditPrice),
    maxProperties: String(plan.maxProperties),
    maxUsers: String(plan.maxUsers),
    maxScoringViews: String(plan.maxScoringViews),
    monthlyEvalCap: String(plan.monthlyEvalCap),
    monthlyCreditGrant: String(plan.monthlyCreditGrant),
    billingMode: plan.billingMode,
    usageFeePct: String(plan.usageFeeBps / 100),
    scoringIncluded: plan.scoringIncluded,
    hasPremiumScoring: plan.hasPremiumScoring,
    hasApiAccess: plan.hasApiAccess,
    isDefault: plan.isDefault,
  }
}

const int = (s: string): number => Math.trunc(Number(s))

/** Fields shared by create and update bodies (everything except slug/planType). */
function commonBody(v: PlanFormValues) {
  const usageCanon = v.billingMode === 'USAGE_CANON'
  const billingMode: AgencyBillingMode = v.billingMode
  return {
    name: v.name.trim(),
    ...(v.description.trim() ? { description: v.description.trim() } : {}),
    monthlyPrice: usageCanon ? 0 : int(v.monthlyPrice),
    annualPrice: usageCanon ? 0 : int(v.annualPrice),
    scoringViewPrice: int(v.scoringViewPrice),
    evaluationCreditPrice: int(v.evaluationCreditPrice),
    maxProperties: int(v.maxProperties),
    maxUsers: int(v.maxUsers),
    maxScoringViews: int(v.maxScoringViews),
    monthlyEvalCap: int(v.monthlyEvalCap),
    monthlyCreditGrant: int(v.monthlyCreditGrant),
    billingMode,
    usageFeeBps: usageCanon ? Math.round(Number(v.usageFeePct) * 100) : 0,
    scoringIncluded: v.scoringIncluded,
    hasPremiumScoring: v.hasPremiumScoring,
    hasApiAccess: v.hasApiAccess,
    isDefault: v.isDefault,
  }
}

/** Builds the POST body. `planType` is always 'AGENCY'; slug is sent only when typed. */
export function toCreatePlanBody(v: PlanFormValues): AdminCreatePlanBody {
  return {
    planType: 'AGENCY',
    ...(v.slug.trim() ? { slug: v.slug.trim() } : {}),
    ...commonBody(v),
  }
}

/** Builds the PATCH body — no slug/tier/planType (backend rejects them). */
export function toUpdatePlanBody(v: PlanFormValues): AdminUpdatePlanBody {
  return commonBody(v)
}
