import { adminApi } from './api'
import { mensajeDelAdmin } from './errores-del-admin'

/**
 * El modelo de cobro del SaaS de UNA inmobiliaria, editado por Leasefy.
 *
 * 🔴 Nico (04-10-2026): «sólo Leasefy lo cambia desde /admin; la inmobiliaria
 * lo ve en sólo lectura». Back: `PATCH /api/v1/admin/pricing-config/:tenantId`
 * (deja su fila en `agent.audit_log` con antes y después). El micro le rechaza
 * el mismo cambio a la inmobiliaria (403 `MODELO_DE_COBRO_SOLO_LEASEFY`).
 *
 * Los porcentajes viajan como FRACCIÓN (0,08 = 8 %), como los guarda la
 * política; en pantalla se escriben en %.
 */

export const MODELOS_DE_COBRO = ['standard', 'performance', 'hybrid'] as const
export type ModeloDeCobro = (typeof MODELOS_DE_COBRO)[number]

/** Lo que dice cada modelo (el motor de facturación del micro, `billing/engine.ts`). */
export const NOMBRE_DEL_MODELO: Record<ModeloDeCobro, string> = {
  standard: 'Estándar (por deudor)',
  performance: 'Por resultado',
  hybrid: 'Mixto',
}

export interface CambioDelModeloDeCobro {
  billingModel?: ModeloDeCobro
  successFeePct?: number
  hybridPct?: number
  monthlyMinCop?: number
  perDeudorCop?: number
  baseFeeCop?: number
}

export interface ModeloDeCobroGuardado {
  tenant_id: string
  billing_model: string
  success_fee_pct: string
  hybrid_pct: string
  monthly_min: string
  per_deudor: string
  base_fee: string
}

export function cambiarModeloDeCobro(
  tenantId: string,
  cambio: CambioDelModeloDeCobro,
): Promise<ModeloDeCobroGuardado> {
  return adminApi<ModeloDeCobroGuardado>(`/pricing-config/${tenantId}`, {
    method: 'PATCH',
    body: cambio,
  })
}

/** «0.0800» → 8 (lo que se escribe en el campo de %). */
export function fraccionAPorcentaje(valor: string | number | null | undefined): number {
  const n = typeof valor === 'number' ? valor : parseFloat(valor ?? '')
  return Number.isFinite(n) ? Math.round(n * 10000) / 100 : 0
}

/** 8 → 0.08 (lo que viaja). */
export function porcentajeAFraccion(porcentaje: number): number {
  return Math.round(porcentaje * 100) / 10000
}

export function mensajeDelFalloDelModelo(err: unknown): string {
  return mensajeDelAdmin(err, {
    accion: 'cambiar el modelo de cobro',
    porDefecto: 'No pudimos cambiar el modelo de cobro. Prueba de nuevo en un momento.',
  })
}
