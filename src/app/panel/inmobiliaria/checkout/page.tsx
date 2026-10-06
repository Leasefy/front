'use client';

import { HablaConLeasefy } from '@/components/inmobiliaria/plan/HablaConLeasefy';

/**
 * /panel/inmobiliaria/checkout — 🔴 CERRADA (FALTANTES, 05-10-2026; decisión 3 del 05-10).
 *
 * Era el pago del plan escogido (Wompi) desde el panel. El plan lo cambia sólo
 * Leasefy desde /admin: la página dice «Habla con Leasefy», igual que /upgrade,
 * y el back ya no cobra ni cambia el plan desde la inmobiliaria.
 */
export default function AgencyCheckoutPage() {
  return <HablaConLeasefy />;
}
