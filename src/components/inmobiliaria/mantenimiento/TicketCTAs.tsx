'use client'

/**
 * TicketCTAs.tsx — Phase 7 plan 07-04 (DASH-03)
 *
 * The 5 maintenance CTAs (asignar / pedir-info / solicitar-aprobación /
 * escalar-emergencia / cerrar-no-procede), gated by the 16-state machine and
 * wired to the hook's mock mutators (mock-first — no backend).
 *
 * GATING (threat T-07-01 tampering): a CTA is `disabled` unless the current
 * `estado` is an allowed ORIGIN for that action. The origins are the SHARED,
 * CANONICAL source of truth `CTA_ALLOWED_FROM` exported by 07-01
 * (`@/lib/types/mantenimiento`) — this component IMPORTS it and never hardcodes a
 * local set (C7-04). `MAINTENANCE_TERMINAL_STATES` is likewise imported.
 *
 * ⚠️ Deviation note (Rule 3 — 00-PLAN-CORRECTIONS prevails): the 07-04 plan's
 * Task 2 prose listed broader per-CTA origin sets and a local `ALLOWED_FROM`/
 * `TERMINAL` constant. C7-04 supersedes that: import the canonical map instead so
 * the gating stays aligned with the backend state machine (P1-8). Hence e.g.
 * `asignar` is enabled only from `proveedor_sugerido`, and `cerrar` only from
 * `resuelto`.
 *
 * FENCE-04 (threat T-07-02): `cerrar-no-procede` never calls `onCerrar` directly —
 * the first click opens a confirmation Dialog; only its "confirm" button fires
 * `onCerrar`. The Dialog is rendered CONTROLLED so the confirmation gate is
 * deterministic and testable.
 *
 * i18n: canonical C7-03 keys — `…cta.asignar` / `…cta.pedirInfo` /
 * `…cta.solicitarAprobacion` / `…cta.escalarEmergencia` (strings) and the nested
 * `…cta.cerrar.{label,confirmTitle,confirmDesc,confirm,cancel}`.
 *
 * Presentational: all mutators arrive via props (page.tsx wires the hook).
 */

import { useState } from 'react'
import { UserPlus, ChatCircleDots, SealCheck, WarningOctagon, XCircle } from '@phosphor-icons/react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import { useI18n } from '@/lib/i18n'
import {
  CTA_ALLOWED_FROM,
  MAINTENANCE_TERMINAL_STATES,
  type MaintenanceTicketState,
} from '@/lib/types/mantenimiento'

type CtaAction = keyof typeof CTA_ALLOWED_FROM // 'asignar'|'pedirInfo'|'solicitarAprobacion'|'escalarEmergencia'|'cerrar'

export interface TicketCTAsProps {
  estado: MaintenanceTicketState
  onAsignar: () => void
  onPedirInfo: () => void
  onSolicitarAprobacion: () => void
  onEscalar: () => void
  onCerrar: () => void
  isBusy?: boolean
  /**
   * Por qué NINGUNA de las cinco acciones se puede ejecutar todavía.
   *
   * Cuando viene, los cinco botones quedan apagados y se muestra el motivo
   * arriba. Es la única forma honesta de tener acá botones que no tienen a
   * dónde escribir: el micro sirve estos tickets sólo por GET y el estado vive
   * en el back detrás de un rail S2S que el navegador no puede usar. Un botón
   * que sólo cambia el estado local afirma un hecho que no pasó — que es
   * exactamente lo que hacían.
   */
  motivoDeshabilitado?: string
}

const ROOT = 'inmobiliaria.ai.mantenimiento.cta'

/** A CTA is doable iff the current estado is an allowed origin AND not terminal. */
function canDo(action: CtaAction, estado: MaintenanceTicketState): boolean {
  if (MAINTENANCE_TERMINAL_STATES.includes(estado)) return false
  return CTA_ALLOWED_FROM[action].includes(estado)
}

export function TicketCTAs({
  estado,
  onAsignar,
  onPedirInfo,
  onSolicitarAprobacion,
  onEscalar,
  onCerrar,
  isBusy = false,
  motivoDeshabilitado,
}: TicketCTAsProps) {
  const { t } = useI18n()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const bloqueado = Boolean(motivoDeshabilitado)
  const disabled = (action: CtaAction) =>
    bloqueado || isBusy || !canDo(action, estado)

  return (
    <div className="flex flex-col gap-2">
      {motivoDeshabilitado && (
        <p
          data-testid="cta-motivo-deshabilitado"
          className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-fg-muted"
        >
          {motivoDeshabilitado}
        </p>
      )}
      <Button
        data-testid="cta-asignar"
        variant="default"
        size="sm"
        hideArrow
        disabled={disabled('asignar')}
        aria-disabled={disabled('asignar')}
        onClick={onAsignar}
      >
        <UserPlus size={16} weight="duotone" aria-hidden="true" />
        {t(`${ROOT}.asignar`)}
      </Button>

      <Button
        data-testid="cta-pedir-info"
        variant="outline"
        size="sm"
        disabled={disabled('pedirInfo')}
        aria-disabled={disabled('pedirInfo')}
        onClick={onPedirInfo}
      >
        <ChatCircleDots size={16} weight="duotone" aria-hidden="true" />
        {t(`${ROOT}.pedirInfo`)}
      </Button>

      <Button
        data-testid="cta-solicitar-aprobacion"
        variant="secondary"
        size="sm"
        disabled={disabled('solicitarAprobacion')}
        aria-disabled={disabled('solicitarAprobacion')}
        onClick={onSolicitarAprobacion}
      >
        <SealCheck size={16} weight="duotone" aria-hidden="true" />
        {t(`${ROOT}.solicitarAprobacion`)}
      </Button>

      <Button
        data-testid="cta-escalar"
        variant="destructive"
        size="sm"
        disabled={disabled('escalarEmergencia')}
        aria-disabled={disabled('escalarEmergencia')}
        onClick={onEscalar}
      >
        <WarningOctagon size={16} weight="duotone" aria-hidden="true" />
        {t(`${ROOT}.escalarEmergencia`)}
      </Button>

      {/* cerrar-no-procede — FENCE-04: opens a confirmation Dialog; never fires onCerrar directly */}
      <Button
        data-testid="cta-cerrar"
        variant="ghost"
        size="sm"
        disabled={disabled('cerrar')}
        aria-disabled={disabled('cerrar')}
        onClick={() => {
          if (disabled('cerrar')) return
          setConfirmOpen(true)
        }}
      >
        <XCircle size={16} weight="duotone" aria-hidden="true" />
        {t(`${ROOT}.cerrar.label`)}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent data-testid="cta-cerrar-dialog">
          <DialogHeader>
            <DialogTitle>{t(`${ROOT}.cerrar.confirmTitle`)}</DialogTitle>
            <DialogDescription>{t(`${ROOT}.cerrar.confirmDesc`)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              data-testid="cta-cerrar-cancel"
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
            >
              {t(`${ROOT}.cerrar.cancel`)}
            </Button>
            <Button
              data-testid="cta-cerrar-confirm"
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirmOpen(false)
                onCerrar()
              }}
            >
              {t(`${ROOT}.cerrar.confirm`)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
