'use client';

import { useState, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  ArrowClockwise,
  Spinner,
  CheckSquare,
  ArrowsLeftRight,
  Bank,
  CurrencyDollar,
  WarningCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type {
  ActionProposal,
  ActionProposalStatus,
  ActionProposalColaType,
  ActionProposalAction,
} from '@/lib/types/beta-chat';
import { isNegativeAction } from '@/lib/types/beta-chat';

// ── Label helpers ─────────────────────────────────────────────────────────────

const COLA_LABELS: Record<ActionProposalColaType, string> = {
  conciliacion: 'Conciliación',
  pagos: 'Pagos',
  cobranza: 'Cobranza',
};

const ACTION_LABELS: Record<ActionProposalAction, string> = {
  confirm: 'Confirmar',
  reject: 'Rechazar',
  approve: 'Aprobar',
  claim: 'Reclamar',
  resolve: 'Resolver',
};

const COLA_ICON: Record<ActionProposalColaType, React.ElementType> = {
  conciliacion: ArrowsLeftRight,
  pagos: Bank,
  cobranza: CurrencyDollar,
};

const COLA_BORDER: Record<ActionProposalColaType, string> = {
  conciliacion: 'border-l-blue-400 dark:border-l-blue-500',
  pagos: 'border-l-emerald-400 dark:border-l-emerald-500',
  cobranza: 'border-l-amber-400 dark:border-l-amber-500',
};

const COLA_ICON_COLOR: Record<ActionProposalColaType, string> = {
  conciliacion: 'text-blue-500 dark:text-blue-400',
  pagos: 'text-emerald-500 dark:text-emerald-400',
  cobranza: 'text-amber-500 dark:text-amber-400',
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ActionProposalCardProps {
  /** The proposal data (immutable backend fields + mutable front-only status). */
  proposal: ActionProposal;
  /**
   * Called when the operator clicks Confirmar. The card manages its own loading
   * / error state; the parent only needs to handle success (update the proposal
   * in conversation state).
   */
  onConfirm: (workItemId: string, reason?: string) => Promise<void>;
  /** Called when the operator dismisses the proposal (UI-only, no network call). */
  onDiscard: (workItemId: string) => void;
  className?: string;
}

/**
 * ActionProposalCard — inline chat card for F5 human-in-the-loop confirmations.
 *
 * Lifecycle:
 *   pending → (operator clicks Confirmar) → confirming → executed | error
 *   pending → (operator clicks Descartar) → discarded
 *
 * For negative actions (reject / resolve) an optional reason input appears
 * before the confirm button becomes active.
 */
export function ActionProposalCard({
  proposal,
  onConfirm,
  onDiscard,
  className,
}: ActionProposalCardProps) {
  const { workItemId, colaType, action, resumen, status } = proposal;

  const [reason, setReason] = useState(proposal.reason ?? '');
  const [localStatus, setLocalStatus] = useState<ActionProposalStatus>(status);
  const [localError, setLocalError] = useState<string | undefined>(proposal.error);
  // We only need a boolean flag (did the execute succeed?) — the raw result
  // payload is not displayed; only its presence triggers the success message.
  const [localResult, setLocalResult] = useState<boolean>(Boolean(proposal.result));

  const isNegative = isNegativeAction(action);
  const ColaIcon = COLA_ICON[colaType];
  const borderColor = COLA_BORDER[colaType];
  const iconColor = COLA_ICON_COLOR[colaType];

  const handleConfirm = useCallback(async () => {
    if (localStatus !== 'pending' && localStatus !== 'error') return;
    setLocalStatus('confirming');
    setLocalError(undefined);
    try {
      await onConfirm(workItemId, isNegative && reason.trim() ? reason.trim() : undefined);
      setLocalResult(true);
      setLocalStatus('executed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al ejecutar la acción';
      setLocalError(msg);
      setLocalStatus('error');
    }
  }, [localStatus, onConfirm, workItemId, isNegative, reason]);

  const handleDiscard = useCallback(() => {
    setLocalStatus('discarded');
    onDiscard(workItemId);
  }, [onDiscard, workItemId]);

  const isTerminal = localStatus === 'executed' || localStatus === 'discarded';
  const isConfirming = localStatus === 'confirming';

  return (
    <div
      className={cn(
        'border border-neutral-200/60 dark:border-border/50',
        'border-l-[3px]',
        borderColor,
        'rounded-lg overflow-hidden',
        'bg-white/60 dark:bg-card/60',
        'transition-all duration-200',
        isTerminal && 'opacity-60',
        className,
      )}
      role="region"
      aria-label={`Propuesta de acción: ${ACTION_LABELS[action]} en ${COLA_LABELS[colaType]}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <ColaIcon className={cn('w-3.5 h-3.5 flex-shrink-0', iconColor)} weight="duotone" />

        <span className="text-xs font-medium text-foreground flex-1 truncate">
          {COLA_LABELS[colaType]}
          <span className="mx-1 text-muted-foreground">·</span>
          <span className="font-normal text-muted-foreground">{ACTION_LABELS[action]}</span>
        </span>

        {/* Terminal status badge */}
        {localStatus === 'executed' && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3" weight="fill" />
            Ejecutado
          </span>
        )}
        {localStatus === 'discarded' && (
          <span className="text-[10px] text-muted-foreground">Descartado</span>
        )}
      </div>

      {/* Body — hidden once discarded */}
      {localStatus !== 'discarded' && (
        <div className="px-3 pb-3 space-y-2.5">
          {/* Resumen */}
          <p className="text-xs leading-relaxed text-muted-foreground">{resumen}</p>

          {/* Success result */}
          {localStatus === 'executed' && localResult && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" weight="fill" />
              <span>Acción completada correctamente.</span>
            </div>
          )}

          {/* Error message */}
          {localStatus === 'error' && localError && (
            <div className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
              <WarningCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" weight="fill" />
              <span>{localError}</span>
            </div>
          )}

          {/* Optional reason input for negative actions */}
          {isNegative && !isTerminal && (
            <div>
              <label
                htmlFor={`reason-${workItemId}`}
                className="block text-[10px] font-medium text-muted-foreground mb-1"
              >
                Motivo <span className="font-normal">(opcional)</span>
              </label>
              <input
                id={`reason-${workItemId}`}
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isConfirming}
                placeholder="Ej. Monto incorrecto, documentación incompleta…"
                className={cn(
                  'w-full text-xs px-2.5 py-1.5 rounded-md',
                  'border border-neutral-200 dark:border-border',
                  'bg-white dark:bg-neutral-900',
                  'text-foreground placeholder:text-muted-foreground/60',
                  'focus:outline-none focus:ring-1 focus:ring-blue-500',
                  'disabled:opacity-50',
                )}
              />
            </div>
          )}

          {/* Actions row — shown while pending or error */}
          {!isTerminal && (
            <div className="flex items-center gap-2 pt-0.5">
              {/* Confirm button */}
              <button
                type="button"
                onClick={() => { void handleConfirm(); }}
                disabled={isConfirming}
                aria-label={`Confirmar: ${ACTION_LABELS[action]}`}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md',
                  'text-xs font-medium',
                  'bg-neutral-900 dark:bg-neutral-100',
                  'text-white dark:text-neutral-900',
                  'hover:bg-neutral-700 dark:hover:bg-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors duration-150',
                )}
              >
                {isConfirming ? (
                  <Spinner className="w-3 h-3 animate-spin" weight="bold" />
                ) : localStatus === 'error' ? (
                  <ArrowClockwise className="w-3 h-3" weight="bold" />
                ) : (
                  <CheckCircle className="w-3 h-3" weight="bold" />
                )}
                {isConfirming
                  ? 'Ejecutando…'
                  : localStatus === 'error'
                    ? 'Reintentar'
                    : 'Confirmar'}
              </button>

              {/* Discard button */}
              <button
                type="button"
                onClick={handleDiscard}
                disabled={isConfirming}
                aria-label="Descartar propuesta"
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md',
                  'text-xs font-medium',
                  'text-muted-foreground',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  'hover:text-foreground',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors duration-150',
                )}
              >
                <XCircle className="w-3 h-3" weight="bold" />
                Descartar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
