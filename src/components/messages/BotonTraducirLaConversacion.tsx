'use client'

/**
 * «Translate» / «Show original» de una conversación, con el panel en inglés
 * (Nico, 16-10-2026). Lo que escribieron las personas se ve tal como lo
 * escribieron; el botón lo traduce sólo cuando se pide. Sin panel en inglés o
 * fuera de una inmobiliaria, no se pinta nada.
 */

import { Translate } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { useTr } from '@/lib/i18n/use-tr'
import type { TraduccionDeMensajes } from '@/lib/i18n/use-traducir-mensajes'

export function BotonTraducirLaConversacion({ traduccion }: { traduccion: TraduccionDeMensajes }) {
  const tr = useTr()
  if (!traduccion.disponible) return null
  return (
    <span className="inline-flex items-center gap-2">
      {traduccion.error && !traduccion.cargando ? (
        <span className="text-caption text-danger" role="alert">
          {tr('No se pudo traducir. Prueba de nuevo.')}
        </span>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        hideArrow
        onClick={() => void (traduccion.traducido ? traduccion.verOriginal() : traduccion.traducir())}
        disabled={traduccion.cargando}
        aria-pressed={traduccion.traducido}
        data-testid="traducir-la-conversacion"
      >
        <Translate className="h-4 w-4" aria-hidden="true" />
        {traduccion.cargando ? tr('Traduciendo…') : traduccion.traducido ? tr('Ver el original') : tr('Traducir')}
      </Button>
    </span>
  )
}

/** La marca chica bajo un mensaje que se está mostrando traducido. */
export function MarcaDeTraducido() {
  const tr = useTr()
  return <span className="text-caption text-fg-muted">{tr('Traducido')}</span>
}
