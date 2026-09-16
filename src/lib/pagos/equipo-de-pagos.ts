/**
 * equipo-de-pagos — quién es el equipo de agentes de pagos, qué hace cada uno,
 * y qué le falta para trabajar. Sin React: se prueba entero sin montar nada.
 *
 * ── Qué es esto, y qué NO es ───────────────────────────────────────────────
 *
 * Es la pantalla de la fila «Agente de pagos» de «Agentes IA» (Nico,
 * 2026-09-16: «el agente de Pagos también entra a la sección de Agentes»). NO
 * es el módulo «Pagos» de Dinero —la plata de la inmobiliaria, con sus dos
 * caras—, y NO es la Sala que se retiró ese mismo día: sus pantallas vivas se
 * mudaron (Pagos fallidos y Recordatorios a Cobranza, Por aprobar a
 * Liquidaciones) y acá no se repiten. Acá se ENLAZAN, como el lugar donde va a
 * aparecer el trabajo de cada especialista.
 *
 * ── De dónde sale cada frase (verificado, no supuesto) ─────────────────────
 *
 * El equipo está escrito y registrado en el micro, en nuestra rama
 * (`cambios-nico-6`, `git ls-tree 6ddd953b`): `src/mastra/agents/pagos/` con
 * `payu.ts` —el conductor, cuya persona pública es Gabriela
 * (`naming-registry.ts`)— y `laura.ts`, `nicolas.ts`, `valentina.ts`,
 * `samuel.ts`, `sofia.ts`, todos en `src/mastra/index.ts`. Lo que hace cada
 * uno sale de la cabecera y del schema de salida de su archivo.
 *
 * Qué está encendido NO se escribe acá: se pregunta. Dos lecturas reales:
 *
 *   · `GET /ai-hub/gobierno` (`fetchPilotoGobierno`) — `disponibleGlobal` es el
 *     interruptor general del servidor (`PAGOS_ENABLED`, `piloto/habilitacion.ts`
 *     del micro) y `corre` dice si además corre para ESTA inmobiliaria.
 *   · `GET /pagos/home/metrics` (`fetchPagosHome`) — el tablero del equipo. Hoy
 *     esas rutas no existen en el micro (404) o responden 503 con el
 *     interruptor apagado; el cliente trata los dos como «no disponible». El
 *     día que existan, la pantalla muestra los números sin tocar el front.
 */

import type { Icon } from '@phosphor-icons/react'
import {
  ChartBar,
  HandCoins,
  LinkSimple,
  Receipt,
  UsersThree,
  WarningCircle,
} from '@phosphor-icons/react'

import type { GobiernoItem } from '@/lib/api/piloto'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'

const P = '/panel/inmobiliaria'

/** La clave con que el micro gobierna al equipo (`AGENTES_GOBERNADOS`). */
export const AGENTE_GOBERNADO = 'pagos'

/** Una pantalla del panel donde va a aparecer el trabajo de un especialista. */
export interface DondeSeVe {
  /** Cómo se llama en el menú, con su camino («Cobranza › Pagos fallidos»). */
  nombre: string
  href: string
  /** El mismo gate que tiene esa pantalla en el menú. */
  module: string | null
  roles?: readonly string[]
}

export interface Especialista {
  id: 'gabriela' | 'laura' | 'nicolas' | 'valentina' | 'samuel' | 'sofia'
  nombre: string
  /** El oficio, en tres o cuatro palabras. */
  rol: string
  queHace: string
  icon: Icon
  /** Null = no tiene pantalla propia, y se dice (`sinPantalla`). */
  dondeSeVe: DondeSeVe | null
  /** Por qué no tiene pantalla propia, cuando no la tiene. */
  sinPantalla?: string
}

const CONTADOR = [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]

export const EQUIPO_DE_PAGOS: readonly Especialista[] = [
  {
    // `payu.ts`: el ÚNICO punto de entrada; no es especialista, delega.
    id: 'gabriela',
    nombre: 'Gabriela',
    rol: 'Coordina al equipo',
    queHace:
      'Recibe cada cobro, decide qué especialista lo trabaja y no deja salir ningún mensaje al inquilino que no pase el filtro de la Ley 2300 y de Habeas Data.',
    icon: UsersThree,
    dondeSeVe: null,
    sinPantalla: 'No tiene pantalla propia: coordina a los demás.',
  },
  {
    // `laura.ts`: tool-light; el ERP es dueño de emitir la factura.
    id: 'laura',
    nombre: 'Laura',
    rol: 'Prepara el cobro',
    queHace:
      'Arma el cobro del período de cada contrato, con sus conceptos y su total. El que lo emite es el ERP, no ella.',
    icon: Receipt,
    dondeSeVe: { nombre: 'Cartera › Cobros emitidos', href: `${P}/pagos/cartera/cobros`, module: 'cobros' },
  },
  {
    // `nicolas.ts`: `generateInvoiceLinkTool` + `sendCobroTool`; el micro nunca toca la pasarela.
    id: 'nicolas',
    nombre: 'Nicolás',
    rol: 'Envía el link de pago',
    queHace:
      'Le pide al ERP el link de pago del cobro y se lo manda al inquilino por WhatsApp, correo o SMS.',
    icon: LinkSimple,
    dondeSeVe: null,
    sinPantalla: 'No tiene pantalla propia: trabaja sobre el cobro que preparó Laura.',
  },
  {
    // `valentina.ts`: sugiere; la ejecución la confirma una persona (D-45-01).
    id: 'valentina',
    nombre: 'Valentina',
    rol: 'Vigila los pagos fallidos',
    queHace:
      'Clasifica por qué falló cada pago y sugiere qué sigue: reenviar el link, mandar uno nuevo, ofrecer otro medio o pasarlo a cobranza. No actúa en bloque sin tu confirmación.',
    icon: WarningCircle,
    dondeSeVe: { nombre: 'Cobranza › Pagos fallidos', href: `${P}/pagos/cobranza/fallidos`, module: 'cobranza' },
  },
  {
    // `samuel.ts`: RECOMIENDA; la aprobación la hace una persona (D-46-08).
    id: 'samuel',
    nombre: 'Samuel',
    rol: 'Liquida a los propietarios',
    queHace:
      'Calcula el neto de cada propietario —canon menos comisión, descuentos y retenciones—, detecta lo que frena el giro y recomienda aprobar o revisar. Nunca aprueba solo.',
    icon: HandCoins,
    dondeSeVe: { nombre: 'Pagos › Liquidaciones', href: `${P}/pagos/liquidaciones`, module: null, roles: CONTADOR },
  },
  {
    // `sofia.ts`: eventos a notificar + reporte a propietarios + cierre del día.
    id: 'sofia',
    nombre: 'Sofía',
    rol: 'Avisa y reporta',
    queHace:
      'Avisa a quien corresponde de cada cobro enviado, pago recibido o pago fallido, y arma el reporte a los propietarios y el cierre del día.',
    icon: ChartBar,
    dondeSeVe: { nombre: 'Cobranza › Recordatorios', href: `${P}/pagos/cobranza/recordatorios`, module: 'cobranza' },
  },
]

// ── Qué está encendido ──────────────────────────────────────────────────────

/** Lo que se sabe del gobierno del equipo, tal como llegó. */
export type LecturaDelGobierno =
  | { estado: 'cargando' }
  | { estado: 'fallo' }
  | { estado: 'listo'; item: GobiernoItem | null }

/** Lo que se sabe del tablero del equipo, tal como llegó. */
export type LecturaDelTablero =
  | { estado: 'cargando' }
  | { estado: 'fallo'; error: unknown }
  | { estado: 'no-disponible' }
  | { estado: 'listo' }

export type EstadoDelEquipo =
  | 'cargando'
  /** El interruptor general del servidor está apagado: no corre para nadie. */
  | 'apagado-en-leasefy'
  /** Encendido en el servidor, apagado para esta inmobiliaria. */
  | 'apagado-para-tu-inmobiliaria'
  | 'encendido'
  /** No pudimos preguntar (el servicio no contestó, o no lista al equipo). */
  | 'sin-verificar'

export function estadoDelEquipo(gobierno: LecturaDelGobierno): EstadoDelEquipo {
  if (gobierno.estado === 'cargando') return 'cargando'
  // 🔴 Sin respuesta NO es «apagado»: decir apagado sin haber preguntado es
  // la misma mentira que decir encendido.
  if (gobierno.estado === 'fallo' || gobierno.item === null) return 'sin-verificar'
  if (!gobierno.item.disponibleGlobal) return 'apagado-en-leasefy'
  return gobierno.item.corre ? 'encendido' : 'apagado-para-tu-inmobiliaria'
}

export const ETIQUETA_DEL_ESTADO: Record<EstadoDelEquipo, string> = {
  cargando: 'Consultando…',
  'apagado-en-leasefy': 'Apagado',
  'apagado-para-tu-inmobiliaria': 'Apagado para tu inmobiliaria',
  encendido: 'Encendido',
  'sin-verificar': 'Sin verificar',
}

// ── Qué le falta para trabajar ──────────────────────────────────────────────

export type EstadoDelPaso = 'hecho' | 'falta' | 'espera' | 'sin-verificar' | 'cargando'

export interface PasoParaTrabajar {
  id: 'leasefy' | 'inmobiliaria' | 'tablero'
  titulo: string
  estado: EstadoDelPaso
  detalle: string
}

/**
 * Las tres llaves, en el orden en que se abren. Cada una sale de una lectura
 * real; ninguna se da por hecha. Si la lectura falló, el paso dice «sin
 * verificar», nunca «falta».
 */
export function pasosParaQueTrabaje(
  gobierno: LecturaDelGobierno,
  tablero: LecturaDelTablero,
): PasoParaTrabajar[] {
  const equipo = estadoDelEquipo(gobierno)

  const leasefy: PasoParaTrabajar = {
    id: 'leasefy',
    titulo: 'Encendido en Leasefy',
    ...(equipo === 'cargando'
      ? { estado: 'cargando', detalle: 'Consultando el servicio de agentes…' }
      : equipo === 'sin-verificar'
        ? { estado: 'sin-verificar', detalle: 'El servicio de agentes no contestó, así que no sabemos si está encendido.' }
        : equipo === 'apagado-en-leasefy'
          ? {
              estado: 'falta',
              detalle:
                'El interruptor general del equipo está apagado para todas las inmobiliarias. Lo enciende el equipo de Leasefy; desde tu panel no se puede.',
            }
          : { estado: 'hecho', detalle: 'El interruptor general del equipo está encendido.' }),
  }

  const inmobiliaria: PasoParaTrabajar = {
    id: 'inmobiliaria',
    titulo: 'Encendido para tu inmobiliaria',
    ...(equipo === 'cargando'
      ? { estado: 'cargando', detalle: 'Consultando el servicio de agentes…' }
      : equipo === 'sin-verificar'
        ? { estado: 'sin-verificar', detalle: 'Depende de la misma consulta, que no contestó.' }
        : equipo === 'apagado-en-leasefy'
          ? { estado: 'espera', detalle: 'Se decide cuando esté encendido en Leasefy.' }
          : equipo === 'apagado-para-tu-inmobiliaria'
            ? {
                estado: 'falta',
                detalle: 'Un administrador lo enciende desde Inicio, en «Autonomía».',
              }
            : { estado: 'hecho', detalle: 'Corre para tu inmobiliaria.' }),
  }

  const tableroPublicado: PasoParaTrabajar = {
    id: 'tablero',
    titulo: 'Su tablero publicado',
    ...(tablero.estado === 'cargando'
      ? { estado: 'cargando', detalle: 'Consultando el tablero del equipo…' }
      : tablero.estado === 'fallo'
        ? { estado: 'sin-verificar', detalle: 'No pudimos consultar el tablero del equipo.' }
        : tablero.estado === 'no-disponible'
          ? {
              estado: 'falta',
              detalle:
                'El servicio de agentes todavía no publica lo que hace el equipo: cobros enviados, pagos fallidos, propietarios listos para girar. El día que lo publique, esta pantalla lo muestra sola.',
            }
          : { estado: 'hecho', detalle: 'Lo que hace el equipo se ve abajo.' }),
  }

  return [leasefy, inmobiliaria, tableroPublicado]
}
