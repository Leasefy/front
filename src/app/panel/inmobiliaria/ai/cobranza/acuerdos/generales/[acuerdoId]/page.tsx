'use client'

/**
 * Editar un acuerdo general. Mismo formulario que crear — un acuerdo se lee
 * igual cuando se arma que cuando se corrige.
 *
 * Cargando, no existe y falló son tres estados distintos: sobre un acuerdo que
 * no existe no se ofrece «reintentar».
 */

import { useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

import { PageGuard } from '@/components/auth/PageGuard'
import { Button, Spinner } from '@/components/ui'
import {
  AcuerdoGeneralForm,
  borradorDesde,
} from '@/components/inmobiliaria/cobranza/AcuerdoGeneralForm'
import {
  useAcuerdosGenerales,
  type AcuerdoGeneralNuevo,
} from '@/lib/hooks/cobranza/use-acuerdos-generales'

const VOLVER = '/panel/inmobiliaria/ai/cobranza/acuerdos'

function EditarAcuerdoGeneral() {
  const params = useParams<{ acuerdoId: string }>()
  const acuerdoId = params?.acuerdoId ?? ''
  const { acuerdos, isLoading, error, refetch, editar } = useAcuerdosGenerales()

  const acuerdo = acuerdos.find((a) => a.id === acuerdoId) ?? null

  const guardar = useCallback(
    async (payload: AcuerdoGeneralNuevo) => {
      await editar(acuerdoId, payload)
    },
    [editar, acuerdoId],
  )

  if (isLoading && !acuerdo && !error) {
    return (
      <main className="flex items-center justify-center p-16">
        <Spinner size="md" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="p-6 lg:p-8 max-w-xl space-y-3">
        <h1 className="text-xl font-semibold text-fg">No pudimos cargar el acuerdo</h1>
        <p className="text-sm text-fg-muted">{error}</p>
        <div className="flex gap-2">
          <Button hideArrow onClick={() => void refetch()}>
            Reintentar
          </Button>
          <Button asChild variant="ghost" hideArrow>
            <Link href={VOLVER}>Volver a Acuerdos de pago</Link>
          </Button>
        </div>
      </main>
    )
  }

  if (!acuerdo) {
    return (
      <main className="p-6 lg:p-8 max-w-xl space-y-3">
        <h1 className="text-xl font-semibold text-fg">Ese acuerdo general ya no existe</h1>
        <p className="text-sm text-fg-muted">
          Puede que alguien lo haya borrado. Los demás siguen en Acuerdos de pago.
        </p>
        <Button asChild hideArrow>
          <Link href={VOLVER}>Volver a Acuerdos de pago</Link>
        </Button>
      </main>
    )
  }

  return (
    <AcuerdoGeneralForm
      titulo={acuerdo.name}
      inicial={borradorDesde(acuerdo)}
      onGuardar={guardar}
      textoGuardar="Guardar cambios"
    />
  )
}

export default function Page() {
  return (
    <PageGuard module="cobranza">
      <EditarAcuerdoGeneral />
    </PageGuard>
  )
}
