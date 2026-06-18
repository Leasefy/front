'use client'

/**
 * use-cartera-import — cablea la acción "Importar cartera" al endpoint nuevo
 * del agente:
 *
 *   POST {NEXT_PUBLIC_AGENT_URL}/api/agency/{agencyId}/cartera/import
 *
 * Sube un CSV (multipart/form-data, campo `file`) y devuelve el resumen
 * { creados, actualizados, omitidos, errores[], totalRecibidos, truncado }.
 * (XLSX: el operador debe exportar a CSV — el backend no decodifica binario.)
 *
 * T-323: la importación es una carga de datos. NO contacta al deudor, no inicia
 * cadencia, no reporta a central. La acción requiere un click HUMANO explícito
 * del operador (este hook se dispara solo desde un onSubmit del input file).
 *
 * REGLA DE ORO — FAIL-SOFT: el backend nuevo puede no estar desplegado todavía
 * (Victor despliega + aplica migración). Por eso:
 *  - 404 / red caída → status 'unavailable' con mensaje "Próximamente / requiere
 *    despliegue", SIN romper ni mostrar error feo.
 *  - 200 con summary (incluso vacío por migración pendiente) → status 'done'.
 *  - sin URL o sin agencyId → status 'idle' (degrada silencioso, sin warn ruidoso).
 *
 * Sigue el patrón de los hooks de cobranza: useAuth() → agency.id,
 * agentAuthHeaders() de @/lib/api/agent-auth, base = NEXT_PUBLIC_AGENT_URL.
 */

import { useCallback, useState } from 'react'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useAuth } from '@/lib/auth'

export interface CarteraImportErrorEntry {
  rowIndex: number
  error: string
}

export interface CarteraImportSummary {
  creados: number
  actualizados: number
  omitidos: number
  errores: CarteraImportErrorEntry[]
  totalRecibidos: number
  truncado: boolean
  source: string
  generatedAt: string
}

export type CarteraImportStatus =
  | 'idle'
  | 'uploading'
  | 'done'
  | 'unavailable'
  | 'error'

export interface UseCarteraImportResult {
  status: CarteraImportStatus
  summary: CarteraImportSummary | null
  /** Mensaje legible para el operador (errores reales / "Próximamente"). */
  message: string | null
  /** Sube un archivo CSV. Devuelve el summary o null si degradó / falló. */
  importFile: (file: File) => Promise<CarteraImportSummary | null>
  /** Limpia el resumen/estado para volver a subir otro archivo. */
  reset: () => void
}

const UNAVAILABLE_MESSAGE = 'Próximamente — requiere despliegue del backend.'

export function useCarteraImport(): UseCarteraImportResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [status, setStatus] = useState<CarteraImportStatus>('idle')
  const [summary, setSummary] = useState<CarteraImportSummary | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setSummary(null)
    setMessage(null)
  }, [])

  const importFile = useCallback(
    async (file: File): Promise<CarteraImportSummary | null> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      // Fail-soft silencioso: sin URL o sin agencyId no rompemos ni hacemos ruido.
      if (!agentUrl || !agencyId) {
        setStatus('unavailable')
        setMessage(UNAVAILABLE_MESSAGE)
        return null
      }

      setStatus('uploading')
      setMessage(null)

      try {
        const form = new FormData()
        form.set('file', file, file.name)

        // multipart: NO fijamos content-type — el navegador agrega el boundary.
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/cartera/import`,
          {
            method: 'POST',
            headers: agentAuthHeaders(),
            body: form,
          },
        )

        // 404 → endpoint aún no desplegado: degrada a "Próximamente".
        if (res.status === 404) {
          setStatus('unavailable')
          setMessage(UNAVAILABLE_MESSAGE)
          return null
        }

        if (!res.ok) {
          // 400/401/403/503 — error real, mensaje honesto sin romper la pantalla.
          let detail = `${res.status}`
          try {
            const body = (await res.json()) as { error?: string }
            if (body?.error) detail = body.error
          } catch {
            /* respuesta sin cuerpo JSON */
          }
          setStatus('error')
          setMessage(detail)
          return null
        }

        const json = (await res.json()) as CarteraImportSummary
        setSummary(json)
        setStatus('done')
        setMessage(null)
        return json
      } catch {
        // Red caída / backend inalcanzable → degrada a "Próximamente" (fail-soft).
        setStatus('unavailable')
        setMessage(UNAVAILABLE_MESSAGE)
        return null
      }
    },
    [agencyId],
  )

  return { status, summary, message, importFile, reset }
}
