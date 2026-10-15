'use client'

/**
 * BriefingView — el día CONGELADO: «lo que Naira te envió», no el estado de ahora (Fase 13, plan 13-03; UI-SPEC §7.1,
 * P3, P5, P6, P10, P11).
 *
 * Qué decide cada puro (src/lib/naira/briefing-y-senal.ts): `elegirEntrega` qué entrega se pinta (el briefing antes que
 * el aviso; el correo antes que WhatsApp), `itemsDeLaSeccion` los ítems de cada sección en el orden en que llegaron,
 * `loQueTraeElDia` el inventario / la madurez / el arranque (hoy no viajan: E13-5) y `mensajeDelSilencio`, vía
 * `InventarioDelDia`, qué se dice cuando «Requiere tu atención» está vacía (sin inventario, nunca que no hay nada).
 *
 * «Requiere tu atención» está siempre; las demás secciones solo si traen ítems. `estadoDelEnvio` no se pinta (UI-SPEC no
 * lo define, declarado). La pregunta semanal va el lunes y solo con la acción de responderla.
 *
 * Las rutas salen de src/lib/nav/rutas-de-naira.ts: esta vista y las páginas son las únicas piezas que conocen la
 * ubicación del workspace (D13-1).
 */

import type { JSX } from 'react'
import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { CaretDown, Info } from '@phosphor-icons/react'

import { InventarioDelDia } from '@/components/inmobiliaria/naira/InventarioDelDia'
import { ItemDelBriefing } from '@/components/inmobiliaria/naira/ItemDelBriefing'
import { NairaApagada } from '@/components/inmobiliaria/naira/NairaApagada'
import type { OrigenDeLosDatos } from '@/components/inmobiliaria/naira/OrigenDeNaira'
import { PreguntaSemanal } from '@/components/inmobiliaria/naira/PreguntaSemanal'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { SECCIONES_DEL_BRIEFING, type NairaBriefingDay, type NairaBriefingDelivery } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'
import {
  elegirEntrega,
  esLunes,
  formatearDia,
  itemsDeLaSeccion,
  loQueTraeElDia,
  sumarDias,
} from '@/lib/naira/briefing-y-senal'
import { formatearCorte } from '@/lib/naira/formato'
import { ANCLA_DEL_RECALL, rutaDeLaSenal, rutaDelBriefing } from '@/lib/nav/rutas-de-naira'

export interface BriefingViewProps {
  readonly briefing: NairaBriefingDay
  readonly origen: OrigenDeLosDatos
  /** El día de hoy en Bogotá (YYYY-MM-DD). */
  readonly hoy: string
  readonly ahora: Date
  /** El Client tiene la acción `signal-feedback`. */
  readonly puedeVotar: boolean
  /** El Client tiene la acción `recall-answer`. */
  readonly puedeResponderRecall: boolean
}

const CLAVE_DE_LA_SECCION = {
  atencion: 'inmobiliaria.ai.naira.briefing.secciones.atencion',
  informativo: 'inmobiliaria.ai.naira.briefing.secciones.informativo',
  estado: 'inmobiliaria.ai.naira.briefing.secciones.estado',
  semanal: 'inmobiliaria.ai.naira.briefing.secciones.semanal',
  seguimiento: 'inmobiliaria.ai.naira.briefing.secciones.seguimiento',
} as const satisfies Record<(typeof SECCIONES_DEL_BRIEFING)[number], string>

/** Escritorio desde `lg` (SSR-safe: arranca en falso y lo decide un efecto; molde de src/hooks/use-mobile.ts). */
function useEsEscritorio(): boolean {
  const [esEscritorio, setEsEscritorio] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const consulta = window.matchMedia('(min-width: 1024px)')
    const actualizar = () => setEsEscritorio(consulta.matches)
    actualizar()
    consulta.addEventListener('change', actualizar)
    return () => consulta.removeEventListener('change', actualizar)
  }, [])
  return esEscritorio
}

export function BriefingView({ briefing, origen, hoy, ahora, puedeVotar, puedeResponderRecall }: BriefingViewProps): JSX.Element {
  const { t } = useI18n()
  const idBase = useId()
  const esEscritorio = useEsEscritorio()
  const [inventarioAbierto, setInventarioAbierto] = useState(false)
  const { inventario, madurez, arranque } = loQueTraeElDia(briefing)
  const resultado = briefing.resultado
  const elegida = resultado.kind === 'entregado' ? elegirEntrega(resultado.entregas) : null

  const titulo =
    briefing.dia === hoy
      ? t('inmobiliaria.ai.naira.briefing.tituloHoy')
      : t('inmobiliaria.ai.naira.briefing.tituloDelDia', { fecha: formatearDia(briefing.dia) })

  function bajada(): string | null {
    if (elegida === null || elegida.kind !== 'briefing') return null
    if (origen === 'ejemplo') return t('inmobiliaria.ai.naira.briefing.bajadaEjemplo')
    const corte = formatearCorte(elegida.entrega.congeladaEn, ahora)
    return corte === null ? null : t('inmobiliaria.ai.naira.briefing.bajada', { momento: corte.absoluto })
  }
  const textoDeLaBajada = bajada()

  function seccion(clave: (typeof SECCIONES_DEL_BRIEFING)[number], contenido: JSX.Element | JSX.Element[]): JSX.Element {
    const id = idBase + '-' + clave
    return (
      <section key={clave} data-naira-seccion={clave} aria-labelledby={id} className="space-y-3">
        <h2 id={id} className="text-overline text-fg-muted">
          {t(CLAVE_DE_LA_SECCION[clave])}
        </h2>
        {contenido}
      </section>
    )
  }

  function items(entrega: NairaBriefingDelivery, clave: (typeof SECCIONES_DEL_BRIEFING)[number]): JSX.Element[] {
    return itemsDeLaSeccion(entrega.items, clave).map((it) => (
      <ItemDelBriefing
        key={it.clave + ':' + it.posicion}
        item={it}
        hrefDeLaSenal={it.promocion.kind === 'promovida' ? rutaDeLaSenal(it.promocion.promocionId) : null}
        puedeVotar={puedeVotar}
      />
    ))
  }

  function delBriefing(entrega: NairaBriefingDelivery): JSX.Element {
    const atencion = itemsDeLaSeccion(entrega.items, 'atencion')
    const atencionVacia = atencion.length === 0
    const otras = SECCIONES_DEL_BRIEFING.filter((s) => s !== 'atencion' && itemsDeLaSeccion(entrega.items, s).length > 0)
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {seccion(
            'atencion',
            atencionVacia ? <InventarioDelDia inventario={inventario} madurez={madurez} enSilencio /> : items(entrega, 'atencion'),
          )}
          {otras.map((s) => seccion(s, items(entrega, s)))}
          {esLunes(briefing.dia) && puedeResponderRecall ? (
            <PreguntaSemanal semana={briefing.dia} ancla={ANCLA_DEL_RECALL} />
          ) : null}
        </div>
        {!atencionVacia ? (
          <aside className="min-w-0 lg:col-span-1">
            {esEscritorio ? (
              <InventarioDelDia inventario={inventario} madurez={madurez} enSilencio={false} />
            ) : (
              <Collapsible open={inventarioAbierto} onOpenChange={setInventarioAbierto} className="space-y-3">
                <CollapsibleTrigger className="gap-2 text-fg">
                  {t('inmobiliaria.ai.naira.inventario.abrir')}
                  <CaretDown className="h-4 w-4" aria-hidden="true" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <InventarioDelDia inventario={inventario} madurez={madurez} enSilencio={false} />
                </CollapsibleContent>
              </Collapsible>
            )}
          </aside>
        ) : null}
      </div>
    )
  }

  function sinEntrega(razon: Extract<NairaBriefingDay['resultado'], { kind: 'sin_entrega' }>['razon']): JSX.Element {
    switch (razon) {
      case 'briefing_apagado':
        return <NairaApagada />
      case 'antes_del_corte':
        return (
          <div className="space-y-3">
            <p className="text-sm text-fg">{t('inmobiliaria.ai.naira.briefing.sinEntrega.antes_del_corte')}</p>
            <Button asChild variant="outline" size="sm">
              <Link href={rutaDelBriefing(sumarDias(briefing.dia, -1))}>{t('inmobiliaria.ai.naira.briefing.verElDeAyer')}</Link>
            </Button>
          </div>
        )
      case 'sin_entregas_del_tenant':
        return <p className="text-sm text-fg">{t('inmobiliaria.ai.naira.briefing.sinEntrega.sin_entregas_del_tenant')}</p>
      case 'sin_entrega_para_el_llamador':
        return <p className="text-sm text-fg">{t('inmobiliaria.ai.naira.briefing.sinEntrega.sin_entrega_para_el_llamador')}</p>
      default: {
        const _exhaustivo: never = razon
        return _exhaustivo
      }
    }
  }

  function cuerpo(): JSX.Element {
    switch (resultado.kind) {
      case 'sin_entrega':
        return sinEntrega(resultado.razon)
      case 'entregado':
        return (
          <div className="space-y-6">
            {arranque.kind === 'sin_go_live' ? (
              <div role="status" className="flex items-start gap-2 rounded-lg bg-surface-muted p-4 text-sm text-fg">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                <p>{t('inmobiliaria.ai.naira.briefing.arranqueSinGoLive')}</p>
              </div>
            ) : null}
            {resultado.ocultosPorRol > 0 ? (
              <p role="status" className="text-sm text-fg-muted">
                {t('inmobiliaria.ai.naira.briefing.ocultosPorRol')}
              </p>
            ) : null}
            {elegida !== null && elegida.kind === 'briefing' ? (
              <>
                {elegida.tambienPorWhatsapp ? (
                  <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.briefing.tambienPorWhatsapp')}</p>
                ) : null}
                {delBriefing(elegida.entrega)}
              </>
            ) : null}
            {elegida !== null && elegida.kind === 'solo_aviso' ? (
              <p className="text-sm text-fg">{t('inmobiliaria.ai.naira.briefing.avisoDeSuspension')}</p>
            ) : null}
            {elegida !== null && elegida.kind === 'ninguna' ? (
              <p className="text-sm text-fg">{t('inmobiliaria.ai.naira.briefing.sinEntrega.sin_entregas_del_tenant')}</p>
            ) : null}
          </div>
        )
      default: {
        const _exhaustivo: never = resultado
        return _exhaustivo
      }
    }
  }

  const anterior = rutaDelBriefing(sumarDias(briefing.dia, -1))
  const siguiente = briefing.dia < hoy ? rutaDelBriefing(sumarDias(briefing.dia, 1)) : null

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">{titulo}</h1>
          <nav aria-label={t('inmobiliaria.ai.naira.briefing.navegacion')} className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={anterior}>{t('inmobiliaria.ai.naira.briefing.diaAnterior')}</Link>
            </Button>
            <time dateTime={briefing.dia} data-naira-dia="" className="font-mono text-sm tabular-nums">
              {formatearDia(briefing.dia)}
            </time>
            {siguiente !== null ? (
              <Button asChild variant="outline" size="sm">
                <Link href={siguiente}>{t('inmobiliaria.ai.naira.briefing.diaSiguiente')}</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                {t('inmobiliaria.ai.naira.briefing.diaSiguiente')}
              </Button>
            )}
          </nav>
        </div>
        {textoDeLaBajada !== null ? <p className="text-sm leading-5 text-fg-muted">{textoDeLaBajada}</p> : null}
      </header>
      {cuerpo()}
    </div>
  )
}
