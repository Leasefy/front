'use client';

/**
 * Plan y facturación DE LEASEFY (no las facturas que emitís vos: eso es el
 * módulo Facturación del menú).
 *
 * El plan, el precio y los límites salen de la suscripción real de la agencia
 * (el componente los pide con `useAgencySubscription` + `useAgencyPlans`);
 * `useAgencyBilling` sólo aporta el uso, las facturas y el medio de pago.
 */

import { ConfigFacturacion } from '@/components/inmobiliaria';
import { useAgencyBilling } from '@/lib/hooks/useInmobiliaria';

export function SeccionFacturacion() {
  const { billing, invoices, isLoading } = useAgencyBilling();

  // `onUpdatePaymentMethod` tiraba un `toast.info` que decía «Abriendo
  // formulario de pago» sin abrir ninguno (y el componente tiraba OTRO igual,
  // con el mismo texto). Ahora el botón lleva a `/upgrade`, que es donde la
  // pasarela real (Wompi) registra el medio de pago: la navegación es el aviso.
  return <ConfigFacturacion billing={billing} invoices={invoices} isLoading={isLoading} />;
}
