'use client'

/**
 * El pie de la tabla de Inmuebles: publicar o quitar del marketplace varios a
 * la vez (Nico, 10-10-2026: «y que sea masiva también si quiere publicar
 * varios inmuebles de manera masiva al marketplace o quitarlos»).
 *
 * Es la barra de siempre (`BarraDeAccionesMasivas`, pegada a la tabla): está
 * aunque no haya nada marcado y dice cómo prenderla. Cada botón dice sobre
 * cuántos de los marcados actúa —publicar sólo toca los que no están
 * publicados y quitar sólo los que sí—, y la nota dice cuáles todavía no
 * saldrían aunque se publiquen y por qué (lo manda el back).
 */

import { EyeSlash, Storefront } from '@phosphor-icons/react'

import { BarraDeAccionesMasivas } from '@/components/ui/acciones-masivas'
import { Button } from '@/components/ui/button'
import type { InmuebleParaElegir } from '@/lib/api/marketplace-del-portafolio.service'

export interface MarketplaceDeLosMarcadosProps {
  /** Los marcados, por `propertyId`. */
  marcados: ReadonlySet<string>
  porInmueble: Readonly<Record<string, InmuebleParaElegir>>
  cambiando: boolean
  onCambiar: (propertyIds: string[], publicar: boolean) => void
  onQuitarLaSeleccion: () => void
}

/** Qué hace cada botón con lo marcado. Pura, para probarla. */
export function loQueHacenLosBotones(
  marcados: ReadonlySet<string>,
  porInmueble: Readonly<Record<string, InmuebleParaElegir>>,
) {
  const inmuebles = [...marcados].flatMap((id) => (porInmueble[id] ? [porInmueble[id]] : []))
  const porPublicar = inmuebles.filter((i) => !i.publicado)
  const porQuitar = inmuebles.filter((i) => i.publicado)
  return {
    porPublicar: porPublicar.map((i) => i.id),
    porQuitar: porQuitar.map((i) => i.id),
    /** De los que se publicarían, cuántos todavía no saldrían (arrendados, en borrador). */
    noSaldrianTodavia: porPublicar.filter((i) => i.porQueNoSeVe !== null).length,
    sinFotos: porPublicar.filter((i) => i.fotos === 0).length,
  }
}

export function MarketplaceDeLosMarcados({
  marcados,
  porInmueble,
  cambiando,
  onCambiar,
  onQuitarLaSeleccion,
}: MarketplaceDeLosMarcadosProps) {
  const { porPublicar, porQuitar, noSaldrianTodavia, sinFotos } = loQueHacenLosBotones(
    marcados,
    porInmueble,
  )
  const avisos = [
    noSaldrianTodavia > 0
      ? `${noSaldrianTodavia} de los que publicas ${noSaldrianTodavia === 1 ? 'todavía no saldría' : 'todavía no saldrían'}: ${noSaldrianTodavia === 1 ? 'está arrendado o en borrador; sale' : 'están arrendados o en borrador; salen'} cuando ${noSaldrianTodavia === 1 ? 'quede disponible' : 'queden disponibles'}.`
      : null,
    sinFotos > 0
      ? `${sinFotos} ${sinFotos === 1 ? 'no tiene fotos' : 'no tienen fotos'}: ${sinFotos === 1 ? 'sale' : 'salen'} con la portada sin fotos.`
      : null,
  ].filter(Boolean)

  return (
    <BarraDeAccionesMasivas
      variant="pie"
      testid="marketplace-de-los-marcados"
      marcadas={marcados.size}
      queSon={['inmueble', 'inmuebles']}
      onQuitar={onQuitarLaSeleccion}
      ocupado={cambiando}
      cuandoNoHayNada="Marca inmuebles para publicarlos o quitarlos del marketplace de una vez."
      nota={
        avisos.length > 0 ? (
          <p className="text-caption text-fg-muted" data-testid="marketplace-de-los-marcados-aviso">
            {avisos.join(' ')}
          </p>
        ) : undefined
      }
    >
      <Button
        variant="secondary"
        size="sm"
        hideArrow
        disabled={cambiando || porQuitar.length === 0}
        onClick={() => onCambiar(porQuitar, false)}
        data-testid="quitar-los-marcados"
      >
        <EyeSlash className="h-4 w-4" />
        {porQuitar.length > 0 ? `Quitar ${porQuitar.length} del marketplace` : 'Quitar del marketplace'}
      </Button>
      <Button
        size="sm"
        hideArrow
        disabled={cambiando || porPublicar.length === 0}
        onClick={() => onCambiar(porPublicar, true)}
        data-testid="publicar-los-marcados"
      >
        <Storefront className="h-4 w-4" />
        {porPublicar.length > 0 ? `Publicar ${porPublicar.length} en el marketplace` : 'Publicar en el marketplace'}
      </Button>
    </BarraDeAccionesMasivas>
  )
}
