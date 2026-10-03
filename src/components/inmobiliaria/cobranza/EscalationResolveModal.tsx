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
import { WarningCircle, CheckCircle } from '@phosphor-icons/react'
import { Collapse, MonoLabel, Presence } from '@leasefy/cadence'

import { useI18n } from '@/lib/i18n'
import { useLenis } from '@/components/providers/SmoothScroll'
import { Button, Textarea } from '@/components/ui'
import { Checkbox } from '@/components/ui/checkbox'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { mensajeDeLaAccion } from '@/lib/hooks/cobranza/mensaje-de-la-accion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog'
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
  ) => Promise<{
    ok: boolean
    status: number
    cascaded_to_legal?: boolean
    /** El `ApiError` del micro o el error de la red (ver `use-escalations`). */
    fallo?: unknown
    /** Un código del hook cuando la acción ni salió. */
    error?: string
  }>
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
  /** El error de cada campo que mandó el micro en `campos` (un 400). */
  const [erroresDelServidor, setErroresDelServidor] = useState<
    Partial<Record<'category' | 'resolution_text', string>>
  >({})

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
      setErroresDelServidor({})
    }
  }, [isOpen, escalationId])

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
      setErroresDelServidor(({ category: _, ...resto }) => resto)
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
    setErroresDelServidor({})
    if (res.ok) {
      onClose()
    } else if (res.status === 403) {
      // El 403 del micro no trae un `message` para la persona: se dice acá.
      setSubmitError(t('inmobiliaria.ai.cobranza.escalaciones.errors.forbidden'))
    } else if (res.status === 404 || res.status === 409) {
      setSubmitError(t('inmobiliaria.ai.cobranza.escalaciones.errors.notFound'))
    } else if (res.fallo === undefined) {
      setSubmitError(
        mensajeDeLaAccion(res, {
          porDefecto: 'No pudimos resolver la escalación.',
          accion: 'resolver la escalación',
        }),
      )
    } else {
      // Un 400 con `campos` va a su campo; un 5xx dice «de nuestro lado» con
      // la referencia; la red, la conexión. Antes: «Error 500».
      const reparto = repartirErroresDelServidor<'category' | 'resolution_text'>(res.fallo, {
        campos: ['category', 'resolution_text'],
        porDefecto: 'No pudimos resolver la escalación.',
        accion: 'resolver la escalación',
      })
      setErroresDelServidor(reparto.porCampo)
      const primero = reparto.orden[0]
      if (primero) {
        document.getElementById(primero === 'category' ? 'resolve-category' : 'resolve-text')?.focus()
      }
      setSubmitError(reparto.sueltos.length > 0 ? reparto.sueltos.join(' · ') : null)
    }
  }, [escalationId, category, text, onResolve, onClose, t])

  /** El error del texto: el largo (en cuanto se escribe) o lo que mandó el micro. */
  const errorDelTexto =
    textLen > 0 && tooShort
      ? t('inmobiliaria.ai.cobranza.escalaciones.errors.tooShort')
      : tooLong
        ? t('inmobiliaria.ai.cobranza.escalaciones.errors.tooLong')
        : erroresDelServidor.resolution_text

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <ResponsiveDialogContent
        className="max-w-2xl max-h-[90dvh] overflow-y-auto"
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t('inmobiliaria.ai.cobranza.escalaciones.resolveModal.title')}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        {/* Category dropdown */}
        <div>
          <label htmlFor="resolve-category" className="mb-1.5 block">
            <MonoLabel>
              {t('inmobiliaria.ai.cobranza.escalaciones.resolveModal.categoryLabel')}
            </MonoLabel>
            <span className="ml-1 text-danger">*</span>
          </label>
          <Select
            value={category || undefined}
            onValueChange={(v) => handleCategoryChange(v as EscalationCategory)}
          >
            <SelectTrigger
              id="resolve-category"
              className="w-full"
              aria-invalid={erroresDelServidor.category ? true : undefined}
              aria-describedby={erroresDelServidor.category ? 'resolve-category-error' : undefined}
            >
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATES.map((tpl) => (
                <SelectItem key={tpl.id} value={tpl.id}>
                  {t(tpl.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ErrorDelCampo id="resolve-category-error" mensaje={erroresDelServidor.category} />
        </div>

        {/* Escalated-to-legal warning (rose banner per DESIGN.md §4) */}
        {/* Aparece y se va con su altura al elegir (o dejar) «pasa a jurídico». */}
        <Collapse open={requiresLegalAck}>
          <div className="rounded-lg bg-danger-soft border border-danger/30 p-3 flex items-start gap-2">
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
                <Checkbox
                  checked={ackLegal}
                  onCheckedChange={(c) => setAckLegal(c === true)}
                  data-testid="ack-legal-checkbox"
                />
                {/* La misma frase que declara el micro para la cola humana y el Piloto (02-10-2026). */}
                <span>
                  {t('inmobiliaria.ai.cobranza.escalaciones.resolveModal.escalatedToLegalAck')}
                </span>
              </label>
            </div>
          </div>
        </Collapse>

        {/* Free-form textarea */}
        <div>
          <label htmlFor="resolve-text" className="mb-1.5 block">
            <MonoLabel>
              {t('inmobiliaria.ai.cobranza.escalaciones.resolveModal.textLabel')}
            </MonoLabel>
            <span className="ml-1 text-danger">*</span>
          </label>
          <Textarea
            id="resolve-text"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setErroresDelServidor(({ resolution_text: _, ...resto }) => resto)
            }}
            aria-invalid={errorDelTexto ? true : undefined}
            aria-describedby={errorDelTexto ? 'resolve-text-error' : undefined}
            rows={6}
            maxLength={RESOLUTION_TEXT_MAX + 50 /* allow over-typing then show error */}
            className="w-full leading-relaxed"
            placeholder={t(
              'inmobiliaria.ai.cobranza.escalaciones.resolveModal.textLabel',
            )}
          />
          <div className="mt-1 flex items-start justify-between gap-3 text-[11px]">
            {/* Vacío, el mínimo es una pista; escrito y corto (o largo), un error. */}
            <ErrorDelCampo
              id="resolve-text-error"
              mensaje={errorDelTexto}
              pista={t('inmobiliaria.ai.cobranza.escalaciones.errors.tooShort')}
              className="mt-0"
            />
            <span className="ml-auto shrink-0 text-fg-subtle tabular-nums font-mono">
              {textLen} / {RESOLUTION_TEXT_MAX}
            </span>
          </div>
        </div>

        <Presence as="p" show={Boolean(submitError)} role="alert" className="text-xs text-danger" data-testid="escalacion-resolver-error">
            {submitError}
        </Presence>

        <ResponsiveDialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            {t('inmobiliaria.ai.cobranza.escalaciones.actions.cancel')}
          </Button>
          <Button
            type="button"
            size="sm"
            hideArrow
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            data-testid="resolve-submit-button"
          >
            <CheckCircle className="w-4 h-4" aria-hidden="true" />
            {t('inmobiliaria.ai.cobranza.escalaciones.resolveModal.submit')}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
