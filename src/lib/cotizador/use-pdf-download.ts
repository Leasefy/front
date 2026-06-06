'use client'
// Phase 38 plan 38-07 task 38-07-02 (D-38-09) — usePdfDownload refactor.
//
// MIGRATION: was a client-side @react-pdf/renderer dynamic-import that pulled
// in pdf-verdict-document.tsx + pdf-styles.ts (~600 KB). Phase 38-03 moved the
// PDF render to the agent backend (SSR via @react-pdf/renderer.renderToBuffer),
// exposing GET /api/agency/:id/cotizador/quote/:qid/verdict.pdf. This hook now:
//   1. fetches that endpoint with the same agent Bearer-token pattern (per
//      src/lib/api/agent-auth.ts — agent does NOT read cookies, so
//      credentials: 'include' would force the CORS allowlist to drop the
//      wildcard origin); and
//   2. triggers a browser download via objectURL + anchor.click() (same UX as
//      before — no visible regression).
//
// Public API ({ downloadPdf, isGenerating }) is preserved so the existing
// caller (StreamCompleteBanner) keeps working with the smaller props change.

import { useState } from 'react'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

export interface UsePdfDownloadOptions {
  agencyId: string
  quoteId: string
  filenamePrefix: string // e.g. "cotizacion-{cedula_hash_first8}-{YYYY-MM-DD}"
}

export function usePdfDownload(options: UsePdfDownloadOptions): {
  downloadPdf: () => Promise<void>
  isGenerating: boolean
} {
  const [isGenerating, setIsGenerating] = useState(false)

  const downloadPdf = async (): Promise<void> => {
    if (isGenerating) return
    setIsGenerating(true)
    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl) {
        console.error('[usePdfDownload] NEXT_PUBLIC_AGENT_URL not configured')
        return
      }
      if (!options.agencyId || !options.quoteId) {
        console.error('[usePdfDownload] missing agencyId or quoteId')
        return
      }

      const url = `${agentUrl}/api/agency/${options.agencyId}/cotizador/quote/${options.quoteId}/verdict.pdf`
      const resp = await fetch(url, { headers: agentAuthHeaders() })
      if (!resp.ok) {
        throw new Error(`[usePdfDownload] backend returned ${resp.status}`)
      }
      const blob = await resp.blob()

      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `${options.filenamePrefix}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('[usePdfDownload] Failed to download PDF:', err)
      throw err
    } finally {
      setIsGenerating(false)
    }
  }

  return { downloadPdf, isGenerating }
}
