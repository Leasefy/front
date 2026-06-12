'use client'

/**
 * /ai/pagos — F9: the Pagos (AP) Sala (complete workspace).
 *
 * Reframed from the F4 single-page cola: this page is now the generic
 * <SalaAgente> fed by the per-agent overview endpoint; the queue moved to
 * ./cola, the case detail lives at ./[id] and the autonomy posture at
 * ./configuracion — mirroring the F6/F7/F8 workspaces 1:1.
 *
 * Decisión cerrada: la Sala vive aquí; las operaciones profundas (facturas,
 * aging, matriz de aprobación, payment-runs) SIGUEN en Tesorería y
 * Dispersiones — el domain slot las cross-linkea, NO las duplica.
 * Nota de rutas: /tesoreria/ap no tiene index (solo el detalle [id]) →
 * "Tesorería · AP" apunta al index real /panel/inmobiliaria/tesoreria.
 */

import Link from 'next/link'
import {
  ArrowSquareOut,
  CurrencyDollar,
  ListChecks,
  PaperPlaneTilt,
  Receipt,
  SealCheck,
  Wallet,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { SalaAgente } from '@/components/inmobiliaria/ai/SalaAgente'
import { useI18n } from '@/lib/i18n'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.pagos'

/** "Cómo funciona" — el viaje de una factura en 4 pasos (patrón avalúos). */
const COMO_FUNCIONA_STEPS: { icon: Icon; titleKey: string; descKey: string }[] = [
  { icon: Receipt, titleKey: `${PAGES_NS}.comoFunciona.step1.title`, descKey: `${PAGES_NS}.comoFunciona.step1.desc` },
  { icon: ListChecks, titleKey: `${PAGES_NS}.comoFunciona.step2.title`, descKey: `${PAGES_NS}.comoFunciona.step2.desc` },
  { icon: SealCheck, titleKey: `${PAGES_NS}.comoFunciona.step3.title`, descKey: `${PAGES_NS}.comoFunciona.step3.desc` },
  { icon: PaperPlaneTilt, titleKey: `${PAGES_NS}.comoFunciona.step4.title`, descKey: `${PAGES_NS}.comoFunciona.step4.desc` },
]

/** Deep-ops surfaces the agent prepares work for — framed, never duplicated.
 *  Label/detalle text lives under inmobiliaria.ai.workspace.pages.pagos.ops*. */
const OPERACIONES_PROFUNDAS: { labelKey: string; detalleKey: string; href: string; icon: Icon }[] = [
  {
    labelKey: 'inmobiliaria.ai.workspace.pages.pagos.opsTesoreria',
    detalleKey: 'inmobiliaria.ai.workspace.pages.pagos.opsTesoreriaDetalle',
    href: '/panel/inmobiliaria/tesoreria',
    icon: Wallet,
  },
  {
    labelKey: 'inmobiliaria.ai.workspace.pages.pagos.opsDispersiones',
    detalleKey: 'inmobiliaria.ai.workspace.pages.pagos.opsDispersionesDetalle',
    href: '/panel/inmobiliaria/dispersiones',
    icon: PaperPlaneTilt,
  },
]

function PagosSala() {
  const { t } = useI18n()
  const { data, isLoading, error } = useAgentOverview('pagos')

  // CTA count: prefer the backend's "en_cola" KPI; absent → CTA without count.
  const colaCount = data?.kpis.find((kpi) => kpi.id === 'en_cola')?.value

  return (
    <SalaAgente
      agente="pagos"
      titulo={t('inmobiliaria.ai.workspace.pages.pagos.salaTitulo')}
      descripcion={t('inmobiliaria.ai.workspace.pages.pagos.salaDesc')}
      icon={CurrencyDollar}
      overview={data}
      isLoading={isLoading}
      error={error}
      colaHref="/panel/inmobiliaria/ai/pagos/cola"
      colaCount={colaCount}
      colaLabel={t(`${PAGES_NS}.colaLabel`)}
    >
      {/* Domain slot: cómo funciona + operaciones profundas */}
      {/* Cómo funciona — el viaje de una factura en 4 pasos */}
      <section
        className="rounded-2xl border border-border bg-card p-5 max-w-3xl space-y-4"
        data-testid="pagos-como-funciona"
      >
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
      </section>

      {/* Operaciones profundas — cross-links, no duplicación */}
      <section className="space-y-2" data-testid="pagos-operaciones-profundas">
        <h2 className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
          {t('inmobiliaria.ai.workspace.pages.pagos.opsTitle')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          {OPERACIONES_PROFUNDAS.map((op) => {
            const OpIcon = op.icon
            return (
              <Link
                key={op.href}
                href={op.href}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted transition"
              >
                <OpIcon
                  className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition shrink-0"
                  weight="duotone"
                  aria-hidden="true"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-foreground">{t(op.labelKey)}</span>
                  <span className="block text-xs text-muted-foreground truncate">{t(op.detalleKey)}</span>
                </span>
                <ArrowSquareOut
                  className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition shrink-0"
                  aria-hidden="true"
                />
              </Link>
            )
          })}
        </div>
      </section>
    </SalaAgente>
  )
}

export default function PagosPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <PagosSala />
    </PageGuard>
  )
}
