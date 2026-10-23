'use client';

import { ChatCircleText } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { useAgencySubscription } from '@/lib/hooks/useAgencySubscription';

/**
 * 🔴 «HABLA CON LEASEFY» (FALTANTES, 05-10-2026; decisión 3 del 05-10).
 *
 * El plan de la inmobiliaria lo cambia SÓLO Leasefy, desde /admin (regla «no
 * tocar el modelo de negocio» y «el cobro del SaaS sólo lo cambia Leasefy").
 * Hasta hoy /upgrade y /checkout ofrecían escoger plan y pagarlo con Wompi
 * desde el panel: un camino que cobraba y cambiaba el plan. Ahora las dos
 * pantallas dicen en qué plan está la inmobiliaria y cómo pedir un cambio, y el
 * back responde 403 `PLAN_LO_CAMBIA_LEASEFY` a escoger plan, pagar o cancelar
 * un cambio agendado.
 *
 * La ve CUALQUIER miembro (no sólo el administrador): un 402 `PLAN_REQUERIDO`
 * del panel trae aquí a quien sea, y una pantalla negada no deja hacer nada.
 */
export const CORREO_DE_LEASEFY = 'hola@leasefy.co';

export function textoDelEstadoDelPlan(datos: {
  nombre: string | null;
  estado: string | null;
}): string {
  if (datos.estado === 'SUSPENDED' || datos.estado === 'CANCELLED' || datos.estado === 'PAST_DUE') {
    return datos.nombre
      ? `El plan ${datos.nombre} de tu inmobiliaria está pausado. Escríbenos y lo resolvemos contigo.`
      : 'El plan de tu inmobiliaria está pausado. Escríbenos y lo resolvemos contigo.';
  }
  return datos.nombre ? `Tu inmobiliaria está en el plan ${datos.nombre}.` : 'Tu inmobiliaria todavía no tiene un plan registrado.';
}

export function HablaConLeasefy() {
  // `indeterminate` (y no sólo `isLoading`): mientras la suscripción O el catálogo
  // de planes cargan, no se dice nada del plan (decir «no tiene plan» sería falso).
  const { currentPlan, subscriptionStatus, indeterminate } = useAgencySubscription();
  const asunto = encodeURIComponent('Cambio de plan de mi inmobiliaria');
  return (
    // Ronda 30: el contenedor y el encabezado común del panel (antes una caja centrada con su h1 propio y el ícono
    // del edificio): sección, título liviano y UNA línea de para qué; la tarjeta dice el plan y la única salida.
    <div className="space-y-6 p-6 lg:p-8" data-testid="habla-con-leasefy">
      <BackButton />
      <EncabezadoDePantalla
        seccion="Tu cuenta"
        titulo="Habla con Leasefy"
        descripcion="El plan de tu inmobiliaria lo cambia el equipo de Leasefy: desde aquí no se escoge ni se paga."
      />
      <Presence show>
        <div className="max-w-2xl space-y-4 rounded-lg border border-border bg-surface p-6">
          {!indeterminate && (
            <p className="text-sm font-medium text-fg" data-testid="habla-con-leasefy-plan">
              {textoDelEstadoDelPlan({ nombre: currentPlan?.name ?? null, estado: subscriptionStatus })}
            </p>
          )}
          <p className="text-sm text-fg-muted">
            Cuéntanos qué necesitas (más inmuebles, más personas en el equipo o el Piloto automático) y lo ajustamos
            contigo.
          </p>
          <Button hideArrow asChild>
            <a href={`mailto:${CORREO_DE_LEASEFY}?subject=${asunto}`} data-testid="habla-con-leasefy-correo">
              <ChatCircleText className="h-4 w-4" aria-hidden />
              Escribir a {CORREO_DE_LEASEFY}
            </a>
          </Button>
        </div>
      </Presence>
    </div>
  );
}
