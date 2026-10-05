'use client'

/**
 * PilotoDirectorSemana — el informe de la semana a la gerencia (#59,
 * 04-10-2026), la tercera pestaña de la tarjeta del director.
 *
 * Lo mismo que el lunes llega en el correo de las 07:00: lo que hizo el Piloto
 * en 7 días (solo, con tu clic, lo que espera), lo del director (sus planes y
 * sus órdenes), cómo van las metas y el gasto de IA del mes, EN PESOS. Las
 * frases las arma el micro; aquí se leen y se acompañan de cuatro cifras.
 *
 * Estados: cargando (esqueleto con su porqué), falló (`FalloDeCarga`), 404 (no
 * se pinta), `encendido:false` (la frase del director apagado).
 */

import { CheckCircle, WarningCircle } from '@phosphor-icons/react'

import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { useI18n } from '@/lib/i18n'
import { formatCurrency } from '@/lib/format'
import type { DirectorSemana } from '@/lib/api/piloto-director'
import { useDirectorSemana, type LecturaDelDirector } from '@/lib/hooks/piloto/use-piloto-director'
import { fechaLarga } from '@/lib/piloto/director'

function Cifra({ valor, etiqueta, testid }: { valor: string; etiqueta: string; testid: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2" data-testid={testid}>
      <p className="font-mono text-h4 tabular-nums text-fg">{valor}</p>
      <p className="text-caption text-fg-muted">{etiqueta}</p>
    </div>
  )
}

export function PilotoDirectorSemana({ lectura }: { lectura: LecturaDelDirector<DirectorSemana> }) {
  const { t, locale } = useI18n()
  const idioma = locale === 'en' ? 'en' : 'es'
  const { data, isLoading, error, notAvailable, refetch } = lectura

  if (isLoading && !data) {
    return (
      <div className="space-y-2" role="status" data-testid="piloto-director-semana-cargando">
        <span className="sr-only">{t('inmobiliaria.piloto.director.semana.cargando')}</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-5 animate-pulse rounded bg-surface-muted" aria-hidden="true" />
        ))}
      </div>
    )
  }
  if (error && !data) {
    return (
      <FalloDeCarga error={error} queEs={t('inmobiliaria.piloto.director.semana.queEsFallo')} onReintentar={refetch} enmarcado={false} />
    )
  }
  if (notAvailable || !data) return null
  if (!data.encendido) {
    return (
      <p className="text-body-sm text-fg-muted" data-testid="piloto-director-semana-apagado">
        {t('inmobiliaria.piloto.director.apagado')}
      </p>
    )
  }

  const desde = fechaLarga(data.desde, idioma)
  const hasta = fechaLarga(data.hasta, idioma)

  return (
    <div className="space-y-4" data-testid="piloto-director-semana">
      <p className="text-caption text-fg-muted">
        {desde && hasta ? t('inmobiliaria.piloto.director.semana.periodo', { desde, hasta }) : t('inmobiliaria.piloto.director.semana.titulo')}
      </p>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {data.piloto && (
          <>
            <Cifra testid="piloto-director-semana-solas" valor={String(data.piloto.hechasSolas)} etiqueta={t('inmobiliaria.piloto.director.semana.hechasSolas')} />
            <Cifra testid="piloto-director-semana-con-clic" valor={String(data.piloto.hechasConClic)} etiqueta={t('inmobiliaria.piloto.director.semana.hechasConClic')} />
            <Cifra testid="piloto-director-semana-esperan" valor={String(data.piloto.esperanClic)} etiqueta={t('inmobiliaria.piloto.director.semana.esperanClic')} />
          </>
        )}
        {data.gasto && (
          <Cifra
            testid="piloto-director-semana-gasto"
            valor={formatCurrency(data.gasto.gastadoCop, idioma)}
            etiqueta={t('inmobiliaria.piloto.director.semana.gasto', { tope: formatCurrency(data.gasto.topeCop, idioma) })}
          />
        )}
      </div>

      <ul className="space-y-2" data-testid="piloto-director-semana-resumen">
        {data.resumen.map((frase, i) => {
          const meta = data.metas.find((m) => m.frase === frase)
          return (
            <li key={i} className="flex items-start gap-2 text-body-sm text-fg">
              {meta && meta.vaBien !== null ? (
                meta.vaBien ? (
                  <CheckCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label={t('inmobiliaria.piloto.director.semana.vaBien')} />
                ) : (
                  <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-label={t('inmobiliaria.piloto.director.semana.vaMal')} />
                )
              ) : (
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-fg-muted" aria-hidden="true" />
              )}
              <span>{frase}</span>
            </li>
          )
        })}
      </ul>
      <p className="text-caption text-fg-subtle">{t('inmobiliaria.piloto.director.semana.enElCorreo')}</p>
    </div>
  )
}

/** La pestaña con su lectura: sólo se monta (y lee) cuando se abre. */
export function PilotoDirectorSemanaConectada() {
  return <PilotoDirectorSemana lectura={useDirectorSemana(true)} />
}
