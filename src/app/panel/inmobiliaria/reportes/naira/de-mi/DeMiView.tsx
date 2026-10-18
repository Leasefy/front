'use client'

/**
 * DeMiView — lo que pinta un `ok` de «Qué dice Naira de mí» (P3, Nico 15-10-2026; concepto B-5 §4).
 *
 * Dos bloques, cada uno con su ventana: lo que la persona hace con Naira (siempre) y su gestión (solo con su autorización;
 * sin ella, se dice que Naira la trata por rol y por equipo). Cifras sueltas de UNA persona, nunca una tabla comparativa.
 */

import type { JSX } from 'react'

import type { NairaPersonSheet } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'
import { fechaLegible } from '@/lib/naira/vocabulario-de-seguimiento'

function Cifra({ etiqueta, valor, nota }: { readonly etiqueta: string; readonly valor: number; readonly nota?: string }): JSX.Element {
  return (
    <div className="space-y-1 rounded-md border border-border bg-bg p-3">
      <p className="text-caption text-fg-muted">{etiqueta}</p>
      <p className="font-mono text-xl font-semibold text-fg">{valor}</p>
      {nota ? <p className="text-caption text-fg-muted">{nota}</p> : null}
    </div>
  )
}

function diaEnBogota(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return fechaLegible(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(fecha)) ?? iso
}

export function DeMiView({ ficha }: { readonly ficha: NairaPersonSheet }): JSX.Element {
  const { t } = useI18n()
  const propia = ficha.persona.esQuienPregunta
  const canal = (c: string): string => (c === 'whatsapp' ? t('inmobiliaria.ai.naira.deMi.canales.whatsapp') : t('inmobiliaria.ai.naira.deMi.canales.email'))
  const n = (conteos: readonly { clave: string; n: number }[], clave: string): number => conteos.find((c) => c.clave === clave)?.n ?? 0
  const briefings = ficha.datos.briefingsPorCanal.reduce((s, c) => s + c.n, 0)
  const g = ficha.gestion

  return (
    <div className="space-y-6" data-testid="naira-ficha">
      {propia ? null : <h2 className="text-lg font-semibold text-fg">{t('inmobiliaria.ai.naira.deMi.tituloDe', { nombre: ficha.persona.nombre })}</h2>}

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-fg">{t('inmobiliaria.ai.naira.deMi.datos.titulo', { dias: ficha.datos.dias })}</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Cifra etiqueta={propia ? t('inmobiliaria.ai.naira.deMi.datos.memoria') : t('inmobiliaria.ai.naira.deMi.datos.memoriaDe')} valor={ficha.datos.memoriaVigente} />
          <Cifra
            etiqueta={t('inmobiliaria.ai.naira.deMi.datos.briefings')}
            valor={briefings}
            nota={ficha.datos.briefingsPorCanal.map((c) => canal(c.clave) + ': ' + c.n).join(' · ') || undefined}
          />
        </div>
        <p className="text-caption text-fg-muted">{t('inmobiliaria.ai.naira.deMi.datos.sinPreguntas')}</p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-fg">{propia ? t('inmobiliaria.ai.naira.deMi.gestion.titulo', { dias: g?.dias ?? 90 }) : t('inmobiliaria.ai.naira.deMi.gestion.tituloDe', { dias: g?.dias ?? 90 })}</h3>
        {g === null ? (
          <p className="text-sm text-fg-muted">{propia ? t('inmobiliaria.ai.naira.deMi.gestion.sinAutorizacion') : t('inmobiliaria.ai.naira.deMi.gestion.sinAutorizacionDe')}</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Cifra
                etiqueta={t('inmobiliaria.ai.naira.deMi.gestion.votos')}
                valor={g.votos.reduce((s, c) => s + c.n, 0)}
                nota={[
                  t('inmobiliaria.ai.naira.utilidad.valorEnMensaje.util') + ': ' + n(g.votos, 'util'),
                  t('inmobiliaria.ai.naira.utilidad.valorEnMensaje.no_util') + ': ' + n(g.votos, 'no_util'),
                  t('inmobiliaria.ai.naira.utilidad.valorEnMensaje.ya_lo_sabia') + ': ' + n(g.votos, 'ya_lo_sabia'),
                ].join(' · ')}
              />
              <Cifra etiqueta={t('inmobiliaria.ai.naira.deMi.gestion.aprobaciones')} valor={g.aprobaciones} />
              <Cifra etiqueta={t('inmobiliaria.ai.naira.deMi.gestion.rechazos')} valor={g.rechazos} />
              <Cifra etiqueta={t('inmobiliaria.ai.naira.deMi.gestion.cancelaciones')} valor={g.cancelaciones} />
              <Cifra
                etiqueta={propia ? t('inmobiliaria.ai.naira.deMi.gestion.escalaciones') : t('inmobiliaria.ai.naira.deMi.gestion.escalacionesDe')}
                valor={g.escalacionesAbiertas}
                nota={g.escalacionesVencidas > 0 ? t('inmobiliaria.ai.naira.deMi.gestion.vencidas', { n: g.escalacionesVencidas }) : undefined}
              />
              <Cifra etiqueta={propia ? t('inmobiliaria.ai.naira.deMi.gestion.acuerdos') : t('inmobiliaria.ai.naira.deMi.gestion.acuerdosDe')} valor={g.acuerdosAprobados} />
            </div>
            {g.motivos.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-fg">{propia ? t('inmobiliaria.ai.naira.deMi.gestion.motivos') : t('inmobiliaria.ai.naira.deMi.gestion.motivosDe')}</p>
                <ul className="space-y-2">
                  {g.motivos.map((m) => (
                    <li key={m.en + m.motivo} className="rounded-md border border-border bg-bg p-3 text-sm text-fg">
                      <span className="text-fg-muted">{diaEnBogota(m.en)} · </span>
                      {m.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </section>

      <p className="text-caption text-fg-muted">{t('inmobiliaria.ai.naira.deMi.corte', { fecha: diaEnBogota(ficha.corte) })}</p>
    </div>
  )
}
