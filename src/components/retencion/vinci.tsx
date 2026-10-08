'use client'

/**
 * Piezas de Vinci (retención) que comparten el tablero, la lista de casos, el
 * caso, «Por aprobar» y la renovación (P-7): el puntaje con su umbral y el
 * DESGLOSE —qué señal del ERP sumó cuánto—, que es lo que hace explicable el
 * número (Nico, 26-09-2026).
 */
import { Badge } from '@/components/ui/badge'
import type { DetalleDeLaOferta, ModoDelPiloto, Poblacion, SenalDeVinci, TipoDeOferta } from '@/lib/types/retencion'

export const NOMBRE_DEL_MODO: Record<ModoDelPiloto, string> = {
  sombra: 'Manual',
  copiloto: 'Copiloto',
  autonomo: 'Automático',
}

/**
 * Qué hace Vinci en cada modo (la regla única del Piloto), en una frase. Sin
 * el nombre del modo adelante: va al lado del chip que ya lo dice (antes se
 * leía «Piloto en Automático. Automático: …»).
 */
export const QUE_HACE_EN_CADA_MODO: Record<ModoDelPiloto, string> = {
  sombra: 'Vinci sólo propone; nada se crea ni sale sin tu clic.',
  copiloto: 'Deja el plan, las tareas y el mensaje listos, y espera tu clic.',
  autonomo: 'Además escribe solo (WhatsApp o correo) en horario de ley, con 1 minuto para deshacerlo.',
}

/** El nombre de cada oferta, el mismo en el caso y en «Por aprobar». */
export const NOMBRE_DE_LA_OFERTA: Record<TipoDeOferta, string> = {
  llamada_del_asesor: 'Llamada del asesor',
  visita_del_asesor: 'Visita del asesor',
  resolver_pendiente: 'Resolver primero lo pendiente',
  congelar_incremento: 'Congelar el incremento',
  bajar_incremento: 'Bajar el incremento',
  descuento_comision: 'Descuento en la comisión',
}

/** «10 % de la comisión · 12 meses · el propietario aceptó». */
export function detalleEnPalabras(d: DetalleDeLaOferta): string {
  const partes: string[] = []
  if (typeof d.descuentoPct === 'number') partes.push(`${d.descuentoPct} % de la comisión`)
  if (typeof d.meses === 'number') partes.push(`${d.meses} meses`)
  if (typeof d.incrementoPct === 'number') partes.push(`incremento de ${d.incrementoPct} %`)
  if (d.aceptadaPorElPropietario) partes.push('el propietario aceptó')
  return partes.join(' · ')
}

/**
 * «20 oct 2026» desde un DATE «2026-10-20». Se lee la parte YYYY-MM-DD como
 * fecha local: `new Date('2026-10-20')` es medianoche UTC y en Bogotá cae al
 * día anterior.
 */
export function fechaCorta(iso: string | null | undefined): string | null {
  if (!iso) return null
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  const d = partes ? new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) : new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/ de /g, ' ')
}

export const QUIEN: Record<Poblacion, string> = { inquilino: 'Inquilino', propietario: 'Propietario' }

/**
 * Qué es cada decisión de Vinci — el MISMO vocabulario del micro
 * (`vinci/en-la-bandeja.ts`). 🔴 «notified» fue un correo INTERNO al
 * responsable: nunca «propietario notificado».
 */
export const QUE_ES_CADA_DECISION: Record<string, string> = {
  plan_created: 'Plan de retención armado',
  escalated_legal: 'Escalada a jurídico',
  parked_review: 'Caso aparcado para revisión',
  notified: 'Aviso interno al responsable (al propietario no se le escribió)',
  propuesta: 'Vinci propone retenerlo',
  mensaje_listo: 'Mensaje listo, espera tu clic',
  mensaje_programado: 'Mensaje programado (se puede deshacer hasta que salga)',
  mensaje_enviado: 'Mensaje enviado',
  mensaje_no_salio: 'El mensaje no salió',
  oferta: 'Oferta de retención',
}

export function fechaYHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Lo que dice la marca «En cobranza» (Nico, 26-09). */
export const POR_QUE_EN_COBRANZA = 'Más de 60 días de mora: lo lleva cobranza y Vinci no lo retiene.'

/** «72/100» en mono, y si pasa el umbral, «En riesgo»; si pasó a cobranza, «En cobranza». */
export function PuntajeDeVinci({ puntaje, enRiesgo, enCobranza }: { puntaje: number; enRiesgo: boolean; enCobranza?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" data-testid="vinci-puntaje">
      <span>
        <span className="font-mono tabular-nums text-fg">{puntaje}</span>
        <span className="text-sm text-fg-muted">/100</span>
      </span>
      {enCobranza ? (
        <Badge variant="warning" title={POR_QUE_EN_COBRANZA}>
          En cobranza
        </Badge>
      ) : enRiesgo ? (
        <Badge variant="destructive">En riesgo</Badge>
      ) : null}
    </span>
  )
}

/**
 * El desglose: cada señal con lo que sumó. Si la suma pasa de 100, se dice
 * que el tope recortó (el puntaje es 100, las señales suman más).
 */
export function DesgloseDelPuntaje({
  senales,
  puntaje,
  suma,
  sinTotal = false,
}: {
  senales: SenalDeVinci[]
  puntaje: number
  suma?: number
  /** Sin la fila del puntaje: para la pantalla que ya lo dice en su franja (no repetirlo). */
  sinTotal?: boolean
}) {
  if (senales.length === 0) {
    return <p className="text-sm text-fg-muted">Sin señales: al día, sin PQRS ni mantenimientos abiertos, lejos del fin.</p>
  }
  return (
    <div data-testid="vinci-desglose">
      {/* `overflow-hidden`: la fila del total pinta su fondo hasta el borde y
          sin el recorte asomaba en las esquinas redondeadas (se veía en oscuro). */}
      <ul className="divide-y divide-border-faint overflow-hidden rounded-lg border border-border">
        {senales.map((s) => (
          <li key={s.clave} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <span className="text-sm text-fg">{s.texto}</span>
            <span className="shrink-0 font-mono text-sm tabular-nums text-fg">+{s.puntos}</span>
          </li>
        ))}
        {sinTotal ? null : (
          <li className="flex items-baseline justify-between gap-4 bg-surface-muted/40 px-4 py-2.5">
            <span className="text-sm font-medium text-fg">Puntaje</span>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-fg">
              {puntaje}
              <span className="text-fg-muted">/100</span>
            </span>
          </li>
        )}
      </ul>
      {suma !== undefined && suma > puntaje ? (
        <p className="mt-2 text-caption text-fg-muted">Las señales suman {suma}; el puntaje tiene tope en 100.</p>
      ) : null}
    </div>
  )
}
