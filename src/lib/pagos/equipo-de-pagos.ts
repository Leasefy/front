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
 * 🔴 COBRI-6 (QA de los agentes, 18-10-2026). Hasta hoy la pantalla presentaba
 * a los seis agentes de MODELO del micro (`src/mastra/agents/pagos/`:
 * Gabriela, Cuenti, Nicolás, Valentina, Samuel y Sofía), que nunca corrieron.
 * Nico (16-10): «que corran los cinco con nombres inventados». Los que corren
 * hoy son de reglas fijas, sin modelo, y cada frase sale de su archivo del back:
 *
 *   · Pagui  — `agent-payments/payu/pagui/pagui.ts` (el resumen de las 7:00);
 *   · Cuenti — `agent-payments/payu/cuenti/cuenti.ts` (7 días antes, 3 frenos);
 *   · Cobri  — `payu-contrato` + `conciliar-link-pagado.service.ts` (Nicolás se
 *     fundió en Cobri: el que manda el link es Cobri);
 *   · Reti   — `agent-payments/payu/fallidos/reti.ts` («Según el caso»);
 *   · Giri   — `inmobiliaria/dispersiones/lotes/giri.ts` (4 frenos, nunca aprueba);
 *   · Noti   — `agent-payments/payu/noti/noti.ts` (campana + correo del resumen).
 *
 * Gabriela, Valentina, Samuel y Sofía se fueron: Gabriela→Pagui, Valentina→Reti,
 * Samuel→Giri, Sofía→Noti.
 *
 * Qué está encendido NO se escribe acá: se pregunta, con `GET /ai-hub/gobierno`
 * (`fetchPilotoGobierno`): `disponibleGlobal` es el interruptor general del
 * servidor (`PAGOS_ENABLED`, `piloto/habilitacion.ts` del micro) y `corre` dice
 * si además corre para ESTA inmobiliaria.
 *
 * 🔴 Sin «tablero» (QA de Portofino, 14-10-2026; Nico: «organízala»). Había un
 * tercer paso, «Su tablero publicado», que leía `GET /pagos/home/metrics` y
 * decía «Falta» en cada visita: esa ruta no existe en el micro (la borró por
 * error el commit `3ca090a6` «wip: full checkpoint»; nació en `520995a2`) y,
 * aunque volviera, lee las facturas y liquidaciones PROPIAS del equipo, que
 * sólo se llenan con el equipo encendido. No es algo que la inmobiliaria pueda
 * hacer, ni lo que el equipo necesita para trabajar: no se muestra. Si el
 * equipo se enciende, restaurar `520995a2` y volver a pintar sus números.
 */

import type { Icon } from '@phosphor-icons/react'
import {
  Bell,
  ChartBar,
  HandCoins,
  LinkSimple,
  Receipt,
  WarningCircle,
} from '@phosphor-icons/react'

import type { GobiernoItem } from '@/lib/api/piloto'

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
  id: 'pagui' | 'cuenti' | 'cobri' | 'reti' | 'giri' | 'noti'
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

/**
 * Inicio (el Piloto) vive en el layout y lo ve cualquier miembro: sus enlaces
 * van sin gate. `?bandeja=1` y `?actividad=1` abren su cajón.
 */
export const INICIO = `${P}/piloto`

export const EQUIPO_DE_PAGOS: readonly Especialista[] = [
  {
    // `pagui.ts`: UNA entrada en la Actividad cada mañana; si no pasó nada, no escribe.
    id: 'pagui',
    nombre: 'Pagui',
    rol: 'El resumen de cada mañana',
    queHace:
      'Cada mañana, a las 7, deja en la Actividad lo que hizo el equipo ayer: los links que salieron y los que se pagaron, qué pasó con los pagos fallidos, los cobros por revisar y los lotes de giros. También dice lo que sigue esperando a una persona.',
    icon: ChartBar,
    dondeSeVe: { nombre: 'Inicio › Actividad', href: `${INICIO}?actividad=1`, module: null },
  },
  {
    // `cuenti.ts`: sólo AVISA (`soloAviso`); lo que falta lo arregla una persona.
    // IA95-10 (Nico, 05-10-2026): nombre inventado, como Cobri, Niti o Fixi.
    id: 'cuenti',
    nombre: 'Cuenti',
    rol: 'Revisa el cobro antes de que venza',
    queHace:
      'Una semana antes de que venza cada cuota, revisa que el cobro vaya a salir bien. Si le falta el canon, los impuestos del contrato no están confirmados o el inquilino no tiene correo ni celular, te deja un aviso en la Bandeja. Cuando lo arreglas en el contrato, el aviso se cierra solo.',
    icon: Receipt,
    dondeSeVe: { nombre: 'Inicio › Bandeja', href: `${INICIO}?bandeja=1`, module: null },
  },
  {
    // Cobri (`payu-contrato`): el que manda el link. Nicolás se fundió acá
    // (COBRI-6). COBRI-2: el envío es sólo por WhatsApp. El pago por el link
    // emite el recibo y abona la cuota (`conciliar-link-pagado.service.ts`).
    id: 'cobri',
    nombre: 'Cobri',
    rol: 'Manda el link de pago',
    queHace:
      'Le manda al inquilino por WhatsApp el link de pago de su cuota: 3 días antes, el día y 3 días después del vencimiento, siempre el mismo link. Cuando el inquilino paga, emite el recibo y abona la cuota solo.',
    icon: LinkSimple,
    dondeSeVe: null,
    sinPantalla: 'Su trabajo se ve aquí arriba: el link de cada cuota y en qué va.',
  },
  {
    // `reti.ts`: cada paso es la MISMA acción del botón de Pagos fallidos, con
    // la Ley 2300 y el horario; el modo del Piloto decide si espera un clic.
    id: 'reti',
    nombre: 'Reti',
    rol: 'Recupera los pagos fallidos',
    queHace:
      'Cuando un pago por el link falla, decide según el caso: le reenvía el mismo link una vez; si sigue sin pagar, le manda por correo cómo pagar por transferencia; si el link venció, le manda uno nuevo, y si la cuota ya pasó el plazo, la pasa a cobranza. Según tu modo, lo hace solo o te lo deja en la Bandeja.',
    icon: WarningCircle,
    dondeSeVe: { nombre: 'Cobranza › Pagos fallidos', href: `${P}/pagos/cobranza/fallidos`, module: 'cobranza' },
  },
  {
    // `giri.ts`: manda a REVISAR, nunca aprueba. No lo prende el interruptor
    // del equipo: revisa cada lote que se arma.
    id: 'giri',
    nombre: 'Giri',
    rol: 'Revisa antes de girar',
    queHace:
      'Antes de girarle al propietario, revisa cada liquidación del lote y marca la que hay que mirar: el inquilino no ha pagado, la cuenta del propietario cambió hace menos de 30 días, los impuestos del contrato no están confirmados o una reparación espera la aprobación del propietario. Nunca aprueba solo: aprobar pide «Ya lo revisé». Revisa cada lote, aunque el equipo esté apagado.',
    icon: HandCoins,
    dondeSeVe: { nombre: 'Dispersiones › Lotes al banco', href: `${P}/pagos/dispersiones/lotes`, module: 'dispersiones' },
  },
  {
    // `noti.ts`: campana a quien puede ver cobros; correo a los administradores.
    id: 'noti',
    nombre: 'Noti',
    rol: 'Te avisa',
    queHace:
      'Te avisa en la campana cada pago por el link que falla, uno por uno, y cada hora los pagos que entraron, juntos. Le llega a quien tiene permiso de cobros. Cada mañana manda el resumen de Pagui por correo a los administradores; se apaga en Configuración › Notificaciones, en «Pagos y cobros».',
    icon: Bell,
    dondeSeVe: null,
    sinPantalla: 'No tiene pantalla propia: sus avisos llegan a la campana y al correo.',
  },
]

// ── Qué está encendido ──────────────────────────────────────────────────────

/** Lo que se sabe del gobierno del equipo, tal como llegó. */
export type LecturaDelGobierno =
  | { estado: 'cargando' }
  | { estado: 'fallo' }
  | { estado: 'listo'; item: GobiernoItem | null }

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
  // COBRI-3: la pantalla decía «Encendido» acá y «Prendido» en Cobri; el producto dice «Prendido».
  encendido: 'Prendido',
  'sin-verificar': 'Sin verificar',
}

// ── Qué le falta para trabajar ──────────────────────────────────────────────

export type EstadoDelPaso = 'hecho' | 'falta' | 'espera' | 'sin-verificar' | 'cargando'

export interface PasoParaTrabajar {
  id: 'leasefy' | 'inmobiliaria'
  titulo: string
  estado: EstadoDelPaso
  detalle: string
}

/**
 * Las dos llaves, en el orden en que se abren. Cada una sale de una lectura
 * real; ninguna se da por hecha. Si la lectura falló, el paso dice «sin
 * verificar», nunca «falta».
 */
export function pasosParaQueTrabaje(gobierno: LecturaDelGobierno): PasoParaTrabajar[] {
  const equipo = estadoDelEquipo(gobierno)

  const leasefy: PasoParaTrabajar = {
    id: 'leasefy',
    titulo: 'Prendido en Leasefy',
    ...(equipo === 'cargando'
      ? { estado: 'cargando', detalle: 'Consultando el servicio de agentes…' }
      : equipo === 'sin-verificar'
        ? { estado: 'sin-verificar', detalle: 'El servicio de agentes no contestó, así que no sabemos si está prendido.' }
        : equipo === 'apagado-en-leasefy'
          ? {
              estado: 'falta',
              detalle:
                'El interruptor general del equipo está apagado para todas las inmobiliarias. Lo prende el equipo de Leasefy; desde tu panel no se puede.',
            }
          : { estado: 'hecho', detalle: 'El interruptor general del equipo está prendido.' }),
  }

  const inmobiliaria: PasoParaTrabajar = {
    id: 'inmobiliaria',
    titulo: 'Prendido para tu inmobiliaria',
    ...(equipo === 'cargando'
      ? { estado: 'cargando', detalle: 'Consultando el servicio de agentes…' }
      : equipo === 'sin-verificar'
        ? { estado: 'sin-verificar', detalle: 'Depende de la misma consulta, que no contestó.' }
        : equipo === 'apagado-en-leasefy'
          ? { estado: 'espera', detalle: 'Se decide cuando esté prendido en Leasefy.' }
          : equipo === 'apagado-para-tu-inmobiliaria'
            ? {
                estado: 'falta',
                detalle: 'Un administrador lo prende desde Inicio, en «Autonomía».',
              }
            : { estado: 'hecho', detalle: 'Corre para tu inmobiliaria.' }),
  }

  return [leasefy, inmobiliaria]
}
