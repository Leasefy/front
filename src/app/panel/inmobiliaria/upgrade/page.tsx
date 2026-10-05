'use client';

import { HablaConLeasefy } from '@/components/inmobiliaria/plan/HablaConLeasefy';

/**
 * /panel/inmobiliaria/upgrade — 🔴 CERRADA (FALTANTES, 05-10-2026; decisión 3 del 05-10).
 *
 * Aquí se escogía plan y se pagaba con Wompi desde el panel. El plan de la
 * inmobiliaria lo cambia sólo Leasefy desde /admin («no tocar el modelo de
 * negocio», «el cobro del SaaS sólo lo cambia Leasefy»): la página dice «Habla
 * con Leasefy» y el back responde 403 `PLAN_LO_CAMBIA_LEASEFY` a escoger plan,
 * pagar o cancelar un cambio agendado. La ruta se queda porque la usan los 402
 * `PLAN_REQUERIDO` y los enlaces «Ver planes» del panel.
 *
 * Sin la guarda de «sólo el administrador»: un 402 trae aquí a cualquier miembro y una
 * pantalla negada no deja hacer nada. Los ayudantes de la página vieja
 * (`plan-change-confirm.ts`, `resume-reactivation.ts`) quedan con sus pruebas.
 */
export default function AgencyUpgradePage() {
  return <HablaConLeasefy />;
}
