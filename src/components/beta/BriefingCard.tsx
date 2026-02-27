'use client';

import { useState } from 'react';
import {
  CaretDown,
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChartBar,
  ListChecks,
  ArrowRight,
  Sparkle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { BriefingCardSkeleton } from './BetaSkeletons';
import type { DailyBriefing, BriefingSection } from '@/lib/types/beta-chat';
import type { Icon } from '@phosphor-icons/react';

// ============================================================================
// Icon Map (same pattern as AgentResultCard)
// ============================================================================

const ICON_MAP: Record<string, Icon> = {
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChartBar,
  ListChecks,
};

// ============================================================================
// Color Maps (reusing AGENT_METADATA color tokens)
// ============================================================================

const BORDER_LEFT_COLORS: Record<string, string> = {
  emerald: 'border-l-emerald-400 dark:border-l-emerald-500',
  blue: 'border-l-blue-400 dark:border-l-blue-500',
  amber: 'border-l-amber-400 dark:border-l-amber-500',
  purple: 'border-l-purple-400 dark:border-l-purple-500',
  pink: 'border-l-pink-400 dark:border-l-pink-500',
  indigo: 'border-l-indigo-400 dark:border-l-indigo-500',
};

const ICON_COLORS: Record<string, string> = {
  emerald: 'text-emerald-500 dark:text-emerald-400',
  blue: 'text-blue-500 dark:text-blue-400',
  amber: 'text-amber-500 dark:text-amber-400',
  purple: 'text-purple-500 dark:text-purple-400',
  pink: 'text-pink-500 dark:text-pink-400',
  indigo: 'text-indigo-500 dark:text-indigo-400',
};

const ACTION_BTN_COLORS: Record<string, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20',
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/20',
  amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20',
  purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30 hover:bg-purple-100 dark:hover:bg-purple-500/20',
  pink: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/30 hover:bg-pink-100 dark:hover:bg-pink-500/20',
  indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20',
};

// ============================================================================
// Date Formatting
// ============================================================================

const DAY_KEYS = [
  'beta.briefing.days.sunday',
  'beta.briefing.days.monday',
  'beta.briefing.days.tuesday',
  'beta.briefing.days.wednesday',
  'beta.briefing.days.thursday',
  'beta.briefing.days.friday',
  'beta.briefing.days.saturday',
];

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ============================================================================
// Section Component
// ============================================================================

interface BriefingSectionCardProps {
  section: BriefingSection;
  isExpanded: boolean;
  onToggle: () => void;
  onAction?: (sectionId: string, context: string) => void;
}

function BriefingSectionCard({ section, isExpanded, onToggle, onAction }: BriefingSectionCardProps) {
  const SectionIcon = ICON_MAP[section.icon];
  const borderColor = BORDER_LEFT_COLORS[section.color] ?? BORDER_LEFT_COLORS.blue;
  const iconColor = ICON_COLORS[section.color] ?? ICON_COLORS.blue;
  const actionBtnColor = ACTION_BTN_COLORS[section.color] ?? ACTION_BTN_COLORS.indigo;

  return (
    <div
      className={cn(
        'border border-neutral-200/60 dark:border-border/50',
        'border-l-[3px]',
        borderColor,
        'rounded-lg overflow-hidden',
        'bg-white/60 dark:bg-card/60',
        'transition-all duration-200'
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5',
          'text-left text-xs',
          'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30',
          'transition-colors duration-150'
        )}
      >
        {SectionIcon && (
          <SectionIcon className={cn('w-4 h-4 flex-shrink-0', iconColor)} weight="duotone" />
        )}
        <span className="font-medium text-foreground flex-1 truncate text-[13px]">
          {section.title}
        </span>
        <CaretDown
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground flex-shrink-0',
            'transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
          weight="bold"
        />
      </button>

      {/* Summary — always visible */}
      <div className="px-3 pb-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {section.summary}
        </p>
      </div>

      {/* Expandable details — grid-rows-[0fr]/[1fr] pattern */}
      <div
        className={cn(
          'grid transition-all duration-200',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1 space-y-2">
            {/* Detail bullets */}
            <ul className="space-y-1.5">
              {section.details.map((detail, idx) => (
                <li key={idx} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                  <span className="text-muted-foreground/50 mt-0.5 flex-shrink-0">-</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>

            {/* Action button */}
            {section.actionLabel && section.actionContext && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.(section.id, section.actionContext!);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5',
                  'px-2.5 py-1.5 rounded-md',
                  'text-xs font-medium',
                  'border',
                  'transition-colors duration-150',
                  actionBtnColor
                )}
              >
                <span>{section.actionLabel}</span>
                <ArrowRight className="w-3 h-3" weight="bold" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface BriefingCardProps {
  briefing: DailyBriefing;
  onAction?: (sectionId: string, context: string) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * BriefingCard - Daily briefing card with collapsible sections.
 *
 * Shows date, greeting, overall summary, and 4 expandable sections:
 * cobros, pipeline, mantenimiento, decisiones pendientes.
 * Each section uses grid-rows-[0fr]/[1fr] for smooth collapse animation.
 */
export function BriefingCard({ briefing, onAction, isLoading, className }: BriefingCardProps) {
  const { t } = useI18n();
  // First section expanded by default, rest collapsed
  const [expandedSections, setExpandedSections] = useState<Set<number>>(() => new Set([0]));

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (isLoading) return <BriefingCardSkeleton />;

  const dayName = t(DAY_KEYS[briefing.date.getDay()]);
  const num = briefing.date.getDate();
  const month = MONTHS[briefing.date.getMonth()];
  const formattedDate = `${dayName} ${num} de ${month}`;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground font-medium">
            {formattedDate}
          </p>
          {briefing.isNew && (
            <span
              className={cn(
                'inline-flex items-center gap-1',
                'px-1.5 py-0.5 rounded-full',
                'bg-indigo-500/10 text-indigo-500',
                'text-[10px] font-semibold'
              )}
            >
              <Sparkle className="w-2.5 h-2.5" weight="fill" />
              {t('beta.briefing.new')}
            </span>
          )}
        </div>
        <p className="text-[13px] text-foreground font-medium leading-snug">
          {briefing.greeting}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {briefing.overallSummary}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {briefing.sections.map((section, index) => (
          <BriefingSectionCard
            key={`${section.id}-${index}`}
            section={section}
            isExpanded={expandedSections.has(index)}
            onToggle={() => toggleSection(index)}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}
