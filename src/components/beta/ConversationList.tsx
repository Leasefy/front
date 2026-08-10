'use client';

import { useState, useMemo, useCallback } from 'react';
import { MagnifyingGlass, Trash, ChatCircleDots } from '@phosphor-icons/react';
import { IconButton, MonoLabel } from '@leasefy/cadence';
import { Input } from '@/components/ui';
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
// ConversationItem
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
        'w-full text-left px-3 py-2 rounded-md relative',
        'transition-all duration-150',
        isActive
          ? 'bg-surface-muted'
          : 'hover:bg-surface-muted'
      )}
    >
      <p
        className={cn(
          'text-[13px] truncate leading-snug pr-6',
          isActive ? 'text-foreground font-medium' : 'text-foreground/80'
        )}
      >
        {summary.title}
      </p>
      {summary.preview && (
        <p className="text-[12px] text-muted-foreground/50 truncate mt-0.5 pr-6">
          {summary.preview}
        </p>
      )}

      {/* Delete — appears on hover */}
      {showDelete && (
        <IconButton
          type="button"
          icon={<Trash className="w-3.5 h-3.5" weight={confirmDelete ? 'fill' : 'regular'} />}
          onClick={handleDelete}
          variant="ghost"
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2',
            'h-auto w-auto p-1 rounded-sm',
            confirmDelete
              ? 'bg-danger-soft text-danger'
              : 'text-fg-subtle hover:text-fg-muted'
          )}
          aria-label={confirmDelete ? t('beta.conversations.confirmDelete') : t('beta.conversations.deleteConversation')}
          title={confirmDelete ? t('beta.conversations.confirmDelete') : t('beta.conversations.deleteConversation')}
        />
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
      {/* Search */}
      <div className="relative">
        <MagnifyingGlass
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-subtle"
          weight="regular"
        />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('beta.sidebar.searchPlaceholder')}
          className={cn(
            'w-full pl-9 pr-3 py-2 h-10 rounded-xl',
            'text-[13px] placeholder:text-fg-subtle',
            'bg-surface-muted/80',
            'border-transparent'
          )}
        />
      </div>

      {/* Conversation groups */}
      <div className="flex-1 overflow-y-auto space-y-3" role="list">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-10">
            <ChatCircleDots className="w-8 h-8 mb-2 text-fg-subtle" />
            <p className="text-[13px] text-fg-subtle">
              {searchQuery.trim()
                ? t('beta.conversations.emptySearch')
                : t('beta.conversations.noConversations')}
            </p>
          </div>
        ) : (
          grouped.map(({ group, items }) => (
            <div key={group} role="listitem">
              <MonoLabel className="block px-2 mb-1 tracking-widest text-fg-subtle">
                {t(DATE_GROUP_KEYS[group])}
              </MonoLabel>
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
