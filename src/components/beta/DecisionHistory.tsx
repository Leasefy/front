'use client';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { DecisionHistorySkeleton } from './BetaSkeletons';
import { AGENT_METADATA } from '@/lib/types/beta-chat';
import type { DecisionEntry } from '@/lib/hooks/useBetaChat';

// ============================================================================
// Static color lookup for category badges (Tailwind requires static classes)
// ============================================================================

const CATEGORY_BADGE: Record<string, string> = {
  emerald: 'bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70] dark:bg-[#2C7A53]/15 dark:text-[#2C7A53]',
  blue: 'bg-[#EEF1FF] text-[#1A40FF] dark:bg-[#1A40FF]/15 dark:text-[#5570FF] dark:bg-[#1A40FF]/15 dark:text-[#1A40FF]',
  amber: 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F] dark:bg-[#B7791F]/15 dark:text-[#B7791F]',
  purple: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:bg-neutral-100 dark:bg-neutral-800/15 dark:text-neutral-600 dark:text-neutral-300',
  pink: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:bg-neutral-100 dark:bg-neutral-800/15 dark:text-neutral-600 dark:text-neutral-300',
  indigo: 'bg-[#EEF1FF] text-[#1A40FF] dark:bg-[#1A40FF]/15 dark:text-[#5570FF] dark:bg-[#1A40FF]/15 dark:text-[#1A40FF]',
};

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
  const { t } = useI18n();
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
          ? 'border-[#2C7A53]/30 dark:border-[#2C7A53]/30 hover:bg-[#E8F3EC]/50 dark:hover:bg-[#2C7A53]/5'
          : 'border-[#B7791F]/30 dark:border-[#B7791F]/30 hover:bg-[#F8F0E0]/50 dark:hover:bg-[#B7791F]/5'
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
            CATEGORY_BADGE[meta.color] ?? CATEGORY_BADGE.blue
          )}
        >
          {meta.label}
        </span>
      </div>

      {/* Status line */}
      {isResolved && selectedOption ? (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2C7A53] shrink-0" />
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
          <span className="w-1.5 h-1.5 rounded-full bg-[#B7791F] shrink-0" />
          <span className="text-[12px] text-muted-foreground">
            {decision.options.length} {t('beta.decisions.optionsAvailable')}
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
  const { t } = useI18n();
  const { isLoading, allDecisions, switchConversation } = useBetaChatContext();

  if (isLoading) return <DecisionHistorySkeleton />;

  if (allDecisions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">
        {t('beta.decisions.noPending')}
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
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#B7791F] dark:text-[#D2992F] mb-2 px-1">
            {t('beta.decisions.pending')} ({pending.length})
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
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#2C7A53] dark:text-[#3EAE70] mb-2 px-1">
            {t('beta.decisions.resolved')} ({resolved.length})
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
