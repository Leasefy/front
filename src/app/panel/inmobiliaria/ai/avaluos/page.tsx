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
 * NEXT_PUBLIC_AVALUO_URL (rendered ONLY when the env var is set) + the
 * firma-del-certificado note.
 */

import { ArrowSquareOut, Scales } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { SalaAgente } from '@/components/inmobiliaria/ai/SalaAgente'
import { useI18n } from '@/lib/i18n'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.avaluos'

/** Public wizard app (external) — card renders only when the env var is set. */
const AVALUO_URL = process.env.NEXT_PUBLIC_AVALUO_URL

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
    >
      {/* Domain slot: solicitar avalúo (external wizard) + firma note */}
      <section className="space-y-2" data-testid="avaluos-solicitar">
        {AVALUO_URL && (
          <a
            href={AVALUO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted transition max-w-2xl"
            data-testid="avaluos-solicitar-cta"
          >
            <Scales
              className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition shrink-0"
              weight="duotone"
              aria-hidden="true"
            />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-foreground">
                {t(`${PAGES_NS}.solicitarTitle`)}
              </span>
              <span className="block text-xs text-muted-foreground truncate">
                {t(`${PAGES_NS}.solicitarDetalle`)}
              </span>
            </span>
            <ArrowSquareOut
              className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition shrink-0"
              aria-hidden="true"
            />
          </a>
        )}
        <p className="text-xs text-muted-foreground max-w-2xl">{t(`${PAGES_NS}.firmaNota`)}</p>
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
