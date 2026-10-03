'use client';

/**
 * Volver a pedir el estado de cuenta SIN desmontarlo (ARREGLOS-7, 03-10-2026).
 *
 * Registrar la devolución del saldo a favor o marcarla «Revisado» cambia la
 * deuda del contrato, y los totales del documento («resta por pagar», la barra
 * de lo pagado) se quedaban con los números de antes hasta recargar la página.
 * Recargarla volviendo a montar la pantalla (lo que hace «Anular recibo») no
 * sirve acá: la sección perdería el aviso de lo que acaba de pasar.
 *
 * Lo da `PantallaDelEstadoDeCuenta`; fuera de ella (el enlace público, el PDF)
 * no hay nada que refrescar y el contexto es `null`.
 */

import * as React from 'react';

export type RefrescarElEstado = () => Promise<void>;

export const ContextoDeRefrescarElEstado = React.createContext<RefrescarElEstado | null>(null);

/** `null` fuera de la pantalla del estado de cuenta. */
export function useRefrescarElEstado(): RefrescarElEstado | null {
  return React.useContext(ContextoDeRefrescarElEstado);
}
