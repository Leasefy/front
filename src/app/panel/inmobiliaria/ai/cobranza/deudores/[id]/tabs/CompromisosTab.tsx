'use client'

/**
 * CompromisosTab — Phase 31 plan 31-09.
 *
 * Three sections: Planes de pago, Siniestros, Documentos legales. Read-only;
 * approval CTAs deferred to Phase 32.
 */

import * as React from 'react'

import { useI18n } from '@/lib/i18n'
import { useDebtorCompromisos } from '@/lib/hooks/cobranza/use-debtor-compromisos'

void React

interface CompromisosTabProps {
  debtorId: string
}

export function CompromisosTab({ debtorId }: CompromisosTabProps) {
  const { t, locale } = useI18n()
  const { data, isLoading, error, refetch } = useDebtorCompromisos({ debtorId })

  if (isLoading && !data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="h-24 bg-neutral-100 dark:bg-neutral-800 rounded-md animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 flex items-center justify-between">
        <p className="text-sm text-red-700 dark:text-red-400">
          {t('inmobiliaria.ai.cobranza.detail.compromisos.error')}: {error}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-sm font-medium px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
        >
          {t('inmobiliaria.ai.cobranza.detail.compromisos.errorRetry')}
        </button>
      </div>
    )
  }

  const paymentPlans = data?.paymentPlans ?? []
  const claims = data?.insuranceClaims ?? []
  const legals = data?.legalArtifacts ?? []

  if (
    paymentPlans.length === 0 &&
    claims.length === 0 &&
    legals.length === 0
  ) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.ai.cobranza.detail.compromisos.empty')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {paymentPlans.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">
            {t('inmobiliaria.ai.cobranza.detail.compromisos.paymentPlans')}
          </h3>
          <ul className="space-y-2">
            {paymentPlans.map((p) => (
              <li
                key={p.id}
                className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                    {p.payment_provider ?? '—'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                    {p.status}
                  </span>
                </div>
                <p className="text-sm mt-1 text-neutral-900 dark:text-white">
                  Total: <span className="font-mono">{p.total_due_cop}</span>
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {new Date(p.offered_at).toLocaleString(locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {claims.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">
            {t('inmobiliaria.ai.cobranza.detail.compromisos.insuranceClaims')}
          </h3>
          <ul className="space-y-2">
            {claims.map((c) => (
              <li
                key={c.id}
                className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">
                    {c.aseguradora ?? '—'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                    {c.status}
                  </span>
                </div>
                {c.policy_number && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
                    {c.policy_number}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {legals.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">
            {t('inmobiliaria.ai.cobranza.detail.compromisos.legalArtifacts')}
          </h3>
          <ul className="space-y-2">
            {legals.map((l) => (
              <li
                key={l.id}
                className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">
                    {l.kind}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                    {l.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {new Date(l.generated_at).toLocaleString(locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
