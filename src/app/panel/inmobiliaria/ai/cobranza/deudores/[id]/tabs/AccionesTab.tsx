'use client'

/**
 * AccionesTab — Phase 31 plan 31-09.
 *
 * 4 intervention CTAs (Pausar, Forzar etapa, Enviar WhatsApp, Llamar) with
 * per-action permission gating + admin gates for force-stage + manual-call.
 * Each opens its modal; success refetches detail + audit (parent's
 * onIntervention callback). Also renders an audit ribbon (last 10 entries).
 */

import * as React from 'react'
import { useState } from 'react'
import { Badge } from '@/components/ui'

import { useI18n } from '@/lib/i18n'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import { useDebtorAudit } from '@/lib/hooks/cobranza/use-debtor-audit'
import { PauseModal } from '@/components/inmobiliaria/cobranza/intervention/PauseModal'
import { ForceStageModal } from '@/components/inmobiliaria/cobranza/intervention/ForceStageModal'
import { ManualWAModal } from '@/components/inmobiliaria/cobranza/intervention/ManualWAModal'
import { ManualCallModal } from '@/components/inmobiliaria/cobranza/intervention/ManualCallModal'
import type { CarteraStage } from '@/lib/cartera'

void React

type OpenModal = 'pause' | 'forceStage' | 'manualWA' | 'manualCall' | null

interface AccionesTabProps {
  debtorId: string
  debtorName: string
  currentStage: CarteraStage
  prefill: Record<string, string>
  onIntervention: () => void
}

export function AccionesTab({
  debtorId,
  debtorName,
  currentStage,
  prefill,
  onIntervention,
}: AccionesTabProps) {
  const { t, locale } = useI18n()
  const perms = usePermissionsContextSafe()
  const isAdmin = perms?.isAdmin ?? false
  const canIntervene = perms?.canAccess('cobranza', 'intervene') ?? false
  const canForceStage = perms?.canAccess('cobranza', 'force-stage') ?? false

  const [openModal, setOpenModal] = useState<OpenModal>(null)

  const audit = useDebtorAudit({ debtorId })
  const auditEntries = (audit.data?.entries ?? []).slice(0, 10)

  const handleSuccess = () => {
    onIntervention()
    void audit.refetch()
  }

  // CTA gates per CONTEXT D-31-01..04
  const pauseEnabled = canIntervene
  const forceStageEnabled = canForceStage && isAdmin
  const manualWAEnabled = canIntervene
  const manualCallEnabled = canIntervene && isAdmin

  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
          {t('inmobiliaria.ai.cobranza.detail.acciones.title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CTACard
            label={t('inmobiliaria.ai.cobranza.detail.acciones.pause.cta')}
            disabled={!pauseEnabled}
            disabledTooltip={t(
              'inmobiliaria.ai.cobranza.detail.acciones.adminOnlyTooltip',
            )}
            onClick={() => setOpenModal('pause')}
            testId="acciones-pause"
          />
          <CTACard
            label={t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.cta')}
            disabled={!forceStageEnabled}
            disabledTooltip={t(
              'inmobiliaria.ai.cobranza.detail.acciones.adminOnlyTooltip',
            )}
            accent="amber"
            badge={t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.adminOnly')}
            onClick={() => setOpenModal('forceStage')}
            testId="acciones-force-stage"
          />
          <CTACard
            label={t('inmobiliaria.ai.cobranza.detail.acciones.manualWA.cta')}
            disabled={!manualWAEnabled}
            disabledTooltip={t(
              'inmobiliaria.ai.cobranza.detail.acciones.adminOnlyTooltip',
            )}
            onClick={() => setOpenModal('manualWA')}
            testId="acciones-manual-wa"
          />
          <CTACard
            label={t('inmobiliaria.ai.cobranza.detail.acciones.manualCall.cta')}
            disabled={!manualCallEnabled}
            disabledTooltip={t(
              'inmobiliaria.ai.cobranza.detail.acciones.adminOnlyTooltip',
            )}
            accent="amber"
            badge={t('inmobiliaria.ai.cobranza.detail.acciones.manualCall.adminOnly')}
            onClick={() => setOpenModal('manualCall')}
            testId="acciones-manual-call"
          />
        </div>
      </section>

      {/* Audit ribbon */}
      <section>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">
          {t('inmobiliaria.ai.cobranza.detail.acciones.auditTitle')}
        </h3>
        {audit.isLoading && !audit.data ? (
          <div className="space-y-1">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="h-8 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse"
              />
            ))}
          </div>
        ) : auditEntries.length === 0 ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('inmobiliaria.ai.cobranza.detail.acciones.auditEmpty')}
          </p>
        ) : (
          <ul className="space-y-1">
            {auditEntries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between text-xs px-2 py-1 rounded bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
              >
                <span className="font-mono text-fg">
                  {e.action}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {e.actor_type} · {new Date(e.occurred_at).toLocaleString(locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Modals */}
      <PauseModal
        open={openModal === 'pause'}
        onClose={() => setOpenModal(null)}
        debtorId={debtorId}
        debtorName={debtorName}
        onSuccess={handleSuccess}
      />
      <ForceStageModal
        open={openModal === 'forceStage'}
        onClose={() => setOpenModal(null)}
        debtorId={debtorId}
        debtorName={debtorName}
        currentStage={currentStage}
        onSuccess={handleSuccess}
      />
      <ManualWAModal
        open={openModal === 'manualWA'}
        onClose={() => setOpenModal(null)}
        debtorId={debtorId}
        debtorName={debtorName}
        prefill={prefill}
        onSuccess={handleSuccess}
      />
      <ManualCallModal
        open={openModal === 'manualCall'}
        onClose={() => setOpenModal(null)}
        debtorId={debtorId}
        debtorName={debtorName}
        onSuccess={handleSuccess}
      />
    </div>
  )
}

interface CTACardProps {
  label: string
  disabled: boolean
  disabledTooltip: string
  accent?: 'violet' | 'amber'
  badge?: string
  onClick: () => void
  testId: string
}

function CTACard({
  label,
  disabled,
  disabledTooltip,
  accent = 'violet',
  badge,
  onClick,
  testId,
}: CTACardProps) {
  const accentClass =
    accent === 'amber'
      ? 'hover:border-warning/50'
      : 'hover:border-primary/50'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledTooltip : undefined}
      data-testid={testId}
      className={
        'group text-left rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ' +
        accentClass
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-900 dark:text-white">
          {label}
        </span>
        {badge && (
          <Badge variant="warning" className="text-[10px]">
            {badge}
          </Badge>
        )}
      </div>
    </button>
  )
}
