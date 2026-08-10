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
import { Button, Badge } from '@/components/ui';
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
  purple: 'text-fg-muted',
  pink: 'text-fg-muted',
  indigo: 'text-primary',
};

const ACTION_BTN_COLORS: Record<string, string> = {
  emerald: 'text-success bg-success-soft border-success/30 hover:opacity-90',
  blue: 'text-primary bg-primary-soft border-primary/30 hover:opacity-90',
  amber: 'text-warning bg-warning-soft border-warning/30 hover:opacity-90',
  purple: 'text-fg-muted bg-surface-muted border-border hover:opacity-90',
  pink: 'text-fg-muted bg-surface-muted border-border hover:opacity-90',
  indigo: 'text-primary bg-primary-soft border-primary/30 hover:opacity-90',
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
        'border border-border',
        'border-l-[3px]',
        borderColor,
        'rounded-md overflow-hidden',
        'bg-surface',
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
          'hover:bg-surface-hover',
          'transition-colors duration-150'
        )}
      >
        {SectionIcon && (
          <SectionIcon className={cn('w-4 h-4 flex-shrink-0', iconColor)} weight="duotone" />
        )}
        <span className="font-medium text-fg flex-1 truncate text-sm">
          {section.title}
        </span>
        <CaretDown
          className={cn(
            'w-3.5 h-3.5 text-fg-muted flex-shrink-0',
            'transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
          weight="bold"
        />
      </button>

      {/* Summary — always visible */}
      <div className="px-3 pb-2">
        <p className="text-xs text-fg-muted leading-relaxed">
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
                <li key={idx} className="flex gap-2 text-xs text-fg-muted leading-relaxed">
                  <span className="text-fg-subtle mt-0.5 flex-shrink-0">-</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>

            {/* Action button */}
            {section.actionLabel && section.actionContext && (
              <Button
                type="button"
                variant="secondary"
                hideArrow
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.(section.id, section.actionContext!);
                }}
                className={cn(
                  'gap-1.5 px-2.5 py-1.5 h-auto rounded-md',
                  'text-xs font-medium border',
                  actionBtnColor
                )}
              >
                <span>{section.actionLabel}</span>
                <ArrowRight className="w-3 h-3" weight="bold" />
              </Button>
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
          <p className="text-xs text-fg-muted font-medium">
            {formattedDate}
          </p>
          {briefing.isNew && (
            <Badge variant="default" className="gap-1 px-1.5 py-0.5 text-[10px] font-semibold">
              <Sparkle className="w-2.5 h-2.5" weight="fill" />
              {t('beta.briefing.new')}
            </Badge>
          )}
        </div>
        <p className="text-sm text-fg font-medium leading-snug">
          {briefing.greeting}
        </p>
        <p className="text-xs text-fg-muted leading-relaxed">
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
