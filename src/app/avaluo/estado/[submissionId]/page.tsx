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
 */

import { useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Eyebrow } from '@leasefy/cadence'
import { useAvaluoStatus } from '@/lib/hooks/use-avaluo-status'
import { AvaluoEstadoCard } from '@/components/avaluo/AvaluoEstadoCard'

export default function AvaluoEstadoPage() {
  const params = useParams<{ submissionId: string }>()
  const searchParams = useSearchParams()
  const submissionId = params.submissionId

  const { statusData, isLoading, isError } = useAvaluoStatus(submissionId ?? null)

  // Wompi return: check ?id= and ?status= query params
  useEffect(() => {
    const wompiId = searchParams.get('id')
    const wompiStatus = searchParams.get('status')

    if (wompiId && wompiStatus) {
      const label = wompiStatus === 'APPROVED'
        ? 'Pago recibido correctamente.'
        : wompiStatus === 'DECLINED'
          ? 'El pago fue rechazado. Podés intentarlo nuevamente.'
          : `Estado del pago: ${wompiStatus}`

      toast.info(label, { duration: 6000 })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen bg-bg py-16 px-4">
      <div className="mx-auto max-w-xl space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <Eyebrow>Avalúo comercial</Eyebrow>
          <h1 className="text-h2">Estado de tu avalúo</h1>
          {submissionId && (
            <p className="text-sm text-fg-muted font-mono tabular-nums">
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
