'use client'

/**
 * /ai/estudio/equipo — "Equipo IA" del estudio (visión §13–14).
 *
 * Muestra el pipeline funcional conectado del estudio como un flujo vertical de
 * 5 step-cards (Recolección → Documentos → Ingresos → Riesgo → Reporte). Cada
 * card describe "Qué hace" (visión §13) y un "Resultados" en empty-state ('—')
 * porque aún no hay backend que alimente las métricas del equipo. UX-only.
 *
 * FUNCIONAL: el equipo se presenta por su función dentro del proceso, sin
 * nombres humanos. Coordina el estudio de punta a punta y entrega una
 * recomendación explicada.
 */

import {
  ArrowDown,
  ChartLineUp,
  ClipboardText,
  FileMagnifyingGlass,
  ShieldCheck,
  Tray,
  UsersThree,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { EmptyState } from '@/components/data-display/EmptyState'
import { useI18n } from '@/lib/i18n'

const NS = 'inmobiliaria.ai.estudio.equipo'

type Step = {
  id: string
  icon: Icon
  titleKey: string
  titleFb: string
  bullets: { key: string; fb: string }[]
  metrics: { key: string; fb: string }[]
}

/** Los 5 pasos del pipeline conectado del estudio (visión §13). */
const STEPS: Step[] = [
  {
    id: 'recoleccion',
    icon: Tray,
    titleKey: `${NS}.steps.recoleccion.title`,
    titleFb: 'Recolección',
    bullets: [
      { key: `${NS}.steps.recoleccion.b1`, fb: 'Recibe la solicitud del candidato y arma su carpeta digital.' },
      { key: `${NS}.steps.recoleccion.b2`, fb: 'Pide los datos y soportes que faltan por los canales habilitados.' },
      { key: `${NS}.steps.recoleccion.b3`, fb: 'Confirma identidad y consentimiento antes de avanzar.' },
    ],
    metrics: [
      { key: `${NS}.steps.recoleccion.m1`, fb: 'Solicitudes recibidas' },
      { key: `${NS}.steps.recoleccion.m2`, fb: 'Carpetas completas' },
    ],
  },
  {
    id: 'documentos',
    icon: FileMagnifyingGlass,
    titleKey: `${NS}.steps.documentos.title`,
    titleFb: 'Documentos',
    bullets: [
      { key: `${NS}.steps.documentos.b1`, fb: 'Lee y clasifica cada documento aportado.' },
      { key: `${NS}.steps.documentos.b2`, fb: 'Detecta soportes ilegibles, vencidos o con indicios de alteración.' },
      { key: `${NS}.steps.documentos.b3`, fb: 'Marca lo que requiere reenvío o revisión humana.' },
    ],
    metrics: [
      { key: `${NS}.steps.documentos.m1`, fb: 'Documentos validados' },
      { key: `${NS}.steps.documentos.m2`, fb: 'Hallazgos abiertos' },
    ],
  },
  {
    id: 'ingresos',
    icon: ChartLineUp,
    titleKey: `${NS}.steps.ingresos.title`,
    titleFb: 'Ingresos',
    bullets: [
      { key: `${NS}.steps.ingresos.b1`, fb: 'Estima la capacidad de pago a partir de los soportes financieros.' },
      { key: `${NS}.steps.ingresos.b2`, fb: 'Cruza ingresos contra el canon para calcular la holgura.' },
      { key: `${NS}.steps.ingresos.b3`, fb: 'Señala inconsistencias entre lo declarado y lo soportado.' },
    ],
    metrics: [
      { key: `${NS}.steps.ingresos.m1`, fb: 'Holgura promedio' },
      { key: `${NS}.steps.ingresos.m2`, fb: 'Casos sin soporte' },
    ],
  },
  {
    id: 'riesgo',
    icon: ShieldCheck,
    titleKey: `${NS}.steps.riesgo.title`,
    titleFb: 'Riesgo',
    bullets: [
      { key: `${NS}.steps.riesgo.b1`, fb: 'Combina documentos, ingresos y antecedentes en un puntaje de riesgo.' },
      { key: `${NS}.steps.riesgo.b2`, fb: 'Aplica las reglas y umbrales definidos por la inmobiliaria.' },
      { key: `${NS}.steps.riesgo.b3`, fb: 'Explica qué factores suben o bajan el riesgo de cada caso.' },
    ],
    metrics: [
      { key: `${NS}.steps.riesgo.m1`, fb: 'Riesgo promedio' },
      { key: `${NS}.steps.riesgo.m2`, fb: 'Casos en alerta' },
    ],
  },
  {
    id: 'reporte',
    icon: ClipboardText,
    titleKey: `${NS}.steps.reporte.title`,
    titleFb: 'Reporte',
    bullets: [
      { key: `${NS}.steps.reporte.b1`, fb: 'Reúne todo en un reporte único con recomendación explicada.' },
      { key: `${NS}.steps.reporte.b2`, fb: 'Resume fortalezas, alertas y los pendientes para decidir.' },
      { key: `${NS}.steps.reporte.b3`, fb: 'Deja el caso listo para aprobar, rechazar o pedir más información.' },
    ],
    metrics: [
      { key: `${NS}.steps.reporte.m1`, fb: 'Reportes entregados' },
      { key: `${NS}.steps.reporte.m2`, fb: 'Tiempo de estudio' },
    ],
  },
]

function EquipoIA() {
  const { t } = useI18n()

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="min-w-0">
        <MigaDePan
          backHref="/panel/inmobiliaria/ai/estudio"
          icon={UsersThree}
          className="mb-2"
          crumbs={[
            { label: tf('inmobiliaria.nav.secAgentes', 'Agentes'), href: '/panel/inmobiliaria/ai' },
            { label: tf('inmobiliaria.ai.estudio.overview.title', 'Estudios de inquilinos'), href: '/panel/inmobiliaria/ai/estudio' },
            { label: tf(`${NS}.title`, 'Equipo IA') },
          ]}
        />
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          {tf(`${NS}.title`, 'Equipo IA')}
        </h1>
        <p className="text-fg-muted mt-0.5 text-sm max-w-2xl">
          {tf(
            `${NS}.subtitle`,
            'Un equipo de funciones de IA coordina cada estudio de punta a punta y entrega una recomendación explicada, paso a paso.',
          )}
        </p>
      </header>

      {/* Pipeline conectado — flujo vertical de 5 step-cards */}
      <section aria-label={tf(`${NS}.pipeline.label`, 'Pipeline del equipo')} className="max-w-3xl">
        <ol className="space-y-0">
          {STEPS.map((step, i) => {
            const StepIcon = step.icon
            const isLast = i === STEPS.length - 1
            return (
              <li key={step.id} data-step={step.id}>
                <article className="rounded-xl border border-border bg-card p-5">
                  {/* Título del paso */}
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
                      <StepIcon
                        className="w-5 h-5 text-primary"
                        weight="duotone"
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                        {tf(`${NS}.stepLabel`, 'Paso')} {i + 1}
                      </p>
                      <h2 className="text-base font-semibold text-fg leading-tight">
                        {tf(step.titleKey, step.titleFb)}
                      </h2>
                    </div>
                  </div>

                  {/* Qué hace */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-fg mb-2">
                      {tf(`${NS}.queHace`, 'Qué hace')}
                    </p>
                    <ul className="space-y-1.5">
                      {step.bullets.map((b) => (
                        <li key={b.key} className="flex items-start gap-2 text-sm text-fg-muted">
                          <span
                            aria-hidden="true"
                            className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                          />
                          <span className="min-w-0">{tf(b.key, b.fb)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Resultados — empty-state ('—') hasta que haya backend */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-fg mb-2">
                      {tf(`${NS}.resultados`, 'Resultados')}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {step.metrics.map((m) => (
                        <div
                          key={m.key}
                          className="rounded-lg border border-border bg-surface-muted p-3"
                        >
                          <p className="text-xl font-semibold text-fg-subtle tabular-nums">
                            —
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-fg-muted leading-tight">
                            {tf(m.key, m.fb)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>

                {/* Conector entre cards */}
                {!isLast && (
                  <div className="flex justify-center py-2" aria-hidden="true">
                    <span className="flex flex-col items-center text-fg-subtle">
                      <span className="w-px h-3 bg-border" />
                      <ArrowDown className="w-4 h-4 -my-0.5" weight="bold" />
                      <span className="w-px h-3 bg-border" />
                    </span>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      {/* Cierre — recomendación explicada (empty-state, sin backend).
          Sin CTA: "Ver estudios" ya es la acción dueña del overview/bandeja
          (contrato §6, no duplicar el CTA). */}
      <section className="max-w-3xl">
        <div className="rounded-xl border border-border bg-card p-5">
          <EmptyState
            icon={UsersThree}
            title={tf(`${NS}.empty.title`, 'Aún no hay actividad del equipo')}
            description={tf(
              `${NS}.empty.description`,
              'Cuando se procese el primer estudio, los resultados de cada paso y la recomendación final del equipo aparecerán aquí.',
            )}
          />
        </div>
      </section>
    </main>
  )
}

export default function EquipoIAPage() {
  return (
    <PageGuard module="estudio">
      <EquipoIA />
    </PageGuard>
  )
}
