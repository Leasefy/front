'use client'

/**
 * FeatureAnnouncementCard — the shared Relume/Givingli-style announcement card:
 * brand hero image on top (with floating close), "Nuevo" badge, Satoshi title,
 * body copy, and a footer with optional dismiss link + progress dots + CTA.
 *
 * Used by:
 *   - PanelTour (multi-step panel tour — shows counter + dots + dismiss link)
 *   - AgentIntroModal (single-card per-agent presentation — CTA only)
 *
 * Brand image pool: public/images/features/leasefy-brand-01..16.jpg — every
 * feature announcement uses a DISTINCT image (see assignments in PanelTour
 * TOUR_STEPS and AgentIntroModal AGENT_INTROS).
 */

import Image from 'next/image'
import { X } from '@phosphor-icons/react'

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
  /** Total steps. When 1, the counter + progress dots are hidden. */
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

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="overflow-hidden rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xl motion-reduce:transition-none"
      style={style}
      onClick={onCardClick}
    >
      {/* Brand hero image with floating close button */}
      <div className={`relative w-full ${centered ? 'h-48' : 'h-36'}`}>
        <Image
          src={image}
          alt=""
          fill
          sizes={centered ? '420px' : '340px'}
          className="object-cover"
          priority
        />
        {/* Soft bottom fade so the image melts into the card body */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white/90 dark:from-neutral-900/90 to-transparent" />
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="absolute top-3 right-3 w-8 h-8 rounded-md bg-white/90 dark:bg-neutral-900/80 backdrop-blur flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" weight="bold" />
        </button>
      </div>

      {/* Body */}
      <div className={centered ? 'px-6 pb-6 pt-1' : 'px-5 pb-5 pt-1'}>
        <div className="flex items-center gap-2 mb-2.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#EEF1FF] dark:bg-[#1A40FF]/20 text-[11px] font-mono uppercase tracking-[0.08em] text-[#1A40FF] dark:text-[#8FA3FF]">
            {newBadge}
          </span>
          {showProgress && (
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {`${currentStep + 1} / ${total}`}
            </span>
          )}
        </div>

        <h2
          id={titleId}
          className={`font-medium tracking-[-0.01em] text-neutral-900 dark:text-white mb-2 leading-snug ${centered ? 'text-[24px]' : 'text-[20px]'}`}
        >
          {title}
        </h2>
        <p
          id={descId}
          className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-5"
        >
          {description}
        </p>

        {/* Polite live region announces step changes for screen readers. */}
        {stepOf && (
          <span aria-live="polite" className="sr-only">
            {stepOf}
          </span>
        )}

        <div className="flex items-center justify-between gap-3">
          {dismissLinkLabel ? (
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 underline underline-offset-2"
            >
              {dismissLinkLabel}
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-3">
            {showProgress && (
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {Array.from({ length: total }, (_, i) => (
                  <span
                    key={i}
                    className={`rounded-full transition-all duration-200 motion-reduce:transition-none ${
                      i === currentStep
                        ? 'w-4 h-1.5 bg-[#1A40FF] dark:bg-[#5570FF]'
                        : 'w-1.5 h-1.5 bg-neutral-300 dark:bg-neutral-600'
                    }`}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              // autoFocus on the primary CTA keeps keyboard nav obvious.
              autoFocus
              onClick={onNext}
              className="px-5 py-2.5 rounded-md bg-[#1A40FF] text-white text-sm font-medium hover:bg-[#1636D8] active:scale-[0.98] transition-all motion-reduce:transition-none"
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
