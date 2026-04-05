'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from '@phosphor-icons/react'
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
 * Reusable back navigation button with consistent styling
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

  const baseStyles = cn(
    "group inline-flex items-center gap-2 text-sm font-medium transition-all duration-200",
    {
      // Default: clean with subtle background on hover
      'default': "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white px-3 py-2 -ml-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800",
      // Subtle: minimal, just text and icon
      'subtle': "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white",
      // Pill: contained button style
      'pill': "text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-4 py-2.5 rounded-xl shadow-sm hover:shadow",
    }[variant],
    className
  )

  const iconStyles = cn(
    "transition-transform duration-200 group-hover:-translate-x-1",
    {
      'default': "w-4 h-4",
      'subtle': "w-4 h-4",
      'pill': "w-4 h-4",
    }[variant]
  )

  const content = (
    <>
      <ArrowLeft className={iconStyles} weight="bold" />
      <span>{label}</span>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={baseStyles}>
        {content}
      </Link>
    )
  }

  return (
    <button onClick={() => router.back()} className={baseStyles}>
      {content}
    </button>
  )
}
