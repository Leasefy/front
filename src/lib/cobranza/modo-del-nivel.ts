import type { AutonomiaModo } from '@/lib/api/piloto'
import type { AutonomyLevel } from '@/lib/hooks/cobranza/use-autonomy'

/**
 * N-13 (QA-PAGOS-95 r2; decisión de Nico 17-09): la autonomía de la cobranza se
 * dice con los TRES modos del Piloto. El peldaño viejo del micro (cuatro
 * niveles), dicho con el modo del Piloto que le corresponde.
 */
export function modoDelNivel(nivel: AutonomyLevel | null | undefined): AutonomiaModo {
  if (nivel === 'aprobar') return 'copiloto'
  if (nivel === 'automatico_controlado' || nivel === 'automatico_completo') return 'autonomo'
  return 'sombra'
}
