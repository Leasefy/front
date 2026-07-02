'use client';

import { AgentActivity, type AgentStepStatus } from '@leasefy/cadence';
import { useI18n } from '@/lib/i18n';
import type { AgentActivityBlock, AgentExecutionStatus } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const STATUS_MAP: Record<AgentExecutionStatus, AgentStepStatus> = {
  dispatching: 'pending',
  running: 'running',
  completed: 'done',
  failed: 'failed',
};

// ============================================================================
// Component
// ============================================================================

interface AgentActivityIndicatorProps {
  activity: AgentActivityBlock;
  className?: string;
}

/**
 * AgentActivityIndicator — multi-agent orchestration block in the beta chat.
 *
 * Now rendered with the §34 cadence <AgentActivity> panel (Batch: chat
 * redesign step 3). This adapter maps the app's AgentActivityBlock onto the DS
 * component and keeps the same props, so ChatContainer stays untouched.
 */
export function AgentActivityIndicator({ activity, className }: AgentActivityIndicatorProps) {
  const { t } = useI18n();

  const steps = activity.agents.map((agent) => ({
    id: agent.id,
    label: agent.taskDescription || AGENT_METADATA[agent.agentType].label,
    status: STATUS_MAP[agent.status],
    duration: agent.durationMs !== undefined ? formatDuration(agent.durationMs) : undefined,
  }));

  return (
    <AgentActivity
      className={className}
      steps={steps}
      runningLabel={t('beta.agents.running')}
      doneLabel={t('beta.agents.completed')}
      errorLabel={t('beta.agents.completedWithErrors')}
    />
  );
}
