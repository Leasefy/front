'use client'

/**
 * DocumentosTab — estudio de inquilino, vista de caso (zona CENTRO).
 *
 * Lo que el motor reportó sobre los documentos del candidato:
 *  - resumen de documentos (enviados / procesados / omitidos / tipos presentes)
 *  - banderas de integridad (integrity_flags) con su severidad
 *  - observaciones (observations) info/warning
 *
 * Solo presentación de datos que YA produce el pipeline — sin invenciones.
 */

import { FileText, WarningCircle, Info, type Icon } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type {
  TenantScoringResult,
  TenantScoringIntegrityFlag,
} from '@/lib/estudio/decision'

interface DocumentosTabProps {
  result: TenantScoringResult
}

const NS = 'inmobiliaria.ai.estudio'

/** Severidad → clases de marca (alto=rojo, medio=ámbar, bajo=neutro). */
function severityClasses(sev: 'low' | 'medium' | 'high'): string {
  if (sev === 'high') {
    return 'text-danger bg-danger-soft border border-danger/30'
  }
  if (sev === 'medium') {
    return 'text-warning-700 bg-warning-soft border border-warning/30'
  }
  return 'text-fg-muted bg-surface-muted border border-border'
}

function obsClasses(sev: 'info' | 'warning'): { wrap: string; icon: Icon; color: string } {
  if (sev === 'warning') {
    return {
      wrap: 'border-warning/30 bg-warning-soft',
      icon: WarningCircle,
      color: 'text-warning-700',
    }
  }
  return {
    wrap: 'border-border bg-card',
    icon: Info,
    color: 'text-fg-muted',
  }
}

export function DocumentosTab({ result }: DocumentosTabProps) {
  const { t } = useI18n()
  const docs = result.documents_summary ?? null
  const flags = result.integrity_flags ?? []
  const observations = result.observations ?? []

  const hasAnything = docs || flags.length > 0 || observations.length > 0

  if (!hasAnything) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-fg-muted">
          {t(`${NS}.detalle.documentos.empty`)}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Resumen de documentos */}
      {docs && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-fg">
            <FileText
              className="w-4 h-4 text-primary"
              weight="duotone"
              aria-hidden="true"
            />
            {t(`${NS}.detalle.documentos.resumenTitulo`)}
          </h3>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-medium text-fg-muted">
                {t(`${NS}.detalle.documentos.enviados`)}
              </p>
              <p className="mt-0.5 text-base font-semibold text-fg tabular-nums">
                {docs.total_sent}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-fg-muted">
                {t(`${NS}.detalle.documentos.procesados`)}
              </p>
              <p className="mt-0.5 text-base font-semibold text-fg tabular-nums">
                {docs.processed}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-fg-muted">
                {t(`${NS}.detalle.documentos.omitidos`)}
              </p>
              <p className="mt-0.5 text-base font-semibold text-fg tabular-nums">
                {docs.skipped}
              </p>
            </div>
          </div>
          {docs.types_present.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-medium text-fg-muted mb-1.5">
                {t(`${NS}.detalle.documentos.tiposPresentes`)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {docs.types_present.map((ty) => (
                  <span
                    key={ty}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-surface-muted text-fg-muted"
                  >
                    {ty}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Banderas de integridad */}
      {flags.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            {t(`${NS}.detalle.documentos.banderasTitulo`)}
          </p>
          <ul role="list" className="space-y-2">
            {flags.map((f: TenantScoringIntegrityFlag, i) => (
              <li
                key={`${f.code}-${i}`}
                className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2"
                data-flag-code={f.code}
              >
                <WarningCircle
                  className="w-4 h-4 mt-0.5 shrink-0 text-danger"
                  weight="duotone"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-fg">
                      {f.doc_type}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        severityClasses(f.severity),
                      )}
                    >
                      {t(`${NS}.detalle.severidad.${f.severity}`)}
                    </span>
                  </div>
                  <p className="text-sm leading-snug text-fg-muted">
                    {f.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Observaciones */}
      {observations.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            {t(`${NS}.detalle.documentos.observacionesTitulo`)}
          </p>
          <ul role="list" className="space-y-2">
            {observations.map((o, i) => {
              const oc = obsClasses(o.severity)
              const Ico = oc.icon
              return (
                <li
                  key={`${o.code}-${i}`}
                  className={cn(
                    'flex items-start gap-2.5 rounded-lg border px-3 py-2',
                    oc.wrap,
                  )}
                >
                  <Ico
                    className={cn('w-4 h-4 mt-0.5 shrink-0', oc.color)}
                    weight="duotone"
                    aria-hidden="true"
                  />
                  <p className="min-w-0 flex-1 text-sm leading-snug text-fg">
                    {o.message}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
