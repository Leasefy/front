'use client'

/**
 * /ai/avaluos — the Avalúos Sala (7º agente, read-only tracking workspace).
 *
 * Avalúos is a STANDALONE service (own repo/DB) proxied by the agent backend
 * via service token, on the SAME generic contracts every workspace uses
 * (overview/work-items/detail/autonomia); 404 → notAvailable until deployed.
 * Items are read-only tracking (`actions: []`) — la firma del certificado la
 * hacen Portofino/Leasefy en el backoffice admin; la inmobiliaria SOLICITA y
 * CONSULTA. Mirrors the F6/F7/F8/F9 workspaces 1:1.
 *
 * Domain slot: "Solicitar avalúo" CTA → the public wizard app at
 * NEXT_PUBLIC_AVALUO_API_URL (rendered ONLY when the env var is set) + the
 * firma-del-certificado note.
 */

import {
  ArrowSquareOut,
  CalendarBlank,
  ChartLineUp,
  ClipboardText,
  Scales,
  SealCheck,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { Badge, Button } from '@/components/ui'
import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { SalaAgente } from '@/components/inmobiliaria/ai/SalaAgente'
import { useI18n } from '@/lib/i18n'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.avaluos'

/** Public wizard app (external). When unset the CTA degrades to a visible
 * "próximamente" state — the main action must NEVER silently disappear. */
const AVALUO_URL = process.env.NEXT_PUBLIC_AVALUO_API_URL

/** "Cómo funciona" — the 4 steps of the avalúo journey. */
const COMO_FUNCIONA_STEPS: { icon: Icon; titleKey: string; descKey: string }[] = [
  { icon: ClipboardText, titleKey: `${PAGES_NS}.comoFunciona.step1.title`, descKey: `${PAGES_NS}.comoFunciona.step1.desc` },
  { icon: CalendarBlank, titleKey: `${PAGES_NS}.comoFunciona.step2.title`, descKey: `${PAGES_NS}.comoFunciona.step2.desc` },
  { icon: ChartLineUp, titleKey: `${PAGES_NS}.comoFunciona.step3.title`, descKey: `${PAGES_NS}.comoFunciona.step3.desc` },
  { icon: SealCheck, titleKey: `${PAGES_NS}.comoFunciona.step4.title`, descKey: `${PAGES_NS}.comoFunciona.step4.desc` },
]

function AvaluosSala() {
  const { t } = useI18n()
  const { data, isLoading, error } = useAgentOverview('avaluos')

  // CTA count: prefer the backend's "en_cola" KPI; absent → CTA without count.
  const colaCount = data?.kpis.find((kpi) => kpi.id === 'en_cola')?.value

  return (
    <SalaAgente
      agente="avaluos"
      titulo={t(`${PAGES_NS}.salaTitulo`)}
      descripcion={t(`${PAGES_NS}.salaDesc`)}
      icon={Scales}
      overview={data}
      isLoading={isLoading}
      error={error}
      colaHref="/panel/inmobiliaria/ai/avaluos/cola"
      colaCount={colaCount}
      colaLabel={t(`${PAGES_NS}.misSolicitudes`)}
    >
      {/* Domain slot: acción principal + cómo funciona */}
      <section className="space-y-4" data-testid="avaluos-solicitar">
        {/* Acción principal — siempre visible; degrada a "próximamente" sin env */}
        <div className="rounded-xl border border-border bg-card p-5 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
              <Scales className="w-5 h-5 text-neutral-600 dark:text-neutral-300" weight="duotone" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <h2 className="text-base font-semibold text-foreground">
                {t(`${PAGES_NS}.solicitarTitle`)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {AVALUO_URL
                  ? t(`${PAGES_NS}.solicitarDetalle`)
                  : t(`${PAGES_NS}.solicitarUnavailable`)}
              </p>
            </div>
            {AVALUO_URL ? (
              <Button asChild hideArrow className="shrink-0" data-testid="avaluos-solicitar-cta">
                <a href={AVALUO_URL} target="_blank" rel="noopener noreferrer">
                  {t(`${PAGES_NS}.solicitarCta`)}
                  <ArrowSquareOut className="w-4 h-4" aria-hidden="true" />
                </a>
              </Button>
            ) : (
              <Badge variant="secondary" className="shrink-0" data-testid="avaluos-solicitar-pendiente">
                {t(`${PAGES_NS}.solicitarProximamente`)}
              </Badge>
            )}
          </div>
        </div>

        {/* Cómo funciona — el viaje del avalúo en 4 pasos */}
        <div className="rounded-xl border border-border bg-card p-5 max-w-3xl space-y-4" data-testid="avaluos-como-funciona">
          <h2 className="text-base font-semibold text-foreground">
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
                    <span className="text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {t(step.titleKey)}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">{t(step.descKey)}</p>
                </li>
              )
            })}
          </ol>
          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            {t(`${PAGES_NS}.firmaNota`)}
          </p>
        </div>
      </section>
    </SalaAgente>
  )
}

export default function AvaluosSalaPage() {
  return (
    // Agent module gate — ABSENT key in my-permissions = allowed
    // (see agent-module-access.ts); present without 'view' = denied.
    <PageGuard module="avaluos">
      <AvaluosSala />
    </PageGuard>
  )
}
