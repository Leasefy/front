'use client'

/**
 * /ai/estudio/solicitud — "Solicitud al candidato" (visión §5, experiencia del
 * candidato — PREVIEW).
 *
 * Muestra a la inmobiliaria CÓMO vive el candidato la solicitud que le envía:
 * una barra de progreso + los 7 pasos del formulario (Datos personales · Info
 * laboral/económica · Ingresos · Documentos · Codeudor · Autorización de datos ·
 * Confirmación), con copy humano y empático. Es una vista PREVIEW — NO hay
 * submit real ni endpoint: un selector deja recorrer los pasos para que el
 * asesor vea el recorrido completo "desde el lado del candidato".
 *
 * UX-only: estado controlado en React (paso activo), sin backend.
 */

import { useState } from 'react'
import {
  Briefcase,
  CheckCircle,
  Eye,
  FileArrowUp,
  IdentificationCard,
  Money,
  PaperPlaneTilt,
  SealCheck,
  ShieldCheck,
  UsersThree,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const NS = 'inmobiliaria.ai.estudio'

interface PreviewStep {
  /** Clave estable para keys de React + i18n. */
  id: string
  icon: Icon
  titleKey: string
  titleFallback: string
  /** Lo que el candidato lee como ayuda en ese paso. */
  helperKey: string
  helperFallback: string
  /** Campos / contenido que el candidato verá (solo etiquetas, preview). */
  fields: { key: string; fallback: string }[]
}

const STEPS: PreviewStep[] = [
  {
    id: 'personales',
    icon: IdentificationCard,
    titleKey: `${NS}.solicitud.pasos.personales.title`,
    titleFallback: 'Datos personales',
    helperKey: `${NS}.solicitud.pasos.personales.helper`,
    helperFallback:
      'Empecemos por lo básico para identificarte. Solo te tomará un par de minutos.',
    fields: [
      { key: `${NS}.solicitud.pasos.personales.f1`, fallback: 'Nombre completo' },
      { key: `${NS}.solicitud.pasos.personales.f2`, fallback: 'Tipo y número de documento' },
      { key: `${NS}.solicitud.pasos.personales.f3`, fallback: 'Fecha de nacimiento' },
      { key: `${NS}.solicitud.pasos.personales.f4`, fallback: 'Celular y correo' },
      { key: `${NS}.solicitud.pasos.personales.f5`, fallback: 'Ciudad de residencia' },
    ],
  },
  {
    id: 'laboral',
    icon: Briefcase,
    titleKey: `${NS}.solicitud.pasos.laboral.title`,
    titleFallback: 'Información laboral y económica',
    helperKey: `${NS}.solicitud.pasos.laboral.helper`,
    helperFallback:
      'Cuéntanos a qué te dedicas. Esto nos ayuda a entender tu situación y avanzar más rápido.',
    fields: [
      { key: `${NS}.solicitud.pasos.laboral.f1`, fallback: 'Ocupación (empleado, independiente, pensionado…)' },
      { key: `${NS}.solicitud.pasos.laboral.f2`, fallback: 'Empresa o actividad' },
      { key: `${NS}.solicitud.pasos.laboral.f3`, fallback: 'Cargo y antigüedad' },
      { key: `${NS}.solicitud.pasos.laboral.f4`, fallback: 'Tipo de contrato' },
    ],
  },
  {
    id: 'ingresos',
    icon: Money,
    titleKey: `${NS}.solicitud.pasos.ingresos.title`,
    titleFallback: 'Ingresos',
    helperKey: `${NS}.solicitud.pasos.ingresos.helper`,
    helperFallback:
      'Indícanos tus ingresos mensuales. Tus datos están protegidos y solo se usan para tu estudio.',
    fields: [
      { key: `${NS}.solicitud.pasos.ingresos.f1`, fallback: 'Ingresos mensuales' },
      { key: `${NS}.solicitud.pasos.ingresos.f2`, fallback: 'Otros ingresos (opcional)' },
      { key: `${NS}.solicitud.pasos.ingresos.f3`, fallback: 'Egresos / obligaciones financieras' },
    ],
  },
  {
    id: 'documentos',
    icon: FileArrowUp,
    titleKey: `${NS}.solicitud.pasos.documentos.title`,
    titleFallback: 'Documentos',
    helperKey: `${NS}.solicitud.pasos.documentos.helper`,
    helperFallback:
      'Sube los soportes desde tu celular o computador. Aceptamos foto o PDF, lo que tengas a la mano.',
    fields: [
      { key: `${NS}.solicitud.pasos.documentos.f1`, fallback: 'Documento de identidad' },
      { key: `${NS}.solicitud.pasos.documentos.f2`, fallback: 'Soportes de ingresos (desprendibles, extractos)' },
      { key: `${NS}.solicitud.pasos.documentos.f3`, fallback: 'Certificación laboral (si aplica)' },
    ],
  },
  {
    id: 'codeudor',
    icon: UsersThree,
    titleKey: `${NS}.solicitud.pasos.codeudor.title`,
    titleFallback: 'Codeudor',
    helperKey: `${NS}.solicitud.pasos.codeudor.helper`,
    helperFallback:
      'Si cuentas con un codeudor que respalde el arriendo, agrégalo aquí. Es opcional según el inmueble.',
    fields: [
      { key: `${NS}.solicitud.pasos.codeudor.f1`, fallback: 'Datos del codeudor' },
      { key: `${NS}.solicitud.pasos.codeudor.f2`, fallback: 'Relación con el candidato' },
      { key: `${NS}.solicitud.pasos.codeudor.f3`, fallback: 'Documentos del codeudor' },
    ],
  },
  {
    id: 'autorizacion',
    icon: ShieldCheck,
    titleKey: `${NS}.solicitud.pasos.autorizacion.title`,
    titleFallback: 'Autorización de datos',
    helperKey: `${NS}.solicitud.pasos.autorizacion.helper`,
    helperFallback:
      'Autorizas el tratamiento de tus datos y la consulta en centrales de riesgo, conforme a la ley.',
    fields: [
      { key: `${NS}.solicitud.pasos.autorizacion.f1`, fallback: 'Autorización de tratamiento de datos personales' },
      { key: `${NS}.solicitud.pasos.autorizacion.f2`, fallback: 'Autorización de consulta en centrales de riesgo' },
    ],
  },
  {
    id: 'confirmacion',
    icon: SealCheck,
    titleKey: `${NS}.solicitud.pasos.confirmacion.title`,
    titleFallback: 'Confirmación',
    helperKey: `${NS}.solicitud.pasos.confirmacion.helper`,
    helperFallback:
      '¡Listo! Revisa tu información y envíala. Te avisaremos por correo cuando tengamos una respuesta.',
    fields: [
      { key: `${NS}.solicitud.pasos.confirmacion.f1`, fallback: 'Resumen de la información enviada' },
      { key: `${NS}.solicitud.pasos.confirmacion.f2`, fallback: 'Confirmación de envío' },
    ],
  },
]

function EstudioSolicitud() {
  const { t } = useI18n()
  const [activeIndex, setActiveIndex] = useState(0)

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  const active = STEPS[activeIndex]
  const ActiveIcon = active.icon
  const progressPct = Math.round(((activeIndex + 1) / STEPS.length) * 100)
  const isLast = activeIndex === STEPS.length - 1

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <MigaDePan
          backHref="/panel/inmobiliaria/ai/estudio"
          icon={PaperPlaneTilt}
          crumbs={[
            { label: tf('inmobiliaria.nav.secAgentes', 'Agentes'), href: '/panel/inmobiliaria/ai' },
            { label: tf(`${NS}.overview.title`, 'Estudios de inquilinos'), href: '/panel/inmobiliaria/ai/estudio' },
            { label: tf(`${NS}.solicitud.title`, 'Solicitud al candidato') },
          ]}
        />
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          {tf(`${NS}.solicitud.title`, 'Solicitud al candidato')}
        </h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          {tf(
            `${NS}.solicitud.subtitle`,
            'Esta es la experiencia que vive el candidato cuando le envías la solicitud de estudio: un formulario guiado, paso a paso, pensado para que la complete sin fricción desde su celular.',
          )}
        </p>
      </header>

      {/* Nota de contexto — "así lo ve el candidato" */}
      <div
        role="note"
        className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-soft p-4"
      >
        <Eye className="w-5 h-5 text-primary shrink-0 mt-0.5" weight="duotone" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">
            {tf(`${NS}.solicitud.nota.title`, 'Así lo ve el candidato cuando le envías la solicitud')}
          </p>
          <p className="text-xs text-fg-muted mt-0.5">
            {tf(
              `${NS}.solicitud.nota.desc`,
              'Esta es una vista previa. Recorre los pasos para conocer la experiencia completa; aquí no se guarda ni se envía información real.',
            )}
          </p>
        </div>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Barra de progreso */}
        <section aria-label={tf(`${NS}.solicitud.progreso.label`, 'Progreso de la solicitud')} className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-fg">
              {tf(`${NS}.solicitud.progreso.paso`, 'Paso')} {activeIndex + 1}{' '}
              {tf(`${NS}.solicitud.progreso.de`, 'de')} {STEPS.length}
            </span>
            <span className="font-medium text-fg-muted tabular-nums">{progressPct}%</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={tf(`${NS}.solicitud.progreso.label`, 'Progreso de la solicitud')}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </section>

        {/* Stepper — los 7 pasos, clicables para recorrer la preview */}
        <nav aria-label={tf(`${NS}.solicitud.stepper.label`, 'Pasos de la solicitud')}>
          <ol className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {STEPS.map((step, i) => {
              const StepIcon = step.icon
              const isActive = i === activeIndex
              const isDone = i < activeIndex
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => setActiveIndex(i)}
                    aria-current={isActive ? 'step' : undefined}
                    className={cn(
                      'w-full flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring',
                      isActive
                        ? 'border-primary bg-primary-soft'
                        : 'border-border bg-surface hover:bg-surface-hover',
                    )}
                  >
                    <span
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        isActive
                          ? 'bg-primary text-primary-fg'
                          : isDone
                            ? 'bg-success-soft text-success-700'
                            : 'bg-surface-muted text-fg-muted',
                      )}
                    >
                      {isDone ? (
                        <CheckCircle className="w-4 h-4" weight="fill" aria-hidden="true" />
                      ) : (
                        <StepIcon className="w-4 h-4" weight="duotone" aria-hidden="true" />
                      )}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-medium leading-tight line-clamp-2',
                        isActive ? 'text-fg' : 'text-fg-muted',
                      )}
                    >
                      {tf(step.titleKey, step.titleFallback)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Tarjeta del paso activo — preview de lo que el candidato ve */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-5" aria-live="polite">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center shrink-0">
              <ActiveIcon className="w-5 h-5 text-fg" weight="duotone" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                {tf(`${NS}.solicitud.progreso.paso`, 'Paso')} {activeIndex + 1}/{STEPS.length}
              </p>
              <h2 className="text-base font-semibold text-fg">
                {tf(active.titleKey, active.titleFallback)}
              </h2>
            </div>
          </div>

          {/* Copy humano — la ayuda que lee el candidato */}
          <p className="text-sm text-fg-muted leading-relaxed">
            {tf(active.helperKey, active.helperFallback)}
          </p>

          {/* Campos del paso (solo etiquetas — preview, no editables) */}
          <ul className="space-y-2.5">
            {active.fields.map((field) => (
              <li
                key={field.key}
                className="rounded-lg border border-dashed border-border bg-surface-muted px-3.5 py-2.5"
              >
                <span className="text-sm font-medium text-fg">
                  {tf(field.key, field.fallback)}
                </span>
              </li>
            ))}
          </ul>

          {/* "Botón" que vería el candidato — preview, deshabilitado */}
          <div className="pt-1">
            <Button type="button" disabled hideArrow className="opacity-50">
              <PaperPlaneTilt className="w-4 h-4" weight="bold" aria-hidden="true" />
              {isLast
                ? tf(`${NS}.solicitud.candidatoCta.enviar`, 'Enviar solicitud')
                : tf(`${NS}.solicitud.candidatoCta.continuar`, 'Continuar')}
            </Button>
            <p className="mt-1.5 text-xs text-fg-muted">
              {tf(
                `${NS}.solicitud.candidatoCta.hint`,
                'Vista previa: el candidato verá este botón para avanzar al siguiente paso.',
              )}
            </p>
          </div>
        </section>

        {/* Navegación de la PREVIEW (para el asesor) */}
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            hideArrow
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            disabled={activeIndex === 0}
          >
            {tf(`${NS}.solicitud.preview.anterior`, 'Paso anterior')}
          </Button>

          {isLast ? (
            <Button
              type="button"
              variant="secondary"
              hideArrow
              onClick={() => setActiveIndex(0)}
            >
              {tf(`${NS}.solicitud.preview.reiniciar`, 'Volver al inicio')}
            </Button>
          ) : (
            <Button
              type="button"
              hideArrow
              onClick={() => setActiveIndex((i) => Math.min(STEPS.length - 1, i + 1))}
            >
              {tf(`${NS}.solicitud.preview.siguiente`, 'Ver siguiente paso')}
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}

export default function EstudioSolicitudPage() {
  return (
    <PageGuard module="estudio">
      <EstudioSolicitud />
    </PageGuard>
  )
}
