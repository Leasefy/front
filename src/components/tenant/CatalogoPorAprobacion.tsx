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
 * y se marca lo que se pasa del tope. Ni más ni menos de lo que sabemos.
 */

import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'

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
   * Las que caben primero. No se esconde ninguna —poder navegar todo el
   * catálogo fue explícito en la reunión— pero lo que sí puede tomar va
   * arriba: es la diferencia entre una vitrina y algo suyo.
   */
  const ordenadas = referencia
    ? [...disponibles].sort((a, b) => {
        const aCabe = a.monthlyRent <= referencia.valorCop ? 0 : 1
        const bCabe = b.monthlyRent <= referencia.valorCop ? 0 : 1
        return aCabe - bCabe || a.monthlyRent - b.monthlyRent
      })
    : disponibles

  const dentro = referencia
    ? disponibles.filter((p) => p.monthlyRent <= referencia.valorCop).length
    : disponibles.length

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link
          href="/inquilino"
          className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg mb-6"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {tf(`${NS}.volver`, 'Volver al panel')}
        </Link>

        <header className="mb-6">
          <h1 className="text-xl font-semibold text-fg">
            {tf(`${NS}.titulo`, 'Propiedades para ti')}
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            {isLoading
              ? tf(`${NS}.cargando`, 'Buscando propiedades…')
              : referencia
                ? `${dentro} ${tf(`${NS}.dentroDeTuTope`, 'están dentro de tu tope aprobado')}`
                : tf(`${NS}.sinTope`, 'Tu aprobación está lista. Cuando confirmemos tu tope te marcamos lo que va contigo.')}
          </p>
        </header>

        <TopeAprobadoBanner aprobacion={aprobacion} vigente className="mb-4" />
        <QueSignificaPostularse className="mb-6" />

        <PropertyGrid
          properties={ordenadas}
          isWishlisted={isWishlisted}
          onWishlistToggle={toggleWishlist}
          isLoading={isLoading}
          basePath="/inquilino/propiedades"
          linkQuery="from=para-ti"
          aprobacion={aprobacion}
        />
      </div>
    </div>
  )
}
