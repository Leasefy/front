/**
 * Todo lo que el centro de mando sabe en un instante, derivado UNA vez de las
 * lecturas (`DatosDelMando`) para que las tres direcciones digan lo mismo con
 * las mismas cuentas. Puro: sin red, sin React.
 *
 * Cada campo es `null` cuando su lectura no llegó: «sin dato», nunca 0.
 */

import type { ActivityItem, InboxItem, PilotoTendencias, PulsoAlerta, PulsoEnCurso, PulsoSeveridad } from '@/lib/api/piloto'
import type { TasaDeRecaudo } from '@/lib/tasa-de-recaudo'
import type { DirectorHoy, MetaDelDirector } from '@/lib/api/piloto-director'

import {
  alertasParaMostrar,
  alertasPorSeveridad,
  agentesDeLasBarras,
  atrasadas,
  avanceDelPlan,
  barrasDeLasAcciones,
  avanceMedio,
  conteoDeLaFlota,
  estadoDelMando,
  estadoDelOrbe,
  hechoHoy,
  metasParaMostrar,
  pilotoActivo,
  recaudoConSuBase,
  recuperadoDelMes,
  recuperadoDelMesDeLaSerie,
  solosHoyPorAgente,
  tendenciaDeMora,
  tripulacion,
  urgentes,
  vozDelDia,
  type AvanceDelPlan,
  type BarraDeAcciones,
  type ConteoDeLaFlota,
  type EstadoDelMando,
  type HechoHoy,
  type MiembroDeLaTripulacion,
  type SoloPorAgente,
  type TendenciaDeMora,
  type VozDelDia,
} from './calculos'
import type { EstadoDelOrbe } from '@/lib/agentes/agente-que-habla'
import type { DatosDelMando } from './tipos'

export interface IndicadoresDelMando {
  /** `null` = no se supo (la flota no contestó). */
  activo: boolean | null
  estado: EstadoDelMando
  orbe: EstadoDelOrbe
  voz: VozDelDia | null
  /** La frase de por qué está apagado (del micro). */
  fraseDelPiloto: string | null
  /**
   * ¿Se le puede ofrecer «Enciende el piloto automático»? Sólo si el motivo de
   * `/piloto/activo` lo permite: `sin_activar` o `apagado_por_la_inmobiliaria`.
   * Con Leasefy apagado (`apagado_por_leasefy`, ACT-09), la prueba terminada o
   * sin poder leerlo, NO: la API contestaría 409 (QA-PILOTO-95, 06-10).
   */
  sePuedeEncender: boolean
  enCurso: PulsoEnCurso[]
  alertas: PulsoAlerta[]
  porSeveridad: Record<PulsoSeveridad, number> | null
  /** Decisiones. */
  esperan: number | null
  altas: number | null
  atrasadas: number | null
  urgentes: InboxItem[]
  /** Lo del día (pulso + briefing). */
  hoy: HechoHoy | null
  recuperado: number | null
  /** Flota. */
  flota: ConteoDeLaFlota | null
  tripulacion: MiembroDeLaTripulacion[]
  /** Director. */
  director: DirectorHoy | null
  directorEncendido: boolean
  plan: AvanceDelPlan | null
  metas: MetaDelDirector[]
  avanceDeMetas: { n: number; avance: number } | null
  /** Actividad. */
  actividad: ActivityItem[]
  solosHoy: { porAgente: SoloPorAgente[]; total: number; recortado: boolean } | null
  /** MANDO-DATOS (05-10-2026): las tendencias. Cada una `null` = sin dato. */
  recuperadoPorDia: Array<{ fecha: string; cop: number }> | null
  /** Las metas activas que no entran al promedio por ser estimadas (se ven en su tarjeta). */
  metasEstimadasAparte: number
  /**
   * Las metas activas de cifra real SIN tramo que medir (el objetivo es su
   * línea base: «arranca en tu nivel de hoy» o «sostenerla»). Existen: el
   * medidor no puede decir «sin metas».
   */
  metasEnSuPuntoDePartida: number
  acciones: { barras: BarraDeAcciones[]; agentes: string[]; recortada: boolean } | null
  horas: PilotoTendencias['horas']
  mora: (TendenciaDeMora & { definicion: string }) | null
  /** La tasa de recaudo del mes con la base que eligió la inmobiliaria (la mide el back). */
  recaudo: TasaDeRecaudo | null
}

export function indicadoresDelMando(d: DatosDelMando, ahora: number): IndicadoresDelMando {
  const pulso = d.pulso.data
  const flota = d.flota.data
  const activo = pilotoActivo(flota)
  const estado = estadoDelMando(pulso, activo)
  const enCurso = pulso?.enCurso ?? []
  const voz = vozDelDia(d.hoy.data, pulso, d.briefing.data)
  const bandeja = d.bandeja.data
  const director = d.hoy.data
  const metas = d.metas.data?.encendido ? metasParaMostrar(d.metas.data.metas) : []
  const actividad = d.actividad.data ?? []
  const tendencias = d.tendencias?.data ?? null
  const barras = tendencias?.acciones ? barrasDeLasAcciones(tendencias.acciones.dias, tendencias.hoy) : null
  const mora = tendencias?.mora ? tendenciaDeMora(tendencias.mora.dias) : null
  return {
    activo,
    estado,
    orbe: estadoDelOrbe(estado, enCurso.length > 0),
    voz,
    fraseDelPiloto: flota?.piloto?.frase ?? null,
    sePuedeEncender: flota?.piloto?.motivo === 'sin_activar' || flota?.piloto?.motivo === 'apagado_por_la_inmobiliaria',
    enCurso,
    alertas: pulso ? alertasParaMostrar(pulso.alertas, voz?.texto ?? null) : [],
    porSeveridad: pulso ? alertasPorSeveridad(pulso.alertas) : null,
    esperan: bandeja ? bandeja.total : null,
    altas: bandeja ? bandeja.porPrioridad.alta : null,
    atrasadas: bandeja ? atrasadas(bandeja.items, ahora) : null,
    urgentes: bandeja ? urgentes(bandeja.items, 5) : [],
    hoy: hechoHoy(pulso, d.briefing.data),
    // El del briefing; si no lo manda (lo omite en 0), el del mes sumado de la serie diaria (la misma definición).
    recuperado: recuperadoDelMes(d.briefing.data) ?? (tendencias?.recuperado ? recuperadoDelMesDeLaSerie(tendencias.recuperado.dias, ahora) : null),
    flota: conteoDeLaFlota(flota),
    tripulacion: tripulacion(flota, actividad, enCurso),
    director,
    directorEncendido: Boolean(director?.encendido),
    plan: avanceDelPlan(director),
    metas,
    avanceDeMetas: avanceMedio(metas),
    actividad,
    solosHoy: d.actividad.data ? solosHoyPorAgente(d.actividad.data, ahora, d.limiteDeActividad) : null,
    recuperadoPorDia: tendencias?.recuperado?.dias ?? null,
    metasEstimadasAparte: metas.filter((m) => String(m.estado) === 'activa' && m.estimada).length,
    metasEnSuPuntoDePartida: metas.filter((m) => String(m.estado) === 'activa' && !m.estimada && m.lineaBase !== null && m.lineaBase === m.objetivo).length,
    acciones: barras ? { barras, agentes: agentesDeLasBarras(barras), recortada: Boolean(tendencias?.acciones?.recortada) } : null,
    horas: tendencias?.horas ?? null,
    mora: mora && tendencias?.mora ? { ...mora, definicion: tendencias.mora.definicion } : null,
    recaudo: recaudoConSuBase(d.recaudo?.data ?? null),
  }
}
