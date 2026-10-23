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
import { BackButton } from '@/components/ui/back-button'

import { PageGuard } from '@/components/auth/PageGuard'
import { Button } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { SinDatos } from '@/components/estado/SinDatos'
import {
  AcuerdoGeneralForm,
  borradorDesde,
} from '@/components/inmobiliaria/cobranza/AcuerdoGeneralForm'
import {
  useAcuerdosGenerales,
  type AcuerdoGeneralNuevo,
} from '@/lib/hooks/cobranza/use-acuerdos-generales'
import { CrossFade } from '@leasefy/cadence'

const VOLVER = '/panel/inmobiliaria/pagos/cobranza/acuerdos'

/**
 * GLOW UP 3.ª vuelta · cargando, falló y ya no existe con el MISMO encabezado que el formulario
 * (la vuelta, la sección y el título), y el estado debajo con las piezas de la casa. Antes cada
 * uno pintaba su propio h1 de 20 px suelto, sin sección ni vuelta común.
 */
function Marco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <BackButton href={VOLVER} label="Acuerdos de pago" variant="subtle" />
        <EncabezadoDePantalla className="mt-3" seccion="Cobranza · Acuerdos" titulo={titulo} />
      </div>
      {children}
    </div>
  )
}

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

  // Movimiento: cada salida en un `CrossFade` con su clave (cargando →
  // formulario, → fallo, → ya no existe).
  if (isLoading && !acuerdo && !error) {
    return (
      <CrossFade swapKey="cargando">
        <Marco titulo="Acuerdo general">
          <div className="space-y-4" aria-busy="true">
            <span className="sr-only">Cargando el acuerdo…</span>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg bg-surface-muted" aria-hidden="true" />
            ))}
          </div>
        </Marco>
      </CrossFade>
    )
  }

  if (error) {
    return (
      <CrossFade swapKey="fallo">
        <Marco titulo="Acuerdo general">
          <FalloDeCarga
            error={error}
            queEs="el acuerdo"
            onReintentar={() => refetch()}
            volverA={{ label: 'Volver a Acuerdos de pago', href: VOLVER }}
          />
        </Marco>
      </CrossFade>
    )
  }

  if (!acuerdo) {
    return (
      <CrossFade swapKey="no-existe">
        <Marco titulo="Acuerdo general">
          <SinDatos
            queSon="acuerdos"
            titulo="Ese acuerdo general ya no existe"
            descripcion="Puede que alguien lo haya borrado. Los demás siguen en Acuerdos de pago."
            accion={
              <Button asChild size="sm" hideArrow>
                <Link href={VOLVER}>Volver a Acuerdos de pago</Link>
              </Button>
            }
          />
        </Marco>
      </CrossFade>
    )
  }

  return (
    <CrossFade swapKey="formulario">
      <AcuerdoGeneralForm
        titulo={acuerdo.name}
        inicial={borradorDesde(acuerdo)}
        onGuardar={guardar}
        textoGuardar="Guardar cambios"
      />
    </CrossFade>
  )
}

export default function Page() {
  return (
    <PageGuard module="cobranza">
      <EditarAcuerdoGeneral />
    </PageGuard>
  )
}
