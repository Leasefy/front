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
 *
 * Build C: el slot también muestra el RESUMEN real del backend
 * (GET …/conciliacion/summary: taxonomía + totales + tasa) y un botón principal
 * "Conciliar ahora" (POST …/conciliacion/run, acción HUMANA con confirmación,
 * T-323). Fail-soft: 404/error → el resumen no se renderiza y la pantalla
 * conserva su estado actual (Sala overview / vacíos).
 */

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowsClockwise, Bank, CheckCircle, UploadSimple } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui'
import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { useConciliacionSummary } from '@/lib/hooks/conciliacion/use-conciliacion-summary'
import { useConciliacionRun } from '@/lib/hooks/conciliacion/use-conciliacion-run'
import { SalaAgente } from '@/components/inmobiliaria/ai/SalaAgente'
import { ConciliacionResumen } from '@/components/inmobiliaria/ai/ConciliacionResumen'
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

  // Resumen real del backend (taxonomía + totales + tasa). Fail-soft: null → no se muestra.
  const { data: summary, refetch: refetchSummary } = useConciliacionSummary()
  // Disparo de conciliación on-demand (acción humana, T-323).
  const { isRunning, requestRun } = useConciliacionRun()
  const [confirmOpen, setConfirmOpen] = useState(false)

  // CTA count: prefer the backend's "en_cola" KPI; absent → fall back to summary; else CTA without count.
  const colaCount =
    data?.kpis.find((kpi) => kpi.id === 'en_cola')?.value ?? summary?.totals.en_cola

  // T-323: la conciliación se dispara SOLO tras confirmación humana explícita.
  async function handleConciliarAhora() {
    setConfirmOpen(false)
    const res = await requestRun()
    if (res.ok && res.enqueued) {
      toast.success('Conciliación encolada. Las sugerencias aparecerán en la cola en unos minutos.')
      // Refresca el resumen para reflejar el nuevo estado.
      void refetchSummary()
    } else if (res.ok && !res.enqueued) {
      // Backend respondió pero no pudo encolar (db/inngest no disponible).
      toast.error('No se pudo iniciar la conciliación en este momento. Intenta de nuevo más tarde.')
    } else if (res.reason === 'not_available') {
      toast.error('La conciliación bajo demanda aún no está disponible.')
    } else {
      toast.error('No se pudo iniciar la conciliación. Intenta de nuevo.')
    }
  }

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
        {/* Acción principal — subir el extracto del banco + conciliar ahora */}
        <div className="rounded-lg border border-border bg-card p-5 max-w-3xl">
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
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button asChild hideArrow variant="secondary" data-testid="conciliacion-subir-cta">
                <Link href={SUBIR_EXTRACTO_HREF}>
                  {t(`${PAGES_NS}.accionTitle`)}
                  <UploadSimple className="w-4 h-4" aria-hidden="true" />
                </Link>
              </Button>
              {/* Acción PRINCIPAL del slot: conciliar ahora (T-323, confirmación humana) */}
              <Button
                hideArrow
                disabled={isRunning}
                onClick={() => setConfirmOpen(true)}
                data-testid="conciliacion-run-cta"
              >
                <ArrowsClockwise className="w-4 h-4" aria-hidden="true" />
                {isRunning ? 'Conciliando…' : 'Conciliar ahora'}
              </Button>
            </div>
          </div>
        </div>

        {/* Resumen real del backend: taxonomía + totales + tasa (fail-soft: null → nada) */}
        <ConciliacionResumen data={summary} />

        {/* Cómo funciona — el viaje de la conciliación en 3 pasos */}
        <div className="rounded-lg border border-border bg-card p-5 max-w-3xl space-y-4" data-testid="conciliacion-como-funciona">
          <h2 className="text-base font-semibold text-foreground">
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
        </div>
      </section>

      {/* Confirmación humana de "Conciliar ahora" (T-323) */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Conciliar ahora?</AlertDialogTitle>
            <AlertDialogDescription>
              Se ejecutará la conciliación sobre los movimientos recientes. Las coincidencias se
              dejarán como sugerencias para tu revisión — no se mueve ni se aplica dinero
              automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConciliarAhora}>Conciliar ahora</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
