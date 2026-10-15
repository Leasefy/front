'use client'

/**
 * InventarioDelDia — qué revisó Naira hoy o, si no se sabe, decirlo (Fase 13, plan 13-03; INV-06, UI-SPEC §7.1 y §6.6).
 *
 * La regla dura vive en `mensajeDelSilencio` (src/lib/naira/briefing-y-senal.ts) y este componente la pinta: una
 * atención vacía sin inventario NO se afirma como un día tranquilo (un silencio sin inventario es indistinguible de una
 * supresión). Con inventario, la frase de silencio va acompañada de qué corrió, con qué corte, qué se descartó y qué no
 * se investigó.
 *
 * Los conteos no se dicen con numerales (U5): se nombra cada cosa. Las compuertas y las métricas van por su id en mono:
 * sus nombres legibles viven en el agente y el front no tiene ese mapa (declarado, 13-02 P18 / E13-13).
 *
 * Todo lo del espejo de E13-5 (la rama `registrado` y las líneas de madurez) se ve solo cuando `loQueTraeElDia` lo
 * traiga; hoy la ruta no lo envía y se dice.
 */

import type { JSX } from 'react'
import { useId } from 'react'

import { useI18n } from '@/lib/i18n'
import {
  mensajeDelSilencio,
  type CLASES_DEL_DIA,
  type ESTADOS_DEL_DETECTOR,
  type InventarioDelBriefing,
  type MadurezDelBriefing,
  type MOTIVOS_SIN_INVESTIGACION,
} from '@/lib/naira/briefing-y-senal'

import { LineaDeMadurez } from './LineaDeMadurez'
import { MarcaDeCorte } from './MarcaDeCorte'

export interface InventarioDelDiaProps {
  readonly inventario: InventarioDelBriefing
  readonly madurez: MadurezDelBriefing
  /** La atención del día está vacía: el inventario sube al bloque de atención y dice el silencio. */
  readonly enSilencio: boolean
}

function claveDeLaClase(clase: (typeof CLASES_DEL_DIA)[number]): string {
  switch (clase) {
    case 'con_senales':
      return 'inmobiliaria.ai.naira.inventario.clase.con_senales'
    case 'silencio':
      return 'inmobiliaria.ai.naira.inventario.clase.silencio'
    case 'sin_evaluacion':
      return 'inmobiliaria.ai.naira.inventario.clase.sin_evaluacion'
    default: {
      const _exhaustivo: never = clase
      return _exhaustivo
    }
  }
}

function claveDelEstado(estado: (typeof ESTADOS_DEL_DETECTOR)[number]): string {
  switch (estado) {
    case 'ok':
      return 'inmobiliaria.ai.naira.inventario.estadoDelDetector.ok'
    case 'skipped_stale':
      return 'inmobiliaria.ai.naira.inventario.estadoDelDetector.skipped_stale'
    case 'failed':
      return 'inmobiliaria.ai.naira.inventario.estadoDelDetector.failed'
    default: {
      const _exhaustivo: never = estado
      return _exhaustivo
    }
  }
}

function claveDelMotivo(motivo: (typeof MOTIVOS_SIN_INVESTIGACION)[number]): string {
  switch (motivo) {
    case 'no_promovida':
      return 'inmobiliaria.ai.naira.inventario.motivo.no_promovida'
    case 'no_disponible_hoy':
      return 'inmobiliaria.ai.naira.inventario.motivo.no_disponible_hoy'
    case 'sin_explicacion_completa':
      return 'inmobiliaria.ai.naira.inventario.motivo.sin_explicacion_completa'
    case 'fila_ilegible':
      return 'inmobiliaria.ai.naira.inventario.motivo.fila_ilegible'
    default: {
      const _exhaustivo: never = motivo
      return _exhaustivo
    }
  }
}

export function InventarioDelDia({ inventario, madurez, enSilencio }: InventarioDelDiaProps): JSX.Element {
  const { t } = useI18n()
  const idDetectores = useId()
  const idFuentes = useId()
  const idCompuertas = useId()
  const idInvestigacion = useId()
  const idMadurez = useId()
  const mensaje = enSilencio ? mensajeDelSilencio(true, inventario) : null
  const lineas = madurez.kind === 'lineas' ? madurez.lineas : []

  return (
    <div data-naira-inventario={inventario.kind} className="space-y-3 rounded-lg bg-surface-muted p-4 text-sm text-fg">
      {!enSilencio ? <h2 className="text-base font-semibold text-fg">{t('inmobiliaria.ai.naira.inventario.titulo')}</h2> : null}

      {mensaje === 'silencio_sin_inventario' ? (
        <p role="status" data-naira-silencio="sin-inventario">
          {t('inmobiliaria.ai.naira.briefing.silencioSinInventario')}
        </p>
      ) : null}
      {mensaje === 'frase_de_silencio' ? (
        <p data-naira-silencio="frase">{t('inmobiliaria.ai.naira.briefing.fraseDeSilencio')}</p>
      ) : null}
      {mensaje === 'sin_evaluacion' ? (
        <p data-naira-silencio="sin-evaluacion">{t('inmobiliaria.ai.naira.inventario.clase.sin_evaluacion')}</p>
      ) : null}

      {!enSilencio && inventario.kind === 'no_viaja' ? (
        <p className="text-fg-muted">{t('inmobiliaria.ai.naira.inventario.noViaja')}</p>
      ) : null}
      {!enSilencio && inventario.kind === 'sin_registro' ? (
        <p className="text-fg-muted">{t('inmobiliaria.ai.naira.inventario.sinRegistro')}</p>
      ) : null}

      {inventario.kind === 'registrado' ? (
        <>
          {!enSilencio ? <p>{t(claveDeLaClase(inventario.clase))}</p> : null}

          {inventario.detectores.length > 0 ? (
            <section aria-labelledby={idDetectores} className="space-y-1">
              <h3 id={idDetectores} className="text-overline text-fg-muted">
                {t('inmobiliaria.ai.naira.inventario.detectores')}
              </h3>
              <ul className="space-y-1">
                {inventario.detectores.map((d) => (
                  <li key={d.detectorId + ':' + d.metricId}>
                    <span className="font-mono text-caption">{d.metricId}</span>
                    {' · '}
                    <span>{t(claveDelEstado(d.estado))}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {inventario.fuentes.length > 0 ? (
            <section aria-labelledby={idFuentes} className="space-y-1">
              <h3 id={idFuentes} className="text-overline text-fg-muted">
                {t('inmobiliaria.ai.naira.inventario.fuentes')}
              </h3>
              <ul className="space-y-1">
                {inventario.fuentes.map((f) => (
                  <li key={f.fuente} className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-caption">{f.etiqueta}</span>
                    {f.asOf.kind === 'observada' ? (
                      <MarcaDeCorte asOf={f.asOf.iso} />
                    ) : (
                      <span className="text-fg-muted">{t('inmobiliaria.ai.naira.inventario.nuncaObservada')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {inventario.compuertasConDescarte.length > 0 ? (
            <section aria-labelledby={idCompuertas} className="space-y-1">
              <h3 id={idCompuertas} className="text-overline text-fg-muted">
                {t('inmobiliaria.ai.naira.inventario.compuertas')}
              </h3>
              <ul className="space-y-1">
                {inventario.compuertasConDescarte.map((c) => (
                  <li key={c} className="font-mono text-caption">
                    {c}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {inventario.investigacion.length > 0 ? (
            <section aria-labelledby={idInvestigacion} className="space-y-1">
              <h3 id={idInvestigacion} className="text-overline text-fg-muted">
                {t('inmobiliaria.ai.naira.inventario.investigacion')}
              </h3>
              <ul className="space-y-1">
                {inventario.investigacion.map((s) => (
                  <li key={s.metricId + ':' + s.motivo}>
                    <span className="font-mono text-caption">{s.metricId}</span>
                    {' · '}
                    <span>{t(claveDelMotivo(s.motivo))}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      {lineas.length > 0 ? (
        <section aria-labelledby={idMadurez} className="space-y-1">
          <h3 id={idMadurez} className="text-overline text-fg-muted">
            {t('inmobiliaria.ai.naira.inventario.madurez')}
          </h3>
          <ul className="space-y-1">
            {lineas.map((l) => (
              <li key={l.metricId}>
                <LineaDeMadurez linea={l} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
