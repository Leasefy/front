'use client';

/**
 * SolicitarPlanPagoModal — v7-07-07 (ACUE-04) tenant "propose a payment plan" Dialog.
 *
 * The tenant PROPOSES a pre-mora payment plan; the proposal feeds the agency approval
 * pipeline. The form is INTENT-ONLY: it carries the tenant's lease id (resolved from the
 * prop or the primary active lease) plus ONE optional, neutral free-text note — and
 * nothing else. It has NO amount, NO cuota-count, NO first-date, NO discount, and NO
 * consequence editor: the tenant never sets terms. Those all live agency-side; the
 * agent's requiresHumanReview() gate + the agency operator decide (T-323, A5).
 *
 * The form also asks for NO arrears cause of any kind (Ley 2300/2023 art. 7) and copies
 * NO credit-bureau text (Ley 1266/2008 + 2157/2021) — the agency consequence UI is
 * deliberately not reproduced here.
 *
 * Shell: the canonical `Dialog` (DESIGN.md §17: header/body/footer, Button isLoading,
 * toast); Lenis lo frena `SmoothScroll` al ver el diálogo abierto. Mientras envía no
 * se sale (ni Esc, ni el velo, ni la ✕). Buttons sentence case (DESIGN §4), inline
 * es-CO copy. Zero new npm packages.
 *
 * Honest-degrade: submit → acuerdosApi.requestPremoraPlan({ leaseId, nota }); success →
 * toast + onRequested?.() + onClose(); AcuerdoUnavailableError → honest "Próximamente"
 * toast with the form left intact (never a fabricated plan/radicado); any other error →
 * a generic retry toast.
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/components/ui/toast';
import { Handshake, Info } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useLeases } from '@/lib/hooks/useLeases';
import {
  acuerdosApi,
  AcuerdoUnavailableError,
} from '@/lib/api/tenant-acuerdos.service';

interface SolicitarPlanPagoModalProps {
  open: boolean;
  onClose: () => void;
  /** Fired after a real request is accepted so the list can refetch. */
  onRequested?: () => void;
  /** Optional explicit lease; when absent the primary active lease is used. */
  leaseId?: string;
}

/** Optional, neutral note cap. */
const NOTA_MAX = 500;

export function SolicitarPlanPagoModal({
  open,
  onClose,
  onRequested,
  leaseId,
}: SolicitarPlanPagoModalProps) {
  const { locale } = useI18n();
  const { leases, getActive, isLoading: leasesLoading } = useLeases();

  const [nota, setNota] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset the note when the modal closes so a re-open starts clean.
  useEffect(() => {
    if (!open) {
      setNota('');
      setIsSubmitting(false);
    }
  }, [open]);

  // Resolve which lease the proposal is for: the explicit prop, else the primary
  // active lease. The tenant sees a read-only summary and never sets terms.
  const activeLeases = getActive();
  const targetLease = leaseId
    ? leases.find((l) => l.id === leaseId) ?? activeLeases[0]
    : activeLeases[0];
  const resolvedLeaseId = leaseId ?? targetLease?.id;

  const handleSubmit = useCallback(async () => {
    if (!resolvedLeaseId) {
      toast.error(
        locale === 'es'
          ? 'No encontramos un arriendo activo para tu solicitud.'
          : 'We could not find an active lease for your request.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Intent only: the body carries the lease id and the optional note — never
      // amounts, cuotas, dates, discounts, or consequences. The agency + the agent
      // compute and approve. La nota viaja y se ve en el Piloto (03-10-2026).
      await acuerdosApi.requestPremoraPlan({ leaseId: resolvedLeaseId, nota });
      toast.success(
        locale === 'es'
          ? 'Enviamos tu solicitud. Tu inmobiliaria la revisará.'
          : 'We sent your request. Your agency will review it.',
      );
      onRequested?.();
      onClose();
    } catch (err) {
      if (err instanceof AcuerdoUnavailableError) {
        // Backend not live → honest "Próximamente". No fabricated plan/radicado; the
        // form is left intact so the note is not lost.
        toast.info(
          locale === 'es'
            ? 'Estamos habilitando las solicitudes de plan de pago. Vuelve a intentarlo pronto.'
            : 'We are enabling payment plan requests. Please try again soon.',
        );
      } else {
        // 02-10-2026 · Regla de oro: un 4xx dice qué pasó (lo que mandó el
        // back), un 5xx que fue nuestro con la referencia; «conexión» sólo sin
        // respuesta. Antes era siempre el mismo genérico.
        toast.error(
          mensajeParaLaPersona(err, {
            accion: 'enviar tu solicitud',
            porDefecto:
              locale === 'es'
                ? 'No pudimos enviar tu solicitud. Intenta de nuevo.'
                : 'We could not submit your request. Please try again.',
          }),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [resolvedLeaseId, nota, locale, onRequested, onClose]);

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        // Mientras envía no se sale (ni con Esc, ni con el velo, ni con la ✕).
        if (!abierto && !isSubmitting) onClose();
      }}
    >
      <DialogContent size="md" icon={<Handshake weight="bold" />}>
        <DialogHeader>
          <DialogTitle>
            {locale === 'es' ? 'Solicitar un plan de pago' : 'Request a payment plan'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'es'
              ? 'Propones el plan; tu inmobiliaria lo revisa y aprueba.'
              : 'You propose the plan; your agency reviews and approves it.'}
          </DialogDescription>
        </DialogHeader>

        {/* T-323 notice — the tenant proposes; the agency sets and approves terms. */}
        <div className="rounded-[14px] border border-primary/20 bg-primary-soft p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-fg">
            {locale === 'es'
              ? 'Estás proponiendo un plan de pago. Los términos los define y aprueba tu inmobiliaria.'
              : 'You are proposing a payment plan. The terms are set and approved by your agency.'}
          </p>
        </div>

        {/* Read-only summary of which arriendo the request is for */}
        <div>
          <span className="block text-sm font-medium text-fg mb-1.5">
            {locale === 'es' ? 'Arriendo' : 'Lease'}
          </span>
          {leasesLoading ? (
            <div className="flex items-center gap-2 text-sm text-fg-muted rounded-[14px] border border-border bg-surface-hover p-4">
              <Spinner size="sm" variant="current" />
              {locale === 'es' ? 'Cargando tu arriendo…' : 'Loading your lease…'}
            </div>
          ) : targetLease ? (
            <div className="rounded-[14px] border border-border bg-surface-hover p-4">
              <p className="text-sm font-medium text-fg">{targetLease.propertyTitle}</p>
              <p className="text-xs text-fg-muted mt-0.5">
                {[targetLease.propertyAddress, targetLease.propertyCity]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          ) : (
            <div className="rounded-[14px] border border-border bg-surface-hover p-4">
              <p className="text-sm text-fg-muted">
                {locale === 'es'
                  ? 'No encontramos un arriendo activo asociado a tu cuenta.'
                  : 'We could not find an active lease on your account.'}
              </p>
            </div>
          )}
        </div>

        {/* Optional, neutral contact-preference note (NOT an arrears-cause field). */}
        <div>
          <label htmlFor="plan-nota" className="block text-sm font-medium text-fg mb-1.5">
            {locale === 'es'
              ? '¿Algo que quieras contarle a tu inmobiliaria? (opcional)'
              : 'Anything you would like to tell your agency? (optional)'}
          </label>
          <Textarea
            id="plan-nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={NOTA_MAX}
            rows={3}
            disabled={isSubmitting}
            placeholder={
              locale === 'es'
                ? 'Ej.: prefiero que me contacten por WhatsApp en la tarde.'
                : 'e.g. I prefer to be contacted on WhatsApp in the afternoon.'
            }
            aria-label={locale === 'es' ? 'Nota para tu inmobiliaria' : 'Note for your agency'}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {locale === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting || !resolvedLeaseId}
            hideArrow
          >
            {locale === 'es' ? 'Enviar solicitud' : 'Submit request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
