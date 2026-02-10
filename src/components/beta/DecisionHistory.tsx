'use client';

import { cn } from '@/lib/utils';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { AGENT_METADATA } from '@/lib/types/beta-chat';
import type { DecisionEntry } from '@/lib/hooks/useBetaChat';

// ============================================================================
// Helpers
// ============================================================================

function formatTimestamp(date: Date): string {
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// Sub-components
// ============================================================================

interface DecisionItemProps {
  entry: DecisionEntry;
  onNavigate: (conversationId: string) => void;
}

function DecisionItem({ entry, onNavigate }: DecisionItemProps) {
  const { decision } = entry;
  const isResolved = !!decision.selectedOptionId;
  const meta = AGENT_METADATA[decision.category];
  const selectedOption = isResolved
    ? decision.options.find((o) => o.id === decision.selectedOptionId)
    : null;

  return (
    <button
      onClick={() => onNavigate(entry.conversationId)}
      className={cn(
        'w-full text-left p-3 rounded-xl',
        'border transition-colors',
        isResolved
          ? 'border-emerald-200/60 dark:border-emerald-500/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5'
          : 'border-amber-200/60 dark:border-amber-500/20 hover:bg-amber-50/50 dark:hover:bg-amber-500/5'
      )}
    >
      {/* Title + category */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[13px] font-medium text-foreground leading-tight line-clamp-2">
          {decision.title}
        </span>
        <span
          className={cn(
            'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
            `bg-${meta.color}-100 text-${meta.color}-700`,
            `dark:bg-${meta.color}-500/15 dark:text-${meta.color}-400`
          )}
        >
          {meta.label}
        </span>
      </div>

      {/* Status line */}
      {isResolved && selectedOption ? (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-[12px] text-muted-foreground truncate">
            {selectedOption.label}
          </span>
          {decision.selectedAt && (
            <span className="text-[11px] text-muted-foreground/60 shrink-0 ml-auto">
              {formatTimestamp(decision.selectedAt)}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span className="text-[12px] text-muted-foreground">
            {decision.options.length} opciones disponibles
          </span>
        </div>
      )}
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * DecisionHistory - Shows all decisions across conversations grouped by status.
 *
 * Pending decisions (amber accent) appear first, followed by resolved (green accent).
 * Clicking a decision entry switches to that conversation.
 */
export function DecisionHistory() {
  const { allDecisions, switchConversation } = useBetaChatContext();

  if (allDecisions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">
        No hay decisiones aun
      </div>
    );
  }

  const pending = allDecisions.filter((d) => !d.decision.selectedOptionId);
  const resolved = allDecisions.filter((d) => !!d.decision.selectedOptionId);

  return (
    <div className="h-full overflow-y-auto space-y-4">
      {/* Pending decisions */}
      {pending.length > 0 && (
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 px-1">
            Pendientes ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((entry) => (
              <DecisionItem
                key={`${entry.messageId}-${entry.decision.id}`}
                entry={entry}
                onNavigate={switchConversation}
              />
            ))}
          </div>
        </section>
      )}

      {/* Resolved decisions */}
      {resolved.length > 0 && (
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 px-1">
            Resueltas ({resolved.length})
          </h3>
          <div className="space-y-2">
            {resolved.map((entry) => (
              <DecisionItem
                key={`${entry.messageId}-${entry.decision.id}`}
                entry={entry}
                onNavigate={switchConversation}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
