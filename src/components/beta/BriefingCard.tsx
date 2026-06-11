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
  emerald: 'border-l-[#2C7A53] dark:border-l-[#2C7A53]',
  blue: 'border-l-[#1A40FF] dark:border-l-[#1A40FF]',
  amber: 'border-l-[#B7791F] dark:border-l-[#B7791F]',
  purple: 'border-l-[#6B6B6B] dark:border-l-[#6B6B6B]',
  pink: 'border-l-[#6B6B6B] dark:border-l-[#6B6B6B]',
  indigo: 'border-l-[#1A40FF] dark:border-l-[#1A40FF]',
};

const ICON_COLORS: Record<string, string> = {
  emerald: 'text-[#2C7A53] dark:text-[#3EAE70]',
  blue: 'text-[#1A40FF] dark:text-[#5570FF]',
  amber: 'text-[#B7791F] dark:text-[#D2992F]',
  purple: 'text-neutral-600 dark:text-neutral-300',
  pink: 'text-neutral-600 dark:text-neutral-300',
  indigo: 'text-[#1A40FF] dark:text-[#5570FF]',
};

const ACTION_BTN_COLORS: Record<string, string> = {
  emerald: 'text-[#2C7A53] dark:text-[#3EAE70] bg-[#E8F3EC] dark:bg-[#2C7A53]/15 border-[#2C7A53]/30 dark:border-[#2C7A53]/40 hover:bg-[#E8F3EC] dark:hover:bg-[#2C7A53]/20',
  blue: 'text-[#1A40FF] dark:text-[#5570FF] bg-[#EEF1FF] dark:bg-[#1A40FF]/15 border-[#1A40FF]/30 dark:border-[#1A40FF]/40 hover:bg-[#EEF1FF] dark:hover:bg-[#1A40FF]/20',
  amber: 'text-[#B7791F] dark:text-[#D2992F] bg-[#F8F0E0] dark:bg-[#B7791F]/15 border-[#B7791F]/30 dark:border-[#B7791F]/40 hover:bg-[#F8F0E0] dark:hover:bg-[#B7791F]/20',
  purple: 'text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-100 dark:bg-neutral-800/20',
  pink: 'text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-100 dark:bg-neutral-800/20',
  indigo: 'text-[#1A40FF] dark:text-[#5570FF] bg-[#EEF1FF] dark:bg-[#1A40FF]/15 border-[#1A40FF]/30 dark:border-[#1A40FF]/40 hover:bg-[#EEF1FF] dark:hover:opacity-90/20',
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
        'rounded-md overflow-hidden',
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
                  'px-2.5 py-1.5 rounded-sm',
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
                'bg-[#1A40FF]/10 text-[#1A40FF]',
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
