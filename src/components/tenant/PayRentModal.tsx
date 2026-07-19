'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  X,
  CheckCircle,
  WarningCircle,
  Clock,
  Receipt,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { MonoLabel } from '@leasefy/cadence';
import { useI18n } from '@/lib/i18n';
import { useLenis } from '@/components/providers/SmoothScroll';
import { leasesApi } from '@/lib/api/leases.service';
import { getAccessToken } from '@/lib/api/client';
import {
  buildWompiCheckoutUrl,
  type WompiRentSession,
} from '@/lib/payments/wompi-rent-session';
import type { BackendPaymentInfo } from '@/lib/api/leases.types';

interface PayRentModalProps {
  open: boolean;
  leaseId: string;
  /** Callback cuando se cierra el modal (éxito o cancelación). */
  onClose: () => void;
  /**
   * Compat con los dos call sites (pagos + arriendo). YA NO se invoca:
   * el pago se confirma del lado del servidor cuando el inquilino vuelve de
   * Wompi (v7-04-03) — el navegador abandona la página en el redirect, así que
   * no hay resultado in-page que reportar.
   */
  onPaid?: () => void;
  /** Valores iniciales sugeridos (compat con los call sites). */
  prefill?: {
    fullName?: string;
    email?: string;
  };
}

type Step =
  | 'loading'
  | 'period-blocked' // currentPeriodStatus === PENDING_VALIDATION | APPROVED
  | 'confirm'
  | 'redirecting'; // mientras se pide la sesión Wompi y se redirige al checkout

/**
 * Modal de pago de arriendo vía Wompi (hosted checkout). Flujo:
 *  1. loading  → carga /leases/:id/payment-info (fuente de verdad del monto)
 *  2. period-blocked → PENDING_VALIDATION | APPROVED (sin doble-pago)
 *  3. confirm  → muestra período + monto real, CTA "PAGAR ARRIENDO"
 *  4. redirecting → POST /api/inquilino/pagos/wompi-session { leaseId } y redirect
 *
 * El monto lo resuelve el servidor (anti-tamper): el cliente NUNCA envía amount.
 * Los métodos (PSE, tarjeta, Nequi) se eligen en la página segura de Wompi.
 */
export function PayRentModal({ open, leaseId, onClose }: PayRentModalProps) {
  const { formatCurrency, locale } = useI18n();
  const lenis = useLenis();

  // Pause Lenis smooth scroll while the modal is open (DESIGN.md §8).
  useEffect(() => {
    if (open) lenis.stop();
    else lenis.start();
    return () => lenis.start();
  }, [open, lenis]);

  const [step, setStep] = useState<Step>('loading');
  const [paymentInfo, setPaymentInfo] = useState<BackendPaymentInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Cargar /payment-info al abrir
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setStep('loading');
    setLoadError(null);

    leasesApi
      .getPaymentInfo(leaseId)
      .then((info) => {
        if (cancelled) return;
        setPaymentInfo(info);
        // Pre-flight: si ya hay request en validación o pago aprobado, bloquear.
        // REJECTED y NONE caen al confirm (REJECTED muestra el motivo en el confirm).
        if (
          info.currentPeriodStatus === 'PENDING_VALIDATION' ||
          info.currentPeriodStatus === 'APPROVED'
        ) {
          setStep('period-blocked');
        } else {
          setStep('confirm');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'No se pudo cargar la información de pago.';
        setLoadError(msg);
      });

    return () => { cancelled = true; };
  }, [open, leaseId]);

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setStep('loading');
      setPaymentInfo(null);
      setLoadError(null);
    }
  }, [open]);

  // Inicia la sesión Wompi y redirige al hosted checkout.
  // Envía SOLO { leaseId } (+ Bearer) — el monto lo resuelve y firma el servidor.
  const handlePayWithWompi = useCallback(async () => {
    if (!paymentInfo) return;
    setStep('redirecting');
    try {
      const token = getAccessToken();
      const res = await fetch('/api/inquilino/pagos/wompi-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ leaseId }), // ONLY leaseId — nunca un amount (anti-tamper)
      });

      if (res.status === 409) {
        toast.error('Este período ya está pagado o en verificación.');
        setStep('confirm');
        return;
      }
      if (!res.ok) throw new Error(`session_failed:${res.status}`);

      const session = (await res.json()) as WompiRentSession;
      const url = buildWompiCheckoutUrl({
        ...session,
        redirectUrl: window.location.origin + '/inquilino/pagos',
      });
      window.location.href = url;
    } catch {
      toast.error('No pudimos iniciar el pago. Intentá nuevamente.');
      setStep('confirm');
    }
  }, [paymentInfo, leaseId]);

  const monthName = paymentInfo
    ? new Date(paymentInfo.currentPeriod.year, paymentInfo.currentPeriod.month - 1, 1)
        .toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={step === 'redirecting' ? undefined : onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-[22px] w-full max-w-lg border border-border shadow-lg"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-primary-soft flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-fg">
                    Pagar arriendo
                  </h2>
                  <p className="text-xs text-fg-muted mt-0.5">
                    Método: Wompi (PSE, tarjeta o Nequi)
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={step === 'redirecting'}
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Body */}
            <div
              className="p-5 max-h-[70vh] overflow-y-auto"
              data-lenis-prevent
              style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
            >
              {/* Loading */}
              {step === 'loading' && !loadError && (
                <div className="py-10 flex flex-col items-center justify-center gap-3 text-sm text-fg-muted">
                  <Spinner size="lg" variant="current" />
                  Cargando información de pago...
                </div>
              )}

              {loadError && (
                <div className="py-6 flex items-start gap-3 rounded-[14px] border border-danger/30 bg-danger-soft p-4">
                  <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-danger">{loadError}</p>
                </div>
              )}

              {/* Step: period-blocked (PENDING_VALIDATION | APPROVED) */}
              {step === 'period-blocked' &&
                paymentInfo &&
                (paymentInfo.currentPeriodStatus === 'PENDING_VALIDATION' ||
                  paymentInfo.currentPeriodStatus === 'APPROVED') && (
                  <PeriodBlockedPanel
                    status={paymentInfo.currentPeriodStatus}
                    monthName={monthName}
                    amount={paymentInfo.monthlyRent}
                    formatCurrency={formatCurrency}
                  />
                )}

              {/* Step: confirm */}
              {step === 'confirm' && paymentInfo && (
                <div className="space-y-4">
                  {paymentInfo.currentPeriodStatus === 'REJECTED' && (
                    <div className="rounded-[14px] border border-danger/30 bg-danger-soft p-3 flex items-start gap-2">
                      <WarningCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-danger">
                        <p className="font-medium mb-0.5">Tu pago anterior fue rechazado.</p>
                        {paymentInfo.currentPeriodRejectionReason && (
                          <p className="opacity-90">{paymentInfo.currentPeriodRejectionReason}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="rounded-[18px] border border-border bg-surface-muted p-4">
                    <MonoLabel className="block tracking-wider mb-1 text-fg-muted">Período</MonoLabel>
                    <p className="text-sm font-medium text-fg capitalize">{monthName}</p>
                    <div className="border-t border-border-faint my-3" />
                    <MonoLabel className="block tracking-wider mb-1 text-fg-muted">Monto a pagar</MonoLabel>
                    <p className="text-3xl font-bold text-fg font-mono tabular-nums">
                      {formatCurrency(paymentInfo.monthlyRent)}
                    </p>
                  </div>
                  <p className="text-xs text-fg-muted">
                    Vas a completar el pago en la página segura de <strong>Wompi</strong> (PSE,
                    tarjeta o Nequi). La confirmación aparece en tu historial una vez verificado.
                  </p>
                </div>
              )}

              {/* Step: redirecting */}
              {step === 'redirecting' && (
                <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
                  <Spinner size="xl" variant="current" className="text-primary" />
                  <p className="text-sm font-medium text-fg">Te estamos llevando al pago seguro…</p>
                  <p className="text-xs text-fg-muted">No cierres esta ventana.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border flex items-center justify-between gap-2">
              {step === 'period-blocked' && (
                <Button
                  type="button"
                  onClick={onClose}
                  hideArrow
                  className="ml-auto"
                >
                  Cerrar
                </Button>
              )}

              {step === 'confirm' && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handlePayWithWompi}
                    disabled={!paymentInfo}
                    hideArrow
                  >
                    {paymentInfo?.currentPeriodStatus === 'REJECTED'
                      ? 'Reintentar pago'
                      : 'PAGAR ARRIENDO'}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-fg-muted">{label}</span>
      <span
        className={cn(
          'text-fg font-medium text-right break-all',
          mono && 'font-mono tabular-nums text-[11px]'
        )}
      >
        {value || '—'}
      </span>
    </div>
  );
}

function PeriodBlockedPanel({
  status,
  monthName,
  amount,
  formatCurrency,
}: {
  status: 'PENDING_VALIDATION' | 'APPROVED';
  monthName: string;
  amount: number;
  formatCurrency: (n: number) => string;
}) {
  if (status === 'APPROVED') {
    return (
      <div className="py-6 flex flex-col items-center text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-success-soft flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <div>
          <p className="text-lg font-semibold text-fg">Pago confirmado</p>
          <p className="text-sm text-fg-muted mt-1 capitalize">
            {monthName}
          </p>
        </div>
        <div className="rounded-[14px] border border-border bg-surface-muted p-3 w-full text-xs">
          <Row label="Monto" value={formatCurrency(amount)} mono />
        </div>
        <p className="text-xs text-fg-muted">
          Tu pago de este mes ya fue confirmado por el propietario.
        </p>
      </div>
    );
  }

  // PENDING_VALIDATION — período en verificación (no volver a pagar)
  return (
    <div className="py-6 flex flex-col items-center text-center space-y-3">
      <div className="w-14 h-14 rounded-full bg-warning-soft flex items-center justify-center">
        <Clock className="w-8 h-8 text-warning" />
      </div>
      <div>
        <p className="text-lg font-semibold text-fg">Pago en verificación</p>
        <p className="text-sm text-fg-muted mt-1 capitalize">
          {monthName}
        </p>
      </div>
      <div className="rounded-[14px] border border-border bg-surface-muted p-3 w-full text-xs">
        <Row label="Monto" value={formatCurrency(amount)} mono />
      </div>
      <p className="text-xs text-fg-muted">
        Tu pago está en verificación. No hace falta volver a pagar — vas a
        ver la confirmación en tu historial cuando termine.
      </p>
    </div>
  );
}
