'use client';

import { useState } from 'react';
import {
  CaretDown,
  ArrowClockwise,
  WarningCircle,
  CheckCircle,
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChartBar,
  Scales,
  ArrowsLeftRight,
  Bank,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AgentType, AgentExecutionStatus } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';
import type { Icon } from '@phosphor-icons/react';

// ============================================================================
// Icon Map
// ============================================================================

const ICON_MAP: Record<string, Icon> = {
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChartBar,
  Scales,
  ArrowsLeftRight,
  Bank,
};

// ============================================================================
// Border Color Map (left border accent)
// ============================================================================

const BORDER_LEFT_COLORS: Record<string, string> = {
  emerald: 'border-l-success',
  blue: 'border-l-primary',
  amber: 'border-l-warning',
  purple: 'border-l-border-strong',
  pink: 'border-l-border-strong',
  indigo: 'border-l-primary',
};

const ICON_COLORS: Record<string, string> = {
  emerald: 'text-success',
  blue: 'text-primary',
  amber: 'text-warning',
  purple: 'text-neutral-600 dark:text-neutral-300',
  pink: 'text-neutral-600 dark:text-neutral-300',
  indigo: 'text-primary',
};

// ============================================================================
// Mock Agent Result Summaries
// ============================================================================

const AGENT_RESULT_SUMMARIES: Record<AgentType, string> = {
  cobranza: '12 cobros activos. 9 pagados, 3 pendientes por $4.1M COP.',
  cotizador: 'Cotización de seguro lista para revisar.',
  estudio: 'Estudio del inquilino completado.',
  matching: 'Propiedades sugeridas según el perfil.',
  avaluo: 'Avalúo del inmueble listo para revisar.',
  conciliacion: 'Conciliación de pagos completada.',
  pagos: 'Pagos a propietarios procesados.',
  pipeline: '5 propiedades en portafolio. 1 vacante con 3 candidatos.',
  mantenimiento: '3 solicitudes activas. 1 urgente (fuga Apt 502).',
  documentos: '5 contratos vigentes. 1 vence en 18 dias.',
  comunicacion: '2 notificaciones programadas. 1 recordatorio enviado.',
  reportes: 'Rentabilidad neta 85.4%. +2.1% vs mes anterior.',
};

const AGENT_ERROR_MESSAGES: Record<AgentType, string> = {
  cobranza: 'No se pudo conectar con el servicio de cobros. Reintente.',
  cotizador: 'No se pudo cotizar en este momento. Reintente.',
  estudio: 'No se pudo completar el estudio del inquilino.',
  matching: 'No se pudo generar el matching de propiedades.',
  avaluo: 'No se pudo completar el avalúo del inmueble.',
  conciliacion: 'No se pudo conciliar los pagos en este momento.',
  pagos: 'No se pudieron procesar los pagos. Reintente.',
  pipeline: 'Error al consultar el pipeline de propiedades.',
  mantenimiento: 'Tiempo de espera agotado al consultar mantenimientos.',
  documentos: 'Error al acceder repositorio de documentos.',
  comunicacion: 'Fallo al preparar notificaciones. Servicio no disponible.',
  reportes: 'Error al generar el reporte. Datos incompletos.',
};

// ============================================================================
// Component
// ============================================================================

interface AgentResultCardProps {
  agentType: AgentType;
  status: AgentExecutionStatus;
  /** Duration string, e.g. "1.2s" */
  duration?: string;
  /** Error message (when status === 'failed') */
  error?: string;
  /** Callback for retry button on failed agents */
  onRetry?: () => void;
  className?: string;
}

/**
 * AgentResultCard - Collapsible inline card showing an agent's execution result.
 *
 * Header: agent icon + name + status indicator + chevron toggle.
 * Body: brief result summary (collapsed by default; error cards expanded by default).
 * Border-left accent matches agent color; error variant uses red.
 */
export function AgentResultCard({
  agentType,
  status,
  duration,
  error,
  onRetry,
  className,
}: AgentResultCardProps) {
  const { t } = useI18n();
  const isFailed = status === 'failed';
  const [isExpanded, setIsExpanded] = useState(isFailed);

  const meta = AGENT_METADATA[agentType];
  const AgentIcon = ICON_MAP[meta.icon];
  const borderColor = isFailed
    ? 'border-l-danger'
    : BORDER_LEFT_COLORS[meta.color] ?? BORDER_LEFT_COLORS.blue;
  const iconColor = isFailed
    ? 'text-danger'
    : ICON_COLORS[meta.color] ?? ICON_COLORS.blue;

  const resultText = isFailed
    ? error || AGENT_ERROR_MESSAGES[agentType]
    : AGENT_RESULT_SUMMARIES[agentType];

  return (
    <div
      className={cn(
        'border border-neutral-200/60 dark:border-border/50',
        'border-l-[3px]',
        borderColor,
        'rounded-md overflow-hidden',
        'bg-white/60 dark:bg-card/60',
        'transition-all duration-200',
        className
      )}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-label={`${meta.label}: ${isExpanded ? t('beta.agents.hideDetails') : t('beta.agents.showDetails')}`}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2',
          'text-left text-xs',
          'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30',
          'transition-colors duration-150'
        )}
      >
        {/* Agent icon */}
        {AgentIcon && (
          <AgentIcon className={cn('w-3.5 h-3.5 flex-shrink-0', iconColor)} weight="duotone" />
        )}

        {/* Agent name */}
        <span className="font-medium text-foreground flex-1 truncate">
          {meta.label}
        </span>

        {/* Status indicator */}
        {isFailed ? (
          <WarningCircle className="w-3.5 h-3.5 text-danger flex-shrink-0" weight="fill" />
        ) : (
          <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" weight="fill" />
        )}

        {/* Duration */}
        {!isFailed && duration && (
          <span className="text-[10px] text-muted-foreground">{duration}</span>
        )}

        {/* Chevron toggle */}
        <CaretDown
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground flex-shrink-0',
            'transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
          weight="bold"
        />
      </button>

      {/* Body — collapsible */}
      <div
        className={cn(
          'grid transition-all duration-200',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-2.5 pt-0.5">
            <p
              className={cn(
                'text-xs leading-relaxed',
                isFailed
                  ? 'text-danger'
                  : 'text-muted-foreground'
              )}
            >
              {resultText}
            </p>

            {/* Retry button for failed agents */}
            {isFailed && onRetry && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry();
                }}
                className={cn(
                  'mt-2 inline-flex items-center gap-1.5',
                  'px-2.5 py-1 rounded-sm',
                  'text-xs font-medium',
                  'bg-danger-soft',
                  'text-danger',
                  'border border-danger/30 border-danger/40',
                  'hover:bg-danger-soft',
                  'transition-colors duration-150'
                )}
              >
                <ArrowClockwise className="w-3 h-3" weight="bold" />
                {t('beta.agents.retry')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
