'use client'

/**
 * LatenciaDeAprobacion — «Cuánto tarda el equipo en decidir», en Aprobaciones, solo para el dueño (#32, Nico 15-10-2026:
 * «la latencia de aprobación la ven Leasefy y el dueño»).
 *
 * El agente manda `latencia` SOLO al OWNER (a los demás, null: esta tarjeta no se monta). Por tipo de acción y semana de
 * la decisión: la mediana desde que alguien abrió la propuesta hasta que la decidió, y cuántas decisiones la sostienen.
 * Sin número cuando hay muy pocas, cuando se decidió sin abrir el detalle o cuando una sola persona puede aprobar ese
 * tipo (el número la delataría, B-5). Nunca dice quién decidió.
 */
import type { JSX } from 'react'

import type { NairaActionsList } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'
import { CLAVE_DEL_TIPO_DE_ACCION } from '@/lib/naira/vocabulario-de-aprobaciones'

type Latencia = NonNullable<NairaActionsList['latencia']>
type Reporte = Latencia['porTipo'][number]['reporte']

/** 2.750 ms → «3 s»; 165.000 → «2 min 45 s»; 3.900.000 → «1 h 5 min». */
export function duracionLegible(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s} s`
  const min = Math.floor(s / 60)
  if (min < 60) return s % 60 === 0 ? `${min} min` : `${min} min ${s % 60} s`
  const h = Math.floor(min / 60)
  return min % 60 === 0 ? `${h} h` : `${h} h ${min % 60} min`
}

/** «2026-W41» → el lunes de esa semana ISO como «5 de oct.» (UTC: Colombia no tiene horario de verano). */
export function lunesDeLaSemana(semanaIso: string, locale: string): string | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(semanaIso)
  if (!m) return null
  const anio = Number(m[1])
  const semana = Number(m[2])
  const cuatroDeEnero = new Date(Date.UTC(anio, 0, 4))
  const diaIso = cuatroDeEnero.getUTCDay() || 7
  const lunes = new Date(cuatroDeEnero.getTime() + ((semana - 1) * 7 - (diaIso - 1)) * 86_400_000)
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(lunes)
}

export function LatenciaDeAprobacion({ latencia }: { readonly latencia: Latencia }): JSX.Element {
  const { t, locale } = useI18n()
  const texto = (r: Reporte): string => {
    switch (r.kind) {
      case 'medida':
        return t('inmobiliaria.ai.naira.latencia.medida', { duracion: duracionLegible(r.medianaMs), n: r.n })
      case 'no_medible':
        return r.razon === 'n_bajo_minimo' ? t('inmobiliaria.ai.naira.latencia.pocas') : t('inmobiliaria.ai.naira.latencia.sinAbrir')
      case 'no_reportable_a_la_agencia':
        return t('inmobiliaria.ai.naira.latencia.unAprobador')
    }
  }
  return (
    <section className="space-y-3 rounded-lg border border-border bg-bg-elevated p-4" data-testid="naira-latencia-de-aprobacion">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-fg">{t('inmobiliaria.ai.naira.latencia.titulo')}</h2>
        <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.latencia.queEs')}</p>
      </div>
      {latencia.porTipo.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.latencia.sinDecisiones')}</p>
      ) : (
        <ul className="divide-y divide-border">
          {latencia.porTipo.map((x) => (
            <li key={`${x.tipo}|${x.semanaIso}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
              <span className="text-fg">
                {t(CLAVE_DEL_TIPO_DE_ACCION[x.tipo])}
                <span className="text-fg-muted"> · {t('inmobiliaria.ai.naira.latencia.semanaDel', { dia: lunesDeLaSemana(x.semanaIso, locale) ?? x.semanaIso })}</span>
              </span>
              <span className={x.reporte.kind === 'medida' ? 'font-medium text-fg' : 'text-fg-muted'}>{texto(x.reporte)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
