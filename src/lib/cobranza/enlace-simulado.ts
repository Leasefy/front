/**
 * ¿Es un enlace de pago SIMULADO? Espejo de `isStubPaymentLink` del micro
 * (`agent/src/payments/stub-link-guard.ts`): los dobles ponen la marca en el
 * host (`stub.leasefy/payment-plan/…`) o en la ruta (`/stub/wompi/…`).
 *
 * QA-AGENTES 16-10 (lab): al aprobar un acuerdo la pantalla decía «Abrir
 * enlace Wompi →» con `https://stub.leasefy/payment-plan/<id>`, un enlace que
 * no lleva a ningún lado. «Un stub NO es un envío»: se dice que es simulado.
 */
export function esEnlaceDePagoSimulado(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    if (u.hostname === 'stub.leasefy' || u.hostname.startsWith('stub.')) return true
    return /(^|\/)stub(\/|-)/.test(u.pathname)
  } catch {
    return false
  }
}
