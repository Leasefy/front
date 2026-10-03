'use client';

/**
 * «Pagar cuota» de un acuerdo de pago del inquilino (ACUE-03).
 *
 * ── Conectado por la ruta de la sesión de pago (Nico, 02-10-2026, noche) ─────
 *
 * Antes el botón preguntaba a `acuerdosApi.getCuotaPaymentUrl`
 * (`/cartera/payment-plans/:id/installments/:n/payment-url`), una ruta que no
 * existió nunca en ningún servicio (se borró el 02-10-2026, «seguimiento 3»):
 * quedaba apagado para siempre con «Próximamente». Ahora hace lo mismo que
 * `PayRentModal` con el arriendo:
 *
 *   1. POST `/api/inquilino/acuerdos/wompi-session` con `{ planId, cuotaNumber }`
 *      y el token del inquilino. NUNCA un monto: la ruta lo saca del plan y
 *      firma la sesión del lado del servidor (anti-tamper).
 *   2. Con la sesión, redirige la pestaña al checkout de Wompi. Al volver, la
 *      cuota sigue «confirmando» hasta el webhook: no hay éxito optimista.
 *
 * Los errores llegan con el sobre (`{ statusCode, code, message, campos,
 * referencia }`) y se dicen con el traductor bajo el botón: un 4xx dice qué
 * está mal; un 5xx, «de nuestro lado» con la referencia; «conexión», sólo
 * cuando el pedido no salió. Una respuesta sin el sobre decide por el status
 * (nunca un `{ error: 'código_en_inglés' }`).
 *
 * El aviso entra y sale con `Presence` de Cadence (fundido + 4px con los
 * tokens `--motion-*`; con movimiento reducido, sólo el fundido).
 */

import { useCallback, useRef, useState } from 'react';
import { CreditCard } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { getAccessToken, type ApiError } from '@/lib/api/client';
import { falloDelMicro } from '@/lib/api/fallo-del-micro';
import { buildWompiCheckoutUrl, type WompiRentSession } from '@/lib/payments/wompi-rent-session';
import type { AcuerdoInstallment } from '@/lib/api/tenant-acuerdos.types';
import { nombreDeLaCuota } from '@/components/tenant/CuotaPlanTable';

/** La ruta que firma la sesión de pago de una cuota. */
export const RUTA_DE_LA_SESION_DE_LA_CUOTA = '/api/inquilino/acuerdos/wompi-session';

const PRUEBA_DE_NUEVO = 'No pudimos iniciar el pago. Prueba de nuevo en un momento.';

/**
 * Por qué no arrancó el pago de la cuota, según lo que respondió la ruta.
 *
 * Con el sobre, gana SU frase (con la regla de oro del traductor: un 5xx dice
 * «de nuestro lado» con la referencia). Las frases por status quedan para
 * cuando no hay frase legible (una respuesta sin el sobre, un balanceador).
 * Nunca se decide por el texto.
 */
export function motivoDeLaCuotaQueNoInicio(fallo: { status: number } | ApiError): string {
  const status = fallo.status;
  let porDefecto = PRUEBA_DE_NUEVO;
  if (status === 401) porDefecto = 'Tu sesión expiró. Vuelve a iniciar sesión para pagar.';
  else if (status === 403 || status === 404) {
    porDefecto = 'No encontramos este acuerdo de pago a tu nombre. Recarga la página e intenta de nuevo.';
  } else if (status === 400 || status === 422) {
    porDefecto = 'No pudimos iniciar el pago con estos datos. Recarga la página e intenta de nuevo.';
  }
  return mensajeParaLaPersona(fallo, { accion: 'iniciar el pago', porDefecto });
}

/**
 * La respuesta que no salió bien, como error: con el sobre, un `ApiError` con
 * su `code`, su frase y su referencia; sin el sobre (no trae `statusCode`),
 * sólo el status.
 */
async function falloDeLaSesionDePago(res: Response): Promise<{ status: number } | ApiError> {
  const fallo = await falloDelMicro(res);
  return typeof fallo.detalle?.statusCode === 'number' ? fallo : { status: res.status };
}

export function PagarCuota({
  planId,
  cuota,
  locale,
}: {
  planId: string;
  cuota: AcuerdoInstallment;
  locale: string;
}) {
  const es = locale === 'es';
  const [preparando, setPreparando] = useState(false);
  const [motivo, setMotivo] = useState<string | null>(null);
  // Un doble clic no pide dos sesiones.
  const enCurso = useRef(false);

  const pagar = useCallback(async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    setPreparando(true);
    setMotivo(null);
    try {
      const token = getAccessToken();
      const res = await fetch(RUTA_DE_LA_SESION_DE_LA_CUOTA, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        // SÓLO el identificador: nunca un monto (lo resuelve la ruta).
        body: JSON.stringify({ planId, cuotaNumber: cuota.number }),
      });

      if (!res.ok) {
        setMotivo(motivoDeLaCuotaQueNoInicio(await falloDeLaSesionDePago(res)));
        setPreparando(false);
        enCurso.current = false;
        return;
      }

      const sesion = (await res.json()) as WompiRentSession;
      // La pestaña se va a Wompi: el botón sigue «preparando» hasta que salga.
      window.location.href = buildWompiCheckoutUrl({
        ...sesion,
        redirectUrl: `${window.location.origin}/inquilino/acuerdos/${encodeURIComponent(planId)}`,
      });
    } catch (err) {
      // 🔴 Regla de oro: «conexión» sólo si el pedido no salió.
      setMotivo(mensajeParaLaPersona(err, { accion: 'iniciar el pago', porDefecto: PRUEBA_DE_NUEVO }));
      setPreparando(false);
      enCurso.current = false;
    }
  }, [planId, cuota.number]);

  return (
    <section className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-surface-muted p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-border flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-5 h-5 text-fg-muted dark:text-fg-subtle" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-fg dark:text-white">
            {es ? 'Pago de cuota' : 'Installment payment'}
          </h2>
          <p className="text-xs text-fg-muted dark:text-fg-subtle mt-0.5">
            {es
              ? `Próxima cuota por pagar: ${nombreDeLaCuota(cuota.number, locale).toLowerCase()}`
              : `Next installment due: ${nombreDeLaCuota(cuota.number, locale).toLowerCase()}`}
          </p>
        </div>
      </div>

      <Button type="button" onClick={pagar} isLoading={preparando} disabled={preparando} hideArrow>
        {preparando
          ? es
            ? 'Preparando el pago…'
            : 'Preparing the payment…'
          : es
            ? cuota.number === 0
              ? 'Pagar la cuota inicial'
              : `Pagar cuota ${cuota.number}`
            : cuota.number === 0
              ? 'Pay the down payment'
              : `Pay installment ${cuota.number}`}
      </Button>

      <Presence
        show={motivo !== null}
        as="p"
        distance="xs"
        role="alert"
        data-testid="pagar-cuota-motivo"
        className="mt-3 text-caption text-danger"
      >
        {motivo}
      </Presence>

      <p className="mt-3 text-xs text-fg-subtle dark:text-fg-muted">
        {es
          ? 'Cuando pagues, el estado de la cuota queda en confirmando hasta que se verifique; se confirma en tu historial una vez validado. Cualquier recibo es un comprobante interno.'
          : 'After you pay, the installment stays confirming until verified; it is confirmed in your history once validated. Any receipt is an internal voucher.'}
      </p>
    </section>
  );
}
