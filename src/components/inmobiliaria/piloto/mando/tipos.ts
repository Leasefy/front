/**
 * Lo que recibe cada dirección del centro de mando: las MISMAS lecturas del
 * piloto automático que ya usa la torre (`/panel/inmobiliaria/piloto`), una por
 * pieza y cada una con su cargando / error / no disponible (fail-soft: una que
 * falla no apaga a las otras).
 *
 * Las direcciones son de PRESENTACIÓN: no llaman a nadie. La página las
 * alimenta con los hooks reales (`useDatosReales`) o con la muestra
 * (`useMuestraViva`, fase 1: para ver el panel encendido en un laboratorio que
 * lo tiene apagado; se borra en la fase 2).
 */

import type {
  ActivityItem,
  InboxItem,
  PilotoBriefing,
  PilotoFlotaResponse,
  PulsoAlerta,
  PulsoResponse,
} from '@/lib/api/piloto'
import type { DirectorHoy, DirectorMetas } from '@/lib/api/piloto-director'
import type { ControlDeAgentes } from './control-de-agentes'
import type { Fuente } from './textos'

/** Una lectura: el dato y en qué está. */
export interface Pieza<T> {
  data: T | null
  isLoading: boolean
  /** El error ENTERO (lo dice `FalloDeCarga`). `null` si no falló. */
  error: unknown
  /** El micro no publica esta ruta (404): no es un error, es «todavía no existe». */
  notAvailable: boolean
  /** «Intentar de nuevo». Ausente en la muestra. */
  reintentar?: () => Promise<void> | void
}

export interface BandejaDelMando {
  items: InboxItem[]
  /** Cuántas esperan DE VERDAD (el micro cuenta aparte lo que no cupo). */
  total: number
  porPrioridad: { alta: number; media: number; baja: number }
}

export interface DatosDelMando {
  fuente: Fuente
  pulso: Pieza<PulsoResponse>
  bandeja: Pieza<BandejaDelMando>
  actividad: Pieza<ActivityItem[]>
  briefing: Pieza<PilotoBriefing>
  flota: Pieza<PilotoFlotaResponse>
  hoy: Pieza<DirectorHoy>
  metas: Pieza<DirectorMetas>
  /** Cuántas acciones se pidieron al feed (para saber si la lista vino recortada). */
  limiteDeActividad: number
}

/** Lo que una dirección puede pedirle a la página (abrir el cajón de siempre). */
export interface AccionesDelMando {
  /** Abre el detalle de un caso (el MISMO cajón de la torre). `accion` = la deja lista. */
  abrirItem: (id: string, accion?: string) => void
  abrirAlerta: (alerta: PulsoAlerta) => void
  /**
   * Lo que la torre ya tenía y la pantalla elegida resume (Nico, 05-10): la
   * Bandeja entera, la actividad completa por día y la tarjeta del director
   * (replanear, metas, semana). Se abren en un cajón; sin el callback (la
   * muestra), no hay botón.
   */
  abrirBandeja?: () => void
  abrirActividad?: () => void
  abrirDirector?: () => void
  /** Abre la hoja de «Autonomía» del encabezado (ir a cambiar modos). */
  abrirAutonomia?: () => void
  /**
   * Activar, apagar o cambiar de modo a un agente desde su tarjeta (Nico, 05-10
   * 19:30), por las MISMAS llamadas de Autonomía. Sin esto, el popover informa
   * pero no ofrece botones.
   */
  agentes?: ControlDeAgentes
}

export interface PropsDeDireccion {
  datos: DatosDelMando
  acciones: AccionesDelMando
  /**
   * Hueco para la activación REAL del piloto automático (`PilotoActivacion`, la
   * franja con «Activar la prueba» y lo que le falta a la operación). La pone la
   * página sólo con datos reales; la dirección decide dónde va.
   */
  activacion?: React.ReactNode
}
