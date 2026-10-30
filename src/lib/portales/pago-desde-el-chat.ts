/**
 * El pago que se abre desde el chat del portal. Aparte de `chat-del-portal.ts`
 * porque NO habla con el micro: habla con la ruta de Next que firma la sesión
 * de Wompi (el guardián `micro-por-agent-fetch` exige `agentFetch` sólo al micro).
 */
import { getAccessToken } from '@/lib/api/client';
import { cabecerasComoInquilino } from '@/lib/auth/cuenta-activa';
import { buildWompiCheckoutUrl } from '@/lib/payments/wompi-rent-session';

/**
 * «Mándame el link de pago» → «Sí, hazlo»: la MISMA sesión de Wompi de «Pagar lo
 * vencido» (`components/tenant/PagarLoVencido.tsx`). El navegador sólo dice qué
 * arriendo y cuántas cuotas; el back decide el monto y el servidor de Next firma
 * (el secreto nunca sale). Devuelve la URL de la pasarela; no navega solo.
 */
export async function abrirElPagoEnLinea(
  datos: Record<string, string>,
  origen: string,
): Promise<{ ok: true; url: string } | { ok: false; texto: string }> {
  const cuotas = Number(datos.cuotas);
  if (!datos.leaseId || !Number.isInteger(cuotas) || cuotas < 1) {
    return { ok: false, texto: 'No reconocí qué pagar. Pídeme el link otra vez.' };
  }
  try {
    const token = getAccessToken();
    const res = await fetch('/api/inquilino/pagos/vencido/wompi-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...cabecerasComoInquilino(),
      },
      body: JSON.stringify({ leaseId: datos.leaseId, cuotas }),
    });
    const cuerpo = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const m = cuerpo.message;
      const dicho = Array.isArray(m) ? m.join(' ') : typeof m === 'string' ? m : null;
      return { ok: false, texto: dicho ?? 'No pude abrir el pago. Prueba de nuevo en un momento.' };
    }
    return {
      ok: true,
      url: buildWompiCheckoutUrl({
        publicKey: String(cuerpo.publicKey),
        currency: String(cuerpo.currency),
        amountInCents: Number(cuerpo.amountInCents),
        reference: String(cuerpo.reference),
        integrity: String(cuerpo.integrity),
        redirectUrl: `${origen}/inquilino/pagos`,
      }),
    };
  } catch {
    return { ok: false, texto: 'No pude abrir el pago. Revisa tu conexión y prueba de nuevo.' };
  }
}
