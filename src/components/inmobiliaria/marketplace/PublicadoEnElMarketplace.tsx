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

import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import {
  fraseDelCambio,
  marketplaceDelPortafolioApi,
  type InmuebleParaElegir,
} from '@/lib/api/marketplace-del-portafolio.service'

export function PublicadoEnElMarketplace({
  propertyId,
  puedeCambiar,
}: {
  propertyId: string
  puedeCambiar: boolean
}) {
  const [inmueble, setInmueble] = useState<InmuebleParaElegir | null>(null)
  const [guardando, setGuardando] = useState(false)

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

  const explicacion = !inmueble.publicado
    ? 'No sale en el marketplace. Actívalo para que salga cuando esté disponible.'
    : inmueble.seVe
      ? 'Sale en el marketplace de Leasefy.'
      : `Publicado, pero todavía no sale: ${(inmueble.porQueNoSeVe ?? '').replace(/^./, (c) => c.toLowerCase())}`

  return (
    <Card className="flex items-start justify-between gap-4 p-4" data-testid="publicado-en-el-marketplace">
      <div className="flex items-start gap-3">
        <Storefront className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium text-fg">Publicado en el marketplace</p>
          <p className="text-body-sm text-fg-muted">{explicacion}</p>
        </div>
      </div>
      <Switch
        checked={inmueble.publicado}
        onCheckedChange={(v) => void cambiar(v)}
        disabled={guardando || !puedeCambiar}
        aria-label="Publicado en el marketplace"
      />
    </Card>
  )
}
