'use client';

/**
 * ¿Esta persona puede hacer un recibo de caja?
 *
 * El back exige `cobros:create` para emitirlo. Sin este gate un VIEWER veía
 * «Hacer recibo», llenaba el formulario entero y recién al emitir comía un 403
 * (C6 de la auditoría del 13-09).
 *
 * Regla de la casa: sin permiso el botón NO desaparece —esconder un control se
 * lee como «falta la función»—; queda deshabilitado y dice por qué.
 *
 * Mientras los permisos resuelven se deja habilitado, igual que
 * `ReglasDeMora.tsx`: apagar todo durante esa fracción de segundo hace
 * parpadear la pantalla a cada quien que sí puede.
 */

import { usePermissions } from '@/lib/hooks/usePermissions';

export const MOTIVO_SIN_PERMISO_DE_RECIBO = 'Necesitas permiso para crear cobros.';

export function usePuedeHacerRecibo(): boolean {
  const { canAccess, isLoading } = usePermissions();
  return isLoading || canAccess('cobros', 'create');
}
