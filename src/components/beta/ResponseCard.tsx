'use client';

import {
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChartBar,
  ListChecks,
  CheckCircle,
  GearSix,
  Buildings,
  ArrowRight,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { Button, Badge } from '@/components/ui';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ResponseMeta, ResponseAction } from '@/lib/types/beta-chat';
import { entidadDeLaIntencion, type IntencionDelChat } from '@/lib/chat/acciones-del-hilo';
import { AGENT_METADATA } from '@/lib/types/beta-chat';
import { MarkdownRenderer } from './MarkdownRenderer';

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
  ListChecks,
  CheckCircle,
  GearSix,
  Buildings,
};

// ============================================================================
// Color Maps
// ============================================================================

const AGENT_DOT_COLORS: Record<string, string> = {
  emerald: 'bg-success',
  blue: 'bg-primary',
  amber: 'bg-warning',
  purple: 'bg-neutral-100 dark:bg-neutral-800',
  pink: 'bg-danger',
  indigo: 'bg-primary',
};

// ============================================================================
// Types
// ============================================================================

interface ResponseCardProps {
  meta: ResponseMeta;
  content: string;
  /** El turno del micro: tocar una sugerencia sobre una entidad se le cuenta al cerebro. */
  turnoId?: string;
  isStreaming?: boolean;
  streamingContent?: string;
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

function TypeBadge({ type }: { type: 'informative' | 'actionable' }) {
  const { t } = useI18n();

  const isActionable = type === 'actionable';

  return (
    <Badge
      variant={isActionable ? 'default' : 'secondary'}
      className="gap-1 px-2 py-0.5 text-[11px] font-medium leading-none shrink-0"
    >
      {isActionable && (
        <ArrowRight className="w-2.5 h-2.5" weight="bold" />
      )}
      {isActionable
        ? t('beta.response.actionable')
        : t('beta.response.informative')}
    </Badge>
  );
}

/**
 * Una acción sugerida es un MENSAJE DE LA PERSONA — nunca un enlace.
 *
 * ── Historia ───────────────────────────────────────────────────────────────
 * Nico, 2026-08-27: «Todas estas acciones deben verse reflejadas en el chat,
 * porque para eso es ese chat, no para que lo lleves a otro lado». Después se
 * volvió a navegar cuando la acción tenía pantalla («Ver inmuebles
 * disponibles» dejaba ~25 s esperando al modelo). Nico, 23-09 (22:51), con la
 * captura de «Ver contrato 24» y «Gestionar cobranza de Mateo Pérez»: «¿Por
 * qué las acciones siguen sacando fuera del chat? … ya te había dicho que sí
 * para todas las acciones.»
 *
 * Ahora el botón manda su texto como mensaje de la persona CON su intención
 * (`action.intencion`, que el micro pega cuando la lee sin duda) y el micro
 * lo contesta por su camino directo —la ficha del back, ~2 s— sin el bucle
 * largo del modelo. Ya no existe `href`: no hay rama que navegue.
 */
function ActionButton({
  action,
  onAsk,
  disabled,
}: {
  action: ResponseAction;
  onAsk: (prompt: string, intencion?: IntencionDelChat) => void;
  disabled: boolean;
}) {
  const ActionIcon = ICON_MAP[action.icon];
  // primary → DS primary pill (drops the old mono-uppercase anti-pattern);
  // secondary → outline; ghost → ghost.
  const variant =
    action.variant === 'primary' ? 'default' : action.variant === 'secondary' ? 'outline' : 'ghost';

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      hideArrow
      disabled={disabled}
      onClick={() => onAsk(action.prompt ?? action.label, action.intencion)}
      className="gap-1.5 rounded-md shrink-0"
    >
      {ActionIcon && <ActionIcon className="w-3.5 h-3.5" weight="duotone" />}
      {action.label}
    </Button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ResponseCard - Rich result card for agent responses.
 *
 * Displays structured agent analysis results with:
 * - Header with agent color dot, title, and response type badge
 * - Summary line
 * - Markdown-rendered content area
 * - Actionable buttons row (primary/secondary/ghost variants)
 *
 * Clean minimal card with subtle border and structured layout.
 */
export function ResponseCard({
  meta,
  content,
  isStreaming = false,
  streamingContent,
  turnoId,
  className,
}: ResponseCardProps) {
  // El chat es el destino de estas acciones, así que la tarjeta habla con él
  // directamente en vez de pedirle al padre que le pase un callback: vive
  // dentro del provider, y hacerlo prop obligaba a cablearlo en cada sitio
  // donde se monta una tarjeta.
  const { sendMessage, isThinking, isStreaming: streamingTurno, isAgentsRunning, anotarTarjetaAbierta } =
    useBetaChatContext();
  const preguntar = (texto: string, intencion?: IntencionDelChat) => {
    const entidad = entidadDeLaIntencion(intencion);
    if (entidad) anotarTarjetaAbierta(turnoId, entidad);
    sendMessage(texto, { intencion: intencion ?? null });
  };
  const ocupado = isThinking || streamingTurno || isAgentsRunning;

  const agentColor = meta.primaryAgent
    ? AGENT_METADATA[meta.primaryAgent]?.color ?? 'indigo'
    : 'indigo';

  const dotColor = AGENT_DOT_COLORS[agentColor] ?? AGENT_DOT_COLORS.indigo;

  const displayContent = isStreaming && streamingContent
    ? streamingContent
    : content;

  const hasActions = meta.actions && meta.actions.length > 0;

  return (
    <div
      className={cn(
        'w-full rounded-lg overflow-hidden',
        'bg-white dark:bg-neutral-900',
        'border border-neutral-200 dark:border-neutral-800',
        'animate-fade-in-up',
        className
      )}
      style={{ animationDuration: '400ms', animationFillMode: 'both' }}
    >
      {/* Card header */}
      <div className="px-5 pt-4 pb-0">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          {/* Left: dot + title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn('w-2 h-2 rounded-full shrink-0', dotColor)} />
            <h3 className="text-[15px] font-semibold text-foreground truncate">
              {meta.title}
            </h3>
          </div>

          {/* Right: type badge */}
          <TypeBadge type={meta.type} />
        </div>

        {/* Summary */}
        {meta.summary && (
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-3 pl-[18px]">
            {meta.summary}
          </p>
        )}
      </div>

      {/* Content area */}
      <div className="px-5 pb-4">
        <div
          className={cn(
            'rounded-lg',
            'bg-neutral-50 dark:bg-neutral-800/40',
            'border border-neutral-100 dark:border-neutral-800',
            'px-4 py-3',
            // Mismo cuerpo que la respuesta simple (Nico: «el texto que se
            // responde en 16px»), para que no cambie de tamaño según venga
            // en tarjeta o en burbuja.
            'text-[16px] leading-[1.6]'
          )}
        >
          <MarkdownRenderer
            content={displayContent}
            isStreaming={isStreaming}
          />
        </div>
      </div>

      {/* Action buttons row */}
      {hasActions && (
        <div
          className={cn(
            'px-5 pb-4 pt-0',
            'flex flex-wrap items-center gap-2'
          )}
        >
          {meta.actions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              onAsk={preguntar}
              disabled={ocupado}
            />
          ))}
        </div>
      )}
    </div>
  );
}
