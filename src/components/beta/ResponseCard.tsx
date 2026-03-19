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
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ResponseMeta, ResponseAction } from '@/lib/types/beta-chat';
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
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  pink: 'bg-rose-500',
  indigo: 'bg-indigo-500',
};

// ============================================================================
// Types
// ============================================================================

interface ResponseCardProps {
  meta: ResponseMeta;
  content: string;
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
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-[11px] font-medium leading-none',
        'shrink-0',
        isActionable
          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
      )}
    >
      {isActionable && (
        <ArrowRight className="w-2.5 h-2.5" weight="bold" />
      )}
      {isActionable
        ? t('beta.response.actionable')
        : t('beta.response.informative')}
    </span>
  );
}

function ActionButton({ action }: { action: ResponseAction }) {
  const ActionIcon = ICON_MAP[action.icon];

  const baseClasses = cn(
    'inline-flex items-center gap-1.5',
    'px-3 py-1.5 rounded-lg',
    'text-[13px] font-medium',
    'transition-all duration-150',
    'cursor-pointer',
    'shrink-0'
  );

  const variantClasses: Record<string, string> = {
    primary: cn(
      'bg-indigo-500 text-white',
      'hover:bg-indigo-600',
      'shadow-sm hover:shadow-md',
      'dark:bg-indigo-600 dark:hover:bg-indigo-500'
    ),
    secondary: cn(
      'bg-white text-foreground',
      'border border-neutral-200 dark:border-neutral-700',
      'hover:bg-neutral-50 dark:hover:bg-neutral-800',
      'dark:bg-neutral-900 dark:text-neutral-200'
    ),
    ghost: cn(
      'text-muted-foreground',
      'hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800'
    ),
  };

  const content = (
    <>
      {ActionIcon && <ActionIcon className="w-3.5 h-3.5" weight="duotone" />}
      {action.label}
    </>
  );

  if (action.href) {
    return (
      <a
        href={action.href}
        className={cn(baseClasses, variantClasses[action.variant])}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={cn(baseClasses, variantClasses[action.variant])}
    >
      {content}
    </button>
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
  className,
}: ResponseCardProps) {
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
        'w-full rounded-2xl overflow-hidden',
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
            'rounded-xl',
            'bg-neutral-50 dark:bg-neutral-800/40',
            'border border-neutral-100 dark:border-neutral-800',
            'px-4 py-3'
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
            <ActionButton key={action.id} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}
