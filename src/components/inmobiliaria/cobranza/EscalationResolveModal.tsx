'use client'

/**
 * EscalationResolveModal — Phase 34 plan 34-06 (D-34-05).
 *
 * Drawer on `sm` (slides from bottom), centered modal on `md+`. Reuses the
 * Phase 31 canonical drawer pattern from mvp:docs/DESIGN.md §4 + §8:
 *   - createPortal to document.body
 *   - useLenis().stop() on open, start() on close (Phase 31 invariant)
 *   - data-lenis-prevent on scrollable body
 *
 * Body:
 *   - Category dropdown (required, 5 D-34-05 templates from TEMPLATES const)
 *   - Free-form textarea, client-validated 80..2000 chars
 *   - When category='escalated-to-legal': inline warning banner +
 *     mandatory acknowledgement checkbox before submit enables
 *
 * Refs:
 *   mvp:docs/DESIGN.md §4 Drawers/Side Panels (canonical pattern)
 *   mvp:docs/DESIGN.md §8 Lenis Smooth Scroll (mandatory stop/start)
 *   mvp:docs/COLOR_SYSTEM.md (rose for warning, emerald for submit)
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, WarningCircle, CheckCircle } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { useLenis } from '@/components/providers/SmoothScroll'
import {
  RESOLUTION_TEXT_MAX,
  RESOLUTION_TEXT_MIN,
  TEMPLATES,
  type EscalationCategory,
} from '@/lib/constants/cobranza/escalation-templates'

interface EscalationResolveModalProps {
  escalationId: string | null
  isOpen: boolean
  onClose: () => void
  /**
   * Returns { ok, status } so the modal can show inline errors on failure
   * without dismissing user input.
   */
  onResolve: (
    id: string,
    body: { category: EscalationCategory; resolution_text: string },
  ) => Promise<{ ok: boolean; status: number; cascaded_to_legal?: boolean }>
}

export function EscalationResolveModal({
  escalationId,
  isOpen,
  onClose,
  onResolve,
}: EscalationResolveModalProps) {
  const { t } = useI18n()
  const lenis = useLenis()

  const [category, setCategory] = useState<EscalationCategory | ''>('')
  const [text, setText] = useState<string>('')
  const [ackLegal, setAckLegal] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [mounted, setMounted] = useState<boolean>(false)

  useEffect(() => setMounted(true), [])

  // Lenis stop/start — Phase 31 invariant (DESIGN.md §8)
  useEffect(() => {
    if (!isOpen) return
    lenis?.stop()
    return () => {
      lenis?.start()
    }
  }, [isOpen, lenis])

  // Reset form when modal opens for a new escalation
  useEffect(() => {
    if (isOpen) {
      setCategory('')
      setText('')
      setAckLegal(false)
      setSubmitError(null)
    }
  }, [isOpen, escalationId])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const requiresLegalAck = category === 'escalated-to-legal'
  const textLen = text.trim().length
  const tooShort = textLen < RESOLUTION_TEXT_MIN
  const tooLong = textLen > RESOLUTION_TEXT_MAX

  const canSubmit = useMemo(() => {
    if (!escalationId) return false
    if (category === '') return false
    if (tooShort || tooLong) return false
    if (requiresLegalAck && !ackLegal) return false
    return !submitting
  }, [escalationId, category, tooShort, tooLong, requiresLegalAck, ackLegal, submitting])

  // Seed textarea with translated stub when category changes (if textarea empty)
  const handleCategoryChange = useCallback(
    (next: EscalationCategory) => {
      setCategory(next)
      setSubmitError(null)
      setAckLegal(false)
      if (text.trim().length === 0) {
        const tpl = TEMPLATES.find((tp) => tp.id === next)
        if (tpl) setText(t(tpl.stubKey))
      }
    },
    [t, text],
  )

  const handleSubmit = useCallback(async () => {
    if (!escalationId || category === '') return
    setSubmitting(true)
    setSubmitError(null)
    const res = await onResolve(escalationId, {
      category,
      resolution_text: text.trim(),
    })
    setSubmitting(false)
    if (res.ok) {
      onClose()
    } else if (res.status === 403) {
      setSubmitError(t('inmobiliaria.ai.cobranza.escalaciones.errors.forbidden'))
    } else if (res.status === 404 || res.status === 409) {
      setSubmitError(t('inmobiliaria.ai.cobranza.escalaciones.errors.notFound'))
    } else {
      setSubmitError(`Error ${res.status}`)
    }
  }, [escalationId, category, text, onResolve, onClose, t])

  if (!isOpen || !mounted) return null

  const body = (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer on sm (bottom-anchored), centered modal on md+
          DESIGN.md §4 drawer pattern + §2 z-50 token + */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="escalation-resolve-title"
        className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-4 animate-in slide-in-from-bottom md:fade-in duration-300"
      >
        <div className="bg-card text-foreground rounded-t-xl md:rounded-xl w-full md:max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex-none flex items-center justify-between border-b border-border px-5 py-4">
            <h2
              id="escalation-resolve-title"
              className="text-base font-semibold text-foreground"
            >
              {t('inmobiliaria.ai.cobranza.escalaciones.resolveModal.title')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('inmobiliaria.ai.cobranza.escalaciones.actions.cancel')}
              className="rounded-sm p-1 hover:bg-muted transition"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Scrollable body — data-lenis-prevent per DESIGN.md §8 */}
          <div
            className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
            data-lenis-prevent
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          >
            {/* Category dropdown */}
            <div>
              <label
                htmlFor="resolve-category"
                className="block text-xs font-mono uppercase tracking-wide text-muted-foreground mb-1.5"
              >
                {t('inmobiliaria.ai.cobranza.escalaciones.resolveModal.categoryLabel')}
                <span className="text-danger ml-1">*</span>
              </label>
              <select
                id="resolve-category"
                value={category}
                onChange={(e) =>
                  handleCategoryChange(e.target.value as EscalationCategory)
                }
                className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="" disabled>
                  —
                </option>
                {TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {t(tpl.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Escalated-to-legal warning (rose banner per DESIGN.md §4) */}
            {requiresLegalAck && (
              <div className="rounded-xl bg-danger-soft border border-danger/30 p-3 flex items-start gap-2">
                <WarningCircle
                  className="w-5 h-5 text-danger flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-semibold text-danger">
                    {t(
                      'inmobiliaria.ai.cobranza.escalaciones.resolveModal.escalatedToLegalWarning',
                    )}
                  </p>
                  <label className="flex items-center gap-2 text-xs text-danger cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ackLegal}
                      onChange={(e) => setAckLegal(e.target.checked)}
                      className="rounded border-danger/30 text-danger focus:ring-danger"
                      data-testid="ack-legal-checkbox"
                    />
                    <span>Esto pasará el deudor a pre_judicial</span>
                  </label>
                </div>
              </div>
            )}

            {/* Free-form textarea */}
            <div>
              <label
                htmlFor="resolve-text"
                className="block text-xs font-mono uppercase tracking-wide text-muted-foreground mb-1.5"
              >
                {t('inmobiliaria.ai.cobranza.escalaciones.resolveModal.textLabel')}
                <span className="text-danger ml-1">*</span>
              </label>
              <textarea
                id="resolve-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                maxLength={RESOLUTION_TEXT_MAX + 50 /* allow over-typing then show error */}
                className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t(
                  'inmobiliaria.ai.cobranza.escalaciones.resolveModal.textLabel',
                )}
              />
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span
                  className={
                    tooShort
                      ? 'text-danger'
                      : tooLong
                        ? 'text-danger'
                        : 'text-muted-foreground'
                  }
                >
                  {tooShort
                    ? t('inmobiliaria.ai.cobranza.escalaciones.errors.tooShort')
                    : tooLong
                      ? t('inmobiliaria.ai.cobranza.escalaciones.errors.tooLong')
                      : ''}
                </span>
                <span className="text-muted-foreground tabular-nums font-mono">
                  {textLen} / {RESOLUTION_TEXT_MAX}
                </span>
              </div>
            </div>

            {submitError && (
              <p className="text-xs text-danger">{submitError}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex-none flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-1.5 text-sm font-medium rounded-sm border border-border text-foreground hover:bg-muted disabled:opacity-50"
            >
              {t('inmobiliaria.ai.cobranza.escalaciones.actions.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-sm bg-success dark:bg-success text-white hover:opacity-90 active:scale-[0.97] transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              data-testid="resolve-submit-button"
            >
              <CheckCircle className="w-4 h-4" aria-hidden="true" />
              {t('inmobiliaria.ai.cobranza.escalaciones.resolveModal.submit')}
            </button>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(body, document.body)
}
