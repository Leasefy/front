'use client'

import { Scales, Clock, UserGear, CurrencyDollar } from '@phosphor-icons/react'
import { formatCop } from '@/lib/data/mock-retencion'
import type { CaseBundle } from '@/lib/types/retencion'

export function CasoSidebar({ bundle }: { bundle: CaseBundle }) {
  const c = bundle.profile.header
  const guard = bundle.guard

  return (
    <aside className="rounded-lg border border-border bg-surface p-4 space-y-4">
      {/* Próxima acción */}
      <div>
        <p className="text-xs font-medium text-fg-muted mb-1">Próxima acción</p>
        <p className="text-sm font-medium text-fg">{c.nextAction.label}</p>
        {c.dueDate ? (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-warning">
            <Clock size={13} weight="duotone" /> Vence {c.dueDate.at}
          </p>
        ) : null}
      </div>

      <div className="h-px bg-border-faint" />

      {/* Datos clave */}
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="inline-flex items-center gap-1.5 text-fg-muted">
            <UserGear size={14} weight="duotone" /> Responsable
          </dt>
          <dd className="text-fg text-right">{c.responsible.name ?? c.responsible.role}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="inline-flex items-center gap-1.5 text-fg-muted">
            <CurrencyDollar size={14} weight="duotone" /> Ingreso en riesgo
          </dt>
          <dd className="text-fg text-right">{formatCop(c.monthlyIncomeAtRisk)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="inline-flex items-center gap-1.5 text-fg-muted">
            <CurrencyDollar size={14} weight="duotone" /> Comisión en riesgo
          </dt>
          <dd className="font-semibold text-fg text-right">{formatCop(c.expectedCommissionLoss)}</dd>
        </div>
      </dl>

      <div className="h-px bg-border-faint" />

      {/* Guardrails */}
      <div className="space-y-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted">
          <Scales size={14} weight="duotone" /> Guardrails
        </p>
        <ul className="space-y-1.5 text-xs">
          <GuardRow ok={guard.financialDataConsistent} label="Datos financieros consistentes" />
          <GuardRow ok={guard.retentionRecommended} label="Retención recomendada" />
          {guard.escalateLegal ? (
            <li className="inline-flex items-center gap-1.5 rounded-md bg-danger-soft px-2 py-1 text-danger">
              ⚠️ Escalar a jurídico
            </li>
          ) : null}
        </ul>
        {guard.reasons.length > 0 ? (
          <p className="text-xs text-fg-subtle">{guard.reasons.join(' · ')}</p>
        ) : null}
      </div>
    </aside>
  )
}

function GuardRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-fg-muted">
      <span className={ok ? 'text-success' : 'text-danger'}>{ok ? '✓' : '✕'}</span>
      {label}
    </li>
  )
}
