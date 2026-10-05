import type { MotivoDeTerminacion } from '@/lib/api/ciclo-de-vida.service';

export type ReglaDeLaPenalidad = NonNullable<MotivoDeTerminacion['penalidad']>;

/**
 * Espejo de `PENALIDAD_SEGUN_EL_MOTIVO` del back (QA-CONT CR-10 · A-08, CEO
 * 18-09), para un back que no la mande en el catálogo de motivos.
 */
export const PENALIDAD_SEGUN_EL_MOTIVO: Record<string, ReglaDeLaPenalidad> = {
  INCUMPLIMIENTO_DEL_INQUILINO: 'POR_DEFECTO',
  ENTREGA_ANTICIPADA_DEL_INQUILINO: 'POR_DEFECTO',
  OTRO: 'POR_DEFECTO',
  MUTUO_ACUERDO: 'SOLO_SI_SE_ESCRIBE',
  FUERZA_MAYOR: 'SOLO_SI_SE_ESCRIBE',
  VENTA_DEL_INMUEBLE: 'NO_APLICA',
  INCUMPLIMIENTO_DEL_ARRENDADOR: 'NO_APLICA',
};

/** QA-CONT-95: qué pasa con la penalidad con este motivo (la del back si la manda). */
export function penalidadSegunElMotivo(
  motivo: Pick<MotivoDeTerminacion, 'codigo' | 'penalidad'> | undefined,
): ReglaDeLaPenalidad {
  if (!motivo) return 'POR_DEFECTO';
  return motivo.penalidad ?? PENALIDAD_SEGUN_EL_MOTIVO[motivo.codigo] ?? 'POR_DEFECTO';
}
