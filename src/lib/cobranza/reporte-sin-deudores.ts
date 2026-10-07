/**
 * CB-12 (QA-PAGOS-95 r2): el reporte diario no trae ningún deudor ni morosidad:
 * no hay de qué recuperar, así que el «% recuperado» se calla («—»).
 */
export function sinDeudores(data: {
  top_debtors: readonly unknown[]
  summary: { indice_morosidad_pct?: number | null }
}): boolean {
  return data.top_debtors.length === 0 && !(data.summary.indice_morosidad_pct && data.summary.indice_morosidad_pct > 0)
}
