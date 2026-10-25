'use client';

import { createContext, useContext } from 'react';

/**
 * ¿Esta persona arrienda hoy? Decide el menú del portal del inquilino (Nico
 * eligió «3 secciones», 21-10-2026): quien arrienda ve «Mi arriendo»; quien no,
 * «Buscar arriendo».
 *
 * Es la MISMA cuenta del Inicio (`app/inquilino/page.tsx`): los arriendos
 * activos más los contratos vigentes que no tienen arriendo (el migrado sin
 * día de pago, CA-04). `null` mientras no se sabe, para no mostrar un menú y
 * cambiarlo. Si las dos lecturas fallan, se trata como «no arrienda»: el menú
 * de buscar no esconde nada que el otro tenga sin ofrecer otra salida, y
 * «Mi arriendo» sigue a un clic desde el Inicio.
 */
import { useLeases } from '@/lib/hooks/useLeases';
import { useContratosDelPortal } from '@/lib/hooks/use-contratos-del-portal';

export function useArriendaHoy(): boolean | null {
  const { getActive, isLoading } = useLeases();
  const { contratos, cargando } = useContratosDelPortal(true);
  if (isLoading || cargando) return null;
  return getActive().length + contratos.length > 0;
}

/*
 * Revisora r25 (glow up r26): las pantallas del portal que necesitan saber si la persona arrienda (Acuerdos, Mi
 * calificación) lo leen del layout, que ya lo calculó para el menú: ninguna lectura nueva al back. Fuera del layout
 * (pruebas, otra ruta) es `null`: «todavía no se sabe», y cada pantalla se queda como estaba.
 */
const ArriendaHoyDelPortal = createContext<boolean | null>(null);

export const ArriendaHoyDelPortalProvider = ArriendaHoyDelPortal.Provider;

/** Lo que el layout del portal ya sabe: `true` arrienda, `false` no, `null` todavía no se sabe. */
export function useArriendaHoyDelPortal(): boolean | null {
  return useContext(ArriendaHoyDelPortal);
}
