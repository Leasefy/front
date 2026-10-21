/** `GET /api/v1/admin/banderas` (19-10-2026): agentes por inmobiliaria y pausa de emergencia. */
export interface AgenteGobernado {
  agente: string
  nombre: string
  queHace: string
}

export interface BanderasDeLaInmobiliaria {
  tenant_id: string
  nombre: string
  /** `null` = no tiene política en el micro (no se puede cambiar). */
  lista: string[] | null
  hereda: boolean
  pausada: boolean
  encendidos: Record<string, boolean>
  pausa: { cuando: string; quien: string | null; motivo: string | null } | null
}

export interface RespuestaDeBanderas {
  agentes: AgenteGobernado[]
  inmobiliarias: BanderasDeLaInmobiliaria[]
}
