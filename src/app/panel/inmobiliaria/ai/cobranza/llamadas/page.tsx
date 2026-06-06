'use client'

/**
 * Llamadas list page — Task 1 (H21 QA fix).
 *
 * The backend exposes:
 *   GET /api/agency/{agencyId}/cobranza/calls/{callId}  — single-call detail
 *   GET /api/agency/{agencyId}/cobranza/debtors/{debtorId}/calls — per-debtor list
 *
 * There is NO agency-level cross-debtor calls list endpoint in the current
 * agent API (confirmed against agent.ts generated types — no listCobranzaCalls
 * operation exists). This page renders a clean empty state with a navigation
 * shortcut to the Deudores list where calls are accessible per debtor.
 *
 * TODO(backend): add GET /api/agency/{agencyId}/cobranza/calls (paginated,
 * filterable by outcome/date/channel) and wire a useCalls() hook here.
 */

import { PhoneCall } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { EmptyState } from '@/components/data-display/EmptyState'

function LlamadasContent() {
  const { t } = useI18n()

  return (
    <main className="p-6 lg:p-8">
      <EmptyState
        icon={PhoneCall}
        title={t('inmobiliaria.ai.cobranza.llamadas.list.empty.title')}
        description={t('inmobiliaria.ai.cobranza.llamadas.list.empty.description')}
        primaryCta={{
          label: t('inmobiliaria.ai.cobranza.llamadas.list.empty.cta'),
          href: '/panel/inmobiliaria/ai/cobranza/deudores',
        }}
      />
    </main>
  )
}

export default function LlamadasListPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <LlamadasContent />
    </PageGuard>
  )
}
