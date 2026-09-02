/**
 * Expected-response SLA constants (COMU-04).
 *
 * `PQRS_SLA_BUSINESS_DAYS` is the statutory ceiling for a formal queja/reclamo
 * under Ley 1480/2011 art. 58 núm. 5 — 15 business days. It backs a STATIC,
 * neutral expected-response hint near the chat composer.
 *
 * This is a hint only, never a live clock: it must never imply an instant human
 * reply. The REAL, computed SLA timeline (server-side or "estimado") is v7-06's
 * PQRS engine — which reuses this same constant so the two pillars agree.
 */

/** PQRS formal-claim SLA — Ley 1480/2011 art. 58: 15 business days. Shared so v7-06's real clock reuses it. */
export const PQRS_SLA_BUSINESS_DAYS = 15;
