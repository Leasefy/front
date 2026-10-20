'use client'

/**
 * use-owner-reports.ts — Reportes a propietarios (gestión de cobranza por
 * propietario). Cablea la UX existente a los endpoints NUEVOS del agente:
 *
 *   GET  /api/agency/:agencyId/cobranza/owner-reports        (lista, ?status)
 *   GET  /api/agency/:agencyId/cobranza/owner-reports/:id    (detalle)
 *   POST /api/agency/:agencyId/cobranza/owner-reports/generate    (crea borrador)
 *   POST /api/agency/:agencyId/cobranza/owner-reports/:id/approve (aprueba/envía)
 *   GET  /api/agency/:agencyId/cobranza/owner-reports/:id/pdf     (PDF binario)
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
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import { descargarBlob } from '@/lib/reportes/exportables'

// ── Tipos del contrato del backend (agency-cobranza-owner-reports.ts) ─────────

export type OwnerReportStatus = 'draft' | 'pending_approval' | 'sent'

export interface OwnerReport {
  id: string
  propertyId: string | null
  ownerId: string | null
  ownerName: string | null
  /** El inmueble del caso, como lo nombra la cartera (MORI-33). Un micro viejo no lo manda. */
  propertyLabel?: string | null
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

/**
 * MORI-33 (Nico 19-10-2026, «por correo»): a quién va el reporte. Lo resuelve
 * el back con el contrato del caso; los correos llegan TAPADOS.
 */
export interface DestinoDelReporte {
  contratoId: string
  contrato: string
  inmueble: { id: string | null; nombre: string }
  propietarios: Array<{ id: string | null; nombre: string; correo: string | null; esPrincipal: boolean }>
}

export interface LecturaDelDestino {
  destino: DestinoDelReporte | null
  /** Por qué no se sabe a quién va (sin contrato, sin inquilino). */
  porQueNo: string | null
}

/** Cómo le fue al correo con cada propietario. */
export interface EnvioDelReporte {
  estado: 'ENVIADO' | 'NO_SALIO'
  porQueNo: string | null
  destino: DestinoDelReporte | null
  destinatarios: Array<{ nombre: string; correo: string | null; estado: 'ENVIADO' | 'SIMULADO' | 'SIN_CORREO' | 'FALLIDO' }>
}

/** Lo que devuelve aprobar: con `markAsSent`, cómo le fue al correo. */
export type OwnerReportAprobado = OwnerReport & { envio?: EnvioDelReporte }

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

/** `ok` = se descargó; `error` = no se pudo, con `fallo` para el traductor. */
export type OwnerReportPdfResult = { status: 'ok' } | { status: 'error'; fallo: unknown }

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
  /**
   * Por qué falló el último «generar»: el `ApiError` del micro o el error de
   * la red tal cual, para el traductor (`mensajeDeLaAccion`). `generateError`
   * queda como código (`ENV_OR_AGENCY_MISSING`, `generate 500`): no es para
   * una persona.
   */
  generateFallo: unknown
  /**
   * POST approve — T-323: requiere click humano. `markAsSent` MANDA el reporte
   * por correo (MORI-33): queda enviado sólo si salió; si no, `approveFallo`
   * trae el porqué (409 `REPORTE_NO_SALIO`).
   */
  approve: (id: string, markAsSent?: boolean) => Promise<OwnerReportAprobado | null>
  isApproving: boolean
  approveError: string | null
  /** Por qué falló el último «aprobar»: como `generateFallo`. */
  approveFallo: unknown
  /** GET pdf — descarga la carta que recibe el propietario. */
  downloadPdf: (id: string) => Promise<OwnerReportPdfResult>
  isDownloading: boolean
  /** GET destino — a quién va el reporte (MORI-33). null si no se pudo preguntar. */
  leerDestino: (id: string) => Promise<LecturaDelDestino | null>
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
  const [generateFallo, setGenerateFallo] = useState<unknown>(null)

  const [isApproving, setIsApproving] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)
  const [approveFallo, setApproveFallo] = useState<unknown>(null)

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
      setGenerateFallo(null)
      try {
        const res = await authFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/owner-reports/generate`,
          { method: 'POST', body: JSON.stringify(body) },
        )
        if (!res.ok) {
          setGenerateError(`generate ${res.status}`)
          setGenerateFallo(await falloDelMicro(res))
          return null
        }
        const created = (await res.json()) as OwnerReport
        await refetch(initialStatus)
        return created
      } catch (err) {
        setGenerateError(err instanceof Error ? err.message : 'generate failed')
        // Un `fetch` que no salió llega tal cual: el traductor lo lee como conexión.
        setGenerateFallo(err)
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    [agencyId, refetch, initialStatus],
  )

  const approve = useCallback(
    async (id: string, markAsSent?: boolean): Promise<OwnerReportAprobado | null> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId || !id) {
        setApproveError('ENV_OR_AGENCY_MISSING')
        return null
      }
      setIsApproving(true)
      setApproveError(null)
      setApproveFallo(null)
      try {
        const res = await authFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/owner-reports/${id}/approve`,
          { method: 'POST', body: JSON.stringify({ markAsSent: Boolean(markAsSent) }) },
        )
        if (!res.ok) {
          setApproveError(`approve ${res.status}`)
          setApproveFallo(await falloDelMicro(res))
          return null
        }
        const updated = (await res.json()) as OwnerReportAprobado
        await refetch(initialStatus)
        return updated
      } catch (err) {
        setApproveError(err instanceof Error ? err.message : 'approve failed')
        setApproveFallo(err)
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
        return { status: 'error', fallo: new Error('ENV_OR_AGENCY_MISSING') }
      }
      setIsDownloading(true)
      try {
        const res = await authFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/owner-reports/${id}/pdf`,
          { headers: agentAuthHeaders() },
        )
        // MORI-33: la carta la arma el back; un 404/409/503 trae su porqué.
        if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/pdf')) {
          return { status: 'error', fallo: await falloDelMicro(res) }
        }
        const nombre =
          /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? 'reporte-de-cobranza.pdf'
        descargarBlob(await res.blob(), nombre)
        return { status: 'ok' }
      } catch (err) {
        return { status: 'error', fallo: err }
      } finally {
        setIsDownloading(false)
      }
    },
    [agencyId],
  )

  const leerDestino = useCallback(
    async (id: string): Promise<LecturaDelDestino | null> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId || !id) return null
      try {
        const res = await authFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/owner-reports/${id}/destino`,
          { headers: agentAuthHeaders() },
        )
        if (!res.ok) return null
        return (await res.json()) as LecturaDelDestino
      } catch {
        return null
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
    generateFallo,
    approve,
    isApproving,
    approveError,
    approveFallo,
    downloadPdf,
    isDownloading,
    leerDestino,
  }
}

export type UseOwnerReportsReturn = ReturnType<typeof useOwnerReports>
