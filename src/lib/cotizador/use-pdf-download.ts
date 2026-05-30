'use client'
// Hook: usePdfDownload
// Dynamically imports @react-pdf/renderer (keeps ~600KB out of main bundle).
// Returns { downloadPdf, isGenerating } for wiring to a button.

import { useState } from 'react'
import type { VerdictPdfProps } from './pdf-verdict-document'

export interface UsePdfDownloadOptions {
  props: VerdictPdfProps
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
      // Dynamic import — keeps @react-pdf/renderer out of the initial bundle.
      const [{ pdf }, { VerdictPdfDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./pdf-verdict-document'),
      ])

      const blob = await pdf((VerdictPdfDocument as any)(options.props) as any).toBlob()

      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `${options.filenamePrefix}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('[usePdfDownload] Failed to generate PDF:', err)
      throw err
    } finally {
      setIsGenerating(false)
    }
  }

  return { downloadPdf, isGenerating }
}
