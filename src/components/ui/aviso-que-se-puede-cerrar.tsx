'use client'

/**
 * Un aviso informativo que se puede cerrar, y se queda cerrado.
 *
 * Nico, 21-09, sobre el aviso de Facturación: «ese message debería de tener la
 * opción de poder cerrarse».
 *
 * Tenía razón, y el punto no es la X: un aviso que explica **cómo funciona**
 * algo se lee UNA vez. Dejarlo fijo arriba de la tabla le cobra a la persona
 * cuatro renglones de alto todos los días, para siempre, por una explicación
 * que ya entendió el primer día. Con la X, el que la necesita la lee y el que
 * no, la cierra.
 *
 * ── Lo que este componente NO es ────────────────────────────────────────────
 *
 * 🔴 No sirve para una ALARMA. «Falta el extracto», «esta resolución se agota»,
 * «901 terceros no tienen correo» son cosas que hay que arreglar: dejar que se
 * cierren es dejar que se ignoren, y el día que importe nadie las va a ver.
 * Esto es sólo para el aviso que explica cómo funciona la pantalla.
 *
 * ── Que se quede cerrado ────────────────────────────────────────────────────
 *
 * Se recuerda en `localStorage` con la `clave` que le pasen. Es por navegador y
 * por persona, que es lo correcto para una preferencia de lectura: no es un
 * dato de la inmobiliaria y no tiene por qué viajar al back.
 *
 * El acceso va en `try/catch` y arranca MOSTRANDO el aviso: en una ventana
 * privada o con el almacenamiento bloqueado, `localStorage` tira excepción, y
 * entre equivocarse mostrando algo que ya se leyó y equivocarse escondiendo
 * algo que no, la primera es la barata.
 */

import { useEffect, useState } from 'react'
import { Info, X } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

/** Un prefijo propio: el `localStorage` de este producto es compartido. */
const PREFIJO = 'arriendo-facil-aviso-cerrado:'

function yaSeCerro(clave: string): boolean {
  try {
    return window.localStorage.getItem(PREFIJO + clave) === '1'
  } catch {
    return false
  }
}

export interface AvisoQueSePuedeCerrarProps {
  /** Con qué se recuerda que ya se cerró. Estable en el tiempo. */
  clave: string
  children: React.ReactNode
  className?: string
  'data-testid'?: string
}

export function AvisoQueSePuedeCerrar({
  clave,
  children,
  className,
  'data-testid': testId,
}: AvisoQueSePuedeCerrarProps) {
  /*
   * Arranca abierto SIEMPRE y el efecto lo cierra si ya se había cerrado: leer
   * `localStorage` en el primer render rompe la hidratación de Next (el
   * servidor no lo tiene y pinta otra cosa).
   */
  const [abierto, setAbierto] = useState(true)

  useEffect(() => {
    if (yaSeCerro(clave)) setAbierto(false)
  }, [clave])

  if (!abierto) return null

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border border-border bg-surface-muted p-3',
        className,
      )}
      data-testid={testId}
    >
      <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-fg-muted" weight="fill" aria-hidden="true" />
      {/* 🔴 `text-sm` (14 px), no `text-caption` (13): Nico, 21-09, «acá hay
          textos demasiados pequeños». Un párrafo que explica cómo funciona la
          pantalla no es un pie de foto. */}
      <div className="min-w-0 flex-1 text-sm leading-relaxed text-fg-muted">{children}</div>
      <button
        type="button"
        onClick={() => {
          setAbierto(false)
          try {
            window.localStorage.setItem(PREFIJO + clave, '1')
          } catch {
            /* Sin almacenamiento el aviso vuelve en la próxima carga. Se cierra
               igual: lo que se pidió fue poder sacarlo de la pantalla ahora. */
          }
        }}
        aria-label="Cerrar este aviso"
        data-testid={testId ? `${testId}-cerrar` : 'cerrar-aviso'}
        className="-m-1 rounded-md p-1 text-fg-muted transition-colors hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
