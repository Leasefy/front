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
import { toast } from 'sonner';
import { agencySubscriptionApi } from '@/lib/api/agency-subscription.service';
import { ApiError } from '@/lib/api/client';

export type AgencyCheckoutState =
  | 'idle'
  | 'processing'
  | 'awaiting'
  | 'success'
  | 'error'
  /** T-0089: `select-plan` scheduled a downgrade (no charge) — a legitimate,
   * non-error terminal outcome. See `scheduled` for the tier + date. */
  | 'scheduled'
  /** T-0089: `select-plan` reported no change (e.g. re-selecting the current
   * tier) — a legitimate, non-error terminal outcome. */
  | 'unchanged';

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
  /** Present only once `state === 'scheduled'`: the tier + date of the
   * downgrade `select-plan` just scheduled (no charge). Null otherwise —
   * including for `'unchanged'`, which carries no tier/date (T-0089). */
  scheduled: { pendingPlanTier: string; pendingPlanEffectiveAt: string | null } | null;
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
  /**
   * Paid FLAT: pre-open tab + selectPlan + payment link + redirect + poll.
   * `baselineStatus` is the subscription's status BEFORE this checkout
   * started (`subscriptionState.subscription?.status` at click time) — needed
   * so `checkStatus()` can tell a genuine reactivation (SUSPENDED/PAST_DUE →
   * ACTIVE) from "already ACTIVE" once `select-plan` answers
   * `REACTIVATION_PENDING` (T-0085). `baselinePlanTier` is the subscription's
   * tier at that same moment — needed ONLY to classify a 409
   * `PENDING_CHARGE_ALREADY_PAID` thrown by the initial `select-plan` call
   * itself, before any `outcome` is ever read: that recovery must use the
   * reactivation predicate (a real status transition) rather than the
   * purchase tier-advance one when `planId` equals the baseline tier and the
   * baseline was non-ACTIVE — otherwise "tier === tier" is trivially true for
   * a same-tier reactivation and reports success without checking anything
   * real (fix round 1, MEDIUM 2). Omit both for the ordinary purchase path;
   * they are a no-op there.
   */
  pay: (planId: string, baselineStatus?: string | null, baselinePlanTier?: string | null) => Promise<void>;
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
  /**
   * `baselineStatus`, when passed, marks this resumed charge as a
   * reactivation (T-0085): a PENDING RENEWAL charge picked up while the
   * subscription is SUSPENDED/PAST_DUE, resumed via `upgrade/page.tsx`'s
   * widened trigger. Omit it for the pre-existing purchase resume (a PENDING
   * UPGRADE charge with a real `targetPlanTier`) — behaviour there is
   * unchanged.
   */
  resume: (chargeId: string, targetPlanTier: string, baselineStatus?: string | null) => void;
  /**
   * Reset back to idle — e.g. to close the overlay after an error, or to let
   * the owner leave an abandoned `awaiting` session ("Salir sin pagar").
   * Clears local state synchronously and immediately — the overlay closing
   * must never wait on a network call. If a charge is currently tracked
   * (set by `pay()`/`resume()`), also fires `abandonCharge(chargeId)`
   * server-side, WITHOUT awaiting it, so the charge does not linger
   * `PENDING` for up to 24h and resurrect the overlay on reload (T-0083).
   * No tracked charge → no network call. A network error or `503
   * payment_verification_unavailable` surfaces as a non-blocking toast — the
   * overlay stays closed. A `409 PENDING_CHARGE_ALREADY_PAID` runs the same
   * recovery `pay()`'s catch performs for that code, which may legitimately
   * re-open the overlay in a success/error state (a confirmed payment must
   * never be hidden just because the owner clicked "Salir sin pagar").
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
  const [scheduled, setScheduled] = useState<{
    pendingPlanTier: string;
    pendingPlanEffectiveAt: string | null;
  } | null>(null);

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

  // The currently-open charge's id, tracked so `reset()` ("Salir sin pagar")
  // has something to abandon server-side. Set alongside `targetTierRef` by
  // `pay()` (from the created charge) and `resume()` (the charge it resumes);
  // cleared by `reset()` and on success — a confirmed charge needs no
  // abandoning (T-0083).
  const chargeIdRef = useRef<string | null>(null);

  // Monotonically bumped every time `pay()`/`resume()` starts tracking a NEW
  // charge. `reset()`'s abandon call is fire-and-forget, so its 409 recovery
  // can land after the user has already started a second, independent
  // pay()/resume() flow — the recovery must not run against a generation
  // that is no longer current, or it clobbers the newer flow's state/refs
  // (T-0083 fix round 1, verify §4.1: a real, reproduced race).
  const chargeGenerationRef = useRef(0);

  // Which success predicate `checkStatus` should apply (T-0085). 'purchase'
  // (default) is the pre-existing tier-advance check. 'reactivation' is a
  // SUSPENDED/PAST_DUE owner paying to lift the suspension on their CURRENT
  // tier — the tier never changes, so the tier-advance check can never fire
  // for it; success instead is the subscription actually leaving its
  // non-ACTIVE baseline. Set by `pay()` (from the response's `outcome`) and
  // `resume()` (when a `baselineStatus` is passed) — reset to 'purchase' at
  // the top of every `pay()` call.
  const checkoutKindRef = useRef<'purchase' | 'reactivation'>('purchase');

  // The subscription status BEFORE this checkout started — only meaningful
  // for 'reactivation'. Guards against reporting false success if the
  // subscription was somehow already ACTIVE when the reactivation charge was
  // created (should not happen given the back-side gate; costs nothing to
  // guard).
  const baselineStatusRef = useRef<string | null>(null);

  // Enter success, then fire onSuccess after a short delay so the caller shows
  // the success state before navigating.
  const succeed = useCallback(() => {
    setState('success');
    chargeIdRef.current = null;
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

      // Reactivation predicate — MUST run before the shared !openCharge →
      // 'failed' fallback below, or a paid reactivation would misread as
      // failure: a successful reactivation's charge goes SUCCESS and
      // `openCharge` becomes null exactly like a cancelled one does (T-0085
      // contract §8, predicate table). The tier never advances on a
      // reactivation, so the purchase tier-advance check is skipped entirely
      // for this kind rather than checked-and-skipped — it would never fire.
      if (checkoutKindRef.current === 'reactivation') {
        if (
          s.subscription?.status === 'ACTIVE' &&
          baselineStatusRef.current !== 'ACTIVE' &&
          !s.openCharge
        ) {
          return 'active';
        }
        const gwReact = (s.openCharge?.gatewayStatus ?? '').toUpperCase();
        if (gwReact === 'DECLINED' || gwReact === 'ERROR' || gwReact === 'VOIDED') return 'failed';
        if (!s.openCharge) return 'failed';
        return 'pending';
      }

      // Purchase predicate — unchanged. Success = the subscription tier
      // actually advanced to the charge's targetPlanTier (the only signal
      // `confirmChargeFromWebhook` ever writes on confirmation).
      // `subscription.status === 'ACTIVE'` is NEVER read as a payment signal
      // here — the agency's free starter plan is ACTIVE from the first
      // millisecond.
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
        setError('El pago fue rechazado o no se completó. Puedes intentar de nuevo.');
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
      setPollError('Todavía no vemos la confirmación. Espera unos segundos y reintenta.');
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

  // Shared recovery for `PENDING_CHARGE_ALREADY_PAID` (409): the back found an
  // open charge already APPROVED at Wompi, confirmed it server-side, and
  // refused the mutating call that triggered this. The money was already
  // honoured — re-read fresh state and only claim success once the tier has
  // ACTUALLY advanced (`checkStatus` is the same predicate `awaiting` polls
  // with). Shared by `pay()`'s catch (select-plan) and `reset()`'s catch
  // (abandon) — same code, same meaning, regardless of which call triggered
  // it (T-0083).
  const recoverAlreadyPaidCharge = useCallback(
    async (targetPlanTier: string) => {
      targetTierRef.current = targetPlanTier;
      const r = await checkStatus();
      if (r === 'active') {
        succeed();
      } else {
        setError(
          'Tu cargo pendiente ya se confirmó, pero todavía no vemos tu plan actualizado. Actualiza la página en unos segundos.',
        );
        setState('error');
      }
    },
    [checkStatus, succeed],
  );

  // Paid FLAT plan — select plan (→ PENDING charge) then open the hosted Wompi
  // payment link in a separate tab (avaluo-style; payer picks card/PSE/Nequi).
  const pay = useCallback(async (planId: string, baselineStatus?: string | null, baselinePlanTier?: string | null) => {
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
    // Clear a previous call's scheduled-change payload — it must never leak
    // into an unrelated later call (T-0089).
    setScheduled(null);
    // Reset the reactivation bookkeeping every call — a prior pay() attempt
    // must never leak its kind/baseline into this one (T-0085).
    checkoutKindRef.current = 'purchase';
    baselineStatusRef.current = baselineStatus ?? null;
    try {
      const { charge, outcome, effectiveAt } = await agencySubscriptionApi.selectPlan(planId);
      if (!charge) {
        payTab?.close();
        // SCHEDULED_DOWNGRADE and NO_CHANGE are legitimate `charge: null`
        // outcomes (T-0089) — the back scheduled/no-op'd the change and there
        // is nothing to pay. Neither is an error; only an outcome-less
        // `charge: null` (an old back, or a genuine failure) still is.
        if (outcome === 'SCHEDULED_DOWNGRADE') {
          setScheduled({ pendingPlanTier: planId, pendingPlanEffectiveAt: effectiveAt ?? null });
          setState('scheduled');
          return;
        }
        if (outcome === 'NO_CHANGE') {
          setState('unchanged');
          return;
        }
        setError('No se generó un cobro para este plan. Contacta a soporte.');
        setState('error');
        return;
      }
      if (outcome === 'REACTIVATION_PENDING') {
        checkoutKindRef.current = 'reactivation';
      }
      // Capture the tier this charge unlocks on confirmation — falls back to
      // the requested planId if the back ever omits it (should not happen).
      // For a reactivation, `charge.targetPlanTier` is null, so this falls
      // back to `planId` (the current tier) — harmless, `checkStatus()`
      // never reads `targetTierRef` for the 'reactivation' kind.
      targetTierRef.current = charge.targetPlanTier ?? planId;
      chargeIdRef.current = charge.id;
      chargeGenerationRef.current += 1;
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

      // `select-plan` found the agency's previous open charge already
      // APPROVED at Wompi, confirmed it server-side, and refused to open a
      // new one — the money was already honoured and the plan HAS been
      // granted (to whichever tier that older charge targeted, which is
      // this same pay() attempt's plan in the realistic retry case this
      // guards). The wrong thing here is a plain failure toast. Re-read
      // fresh state and only then decide: `checkStatus()` is the SAME
      // predicate `awaiting` polls with — a real tier advance is still
      // required, never assumed from the status code alone.
      if (err instanceof ApiError && err.status === 409 && err.code === 'PENDING_CHARGE_ALREADY_PAID') {
        // This 409 fires on the INITIAL `selectPlan` call, before any
        // `outcome` is ever read — `checkoutKindRef` is still 'purchase'
        // (reset unconditionally above). For a SUSPENDED/PAST_DUE owner
        // re-selecting their CURRENT tier, that would make
        // `recoverAlreadyPaidCharge` use the purchase tier-advance check,
        // which is trivially true here (a RENEWAL charge never changes
        // `planTier`) and would report success without checking anything
        // real. Reclassify as 'reactivation' first so the recovery below
        // checks the actual status transition instead (fix round 1, MEDIUM 2).
        const isSameTierReactivation =
          baselineStatusRef.current !== null &&
          baselineStatusRef.current !== 'ACTIVE' &&
          baselinePlanTier != null &&
          baselinePlanTier.toLowerCase() === planId.toLowerCase();
        if (isSameTierReactivation) {
          checkoutKindRef.current = 'reactivation';
        }
        await recoverAlreadyPaidCharge(planId);
        return;
      }

      // Wompi was unreachable, so the back refused to touch the pending
      // charge rather than risk cancelling one that might already be paid.
      // Nothing failed — this is transient, retrying shortly is correct.
      if (err instanceof ApiError && err.status === 503 && err.code === 'payment_verification_unavailable') {
        setError(
          'No pudimos verificar tu cargo pendiente con la pasarela de pago en este momento. Intenta de nuevo en unos segundos.',
        );
        setState('error');
        return;
      }

      setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago.');
      setState('error');
    }
  }, [recoverAlreadyPaidCharge]);

  // Resume awaiting for a charge that was already PENDING before mount — e.g.
  // the user left `/upgrade` before the webhook confirmed and came back.
  // Fetches a FRESH payment link first (the original tab/link may be gone),
  // via `processing` — that state's copy is literally accurate here, which is
  // what keeps `awaiting`'s subtitle from ever having to claim a link is being
  // generated. Guarded so it never clobbers a flow `pay()`/`activate()` — or a
  // previous `resume()` — already started; fires the network call exactly
  // once per resume, never on the poll loop.
  const resume = useCallback(
    (chargeId: string, targetPlanTier: string, baselineStatus?: string | null) => {
      if (state !== 'idle') return;
      targetTierRef.current = targetPlanTier;
      chargeIdRef.current = chargeId;
      chargeGenerationRef.current += 1;
      // A baselineStatus argument marks this as resuming a reactivation
      // charge (T-0085) — the pre-existing purchase resume call site never
      // passes one, so its behaviour is unchanged.
      checkoutKindRef.current = baselineStatus !== undefined ? 'reactivation' : 'purchase';
      baselineStatusRef.current = baselineStatus ?? null;
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
    // Capture what we're about to clear — reset() itself must stay
    // synchronous, so the abandon call (and its 409 recovery, which needs
    // the target tier) runs in a fire-and-forget block below. Also capture
    // the current generation: if a newer pay()/resume() bumps it before this
    // abandon's 409 recovery would run, that recovery is stale and must be
    // skipped rather than clobbering the newer flow (fix round 1, §4.1).
    const chargeId = chargeIdRef.current;
    const targetPlanTier = targetTierRef.current;
    const abandonedGeneration = chargeGenerationRef.current;

    setState('idle');
    setError(null);
    setPaymentUrl(null);
    setPopupBlocked(false);
    setPollError(null);
    setResuming(false);
    setAwaitingTimedOut(false);
    setScheduled(null);
    targetTierRef.current = null;
    chargeIdRef.current = null;

    if (!chargeId) return;

    void (async () => {
      try {
        await agencySubscriptionApi.abandonCharge(chargeId);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409 && err.code === 'PENDING_CHARGE_ALREADY_PAID') {
          // Stale-recovery guard: if a newer pay()/resume() has started
          // tracking a different charge since this abandon fired, THIS
          // charge's late 409 must not touch shared refs/state anymore —
          // the money for the abandoned charge is already confirmed
          // server-side regardless, and the periodic subscription refetch
          // will reflect it; running the recovery now would instead
          // overwrite the newer flow's target tier and could force it into
          // a false success/error, silently dropping its own tracked
          // charge id (fix round 1, §4.1 — the exact bug this task exists
          // to close, reintroduced for the newer charge).
          if (chargeGenerationRef.current !== abandonedGeneration) return;
          await recoverAlreadyPaidCharge(targetPlanTier ?? '');
          return;
        }
        // Network error, or 503 `payment_verification_unavailable` — the back
        // refused to void a charge it could not verify with Wompi (fail
        // closed, same principle as `supersedeOpenCharge`). Non-blocking:
        // the overlay is already closed, and the 24h reaper eventually
        // cleans up the still-PENDING charge, same as before this task.
        toast.error('No pudimos cancelar el cobro pendiente en este momento.');
      }
    })();
  }, [recoverAlreadyPaidCharge]);

  return {
    state,
    error,
    scheduled,
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
