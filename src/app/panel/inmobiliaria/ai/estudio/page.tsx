'use client'

/**
 * /ai/estudio — F7: the Estudio del inquilino Sala (complete workspace).
 *
 * Restructured from the F2 page (which was the cola): this page is now the
 * generic <SalaAgente> fed by the per-agent overview endpoint; the queue
 * moved to ./cola, the case detail lives at ./[id] and the autonomy posture
 * at ./configuracion — mirroring the F6 Conciliación workspace 1:1.
 */

import {
  ChartBar,
  CheckCircle,
  ClipboardText,
  FileMagnifyingGlass,
  ShieldCheck,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { SalaAgente } from '@/components/inmobiliaria/ai/SalaAgente'
import { useI18n } from '@/lib/i18n'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.estudio'

/** "Cómo funciona" — los 4 pasos del estudio del inquilino (markup como avaluos). */
const COMO_FUNCIONA_STEPS: { icon: Icon; titleKey: string; descKey: string }[] = [
  { icon: ClipboardText, titleKey: `${PAGES_NS}.comoFunciona.step1.title`, descKey: `${PAGES_NS}.comoFunciona.step1.desc` },
  { icon: FileMagnifyingGlass, titleKey: `${PAGES_NS}.comoFunciona.step2.title`, descKey: `${PAGES_NS}.comoFunciona.step2.desc` },
  { icon: ChartBar, titleKey: `${PAGES_NS}.comoFunciona.step3.title`, descKey: `${PAGES_NS}.comoFunciona.step3.desc` },
  { icon: CheckCircle, titleKey: `${PAGES_NS}.comoFunciona.step4.title`, descKey: `${PAGES_NS}.comoFunciona.step4.desc` },
]

function EstudioSala() {
  const { t } = useI18n()
  const { data, isLoading, error } = useAgentOverview('estudio')

  // CTA count: prefer the backend's "en_cola" KPI; absent → CTA without count.
  const colaCount = data?.kpis.find((kpi) => kpi.id === 'en_cola')?.value

  return (
    <SalaAgente
      agente="estudio"
      titulo={t(`${PAGES_NS}.salaTitulo`)}
      descripcion={t(`${PAGES_NS}.salaDesc`)}
      icon={ShieldCheck}
      overview={data}
      isLoading={isLoading}
      error={error}
      colaHref="/panel/inmobiliaria/ai/estudio/cola"
      colaCount={colaCount}
      colaLabel={t(`${PAGES_NS}.colaLabel`)}
    >
      {/* Domain slot: cómo funciona — el viaje del estudio en 4 pasos */}
      <section className="space-y-4" data-testid="estudio-como-funciona">
        <div className="rounded-2xl border border-border bg-card p-5 max-w-3xl space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t(`${PAGES_NS}.comoFunciona.title`)}
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COMO_FUNCIONA_STEPS.map((step, i) => {
              const StepIcon = step.icon
              return (
                <li key={step.titleKey} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <StepIcon className="w-4 h-4 text-foreground" weight="duotone" aria-hidden="true" />
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">{i + 1}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-foreground leading-tight">
                    {t(step.titleKey)}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">{t(step.descKey)}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>
    </SalaAgente>
  )
}

export default function EstudioSalaPage() {
  return (
    // Agent module gate — ABSENT key in my-permissions = allowed
    // (see agent-module-access.ts); present without 'view' = denied.
    <PageGuard module="estudio">
      <EstudioSala />
    </PageGuard>
  )
}
