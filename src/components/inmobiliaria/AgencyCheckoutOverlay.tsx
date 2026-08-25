'use client';

import { useEffect } from 'react';
import { ArrowSquareOut, CheckCircle, Clock, WarningCircle } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui';
import { useLenis } from '@/components/providers/SmoothScroll';
import type { AgencyCheckoutState } from '@/lib/hooks/useAgencyCheckout';

interface AgencyCheckoutOverlayProps {
  /** Plan being purchased/activated — used only for copy. */
  planName: string;
  /** Paid FLAT plan → payment copy; free/percentage → activation copy. */
  isPaid: boolean;
  state: AgencyCheckoutState;
  error: string | null;
  paymentUrl: string | null;
  popupBlocked: boolean;
  pollError: string | null;
  /** True once `awaiting` has run long enough with no confirmation that the
   * overlay must stop implying an active, ongoing wait (T-0012 WU-3). */
  awaitingTimedOut: boolean;
  /** True while `resume()` is fetching a fresh payment link (processing copy). */
  resuming?: boolean;
  onVerify: () => void;
  /** Reset + close — honored while not mid-payment (idle/error), and while
   * `awaiting` so an abandoned session is never a dead end. The server-side
   * charge stays PENDING; that is correct and this component does not touch it. */
  onClose: () => void;
}

/** Awaiting's subtitle — the single place this copy is decided, so it can
 * never drift out of sync with the heading above it (T-0012 WU-3 defect B:
 * a stale "estamos generando el enlace de pago" line used to render under
 * "esperando la confirmación de tu pago…", which is nonsensical — you cannot
 * be confirming a payment for a link that does not exist yet). */
function awaitingSubtitle(paymentUrl: string | null, awaitingTimedOut: boolean): string {
  if (!paymentUrl) {
    return 'No pudimos recuperar el enlace de pago. Podés salir e intentarlo de nuevo, o verificar si ya pagaste.';
  }
  return awaitingTimedOut
    ? 'Si ya pagaste, puede demorar unos minutos más en confirmarse. Si no, podés salir e intentarlo de nuevo.'
    : 'Completá el pago en la pestaña que abrimos. Esta pantalla se actualiza sola.';
}

/**
 * AgencyCheckoutOverlay — the direct-to-Wompi checkout status modal rendered on
 * top of `/upgrade` (no intermediate page). Mirrors the state panel that used to
 * live in `checkout/page.tsx`. `processing`/`success` stay truly non-dismissable
 * (the DS's own close button is hidden too, per DESIGN.md's `hideClose` — "only
 * for a modal that must not be abandoned halfway") since those windows are
 * milliseconds. `awaiting` is escapable — an abandoned payment must not be a
 * dead end — via an explicit "Salir sin pagar" action, Escape, or the backdrop;
 * `error` keeps its existing close-and-retry.
 *
 * Follows DESIGN.md modal rules: Radix Dialog (z-[300], scroll lock) + Lenis
 * stop() while open.
 */
export function AgencyCheckoutOverlay({
  planName,
  isPaid,
  state,
  error,
  paymentUrl,
  popupBlocked,
  pollError,
  awaitingTimedOut,
  resuming = false,
  onVerify,
  onClose,
}: AgencyCheckoutOverlayProps) {
  const open = state !== 'idle';
  const lenis = useLenis();

  // Pause smooth scroll while the overlay is open (DESIGN.md §8).
  useEffect(() => {
    if (open) lenis.stop();
    else lenis.start();
    return () => lenis.start();
  }, [open, lenis]);

  // Only allow closing (Escape / outside / X / the explicit "Salir" action)
  // when the payment is NOT actively in flight. `awaiting` is included — an
  // abandoned payment must have a way out; the server-side charge simply stays
  // PENDING, which is correct.
  const handleOpenChange = (next: boolean) => {
    if (!next && (state === 'error' || state === 'idle' || state === 'awaiting')) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm" hideClose={state === 'processing' || state === 'success'}>
        {/* Success */}
        {state === 'success' && (
          <div className="flex flex-col items-center text-center gap-2 py-2">
            <CheckCircle className="w-12 h-12 text-success" weight="fill" />
            <DialogTitle className="font-semibold text-fg">
              {isPaid ? '¡Pago confirmado!' : 'Plan activado'}
            </DialogTitle>
            <DialogDescription className="text-sm text-fg-muted">
              Te llevamos al panel…
            </DialogDescription>
          </div>
        )}

        {/* Awaiting payment — hosted Wompi tab */}
        {state === 'awaiting' && (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            {awaitingTimedOut ? (
              <Clock className="w-12 h-12 text-warning" weight="fill" />
            ) : (
              <Spinner size="lg" variant="current" className="text-primary" />
            )}
            <DialogTitle className="font-medium text-fg">
              {awaitingTimedOut
                ? 'Todavía no confirmamos tu pago'
                : 'Esperando la confirmación de tu pago…'}
            </DialogTitle>
            <DialogDescription className="text-xs text-fg-muted">
              {awaitingSubtitle(paymentUrl, awaitingTimedOut)}
            </DialogDescription>
            {paymentUrl && (
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline underline-offset-2"
              >
                <ArrowSquareOut className="w-3.5 h-3.5" />
                {popupBlocked
                  ? 'No se abrió la pestaña — abrí el pago acá'
                  : '¿No ves la pestaña? Abrila de nuevo'}
              </a>
            )}
            {pollError && <p className="text-xs text-fg-muted">{pollError}</p>}
            <div className="flex items-center justify-center gap-2 mt-1">
              <Button variant="ghost" size="sm" hideArrow onClick={onVerify}>
                Ya pagué — Verificar estado
              </Button>
              <Button variant="ghost" size="sm" hideArrow onClick={onClose} className="text-fg-muted">
                Salir sin pagar
              </Button>
            </div>
          </div>
        )}

        {/* Processing — selectPlan / generating (or resume(): retrieving) the link */}
        {state === 'processing' && (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <Spinner size="lg" variant="current" className="text-primary" />
            <DialogTitle className="font-medium text-fg">
              {resuming
                ? 'Recuperando tu pago…'
                : isPaid
                  ? 'Generando el pago…'
                  : `Activando el plan ${planName}…`}
            </DialogTitle>
            <DialogDescription className="text-xs text-fg-muted">
              Un momento, por favor.
            </DialogDescription>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <WarningCircle className="w-12 h-12 text-danger" />
            <DialogTitle className="font-semibold text-fg">
              No pudimos completar la operación
            </DialogTitle>
            <DialogDescription className="text-sm text-fg-muted">
              {error ?? 'Ocurrió un error. Intentá de nuevo.'}
            </DialogDescription>
            <Button variant="secondary" size="sm" hideArrow onClick={onClose} className="mt-1">
              Volver a los planes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AgencyCheckoutOverlay;
