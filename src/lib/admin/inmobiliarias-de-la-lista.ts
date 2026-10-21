import { sinTildes } from './format'

/** Una fila de `GET /tenants`: la inmobiliaria de la plataforma (19-10-2026). */
export interface InmobiliariaDeLaLista {
  agency_id: string
  tenant_id: string
  legal_name: string
  nombre?: string
  nit: string
  ciudad?: string | null
  correo?: string | null
  billing_model: string | null
  primary_contact_email: string | null
  created_at: string
  debtor_count: number
  call_count: number
  paid_total: string | null
  activa?: boolean
  en_cobranza_por_voz?: boolean | null
  solo_en_el_agente?: boolean
  plan?: { tier: string; nombre: string | null; estado: string; modo: string; fin_del_periodo: string | null } | null
  contratos_activos?: number
  contratos?: number
  inmuebles?: number
  equipo?: number
  migracion?: 'completada' | 'omitida' | 'pendiente'
  /** Llegó por el registro rápido del marketplace (Nico, 20-10-2026: «márcalas»). */
  del_marketplace?: boolean
}

/** ¿La fila pasa los filtros de la pantalla? */
export function pasaLosFiltros(
  f: InmobiliariaDeLaLista,
  { q, plan, voz }: { q: string; plan: string; voz: string },
): boolean {
  if (q) {
    const donde = sinTildes([f.legal_name, f.nombre, f.nit, f.ciudad, f.correo, f.primary_contact_email].filter(Boolean).join(' '))
    if (!sinTildes(q).split(/\s+/).filter(Boolean).every((p) => donde.includes(p))) return false
  }
  if (plan) {
    const estado = f.plan?.estado ?? 'sin-plan'
    if (estado !== plan) return false
  }
  if (voz === 'si' && f.en_cobranza_por_voz !== true) return false
  if (voz === 'no' && f.en_cobranza_por_voz !== false) return false
  return true
}
