'use client'

/**
 * SenalView — lo CONGELADO de una señal de Naira: lo que se envió ese día, sin recalcular nada «de ahora» (Fase 13,
 * plan 13-03; UI-SPEC §7.2, UI-01, UI-02, P4, P5, P12).
 *
 * · La cifra, por `CifraDeNaira` (valor + corte + camino a la fuente; si el agente trajo el valor escrito, ése).
 * · La causa: una causa citada entra por las citas CON su clase (E13-3, D13-23) o, si no vinieron, sin clase; una cita
 *   sin clase se oculta y se declara (D13-10). Una causa no citable se dice por su razón.
 * · Las entidades afectadas: la sección está SIEMPRE (UI-01), con las que trae el ítem (E13-2). Hoy toda señal viaja
 *   agregada (10-CONTEXT.md:58) y lo dice; una lista se pinta por tipo e id en mono, sin enlace por entidad (no hay un
 *   mapa de tipo a ficha, D13-7) y sin decir cuántas hay de más (U5). Nunca el nombre de una persona (B-5).
 * · La ranura `lineaDeSeguimiento` es de 13-04 (la línea «Seguimiento: …» con su lectura secundaria).
 */

import type { JSX } from 'react'
import type { ReactNode } from 'react'
import { useId } from 'react'

import { BloqueDeCategoria } from '@/components/inmobiliaria/naira/BloqueDeCategoria'
import { BotonesDeUtilidad } from '@/components/inmobiliaria/naira/BotonesDeUtilidad'
import { CifraDeNaira } from '@/components/inmobiliaria/naira/CifraDeNaira'
import { EnlaceALaFuente } from '@/components/inmobiliaria/naira/EnlaceALaFuente'
import { EtiquetaDeUrgencia } from '@/components/inmobiliaria/naira/ItemDelBriefing'
import { OracionesCausales } from '@/components/inmobiliaria/naira/OracionesCausales'
import type { OrigenDeLosDatos } from '@/components/inmobiliaria/naira/OrigenDeNaira'
import type { NairaSignalDetail, RAZONES_DE_CAUSA_NO_CITABLE } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'
import {
  TOPE_DE_ENTIDADES_VISIBLES,
  citasSinClase,
  entidadesDeLaSenal,
  type EntidadesDeLaSenal,
} from '@/lib/naira/briefing-y-senal'
import { formatearCorte } from '@/lib/naira/formato'

export interface SenalViewProps {
  readonly detalle: NairaSignalDetail
  readonly origen: OrigenDeLosDatos
  /** El Client tiene la acción `signal-feedback`. */
  readonly puedeVotar: boolean
  readonly ahora: Date
  /** 13-04: la línea «Seguimiento: <estado> → Ver la bitácora», con su propia lectura. */
  readonly lineaDeSeguimiento?: ReactNode
}

const CLAVE_DE_CAUSA_NO_CITABLE = {
  sin_investigacion_al_congelar: 'inmobiliaria.ai.naira.senal.causaNoCitable.sin_investigacion_al_congelar',
  fila_ilegible: 'inmobiliaria.ai.naira.senal.causaNoCitable.fila_ilegible',
  no_visible_para_el_rol: 'inmobiliaria.ai.naira.senal.causaNoCitable.no_visible_para_el_rol',
  con_datos_de_terceros: 'inmobiliaria.ai.naira.senal.causaNoCitable.con_datos_de_terceros',
  sin_explicacion: 'inmobiliaria.ai.naira.senal.causaNoCitable.sin_explicacion',
} as const satisfies Record<(typeof RAZONES_DE_CAUSA_NO_CITABLE)[number], string>

/** Las entidades afectadas de la señal: SIEMPRE visible. */
export function SeccionDeEntidades({
  entidades,
  metricId,
}: {
  readonly entidades: EntidadesDeLaSenal
  readonly metricId: string
}): JSX.Element {
  const { t } = useI18n()
  const id = useId()

  function contenido(): JSX.Element {
    switch (entidades.kind) {
      case 'agregada':
        return (
          <div className="space-y-2">
            <p className="text-sm text-fg">{t('inmobiliaria.ai.naira.senal.entidades.agregada')}</p>
            <EnlaceALaFuente de={{ kind: 'metrica', metricId }} />
          </div>
        )
      case 'lista': {
        const visibles = entidades.items.slice(0, TOPE_DE_ENTIDADES_VISIBLES)
        const hayMas = entidades.items.length > TOPE_DE_ENTIDADES_VISIBLES
        return (
          <div className="space-y-2">
            <ul className="space-y-1">
              {visibles.map((e) => (
                <li key={e.tipo + ':' + e.id} className="font-mono text-caption text-fg">
                  {e.tipo + ' · ' + e.id}
                </li>
              ))}
            </ul>
            {hayMas ? (
              <div className="space-y-2">
                <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.senal.entidades.masEnLaFuente')}</p>
                <EnlaceALaFuente de={{ kind: 'metrica', metricId }} />
              </div>
            ) : null}
          </div>
        )
      }
      default: {
        const _exhaustivo: never = entidades
        return _exhaustivo
      }
    }
  }

  return (
    <section
      aria-labelledby={id}
      data-naira-entidades={entidades.kind}
      className="space-y-2 rounded-lg border border-border bg-surface p-4 md:p-6"
    >
      <p id={id} className="text-overline text-fg-muted">
        {t('inmobiliaria.ai.naira.senal.entidades.titulo')}
      </p>
      {contenido()}
    </section>
  )
}

export function SenalView({ detalle, origen, puedeVotar, ahora, lineaDeSeguimiento }: SenalViewProps): JSX.Element {
  const { t } = useI18n()
  const idTitulo = useId()
  const entidades = entidadesDeLaSenal(detalle)
  const causa = detalle.causa

  function bajada(): string | null {
    if (origen === 'ejemplo') return t('inmobiliaria.ai.naira.senal.congeladaEjemplo')
    const corte = formatearCorte(detalle.congeladaEn, ahora)
    return corte === null ? null : t('inmobiliaria.ai.naira.senal.congelada', { momento: corte.absoluto })
  }
  const textoDeLaBajada = bajada()

  function laCausa(): JSX.Element | null {
    switch (causa.kind) {
      case 'citada':
        return (
          <BloqueDeCategoria origen={{ kind: 'seccion', seccion: 'INFERENCE' }}>
            <OracionesCausales oraciones={causa.citasConClase ?? citasSinClase(causa.citas)} />
          </BloqueDeCategoria>
        )
      case 'no_citable':
        return (
          <BloqueDeCategoria
            origen={{ kind: 'seccion', seccion: 'INFERENCE' }}
            razonDeVacio={t(CLAVE_DE_CAUSA_NO_CITABLE[causa.razon])}
          />
        )
      case 'investigacion_no_disponible':
        return (
          <BloqueDeCategoria
            origen={{ kind: 'seccion', seccion: 'INFERENCE' }}
            razonDeVacio={t('inmobiliaria.ai.naira.senal.causaNoDisponible')}
          />
        )
      default: {
        const _exhaustivo: never = causa
        return _exhaustivo
      }
    }
  }

  return (
    <article aria-labelledby={idTitulo} className="max-w-3xl space-y-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 id={idTitulo} className="text-2xl font-semibold leading-tight tracking-tight">
            {detalle.item.titulo}
          </h1>
          <EtiquetaDeUrgencia urgencyClass={detalle.item.urgencyClass} />
        </div>
        {textoDeLaBajada !== null ? <p className="text-sm leading-5 text-fg-muted">{textoDeLaBajada}</p> : null}
      </header>
      <BloqueDeCategoria origen={{ kind: 'seccion', seccion: 'LIVE_DATA' }}>
        <CifraDeNaira
          valor={detalle.item.valor}
          unidad={detalle.item.unidad}
          asOf={detalle.item.asOf}
          de={{ kind: 'metrica', metricId: detalle.item.metricId }}
          referenciaTecnica={detalle.item.fuente}
          valorRenderizado={detalle.item.valorRenderizado}
        />
      </BloqueDeCategoria>
      {laCausa()}
      <SeccionDeEntidades entidades={entidades} metricId={detalle.item.metricId} />
      {puedeVotar ? (
        <BotonesDeUtilidad
          promocionId={detalle.promocionId}
          origenDelVoto={{ kind: 'item_del_briefing', seccion: detalle.item.seccion }}
        />
      ) : null}
      {lineaDeSeguimiento ?? null}
    </article>
  )
}
