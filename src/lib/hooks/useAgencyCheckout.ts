'use client';

/**
 * useAgencyCheckout — orchestrates the agency plan checkout against the real
 * agency subscription system (`/inmobiliaria/subscription/*`). Extracted from
 * the inline logic that used to live in `checkout/page.tsx` so BOTH the direct
 * "abrir Wompi al elegir" flow on `/upgrade` and the deep-link checkout page
 * share one implementation (no duplicated polling/timing).
 *
 * Two entry points, chosen by the plan's pricing model:
 *   - `activate(planId)` — free / percentage (USAGE_CANON): selectPlan with no
 *     upfront charge; goes straight to `success`.
 *   - `pay(planId)` — paid FLAT: pre-opens a tab SYNCHRONOUSLY (browsers block a
 *     `window.open` issued after an `await`), selectPlan → PENDING charge →
 *     hosted Wompi payment link, then redirects the pre-opened tab and polls.
 *
 * `onSuccess` fires once the subscription reaches ACTIVE, AFTER a ~2.5s delay so
 * the caller can show the success state first (same UX as the old checkout).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { agencySubscriptionApi } from '@/lib/api/agency-subscription.service';

export type AgencyCheckoutState = 'idle' | 'processing' | 'awaiting' | 'success' | 'error';

const POLL_INTERVAL_MS = 5_000;
/** Delay before firing onSuccess so the success state is visible first. */
const SUCCESS_REDIRECT_DELAY_MS = 2_500;

type StatusOutcome = 'active' | 'failed' | 'pending' | 'error';

export interface UseAgencyCheckout {
  state: AgencyCheckoutState;
  error: string | null;
  /** Hosted Wompi payment link once generated (paid flow). */
  paymentUrl: string | null;
  /** Pre-open was blocked — surface the manual link. */
  popupBlocked: boolean;
  /** Transient polling message (verifying / retrying). */
  pollError: string | null;
  /** Free / percentage (USAGE_CANON): activate without an upfront charge. */
  activate: (planId: string) => Promise<void>;
  /** Paid FLAT: pre-open tab + selectPlan + payment link + redirect + poll. */
  pay: (planId: string) => Promise<void>;
  /** Manual reconcile against Wompi if the webhook is slow. */
  verifyNow: () => Promise<void>;
  /** Reset back to idle (e.g. to close the overlay after an error). */
  reset: () => void;
}

export function useAgencyCheckout(onSuccess: () => void): UseAgencyCheckout {
  const [state, setState] = useState<AgencyCheckoutState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);

  // Keep onSuccess in a ref so an inline arrow from the caller doesn't reshuffle
  // the memoized callbacks / the success timer on every render.
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  // Enter success, then fire onSuccess after a short delay so the caller shows
  // the success state before navigating.
  const succeed = useCallback(() => {
    setState('success');
    setTimeout(() => onSuccessRef.current(), SUCCESS_REDIRECT_DELAY_MS);
  }, []);

  // Resolve the current payment outcome from the agency subscription state.
  // verify() reconciles the open charge against Wompi (self-heals a missing
  // webhook) and returns fresh state — so awaiting resolves without the webhook.
  const checkStatus = useCallback(async (): Promise<StatusOutcome> => {
    try {
      const s = await agencySubscriptionApi.verify();
      if (!s) return 'pending';
      const gw = (s.openCharge?.gatewayStatus ?? '').toUpperCase();
      if (s.status === 'ACTIVE') return 'active';
      if (!s.openCharge || gw === 'DECLINED' || gw === 'ERROR' || gw === 'VOIDED') return 'failed';
      return 'pending';
    } catch {
      return 'error';
    }
  }, []);

  const applyStatus = useCallback(
    (r: StatusOutcome) => {
      if (r === 'active') {
        succeed();
      } else if (r === 'failed') {
        setError('El pago fue rechazado o no se completó. Podés intentar de nuevo.');
        setState('error');
      } else if (r === 'error') {
        setPollError('No pudimos verificar el estado. Reintentando…');
      } else {
        setPollError(null);
      }
    },
    [succeed],
  );

  // Poll the agency subscription until the charge resolves (paid → ACTIVE).
  useEffect(() => {
    if (state !== 'awaiting') return;
    let cancelled = false;
    const run = async () => {
      const r = await checkStatus();
      if (!cancelled) applyStatus(r);
    };
    run();
    const id = setInterval(run, POLL_INTERVAL_MS);
    // Background tabs throttle setInterval — re-check immediately when the user
    // returns from the Wompi payment tab.
    window.addEventListener('focus', run);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('focus', run);
    };
  }, [state, checkStatus, applyStatus]);

  // Manual fallback if the webhook is slow or a poll hiccuped.
  const verifyNow = useCallback(async () => {
    setPollError('Verificando…');
    const r = await checkStatus();
    if (r === 'pending') {
      setPollError('Todavía no vemos la confirmación. Esperá unos segundos y reintentá.');
    } else {
      applyStatus(r);
    }
  }, [checkStatus, applyStatus]);

  // Free / percentage (USAGE_CANON) — activate without an upfront charge.
  const activate = useCallback(
    async (planId: string) => {
      setState('processing');
      setError(null);
      try {
        await agencySubscriptionApi.selectPlan(planId);
        succeed();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo activar el plan.');
        setState('error');
      }
    },
    [succeed],
  );

  // Paid FLAT plan — select plan (→ PENDING charge) then open the hosted Wompi
  // payment link in a separate tab (avaluo-style; payer picks card/PSE/Nequi).
  const pay = useCallback(async (planId: string) => {
    // Pre-open the tab SYNCHRONOUSLY inside the click gesture, then redirect it
    // once we have the link. Browsers block a window.open issued AFTER an await
    // (it's outside the user-gesture window), so opening it post-fetch would be
    // popup-blocked. This mirrors avaluo (pre-open, then set the location).
    const payTab = window.open('about:blank', '_blank');
    setState('processing');
    setError(null);
    setPopupBlocked(false);
    try {
      const { charge } = await agencySubscriptionApi.selectPlan(planId);
      if (!charge) {
        payTab?.close();
        setError('No se generó un cobro para este plan. Contactá a soporte.');
        setState('error');
        return;
      }
      const { url } = await agencySubscriptionApi.chargePaymentLink(charge.id);
      setPaymentUrl(url);
      if (payTab && !payTab.closed) {
        payTab.location.href = url;
      } else {
        // Pre-open was blocked — surface the manual link in the awaiting panel.
        setPopupBlocked(true);
      }
      setState('awaiting');
    } catch (err) {
      payTab?.close();
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago.');
      setState('error');
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setPaymentUrl(null);
    setPopupBlocked(false);
    setPollError(null);
  }, []);

  return {
    state,
    error,
    paymentUrl,
    popupBlocked,
    pollError,
    activate,
    pay,
    verifyNow,
    reset,
  };
}
