'use client'

/**
 * agent-api — el puñado de lecturas del backoffice que viven en el micro de
 * AGENTES y no en el micro de admin.
 *
 * Casi todo `/admin/*` pega a `adminApi` (`NEXT_PUBLIC_ADMIN_API_URL` →
 * `/api/v1/admin`). El feedback del chat es la excepción: el pulgar de cada
 * respuesta se guarda en el schema `agent`, del que el back NO es dueño. Armar
 * un proxy en el back para una sola lectura sería una capa más que mantener; el
 * micro ya tiene su propia puerta de backoffice, con la MISMA lista de correos
 * (`ADMIN_EMAILS`) y el MISMO token de Supabase.
 *
 * Mismo contrato de errores que `adminApi`: 401 → login, 403 → forbidden.
 */

import { ApiError, getAdminToken } from '@/lib/admin/api'

function agentOrigin(): string {
  const base = process.env.NEXT_PUBLIC_AGENT_URL
  if (!base) {
    throw new ApiError(0, 'NEXT_PUBLIC_AGENT_URL no está configurado')
  }
  return base.replace(/\/$/, '')
}

function redirectTo(path: string): void {
  if (typeof window !== 'undefined') window.location.href = path
}

export async function agentAdminApi<T>(
  path: string,
  opts: { query?: Record<string, string | number | undefined>; signal?: AbortSignal } = {},
): Promise<T> {
  const token = getAdminToken()
  if (!token) {
    redirectTo('/admin/login')
    throw new ApiError(401, 'No session')
  }

  const url = new URL(`${agentOrigin()}${path.startsWith('/') ? path : `/${path}`}`)
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v === undefined || v === '') continue
    url.searchParams.set(k, String(v))
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    signal: opts.signal,
  })

  if (res.status === 401) {
    redirectTo('/admin/login')
    throw new ApiError(401, 'Sesión expirada')
  }
  if (res.status === 403) {
    redirectTo('/admin/forbidden')
    throw new ApiError(403, 'No autorizado')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => undefined)) as { error?: string } | undefined
    throw new ApiError(res.status, body?.error ?? `Error ${res.status}`, body)
  }
  return (await res.json()) as T
}

// ── Feedback del chat (micro de agentes) ─────────────────────────────────────

export interface ChatFeedbackRow {
  id: string
  agencyId: string
  turnId: string
  pregunta: string
  respuesta: string
  veredicto: 'up' | 'down'
  comentario: string | null
  cifraMal: boolean
  herramientas: string[]
  usuario: string
  /** Si el comentario se convirtió en una lección que el chat ya usa. */
  leccionId: string | null
  createdAt: string
}

export interface ChatFeedbackWeek {
  /** Lunes de la semana, ISO. */
  semana: string
  total: number
  arriba: number
  /** `null` cuando esa semana no tuvo ninguna valoración (no es un 0 %). */
  porcentajeArriba: number | null
}

export interface ChatFeedbackResponse {
  filas: ChatFeedbackRow[]
  semanas: ChatFeedbackWeek[]
  generadoEn: string
}

export function getChatFeedback(
  opts: { agencyId?: string; veredicto?: 'up' | 'down'; limit?: number; signal?: AbortSignal } = {},
): Promise<ChatFeedbackResponse> {
  return agentAdminApi<ChatFeedbackResponse>('/api/admin/ai-hub/chat/feedback', {
    query: {
      ...(opts.agencyId ? { agencyId: opts.agencyId } : {}),
      ...(opts.veredicto ? { veredicto: opts.veredicto } : {}),
      limit: opts.limit ?? 50,
    },
    ...(opts.signal ? { signal: opts.signal } : {}),
  })
}
