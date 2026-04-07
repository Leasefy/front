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
  ArrowSquareOut,
  ListChecks,
};

// ============================================================================
// Color Maps
// ============================================================================

const AGENT_BG: Record<string, string> = {
  emerald:
    'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  blue: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
  amber:
    'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
  purple:
    'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400',
  pink: 'bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-400',
  indigo:
    'bg-indigo-100 dark:bg-indigo-600/15 text-indigo-700 dark:text-indigo-400',
};

const STATUS_DOT: Record<string, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  indigo: 'bg-indigo-600',
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
              className="w-5 h-5 text-emerald-500"
              weight="fill"
            />
          ) : step.status === 'active' ? (
            <CircleNotch
              className="w-5 h-5 text-indigo-500 animate-spin"
              weight="bold"
            />
          ) : (
            <Circle
              className="w-5 h-5 text-neutral-300 dark:text-neutral-600"
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
                ? 'bg-emerald-300 dark:bg-emerald-500/40'
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

/** Action button matching the ResponseCard pattern */
function ActionButton({ action }: { action: ResponseAction }) {
  const ActionIcon = ICON_MAP[action.icon];
  const isLink = !!action.href;

  const baseClasses = cn(
    'inline-flex items-center gap-2',
    'px-4 py-2 rounded-xl',
    'text-[13px] font-medium',
    'transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1',
    action.variant === 'primary' && [
      'bg-indigo-600 text-white uppercase tracking-wide font-mono',
      'hover:bg-indigo-700 active:bg-indigo-700',
      'shadow-sm',
    ],
    action.variant === 'secondary' && [
      'bg-neutral-100 dark:bg-neutral-800',
      'text-foreground',
      'border border-neutral-200 dark:border-neutral-700',
      'hover:bg-neutral-200/80 dark:hover:bg-neutral-700',
    ],
    action.variant === 'ghost' && [
      'text-muted-foreground',
      'hover:bg-neutral-100 dark:hover:bg-neutral-800',
      'hover:text-foreground',
    ]
  );

  if (isLink) {
    return (
      <a href={action.href} className={baseClasses}>
        {ActionIcon && <ActionIcon className="w-4 h-4" weight="duotone" />}
        {action.label}
      </a>
    );
  }

  return (
    <button type="button" className={baseClasses}>
      {ActionIcon && <ActionIcon className="w-4 h-4" weight="duotone" />}
      {action.label}
    </button>
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
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || isEmpty}
        className={cn(
          'flex-shrink-0',
          'w-7 h-7 rounded-lg',
          'flex items-center justify-center',
          'transition-all duration-150',
          disabled || isEmpty
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-700/10 active:scale-95'
        )}
        aria-label={t('beta.workspace.sendMessage')}
      >
        <PaperPlaneTilt className="w-3.5 h-3.5" weight="fill" />
      </button>
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
                ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}

        {/* Close button (mobile) */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-lg ml-1',
              'flex items-center justify-center',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800',
              'transition-colors duration-150'
            )}
            aria-label={t('beta.workspace.close')}
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
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
                className="w-4 h-4 text-indigo-500"
                weight="duotone"
              />
              <span className="text-[13px] font-semibold text-foreground">
                {t('beta.workspace.stepsTitle')}
              </span>
            </div>
            {totalSteps > 0 && (
              <span
                className={cn(
                  'inline-flex items-center justify-center',
                  'min-w-[36px] px-2 py-0.5',
                  'rounded-full text-[11px] font-semibold',
                  completedCount === totalSteps
                    ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : 'bg-indigo-100 dark:bg-indigo-600/15 text-indigo-700 dark:text-indigo-400'
                )}
              >
                {completedCount}/{totalSteps}
              </span>
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
                <span
                  className={cn(
                    'inline-flex items-center',
                    'px-2 py-0.5 rounded-full',
                    'text-[10px] font-semibold uppercase tracking-wider',
                    meta.type === 'actionable'
                      ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
                      : 'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400'
                  )}
                >
                  {meta.type === 'actionable'
                    ? t('beta.workspace.typeActionable')
                    : t('beta.workspace.typeInformative')}
                </span>

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
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'hidden md:flex',
                  'flex-shrink-0 w-8 h-8 rounded-lg',
                  'items-center justify-center',
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  'transition-colors duration-150'
                )}
                aria-label={t('beta.workspace.close')}
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
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
              className="w-4 h-4 text-indigo-500"
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
                    'max-w-[85%] px-3 py-2 rounded-xl text-[13px] leading-relaxed',
                    msg.role === 'user'
                      ? [
                          'bg-indigo-600 text-white uppercase tracking-wide font-mono',
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
