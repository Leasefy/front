'use client'

/**
 * PropuestaClient — la ficha de una propuesta de Naira (Fase 13, plan 13-05; D13-4, D13-14, UI-SPEC §7.6, §8.5).
 *
 * La lectura de la FICHA (`useNairaPropuesta`: una vez al abrir; sin relectura sola, la huella que la persona vio no puede
 * cambiar debajo suyo) pasa ENTERA a `VistaDeNaira`: otra propuesta que da 403 no deja nada de la anterior (FG13-1).
 * Tiene su vuelta visible a la pestaña Aprobaciones. «Ver la señal» y «Ver la explicación» solo con `signal-view` (la
 * ficha de la señal exige esa acción); la explicación vive en la señal que la originó (E3 de 12-07). La vista se monta
 * con la huella como `key`: una versión nueva empieza sin el resultado de la anterior.
 */

import type { JSX } from 'react'

import { VolverALaLista } from '@/components/inmobiliaria/ai/VolverALaLista'
import { VistaDeNaira } from '@/components/inmobiliaria/naira/VistaDeNaira'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useNairaPropuesta } from '@/lib/hooks/naira/use-naira-propuesta'
import { useI18n } from '@/lib/i18n'
import { RUTA_DE_APROBACIONES, rutaDeLaSenal } from '@/lib/nav/rutas-de-naira'

import { PropuestaView } from './PropuestaView'

/** La forma de la ficha mientras carga (UI-SPEC §8.1): cabecera y el bloque de la acción. */
function EsqueletoDeLaPropuesta(): JSX.Element {
  return (
    <div className="max-w-3xl space-y-4">
      <Skeleton className="h-8 w-1/2 rounded-md" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  )
}

/**
 * `enCajon` (18-10-2026, «todo en una tabla»): la misma ficha dentro del cajón de Aprobaciones, sin el relleno de la
 * página, sin «Volver a la lista» y sin el título grande. Abrir el cajón ES abrir la ficha (D13-14): recién ahí se pide el
 * detalle.
 */
export function PropuestaClient({ proposalId, enCajon = false }: { readonly proposalId: string; readonly enCajon?: boolean }): JSX.Element {
  const { t } = useI18n()
  const { canAccess } = usePermissionsContext()
  const { estado, recargar } = useNairaPropuesta(proposalId)
  const puedeVerSenal = canAccess('naira', 'signal-view')
  const etiquetaVolver = t('inmobiliaria.ai.naira.propuesta.volverALaLista')

  return (
    <div className={enCajon ? 'space-y-6' : 'space-y-6 p-6 lg:p-8'}>
      <VistaDeNaira
        nombre="propuesta"
        estado={estado}
        queEs={t('inmobiliaria.ai.naira.propuesta.queEs')}
        volverA={{ label: etiquetaVolver, href: RUTA_DE_APROBACIONES }}
        onReintentar={recargar}
        esqueleto={<EsqueletoDeLaPropuesta />}
        renderOk={(detalle) => {
          const { senal, investigacion } = detalle.razonamiento
          return (
            <div className="space-y-6">
              {enCajon ? null : <VolverALaLista href={RUTA_DE_APROBACIONES} label={etiquetaVolver} />}
              <PropuestaView
                enCajon={enCajon}
                key={detalle.huella}
                proposalId={proposalId}
                detalle={detalle}
                hrefDeLaSenal={puedeVerSenal && senal.promocionId !== '' ? rutaDeLaSenal(senal.promocionId) : null}
                hrefDeLaExplicacion={
                  puedeVerSenal && investigacion.kind === 'referencia' && investigacion.id !== ''
                    ? rutaDeLaSenal(investigacion.id)
                    : null
                }
                onRecargar={recargar}
              />
            </div>
          )
        }}
      />
    </div>
  )
}
