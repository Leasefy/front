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
  const router = useRouter()

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

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={() => router.back()} className={classes}>
      {content}
    </button>
  )
}
