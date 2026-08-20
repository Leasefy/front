'use client'

/**
 * CopyHashButton.tsx — «Copiar»: copia el hash COMPLETO al portapapeles.
 *
 * Isla de cliente mínima (la segunda de la página, después del índice): lo
 * único que necesita JS es `navigator.clipboard`. Lo que se ve en pantalla es
 * el hash corto; lo que se copia es el sha256 entero — un hash de 12 caracteres
 * no se puede comparar con nada.
 *
 * Sin portapapeles (contexto no seguro, permiso negado) el botón lo dice, y el
 * hash completo sigue disponible en el `<details>` que pinta la tarjeta, que es
 * HTML del servidor y funciona sin JS.
 */

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'

type CopyState = 'idle' | 'copied' | 'failed'

const LABEL: Readonly<Record<CopyState, string>> = {
  idle: 'Copiar',
  copied: 'Copiado',
  failed: 'No se pudo copiar',
}

export function CopyHashButton({ value, className }: { value: string; className?: string }) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current)
    }
  }, [])

  const settle = (next: CopyState) => {
    setState(next)
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2000)
  }

  const handleCopy = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) throw new Error('sin portapapeles')
      await navigator.clipboard.writeText(value)
      settle('copied')
    } catch {
      settle('failed')
    }
  }

  const Icon = state === 'copied' ? Check : Copy

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copiar la huella completa"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-caption text-fg',
        'hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]',
        className,
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span aria-live="polite">{LABEL[state]}</span>
    </button>
  )
}
