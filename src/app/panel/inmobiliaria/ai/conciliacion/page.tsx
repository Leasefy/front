'use client'

/**
 * /ai/conciliacion — F6: the Conciliación Sala (first COMPLETE workspace).
 *
 * Restructured from the F1 page (which mixed Sala + Cola): this page is now
 * the generic <SalaAgente> fed by the per-agent overview endpoint; the queue
 * moved to ./cola, the case detail lives at ./[id] and the autonomy posture
 * at ./configuracion (AGENT-WORKSPACE-SPEC §1.4).
 *
 * F10 (SPEC §4): the movimientos + extractos surface now lives INSIDE the
 * workspace at ./movimientos (the legacy /conciliacion URL redirects here).
 *
 * Jerarquía invertida (patrón avalúos): el domain slot abre con la acción
 * principal — "Subir extracto del banco" → ./movimientos#upload — seguida de
 * la sección "¿Cómo funciona?" de 3 pasos.
 */

import Link from 'next/link'
import { ArrowsClockwise, Bank, CheckCircle, UploadSimple } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { SalaAgente } from '@/components/inmobiliaria/ai/SalaAgente'
import { useI18n } from '@/lib/i18n'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.conciliacion'

/** Anchor into the movimientos page — the dropzone carries id="upload". */
const SUBIR_EXTRACTO_HREF = '/panel/inmobiliaria/ai/conciliacion/movimientos#upload'

/** "Cómo funciona" — el viaje de la conciliación en 3 pasos. */
const COMO_FUNCIONA_STEPS: { icon: Icon; titleKey: string; descKey: string }[] = [
  { icon: UploadSimple, titleKey: `${PAGES_NS}.comoFunciona.step1.title`, descKey: `${PAGES_NS}.comoFunciona.step1.desc` },
  { icon: ArrowsClockwise, titleKey: `${PAGES_NS}.comoFunciona.step2.title`, descKey: `${PAGES_NS}.comoFunciona.step2.desc` },
  { icon: CheckCircle, titleKey: `${PAGES_NS}.comoFunciona.step3.title`, descKey: `${PAGES_NS}.comoFunciona.step3.desc` },
]

function ConciliacionSala() {
  const { t } = useI18n()
  const { data, isLoading, error } = useAgentOverview('conciliacion')

  // CTA count: prefer the backend's "en_cola" KPI; absent → CTA without count.
  const colaCount = data?.kpis.find((kpi) => kpi.id === 'en_cola')?.value

  return (
    <SalaAgente
      agente="conciliacion"
      titulo={t(`${PAGES_NS}.salaTitulo`)}
      descripcion={t(`${PAGES_NS}.salaDesc`)}
      icon={Bank}
      overview={data}
      isLoading={isLoading}
      error={error}
      colaHref="/panel/inmobiliaria/ai/conciliacion/cola"
      colaCount={colaCount}
      colaLabel={t(`${PAGES_NS}.colaLabel`)}
    >
      {/* Domain slot: acción principal + cómo funciona (patrón avalúos) */}
      <section className="space-y-4" data-testid="conciliacion-subir-extracto">
        {/* Acción principal — subir el extracto del banco */}
        <div className="rounded-xl border border-border bg-card p-5 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
              <UploadSimple className="w-5 h-5 text-neutral-600 dark:text-neutral-300" weight="duotone" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <h2 className="text-base font-semibold text-foreground">
                {t(`${PAGES_NS}.accionTitle`)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(`${PAGES_NS}.accionDesc`)}
              </p>
            </div>
            <Link
              href={SUBIR_EXTRACTO_HREF}
              className="shrink-0 inline-flex items-center gap-2 h-10 px-5 rounded-md bg-[#1A40FF] text-white text-sm font-medium hover:bg-[#1636D8] transition-colors"
              data-testid="conciliacion-subir-cta"
            >
              {t(`${PAGES_NS}.accionTitle`)}
              <UploadSimple className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Cómo funciona — el viaje de la conciliación en 3 pasos */}
        <div className="rounded-xl border border-border bg-card p-5 max-w-3xl space-y-4" data-testid="conciliacion-como-funciona">
          <h2 className="text-sm font-semibold text-foreground">
            {t(`${PAGES_NS}.comoFunciona.title`)}
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

export default function ConciliacionSalaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ConciliacionSala />
    </PageGuard>
  )
}
