'use client';

import { PagarLeasefy } from '@/components/inmobiliaria/plan/PagarLeasefy';

/**
 * /panel/inmobiliaria/upgrade — «Tu plan de Leasefy» (Nico, 27-10-2026: «pagar desde el panel»).
 *
 * Del 05-10 al 27-10 decía «Habla con Leasefy» y el back no dejaba pagar. Ahora muestra lo que tiene la cuenta,
 * cuánto le sale con sus inmuebles y paga con Wompi (tarjeta, PSE o Nequi). A esta ruta llegan el 402
 * `PLAN_REQUERIDO`, el «Upgrade» del menú, los candados, el modal del fin del mes gratis y los correos.
 * Sin la guarda de «sólo el administrador»: cualquiera ve el plan; pagar lo hace quien tiene `subscription:edit`.
 */
export default function AgencyUpgradePage() {
  return <PagarLeasefy />;
}
