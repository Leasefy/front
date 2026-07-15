/**
 * Public avalúo intake wizard URL.
 *
 * The solicitud flow runs on the avalúo MICRO's own front (served by the micro
 * at `${NEXT_PUBLIC_AVALUO_API_URL}/avaluo`, e.g. http://localhost:3003/avaluo),
 * NOT by this app. Every "Solicitar avalúo" CTA and the retired in-app wizard
 * routes point here.
 *
 * Empty when the micro base is unset → callers must degrade (hide/disable the
 * CTA) instead of linking to an empty href or back into this app.
 */
const AVALUO_MICRO_BASE = process.env.NEXT_PUBLIC_AVALUO_API_URL ?? '';

export const AVALUO_WIZARD_URL = AVALUO_MICRO_BASE
  ? `${AVALUO_MICRO_BASE.replace(/\/$/, '')}/avaluo`
  : '';
