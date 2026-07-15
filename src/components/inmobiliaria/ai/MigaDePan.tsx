'use client'

/**
 * MigaDePan — standard internal navigation for workspace pages:
 * a prominent back button (←, goes one level UP) + a clickable breadcrumb
 * beside it. Replaces the assorted eyebrow/CaretLeft patterns so every
 * internal page navigates the same way (pedido UX 2026-06-11).
 *
 * Usage:
 *   <MigaDePan
 *     backHref="/panel/inmobiliaria/ai/avaluos"
 *     crumbs={[
 *       { label: 'Agentes IA', href: '/panel/inmobiliaria/ai' },
 *       { label: 'Avalúos', href: '/panel/inmobiliaria/ai/avaluos' },
 *       { label: 'Mis solicitudes' },           // current page — not a link
 *     ]}
 *   />
 */

import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { MonoLabel } from '@leasefy/cadence'

import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface Miga {
  label: string
  /** Omit on the current (last) crumb. */
  href?: string
}

export interface MigaDePanProps {
  /** One level up — where the ← goes. */
  backHref: string
  crumbs: Miga[]
  /** Optional icon rendered before the first crumb (agent icon). */
  icon?: Icon
  className?: string
}

export function MigaDePan({ backHref, crumbs, icon: CrumbIcon, className }: MigaDePanProps) {
  const { t } = useI18n()

  return (
    <div className={cn('flex items-center gap-1.5 min-w-0', className)}>
      <Link
        href={backHref}
        aria-label={t('common.back')}
        title={t('common.back')}
        className={cn(
          'shrink-0 w-8 h-8 -ml-2 rounded-lg',
          'flex items-center justify-center',
          // ≥44px touch target on coarse pointers without growing the visual
          "relative before:absolute before:-inset-1.5 before:content-['']",
          'text-muted-foreground hover:text-foreground hover:bg-muted',
          'transition-colors duration-150'
        )}
      >
        <ArrowLeft className="w-4 h-4" weight="bold" aria-hidden="true" />
      </Link>

      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 min-w-0">
        {CrumbIcon && (
          <CrumbIcon
            className="w-3.5 h-3.5 shrink-0 text-muted-foreground"
            weight="duotone"
            aria-hidden="true"
          />
        )}
        <ol className="flex items-center gap-1.5 min-w-0 text-[11px]">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && (
                  <span className="text-muted-foreground/50" aria-hidden="true">
                    ·
                  </span>
                )}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground hover:text-foreground hover:underline underline-offset-2 transition-colors truncate"
                  >
                    <MonoLabel className="text-current tracking-wide">{crumb.label}</MonoLabel>
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={cn('truncate', isLast ? 'text-foreground' : 'text-muted-foreground')}
                  >
                    <MonoLabel className="text-current tracking-wide">{crumb.label}</MonoLabel>
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
