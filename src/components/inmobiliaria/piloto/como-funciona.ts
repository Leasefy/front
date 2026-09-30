/**
 * como-funciona.ts — lo que «¿Cómo funciona?» cuenta del Piloto, sin React.
 *
 * Nico (30-09): «si un usuario llega acá no entiende pero nada de lo que hace
 * esa pantalla, qué agentes usa, por qué se tiene, qué significa piloto
 * automático». Esto es la parte que NO se puede inventar: qué agentes hay y en
 * qué grupo cae cada uno. Las frases viven en `es.json`
 * (`inmobiliaria.piloto.comoFunciona.*`).
 *
 * ── De dónde sale la lista ──────────────────────────────────────────────────
 * La manda el micro de agentes en `GET /ai-hub/autonomia` (la flota): es
 * `AGENTES_CON_AUTONOMIA` en `src/piloto/flota.ts` del repo `agent` (rama
 * `bugs-nico`, leída el 30-09-2026), la unión de:
 *   · `AGENTE_IDS` (`src/server/lib/ai-hub-shared.ts`): cobranza, cotizador,
 *     conciliacion, pagos, estudio, matching, avaluos.
 *   · `AGENTES_GOBERNADOS` (`src/piloto/habilitacion.ts`): retencion, calidad,
 *     mantenimiento, prospectos, aprobaciones.
 *   · `AGENTES_DE_LA_OPERACION` (`src/piloto/perilla.ts`): contratos,
 *     facturacion, propietarios, contabilidad.
 *   · el chat del panel (`AGENTE_CHAT`).
 * Qué hace cada uno sale de la tabla de verdad del micro
 * (`src/piloto/que-hace-cada-modo.ts` y `perilla.ts`).
 *
 * En pantalla manda la respuesta EN VIVO: si el micro agrega o quita un
 * agente, el cajón lo muestra tal cual. Esta lista sólo se usa cuando la flota
 * no contestó, para no dejar la explicación vacía. «Gerente» NO es un agente
 * de la flota (es el prefijo de procesos que se reparten entre los demás), por
 * eso no está.
 */

import type { AgenteDeLaFlota } from '@/lib/api/piloto'

export const AGENTES_DEL_PILOTO = [
  'cobranza',
  'cotizador',
  'conciliacion',
  'pagos',
  'estudio',
  'matching',
  'avaluos',
  'retencion',
  'calidad',
  'mantenimiento',
  'prospectos',
  'aprobaciones',
  'contratos',
  'facturacion',
  'propietarios',
  'contabilidad',
  'chat',
] as const

export type AgenteDelPiloto = (typeof AGENTES_DEL_PILOTO)[number]

export function esAgenteConocido(id: string): id is AgenteDelPiloto {
  return (AGENTES_DEL_PILOTO as readonly string[]).includes(id)
}

/**
 * Los tres grupos del cajón. Contar a los diecisiete como iguales es lo que
 * hacía que «Autonomía 0/17» no se entendiera: sólo algunos cambian con el
 * modo.
 *   · `conModo`   — corren y el modo decide cuánto hacen solos (`actua`).
 *   · `aPedido`   — corren, pero el modo no les cambia nada: trabajan cuando
 *                   alguien se lo pide (`gobierna: false`).
 *   · `apagados`  — no corren para esta inmobiliaria, o están en pausa de
 *                   producto (`AGENTES_NO_DISPONIBLES` del panel de autonomía).
 */
export type GrupoDeAgentes = 'conModo' | 'aPedido' | 'apagados'

export interface AgentesAgrupados {
  conModo: AgenteDeLaFlota[]
  aPedido: AgenteDeLaFlota[]
  apagados: AgenteDeLaFlota[]
}

export function grupoDe(
  a: AgenteDeLaFlota,
  enPausa: ReadonlySet<string>,
): GrupoDeAgentes {
  if (!a.corre || enPausa.has(a.agente)) return 'apagados'
  if (a.gobierna === false) return 'aPedido'
  // Un micro viejo sin `actua`/`gobierna`: corre, y el modo lo gobierna.
  if (a.actua === false) return 'aPedido'
  return 'conModo'
}

export function agruparAgentes(
  agentes: readonly AgenteDeLaFlota[],
  enPausa: ReadonlySet<string>,
): AgentesAgrupados {
  const grupos: AgentesAgrupados = { conModo: [], aPedido: [], apagados: [] }
  for (const a of agentes) grupos[grupoDe(a, enPausa)].push(a)
  return grupos
}

// ── La presentación de la primera vez ───────────────────────────────────────

/** La forma que acepta el back para una clave de `onboarding-visto` (su CHECK). */
const FORMA_DE_LA_CLAVE = /^[a-z0-9]+(?:[-:][a-z0-9]+)*$/
const LARGO_MAXIMO_DE_LA_CLAVE = 80
const CLAVE_BASE = 'novedad:piloto'

/**
 * La clave de «ya vio la presentación del Piloto», POR PERSONA.
 *
 * `/inmobiliaria/onboarding-visto` guarda por inmobiliaria; para que cada
 * miembro la vea una vez, la clave lleva su id (`novedad:piloto:<usuario>`).
 * El back valida la forma (`[a-z0-9]` separados por `-` o `:`, hasta 80): un
 * id que no cumpla —o que no haya— cae a la clave de la agencia, que el back sí
 * acepta, en vez de mandar una que devolvería 400 y la volvería a mostrar.
 */
export function claveDeLaNovedadDelPiloto(usuarioId: string | null | undefined): string {
  if (!usuarioId) return CLAVE_BASE
  const id = usuarioId.trim().toLowerCase()
  const clave = `${CLAVE_BASE}:${id}`
  return FORMA_DE_LA_CLAVE.test(clave) && clave.length <= LARGO_MAXIMO_DE_LA_CLAVE ? clave : CLAVE_BASE
}
