import { redirect } from 'next/navigation'

/**
 * Revisora r25 (C9, ronda 26): «Promesas de pago» se fusionó en «Acuerdos de
 * pago» (Nico, 2026-08-09; NOTA en `agentWorkspaceNav.ts`): la tabla de
 * Acuerdos muestra los dos orígenes —lo que el agente registra en una llamada y
 * los planes de cuotas— con la columna «Tipo». La ruta seguía viva como una
 * pantalla paralela; quien llegue por un enlace aterriza en Acuerdos, en los
 * vigentes. La pantalla vieja queda en `PromesasDePago.tsx` por si hay que
 * volver atrás.
 */
export default function PromesasDePagoFusionadas(): never {
  redirect('/panel/inmobiliaria/pagos/cobranza/acuerdos?estado=vigente')
}
