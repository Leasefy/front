'use client'

/**
 * /avaluo/estado/[submissionId] — submission status page.
 *
 * Wires useAvaluoStatus and renders AvaluoEstadoCard.
 * On mount, checks URL search params for Wompi return params
 * (?id= and ?status=) and shows an informational toast.
 *
 * Payment now happens at intake, before landing here — see
 * AvaluoContext.submitAvaluo.
 *
 * T-0007: auto-redirects to the report the moment `shouldRedirectToReport`
 * holds (frozen predicate, `reporte-href.ts`) — the waiting screen is not
 * the destination, it's a stop on the way to the report.
 */

import { useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { LeasefyLogotype } from '@/components/brand'
import { useAvaluoStatus } from '@/lib/hooks/use-avaluo-status'
import { AvaluoEstadoCard } from '@/components/avaluo/AvaluoEstadoCard'
import { readCapToken } from '@/lib/api/avaluo.service'
import { reporteAvaluoHref, shouldRedirectToReport } from '@/lib/avaluo/reporte-href'

export default function AvaluoEstadoPage() {
  const params = useParams<{ submissionId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const submissionId = params.submissionId

  const { statusData, isLoading, isError } = useAvaluoStatus(submissionId ?? null)

  // Auto-redirect: en cuanto `status` expone `slug` (y no es `rechazado`, y
  // hay capToken), esta pantalla de espera se sale de en medio.
  useEffect(() => {
    if (!submissionId || !statusData) return
    const { slug, status } = statusData
    const capToken = readCapToken(submissionId)
    if (slug == null || capToken === null) return
    if (!shouldRedirectToReport(status, slug, capToken)) return
    router.replace(reporteAvaluoHref(slug, capToken))
  }, [submissionId, statusData, router])

  // Wompi return: check ?id= and ?status= query params
  useEffect(() => {
    const wompiId = searchParams.get('id')
    const wompiStatus = searchParams.get('status')

    if (wompiId && wompiStatus) {
      const label = wompiStatus === 'APPROVED'
        ? 'Pago recibido correctamente.'
        : wompiStatus === 'DECLINED'
          ? 'El pago fue rechazado. Puedes intentarlo nuevamente.'
          : `Estado del pago: ${wompiStatus}`

      // Un frame de espera, a propósito: React corre los efectos de abajo hacia
      // arriba, así que en la primera carga este efecto se ejecuta ANTES de que
      // el <Toaster> del layout raíz se suscriba — y sonner NO reenvía lo que se
      // publicó antes de la suscripción (subscribe() sólo agrega el listener).
      // Sin este rAF el toast se emite al vacío: quedaba en toast.getHistory()
      // pero no lo pintaba nadie.
      const raf = requestAnimationFrame(() => toast.info(label, { duration: 6000 }))
      return () => cancelAnimationFrame(raf)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen bg-bg px-4 pb-16 pt-6 sm:pt-10">
      <div className="mx-auto max-w-xl space-y-6">
        <LeasefyLogotype className="h-5 w-auto text-fg" title="Leasefy" />
        {/* El encabezado de la casa: rótulo, título liviano y la referencia. */}
        <div className="space-y-2">
          <p className="text-caption text-fg-subtle">Avalúo comercial</p>
          <h1 className="text-balance font-heading text-[26px] font-[420] leading-[1.12] tracking-[-0.025em] text-fg sm:text-[30px]">
            Estado de tu avalúo
          </h1>
          {submissionId && (
            <p className="break-all font-mono text-caption tabular-nums text-fg-muted">
              Referencia: {submissionId}
            </p>
          )}
        </div>

        {/* Status card — wires hook + card */}
        <AvaluoEstadoCard
          submissionId={submissionId ?? ''}
          statusData={statusData}
          isLoading={isLoading}
          isError={isError}
        />
      </div>
    </main>
  )
}
