'use client';

/**
 * AutopagoSection — tenant-facing autopago (domiciliación tokenizada) surface.
 *
 * Renders the configure / change / cancel UI for a lease's tokenized recurring
 * rent charge, driven ENTIRELY by the `autopagoApi` contract. Because Wompi
 * tokenization + the backend token store + the recurring scheduler do not exist
 * yet, the contract reports `available: false` and this component shows an honest
 * "Próximamente" empty-state (DESIGN.md §11).
 *
 * Guardrail: under NO branch does this component assert an active autopago, a
 * saved card, or a next charge date without the backend contract returning
 * `available: true && enabled: true`. There is no optimistic/local "activated"
 * flag and nothing is fabricated on a real-tenant path.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowsClockwise, CreditCard, CalendarDots } from '@phosphor-icons/react';

import { useI18n } from '@/lib/i18n';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { autopagoApi, type AutopagoStatus } from '@/lib/api/autopago.service';

interface AutopagoSectionProps {
  /** Active lease id — `null` while there is no active lease. */
  leaseId: string | null;
}

export function AutopagoSection({ leaseId }: AutopagoSectionProps) {
  const { locale } = useI18n();

  const [status, setStatus] = useState<AutopagoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let active = true;
    if (!leaseId) {
      // No lease → nothing to configure; degrade to the honest "unavailable" posture.
      setStatus({ enabled: false, available: false });
      setLoading(false);
      return;
    }
    setLoading(true);
    autopagoApi
      .get(leaseId)
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch(() => {
        // Unexpected (non-403/404/offline) error → stay honest, never fake enabled.
        if (active) setStatus({ enabled: false, available: false });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [leaseId]);

  const handleEnable = async () => {
    if (!leaseId) return;
    setEnabling(true);
    try {
      // The real Wompi tokenization flow supplies `paymentSourceToken` later; until
      // then the contract returns `available: false` and the UI stays on "Próximamente".
      const next = await autopagoApi.enable({ leaseId });
      setStatus(next);
      if (!next.available) {
        toast.info(
          locale === 'es'
            ? 'El autopago estará disponible próximamente.'
            : 'Autopay will be available soon.',
        );
      }
    } catch {
      toast.error(
        locale === 'es'
          ? 'No pudimos activar el autopago. Intentá más tarde.'
          : 'We could not enable autopay. Please try again later.',
      );
    } finally {
      setEnabling(false);
    }
  };

  const handleCancel = async () => {
    if (!leaseId) return;
    setCancelling(true);
    try {
      const next = await autopagoApi.cancel(leaseId);
      setStatus(next);
      toast.success(
        locale === 'es' ? 'Autopago cancelado.' : 'Autopay cancelled.',
      );
    } catch {
      toast.error(
        locale === 'es'
          ? 'No pudimos cancelar el autopago. Intentá más tarde.'
          : 'We could not cancel autopay. Please try again later.',
      );
    } finally {
      setCancelling(false);
    }
  };

  const description =
    locale === 'es'
      ? 'Programá el débito automático del arriendo cada mes.'
      : 'Schedule your rent to be charged automatically each month.';

  return (
    <section className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-md bg-surface-brand flex items-center justify-center flex-shrink-0">
          <ArrowsClockwise className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-fg dark:text-white">
            {locale === 'es' ? 'Autopago' : 'Autopay'}
          </h3>
          <p className="text-sm text-fg-muted dark:text-fg-subtle">{description}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner className="w-5 h-5 animate-spin text-fg-muted" />
        </div>
      ) : status && status.available && status.enabled ? (
        // ── Configured (only reachable when the backend certifies it) ──────────
        <div className="space-y-4">
          <div className="rounded-lg bg-surface-muted dark:bg-[#242426] p-4 space-y-3">
            {status.maskedMethod && (
              <div className="flex items-center gap-2 text-sm text-fg dark:text-white">
                <CreditCard className="w-4 h-4 text-fg-muted dark:text-fg-subtle" />
                <span>{status.maskedMethod}</span>
              </div>
            )}
            {status.nextChargeDate && (
              <div className="flex items-center gap-2 text-sm text-fg-muted dark:text-fg-subtle">
                <CalendarDots className="w-4 h-4" />
                <span>
                  {locale === 'es' ? 'Próximo cobro: ' : 'Next charge: '}
                  {new Date(status.nextChargeDate).toLocaleDateString(
                    locale === 'es' ? 'es-CO' : 'en-US',
                    { day: 'numeric', month: 'long', year: 'numeric' },
                  )}
                </span>
              </div>
            )}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" hideArrow isLoading={cancelling}>
                {locale === 'es' ? 'Cancelar autopago' : 'Cancel autopay'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {locale === 'es' ? '¿Cancelar el autopago?' : 'Cancel autopay?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {locale === 'es'
                    ? 'Dejaremos de cobrar tu arriendo automáticamente. Vas a tener que pagar cada mes manualmente.'
                    : 'We will stop charging your rent automatically. You will need to pay manually each month.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {locale === 'es' ? 'Volver' : 'Back'}
                </AlertDialogCancel>
                <AlertDialogAction tone="danger" onClick={handleCancel}>
                  {locale === 'es' ? 'Sí, cancelar' : 'Yes, cancel'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : status && status.available && !status.enabled ? (
        // ── Available but not yet set up → offer to activate ───────────────────
        <div className="space-y-3">
          <Button
            variant="secondary"
            size="sm"
            hideArrow
            onClick={handleEnable}
            isLoading={enabling}
          >
            {locale === 'es' ? 'Activar autopago' : 'Turn on autopay'}
          </Button>
        </div>
      ) : (
        // ── Not live yet (today's reality) → honest "Próximamente" ─────────────
        <EmptyState
          icon={ArrowsClockwise}
          title={locale === 'es' ? 'Próximamente' : 'Coming soon'}
          description={
            locale === 'es'
              ? 'El débito automático del arriendo estará disponible pronto. Por ahora podés pagar cada mes desde esta página.'
              : 'Automatic rent debit will be available soon. For now you can pay each month from this page.'
          }
        />
      )}
    </section>
  );
}
