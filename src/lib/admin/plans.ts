/**
 * plans.ts (admin) — CRUD over the AGENCY subscription plan catalog (contrato 29
 * · planes dinámicos de inmobiliaria). Backend lives on the same host as the
 * back; `adminApi` prefixes `/api/v1/admin`.
 *
 * Contract (admin backend, `NEXT_PUBLIC_ADMIN_API_URL` + `/api/v1/admin`):
 *   GET    /plans?planType=AGENCY   → AdminPlan[]  (active AND inactive)
 *   GET    /plans/:id               → AdminPlan | 404
 *   POST   /plans                   → AdminPlan | 400 (bad config) | 409 (slug dup)
 *   PATCH  /plans/:id               → AdminPlan | 404 | 400
 *   DELETE /plans/:id               → 204; soft-delete (isActive=false, row kept)
 *
 * Backend error messages come in Spanish — surface them verbatim (adminApi
 * throws `ApiError` with `.message` already parsed from the error envelope).
 */

import { adminApi } from './api'
import type { AgencyBillingMode } from '@/lib/api/subscriptions.types'

export type { AgencyBillingMode }

export type PlanType = 'TENANT' | 'LANDLORD' | 'AGENCY'

/** Full response shape of a plan row (SubscriptionPlanResponseDto). */
export interface AdminPlan {
  id: string
  planType: PlanType
  /** slug lowercase-kebab, opaque, immutable after create. */
  tier: string
  name: string
  description?: string | null
  /** Position in the ladder; null = pay-per-use (Flex). */
  level?: number | null
  /** COP whole pesos, >= 0. */
  monthlyPrice: number
  annualPrice: number
  /** Sentinels: -1 = unlimited, 0 = none, N = cap. */
  maxProperties: number
  maxUsers: number
  maxScoringViews: number
  monthlyEvalCap: number
  monthlyCreditGrant: number
  billingMode: AgencyBillingMode
  /** Basis points; 100 = 1%. Relevant only when billingMode = USAGE_CANON. */
  usageFeeBps: number
  scoringIncluded: boolean
  hasPremiumScoring: boolean
  hasApiAccess: boolean
  scoringViewPrice: number
  evaluationCreditPrice: number
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * POST /plans body. `planType` is FIXED to 'AGENCY' (any other value → 400).
 * `slug` is optional (backend autogenerates from `name` when omitted) and
 * immutable once created.
 */
export interface AdminCreatePlanBody {
  name: string
  slug?: string
  planType: 'AGENCY'
  description?: string
  monthlyPrice: number
  annualPrice: number
  scoringViewPrice: number
  evaluationCreditPrice: number
  maxProperties: number
  maxUsers: number
  maxScoringViews: number
  monthlyEvalCap: number
  monthlyCreditGrant: number
  billingMode: AgencyBillingMode
  usageFeeBps: number
  scoringIncluded: boolean
  hasPremiumScoring: boolean
  hasApiAccess: boolean
  isDefault: boolean
}

/**
 * PATCH /plans/:id body. All optional — send only what changes. Does NOT accept
 * `slug`/`tier` or `planType` (backend rejects with forbidNonWhitelisted). Adds
 * `isActive` so a soft-deleted plan can be reactivated via PATCH `{isActive:true}`.
 */
export type AdminUpdatePlanBody = Partial<
  Omit<AdminCreatePlanBody, 'slug' | 'planType'>
> & {
  isActive?: boolean
}

const PATH = '/plans'

/** Lists the plan catalog (active AND inactive) for a plan type. */
export function listPlans(
  planType: PlanType = 'AGENCY',
  signal?: AbortSignal,
): Promise<AdminPlan[]> {
  return adminApi<AdminPlan[]>(PATH, { query: { planType }, signal })
}

/** Fetches a single plan by UUID. Throws `ApiError` 404 if it does not exist. */
export function getPlan(id: string, signal?: AbortSignal): Promise<AdminPlan> {
  return adminApi<AdminPlan>(`${PATH}/${id}`, { signal })
}

/** Creates a plan. Throws `ApiError` 400 (bad config) or 409 (slug duplicate). */
export function createPlan(body: AdminCreatePlanBody): Promise<AdminPlan> {
  return adminApi<AdminPlan>(PATH, { method: 'POST', body })
}

/** Edits a plan. Throws `ApiError` 404 / 400. */
export function updatePlan(
  id: string,
  body: AdminUpdatePlanBody,
): Promise<AdminPlan> {
  return adminApi<AdminPlan>(`${PATH}/${id}`, { method: 'PATCH', body })
}

/** Soft-deletes a plan (sets isActive=false; never removes the row). */
export function deletePlan(id: string): Promise<void> {
  return adminApi<void>(`${PATH}/${id}`, { method: 'DELETE' })
}
