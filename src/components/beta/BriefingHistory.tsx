'use client';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { BriefingCardSkeleton } from './BetaSkeletons';
import { BriefingCard } from './BriefingCard';

// ============================================================================
// Date Label Helpers
// ============================================================================

const SHORT_DAY_KEYS = [
  'beta.briefing.days.sunday',
  'beta.briefing.days.monday',
  'beta.briefing.days.tuesday',
  'beta.briefing.days.wednesday',
  'beta.briefing.days.thursday',
  'beta.briefing.days.friday',
  'beta.briefing.days.saturday',
];

// ============================================================================
// Component
// ============================================================================

/**
 * BriefingHistory - Date-based briefing navigator with horizontal date pills.
 *
 * Shows the last 5 days as clickable pills. Active date is highlighted
 * with indigo background. Renders the selected day's BriefingCard below.
 */
export function BriefingHistory() {
  const { t } = useI18n();
  const { isLoading, briefings, selectedBriefing, selectBriefing, sendBriefingAction } = useBetaChatContext();

  if (isLoading) return <BriefingCardSkeleton />;

  if (briefings.length === 0) return null;

  const activeBriefingId = selectedBriefing?.id ?? briefings[0]?.id;

  const getDateLabel = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('beta.conversations.today');
    if (diffDays === 1) return t('beta.conversations.yesterday');
    return `${t(SHORT_DAY_KEYS[date.getDay()])} ${date.getDate()}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Date pills */}
      <div className="flex gap-1.5 pb-3 overflow-x-auto flex-shrink-0">
        {briefings.map((briefing) => {
          const isActive = briefing.id === activeBriefingId;
          return (
            <button
              key={briefing.id}
              onClick={() => selectBriefing(briefing.id)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap',
                'transition-colors duration-150',
                isActive
                  ? 'bg-indigo-600 text-white uppercase tracking-wide font-mono'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700'
              )}
            >
              {getDateLabel(briefing.date)}
            </button>
          );
        })}
      </div>

      {/* Briefing card for selected date */}
      <div className="flex-1 overflow-y-auto">
        {selectedBriefing && (
          <BriefingCard
            briefing={selectedBriefing}
            onAction={(sectionId, context) => {
              sendBriefingAction(sectionId, context);
            }}
          />
        )}
      </div>
    </div>
  );
}
