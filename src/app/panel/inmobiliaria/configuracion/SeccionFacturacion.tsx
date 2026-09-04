'use client';

/**
 * Plan y facturación DE LEASEFY (no las facturas que emitís vos: eso es el
 * módulo Facturación del menú).
 *
 * El plan, el precio y los límites salen de la suscripción real de la agencia
 * (el componente los pide con `useAgencySubscription` + `useAgencyPlans`);
 * `useAgencyBilling` sólo aporta el uso, las facturas y el medio de pago.
 */

import { toast } from 'sonner';

import { useI18n } from '@/lib/i18n';
import { ConfigFacturacion } from '@/components/inmobiliaria';
import { useAgencyBilling } from '@/lib/hooks/useInmobiliaria';

export function SeccionFacturacion() {
  const { t } = useI18n();
  const { billing, invoices, isLoading } = useAgencyBilling();

  return (
    <ConfigFacturacion
      billing={billing}
      invoices={invoices}
      isLoading={isLoading}
      onUpdatePaymentMethod={() =>
        toast.info(t('inmobiliaria.config.toasts.updatePaymentMethod'), {
          description: t('inmobiliaria.config.toasts.updatePaymentMethodDesc'),
        })
      }
    />
  );
}
