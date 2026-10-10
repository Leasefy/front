'use client'

/**
 * En Inmuebles: «N inmuebles no salen en el marketplace» y el botón para
 * elegir cuáles (Nico, 10-10-2026: «nada sale hasta que lo elijan», con un
 * filtro «No publicados» y la acción masiva). Sin la migración, o sin nada por
 * publicar, no se pinta: no hay nada que decidir.
 */

import { useCallback, useEffect, useState } from 'react'
import { Storefront } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { marketplaceDelPortafolioApi, type ListaParaElegir } from '@/lib/api/marketplace-del-portafolio.service'
import { ElegirQuePublicar } from './ElegirQuePublicar'

export function AvisoDeNoPublicados() {
  const [resumen, setResumen] = useState<ListaParaElegir['resumen'] | null>(null)
  const [abierto, setAbierto] = useState(false)

  const leer = useCallback(async () => {
    try {
      const l = await marketplaceDelPortafolioApi.lista({ publicado: false })
      setResumen(l.disponible ? l.resumen : null)
    } catch {
      // Un aviso que no se pudo leer no tumba la pantalla de Inmuebles.
      setResumen(null)
    }
  }, [])

  useEffect(() => {
    void leer()
  }, [leer])

  if (!resumen || resumen.noPublicados === 0) return null

  return (
    <>
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3"
        data-testid="aviso-no-publicados"
      >
        <div className="flex items-start gap-3">
          <Storefront className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium text-fg">
              {resumen.noPublicados} {resumen.noPublicados === 1 ? 'inmueble no sale' : 'inmuebles no salen'} en el marketplace
            </p>
            <p className="text-body-sm text-fg-muted">
              Lo que migraste queda sin publicar hasta que elijas.
              {resumen.noPublicadosConFotos > 0
                ? ` ${resumen.noPublicadosConFotos} ya ${resumen.noPublicadosConFotos === 1 ? 'tiene' : 'tienen'} fotos.`
                : ''}
            </p>
          </div>
        </div>
        <Button variant="secondary" hideArrow onClick={() => setAbierto(true)} data-testid="elegir-cuales-publicar">
          Elegir cuáles publicar
        </Button>
      </div>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>¿Cuáles publicas en el marketplace?</DialogTitle>
            <DialogDescription>
              Un inmueble publicado sale cuando está disponible. Los arrendados salen cuando queden libres.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ElegirQuePublicar alCambiar={() => void leer()} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  )
}
