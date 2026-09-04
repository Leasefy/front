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
import {
  useDebtorAudit,
  type DebtorAuditEntry,
} from '@/lib/hooks/cobranza/use-debtor-audit'
import { PauseModal } from '@/components/inmobiliaria/cobranza/intervention/PauseModal'
import { ForceStageModal } from '@/components/inmobiliaria/cobranza/intervention/ForceStageModal'
import { ManualWAModal } from '@/components/inmobiliaria/cobranza/intervention/ManualWAModal'
import { ManualCallModal } from '@/components/inmobiliaria/cobranza/intervention/ManualCallModal'
import type { CarteraStage } from '@/lib/cartera'

void React

type OpenModal = 'pause' | 'forceStage' | 'manualWA' | 'manualCall' | null

/**
 * Lo mínimo que este archivo necesita de una fila de auditoría, DERIVADO del
 * contrato generado.
 *
 * Estaba escrito a mano (`actor_role?: string | null`) porque el contrato
 * todavía no traía el campo. Ahora sí — y un campo de auditoría declarado a
 * mano es justo lo que después no avisa cuando el agente lo renombra.
 */
type ActorDeAuditoria = Pick<DebtorAuditEntry, 'actor_type' | 'actor_id' | 'actor_role'>

/**
 * La acción en palabras, no el slug.
 *
 * El renglón decía `precall.scheduled` o `force_stage` en font-mono: una
 * traza para desarrolladores en la pantalla de una inmobiliaria. El
 * vocabulario sale de los slugs REALES de `agent.audit_log` (medidos en la
 * base dev 2026-08-25: precall.scheduled ×730, dialer.call_placed ×598, …) +
 * los cuatro de las intervenciones (AUDIT_ACTIONS del agente). Un slug que no
 * conocemos se muestra crudo: es una traza, y equivocarse acá es peor que
 * verse feo.
 */
const ACCION_LABEL: Record<string, string> = {
  'precall.scheduled': 'Llamada programada',
  'dialer.call_placed': 'Llamada marcada',
  'dialer.call_skipped': 'Llamada omitida',
  'qa.scored': 'Llamada calificada (QA)',
  'followup.scheduled_voice': 'Seguimiento programado por voz',
  'cartera.cadence.planned': 'Cadencia planificada',
  'cartera.daily_report.dispatched': 'Reporte diario enviado',
  force_stage: 'Etapa forzada',
  manual_wa_send: 'WhatsApp manual enviado',
  manual_call_trigger: 'Llamada manual disparada',
  pii_reveal: 'Dato personal revelado',
  escalated_to_human: 'Escalado a una persona',
  'cobranza.memo.manual_create': 'Nota del equipo creada',
}

export function describirAccion(e: Pick<DebtorAuditEntry, 'action' | 'metadata'>): string {
  // `pause` cubre pausar Y reanudar; el payload dice cuál fue.
  if (e.action === 'pause') {
    const meta = e.metadata as { resumed?: boolean } | null | undefined
    return meta?.resumed ? 'Cobranza reanudada' : 'Cobranza pausada'
  }
  return ACCION_LABEL[e.action] ?? e.action
}

/**
 * Quién hizo la acción, para poder rastrearla.
 *
 * Antes acá salía `actor_type` a secas: «user». Eso dice la CATEGORÍA del
 * actor, no la persona — con tres administradores en una agencia, «user ·
 * 10/8/2026» no permite saber quién pausó una cobranza. El endpoint ya traía
 * `actor_id` (el email) y ahora también `actor_role`.
 *
 * Los actores que no son personas (`saas_orchestrator`, `system`) no tienen
 * email ni rol: se nombran por lo que son, no con un slug crudo.
 */
export function describirActor(
  e: ActorDeAuditoria,
  t: (k: string) => string,
): string {
  if (!e.actor_id) {
    const NS = 'inmobiliaria.ai.cobranza.detail.acciones.actor'
    if (e.actor_type === 'saas_orchestrator') return t(`${NS}.agente`)
    if (e.actor_type === 'system') return t(`${NS}.sistema`)
    // Un tipo de actor que no conocemos se muestra crudo antes que inventarle
    // un nombre: es una traza, y equivocarse acá es peor que verse feo.
    return e.actor_type
  }
  return e.actor_role ? `${e.actor_id} · ${e.actor_role}` : e.actor_id
}

interface AccionesTabProps {
  debtorId: string
  debtorName: string
  currentStage: CarteraStage
  onIntervention: () => void
}

export function AccionesTab({
  debtorId,
  debtorName,
  currentStage,
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
        <h2 className="text-sm font-semibold text-fg mb-3">
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
        <h3 className="text-sm font-semibold text-fg mb-2">
          {t('inmobiliaria.ai.cobranza.detail.acciones.auditTitle')}
        </h3>
        {audit.error && !audit.data && !audit.isLoading ? (
          /* Cargando, falló y «no hay» son tres cosas distintas: el fallo
             mostraba «Sin actividad reciente» — un vacío deshonesto sobre una
             bitácora que sí existe. */
          <div
            role="alert"
            className="rounded-md border border-warning/30 bg-warning-soft p-3 flex items-center justify-between gap-3"
          >
            <p className="text-xs text-warning">
              No pudimos cargar el historial. <span className="opacity-80">{audit.error}</span>
            </p>
            <button
              type="button"
              onClick={() => void audit.refetch()}
              className="text-xs text-warning underline shrink-0"
            >
              Reintentar
            </button>
          </div>
        ) : audit.isLoading && !audit.data ? (
          <div className="space-y-1">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="h-8 bg-surface-muted rounded animate-pulse"
              />
            ))}
          </div>
        ) : auditEntries.length === 0 ? (
          <p className="text-xs text-fg-muted">
            {t('inmobiliaria.ai.cobranza.detail.acciones.auditEmpty')}
          </p>
        ) : (
          <ul className="space-y-1">
            {auditEntries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between text-xs px-2 py-1 rounded bg-surface-muted border border-border"
              >
                <span className={ACCION_LABEL[e.action] || e.action === 'pause' ? 'text-fg' : 'font-mono text-fg-muted'}>
                  {describirAccion(e)}
                </span>
                <span className="text-fg-muted">
                  {describirActor(e, t)} ·{' '}
                  {new Date(e.occurred_at).toLocaleString(locale)}
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
        'group text-left rounded-md border border-border bg-surface px-4 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ' +
        accentClass
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-fg">
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
