'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  WarningCircle,
  Clock,
  Receipt,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type DialogVariant,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { MonoLabel } from '@leasefy/cadence';
import { useI18n } from '@/lib/i18n';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { leasesApi } from '@/lib/api/leases.service';
import { getAccessToken, type ApiError } from '@/lib/api/client';
import { falloDelMicro } from '@/lib/api/fallo-del-micro';
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
   * Compat con los dos call sites (pagos + arriendo). YA NO se invoca: el pago
   * se confirma del lado del servidor cuando el inquilino vuelve de Wompi
   * (ver el manejo de ?id/&status en /inquilino/pagos) — el navegador
   * abandona la página en el redirect, así que no hay resultado in-page que
   * reportar acá.
   */
  onPaid?: () => void;
  /** Valores iniciales sugeridos (compat con los call sites — ya no se usan). */
  prefill?: {
    fullName?: string;
    email?: string;
  };
}

type Step =
  | 'loading'
  | 'period-blocked' // currentPeriodStatus === PENDING_VALIDATION | APPROVED
  | 'confirm'
  | 'redirecting'; // pidiendo la sesión Wompi + redirigiendo al checkout

/**
 * Modal de pago de arriendo vía Wompi (hosted checkout). Flujo:
 *  1. loading         → carga /leases/:id/payment-info (fuente de verdad del monto)
 *  2. period-blocked  → PENDING_VALIDATION | APPROVED (sin doble-pago)
 *  3. confirm         → muestra período + monto real, CTA "Pagar arriendo"
 *  4. redirecting     → POST /api/inquilino/pagos/wompi-session { leaseId } y redirect
 *
 * El monto lo resuelve el servidor (anti-tamper): el cliente NUNCA envía amount.
 * Los métodos (PSE, tarjeta, Nequi) se eligen en la página segura de Wompi.
 *
 * Es el `Dialog` canónico (DESIGN.md §17). La variante sigue al estado: el
 * período ya pagado es `success`, el que está en verificación lleva el reloj
 * ámbar de siempre (`warning` + `Clock`) y el error de carga es `error`; cargar,
 * confirmar y redirigir son el modal de pago (medallón con el recibo). Mientras
 * redirige NO se sale: sin ✕ (`hideClose`) y el `onOpenChange` lo ignora (Esc
 * y el velo incluidos). Lenis lo frena `SmoothScroll` al ver el diálogo abierto.
 */
/**
 * Por qué no arrancó el pago, según lo que respondió `/api/inquilino/pagos/wompi-session`.
 *
 * 02-10-2026 · La ruta responde con el sobre de error (`{ statusCode, code,
 * message }`, `message` en español): se dice SU frase con el traductor y la
 * regla de oro (un 5xx, «de nuestro lado» con la referencia). Las frases por
 * status quedan para cuando no hay frase legible (una respuesta sin el sobre,
 * un balanceador). Nunca se decide por el texto.
 */
export function motivoDelPagoQueNoInicio(fallo: { status: number } | ApiError): string {
  const status = fallo.status;
  let porDefecto = 'No pudimos iniciar el pago. Prueba de nuevo en un momento.';
  if (status === 401) porDefecto = 'Tu sesión expiró. Vuelve a iniciar sesión para pagar.';
  else if (status === 403 || status === 404) {
    porDefecto = 'No encontramos este arriendo a tu nombre. Recarga la página e intenta de nuevo.';
  } else if (status === 409) porDefecto = 'Este período ya está pagado o en verificación.';
  else if (status === 400 || status === 422) {
    porDefecto = 'No pudimos iniciar el pago con estos datos. Recarga la página e intenta de nuevo.';
  }
  return mensajeParaLaPersona(fallo, { accion: 'iniciar el pago', porDefecto });
}

/**
 * La respuesta que no salió bien, como error: con el sobre, un `ApiError` con
 * su `code`, su frase y su referencia; sin el sobre (no trae `statusCode`),
 * sólo el status, para que un `{ error: 'código_en_inglés' }` nunca se vea.
 */
async function falloDeLaSesionDePago(res: Response): Promise<{ status: number } | ApiError> {
  const fallo = await falloDelMicro(res);
  return typeof fallo.detalle?.statusCode === 'number' ? fallo : { status: res.status };
}

export function PayRentModal({ open, leaseId, onClose }: PayRentModalProps) {
  const { formatCurrency, locale } = useI18n();

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
        setLoadError(mensajeParaLaPersona(err, { accion: 'cargar la información de pago' }));
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

      // Un 409 (`PERIODO_NO_PAGABLE`: ya pagado o en verificación) también
      // vuelve a confirmar, con la frase de la ruta.
      if (!res.ok) {
        toast.error(motivoDelPagoQueNoInicio(await falloDeLaSesionDePago(res)));
        setStep('confirm');
        return;
      }

      const session = (await res.json()) as WompiRentSession;
      const url = buildWompiCheckoutUrl({
        ...session,
        redirectUrl: window.location.origin + '/inquilino/pagos',
      });
      window.location.href = url;
    } catch (err) {
      // 🔴 02-10-2026 · Regla de oro: «conexión» sólo si el pedido no salió;
      // antes todo decía «No pudimos iniciar el pago. Intenta nuevamente.».
      toast.error(
        mensajeParaLaPersona(err, {
          accion: 'iniciar el pago',
          porDefecto: 'No pudimos iniciar el pago. Prueba de nuevo en un momento.',
        }),
      );
      setStep('confirm');
    }
  }, [paymentInfo, leaseId]);

  const monthName = paymentInfo
    ? new Date(paymentInfo.currentPeriod.year, paymentInfo.currentPeriod.month - 1, 1)
        .toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', { month: 'long', year: 'numeric' })
    : '';

  const blockClose = step === 'redirecting';

  // El período que no se vuelve a pagar (ya pagado o en verificación).
  const blockedStatus =
    step === 'period-blocked' &&
    paymentInfo &&
    (paymentInfo.currentPeriodStatus === 'PENDING_VALIDATION' ||
      paymentInfo.currentPeriodStatus === 'APPROVED')
      ? paymentInfo.currentPeriodStatus
      : null;

  // La variante sigue al estado (DESIGN.md §17, «éxito / error dentro del mismo modal»).
  const variant: DialogVariant | undefined = loadError
    ? 'error'
    : blockedStatus === 'APPROVED'
      ? 'success'
      : blockedStatus === 'PENDING_VALIDATION'
        ? 'warning'
        : undefined;
  const icon =
    blockedStatus === 'PENDING_VALIDATION' ? (
      <Clock weight="bold" />
    ) : variant ? undefined : (
      <Receipt weight="bold" />
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        // Mientras redirige a Wompi no se sale (ni Esc, ni el velo).
        if (!abierto && !blockClose) onClose();
      }}
    >
      <DialogContent size="md" variant={variant} icon={icon} hideClose={blockClose}>
        <DialogHeader>
          {loadError ? (
            <>
              <DialogTitle>No se pudo cargar la información de pago</DialogTitle>
              <DialogDescription>{loadError}</DialogDescription>
            </>
          ) : blockedStatus ? (
            <>
              <DialogTitle>
                {blockedStatus === 'APPROVED' ? 'Pago confirmado' : 'Pago en verificación'}
              </DialogTitle>
              <DialogDescription className="capitalize">{monthName}</DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle>Pagar arriendo</DialogTitle>
              <DialogDescription>Método: Wompi (PSE, tarjeta o Nequi)</DialogDescription>
            </>
          )}
        </DialogHeader>

        {/* Loading */}
        {step === 'loading' && !loadError && (
          <div className="py-10 flex flex-col items-center justify-center gap-3 text-sm text-fg-muted">
            <Spinner size="lg" variant="current" />
            Cargando información de pago...
          </div>
        )}

        {/* Step: period-blocked (PENDING_VALIDATION | APPROVED) */}
        {blockedStatus && paymentInfo && (
          <PeriodBlockedPanel
            status={blockedStatus}
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
            <div className="rounded-[18px] border border-border bg-surface-hover p-4">
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

        {/* Pie: sólo los estados con acciones (cargando y redirigiendo no tienen). */}
        {step === 'period-blocked' ? (
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} hideArrow>
              Cerrar
            </Button>
          </DialogFooter>
        ) : step === 'confirm' ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
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
                : 'Pagar arriendo'}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
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

/**
 * Lo que queda del período bloqueado en el cuerpo: el título («Pago confirmado» /
 * «Pago en verificación»), el mes y el medallón ya van en la cabecera.
 */
function PeriodBlockedPanel({
  status,
  amount,
  formatCurrency,
}: {
  status: 'PENDING_VALIDATION' | 'APPROVED';
  amount: number;
  formatCurrency: (n: number) => string;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-[14px] border border-border bg-surface-hover p-3 w-full text-xs">
        <Row label="Monto" value={formatCurrency(amount)} mono />
      </div>
      {status === 'APPROVED' ? (
        <p className="text-xs text-fg-muted">
          Tu pago de este mes ya fue confirmado por el propietario.
        </p>
      ) : (
        // PENDING_VALIDATION — período en verificación (no volver a pagar)
        <p className="text-xs text-fg-muted">
          Tu pago está en verificación. No hace falta volver a pagar — vas a
          ver la confirmación en tu historial cuando termine.
        </p>
      )}
    </div>
  );
}
