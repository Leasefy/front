'use client';

/**
 * El aviso al volver de Wompi a un acuerdo de pago (Nico, 02-10-2026, ola
 * «seguimiento 4»).
 *
 * «Pagar cuota» manda la pestaña a Wompi con `redirect-url` =
 * `/inquilino/acuerdos/<planId>`, y Wompi vuelve con `?id=<transacción>`. Hasta
 * hoy la página no decía nada al volver: la cuota seguía «pendiente» hasta el
 * webhook y la persona podía creer que el pago se perdió y pagar otra vez.
 *
 * Lo que dice, sin prometer lo que no sabe (el `id` lo pone el navegador y no
 * es fuente de verdad):
 *   · si Wompi lo aprobó, la cuota se marca pagada en unos minutos (el webhook
 *     del back la cierra en el micro): no hay que volver a pagar;
 *   · un pago que NO es de una cuota —el acuerdo completo— no se aplica solo:
 *     una persona de la inmobiliaria lo revisa y lo aplica (Nico: «plan
 *     entero: se deja y va a una persona»; el back deja ese pago FALLIDO para
 *     revisión, `acuerdos-de-pago.service.ts`).
 *
 * Entra y sale con `Presence` de Cadence (los tokens `--motion-*`; con
 * movimiento reducido, sólo el fundido).
 */

import { useState } from 'react';
import { Clock } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const TEXTOS_DEL_AVISO = {
  es: {
    titulo: 'Estamos confirmando tu pago',
    cuota:
      'Si Wompi lo aprobó, la cuota se marca como pagada en unos minutos. No hace falta volver a pagar.',
    planEntero:
      'Un pago que no corresponde a una cuota (por ejemplo, el acuerdo completo) no se aplica solo: una persona de tu inmobiliaria lo revisa y lo aplica.',
    entendido: 'Entendido',
  },
  en: {
    titulo: 'We are confirming your payment',
    cuota:
      'If Wompi approved it, the installment is marked as paid in a few minutes. No need to pay again.',
    planEntero:
      'A payment that is not for an installment (for example, the whole agreement) is not applied automatically: a person at your agency reviews and applies it.',
    entendido: 'Got it',
  },
} as const;

export function AvisoDelPagoDelAcuerdo({
  show,
  locale,
  className,
}: {
  show: boolean;
  locale: string;
  className?: string;
}) {
  const [cerrado, setCerrado] = useState(false);
  const t = locale === 'es' ? TEXTOS_DEL_AVISO.es : TEXTOS_DEL_AVISO.en;

  return (
    <Presence
      show={show && !cerrado}
      as="section"
      distance="xs"
      role="status"
      data-testid="aviso-del-pago-del-acuerdo"
      className={cn('rounded-xl border border-warning/30 bg-warning-soft p-5 sm:p-6', className)}
    >
      <div className="flex items-start gap-3">
        <Clock className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-fg dark:text-white">{t.titulo}</p>
          <p className="text-sm text-fg-muted dark:text-fg-subtle">{t.cuota}</p>
          <p className="text-sm text-fg-muted dark:text-fg-subtle">{t.planEntero}</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setCerrado(true)}>
          {t.entendido}
        </Button>
      </div>
    </Presence>
  );
}
