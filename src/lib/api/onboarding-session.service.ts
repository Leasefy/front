/**
 * onboarding-session.service.ts — session-based onboarding wizard steps.
 *
 * The back starts the session (`POST /api/onboarding/start-session` or similar)
 * and returns `{ agentSessionId, tenantId }`. From there on, the whole wizard
 * talks DIRECTLY to the agent microservice with the user's Supabase JWT — no
 * back involvement, no magic-link token. Every step call hits:
 *
 *   ${NEXT_PUBLIC_AGENT_URL}/onboarding/session/{sessionId}/<step>
 *
 * Auth: `Authorization: Bearer <Supabase JWT>` via `agentFetch`
 * (`src/lib/api/agent-auth.ts`). Pattern mirrors the direct-fetch hooks
 * (`use-agent-work-items.ts`, `use-agreement-propose.ts`) rather than
 * `apiClient` — this is agent traffic, not back traffic.
 *
 * Error handling: every step can fail with a small, well-known set of status
 * codes shared across the whole wizard (see agent.ts:1221 onward). Each
 * function throws a typed `OnboardingSessionError` so callers can branch on
 * `.kind` instead of re-parsing status codes at every call site. The 409
 * response body is the `OnboardingSessionStepConflict` shape (`requiredStep`)
 * so the SPA can redirect the user to the step the session is actually on.
 */

import { VERSION_TERMINOS } from '@/lib/legal/versiones'
import {
  camposDelError,
  leerFallo,
  mensajeDeUnFalloNuestro,
  mensajeParaLaPersona,
  mensajeSinRespuesta,
  type CampoConError,
} from '@/lib/errores/traductor-de-errores'
import { agentFetch } from './agent-fetch'
import type {
  OnboardingSessionAgencyRequest,
  OnboardingSessionAgencyResponse,
  OnboardingSessionMembersRequest,
  OnboardingSessionMembersResponse,
  OnboardingSessionPaymentProviderRequest,
  OnboardingSessionPaymentProviderSkipRequest,
  OnboardingSessionPaymentProviderResponse,
  OnboardingSessionPolicyRequest,
  OnboardingSessionPolicyResponse,
  OnboardingSessionAcceptTermsResponse,
  OnboardingSessionCompleteResponse,
  OnboardingSessionResumeResponse,
  OnboardingSessionStepConflict,
} from './generated/agency'

// ── Error type ────────────────────────────────────────────────────────────

export type OnboardingSessionErrorKind =
  | 'validation' // 400 — malformed body (Zod)
  | 'unauthorized' // 401 — missing/invalid Supabase JWT
  | 'forbidden' // 403 — valid JWT but wrong identity / unanchored / completed session
  | 'notFound' // 404 — session not found
  | 'conflict' // 409 — state-machine violation, carries the real currentStep
  | 'expired' // 410 — session expired (7d TTL)
  | 'unavailable' // 503 — database unavailable, UI should retry with backoff
  | 'network' // fetch itself threw (offline / CORS / DNS)
  | 'unknown' // any other status the wizard doesn't special-case (e.g. 500)

export class OnboardingSessionError extends Error {
  readonly kind: OnboardingSessionErrorKind
  /** HTTP status code, or null for network failures (no response was received). */
  readonly status: number | null
  /** Only populated for `kind === 'conflict'` — the real current step. */
  readonly conflict?: OnboardingSessionStepConflict
  /**
   * 02-10-2026 · Los problemas por campo del sobre de error del micro
   * (`DATOS_INVALIDOS`), para ponerlos en su campo con
   * `aplicarErroresDelServidor` (`lib/errores/errores-en-el-formulario.ts`).
   * Vacío si la respuesta no los trae.
   */
  readonly campos: CampoConError[]
  /**
   * 02-10-2026 · El cuerpo de la respuesta, entero (como `ApiError.detalle`):
   * así el traductor (`lib/errores/traductor-de-errores.ts`) lee de acá la
   * `referencia`/`requestId` de un 5xx, el `code` y los `campos`.
   */
  readonly detalle?: Record<string, unknown>

  constructor(
    kind: OnboardingSessionErrorKind,
    status: number | null,
    message: string,
    conflict?: OnboardingSessionStepConflict,
    campos: CampoConError[] = [],
    detalle?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'OnboardingSessionError'
    this.kind = kind
    this.status = status
    this.conflict = conflict
    this.campos = campos
    this.detalle = detalle
  }
}

const STATUS_TO_KIND: Record<number, OnboardingSessionErrorKind> = {
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'notFound',
  409: 'conflict',
  410: 'expired',
  503: 'unavailable',
}

/** Lo que se le dice a la persona cuando un paso del registro falla (por el traductor). */
const OPCIONES_DEL_MENSAJE = {
  accion: 'continuar con el registro',
  porDefecto: 'No pudimos continuar con el registro. Revisa los datos e intenta de nuevo.',
}

/**
 * El `code` de una respuesta 2xx cuyo cuerpo no se pudo leer (02-10-2026; el mismo que usa
 * `owner-portal.http.ts`). Hubo respuesta: no es la conexión, es nuestro (va como un 500).
 */
const CODIGO_RESPUESTA_ILEGIBLE = 'RESPUESTA_ILEGIBLE'

function respuestaIlegible(statusRecibido: number): OnboardingSessionError {
  const detalle = { statusCode: 500, code: CODIGO_RESPUESTA_ILEGIBLE, statusRecibido }
  return new OnboardingSessionError(
    'unknown',
    500,
    mensajeParaLaPersona({ status: 500, detalle }, OPCIONES_DEL_MENSAJE),
    undefined,
    [],
    detalle,
  )
}

function cuerpoDelError(err: unknown): Record<string, unknown> | undefined {
  if (!err || typeof err !== 'object') return undefined
  const detalle = (err as { detalle?: unknown }).detalle
  return detalle && typeof detalle === 'object' && !Array.isArray(detalle)
    ? (detalle as Record<string, unknown>)
    : undefined
}

/**
 * Cualquier fallo como `OnboardingSessionError`, sin perder el status ni el cuerpo (02-10-2026).
 *
 * El hook (`use-onboarding-session.ts`) lo usa para todo lo que le llega. Antes, un error que no
 * era un `OnboardingSessionError` (un `ApiError`, un `SyntaxError`, un error de programación) se
 * volvía `kind: 'unknown'`, `status: null` y su `message` crudo en inglés: un 400 con `campos`
 * quedaba sin campos ni status. Ahora decide con el status (nunca con el texto):
 *  · sin respuesta (status 0 / `fetch` que no salió) → `network`, lo único que habla de la conexión;
 *  · con status → el `kind` de siempre, los `campos` y el cuerpo en `detalle`, y la frase del traductor;
 *  · sin status (no vino de una respuesta) → `unknown`, «de nuestro lado»: su texto no es para nadie.
 */
export function errorDelOnboarding(err: unknown): OnboardingSessionError {
  if (err instanceof OnboardingSessionError) return err
  const fallo = leerFallo(err)
  if (fallo.tipo === 'sinRespuesta') return new OnboardingSessionError('network', null, mensajeSinRespuesta())
  const detalle = cuerpoDelError(err)
  if (fallo.status === null) {
    return new OnboardingSessionError(
      'unknown',
      null,
      mensajeDeUnFalloNuestro({ ...fallo, mensajes: [] }, OPCIONES_DEL_MENSAJE.accion),
      undefined,
      [],
      detalle,
    )
  }
  const kind = STATUS_TO_KIND[fallo.status] ?? 'unknown'
  const message =
    fallo.campos.length > 0
      ? Array.from(new Set(fallo.campos.map((c) => c.mensaje))).join('; ')
      : mensajeParaLaPersona(err, OPCIONES_DEL_MENSAJE)
  return new OnboardingSessionError(
    kind,
    fallo.status,
    message,
    kind === 'conflict' ? (detalle as OnboardingSessionStepConflict | undefined) : undefined,
    fallo.campos,
    detalle,
  )
}

// ── Zod validation body → Spanish per-field message ─────────────────────────
//
// The agent registers its onboarding routes on an `OpenAPIHono` WITHOUT a
// custom `defaultHook`, so a body that fails Zod validation is returned by
// `@hono/zod-validator` as `c.json(safeParseResult, 400)`. The serialized
// shape is:
//
//   { success: false, error: { name: 'ZodError', issues: [ ZodIssue, ... ] } }
//
// Each issue carries a `path` (e.g. `['address', 'calle']`) and a default
// English `message`. We translate the leaf field to a Spanish label and the
// issue code to a short Spanish detail so the user sees "Calle: mínimo 2
// caracteres" instead of a bare "(400)". Handler-thrown errors keep the
// `{ error: string }` shape and go through the traductor below.

interface ZodIssueLike {
  path: (string | number)[]
  message: string
  code?: string
  minimum?: number
  maximum?: number
  type?: string
  validation?: string
}

function isZodValidationBody(value: unknown): value is { error: { issues: ZodIssueLike[] } } {
  if (typeof value !== 'object' || value === null) return false
  const error = (value as { error?: unknown }).error
  if (typeof error !== 'object' || error === null) return false
  const issues = (error as { issues?: unknown }).issues
  return Array.isArray(issues) && issues.length > 0
}

const FIELD_LABELS_ES: Record<string, string> = {
  legalName: 'Razón social',
  nit: 'NIT',
  calle: 'Calle',
  ciudad: 'Ciudad',
  departamento: 'Departamento',
  codigoPostal: 'Código postal',
  primaryContactEmail: 'Correo de la cuenta',
  primaryContactPhone: 'Teléfono de la cuenta',
}

function issueFieldLabel(issue: ZodIssueLike): string {
  const leaf = issue.path.length > 0 ? String(issue.path[issue.path.length - 1]) : ''
  return FIELD_LABELS_ES[leaf] ?? (leaf || 'Campo')
}

function issueDetailEs(issue: ZodIssueLike): string {
  const chars = (n: number) => `${n} ${n === 1 ? 'carácter' : 'caracteres'}`
  if (issue.code === 'too_small' && issue.type === 'string' && typeof issue.minimum === 'number') {
    return `mínimo ${chars(issue.minimum)}`
  }
  if (issue.code === 'too_big' && issue.type === 'string' && typeof issue.maximum === 'number') {
    return `máximo ${chars(issue.maximum)}`
  }
  if (issue.code === 'invalid_string' && issue.validation === 'email') {
    return 'correo inválido'
  }
  if (issue.code === 'invalid_type') {
    return 'campo requerido'
  }
  // Unknown/custom issue (e.g. the NIT regex message) — surface the raw
  // message the agent sent rather than dropping the detail.
  return issue.message
}

function formatZodValidationMessage(body: { error: { issues: ZodIssueLike[] } }): string {
  return body.error.issues
    .map((issue) => `${issueFieldLabel(issue)}: ${issueDetailEs(issue)}`)
    .join('; ')
}

async function throwForErrorResponse(res: Response): Promise<never> {
  const status = res.status
  let parsedBody: unknown = null
  try {
    parsedBody = await res.json()
  } catch {
    parsedBody = null
  }

  // 02-10-2026 · El micro manda el sobre de error del back
  // (`{ code: 'DATOS_INVALIDOS', message[], campos[] }`) con frases en español
  // que ya nombran el campo. Se usan primero; el `error.issues` de Zod (en
  // inglés) queda para un micro anterior.
  const campos = camposDelError(parsedBody)
  const detalle =
    parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)
      ? (parsedBody as Record<string, unknown>)
      : undefined
  let message: string
  if (campos.length > 0) {
    message = Array.from(new Set(campos.map((c) => c.mensaje))).join('; ')
  } else if (isZodValidationBody(parsedBody)) {
    message = formatZodValidationMessage(parsedBody)
  } else {
    // 02-10-2026 · La regla de oro, del traductor: un 4xx dice lo que mandó
    // el micro (`{ error }` o `message`); un 5xx dice que falló de nuestro
    // lado, con la referencia (`requestId`), y nunca «(500)» crudo.
    message = mensajeParaLaPersona({ status, detalle }, OPCIONES_DEL_MENSAJE)
  }
  const kind = STATUS_TO_KIND[status] ?? 'unknown'

  if (kind === 'conflict') {
    throw new OnboardingSessionError(
      kind,
      status,
      message,
      parsedBody as OnboardingSessionStepConflict,
      campos,
      detalle,
    )
  }
  throw new OnboardingSessionError(kind, status, message, undefined, campos, detalle)
}

// ── Fetch helpers ─────────────────────────────────────────────────────────

function stepUrl(sessionId: string, step: string): string {
  return `${process.env.NEXT_PUBLIC_AGENT_URL}/onboarding/session/${sessionId}${step}`
}

async function request<TRes>(sessionId: string, step: string, init: RequestInit): Promise<TRes> {
  let res: Response
  try {
    res = await agentFetch(stepUrl(sessionId, step), init)
  } catch (err) {
    // Sin respuesta: el único caso en que se habla de la conexión. Con el
    // micro caído y Leasefy respondiendo, `agentFetch` ya lo dice como «el
    // asistente no está disponible» (503), y `errorDelOnboarding` lo respeta.
    throw errorDelOnboarding(err)
  }
  if (!res.ok) {
    await throwForErrorResponse(res)
  }
  try {
    return (await res.json()) as TRes
  } catch {
    // 02-10-2026 · Contestó 2xx pero el cuerpo no se pudo leer (un HTML de un
    // proxy, un JSON cortado). Antes subía el `SyntaxError` crudo, en inglés.
    // Hubo respuesta: NO es la conexión, es nuestro.
    throw respuestaIlegible(res.status)
  }
}

function postStep<TReq, TRes>(sessionId: string, step: string, body: TReq): Promise<TRes> {
  return request<TRes>(sessionId, step, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Public API — one function per wizard step ───────────────────────────────

export function submitAgency(
  sessionId: string,
  body: OnboardingSessionAgencyRequest,
): Promise<OnboardingSessionAgencyResponse> {
  return postStep(sessionId, '/agency', body)
}

export function submitMembers(
  sessionId: string,
  body: OnboardingSessionMembersRequest,
): Promise<OnboardingSessionMembersResponse> {
  return postStep(sessionId, '/members', body)
}

export function submitPaymentProvider(
  sessionId: string,
  body: OnboardingSessionPaymentProviderRequest | OnboardingSessionPaymentProviderSkipRequest,
): Promise<OnboardingSessionPaymentProviderResponse> {
  return postStep(sessionId, '/payment-provider', body)
}

export function submitPolicy(
  sessionId: string,
  body: OnboardingSessionPolicyRequest,
): Promise<OnboardingSessionPolicyResponse> {
  return postStep(sessionId, '/policy', body)
}

/**
 * Completes the `habeas_data` wizard step from a terms-and-conditions
 * acceptance instead of a signed-PDF upload (see `TermsStepForm`).
 *
 * Contract (shipped by the agent):
 *   POST /onboarding/session/{sessionId}/habeas-data/accept-terms
 *   body: { accepted: true, termsVersion: string }
 *   → records the acceptance (WHO + which version + when) into
 *     `terms_acceptances`, marks the `habeas_data` step complete, and runs the
 *     same atomic tenant commit as `/complete` in ONE call (the SPA does NOT
 *     call `/complete` separately). Idempotent on double-click.
 * `termsVersion` is REQUIRED by the agent (400 if absent) and is recorded
 * verbatim, so the row reflects exactly the T&C text the user saw. The
 * response is a superset of the step envelope (currentStep/nextStep/draft) plus
 * the tenant-commit fields (tenantId/agencyId/status/dashboardUrl).
 *
 * Es la ÚNICA forma de cerrar el paso `habeas_data`. La subida del PDF firmado
 * (`presign-url` + `confirm`) ya no existe en el agente; el formulario que la
 * usaba se borró junto con esta regeneración del contrato.
 */

/**
 * La versión de los Términos que se registra como aceptada en el paso
 * «Habeas Data». Sale de `lib/legal/versiones.ts`, el mismo lugar que sube la
 * versión cuando cambia el texto de `/terminos`.
 *
 * 🔴 Hasta el 30-09-2026 era `'2026-08'` escrito a mano: cada inmobiliaria
 * quedaba registrada aceptando una versión que no es la v2.0 (vigente desde el
 * 5 de septiembre) que tenía en pantalla. La aceptación dejaba de servir como
 * prueba de A QUÉ dijo que sí.
 */
export const CURRENT_TERMS_VERSION = VERSION_TERMINOS

export function acceptTerms(
  sessionId: string,
): Promise<OnboardingSessionAcceptTermsResponse> {
  return postStep(sessionId, '/habeas-data/accept-terms', {
    accepted: true,
    termsVersion: CURRENT_TERMS_VERSION,
  })
}

/** No request body — the back derives the tenant from the persisted draft. */
export function completeOnboarding(sessionId: string): Promise<OnboardingSessionCompleteResponse> {
  return request(sessionId, '/complete', { method: 'POST' })
}

/** Read-only — rehydrates `{ sessionId, currentStep, nextStep, draft }` on refresh. */
export function resumeOnboarding(sessionId: string): Promise<OnboardingSessionResumeResponse> {
  return request(sessionId, '/resume', { method: 'GET' })
}
