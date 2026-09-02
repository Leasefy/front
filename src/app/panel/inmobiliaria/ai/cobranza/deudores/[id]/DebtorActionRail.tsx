'use client'

/**
 * DebtorActionRail — vista de caso (visión #14), zona DERECHA "Recomendación".
 *
 * Renders:
 *  - "Próxima acción programada" card — the EXISTING nextAction from the
 *    detail header (canal + hora + plantilla), with a plain-language "Por qué"
 *    derived from the stage cadence. No invented AI recommendations — only
 *    what the backend already schedules.
 *  - "Acciones rápidas" — the same 4 RBAC-gated interventions as AccionesTab
 *    (Pausar / Forzar etapa / WhatsApp / Llamada) re-using the existing
 *    intervention modals + permission gates (D-31-01..04), plus the
 *    escalations link.
 *
 * Own modal instances (distinct rail-* testids) — the Acciones tab keeps its
 * full version with the audit ribbon.
 */

import * as React from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Button, Badge } from '@/components/ui'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import { stageDisplayName } from '@/lib/cartera'
import { channelLabel } from '@/lib/cobranza/call-vocab'
import type { DebtorDetailResponse } from '@/lib/hooks/cobranza/use-debtor-detail'
import { PauseModal } from '@/components/inmobiliaria/cobranza/intervention/PauseModal'
import { ForceStageModal } from '@/components/inmobiliaria/cobranza/intervention/ForceStageModal'
import { ManualWAModal } from '@/components/inmobiliaria/cobranza/intervention/ManualWAModal'
import { ManualCallModal } from '@/components/inmobiliaria/cobranza/intervention/ManualCallModal'

void React

type OpenModal = 'pause' | 'reanudar' | 'forceStage' | 'manualWA' | 'manualCall' | null

const NS = 'inmobiliaria.ai.cobranza'

interface DebtorActionRailProps {
  data: DebtorDetailResponse | null
  debtorId: string
  debtorName: string
  onIntervention: () => void
}

/** Future-aware relative time (the sidebar's old formatter — moved here with
 * the next-action card). cartera.relativeTime is past-only. */
function formatRelative(iso: string, now: number, locale: string): string {
  const diffMs = new Date(iso).getTime() - now
  const isFuture = diffMs >= 0
  const absMs = Math.abs(diffMs)
  const mins = Math.floor(absMs / 60_000)
  if (mins < 1) return locale === 'es' ? 'ahora mismo' : 'just now'
  if (mins < 60) {
    return isFuture
      ? `${locale === 'es' ? 'en' : 'in'} ${mins}min`
      : `${locale === 'es' ? 'hace' : 'ago'} ${mins}min`
  }
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hrs < 24) {
    return isFuture
      ? `${locale === 'es' ? 'en' : 'in'} ${hrs}h ${remMins}m`
      : `${locale === 'es' ? 'hace' : 'ago'} ${hrs}h`
  }
  const days = Math.floor(hrs / 24)
  return isFuture
    ? `${locale === 'es' ? 'en' : 'in'} ${days}d`
    : `${locale === 'es' ? 'hace' : 'ago'} ${days}d`
}

function formatPlannedTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale === 'es' ? 'es-CO' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function DebtorActionRail({
  data,
  debtorId,
  debtorName,
  onIntervention,
}: DebtorActionRailProps) {
  const { t, locale } = useI18n()
  const perms = usePermissionsContextSafe()
  const isAdmin = perms?.isAdmin ?? false
  const canIntervene = perms?.canAccess('cobranza', 'intervene') ?? false
  const canForceStage = perms?.canAccess('cobranza', 'force-stage') ?? false

  const [openModal, setOpenModal] = useState<OpenModal>(null)

  // 30s ticker — relative time here has minute resolution (no PII countdown).
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const currentStage = data?.currentStage ?? 'S0'
  const nextAction = data?.sidebar?.nextAction ?? null
  const stageName = stageDisplayName(currentStage, locale)
  // "Por qué" — simple derived copy: the action comes from the stage cadence.
  // No backend recommendation text exists, so we do not invent one.
  const whyText =
    locale === 'es'
      ? `Cadencia de la etapa ${stageName}`
      : `${stageName} stage cadence`

  /** La ficha ya muestra «Pausado · En pausa hasta …» con este mismo dato. */
  const estaPausado = Boolean(data?.isPaused)

  // Same RBAC gates as AccionesTab (CONTEXT D-31-01..04).
  const pauseEnabled = canIntervene
  const forceStageEnabled = canForceStage && isAdmin
  const manualWAEnabled = canIntervene
  const manualCallEnabled = canIntervene && isAdmin

  const handleSuccess = () => {
    setOpenModal(null)
    onIntervention()
  }

  return (
    <div className="space-y-4">
      {/* Zone eyebrow — brand dot + uppercase (único uppercase permitido, §4) */}
      <h2 className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-[2px] bg-primary shrink-0"
        />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t(`${NS}.detalle.recomendacion`)}
        </span>
      </h2>

      {/* Próxima acción programada */}
      <section
        className="rounded-xl border border-border bg-surface p-4"
        data-testid="rail-next-action"
      >
        <h3 className="text-sm font-semibold text-fg">
          {t(`${NS}.detalle.proximaAccionTitulo`)}
        </h3>
        {nextAction ? (
          <>
            <div className="mt-2 space-y-1">
              <p className="text-sm font-medium text-fg">
                {/* «Voz», no «voice» con capitalize. */}
                {channelLabel(nextAction.channel)}
              </p>
              <p className="text-xs text-primary tabular-nums">
                {formatPlannedTime(nextAction.plannedFor, locale)} ·{' '}
                {formatRelative(nextAction.plannedFor, now, locale)}
              </p>
              {nextAction.templateName && (
                <p className="text-xs text-fg-muted">
                  {nextAction.templateName}
                </p>
              )}
            </div>
            {/* Por qué — hairline-separated quiet block */}
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-medium text-fg-muted">
                {t(`${NS}.detalle.porQue`)}
              </p>
              <p className="mt-0.5 text-sm leading-snug text-fg-muted">
                {whyText}
              </p>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-fg-muted">
            {t(`${NS}.detail.sidebar.noNextAction`)}
          </p>
        )}
      </section>

      {/* Acciones rápidas */}
      <section
        className="rounded-xl border border-border bg-surface p-4"
        data-testid="rail-quick-actions"
      >
        <h3 className="text-sm font-semibold text-fg">
          {t(`${NS}.detalle.accionesRapidas`)}
        </h3>
        <div className="mt-3 space-y-2">
          {/*
            Pausado, la acción es REANUDAR. Antes decía «Pausar cobranza» tanto
            si el deudor estaba en pausa como si no, y no había ninguna otra
            puerta: quien se equivocaba de fecha dejaba al agente detenido sobre
            ese caso hasta que la fecha pasara sola.
          */}
          {estaPausado ? (
            <RailAction
              label={t(`${NS}.detail.acciones.resume.cta`)}
              disabled={!pauseEnabled}
              disabledTooltip={t(`${NS}.detail.acciones.adminOnlyTooltip`)}
              onClick={() => setOpenModal('reanudar')}
              testId="rail-resume"
            />
          ) : (
            <RailAction
              label={t(`${NS}.detail.acciones.pause.cta`)}
              disabled={!pauseEnabled}
              disabledTooltip={t(`${NS}.detail.acciones.adminOnlyTooltip`)}
              onClick={() => setOpenModal('pause')}
              testId="rail-pause"
            />
          )}
          <RailAction
            label={t(`${NS}.detail.acciones.forceStage.cta`)}
            disabled={!forceStageEnabled}
            disabledTooltip={t(`${NS}.detail.acciones.adminOnlyTooltip`)}
            badge={t(`${NS}.detail.acciones.forceStage.adminOnly`)}
            onClick={() => setOpenModal('forceStage')}
            testId="rail-force-stage"
          />
          <RailAction
            label={t(`${NS}.detail.acciones.manualWA.cta`)}
            disabled={!manualWAEnabled}
            disabledTooltip={t(`${NS}.detail.acciones.adminOnlyTooltip`)}
            onClick={() => setOpenModal('manualWA')}
            testId="rail-manual-wa"
          />
          <RailAction
            label={t(`${NS}.detail.acciones.manualCall.cta`)}
            disabled={!manualCallEnabled}
            disabledTooltip={t(`${NS}.detail.acciones.adminOnlyTooltip`)}
            badge={t(`${NS}.detail.acciones.manualCall.adminOnly`)}
            onClick={() => setOpenModal('manualCall')}
            testId="rail-manual-call"
          />
        </div>

        {/* Escalar → cola de escalaciones */}
        <div className="mt-3 pt-3 border-t border-border">
          <Button asChild variant="link" size="sm" hideArrow className="px-0 h-auto">
            <Link
              href="/panel/inmobiliaria/ai/cobranza/escalaciones"
              data-testid="rail-escalate-link"
              className="group gap-1.5"
            >
              {t(`${NS}.escalaciones.pageTitle`)}
              <ArrowRight
                className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
          </Button>
        </div>
      </section>

      {/* Modals — own instances; success bubbles up to refetch detail */}
      <PauseModal
        modo="reanudar"
        open={openModal === 'reanudar'}
        onClose={() => setOpenModal(null)}
        debtorId={debtorId}
        debtorName={debtorName}
        onSuccess={onIntervention}
      />
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

interface RailActionProps {
  label: string
  disabled: boolean
  disabledTooltip: string
  badge?: string
  onClick: () => void
  testId: string
}

function RailAction({
  label,
  disabled,
  disabledTooltip,
  badge,
  onClick,
  testId,
}: RailActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledTooltip : undefined}
      data-testid={testId}
      className="w-full flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-left transition-colors hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none"
    >
      <span className="text-sm font-medium text-fg">
        {label}
      </span>
      {badge && (
        <Badge variant="warning" className="shrink-0 text-xs">
          {badge}
        </Badge>
      )}
    </button>
  )
}
