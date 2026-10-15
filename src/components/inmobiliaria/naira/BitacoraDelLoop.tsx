'use client'

/**
 * BitacoraDelLoop.tsx — la bitácora de UN loop de Naira tal como la ordena el servidor (Fase 13, plan 13-04; UI-SPEC §7.4).
 *
 * Cabecera: la métrica, el estado (si el loop se cerró, «Cerrado» con cuándo y su desenlace; si sigue abierto, el estado del
 * ÚLTIMO evento del arreglo, P10), el dueño SOLO como rol y, si cambió desde que nació, la reasignación dicha UNA vez y
 * solo entre roles; si nadie tiene el rol, la banda; si se avisó; cuándo se abrió; y el enlace a la señal si la página lo da.
 *
 * Eventos: uno por renglón, en el orden del servidor (nada se reordena), con su día, qué pasó, el estado, la forma y la
 * verificación dicha por su `kind`. No existe un actor en el contrato: no hay «quién cerró» ni un botón de cerrar o
 * reabrir (B-5, D13-11).
 *
 * Lo que NO se pinta (P9): la razón del dueño, el cambio de dueño por evento (y su razón libre), la memoria y el interior de
 * la verificación (nodos opacos), el corte y la hora de registro de cada evento (la fecha del evento es su DÍA) y los
 * conteos de Naira (ciclos, confirmaciones, racha). No conoce rutas: el `href` lo arma la página (D13-1).
 */

import type { JSX } from 'react'
import { useId } from 'react'
import Link from 'next/link'
import { Warning } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import type { NairaOpenLoopDetail } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'
import {
  CLAVE_DE_LA_FORMA_DEL_LOOP,
  CLAVE_DE_LA_VERIFICACION_DEL_EVENTO,
  CLAVE_DEL_DESENLACE_DEL_LOOP,
  CLAVE_DEL_ESTADO_DEL_LOOP,
  CLAVE_DEL_EVENTO_DEL_LOOP,
  CLAVE_DEL_ROL,
  fechaLegible,
  tituloDeLaMetrica,
} from '@/lib/naira/vocabulario-de-seguimiento'

import { LineaConFecha } from './FilaDeSeguimiento'

export interface BitacoraDelLoopProps {
  readonly detalle: NairaOpenLoopDetail
  /** `null` ⇒ sin «Ver la señal». */
  readonly hrefDeLaSenal: string | null
}

export function BitacoraDelLoop({ detalle, hrefDeLaSenal }: BitacoraDelLoopProps): JSX.Element {
  const { t } = useI18n()
  const id = useId()
  const loop = detalle.loop
  const rolActual = t(CLAVE_DEL_ROL[loop.owner])
  const ultimo = detalle.eventos.length > 0 ? detalle.eventos[detalle.eventos.length - 1] : null

  return (
    <section aria-labelledby={id} className="space-y-6">
      <div className="space-y-3 rounded-lg border border-border bg-surface p-4 md:p-6">
        <h2 id={id} className="text-base font-semibold text-fg">
          {tituloDeLaMetrica(loop.metricId) ?? t('inmobiliaria.ai.naira.seguimiento.metricaSinNombre')}
        </h2>
        {loop.cierre.kind === 'cerrado' ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-fg">
            <Badge variant="secondary">{t(CLAVE_DEL_ESTADO_DEL_LOOP.cerrado)}</Badge>
            <LineaConFecha
              clave="inmobiliaria.ai.naira.bitacora.cerradoEl"
              valor={loop.cierre.en}
              params={{ desenlace: t(CLAVE_DEL_DESENLACE_DEL_LOOP[loop.cierre.desenlace]) }}
            />
          </div>
        ) : ultimo !== null ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{t(CLAVE_DEL_ESTADO_DEL_LOOP[ultimo.seguimiento.estado])}</Badge>
          </div>
        ) : null}
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <p className="text-fg">{t('inmobiliaria.ai.naira.seguimiento.rol', { rol: rolActual })}</p>
          {loop.ownerAlNacer !== loop.owner ? (
            <p className="text-fg">
              {t('inmobiliaria.ai.naira.bitacora.reasignado', { antes: t(CLAVE_DEL_ROL[loop.ownerAlNacer]), ahora: rolActual })}
            </p>
          ) : null}
          {loop.huerfanoDeRol ? (
            <p data-naira-huerfano="" className="flex items-start gap-2 text-fg">
              <Warning weight="fill" className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <span>{t('inmobiliaria.ai.naira.seguimiento.huerfanoDeRol')}</span>
            </p>
          ) : null}
          <p className="text-fg-muted">
            {loop.comunicacion.kind === 'comunicado' ? (
              <LineaConFecha clave="inmobiliaria.ai.naira.seguimiento.comunicado" valor={loop.comunicacion.primerDia} />
            ) : (
              t('inmobiliaria.ai.naira.seguimiento.sinComunicar')
            )}
          </p>
          <p className="text-fg-muted">
            <LineaConFecha clave="inmobiliaria.ai.naira.bitacora.abiertoEl" valor={loop.abiertoEn} />
          </p>
        </div>
        {hrefDeLaSenal !== null ? (
          <Link href={hrefDeLaSenal} className="text-sm text-fg-muted underline underline-offset-2 hover:text-primary">
            {t('inmobiliaria.ai.naira.seguimiento.verLaSenal')}
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold text-fg">{t('inmobiliaria.ai.naira.bitacora.eventosTitulo')}</h3>
        {detalle.eventos.length === 0 ? (
          <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.bitacora.sinEventos')}</p>
        ) : (
          <ol data-naira-bitacora="" className="space-y-2">
            {detalle.eventos.map((e, i) => {
              const dia = e.seguimiento.ultimoDiaVerificado
              const diaLegible = fechaLegible(dia)
              const forma = e.cambioDeForma.kind === 'cambio' ? e.cambioDeForma.a : e.seguimiento.forma
              return (
                <li key={`${i}-${e.tipo}`} data-naira-evento={e.tipo} className="text-sm text-fg">
                  {diaLegible !== null ? (
                    <time dateTime={dia}>{diaLegible}</time>
                  ) : (
                    <span>{t('inmobiliaria.ai.naira.seguimiento.fechaIlegible')}</span>
                  )}
                  {' · '}
                  {t(CLAVE_DEL_EVENTO_DEL_LOOP[e.tipo], { forma: t(CLAVE_DE_LA_FORMA_DEL_LOOP[forma]) })}
                  {' · '}
                  {t(CLAVE_DEL_ESTADO_DEL_LOOP[e.seguimiento.estado])}
                  {' · '}
                  {t(CLAVE_DE_LA_FORMA_DEL_LOOP[e.seguimiento.forma])}
                  {' · '}
                  {t(CLAVE_DE_LA_VERIFICACION_DEL_EVENTO[e.verificacion.kind])}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
