/**
 * Insights engine (v6-05) — puro/testeable.
 *
 * Cruza la operación (InsightInputs) y produce alertas accionables ordenadas por
 * severidad. Sin dependencias de React/red: el panel lo consume y localiza.
 */

import type { Insight, InsightInputs, InsightSeverity } from './types';

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  success: 3,
};

/** Deriva insights accionables de las entradas operativas. */
export function deriveInsights(input: InsightInputs): Insight[] {
  const out: Insight[] = [];

  if (input.contratosPorVencer30d > 0) {
    out.push({
      id: 'contratos_por_vencer',
      kind: 'contratos_por_vencer',
      severity: input.contratosSinGestion > 0 ? 'warning' : 'info',
      params: { total: input.contratosPorVencer30d, sinGestion: input.contratosSinGestion },
    });
  }

  if (input.inquilinosEnMora > 0) {
    out.push({
      id: 'mora_prioritaria',
      kind: 'mora_prioritaria',
      severity: input.moraPrioritaria > 0 ? 'critical' : 'warning',
      params: { total: input.inquilinosEnMora, prioritarios: input.moraPrioritaria },
    });
  }

  if (input.montoPorDispersar > 0) {
    // Defensive clamp: upstream may feed a stray >100 or negative coverage.
    const cobertura = Math.max(0, Math.min(100, input.coberturaDispersarPct));
    out.push({
      id: 'por_dispersar',
      kind: 'por_dispersar',
      severity: cobertura < 100 ? 'warning' : 'info',
      params: { monto: input.montoPorDispersar, cobertura: Math.round(cobertura) },
    });
  }

  if (input.propiedadesEstancadas7d > 0) {
    out.push({
      id: 'propiedad_estancada',
      kind: 'propiedad_estancada',
      severity: 'info',
      params: { total: input.propiedadesEstancadas7d },
    });
  }

  if (input.firmasPendientes > 0) {
    out.push({
      id: 'firma_pendiente',
      kind: 'firma_pendiente',
      severity: 'info',
      params: { total: input.firmasPendientes },
    });
  }

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
