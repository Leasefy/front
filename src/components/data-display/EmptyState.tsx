'use client'

import * as React from 'react'

/**
 * EmptyState — Phase 38 plan 38-02 (D-38-03 / D-38-04).
 *
 * Universal empty-state primitive for "truly nothing" cases (zero quotes ever, no
 * deudores ever, etc.). NOT for "below threshold" cases — those keep using
 * <NoDataYetBadge /> and <SampleDataWatermark /> (Phases 35 / 37).
 *
 * - icon prop accepts any React component that consumes Phosphor-style props
 *   (className, size, weight). Per RESEARCH Topic 11 + D-38-02. The prop type
 *   uses the structural shape that aligns with `@phosphor-icons/react` IconProps
 *   so callers pass concrete icons (FolderOpen, Users, CheckCircle, ...) directly.
 * - title + description arrive PRE-TRANSLATED from the calling page. The primitive
 *   does NOT call useI18n — keeps it reusable across any tenant/locale context.
 * - Wrapper carries `role="status"` + `aria-label={title}` so the empty state is
 *   announced once by screen readers when it mounts (D-38-03).
 * - CTA renders as `<a>` when `href` is set; falls back to `<button>` when only
 *   `onClick` is set (D-38-04 supports both link and inline-form CTAs).
 */

type PhosphorIconProps = {
  className?: string
  size?: string | number
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
}

export type EmptyStateCta = {
  label: string
  href?: string
  onClick?: () => void
}

export type EmptyStateProps = {
  // Phase 38 plan 38-04a — widened to `any` props at the type boundary so any
  // Phosphor icon (ForwardRefExoticComponent<IconProps>) flows in without
  // requiring callers to cast. The runtime contract is unchanged: the
  // component is rendered with `weight` + `className` props below.
  icon: React.ComponentType<any>
  title: string
  description: string
  primaryCta?: EmptyStateCta
  secondaryCta?: EmptyStateCta
}

const PRIMARY_LINK_CLASSES =
  'text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-2'

const SECONDARY_LINK_CLASSES =
  'text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300 underline underline-offset-2'

function renderCta(cta: EmptyStateCta, classes: string): React.ReactElement | null {
  if (cta.href) {
    return (
      <a href={cta.href} className={classes}>
        {cta.label}
      </a>
    )
  }
  if (cta.onClick) {
    return (
      <button type="button" onClick={cta.onClick} className={classes}>
        {cta.label}
      </button>
    )
  }
  return null
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryCta,
  secondaryCta,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-label={title}
      className="rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/30 px-6 py-10 flex flex-col items-center gap-3 text-center"
    >
      <Icon
        weight="duotone"
        className="h-10 w-10 text-neutral-400"
        aria-hidden="true"
      />
      <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
        {title}
      </p>
      <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
        {description}
      </p>
      {primaryCta ? (
        <div className="mt-1">{renderCta(primaryCta, PRIMARY_LINK_CLASSES)}</div>
      ) : null}
      {secondaryCta ? <div>{renderCta(secondaryCta, SECONDARY_LINK_CLASSES)}</div> : null}
    </div>
  )
}
