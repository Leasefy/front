/**
 * piloto-de-las-inmobiliarias.ts (admin) — el Piloto automático de cada
 * inmobiliaria, para el equipo de Leasefy (ACT-09, Nico 05-10-2026:
 * «construir el interruptor en /admin»).
 *
 *   GET   /piloto              → PilotoDeLaInmobiliaria[]
 *   PATCH /piloto/:tenantId    { estado, motivo } → la fila nueva
 *
 * El back escribe la MISMA fila que lee el micro
 * (`agent.piloto_de_la_inmobiliaria`) y deja quién, cuándo, de qué estado a
 * cuál y el motivo en `agent.audit_log`, en la misma sentencia.
 */
import { adminApi } from './api'
import { mensajeDelAdmin } from './errores-del-admin'

export const ESTADOS_DEL_PILOTO = ['prueba', 'contratado', 'apagado'] as const
export type EstadoDelPilotoPorLeasefy = (typeof ESTADOS_DEL_PILOTO)[number]

/** Cómo se dice cada estado en la pantalla, y qué pasa al elegirlo. */
export const EL_ESTADO: Record<EstadoDelPilotoPorLeasefy, { nombre: string; queHace: string }> = {
  prueba: {
    nombre: 'En prueba',
    queHace:
      'La prueba de 30 días. Si la de antes ya terminó, le da una nueva: empieza cuando un administrador de la inmobiliaria lo prenda (o desde hoy, si ya está prendido).',
  },
  contratado: {
    nombre: 'Contratado',
    queHace: 'Sin vencimiento. Si estaba prendido sigue prendido; si no, lo prende un administrador de la inmobiliaria.',
  },
  apagado: {
    nombre: 'Apagado por Leasefy',
    queHace:
      'Ningún agente de esa inmobiliaria actúa solo y su administrador no lo puede volver a prender. Lo que eligió en cada agente queda guardado.',
  },
}

export interface PilotoDeLaInmobiliaria {
  tenant_id: string
  legal_name: string
  estado: EstadoDelPilotoPorLeasefy
  activo: boolean
  detalle: string
  plan: string | null
  prueba_desde: string | null
  prueba_hasta: string | null
  apagado_en: string | null
  motivo_apagado: string | null
  updated_by: string | null
  updated_at: string | null
}

export function listarElPiloto(signal?: AbortSignal): Promise<PilotoDeLaInmobiliaria[]> {
  return adminApi<PilotoDeLaInmobiliaria[]>('/piloto', { signal })
}

export function cambiarElPiloto(
  tenantId: string,
  estado: EstadoDelPilotoPorLeasefy,
  motivo: string,
): Promise<PilotoDeLaInmobiliaria> {
  return adminApi<PilotoDeLaInmobiliaria>(`/piloto/${tenantId}`, { method: 'PATCH', body: { estado, motivo } })
}

export function mensajeDelFalloDelPiloto(err: unknown): string {
  return mensajeDelAdmin(err, {
    accion: 'cambiar el Piloto automático de la inmobiliaria',
    porDefecto: 'No pudimos cambiar el Piloto automático. Prueba de nuevo en un momento.',
  })
}
