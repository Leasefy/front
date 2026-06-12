'use client'

/**
 * PanelTour — Phase 38 plan 38-06 (D-38-05 / D-38-07 / D-38-08).
 *
 * Custom React onboarding-tour primitive for the AI panel. NO external library
 * dependency. Renders via React portal with a box-shadow cutout spotlight on the
 * target element + a tooltip popover positioned via getBoundingClientRect.
 *
 * Adaptive step targets (D-38-08):
 *   - On the AI hub (/panel/inmobiliaria/ai): highlights AI agent cards.
 *   - On any sub-page (/panel/inmobiliaria/ai/*): highlights sidebar nav links.
 *   - If the target element is absent (mobile collapsed sidebar, etc.), tooltip
 *     falls back to a centered modal with the step text only — no redirect.
 *
 * Accessibility (D-38-05):
 *   - role="dialog" + aria-modal="false" (background interaction allowed for
 *     context; D-38-07 confirms users can still click outside).
 *   - Escape key dismisses the tour.
 *   - autoFocus on the primary CTA each step.
 *   - Focus restoration to the previously focused element on dismiss.
 *   - prefers-reduced-motion: transition-none class applied.
 *
 * Security (T-38-06-01): All text rendered via {t(key)} — NO dangerouslySetInnerHTML.
 *
 * Refs:
 *   - .planning/phases/38-polish-empty-states-onboarding-a11y/38-CONTEXT.md (D-38-05/06/07/08)
 *   - .planning/phases/38-polish-empty-states-onboarding-a11y/38-06-PLAN.md
 *   - mvp/src/components/inmobiliaria/cobranza/EscalationResolveModal.tsx (portal + Escape pattern)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { FeatureAnnouncementCard } from './FeatureAnnouncementCard'

export interface TourStepConfig {
  /** i18n key for the step heading (e.g. 'inmobiliaria.ai.tour.step1.title') */
  titleKey: string
  /** i18n key for the step body copy */
  descriptionKey: string
  /** data-tour-target attribute value when the tour fires on the AI hub */
  hubTarget: string
  /** data-tour-target attribute value when the tour fires on a sub-page */
  subpageTarget: string
  /**
   * Brand hero image for the step card (Relume/Givingli-style announcement).
   * One DISTINCT image per feature — pool of 16 at public/images/features/
   * (leasefy-brand-01..16.jpg); pick an unused one for each new feature modal.
   */
  image: string
}

export interface PanelTourProps {
  /** Show the tour when true; close on dismiss/finish. */
  isOpen: boolean
  /** Fired on Escape, X button, "No mostrar" button, or "Finalizar" on the last step. */
  onDismiss: () => void
  /** When true the tour reads .hubTarget for each step; otherwise .subpageTarget. */
  isHub: boolean
}

// D-38-08 — adaptive target catalog. The 3 conceptual steps are constant.
export const TOUR_STEPS: TourStepConfig[] = [
  {
    titleKey: 'inmobiliaria.ai.tour.step1.title',
    descriptionKey: 'inmobiliaria.ai.tour.step1.description',
    hubTarget: 'cobranza-card',
    subpageTarget: 'sidebar-cobranza',
    image: '/images/features/leasefy-brand-09.jpg',
  },
  {
    titleKey: 'inmobiliaria.ai.tour.step2.title',
    descriptionKey: 'inmobiliaria.ai.tour.step2.description',
    hubTarget: 'cotizador-card',
    subpageTarget: 'sidebar-cotizador',
    image: '/images/features/leasefy-brand-02.jpg',
  },
  {
    titleKey: 'inmobiliaria.ai.tour.step3.title',
    descriptionKey: 'inmobiliaria.ai.tour.step3.description',
    hubTarget: 'sidebar-configuraciones',
    subpageTarget: 'sidebar-configuraciones',
    image: '/images/features/leasefy-brand-15.jpg',
  },
]

const TOTAL_STEPS = TOUR_STEPS.length

// Tooltip dimensions — used for viewport-edge clamping.
const TOOLTIP_WIDTH = 384
const TOOLTIP_OFFSET = 12

interface TooltipPosition {
  top: number
  left: number
  /** When true the tooltip renders as a centered fallback modal (no target found). */
  centered: boolean
}

export function PanelTour({ isOpen, onDismiss, isHub }: PanelTourProps) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [position, setPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    centered: true,
  })
  const prevFocusRef = useRef<HTMLElement | null>(null)
  const targetElRef = useRef<HTMLElement | null>(null)

  // Portal mount-guard — prevents SSR hydration mismatch.
  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset to step 0 + capture pre-tour focused element whenever the tour opens.
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
      if (typeof document !== 'undefined') {
        prevFocusRef.current = document.activeElement as HTMLElement | null
      }
    }
  }, [isOpen])

  // Restore focus to the previously-focused element on close.
  const dismissWithFocusRestore = useCallback(() => {
    // Clear any inline cutout styles on whatever element we were highlighting.
    if (targetElRef.current) {
      clearTargetStyles(targetElRef.current)
      targetElRef.current = null
    }
    onDismiss()
    // Focus restoration runs after dismiss so the caller can fully unmount us.
    setTimeout(() => {
      prevFocusRef.current?.focus?.()
    }, 0)
  }, [onDismiss])

  // Escape key dismisses the tour.
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismissWithFocusRestore()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, dismissWithFocusRestore])

  // Apply cutout style to current target + compute tooltip position.
  // Cleans up the prior target's style whenever the step changes or the tour closes.
  useEffect(() => {
    if (!isOpen || !mounted) {
      if (targetElRef.current) {
        clearTargetStyles(targetElRef.current)
        targetElRef.current = null
      }
      return
    }

    const step = TOUR_STEPS[currentStep]
    if (!step) return

    const attr = isHub ? step.hubTarget : step.subpageTarget
    const el = document.querySelector<HTMLElement>(
      `[data-tour-target="${attr}"]`,
    )

    // Clear any previously-highlighted element before applying to the new one.
    if (targetElRef.current && targetElRef.current !== el) {
      clearTargetStyles(targetElRef.current)
    }

    if (el) {
      applyTargetStyles(el)
      targetElRef.current = el
      const rect = el.getBoundingClientRect()
      const top = Math.max(8, rect.bottom + TOOLTIP_OFFSET)
      const rawLeft = rect.left
      const maxLeft = window.innerWidth - TOOLTIP_WIDTH - 8
      const left = Math.min(Math.max(8, rawLeft), Math.max(8, maxLeft))
      setPosition({ top, left, centered: false })
    } else {
      targetElRef.current = null
      setPosition({ top: 0, left: 0, centered: true })
    }

    return () => {
      if (targetElRef.current) {
        clearTargetStyles(targetElRef.current)
        targetElRef.current = null
      }
    }
  }, [isOpen, mounted, currentStep, isHub])

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      dismissWithFocusRestore()
    }
  }, [currentStep, dismissWithFocusRestore])

  if (!mounted || !isOpen) return null

  const step = TOUR_STEPS[currentStep]
  if (!step) return null

  const title = t(step.titleKey)
  const description = t(step.descriptionKey)
  const isLast = currentStep === TOTAL_STEPS - 1
  const primaryLabel = isLast
    ? t('inmobiliaria.ai.tour.finish')
    : t('inmobiliaria.ai.tour.next')
  const titleId = `panel-tour-step-${currentStep}-title`
  const descId = `panel-tour-step-${currentStep}-desc`

  const overlay = position.centered ? (
    // Centered-modal fallback: full backdrop (no cutout) — D-38-08.
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 motion-reduce:transition-none"
      // Clicking the backdrop in fallback mode dismisses, mirroring centered-modal UX.
      onClick={dismissWithFocusRestore}
    >
      <FeatureAnnouncementCard
        title={title}
        description={description}
        image={step.image}
        newBadge={t('common.new')}
        titleId={titleId}
        descId={descId}
        currentStep={currentStep}
        total={TOTAL_STEPS}
        primaryLabel={primaryLabel}
        dismissLabel={t('inmobiliaria.ai.tour.dismiss')}
        dismissLinkLabel={t('inmobiliaria.ai.tour.dismiss')}
        stepOf={t('inmobiliaria.ai.tour.stepOf', {
          current: currentStep + 1,
          total: TOTAL_STEPS,
        })}
        onNext={handleNext}
        onDismiss={dismissWithFocusRestore}
        // Centered announcement: wider hero card (clamped to the viewport).
        style={{ width: 560, maxWidth: 'calc(100vw - 2rem)' }}
        centered
        // Stop the backdrop click from dismissing when interacting with the card.
        onCardClick={(e) => e.stopPropagation()}
      />
    </div>
  ) : (
    // Anchored variant: target is spot-lit via the inline box-shadow cutout (no
    // separate overlay div needed). The tooltip floats next to the target.
    <div
      className="fixed z-[1000] motion-reduce:transition-none"
      style={{ top: position.top, left: position.left, width: TOOLTIP_WIDTH }}
    >
      <FeatureAnnouncementCard
        title={title}
        description={description}
        image={step.image}
        newBadge={t('common.new')}
        titleId={titleId}
        descId={descId}
        currentStep={currentStep}
        total={TOTAL_STEPS}
        primaryLabel={primaryLabel}
        dismissLabel={t('inmobiliaria.ai.tour.dismiss')}
        dismissLinkLabel={t('inmobiliaria.ai.tour.dismiss')}
        stepOf={t('inmobiliaria.ai.tour.stepOf', {
          current: currentStep + 1,
          total: TOTAL_STEPS,
        })}
        onNext={handleNext}
        onDismiss={dismissWithFocusRestore}
      />
    </div>
  )

  return createPortal(overlay, document.body)
}

// ── Spotlight cutout helpers ──────────────────────────────────────────────────
//
// The cutout effect is achieved entirely via inline styles on the target
// element: an oversize outward box-shadow paints the dimmed backdrop, while
// the element itself stays at its normal opacity. No separate overlay div is
// needed for the spotlight effect.

const CUTOUT_BOX_SHADOW = '0 0 0 9999px rgba(0, 0, 0, 0.55)'

interface SavedStyle {
  boxShadow: string
  position: string
  zIndex: string
  borderRadius: string
  transition: string
}

const STYLE_BACKUP = new WeakMap<HTMLElement, SavedStyle>()

function applyTargetStyles(el: HTMLElement): void {
  if (STYLE_BACKUP.has(el)) return // Already styled — don't double-apply.
  STYLE_BACKUP.set(el, {
    boxShadow: el.style.boxShadow,
    position: el.style.position,
    zIndex: el.style.zIndex,
    borderRadius: el.style.borderRadius,
    transition: el.style.transition,
  })
  // Position must be at least relative so z-index lifts the element above the
  // backdrop cast by its own box-shadow.
  const currentPosition = window.getComputedStyle(el).position
  if (currentPosition === 'static') {
    el.style.position = 'relative'
  }
  el.style.zIndex = '1001'
  el.style.boxShadow = CUTOUT_BOX_SHADOW
  // Round the spotlight subtly so card-shaped + link-shaped targets both feel
  // intentional. Caller-set border-radius is preserved through the backup.
  if (!el.style.borderRadius) {
    el.style.borderRadius = '8px'
  }
  el.style.transition = 'box-shadow 150ms ease-out'
}

function clearTargetStyles(el: HTMLElement): void {
  const saved = STYLE_BACKUP.get(el)
  if (!saved) return
  el.style.boxShadow = saved.boxShadow
  el.style.position = saved.position
  el.style.zIndex = saved.zIndex
  el.style.borderRadius = saved.borderRadius
  el.style.transition = saved.transition
  STYLE_BACKUP.delete(el)
}
