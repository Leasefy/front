/**
 * 🔴 QA-IA-95 (05-10-2026, IA-A-12): «Tienes una cotización en progreso. ¿Continuar donde la dejaste?» salía
 * en los pasos 2 a 4 del asistente: era el borrador que el propio asistente acababa de guardar al avanzar.
 * El aviso sólo vale para un borrador que YA estaba al entrar, en el primer paso y mientras nadie lo cerró.
 */
export function mostrarElAvisoDelBorrador(a: { habiaAlEntrar: boolean; hayBorrador: boolean; abierto: boolean; paso: number }): boolean {
  return a.habiaAlEntrar && a.hayBorrador && a.abierto && a.paso === 1
}
