'use client'

// Phase 31 plan 31-10 — Bayesian QA breakdown panel.
// Bayesian shrinkage applied server-side per Phase 25 D-25-17 chokepoint.
// Read-only; parent owns loading/error state of useCallDetail.

import { useI18n } from '@/lib/i18n'
import type { CallQAScores } from '@/lib/hooks/cobranza/use-call-detail'

interface CallQAPanelProps {
  qa: CallQAScores
}

/**
 * Las puntuaciones llegan en escala 0-100: el agente convierte ahí la escala
 * del evaluador (enteros 0-5). Antes se comparaban contra 0,8 / 0,6 —de una
 * escala 0-1 que nunca existió— así que TODA llamada caía en rojo y el
 * porcentaje se calculaba ×100 sobre un número que ya era porcentaje.
 */
function tone(score: number | null): {
  bar: string
  text: string
} {
  if (score == null) {
    return {
      bar: 'bg-surface-muted',
      text: 'text-fg-subtle',
    }
  }
  if (score >= 80) {
    return {
      bar: 'bg-success',
      text: 'text-success',
    }
  }
  if (score >= 60) {
    return {
      bar: 'bg-warning',
      text: 'text-warning',
    }
  }
  return { bar: 'bg-danger', text: 'text-danger' }
}

function ScoreRow({
  label,
  score,
}: {
  label: string
  score: number | null
}) {
  const c = tone(score)
  const pct = score == null ? null : Math.round(score)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-fg-muted">{label}</span>
        <span className={`font-mono font-semibold tabular-nums ${c.text}`}>
          {pct == null ? '—' : `${pct}/100`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? 0}
        aria-label={label}
        className="h-1.5 rounded-full bg-surface-muted overflow-hidden"
      >
        <div
          className={`h-full ${c.bar} transition-all`}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
    </div>
  )
}


/**
 * Etiqueta en el idioma del panel para cada regla de cumplimiento violada.
 * Claves ESTÁTICAS (el tipado de `t` no admite claves dinámicas); un slug
 * desconocido se muestra tal cual — mejor crudo que invisible.
 */
function etiquetaDeViolacion(t: ReturnType<typeof useI18n>['t']) {
  return (slug: string): string => {
    switch (slug) {
      case 'habeas_data_noticed':
        return t('inmobiliaria.ai.cobranza.call.qa.violations.habeas_data_noticed')
      case 'ai_disclosed':
        return t('inmobiliaria.ai.cobranza.call.qa.violations.ai_disclosed')
      case 'consent_to_record':
        return t('inmobiliaria.ai.cobranza.call.qa.violations.consent_to_record')
      case 'schedule_violations_zero':
        return t('inmobiliaria.ai.cobranza.call.qa.violations.schedule_violations_zero')
      case 'frequency_violations_zero':
        return t('inmobiliaria.ai.cobranza.call.qa.violations.frequency_violations_zero')
      case 'opt_out_respected':
        return t('inmobiliaria.ai.cobranza.call.qa.violations.opt_out_respected')
      case 'actor_type_saas_orchestrator':
        return t('inmobiliaria.ai.cobranza.call.qa.violations.actor_type_saas_orchestrator')
      default:
        return slug
    }
  }
}

export default function CallQAPanel({ qa }: CallQAPanelProps) {
  const { t } = useI18n()
  // Las cuatro dimensiones que el evaluador califica de verdad. Antes esto
  // miraba `rapport`/`compliance`/`resolution`/`sentiment`, cuatro claves que
  // ningún productor escribe: `allNull` daba siempre `true` y la tarjeta decía
  // «QA pendiente» aun con el puntaje guardado.
  const allNull =
    qa.empatia == null &&
    qa.claridad == null &&
    qa.adherencia == null &&
    qa.objeciones == null
  return (
    <section
      aria-label={t('inmobiliaria.ai.cobranza.call.qa.title')}
      className="rounded-xl border border-border bg-surface p-4"
    >
      <h2 className="text-sm font-semibold text-fg mb-3">
        {t('inmobiliaria.ai.cobranza.call.qa.title')}
      </h2>
      {allNull ? (
        <p className="text-sm text-fg-subtle">
          {t('inmobiliaria.ai.cobranza.call.qa.empty')}
        </p>
      ) : (
        <div className="space-y-3">
          <ScoreRow
            label={t('inmobiliaria.ai.cobranza.call.qa.overall')}
            score={qa.overall}
          />
          {/*
            El «General» es el puntaje operativo: la calidad del juez CAPADA a
            40 cuando una regla dura falló. Sin esta nota, la tarjeta muestra
            dimensiones altas junto a un General bajo y parece un bug
            (llamada 01a03712: 4/4/4/4 del juez, capada por Habeas Data).
          */}
          {qa.compliance === false && (
            <p className="text-xs text-fg-subtle -mt-1">
              {t('inmobiliaria.ai.cobranza.call.qa.cappedNote')}{' '}
              <span className="text-warning font-medium">
                {qa.violations.length > 0
                  ? qa.violations.map(etiquetaDeViolacion(t)).join(' · ')
                  : t('inmobiliaria.ai.cobranza.call.qa.cappedUnknown')}
              </span>
            </p>
          )}
          {/*
            Las cuatro dimensiones que el QaScorer realmente califica, en el
            orden en que las evalúa. Los nombres son los del evaluador porque
            son los que se miden en una cobranza; las etiquetas en español
            viven en i18n.
          */}
          <ScoreRow
            label={t('inmobiliaria.ai.cobranza.call.qa.empatia')}
            score={qa.empatia}
          />
          <ScoreRow
            label={t('inmobiliaria.ai.cobranza.call.qa.claridad')}
            score={qa.claridad}
          />
          <ScoreRow
            label={t('inmobiliaria.ai.cobranza.call.qa.adherencia')}
            score={qa.adherencia}
          />
          <ScoreRow
            label={t('inmobiliaria.ai.cobranza.call.qa.objeciones')}
            score={qa.objeciones}
          />
        </div>
      )}
    </section>
  )
}
