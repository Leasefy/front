/**
 * Insights & Alertas — tipos (v6-05).
 *
 * "De informes a insights": en vez de mostrar reportes estáticos, el sistema
 * deriva alertas accionables de la operación. Motor puro en `engine.ts`.
 */

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'success';

/** Tipo de insight — el panel mapea cada kind a icono/color/acción/i18n. */
export type InsightKind =
  | 'contratos_por_vencer'   // contratos que vencen pronto, algunos sin gestión
  | 'mora_prioritaria'       // inquilinos en mora, algunos sobre el umbral
  | 'por_dispersar'          // monto pendiente de dispersar a propietarios
  | 'propiedad_estancada'    // propiedades disponibles sin candidatos hace días
  | 'firma_pendiente';       // contratos esperando firma

/** Un insight derivado. `params` alimenta la plantilla i18n (counts, montos). */
export interface Insight {
  id: string;
  kind: InsightKind;
  severity: InsightSeverity;
  params: Record<string, string | number>;
}

/** Entradas que el motor cruza para derivar insights (las llena la operación real / hooks). */
export interface InsightInputs {
  contratosPorVencer30d: number;
  contratosSinGestion: number;
  inquilinosEnMora: number;
  moraPrioritaria: number;        // mora > umbral (p.ej. 15 días)
  montoPorDispersar: number;      // COP
  coberturaDispersarPct: number;  // 0-100
  propiedadesEstancadas7d: number;
  firmasPendientes: number;
}

export const INSIGHT_INPUTS_VACIO: InsightInputs = {
  contratosPorVencer30d: 0,
  contratosSinGestion: 0,
  inquilinosEnMora: 0,
  moraPrioritaria: 0,
  montoPorDispersar: 0,
  coberturaDispersarPct: 0,
  propiedadesEstancadas7d: 0,
  firmasPendientes: 0,
};
