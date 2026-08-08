'use client'

/**
 * use-templates.ts — catálogo de playbooks de cobranza.
 *
 * ⚠️ Este hook declaraba a mano un contrato que el agente nunca implementó:
 * esperaba `{ templates: [...] }` en camelCase, y el agente devuelve un ARRAY
 * pelado en snake_case. `data.templates` quedaba `undefined` y la página hacía
 * `.length` sobre eso — o sea que Playbooks reventaba contra el error boundary
 * («Algo salió mal en este workspace») cada vez que el fetch respondía bien.
 *
 * Los tipos correctos existían desde siempre en `api/generated/agent.ts`
 * (`pnpm api:gen`). El contrato se toma de ahí y no se vuelve a transcribir:
 * si el agente cambia, esto deja de compilar en vez de romperse en el navegador.
 */

import { useCallback, useEffect, useState } from 'react'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useAuth } from '@/lib/auth'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'
import type { paths } from '@/lib/api/generated/agent'

const POLL_INTERVAL_MS = 60_000

/** Lo que el agente devuelve de verdad, una fila del array. */
export type TemplateApiItem =
  paths['/api/agency/:agencyId/cobranza/templates']['get']['responses'][200]['content']['application/json'][number]

/** Lo que consume la UI. */
export interface TemplateRow {
  id: string
  name: string
  category: 'stage' | 'whatsapp' | 'objection'
  /** Texto base (columna NOT NULL): lo que hay antes de cualquier edición. */
  body: string
  bodyDraft: string | null
  bodyPublished: string | null
  /** Texto vivo — lo que hoy le llega al deudor. */
  liveBody: string
  /** Texto a editar: el borrador si existe, si no lo vivo. */
  editableBody: string
  /**
   * El agente NO manda «estado»: se deduce. `published` = lo publicado está al
   * día; `draft` = nunca se publicó, o hay cambios sin publicar. Antes esto
   * llegaba como `undefined` y la píldora decía «Borrador» siempre.
   */
  status: 'draft' | 'published'
  waSubmissionStatus: 'pending' | 'approved' | 'rejected' | null
  tokenCount: number
  updatedAt: string
}

export interface TemplatesResponse {
  templates: TemplateRow[]
}

export interface UseTemplatesResult {
  data: TemplatesResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const WA_STATUSES = new Set(['pending', 'approved', 'rejected'])

function toWaStatus(raw: string | null): TemplateRow['waSubmissionStatus'] {
  return raw && WA_STATUSES.has(raw) ? (raw as TemplateRow['waSubmissionStatus']) : null
}

export function normalizeTemplate(item: TemplateApiItem): TemplateRow {
  const liveBody = item.body_published ?? item.body
  const hasPendingEdits =
    item.body_draft !== null && item.body_draft !== item.body_published

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    body: item.body,
    bodyDraft: item.body_draft,
    bodyPublished: item.body_published,
    liveBody,
    editableBody: item.body_draft ?? liveBody,
    status: item.body_published !== null && !hasPendingEdits ? 'published' : 'draft',
    waSubmissionStatus: toWaStatus(item.wa_submission_status),
    tokenCount: item.token_count,
    updatedAt: item.updated_at,
  }
}

/**
 * Acepta sólo un array. Si el agente devolviera otra cosa preferimos una lista
 * vacía a un crash: una pantalla vacía se nota fea, un error boundary se lleva
 * la sección entera.
 */
export function normalizeTemplates(payload: unknown): TemplateRow[] {
  return Array.isArray(payload) ? (payload as TemplateApiItem[]).map(normalizeTemplate) : []
}

export function useTemplates(): UseTemplatesResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<TemplatesResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOnce = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setError('NEXT_PUBLIC_AGENT_URL not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/templates`)
      if (!res.ok) throw new Error(`${res.status}`)
      setData({ templates: normalizeTemplates(await res.json()) })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchOnce()
  }, [fetchOnce, agencyId])

  useVisibilityPolling(() => void fetchOnce(), POLL_INTERVAL_MS, Boolean(agencyId))

  const refetch = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  return { data, isLoading, error, refetch }
}
