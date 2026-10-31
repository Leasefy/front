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

import { CompartirLaFicha } from '@/components/property/CompartirLaFicha'
import { cn } from '@/lib/utils'
import { SUPERFICIE_DE_LA_FICHA } from '@/components/pantalla/TarjetaDeLaFicha'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import {
  fraseDelCambio,
  marketplaceDelPortafolioApi,
  type InmuebleParaElegir,
} from '@/lib/api/marketplace-del-portafolio.service'
import type { InmuebleParaCompartir } from '@/lib/inmuebles/ficha-para-compartir'
import { useDominioActivo } from '@/lib/dominio-propio/use-dominio-activo'

export function PublicadoEnElMarketplace({
  propertyId,
  puedeCambiar,
  ficha,
  onVerAviso,
}: {
  propertyId: string
  /** Ya no se usa aquí (31-10: los papeles se ven en su pestaña); se acepta para no romper a quien lo pasa. */
  consignacionId?: string
  puedeCambiar: boolean
  /**
   * Con los datos del inmueble y mientras SALE en el marketplace: «Copiar
   * enlace», «Copiar ficha» y «WhatsApp» (Juan y Nico, 21-10-2026). Un enlace
   * de un inmueble que no sale lleva a una ficha que el cliente no puede ver.
   */
  ficha?: InmuebleParaCompartir
  /** «Ver el aviso público» vive aquí, junto a si sale o no (revisión 21-10). */
  onVerAviso?: () => void
}) {
  const [inmueble, setInmueble] = useState<InmuebleParaElegir | null>(null)
  const [guardando, setGuardando] = useState(false)
  // Nico 31-10: con el dominio propio activo, el enlace sale con ese dominio.
  const dominio = useDominioActivo()
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

  // 🔴 31-10-2026 (Nico: «este mensaje no es cierto, coloca algo general»): la lista de papeles «antes de
  // publicar» no frena el interruptor, así que aquí no se presenta como requisito; los papeles se ven en su pestaña.
  const explicacion = !inmueble.publicado
    ? 'No sale en el marketplace. Actívalo para publicarlo.'
    : inmueble.seVe
      ? 'Sale en el marketplace de Leasefy.'
      : `Publicado, pero todavía no sale: ${(inmueble.porQueNoSeVe ?? '').replace(/^./, (c) => c.toLowerCase())}`

  const seComparte = !!ficha && inmueble.publicado && inmueble.seVe

  return (
    // 21-10 (revisión de la ficha): la superficie de las demás secciones; el ícono en
    // gris (el voltaje es para la acción, no para un ícono).
    <div className={cn(SUPERFICIE_DE_LA_FICHA, 'px-6 py-5')} data-testid="publicado-en-el-marketplace">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Storefront className="mt-0.5 h-5 w-5 shrink-0 text-fg-subtle" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">Publicado en el marketplace</p>
            <p className="text-body-sm text-fg-muted" data-testid="explicacion-del-marketplace">
              {explicacion}
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
      {seComparte && (
        <div className="mt-4 border-t border-border-faint pt-4" data-testid="compartir-desde-el-panel">
          <p className="mb-2 text-body-sm text-fg-muted">
            Compártelo con un cliente: la ficha lleva el precio, los m², las habitaciones y los baños, y el enlace arma la vista
            previa con la foto.
          </p>
          <CompartirLaFicha propertyId={propertyId} ficha={ficha} conEnlace dominio={dominio} />
        </div>
      )}
    </div>
  )
}
