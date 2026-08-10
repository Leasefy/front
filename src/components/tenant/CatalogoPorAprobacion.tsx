'use client'

/**
 * CatalogoPorAprobacion — el catálogo de quien tiene aprobación y nada más.
 *
 * Este es el destino de todo el recorrido, y hasta ahora **no existía**.
 *
 * `/inquilino/para-ti` se cierra cuando falta el perfil de scoring viejo
 * (`hasVerifiedProfile`, el A/B/C/D) y muestra *"necesitamos conocer tu perfil,
 * completa una aplicación o solicita una evaluación"*. Para quien acaba de
 * aprobarse y crear su cuenta eso es exactamente al revés de lo que se le
 * prometió: se le dijo "entrás a ver tu catálogo" y se encontró con que no lo
 * conocemos. Además con vocabulario muerto ("aplicación", "evaluación").
 *
 * Son dos cosas distintas y por eso viven separadas:
 *
 * - **Perfil de scoring** (A/B/C/D) → *probabilidad de que te acepten*. Es del
 *   motor de recomendaciones y sigue intacto para quien lo tenga.
 * - **Aprobación** → *hasta cuánto te respaldan las aseguradoras*. Es lo que
 *   dice qué podés **tomar**, y alcanza de sobra para armar un catálogo.
 *
 * Acá no se calcula compatibilidad ni probabilidad: se muestran las propiedades
 * que caben en el tope y se dice cuántas quedaron fuera. Ni más ni menos de lo
 * que sabemos.
 */

import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'

import { PropertyGrid } from '@/components/property/PropertyGrid'
import { TopeAprobadoBanner } from '@/components/tenant/TopeAprobadoBanner'
import { QueSignificaPostularse } from '@/components/tenant/QueSignificaPostularse'
import { useProperties } from '@/lib/hooks/useProperties'
import { useWishlist } from '@/lib/hooks/useWishlist'
import { useTf } from '@/lib/i18n/use-tf'
import { referenciaCanon, type Aprobacion } from '@/lib/api/aprobacion.service'

const NS = 'inquilino.catalogoAprobacion'

export function CatalogoPorAprobacion({ aprobacion }: { aprobacion: Aprobacion }) {
  const tf = useTf()
  const { properties, isLoading } = useProperties()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const referencia = referenciaCanon(aprobacion)

  /*
   * Las arrendadas quedan fuera. Esta pantalla dice "propiedades para ti" y la
   * siguiente acción es postularse: ofrecer algo que ya se arrendó es prometer
   * una puerta cerrada, y encima inflaría la cuenta de "cuántas van contigo".
   */
  const disponibles = properties.filter((p) => p.status !== 'rented')

  /*
   * Acá SÍ se filtra por el tope, y es la diferencia con el resto del sitio.
   *
   * La regla de "lo que se pasa se ve, marcado" vale para el catálogo general
   * (`/inquilino/explorar`, `/propiedades`): ahí navegar libre importa y
   * esconder se siente a trampa. Pero esta pantalla promete *lo que puedes
   * tomar*; mostrar algo que no puede tomar la contradice y encima le enseña
   * una puerta cerrada. Quien quiera ver todo tiene Explorar, a un clic.
   */
  const dentroDelTope = referencia
    ? disponibles.filter((p) => p.monthlyRent <= referencia.valorCop)
    : disponibles

  const ordenadas = [...dentroDelTope].sort((a, b) => a.monthlyRent - b.monthlyRent)

  /*
   * Ocultamos, pero lo decimos — misma regla que `/inquilino/para-ti`.
   *
   * Sin esto el catálogo encoge en silencio y se lee como «no hay nada», que
   * es una cosa muy distinta a «hay, pero se pasan de tu tope». Y esta es la
   * pantalla que ve quien tiene aprobación pero todavía no perfil verificado:
   * el camino más común, justo el que se quedaba sin el aviso.
   */
  const ocultasPorTope = disponibles.length - dentroDelTope.length

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link
          href="/inquilino"
          className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg mb-6"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {tf(`${NS}.volver`, 'Volver a Inicio')}
        </Link>

        <header className="mb-6">
          <h1 className="text-xl font-semibold text-fg">
            {tf(`${NS}.titulo`, 'Propiedades para ti')}
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            {isLoading
              ? tf(`${NS}.cargando`, 'Buscando propiedades…')
              : referencia
                ? `${ordenadas.length} ${tf(`${NS}.puedesTomar`, 'que puedes tomar con tu aprobación')}`
                : tf(`${NS}.sinTope`, 'Tu aprobación está lista. Cuando confirmemos tu tope te mostramos lo que va contigo.')}
          </p>
        </header>

        {!isLoading && ocultasPorTope > 0 && (
          <p className="mb-4 text-sm text-fg-muted">
            {tf(`${NS}.ocultasPrefijo`, 'No te mostramos')}{' '}
            <span className="font-mono tabular-nums">{ocultasPorTope}</span>{' '}
            {ocultasPorTope === 1
              ? tf(`${NS}.ocultasSingular`, 'propiedad que se pasa de tu tope.')
              : tf(`${NS}.ocultasPlural`, 'propiedades que se pasan de tu tope.')}
          </p>
        )}

        <TopeAprobadoBanner aprobacion={aprobacion} vigente className="mb-4" />
        <QueSignificaPostularse className="mb-6" />

        {!isLoading && ordenadas.length === 0 ? (
          /* Sin nada dentro del tope no se rellena con cosas que no puede
             tomar: se dice, y se ofrece la salida. */
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <p className="text-sm font-medium text-fg">
              {tf(`${NS}.vacio`, 'Ahora mismo no hay propiedades dentro de tu tope')}
            </p>
            <p className="text-sm text-fg-muted mt-1">
              {tf(`${NS}.vacioTexto`, 'Aparecen nuevas seguido. Mientras tanto puedes ver el catálogo completo.')}
            </p>
            <Button asChild className="mt-4">
              <Link href="/inquilino/explorar">{tf(`${NS}.verTodo`, 'Ver todas las propiedades')}</Link>
            </Button>
          </div>
        ) : (
          <PropertyGrid
            properties={ordenadas}
            isWishlisted={isWishlisted}
            onWishlistToggle={toggleWishlist}
            isLoading={isLoading}
            basePath="/inquilino/propiedades"
            linkQuery="from=para-ti"
          />
        )}

      </div>
    </div>
  )
}
