'use client';

/**
 * A dónde vuelve la persona después de pagar el plan en el banco.
 *
 * 🔴 QA 23-09: la transacción PSE del plan no llevaba `redirect_url`, así que
 * después del banco nadie volvía a Leasefy y no había dónde ver cómo terminó.
 * El back ahora la manda a `/panel/checkout?resultado=pse&pago=<id>` y esta
 * vista le pregunta al back (`GET /subscriptions/pse/pagos/:id`) hasta que el
 * banco confirme. El plan lo activa el webhook, no esta pantalla: acá sólo se
 * CUENTA lo que pasó.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Clock, WarningCircle } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui';
import { subscriptionsApi } from '@/lib/api/subscriptions.service';
import type { EstadoDelPagoPse } from '@/lib/api/subscriptions.types';
import { useI18n } from '@/lib/i18n';

/** Cada cuánto se vuelve a preguntar, y hasta cuándo. */
export const CADA_MS = 4_000;
export const INTENTOS = 30;

export function ResultadoDelPagoPse({ pagoId, plan }: { pagoId: string; plan?: string | null }) {
  const { t } = useI18n();
  const [estado, setEstado] = useState<EstadoDelPagoPse | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vivo = true;
    let intentos = 0;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const preguntar = async () => {
      intentos += 1;
      try {
        const r = await subscriptionsApi.estadoDelPagoPse(pagoId);
        if (!vivo) return;
        setEstado(r);
        setFallo(false);
        if (r.estado === 'PENDIENTE' && intentos < INTENTOS) {
          temporizador = setTimeout(() => void preguntar(), CADA_MS);
        }
      } catch {
        if (vivo) setFallo(true);
      }
    };
    void preguntar();
    return () => {
      vivo = false;
      if (temporizador) clearTimeout(temporizador);
    };
  }, [pagoId]);

  const reintentar = `/panel/checkout${plan ? `?plan=${encodeURIComponent(plan)}` : ''}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-foreground mb-6">{t('landlord.checkout.resultadoTitulo')}</h1>
        <div className="bg-card rounded-sm border border-border p-6 space-y-4" data-testid="resultado-del-pago">
          {fallo ? (
            <p className="flex items-start gap-2 text-sm text-fg-muted" data-estado="ERROR">
              <WarningCircle className="h-5 w-5 shrink-0 text-warning" aria-hidden />
              {t('landlord.checkout.resultadoError')}
            </p>
          ) : !estado ? (
            <div className="flex justify-center py-4">
              <Spinner size="md" />
            </div>
          ) : estado.estado === 'APROBADO' ? (
            <p className="flex items-start gap-2 text-sm text-foreground" data-estado="APROBADO">
              <CheckCircle className="h-5 w-5 shrink-0 text-success" aria-hidden />
              {t('landlord.checkout.resultadoAprobado', { name: estado.planNombre ?? '' })}
            </p>
          ) : estado.estado === 'RECHAZADO' ? (
            <p className="flex items-start gap-2 text-sm text-foreground" data-estado="RECHAZADO">
              <WarningCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
              {t('landlord.checkout.resultadoRechazado')}
            </p>
          ) : (
            <p className="flex items-start gap-2 text-sm text-fg-muted" data-estado="PENDIENTE">
              <Clock className="h-5 w-5 shrink-0" aria-hidden />
              {t('landlord.checkout.resultadoPendiente')}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {estado?.estado === 'RECHAZADO' && (
              <Button asChild>
                <Link href={reintentar}>{t('landlord.checkout.resultadoIntentarDeNuevo')}</Link>
              </Button>
            )}
            <Button asChild variant={estado?.estado === 'RECHAZADO' ? 'outline' : 'default'}>
              <Link href="/panel">{t('landlord.checkout.resultadoIrAlPanel')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
