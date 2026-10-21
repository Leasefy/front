'use client';

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
