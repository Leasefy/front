'use client';

import { CrossFade } from '@leasefy/cadence';
import { useEffect } from 'react';
import { ArrowSquareOut, CheckCircle, Clock } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui';
import { useLenis } from '@/components/providers/SmoothScroll';
import { formatDate } from '@/lib/format';
import type { AgencyCheckoutState } from '@/lib/hooks/useAgencyCheckout';

interface AgencyCheckoutOverlayProps {
  /** Plan being purchased/activated — used only for copy. For `scheduled`,
   * this is the TARGET tier of the downgrade the back just scheduled. */
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
  /** Present only for `state === 'scheduled'` (T-0089) — the tier/date of the
   * downgrade `select-plan` just scheduled with no charge. */
  scheduled?: { pendingPlanTier: string; pendingPlanEffectiveAt: string | null } | null;
  /** Undo a just-scheduled downgrade (T-0089) — omit to hide the action
   * entirely (e.g. while the undo call is being wired up by the caller). */
  onUndo?: () => void;
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
    return 'No pudimos recuperar el enlace de pago. Puedes salir e intentarlo de nuevo, o verificar si ya pagaste.';
  }
  return awaitingTimedOut
    ? 'Si ya pagaste, puede demorar unos minutos más en confirmarse. Si no, puedes salir e intentarlo de nuevo.'
    : 'Completa el pago en la pestaña que abrimos. Esta pantalla se actualiza sola.';
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
  scheduled = null,
  onUndo,
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
    if (
      !next &&
      (state === 'error' ||
        state === 'idle' ||
        state === 'awaiting' ||
        state === 'scheduled' ||
        state === 'unchanged')
    )
      onClose();
  };

  /*
   * Cada estado es una variante del modal canónico (DESIGN.md §17): el medallón
   * dice el estado (éxito, error, espera) y el texto va en la cabecera. Lo
   * no-descartable no cambia: en `processing` y `success` no hay ✕ ni pie, y
   * `handleOpenChange` no los cierra con Esc ni con un clic afuera.
   */
  const variante =
    state === 'success'
      ? 'success'
      : state === 'error'
        ? 'error'
        : state === 'awaiting' && awaitingTimedOut
          ? 'warning'
          : state === 'unchanged'
            ? undefined
            : 'info';
  const icono =
    state === 'processing' || (state === 'awaiting' && !awaitingTimedOut) ? (
      <Spinner size="sm" variant="current" />
    ) : state === 'awaiting' || state === 'scheduled' ? (
      <Clock weight="bold" />
    ) : state === 'unchanged' ? (
      <CheckCircle weight="bold" />
    ) : undefined;

  const titulo =
    state === 'success'
      ? isPaid
        ? '¡Pago confirmado!'
        : 'Plan activado'
      : state === 'awaiting'
        ? awaitingTimedOut
          ? 'Todavía no confirmamos tu pago'
          : 'Esperando la confirmación de tu pago…'
        : state === 'processing'
          ? resuming
            ? 'Recuperando tu pago…'
            : isPaid
              ? 'Generando el pago…'
              : `Activando el plan ${planName}…`
          : state === 'error'
            ? 'No pudimos completar la operación'
            : state === 'scheduled'
              ? 'Cambio de plan programado'
              : 'Ya tienes este plan';

  const descripcion =
    state === 'success'
      ? 'Te llevamos al panel…'
      : state === 'awaiting'
        ? awaitingSubtitle(paymentUrl, awaitingTimedOut)
        : state === 'processing'
          ? 'Un momento, por favor.'
          : state === 'error'
            ? (error ?? 'Ocurrió un error. Intenta de nuevo.')
            : state === 'scheduled'
              ? scheduled?.pendingPlanEffectiveAt
                ? `Tu plan cambiará a ${planName} el ${formatDate(scheduled.pendingPlanEffectiveAt)}. Hasta entonces, sigues con tu plan actual.`
                : `Tu plan cambiará a ${planName} al final de tu período actual. Hasta entonces, sigues con tu plan actual.`
              : 'No hicimos ningún cambio.';

  const sinSalida = state === 'processing' || state === 'success';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="sm" variant={variante} icon={icono} hideClose={sinSalida}>
        {/* Procesando → listo / error / programado: el texto se cruza en su
            lugar, sin un corte seco. */}
        <CrossFade swapKey={state}>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>{descripcion}</DialogDescription>
          </DialogHeader>
        </CrossFade>

        {/* Awaiting payment — hosted Wompi tab */}
        {state === 'awaiting' && (paymentUrl || pollError) && (
          <div className="space-y-2 text-sm">
            {paymentUrl && (
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline underline-offset-2"
              >
                <ArrowSquareOut className="w-3.5 h-3.5" aria-hidden="true" />
                {popupBlocked
                  ? 'No se abrió la pestaña — abre el pago acá'
                  : '¿No ves la pestaña? Ábrela de nuevo'}
              </a>
            )}
            {pollError && <p className="text-xs text-fg-muted">{pollError}</p>}
          </div>
        )}

        {!sinSalida && (
          <DialogFooter>
            {state === 'awaiting' && (
              <>
                <Button variant="outline" hideArrow onClick={onClose}>
                  Salir sin pagar
                </Button>
                <Button hideArrow onClick={onVerify}>
                  Ya pagué — Verificar estado
                </Button>
              </>
            )}
            {state === 'error' && (
              <Button variant="outline" hideArrow onClick={onClose}>
                Volver a los planes
              </Button>
            )}
            {state === 'scheduled' && (
              <>
                {onUndo && (
                  <Button variant="ghost" hideArrow onClick={onUndo}>
                    Deshacer
                  </Button>
                )}
                <Button variant="outline" hideArrow onClick={onClose}>
                  Entendido
                </Button>
              </>
            )}
            {state === 'unchanged' && (
              <Button variant="outline" hideArrow onClick={onClose}>
                Cerrar
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AgencyCheckoutOverlay;
