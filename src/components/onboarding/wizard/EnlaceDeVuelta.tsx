'use client'

/**
 * El «← Volver» del registro: el mismo trazo que el «Volver» de «Antes de
 * comenzar» (OwnerNameStepForm), para que las dos puertas del registro se
 * vean iguales.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export interface EnlaceDeVueltaProps {
  href: string
  children: ReactNode
  testId?: string
  className?: string
}

export function EnlaceDeVuelta({ href, children, testId, className }: EnlaceDeVueltaProps) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className={cn(
        '-ml-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-body-sm text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" weight="bold" aria-hidden />
      {children}
    </Link>
  )
}
