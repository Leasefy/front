'use client'

/**
 * En la ficha del inmueble: el interruptor «Publicado en el marketplace»
 * (Nico, 10-10-2026). Publicar es una marca aparte de «disponible»: el texto
 * dice si hoy sale o por qué no. Lee su propio estado (la ficha lee el
 * inmueble por la ruta pública, que no trae la marca). Sin la migración, o si
 * no se pudo leer, no se pinta.
 */

import { useCallback, useEffect, useState } from 'react'
import { Storefront } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import { SUPERFICIE_DE_LA_FICHA } from '@/components/pantalla/TarjetaDeLaFicha'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'
import { captacionApi, papelesEnPalabras } from '@/lib/api/crm.service'
import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import {
  fraseDelCambio,
  marketplaceDelPortafolioApi,
  type InmuebleParaElegir,
} from '@/lib/api/marketplace-del-portafolio.service'

export function PublicadoEnElMarketplace({
  propertyId,
  consignacionId,
  puedeCambiar,
  onVerAviso,
}: {
  propertyId: string
  /** Para decir, si no se puede publicar todavía, cuántos papeles faltan (22-10). */
  consignacionId?: string
  puedeCambiar: boolean
  /** «Ver el aviso público» vive aquí, junto a si sale o no (revisión 21-10). */
  onVerAviso?: () => void
}) {
  const [inmueble, setInmueble] = useState<InmuebleParaElegir | null>(null)
  const [guardando, setGuardando] = useState(false)
  /** Qué papeles faltan «antes de publicar», nombrados; `null` = no se sabe o no falta nada. */
  const [papelesQueFaltan, setPapelesQueFaltan] = useState<string | null>(null)

  const leer = useCallback(async () => {
    try {
      const r = await marketplaceDelPortafolioApi.uno(propertyId)
      setInmueble(r.disponible ? r.inmueble : null)
    } catch {
      setInmueble(null)
    }
  }, [propertyId])

  useEffect(() => {
    void leer()
  }, [leer])

  useEffect(() => {
    if (!consignacionId) return
    let vivo = true
    captacionApi
      .sePuedePublicar(consignacionId)
      .then((r) => {
        if (!vivo) return
        setPapelesQueFaltan(!r.puede && !r.sinMigracion && r.falta?.length ? papelesEnPalabras(r.falta) : null)
      })
      .catch(() => {
        /* Sin el dato, la tarjeta dice lo de siempre. */
      })
    return () => {
      vivo = false
    }
  }, [consignacionId])

  if (!inmueble) return null

  const cambiar = async (v: boolean) => {
    setGuardando(true)
    try {
      const r = await marketplaceDelPortafolioApi.cambiar({ publicar: v, propertyIds: [propertyId] })
      toast.success(fraseDelCambio(r))
      await leer()
    } catch (e) {
      toast.error('No se pudo guardar', { description: mensajeParaLaPersona(e) })
    } finally {
      setGuardando(false)
    }
  }

  // 22-10 (revisión): si faltan papeles «antes de publicar», se dice AQUÍ, junto al
  // interruptor (antes sólo lo decía la pestaña del mandato).
  const faltanPapeles = !inmueble.publicado && !!papelesQueFaltan
  const explicacion = !inmueble.publicado
    ? faltanPapeles
      ? `Para publicarlo falta: ${papelesQueFaltan}.`
      : 'No sale en el marketplace. Actívalo para publicarlo.'
    : inmueble.seVe
      ? 'Sale en el marketplace de Leasefy.'
      : `Publicado, pero todavía no sale: ${(inmueble.porQueNoSeVe ?? '').replace(/^./, (c) => c.toLowerCase())}`

  return (
    // 21-10 (revisión de la ficha): la superficie de las demás secciones; el ícono en
    // gris (el voltaje es para la acción, no para un ícono).
    <div className={cn(SUPERFICIE_DE_LA_FICHA, 'flex items-start justify-between gap-4 px-6 py-5')} data-testid="publicado-en-el-marketplace">
      <div className="flex items-start gap-3">
        <Storefront className="mt-0.5 h-5 w-5 shrink-0 text-fg-subtle" />
        <div>
          <p className="text-sm font-medium text-fg">Publicado en el marketplace</p>
          <p className="text-body-sm text-fg-muted" data-testid="explicacion-del-marketplace">
            {explicacion}
            {faltanPapeles && consignacionId ? (
              <>
                {' '}
                <Link
                  href={`/panel/inmobiliaria/inmuebles/${consignacionId}?pestana=mandato#papeles`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Ver los papeles
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {onVerAviso && inmueble.seVe ? (
          <button
            type="button"
            onClick={onVerAviso}
            className="hidden text-body-sm font-medium text-primary underline-offset-4 hover:underline sm:inline"
            data-testid="ver-el-aviso-publico"
          >
            Ver el aviso público
          </button>
        ) : null}
        <Switch
          checked={inmueble.publicado}
          onCheckedChange={(v) => void cambiar(v)}
          disabled={guardando || !puedeCambiar}
          aria-label="Publicado en el marketplace"
        />
      </div>
    </div>
  )
}
