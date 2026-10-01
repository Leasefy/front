'use client';

import {
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChartBar,
  Scales,
  ArrowsLeftRight,
  Bank,
  CheckCircle,
  XCircle,
  CircleNotch,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { AgentType, AgentExecutionStatus } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';
import type { Icon } from '@phosphor-icons/react';

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
  Scales,
  ArrowsLeftRight,
  Bank,
};

// ============================================================================
// Color Maps
// ============================================================================

const COLOR_CLASSES: Record<
  string,
  { bg: string; border: string; text: string; activeBg: string }
> = {
  emerald: {
    bg: 'bg-success-soft',
    border: 'border-success/30',
    text: 'text-success',
    activeBg: 'bg-success-soft',
  },
  blue: {
    bg: 'bg-primary-soft',
    border: 'border-primary/30',
    text: 'text-primary',
    activeBg: 'bg-primary-soft',
  },
  amber: {
    bg: 'bg-warning-soft',
    border: 'border-warning/30',
    text: 'text-warning',
    activeBg: 'bg-warning-soft',
  },
  purple: {
    bg: 'bg-surface-muted',
    border: 'border-border',
    text: 'text-fg-muted',
    activeBg: 'bg-surface-muted',
  },
  pink: {
    bg: 'bg-surface-muted',
    border: 'border-border',
    text: 'text-fg-muted',
    activeBg: 'bg-surface-muted',
  },
  indigo: {
    bg: 'bg-primary-soft',
    border: 'border-primary/30',
    text: 'text-primary',
    activeBg: 'bg-primary-soft',
  },
};

// ============================================================================
// Component
// ============================================================================

interface AgentBadgeProps {
  agentType: AgentType;
  status: AgentExecutionStatus;
  /** Optional duration string, e.g. "1.2s" */
  duration?: string;
  className?: string;
}

/**
 * AgentBadge - Compact pill-shape badge showing agent type, icon, and execution status.
 *
 * Status-dependent styling:
 * - dispatching: pulsing border, muted background
 * - running: spinning loader, active color
 * - completed: check icon, green accent
 * - failed: X icon, red accent
 */
export function AgentBadge({ agentType, status, duration, className }: AgentBadgeProps) {
  const meta = AGENT_METADATA[agentType];
  const colors = COLOR_CLASSES[meta.color] ?? COLOR_CLASSES.blue;
  const AgentIcon = ICON_MAP[meta.icon];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'text-xs font-medium',
        'border transition-all duration-300',
        // Status-dependent styles
        status === 'dispatching' && [
          colors.bg,
          colors.border,
          colors.text,
          'animate-pulse',
        ],
        status === 'running' && [
          colors.activeBg,
          colors.border,
          colors.text,
        ],
        status === 'completed' && [
          'bg-success-soft',
          'border-success/30',
          'text-success',
        ],
        status === 'failed' && [
          'bg-danger-soft',
          'border-danger/30',
          'text-danger',
        ],
        className
      )}
    >
      {/* Status icon or agent icon */}
      {status === 'running' ? (
        <CircleNotch className="w-3.5 h-3.5 animate-spin flex-shrink-0" weight="bold" />
      ) : status === 'completed' ? (
        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" weight="fill" />
      ) : status === 'failed' ? (
        <XCircle className="w-3.5 h-3.5 flex-shrink-0" weight="fill" />
      ) : AgentIcon ? (
        <AgentIcon className="w-3.5 h-3.5 flex-shrink-0" weight="duotone" />
      ) : null}

      {/* Agent label */}
      <span className="whitespace-nowrap">{meta.label}</span>

      {/* Duration (only on completed) */}
      {status === 'completed' && duration && (
        <span className="text-[10px] opacity-70">{duration}</span>
      )}
    </div>
  );
}
