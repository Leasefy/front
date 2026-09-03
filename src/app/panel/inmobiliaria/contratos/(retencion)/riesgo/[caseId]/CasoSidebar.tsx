'use client'

import { Scales, Clock, UserGear, CurrencyDollar } from '@phosphor-icons/react'
import { formatCop } from '@/lib/data/mock-retencion'
import type { CaseBundle } from '@/lib/types/retencion'

export function CasoSidebar({ bundle }: { bundle: CaseBundle }) {
  const c = bundle.profile.header
  const guard = bundle.guard

  return (
    <aside className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4 space-y-4">
      {/* Próxima acción */}
      <div>
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Próxima acción</p>
        <p className="text-sm font-medium text-neutral-900 dark:text-white">{c.nextAction.label}</p>
        {c.dueDate ? (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <Clock size={13} weight="duotone" /> Vence {c.dueDate.at}
          </p>
        ) : null}
      </div>

      <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

      {/* Datos clave */}
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="inline-flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
            <UserGear size={14} weight="duotone" /> Responsable
          </dt>
          <dd className="text-neutral-900 dark:text-white text-right">{c.responsible.name ?? c.responsible.role}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="inline-flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
            <CurrencyDollar size={14} weight="duotone" /> Ingreso en riesgo
          </dt>
          <dd className="text-neutral-900 dark:text-white text-right">{formatCop(c.monthlyIncomeAtRisk)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="inline-flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
            <CurrencyDollar size={14} weight="duotone" /> Comisión en riesgo
          </dt>
          <dd className="font-semibold text-neutral-900 dark:text-white text-right">{formatCop(c.expectedCommissionLoss)}</dd>
        </div>
      </dl>

      <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

      {/* Guardrails */}
      <div className="space-y-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          <Scales size={14} weight="duotone" /> Guardrails
        </p>
        <ul className="space-y-1.5 text-xs">
          <GuardRow ok={guard.financialDataConsistent} label="Datos financieros consistentes" />
          <GuardRow ok={guard.retentionRecommended} label="Retención recomendada" />
          {guard.escalateLegal ? (
            <li className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 dark:bg-rose-950/30 px-2 py-1 text-rose-700 dark:text-rose-300">
              ⚠️ Escalar a jurídico
            </li>
          ) : null}
        </ul>
        {guard.reasons.length > 0 ? (
          <p className="text-xs text-neutral-400">{guard.reasons.join(' · ')}</p>
        ) : null}
      </div>
    </aside>
  )
}

function GuardRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
      <span className={ok ? 'text-emerald-500' : 'text-rose-500'}>{ok ? '✓' : '✕'}</span>
      {label}
    </li>
  )
}
