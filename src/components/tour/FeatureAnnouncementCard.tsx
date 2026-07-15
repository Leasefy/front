'use client'

/**
 * FeatureAnnouncementCard — the shared brand announcement card.
 *
 * Anatomy (BRAND-CONTRACT): full-bleed brand photo on top (no veil — the
 * photos ARE the brand moment), an Eyebrow row (BrandDot + mono "NUEVO" +
 * mono step counter — the ONE progress signal, no duplicate dots), Satoshi
 * title, quiet body copy, and a hairline-separated footer with the dismiss
 * link and a primary CTA with the arrow signature.
 *
 * Used by:
 *   - PanelTour (multi-step panel tour — shows counter + dismiss link)
 *   - AgentIntroModal (single-card per-agent presentation — CTA only)
 *
 * Brand image pool: public/images/features/leasefy-brand-01..16.jpg — every
 * feature announcement uses a DISTINCT image (see assignments in PanelTour
 * TOUR_STEPS and AgentIntroModal AGENT_INTROS).
 */

import * as React from 'react'
import Image from 'next/image'
import { X, ArrowRight } from '@phosphor-icons/react'

export interface FeatureAnnouncementCardProps {
  title: string
  description: string
  /** Brand hero image path (public/images/features/…). */
  image: string
  /** Localized "Nuevo" badge label. */
  newBadge: string
  titleId: string
  descId: string
  /** Zero-based step. For single-card announcements pass 0. */
  currentStep: number
  /** Total steps. When 1, the step counter is hidden. */
  total: number
  primaryLabel: string
  /** aria-label for the floating X button. */
  dismissLabel: string
  /** Optional "No mostrar de nuevo" footer link — omitted when undefined. */
  dismissLinkLabel?: string
  /** Screen-reader step announcement (sr-only live region). */
  stepOf?: string
  onNext: () => void
  onDismiss: () => void
  style?: React.CSSProperties
  /** Centered announcement variant: taller hero + roomier body. */
  centered?: boolean
  onCardClick?: (e: React.MouseEvent) => void
}

export function FeatureAnnouncementCard({
  title,
  description,
  image,
  newBadge,
  titleId,
  descId,
  currentStep,
  total,
  primaryLabel,
  dismissLabel,
  dismissLinkLabel,
  stepOf,
  onNext,
  onDismiss,
  style,
  centered = false,
  onCardClick,
}: FeatureAnnouncementCardProps) {
  const showProgress = total > 1

  // Focus lands on the dialog itself (not the CTA) so keyboard/SR users are
  // inside the card without painting a permanent focus ring on the button.
  const rootRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    rootRef.current?.focus()
  }, [])

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="overflow-hidden rounded-xl bg-surface border border-border-faint shadow-2xl outline-none motion-reduce:transition-none"
      style={style}
      onClick={onCardClick}
    >
      {/* Brand hero photo — full bleed, no veil. The hairline under it does
          the separation work (zero-gradient per contract §3). */}
      <div className={`relative w-full border-b border-border-faint ${centered ? 'h-64' : 'h-40'}`}>
        <Image
          src={image}
          alt=""
          fill
          sizes={centered ? '560px' : '380px'}
          className="object-cover"
          priority
        />
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-md bg-surface/95 backdrop-blur border border-black/[0.06] dark:border-white/10 flex items-center justify-center text-fg-subtle hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className={centered ? 'px-8 pt-7 pb-7' : 'px-6 pt-5 pb-5'}>
        {/* Eyebrow row — BrandDot + mono badge; counter mono a la derecha.
            ONE progress signal (the counter); the old dots duplicated it. */}
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-[2px] bg-primary shrink-0" />
          <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-primary">
            {newBadge}
          </span>
          {showProgress && (
            <span className="ml-auto font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-subtle tabular-nums">
              {`${currentStep + 1} / ${total}`}
            </span>
          )}
        </div>

        <h2
          id={titleId}
          className={`mt-3.5 font-medium tracking-[-0.02em] text-foreground leading-tight ${centered ? 'text-[26px]' : 'text-[20px]'}`}
        >
          {title}
        </h2>
        <p
          id={descId}
          className={`mt-2 text-fg-subtle leading-relaxed ${centered ? 'text-[14.5px]' : 'text-[13.5px]'}`}
        >
          {description}
        </p>

        {/* Polite live region announces step changes for screen readers. */}
        {stepOf && (
          <span aria-live="polite" className="sr-only">
            {stepOf}
          </span>
        )}

        {/* Footer — hairline-separated; quiet dismiss left, CTA right. */}
        <div className={`flex items-center justify-between gap-4 border-t border-border-faint ${centered ? 'mt-7 pt-5' : 'mt-5 pt-4'}`}>
          {dismissLinkLabel ? (
            <button
              type="button"
              onClick={onDismiss}
              className="text-[13px] text-fg-subtle hover:text-foreground transition-colors"
            >
              {dismissLinkLabel}
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onNext}
            className="group inline-flex items-center gap-2 h-10 px-5 rounded-md bg-primary text-primary-fg text-sm font-medium hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface transition-colors motion-reduce:transition-none"
          >
            {primaryLabel}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </button>
        </div>
      </div>
    </div>
  )
}
