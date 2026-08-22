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
 * A third entry point resumes a charge that was already `PENDING` before this
 * hook mounted:
 *   - `resume(chargeId, targetPlanTier)` — fetches a FRESH payment link for the
 *     already-open charge (the original tab/link may be long gone), via the
 *     same `.../payment-link` endpoint `pay()` uses, THEN enters `awaiting`.
 *     Fires once — never on a poll loop, since the endpoint increments
 *     `attempts` server-side.
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
/**
 * How long `awaiting` can run with no confirmation before it stops implying
 * an active, ongoing wait and admits the payment was not completed. PSE
 * approvals routinely take a couple of minutes at the payer's bank, so this
 * must not be short enough to interrupt a legitimate slow payment — 10
 * minutes is generous for that while still ending the "spins forever" trap
 * for a genuinely abandoned one. Polling and the manual `verifyNow` escape
 * hatch both keep working past this point: it only changes what the overlay
 * SAYS, never what it does or whether it can still resolve to success.
 */
const AWAITING_TIMEOUT_MS = 10 * 60_000;

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
  /** True while `resume()` is fetching a fresh payment link for an already-open charge. */
  resuming: boolean;
  /**
   * True once `awaiting` has run past `AWAITING_TIMEOUT_MS` with no
   * confirmation. The overlay must stop implying an active, ongoing wait once
   * this flips — polling and `verifyNow` both keep working regardless, and a
   * genuine late confirmation still resolves to `success` normally.
   */
  awaitingTimedOut: boolean;
  /** Free / percentage (USAGE_CANON): activate without an upfront charge. */
  activate: (planId: string) => Promise<void>;
  /** Paid FLAT: pre-open tab + selectPlan + payment link + redirect + poll. */
  pay: (planId: string) => Promise<void>;
  /** Manual reconcile against Wompi if the webhook is slow. */
  verifyNow: () => Promise<void>;
  /**
   * Resume `awaiting` for a charge that was already `PENDING` before this hook
   * mounted (e.g. the user left `/upgrade` before the webhook confirmed and
   * came back). Fetches a fresh payment link for `chargeId` first — the
   * original tab may be closed — then enters `awaiting`; if the fetch fails,
   * still enters `awaiting` with `paymentUrl` null so the panel shows an
   * honest "couldn't get a link" state instead of a fabricated one. No-op
   * unless the current state is `idle` — never clobbers a flow already
   * started by `pay()`/`activate()`.
   */
  resume: (chargeId: string, targetPlanTier: string) => void;
  /**
   * Reset back to idle — e.g. to close the overlay after an error, or to let
   * the owner leave an abandoned `awaiting` session. The server-side charge
   * stays `PENDING`; that is correct and this hook does not touch it.
   */
  reset: () => void;
}

export function useAgencyCheckout(onSuccess: () => void): UseAgencyCheckout {
  const [state, setState] = useState<AgencyCheckoutState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  const [awaitingTimedOut, setAwaitingTimedOut] = useState(false);

  // Keep onSuccess in a ref so an inline arrow from the caller doesn't reshuffle
  // the memoized callbacks / the success timer on every render.
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  // The tier this in-flight charge unlocks once confirmed — captured from
  // `charge.targetPlanTier` in `pay()`, or passed in directly by `resume()`.
  // `checkStatus` only resolves 'active' once the subscription is actually ON
  // this tier; `subscription.status === 'ACTIVE'` is NEVER a payment signal —
  // the agency's free starter plan is ACTIVE from the very first millisecond.
  const targetTierRef = useRef<string | null>(null);

  // Enter success, then fire onSuccess after a short delay so the caller shows
  // the success state before navigating.
  const succeed = useCallback(() => {
    setState('success');
    setTimeout(() => onSuccessRef.current(), SUCCESS_REDIRECT_DELAY_MS);
  }, []);

  // Resolve the current payment outcome from the agency subscription state.
  // verify() reconciles the open charge against Wompi (self-heals a missing
  // webhook) and returns fresh state — so awaiting resolves without the webhook.
  //
  // Success = the subscription tier actually advanced to the charge's
  // targetPlanTier (the only signal `confirmChargeFromWebhook` ever writes on
  // confirmation). Failure = a genuine gateway rejection, OR the open charge
  // vanished (went terminal) while the tier never advanced — that can only mean
  // it was superseded/cancelled, since a SUCCESS charge always leaves the
  // subscription on the target tier. Everything else keeps waiting.
  const checkStatus = useCallback(async (): Promise<StatusOutcome> => {
    try {
      const s = await agencySubscriptionApi.verify();
      if (!s) return 'pending';
      const target = targetTierRef.current;
      const advanced =
        !!target && s.subscription?.planTier?.toLowerCase() === target.toLowerCase();
      if (advanced) return 'active';
      const gw = (s.openCharge?.gatewayStatus ?? '').toUpperCase();
      if (gw === 'DECLINED' || gw === 'ERROR' || gw === 'VOIDED') return 'failed';
      if (!s.openCharge) return 'failed';
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
  // Also arms a one-shot timeout: if nothing resolves within
  // AWAITING_TIMEOUT_MS, flip `awaitingTimedOut` so the overlay stops implying
  // an active wait — polling and verifyNow keep running regardless, so a late
  // confirmation still resolves normally.
  useEffect(() => {
    if (state !== 'awaiting') return;
    let cancelled = false;
    const run = async () => {
      const r = await checkStatus();
      if (!cancelled) applyStatus(r);
    };
    run();
    const pollId = setInterval(run, POLL_INTERVAL_MS);
    // Background tabs throttle setInterval — re-check immediately when the user
    // returns from the Wompi payment tab.
    window.addEventListener('focus', run);
    const timeoutId = setTimeout(() => {
      if (!cancelled) setAwaitingTimedOut(true);
    }, AWAITING_TIMEOUT_MS);
    return () => {
      cancelled = true;
      clearInterval(pollId);
      clearTimeout(timeoutId);
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
    setAwaitingTimedOut(false);
    setResuming(false);
    try {
      const { charge } = await agencySubscriptionApi.selectPlan(planId);
      if (!charge) {
        payTab?.close();
        setError('No se generó un cobro para este plan. Contactá a soporte.');
        setState('error');
        return;
      }
      // Capture the tier this charge unlocks on confirmation — falls back to
      // the requested planId if the back ever omits it (should not happen).
      targetTierRef.current = charge.targetPlanTier ?? planId;
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

  // Resume awaiting for a charge that was already PENDING before mount — e.g.
  // the user left `/upgrade` before the webhook confirmed and came back.
  // Fetches a FRESH payment link first (the original tab/link may be gone),
  // via `processing` — that state's copy is literally accurate here, which is
  // what keeps `awaiting`'s subtitle from ever having to claim a link is being
  // generated. Guarded so it never clobbers a flow `pay()`/`activate()` — or a
  // previous `resume()` — already started; fires the network call exactly
  // once per resume, never on the poll loop.
  const resume = useCallback(
    (chargeId: string, targetPlanTier: string) => {
      if (state !== 'idle') return;
      targetTierRef.current = targetPlanTier;
      setError(null);
      setPaymentUrl(null);
      setPopupBlocked(false);
      setPollError(null);
      setAwaitingTimedOut(false);
      setResuming(true);
      setState('processing');
      void (async () => {
        try {
          const { url } = await agencySubscriptionApi.chargePaymentLink(chargeId);
          setPaymentUrl(url);
        } catch {
          // No link this time — `awaiting` below renders the honest "couldn't
          // retrieve it" copy instead of a fabricated or contradictory one.
          // The owner can still verify (in case the payment landed anyway via
          // the original link) or leave and re-select the plan to mint a
          // fresh charge + link.
          setPaymentUrl(null);
        } finally {
          setResuming(false);
          setState('awaiting');
        }
      })();
    },
    [state],
  );

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setPaymentUrl(null);
    setPopupBlocked(false);
    setPollError(null);
    setResuming(false);
    setAwaitingTimedOut(false);
    targetTierRef.current = null;
  }, []);

  return {
    state,
    error,
    paymentUrl,
    popupBlocked,
    pollError,
    resuming,
    awaitingTimedOut,
    activate,
    pay,
    verifyNow,
    resume,
    reset,
  };
}
