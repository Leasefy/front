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
 * prometió: se le dijo "entras a ver tu catálogo" y se encontró con que no lo
 * conocemos. Además con vocabulario muerto ("aplicación", "evaluación").
 *
 * Son dos cosas distintas y por eso viven separadas:
 *
 * - **Perfil de scoring** (A/B/C/D) → *probabilidad de que te acepten*. Es del
 *   motor de recomendaciones y sigue intacto para quien lo tenga.
 * - **Aprobación** → *hasta cuánto te respaldan las aseguradoras*. Es lo que
 *   dice qué puedes **tomar**, y alcanza de sobra para armar un catálogo.
 *
 * Acá no se calcula compatibilidad ni probabilidad: se muestran las propiedades
 * que caben en el tope y se dice cuántas quedaron fuera. Ni más ni menos de lo
 * que sabemos.
 */

import { MagnifyingGlass } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { RUTA_DEL_MARKETPLACE } from '@/lib/nav/portal-del-inquilino'

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
  /*
   * T-0038: esta pantalla promete "lo que puedes tomar" contra un tope de
   * arriendo (`referencia.valorCop`, más abajo) — una propiedad en venta no
   * tiene canon (contract.md §3.2.4) y no aplica acá. Se excluye explícito
   * en vez de dejar que `monthlyRent === null` la saque por un `<=` fallido
   * (§3.7 — deliberado, no efecto secundario silencioso).
   */
  const disponibles = properties.filter((p) => p.status !== 'rented' && p.listingType !== 'sale')

  /*
   * Acá SÍ se filtra por el tope, y es la diferencia con el resto del sitio.
   *
   * La regla de "lo que se pasa se ve, marcado" vale para el catálogo general
   * (`/inquilino/explorar`, `/propiedades`): ahí navegar libre importa y
   * esconder se siente a trampa. Pero esta pantalla promete *lo que puedes
   * tomar*; mostrar algo que no puede tomar la contradice y encima le enseña
   * una puerta cerrada. Quien quiera ver todo tiene Explorar, a un clic.
   */
  // `?? 0` here is a type-safety net, not a real-data path: `disponibles`
  // already excluded every SALE listing above, so `monthlyRent` is never
  // actually null in this array.
  const dentroDelTope = referencia
    ? disponibles.filter((p) => (p.monthlyRent ?? 0) <= referencia.valorCop)
    : disponibles

  const ordenadas = [...dentroDelTope].sort((a, b) => (a.monthlyRent ?? 0) - (b.monthlyRent ?? 0))

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
      <div className="p-6 lg:p-8">
        {/* GLOW UP (22-10): el encabezado de las demás pantallas del portal (sin «Volver a Inicio»: el riel y las
            pestañas de «Buscar arriendo» ya dicen dónde está); seguir buscando es en el marketplace, en OTRA
            pestaña (reunión 21-10). */}
        <EncabezadoDePantalla
          className="mb-6"
          seccion={tf(`${NS}.seccion`, 'Buscar arriendo')}
          titulo={tf(`${NS}.titulo`, 'Inmuebles para ti')}
          descripcion={tf(`${NS}.descripcion`, 'Sólo los que caben en tu tope aprobado, del más barato al más caro.')}
          acciones={
            <Button asChild variant="outline" size="sm" hideArrow className="max-lg:flex-1">
              <a href={RUTA_DEL_MARKETPLACE} target="_blank" rel="noopener noreferrer" data-testid="catalogo-ir-al-marketplace">
                {tf(`${NS}.marketplace`, 'Buscar en el marketplace')}
              </a>
            </Button>
          }
        />

        {/* LA RESPUESTA: hasta cuánto puede arrendar, en grande (la misma pieza del inicio). */}
        <TopeAprobadoBanner aprobacion={aprobacion} vigente tamano="heroe" className="mb-6" />

        {/* Cuántos caben y cuántos quedaron fuera, en una línea encima de la lista. */}
        <p className="mb-4 text-sm text-fg-muted" data-testid="catalogo-conteo">
          {isLoading ? (
            tf(`${NS}.cargando`, 'Buscando inmuebles…')
          ) : referencia ? (
            <>
              <span className="font-mono tabular-nums text-fg">{ordenadas.length}</span>{' '}
              {tf(`${NS}.puedesTomar`, 'que puedes tomar con tu aprobación')}
              {ocultasPorTope > 0 && (
                <>
                  {' · '}
                  {tf(`${NS}.ocultasPrefijo`, 'No te mostramos')}{' '}
                  <span className="font-mono tabular-nums">{ocultasPorTope}</span>{' '}
                  {ocultasPorTope === 1
                    ? tf(`${NS}.ocultasSingular`, 'inmueble que se pasa de tu tope.')
                    : tf(`${NS}.ocultasPlural`, 'inmuebles que se pasan de tu tope.')}
                </>
              )}
            </>
          ) : (
            tf(`${NS}.sinTope`, 'Tu aprobación está lista. Cuando confirmemos tu tope te mostramos lo que va contigo.')
          )}
        </p>

        <QueSignificaPostularse className="mb-6" />

        {!isLoading && ordenadas.length === 0 ? (
          /* Sin nada dentro del tope no se rellena con cosas que no puede
             tomar: se dice, y se ofrece la salida. */
          <div className="rounded-lg border border-border bg-surface" data-testid="catalogo-vacio">
            <EmptyState
              icon={MagnifyingGlass}
              title={tf(`${NS}.vacio`, 'Ahora mismo no hay inmuebles dentro de tu tope')}
              description={tf(`${NS}.vacioTexto`, 'Aparecen nuevas seguido. Mientras tanto puedes ver el catálogo completo.')}
              action={{
                label: tf(`${NS}.verTodo`, 'Ver todos los inmuebles'),
                // El catálogo completo es el marketplace, en otra pestaña (reunión 21-10).
                onClick: () => window.open(RUTA_DEL_MARKETPLACE, '_blank', 'noopener,noreferrer'),
              }}
            />
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
