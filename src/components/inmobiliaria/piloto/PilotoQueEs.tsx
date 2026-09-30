'use client'

/**
 * PilotoQueEs — lo que la pantalla dice de sí misma, sin abrir nada.
 *
 * Nico (30-09): quien llega no entendía qué es el Piloto ni qué significa el
 * modo en el que está. La bajada del encabezado ya dice QUÉ ES (los agentes
 * que hacen la operación) y qué ves aquí; este renglón dice EN QUÉ MODO está
 * y qué significa eso en una frase: quién decide antes de que algo salga.
 * Lo completo queda detrás de «¿Cómo funciona?»: el botón y el modal de
 * `ParaEntenderMas`, el patrón del panel para las explicaciones, con
 * `PilotoComoFunciona` adentro.
 *
 * El modo es el de la flota (`usePilotoFlotaCompartida`, el mismo dato que la
 * píldora del header): nunca se inventa. Sin lectura no se dice ningún modo,
 * pero el botón sigue: la explicación no depende del micro.
 */

import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { useI18n } from '@/lib/i18n'
import { usePilotoFlotaCompartida } from '@/lib/hooks/piloto/piloto-flota-context'
import type { ModoDeLaFlota } from '@/lib/api/piloto'
import { PilotoComoFunciona } from './PilotoComoFunciona'

const NS = 'inmobiliaria.piloto.comoFunciona'

/** El mismo punto que la píldora: el verde es «se mueve solo». */
const PUNTO: Record<Exclude<ModoDeLaFlota, 'mixto'>, string> = {
  sombra: 'bg-fg-muted',
  copiloto: 'bg-primary',
  autonomo: 'bg-success',
}

export interface PilotoQueEsProps {
  /** Vuelve a mostrar la presentación de la primera vez (desde el modal). */
  onVerPresentacion?: () => void
}

export function PilotoQueEs({ onVerPresentacion }: PilotoQueEsProps) {
  const { t } = useI18n()
  const { data } = usePilotoFlotaCompartida()

  // `mixto` sólo lo manda un micro viejo: no se traduce a ningún modo.
  const modo = data?.activo && data.modo !== 'mixto' ? data.modo : null
  const apagado = data ? !data.activo : false
  // Si algunos agentes van con OTRO modo, se dice, igual que la píldora: «los
  // agentes preparan cada acción» sería falso para los que actúan solos.
  const distintos = modo ? (data?.distintos?.length ?? 0) : 0

  return (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
      data-testid="piloto-que-es"
    >
      {(modo || apagado) && (
        <p className="flex min-w-0 items-start gap-2 text-caption text-fg-muted">
          <span
            className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${modo ? PUNTO[modo] : 'bg-fg-subtle'}`}
            aria-hidden="true"
          />
          <span data-testid="piloto-que-es-modo">
            {modo ? (
              <>
                <span className="font-medium text-fg">
                  {t(`${NS}.modoActual`, { modo: t(`inmobiliaria.piloto.flota.modo.${modo}`) })}
                  {distintos > 0 && (
                    <span className="font-normal text-fg-muted">
                      {' '}
                      {t('inmobiliaria.piloto.flota.distintosCorto', { n: String(distintos) })}
                    </span>
                  )}
                  .
                </span>{' '}
                {t(`${NS}.modoCorto.${modo}`)}
              </>
            ) : (
              t(`${NS}.apagadoCorto`)
            )}
          </span>
        </p>
      )}
      <ParaEntenderMas
        etiqueta={t(`${NS}.boton`)}
        titulo={t(`${NS}.titulo`)}
        descripcion={t(`${NS}.descripcion`)}
        className="-ml-2 w-fit shrink-0 sm:ml-0"
      >
        <PilotoComoFunciona {...(onVerPresentacion ? { onVerPresentacion } : {})} />
      </ParaEntenderMas>
    </div>
  )
}
