'use client'

/**
 * use-owner-reports.ts — Reportes a propietarios (gestión de cobranza por
 * propietario). Cablea la UX existente a los endpoints NUEVOS del agente:
 *
 *   GET  /api/agency/:agencyId/cobranza/owner-reports        (lista, ?status)
 *   GET  /api/agency/:agencyId/cobranza/owner-reports/:id    (detalle)
 *   POST /api/agency/:agencyId/cobranza/owner-reports/generate    (crea borrador)
 *   POST /api/agency/:agencyId/cobranza/owner-reports/:id/approve (aprueba/envía)
 *   GET  /api/agency/:agencyId/cobranza/owner-reports/:id/pdf     (501 — próximamente)
 *
 * Patrón fail-soft (igual a use-cartera-overview):
 *   - sin NEXT_PUBLIC_AGENT_URL o sin agencyId → setIsLoading(false) y return.
 *   - El backend nuevo aún no está desplegado (Victor aplica migración). El
 *     endpoint puede responder 404/empty → la lista degrada a [] y la pantalla
 *     muestra su EmptyState/preview de ejemplo. NUNCA rompe.
 *
 * T-323: `approve` es la acción que mueve el reporte a pending_approval / sent.
 *   Solo se dispara con un click humano explícito del operador (la página la
 *   conecta a un botón real). Nada se auto-envía.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'

// ── Tipos del contrato del backend (agency-cobranza-owner-reports.ts) ─────────

export type OwnerReportStatus = 'draft' | 'pending_approval' | 'sent'

export interface OwnerReport {
  id: string
  propertyId: string | null
  ownerId: string | null
  ownerName: string | null
  debtorId: string | null
  period: string
  daysInMora: number | null
  overdueAmount: number | null
  gestionesCount: number
  narrative: string
  status: OwnerReportStatus
  pdfUrl: string | null
  approvedByUserId: string | null
  sentAt: string | null
  createdAt: string
}

export interface OwnerReportListResponse {
  reports: OwnerReport[]
  total: number
  generatedAt: string
}

export interface GenerateOwnerReportBody {
  debtorId: string
  period?: string
  ownerName?: string
  propertyId?: string
  ownerId?: string
}

/** Resultado de pedir el PDF: el backend responde 501 hasta que la plantilla
 *  exista → lo modelamos como un estado honesto "próximamente". */
export interface OwnerReportPdfResult {
  status: 'unavailable' | 'error'
  message: string
}

// ── fetch con bearer + content-type sólo cuando hay body ─────────────────────

/**
 * Va por `agentFetch`, NO por `fetch` a secas: si el token venció mientras la
 * pestaña estaba en segundo plano, el 401 se reintenta una vez con sesión
 * fresca. Con `fetch` crudo la pantalla queda clavada en «Error: 401» sobre
 * datos que sí existen.
 */
async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = agentAuthHeaders(init.headers)
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  return agentFetch(input, { ...init, headers })
}

export interface UseOwnerReportsResult {
  reports: OwnerReport[]
  isLoading: boolean
  error: string | null
  /** Refresca la lista. Acepta filtro de estado opcional. */
  refetch: (status?: OwnerReportStatus) => Promise<void>
  /** GET detalle de un reporte. null si 404 / no migrado / error. */
  getReport: (id: string) => Promise<OwnerReport | null>
  /** POST generate — crea un borrador desde data real de cartera. */
  generate: (body: GenerateOwnerReportBody) => Promise<OwnerReport | null>
  isGenerating: boolean
  generateError: string | null
  /** POST approve — T-323: requiere click humano. markAsSent confirma entrega. */
  approve: (id: string, markAsSent?: boolean) => Promise<OwnerReport | null>
  isApproving: boolean
  approveError: string | null
  /** GET pdf — devuelve el blob si el backend lo entrega, o un estado honesto. */
  downloadPdf: (id: string) => Promise<OwnerReportPdfResult>
  isDownloading: boolean
}

export function useOwnerReports(
  initialStatus?: OwnerReportStatus,
): UseOwnerReportsResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [reports, setReports] = useState<OwnerReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const [isApproving, setIsApproving] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)

  const [isDownloading, setIsDownloading] = useState(false)

  const refetch = useCallback(
    async (status?: OwnerReportStatus) => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      // Fail-soft silencioso: sin URL o sin agencia → vista vacía (preview).
      if (!agentUrl || !agencyId) {
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      try {
        const qs = status ? `?status=${encodeURIComponent(status)}` : ''
        const res = await authFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/owner-reports${qs}`,
          { headers: agentAuthHeaders() },
        )
        if (!res.ok) {
          // 404/503/etc → degradar a lista vacía (la pantalla muestra preview).
          setReports([])
          setError(null)
          return
        }
        const json: OwnerReportListResponse = await res.json()
        setReports(Array.isArray(json?.reports) ? json.reports : [])
        setError(null)
      } catch (err) {
        // Backend no desplegado → vista vacía, sin error feo.
        setReports([])
        setError(err instanceof Error ? err.message : 'fetch owner-reports failed')
      } finally {
        setIsLoading(false)
      }
    },
    [agencyId],
  )

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void refetch(initialStatus)
  }, [refetch, agencyId, initialStatus])

  const getReport = useCallback(
    async (id: string): Promise<OwnerReport | null> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId || !id) return null
      try {
        const res = await authFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/owner-reports/${id}`,
          { headers: agentAuthHeaders() },
        )
        if (!res.ok) return null
        return (await res.json()) as OwnerReport
      } catch {
        return null
      }
    },
    [agencyId],
  )

  const generate = useCallback(
    async (body: GenerateOwnerReportBody): Promise<OwnerReport | null> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) {
        setGenerateError('ENV_OR_AGENCY_MISSING')
        return null
      }
      if (!body?.debtorId) {
        setGenerateError('DEBTOR_REQUIRED')
        return null
      }
      setIsGenerating(true)
      setGenerateError(null)
      try {
        const res = await authFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/owner-reports/generate`,
          { method: 'POST', body: JSON.stringify(body) },
        )
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          setGenerateError(text || `generate ${res.status}`)
          return null
        }
        const created = (await res.json()) as OwnerReport
        await refetch(initialStatus)
        return created
      } catch (err) {
        setGenerateError(err instanceof Error ? err.message : 'generate failed')
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    [agencyId, refetch, initialStatus],
  )

  const approve = useCallback(
    async (id: string, markAsSent?: boolean): Promise<OwnerReport | null> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId || !id) {
        setApproveError('ENV_OR_AGENCY_MISSING')
        return null
      }
      setIsApproving(true)
      setApproveError(null)
      try {
        const res = await authFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/owner-reports/${id}/approve`,
          { method: 'POST', body: JSON.stringify({ markAsSent: Boolean(markAsSent) }) },
        )
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          setApproveError(text || `approve ${res.status}`)
          return null
        }
        const updated = (await res.json()) as OwnerReport
        await refetch(initialStatus)
        return updated
      } catch (err) {
        setApproveError(err instanceof Error ? err.message : 'approve failed')
        return null
      } finally {
        setIsApproving(false)
      }
    },
    [agencyId, refetch, initialStatus],
  )

  const downloadPdf = useCallback(
    async (id: string): Promise<OwnerReportPdfResult> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId || !id) {
        return { status: 'unavailable', message: 'Próximamente' }
      }
      setIsDownloading(true)
      try {
        const res = await authFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/owner-reports/${id}/pdf`,
          { headers: agentAuthHeaders() },
        )
        // 501 = exportación a PDF no implementada aún → estado honesto.
        if (res.status === 501) {
          return { status: 'unavailable', message: 'Próximamente' }
        }
        if (!res.ok) {
          return { status: 'unavailable', message: 'Próximamente' }
        }
        // Si en el futuro el backend entrega el binario, lo abrimos.
        const contentType = res.headers.get('content-type') ?? ''
        if (contentType.includes('application/pdf')) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          globalThis.open(url, '_blank', 'noopener')
          return { status: 'unavailable', message: 'ok' }
        }
        return { status: 'unavailable', message: 'Próximamente' }
      } catch {
        return { status: 'unavailable', message: 'Próximamente' }
      } finally {
        setIsDownloading(false)
      }
    },
    [agencyId],
  )

  return {
    reports,
    isLoading,
    error,
    refetch,
    getReport,
    generate,
    isGenerating,
    generateError,
    approve,
    isApproving,
    approveError,
    downloadPdf,
    isDownloading,
  }
}

export type UseOwnerReportsReturn = ReturnType<typeof useOwnerReports>
