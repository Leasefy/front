'use client';

import { useEffect } from 'react';
import { ArrowSquareOut, CheckCircle, WarningCircle } from '@phosphor-icons/react';
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
  onVerify: () => void;
  /** Reset + close — only honored while not mid-payment. */
  onClose: () => void;
}

/**
 * AgencyCheckoutOverlay — the direct-to-Wompi checkout status modal rendered on
 * top of `/upgrade` (no intermediate page). Mirrors the state panel that used to
 * live in `checkout/page.tsx`. Non-dismissable while processing/awaiting/success
 * so the payment isn't interrupted; on error the user can close and retry.
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

  // Only allow closing (Escape / outside / X) when the payment is NOT in flight.
  const handleOpenChange = (next: boolean) => {
    if (!next && (state === 'error' || state === 'idle')) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
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
            <Spinner size="lg" variant="current" className="text-primary" />
            <DialogTitle className="font-medium text-fg">
              Esperando la confirmación de tu pago…
            </DialogTitle>
            <DialogDescription className="text-xs text-fg-muted">
              {paymentUrl
                ? 'Completá el pago en la pestaña que abrimos. Esta pantalla se actualiza sola.'
                : 'Estamos generando el enlace de pago.'}
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
            <Button variant="ghost" size="sm" hideArrow onClick={onVerify} className="mt-1">
              Ya pagué — Verificar estado
            </Button>
          </div>
        )}

        {/* Processing — selectPlan / generating the link */}
        {state === 'processing' && (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <Spinner size="lg" variant="current" className="text-primary" />
            <DialogTitle className="font-medium text-fg">
              {isPaid ? 'Generando el pago…' : `Activando el plan ${planName}…`}
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
