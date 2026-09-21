'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from '@phosphor-icons/react'
import { backButtonVariants } from '@leasefy/cadence'
import { cn } from '@/lib/utils'

interface BackButtonProps {
  /** Text to display next to the arrow */
  label?: string
  /** If provided, renders as a Link. Otherwise uses router.back() */
  href?: string
  /** Additional className */
  className?: string
  /** Visual variant */
  variant?: 'default' | 'subtle' | 'pill'
}

/**
 * Reusable back navigation button — Cadence BackButton styling.
 *
 * Uses the Cadence `backButtonVariants` (ghost pill `default`, text-only
 * `subtle`, hairline chip `pill`) with the electric focus ring and the
 * ArrowLeft micro-nudge on hover. Behavior is preserved: with `href` it renders
 * a Next `<Link>` (client-side nav); without it, a `<button>` that calls
 * `router.back()`.
 *
 * Usage:
 * <BackButton label="Volver a propiedades" href="/panel" />
 * <BackButton label="Volver" /> // Uses router.back()
 */
export function BackButton({
  label = 'Volver',
  href,
  className,
  variant = 'default'
}: BackButtonProps) {
  const classes = cn(backButtonVariants({ variant }), className)

  const content = (
    <>
      <ArrowLeft
        aria-hidden="true"
        className="transition-transform duration-150 group-hover/back:-translate-x-0.5"
      />
      <span>{label}</span>
    </>
  )

  /*
   * 🔴 20-09 · `useRouter()` se llamaba SIEMPRE, incluso con `href`, que es el
   * caso que no lo necesita: con `href` esto es un `<Link>` y nada más.
   *
   * No es teórico. Al poner el camino de vuelta en la pantalla de fallo del
   * lote de dispersión, el componente reventó entero —«The above error
   * occurred in the <BackButton> component»— porque esa pantalla corre sin
   * router a mano. Un botón de «volver» que tumba la página cuando no hay
   * router es lo contrario de un camino de salida.
   *
   * Son dos componentes y no un `if` con el hook adentro porque las reglas de
   * los hooks no admiten llamarlo condicionalmente.
   */
  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    )
  }

  return <BotonDeHistorial classes={classes}>{content}</BotonDeHistorial>
}

/** La variante que vuelve por el historial; es la única que necesita router. */
function BotonDeHistorial({
  classes,
  children,
}: {
  classes: string
  children: React.ReactNode
}) {
  const router = useRouter()
  return (
    <button type="button" onClick={() => router.back()} className={classes}>
      {children}
    </button>
  )
}
