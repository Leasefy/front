'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent,
} from 'react';
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
  CircleNotch,
  Circle,
  X,
  Sparkle,
  PaperPlaneTilt,
  ListChecks,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { Button, Badge } from '@/components/ui';
import { IconButton } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type {
  ResponseMeta,
  ResponseAction,
  WorkspaceStep,
  AgentType,
} from '@/lib/types/beta-chat';
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
  Scales,
  ArrowsLeftRight,
  Bank,
  ArrowSquareOut,
  ListChecks,
};

// ============================================================================
// Color Maps
// ============================================================================

const AGENT_BG: Record<string, string> = {
  emerald:
    'bg-success-soft text-success',
  blue: 'bg-primary-soft text-primary',
  amber:
    'bg-warning-soft text-warning',
  purple:
    'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300',
  pink: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300',
  indigo:
    'bg-primary-soft text-primary',
};

const STATUS_DOT: Record<string, string> = {
  emerald: 'bg-success',
  blue: 'bg-primary',
  amber: 'bg-warning',
  purple: 'bg-neutral-100 dark:bg-neutral-800',
  pink: 'bg-neutral-100 dark:bg-neutral-800',
  indigo: 'bg-primary',
};

// ============================================================================
// Types
// ============================================================================

type MobileTab = 'steps' | 'content' | 'chat';

interface MiniChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface WorkspaceViewProps {
  meta: ResponseMeta;
  content: string;
  isStreaming?: boolean;
  streamingContent?: string;
  /** Send a message in the workspace chat */
  onSendMessage?: (text: string) => void;
  /** Close workspace and go back to chat */
  onClose?: () => void;
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

/** Timeline step item with vertical connector line */
function StepItem({
  step,
  isLast,
}: {
  step: WorkspaceStep;
  isLast: boolean;
}) {
  const agentMeta = step.agentType ? AGENT_METADATA[step.agentType] : null;
  const agentColor = agentMeta?.color ?? 'indigo';

  return (
    <div className="relative flex gap-3">
      {/* Timeline track */}
      <div className="flex flex-col items-center">
        {/* Status icon */}
        <div className="relative z-10 flex-shrink-0">
          {step.status === 'completed' ? (
            <CheckCircle
              className="w-5 h-5 text-success"
              weight="fill"
            />
          ) : step.status === 'active' ? (
            <CircleNotch
              className="w-5 h-5 text-primary animate-spin"
              weight="bold"
            />
          ) : (
            <Circle
              className="w-5 h-5 text-fg-subtle"
              weight="regular"
            />
          )}
        </div>

        {/* Connector line */}
        {!isLast && (
          <div
            className={cn(
              'w-px flex-1 min-h-[20px]',
              step.status === 'completed'
                ? 'bg-success-soft'
                : 'bg-neutral-200 dark:bg-neutral-700'
            )}
          />
        )}
      </div>

      {/* Step content */}
      <div className="pb-4 flex-1 min-w-0">
        <p
          className={cn(
            'text-[13px] font-medium leading-tight',
            step.status === 'active'
              ? 'text-foreground'
              : step.status === 'completed'
                ? 'text-muted-foreground'
                : 'text-muted-foreground/70'
          )}
        >
          {step.label}
        </p>

        {step.description && (
          <p className="text-[11px] text-muted-foreground/60 mt-0.5 leading-snug">
            {step.description}
          </p>
        )}

        {/* Agent badge */}
        {agentMeta && (
          <span
            className={cn(
              'inline-flex items-center gap-1 mt-1.5',
              'px-2 py-0.5 rounded-full text-[10px] font-medium',
              AGENT_BG[agentColor]
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                STATUS_DOT[agentColor]
              )}
            />
            {agentMeta.label}
          </span>
        )}
      </div>
    </div>
  );
}

/** Action button matching the ResponseCard pattern — Cadence Button */
function ActionButton({ action }: { action: ResponseAction }) {
  const ActionIcon = ICON_MAP[action.icon];
  // primary → DS primary pill (drops the old mono-uppercase anti-pattern);
  // secondary → outline; ghost → ghost.
  const variant =
    action.variant === 'primary' ? 'default' : action.variant === 'secondary' ? 'outline' : 'ghost';

  const content = (
    <>
      {ActionIcon && <ActionIcon className="w-4 h-4" weight="duotone" />}
      {action.label}
    </>
  );

  if (action.href) {
    return (
      <Button asChild variant={variant} hideArrow className="gap-2 rounded-lg">
        <a href={action.href}>{content}</a>
      </Button>
    );
  }

  return (
    <Button type="button" variant={variant} hideArrow className="gap-2 rounded-lg">
      {content}
    </Button>
  );
}

/** Mini chat input for the right column */
function MiniChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const isEmpty = value.trim().length === 0;

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        'px-3 py-2.5',
        'border-t border-neutral-200/60 dark:border-border/40'
      )}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('beta.workspace.chatPlaceholder')}
        disabled={disabled}
        className={cn(
          'flex-1 min-w-0',
          'bg-transparent',
          'text-[13px] text-foreground placeholder:text-muted-foreground/60',
          'focus:outline-none',
          'disabled:opacity-50'
        )}
      />
      <IconButton
        type="button"
        icon={<PaperPlaneTilt className="w-3.5 h-3.5" weight="fill" />}
        onClick={handleSend}
        disabled={disabled || isEmpty}
        variant="ghost"
        className={cn(
          'flex-shrink-0',
          'w-7 h-7 rounded-md',
          'transition-all duration-150',
          disabled || isEmpty
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-primary hover:bg-primary-soft active:scale-95'
        )}
        aria-label={t('beta.workspace.sendMessage')}
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * WorkspaceView - 3-column layout for actionable AI agent responses.
 *
 * Desktop: Steps sidebar | Main content | Mini chat
 * Mobile: Tabbed view switching between the three panels.
 *
 * Glass morphism panels with subtle borders, dark mode compatible.
 * Steps timeline tracks progress; mini chat allows follow-up questions.
 */
export function WorkspaceView({
  meta,
  content,
  isStreaming = false,
  streamingContent,
  onSendMessage,
  onClose,
  className,
}: WorkspaceViewProps) {
  const { t } = useI18n();
  const [mobileTab, setMobileTab] = useState<MobileTab>('content');
  const [miniMessages, setMiniMessages] = useState<MiniChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: t('beta.workspace.welcomeMessage'),
    },
  ]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Derive step progress
  const steps = meta.steps ?? [];
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const totalSteps = steps.length;

  // Agent metadata for primary agent display
  const primaryAgent = meta.primaryAgent
    ? AGENT_METADATA[meta.primaryAgent]
    : null;

  // Display content — streaming or final
  const displayContent =
    isStreaming && streamingContent ? streamingContent : content;

  // Auto-scroll mini chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [miniMessages]);

  // Handle mini chat send
  const handleMiniSend = useCallback(
    (text: string) => {
      const userMsg: MiniChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text,
      };
      setMiniMessages((prev) => [...prev, userMsg]);

      // Forward to parent handler if provided
      if (onSendMessage) {
        onSendMessage(text);
      }

      // Simulated assistant acknowledgment
      setTimeout(() => {
        const assistantMsg: MiniChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: t('beta.workspace.processingMessage'),
        };
        setMiniMessages((prev) => [...prev, assistantMsg]);
      }, 800);
    },
    [onSendMessage, t]
  );

  // Mobile tab items
  const mobileTabs: { key: MobileTab; label: string }[] = [
    { key: 'steps', label: t('beta.workspace.tabSteps') },
    { key: 'content', label: t('beta.workspace.tabContent') },
    { key: 'chat', label: t('beta.workspace.tabChat') },
  ];

  return (
    <div
      className={cn('h-full flex flex-col', className)}
      role="region"
      aria-label={t('beta.workspace.ariaLabel')}
    >
      {/* ================================================================ */}
      {/* Mobile Tab Bar                                                   */}
      {/* ================================================================ */}
      <div
        className={cn(
          'md:hidden flex items-center',
          'border-b border-neutral-200/60 dark:border-border/40',
          'bg-white/80 dark:bg-card/80 backdrop-blur-xl',
          'px-1 flex-shrink-0'
        )}
      >
        {mobileTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMobileTab(tab.key)}
            className={cn(
              'flex-1 py-2.5 text-[13px] font-medium',
              'transition-colors duration-150',
              'border-b-2',
              mobileTab === tab.key
                ? 'text-primary border-primary/30'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}

        {/* Close button (mobile) */}
        {onClose && (
          <IconButton
            type="button"
            icon={<X className="w-4 h-4" weight="bold" />}
            onClick={onClose}
            variant="ghost"
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-md ml-1',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            )}
            aria-label={t('beta.workspace.close')}
          />
        )}
      </div>

      {/* ================================================================ */}
      {/* Desktop 3-Column Layout / Mobile Panel Switcher                  */}
      {/* ================================================================ */}
      <div className="flex-1 flex overflow-hidden">
        {/* -------------------------------------------------------------- */}
        {/* LEFT COLUMN: Steps / Phases sidebar                            */}
        {/* -------------------------------------------------------------- */}
        <aside
          className={cn(
            // Desktop: fixed-width side panel
            'hidden md:flex md:flex-col',
            'w-64 flex-shrink-0',
            'border-r border-neutral-200/60 dark:border-border/40',
            'bg-white/50 dark:bg-card/30 backdrop-blur-xl',
            // Mobile: shown only when steps tab is active
            mobileTab === 'steps' && '!flex !w-full md:!w-64'
          )}
          aria-label={t('beta.workspace.stepsPanel')}
        >
          {/* Steps header */}
          <div
            className={cn(
              'flex items-center justify-between',
              'px-4 py-3 flex-shrink-0',
              'border-b border-neutral-200/40 dark:border-border/30'
            )}
          >
            <div className="flex items-center gap-2">
              <ListChecks
                className="w-4 h-4 text-primary"
                weight="duotone"
              />
              <span className="text-[13px] font-semibold text-foreground">
                {t('beta.workspace.stepsTitle')}
              </span>
            </div>
            {totalSteps > 0 && (
              <Badge
                variant={completedCount === totalSteps ? 'success' : 'default'}
                className="justify-center min-w-[36px] px-2 py-0.5 text-[11px] font-semibold tabular-nums"
              >
                {completedCount}/{totalSteps}
              </Badge>
            )}
          </div>

          {/* Steps list */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {steps.length > 0 ? (
              steps.map((step, idx) => (
                <StepItem
                  key={step.id}
                  step={step}
                  isLast={idx === steps.length - 1}
                />
              ))
            ) : (
              <p className="text-[12px] text-muted-foreground/60 italic">
                {t('beta.workspace.noSteps')}
              </p>
            )}
          </div>
        </aside>

        {/* -------------------------------------------------------------- */}
        {/* CENTER COLUMN: Agent results / Main content                    */}
        {/* -------------------------------------------------------------- */}
        <div
          className={cn(
            // Desktop: always visible, takes remaining space
            'hidden md:flex md:flex-col flex-1 min-w-0',
            // Mobile: shown only when content tab is active
            mobileTab === 'content' && '!flex !w-full'
          )}
        >
          {/* Content header */}
          <div
            className={cn(
              'flex items-start justify-between gap-3',
              'px-5 py-3.5 flex-shrink-0',
              'border-b border-neutral-200/40 dark:border-border/30',
              'bg-white/40 dark:bg-card/20 backdrop-blur-xl'
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-[15px] font-semibold text-foreground truncate">
                  {meta.title}
                </h2>

                {/* Response type badge */}
                <Badge
                  variant={meta.type === 'actionable' ? 'warning' : 'default'}
                  className="px-2 py-0.5 text-[10px] font-semibold"
                >
                  {meta.type === 'actionable'
                    ? t('beta.workspace.typeActionable')
                    : t('beta.workspace.typeInformative')}
                </Badge>

                {/* Primary agent badge */}
                {primaryAgent && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1',
                      'px-2 py-0.5 rounded-full',
                      'text-[10px] font-medium',
                      AGENT_BG[primaryAgent.color]
                    )}
                  >
                    {(() => {
                      const AgIcon = ICON_MAP[primaryAgent.icon];
                      return AgIcon ? (
                        <AgIcon className="w-3 h-3" weight="duotone" />
                      ) : null;
                    })()}
                    {primaryAgent.label}
                  </span>
                )}
              </div>

              {/* Summary */}
              <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">
                {meta.summary}
              </p>
            </div>

            {/* Close button (desktop) */}
            {onClose && (
              <IconButton
                type="button"
                icon={<X className="w-4 h-4" weight="bold" />}
                onClick={onClose}
                variant="ghost"
                className={cn(
                  'hidden md:flex',
                  'flex-shrink-0 w-8 h-8 rounded-md',
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                )}
                aria-label={t('beta.workspace.close')}
              />
            )}
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-4">
              <MarkdownRenderer
                content={displayContent}
                isStreaming={isStreaming}
              />
            </div>
          </div>

          {/* Action buttons footer */}
          {meta.actions.length > 0 && (
            <div
              className={cn(
                'flex items-center gap-2 flex-wrap',
                'px-5 py-3 flex-shrink-0',
                'border-t border-neutral-200/40 dark:border-border/30',
                'bg-white/40 dark:bg-card/20 backdrop-blur-xl'
              )}
            >
              {meta.actions.map((action) => (
                <ActionButton key={action.id} action={action} />
              ))}
            </div>
          )}
        </div>

        {/* -------------------------------------------------------------- */}
        {/* RIGHT COLUMN: Mini chat                                        */}
        {/* -------------------------------------------------------------- */}
        <aside
          className={cn(
            // Desktop: fixed-width side panel
            'hidden md:flex md:flex-col',
            'w-80 flex-shrink-0',
            'border-l border-neutral-200/60 dark:border-border/40',
            'bg-white/50 dark:bg-card/30 backdrop-blur-xl',
            // Mobile: shown only when chat tab is active
            mobileTab === 'chat' && '!flex !w-full md:!w-80'
          )}
          aria-label={t('beta.workspace.chatPanel')}
        >
          {/* Chat header */}
          <div
            className={cn(
              'flex items-center gap-2',
              'px-4 py-3 flex-shrink-0',
              'border-b border-neutral-200/40 dark:border-border/30'
            )}
          >
            <Sparkle
              className="w-4 h-4 text-primary"
              weight="fill"
            />
            <span className="text-[13px] font-semibold text-foreground">
              {t('beta.workspace.chatTitle')}
            </span>
          </div>

          {/* Messages area */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          >
            {miniMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] px-3 py-2 rounded-lg text-[13px] leading-relaxed',
                    msg.role === 'user'
                      ? [
                          'bg-primary text-primary-fg',
                          'rounded-br-sm',
                        ]
                      : [
                          'bg-neutral-100 dark:bg-neutral-800/60',
                          'text-foreground',
                          'border border-neutral-200/60 dark:border-border/40',
                          'rounded-bl-sm',
                        ]
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Mini chat input */}
          <MiniChatInput onSend={handleMiniSend} />
        </aside>
      </div>
    </div>
  );
}
