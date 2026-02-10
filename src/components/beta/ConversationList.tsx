'use client';

import { useState, useMemo, useCallback } from 'react';
import { MagnifyingGlass, Trash, ChatCircleDots } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { ConversationListSkeleton } from './BetaSkeletons';
import type { ConversationSummary, DateGroup } from '@/lib/types/beta-chat';

// ============================================================================
// Date grouping logic
// ============================================================================

function getDateGroup(date: Date): DateGroup {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (d >= today) return 'Hoy';
  if (d >= yesterday) return 'Ayer';
  if (d >= weekAgo) return 'Esta semana';
  return 'Anterior';
}

const GROUP_ORDER: DateGroup[] = ['Hoy', 'Ayer', 'Esta semana', 'Anterior'];

/** Maps internal DateGroup keys to i18n translation keys for display */
const DATE_GROUP_KEYS: Record<DateGroup, string> = {
  'Hoy': 'beta.conversations.today',
  'Ayer': 'beta.conversations.yesterday',
  'Esta semana': 'beta.conversations.thisWeek',
  'Anterior': 'beta.conversations.older',
};

function groupByDate(
  summaries: ConversationSummary[]
): Array<{ group: DateGroup; items: ConversationSummary[] }> {
  const groups = new Map<DateGroup, ConversationSummary[]>();

  for (const s of summaries) {
    const group = getDateGroup(s.updatedAt);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(s);
  }

  return GROUP_ORDER.filter((g) => groups.has(g)).map((g) => ({
    group: g,
    items: groups.get(g)!,
  }));
}

// ============================================================================
// Components
// ============================================================================

interface ConversationItemProps {
  summary: ConversationSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function ConversationItem({ summary, isActive, onSelect, onDelete }: ConversationItemProps) {
  const { t } = useI18n();
  const [showDelete, setShowDelete] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirmDelete) {
        setConfirmDelete(true);
        return;
      }
      onDelete(summary.id);
    },
    [confirmDelete, onDelete, summary.id]
  );

  const handleMouseLeave = useCallback(() => {
    setShowDelete(false);
    setConfirmDelete(false);
  }, []);

  return (
    <button
      onClick={() => onSelect(summary.id)}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-lg',
        'transition-colors group relative',
        isActive
          ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20'
          : 'hover:bg-neutral-50 dark:hover:bg-[#1a1a1c]'
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-[13px] font-medium truncate',
              isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-foreground'
            )}
          >
            {summary.title}
          </p>
          <p className="text-[12px] text-muted-foreground truncate mt-0.5">
            {summary.preview}
          </p>
        </div>

        {/* Delete button */}
        {showDelete && (
          <button
            onClick={handleDelete}
            className={cn(
              'shrink-0 p-1 rounded-md transition-colors',
              confirmDelete
                ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                : 'hover:bg-neutral-200 dark:hover:bg-neutral-700 text-muted-foreground'
            )}
            title={confirmDelete ? t('beta.conversations.confirmDelete') : t('beta.conversations.deleteConversation')}
          >
            <Trash className="w-3.5 h-3.5" weight={confirmDelete ? 'fill' : 'regular'} />
          </button>
        )}
      </div>

      {/* Message count */}
      {summary.messageCount > 0 && (
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          {summary.messageCount} {summary.messageCount !== 1 ? t('beta.conversations.messages') : t('beta.conversations.message')}
        </p>
      )}
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ConversationList() {
  const { t } = useI18n();
  const {
    isLoading,
    activeConversationId,
    switchConversation,
    deleteConversation,
    searchQuery,
    setSearchQuery,
    filteredSummaries,
  } = useBetaChatContext();

  const grouped = useMemo(() => groupByDate(filteredSummaries), [filteredSummaries]);

  const isEmpty = filteredSummaries.length === 0;

  if (isLoading) return <ConversationListSkeleton />;

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Search input */}
      <div className="relative">
        <MagnifyingGlass
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
          weight="regular"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('beta.sidebar.searchPlaceholder')}
          className={cn(
            'w-full pl-8 pr-3 py-2 rounded-lg',
            'text-[13px] placeholder:text-muted-foreground/50',
            'bg-neutral-50 dark:bg-[#1a1a1c]',
            'border border-neutral-200 dark:border-border',
            'focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-300 dark:focus:border-indigo-500/40',
            'transition-colors'
          )}
        />
      </div>

      {/* Conversation groups */}
      <div className="flex-1 overflow-y-auto space-y-3" role="list">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <ChatCircleDots className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-[13px]">
              {searchQuery.trim()
                ? t('beta.conversations.emptySearch')
                : t('beta.conversations.noConversations')}
            </p>
          </div>
        ) : (
          grouped.map(({ group, items }) => (
            <div key={group} role="listitem">
              <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider px-1 mb-1.5">
                {t(DATE_GROUP_KEYS[group])}
              </p>
              <div className="space-y-0.5">
                {items.map((s) => (
                  <ConversationItem
                    key={s.id}
                    summary={s}
                    isActive={s.id === activeConversationId}
                    onSelect={switchConversation}
                    onDelete={deleteConversation}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
