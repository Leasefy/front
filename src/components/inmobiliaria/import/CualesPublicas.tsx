'use client'

/**
 * «¿Cuáles publicas?» al terminar la importación de inmuebles (Nico,
 * 10-10-2026: «nada sale hasta que lo elijan»). Lo importado nace sin publicar
 * en el marketplace; acá se elige: todos, los que tienen fotos, o uno por uno.
 * Sin la migración (o sin nada importado) no se pinta.
 */

import { useCallback, useEffect, useState } from 'react'
import { Storefront } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import {
  fraseDelCambio,
  marketplaceDelPortafolioApi,
  type ListaParaElegir,
} from '@/lib/api/marketplace-del-portafolio.service'
import { ElegirQuePublicar } from '@/components/inmobiliaria/marketplace/ElegirQuePublicar'

export function CualesPublicas({ lote }: { lote: string }) {
  const [resumen, setResumen] = useState<ListaParaElegir['resumen'] | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [eligiendo, setEligiendo] = useState(false)

  const leer = useCallback(async () => {
    try {
      const l = await marketplaceDelPortafolioApi.lista({ lote })
      setResumen(l.disponible ? l.resumen : null)
    } catch {
      setResumen(null)
    }
  }, [lote])

  useEffect(() => {
    void leer()
  }, [leer])

  if (!resumen || resumen.publicados + resumen.noPublicados === 0) return null

  const publicar = async (soloConFotos: boolean) => {
    setTrabajando(true)
    try {
      const r = await marketplaceDelPortafolioApi.cambiar({ publicar: true, lote, soloConFotos })
      setResultado(fraseDelCambio(r))
      await leer()
    } catch (e) {
      toast.error('No se pudo publicar', { description: mensajeParaLaPersona(e) })
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <div className="w-full max-w-xl space-y-3 rounded-lg border border-border bg-surface p-4 text-left" data-testid="cuales-publicas">
      <div className="flex items-start gap-3">
        <Storefront className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-fg">¿Cuáles publicas en el marketplace?</p>
          <p className="text-body-sm text-fg-muted">
            Lo que importaste no sale en el marketplace hasta que lo elijas.
            {resumen.noPublicados > 0
              ? ` ${resumen.noPublicados} sin publicar${resumen.noPublicadosConFotos > 0 ? `, ${resumen.noPublicadosConFotos} con fotos` : ', ninguno con fotos todavía'}.`
              : ' Ya está todo publicado.'}
          </p>
          {resultado && (
            <p className="text-body-sm text-success" data-testid="resultado-de-publicar" aria-live="polite">
              {resultado}
            </p>
          )}
        </div>
      </div>
      {resumen.noPublicados > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button hideArrow disabled={trabajando} onClick={() => void publicar(false)} data-testid="publicar-todos">
            Todos
          </Button>
          <Button
            variant="secondary"
            hideArrow
            disabled={trabajando || resumen.noPublicadosConFotos === 0}
            onClick={() => void publicar(true)}
            data-testid="publicar-con-fotos"
          >
            Los que tienen fotos
          </Button>
          <Button variant="outline" hideArrow disabled={trabajando} onClick={() => setEligiendo(true)} data-testid="elegir-uno-por-uno">
            Elegir
          </Button>
        </div>
      )}

      <Dialog open={eligiendo} onOpenChange={setEligiendo}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>¿Cuáles publicas en el marketplace?</DialogTitle>
            <DialogDescription>
              Los de esta importación. Un inmueble publicado sale cuando está disponible.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ElegirQuePublicar lote={lote} alCambiar={() => void leer()} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}
