'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ChatMessage,
  Conversation,
  ConversationSummary,
  MessageStatus,
  SerializedConversation,
  AgentActivityBlock,
  AgentExecution,
  AgentExecutionStatus,
  PendingDecision,
  ResponseMeta,
  BetaPreferences,
  ActionProposal,
} from '@/lib/types/beta-chat';
import type { DailyBriefing } from '@/lib/types/beta-chat';
import { getTodayBriefing, getMockBriefings } from '@/lib/data/mock-briefings';
import { getMockResponse, getMockResponseMeta } from '@/lib/data/mock-chat-responses';
import { DEFAULT_PREFERENCES } from '@/lib/data/default-preferences';
import { useAuth } from '@/lib/auth/use-auth';
import {
  postChatTurn,
  streamChatTurn,
  fetchBriefing,
  isAgentConfigured,
  suggestedActionToResponseAction,
  backendAgentToFrontType,
  executeAction,
  type BackendDispatch,
  type BackendSuggestedAction,
  type BackendActionProposal,
} from '@/lib/api/ai-hub-chat';

// ============================================================================
// Constants
// ============================================================================

const CHARS_PER_SECOND = 40;
const LONG_PAUSE_CHARS = new Set(['.', '!', '?']);
const SHORT_PAUSE_CHARS = new Set([',', ';', ':']);
const LONG_PAUSE_MULTIPLIER = 6;
const SHORT_PAUSE_MULTIPLIER = 3;

const STORAGE_KEY = 'leasefy-beta-conversations';
const STORAGE_VERSION_KEY = 'leasefy-beta-storage-version';
const CURRENT_STORAGE_VERSION = 3; // v3 = Clean minimal Synapse-inspired redesign
const PREFERENCES_STORAGE_KEY = 'leasefy-beta-preferences';
const TITLE_MAX_LENGTH = 50;
const PREVIEW_MAX_LENGTH = 80;

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Auto-generate conversation title from first user message */
function generateTitle(text: string): string {
  const cleaned = text.replace(/\n/g, ' ').trim();
  if (cleaned.length <= TITLE_MAX_LENGTH) return cleaned;
  return cleaned.slice(0, TITLE_MAX_LENGTH).replace(/\s+\S*$/, '') + '...';
}

/** Create a preview string from the last message */
function getPreview(messages: ChatMessage[]): string {
  if (messages.length === 0) return 'Nueva conversacion';
  const last = messages[messages.length - 1];
  const text = last.content.replace(/\n/g, ' ').trim();
  if (text.length <= PREVIEW_MAX_LENGTH) return text;
  return text.slice(0, PREVIEW_MAX_LENGTH).replace(/\s+\S*$/, '') + '...';
}

function createEmptyConversation(): Conversation {
  const now = new Date();
  return {
    id: generateId(),
    title: 'Nueva conversacion',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// localStorage Persistence
// ============================================================================

function serializeConversations(conversations: Conversation[]): string {
  const serialized: SerializedConversation[] = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    messages: c.messages.map((m) => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    })),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
  return JSON.stringify(serialized);
}

function deserializeConversations(json: string): Conversation[] {
  try {
    const parsed: SerializedConversation[] = JSON.parse(json);
    return parsed.map((c) => ({
      id: c.id,
      title: c.title,
      messages: c.messages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    }));
  } catch {
    return [];
  }
}

function loadFromStorage(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    // Auto-migrate: clear old-format conversations when storage version changes
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (storedVersion !== String(CURRENT_STORAGE_VERSION)) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
      return [];
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return deserializeConversations(stored);
  } catch {
    return [];
  }
}

function saveToStorage(conversations: Conversation[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, serializeConversations(conversations));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

// ============================================================================
// Preferences Persistence
// ============================================================================

function loadPreferencesFromStorage(): BetaPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    return JSON.parse(stored) as BetaPreferences;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function savePreferencesToStorage(prefs: BetaPreferences) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

// ============================================================================
// Hook Return Type
// ============================================================================

/** A decision entry with context about its source conversation */
export interface DecisionEntry {
  decision: PendingDecision;
  conversationId: string;
  conversationTitle: string;
  messageId: string;
}

/** An agent activity entry with context about its source conversation */
export interface AgentActivityEntry {
  activity: AgentActivityBlock;
  conversationId: string;
  conversationTitle: string;
}

export interface UseBetaChatReturn {
  // Loading state (false in mock, true during real API fetch)
  isLoading: boolean;

  // Current conversation
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  isThinking: boolean;
  isStreaming: boolean;
  streamingContent: string;

  // Agent execution
  activeAgentBlock: AgentActivityBlock | null;
  isAgentsRunning: boolean;
  retryAgent: (executionId: string) => void;

  // Decision handling
  selectDecisionOption: (messageId: string, optionId: string) => void;
  pendingDecisionsCount: number;
  allDecisions: DecisionEntry[];

  // Agent activity aggregation
  allAgentActivities: AgentActivityEntry[];

  // Conversation management
  conversations: Conversation[];
  activeConversationId: string | null;
  createConversation: () => void;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredSummaries: ConversationSummary[];

  // Briefing
  currentBriefing: DailyBriefing | null;
  sendBriefingAction: (sectionId: string, context: string) => void;
  hasNewBriefing: boolean;
  markBriefingSeen: () => void;
  briefings: DailyBriefing[];
  selectedBriefing: DailyBriefing | null;
  selectBriefing: (id: string) => void;

  // Preferences
  preferences: BetaPreferences;
  updatePreferences: (partial: Partial<BetaPreferences>) => void;
  resetPreferences: () => void;

  // Action proposals (F5 — human-in-the-loop confirmations)
  confirmActionProposal: (messageId: string, workItemId: string, reason?: string) => Promise<void>;
  discardActionProposal: (messageId: string, workItemId: string) => void;
}

// ============================================================================
// Hook
// ============================================================================

export interface UseBetaChatOptions {
  onTabChange?: (tab: string) => void;
}

export function useBetaChat(options?: UseBetaChatOptions): UseBetaChatReturn {
  // Stable ref for onTabChange callback to avoid re-render cascades
  const onTabChangeRef = useRef(options?.onTabChange);
  onTabChangeRef.current = options?.onTabChange;

  // Agency tenant for the AI chat backend calls (F2). Null outside the agency
  // layout → sendMessage degrades to an honest error.
  const { agency } = useAuth();
  const agencyId = agency?.id ?? null;

  // Initialize from localStorage (only on client)
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const stored = loadFromStorage();
    return stored.length > 0 ? stored : [createEmptyConversation()];
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    const stored = loadFromStorage();
    return stored.length > 0 ? stored[0].id : null;
  });

  // Streaming state
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Agent execution state
  const [activeAgentBlock, setActiveAgentBlock] = useState<AgentActivityBlock | null>(null);
  const [isAgentsRunning, setIsAgentsRunning] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Briefing state. Starts on the mock briefing (the SOLE mock fallback seam,
  // together with the no-backend chat reply below) and is replaced by the real
  // GET /ai-hub/briefing payload when the backend answers (effect further down).
  const [currentBriefing, setCurrentBriefing] = useState<DailyBriefing | null>(
    () => getTodayBriefing()
  );
  const [hasNewBriefing, setHasNewBriefing] = useState(true);
  const [briefings, setBriefings] = useState<DailyBriefing[]>(() => getMockBriefings());
  const [selectedBriefingId, setSelectedBriefingId] = useState<string | null>(null);

  // Preferences state
  const [preferences, setPreferences] = useState<BetaPreferences>(() => loadPreferencesFromStorage());

  // Timeout refs
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const charTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const charIndexRef = useRef(0);
  const agentTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Store pending streaming params for use after agent completion
  const pendingStreamRef = useRef<{
    assistantId: string;
    responseText: string;
    conversationId: string;
  } | null>(null);

  // Store pending decision to attach after streaming completes
  const pendingDecisionRef = useRef<import('@/lib/types/beta-chat').PendingDecision | null>(null);

  // Store pending response meta to attach after streaming completes
  const pendingResponseMetaRef = useRef<import('@/lib/types/beta-chat').ResponseMeta | null>(null);

  // Sync activeConversationId on init when state initializers may differ
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations]);

  // Persist to localStorage whenever conversations change
  useEffect(() => {
    saveToStorage(conversations);
  }, [conversations]);

  // Real daily briefing (F4): fetch GET /ai-hub/briefing once the agency is
  // known. fetchBriefing never throws and resolves `null` on 404/error/unusable
  // payload — in that case we keep the mock briefing already in state, so the
  // chat home works with or without the backend (fail-open).
  useEffect(() => {
    if (!agencyId || !isAgentConfigured()) return;
    const controller = new AbortController();
    void fetchBriefing({ agencyId, signal: controller.signal }).then((real) => {
      if (!real || controller.signal.aborted) return;
      setCurrentBriefing(real);
      // Once real data exists, showing mock "history" next to it would be
      // dishonest — the history list becomes just today's real briefing.
      setBriefings([real]);
      setSelectedBriefingId(null);
      setHasNewBriefing(true);
    });
    return () => controller.abort();
  }, [agencyId]);

  // Active conversation messages
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const messages = activeConversation?.messages ?? [];

  // Cleanup all timeouts
  const clearTimeouts = useCallback(() => {
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
      delayTimeoutRef.current = null;
    }
    if (charTimeoutRef.current) {
      clearTimeout(charTimeoutRef.current);
      charTimeoutRef.current = null;
    }
    agentTimeoutsRef.current.forEach(clearTimeout);
    agentTimeoutsRef.current = [];
  }, []);

  const getCharDelay = useCallback((char: string): number => {
    const baseInterval = 1000 / CHARS_PER_SECOND;
    if (LONG_PAUSE_CHARS.has(char)) return baseInterval * LONG_PAUSE_MULTIPLIER;
    if (SHORT_PAUSE_CHARS.has(char)) return baseInterval * SHORT_PAUSE_MULTIPLIER;
    return baseInterval;
  }, []);

  // ========================================================================
  // Start streaming response (reusable — called after agents complete or directly)
  // ========================================================================

  const startStreaming = useCallback(
    (assistantId: string, responseText: string, conversationId: string) => {
      charIndexRef.current = 0;
      setIsThinking(false);
      setIsStreaming(true);

      // Update status to streaming
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantId ? { ...m, status: 'streaming' as MessageStatus } : m
            ),
          };
        })
      );

      const revealNextChar = () => {
        if (charIndexRef.current >= responseText.length) {
          // Complete — attach pending decision and response meta
          const decision = pendingDecisionRef.current;
          pendingDecisionRef.current = null;
          const responseMeta = pendingResponseMetaRef.current;
          pendingResponseMetaRef.current = null;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== conversationId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: responseText,
                        status: 'complete' as MessageStatus,
                        ...(decision ? { decision } : {}),
                        ...(responseMeta ? { responseMeta } : {}),
                      }
                    : m
                ),
                updatedAt: new Date(),
              };
            })
          );
          setIsStreaming(false);
          setStreamingContent('');
          charTimeoutRef.current = null;
          return;
        }

        const currentChar = responseText[charIndexRef.current];
        charIndexRef.current += 1;
        const partial = responseText.slice(0, charIndexRef.current);
        setStreamingContent(partial);

        const delay = getCharDelay(currentChar);
        charTimeoutRef.current = setTimeout(revealNextChar, delay);
      };

      revealNextChar();
    },
    [getCharDelay]
  );

  // ========================================================================
  // F2 backend wiring — turn helpers (replace the mock agent simulation)
  // ========================================================================

  /** Set the response-card metadata on the assistant message (so ResponseCard renders). */
  const attachResponseMeta = useCallback(
    (assistantId: string, conversationId: string, responseMeta: ResponseMeta) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== conversationId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantId ? { ...m, responseMeta } : m
                ),
              }
        )
      );
    },
    []
  );

  /** Finalize the assistant message with an honest error (never leaves it 'sending'). */
  const finalizeError = useCallback(
    (assistantId: string, conversationId: string, message: string) => {
      clearTimeouts();
      setIsThinking(false);
      setIsStreaming(false);
      setStreamingContent('');
      setActiveAgentBlock(null);
      setIsAgentsRunning(false);
      pendingStreamRef.current = null;
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== conversationId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: message, status: 'complete' as MessageStatus }
                    : m
                ),
                updatedAt: new Date(),
              }
        )
      );
    },
    [clearTimeouts]
  );

  /**
   * Drive the agent-activity block from REAL backend dispatches: show the
   * specialists "running" briefly (live indicator), settle to their real
   * terminal status, attach the block + responseMeta to the message, then
   * stream the answer. Deterministic — the specialists already ran server-side.
   */
  const driveAgentBlock = useCallback(
    (
      dispatches: BackendDispatch[],
      assistantId: string,
      responseText: string,
      conversationId: string,
      responseMeta: ResponseMeta
    ) => {
      const startedAt = new Date();
      const running: AgentExecution[] = dispatches.map((d) => ({
        id: generateId(),
        agentType: backendAgentToFrontType(d.agent),
        taskDescription: d.taskDescription,
        status: 'running' as AgentExecutionStatus,
        startedAt,
      }));
      const block: AgentActivityBlock = {
        id: generateId(),
        messageId: assistantId,
        agents: running,
        startedAt,
      };

      setIsThinking(false);
      setActiveAgentBlock(block);
      setIsAgentsRunning(true);
      pendingStreamRef.current = { assistantId, responseText, conversationId };

      const settle = setTimeout(() => {
        // Preserve each running exec's id; apply the real terminal status.
        const terminal: AgentExecution[] = running.map((r, i) => {
          const d = dispatches[i];
          return {
            ...r,
            status: (d.status === 'failed' ? 'failed' : 'completed') as AgentExecutionStatus,
            completedAt: new Date(),
            ...(d.status === 'failed' ? { error: d.summary } : {}),
          };
        });
        const completedBlock: AgentActivityBlock = { ...block, agents: terminal };
        setActiveAgentBlock(completedBlock);
        setConversations((prev) =>
          prev.map((c) =>
            c.id !== conversationId
              ? c
              : {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantId
                      ? { ...m, agentActivity: completedBlock, responseMeta }
                      : m
                  ),
                }
          )
        );
        setIsAgentsRunning(false);

        const toStream = setTimeout(() => {
          setActiveAgentBlock(null);
          if (pendingStreamRef.current) {
            startStreaming(
              pendingStreamRef.current.assistantId,
              pendingStreamRef.current.responseText,
              pendingStreamRef.current.conversationId
            );
            pendingStreamRef.current = null;
          }
        }, 400);
        agentTimeoutsRef.current.push(toStream);
      }, 600);
      agentTimeoutsRef.current.push(settle);
    },
    [startStreaming]
  );

  // ========================================================================
  // Retry failed agent
  // ========================================================================

  const retryAgent = useCallback(
    (executionId: string) => {
      setActiveAgentBlock((prev) => {
        if (!prev) return prev;
        const agent = prev.agents.find((a) => a.id === executionId);
        if (!agent || agent.status !== 'failed') return prev;

        // Reset to running
        const updated = {
          ...prev,
          agents: prev.agents.map((a) =>
            a.id === executionId
              ? { ...a, status: 'running' as AgentExecutionStatus, error: undefined, completedAt: undefined, durationMs: undefined }
              : a
          ),
        };

        // Simulate retry completing after 1-2s
        const retryDuration = 1000 + Math.random() * 1000;
        const retryTimeout = setTimeout(() => {
          setActiveAgentBlock((current) => {
            if (!current) return current;
            return {
              ...current,
              agents: current.agents.map((a) =>
                a.id === executionId
                  ? {
                      ...a,
                      status: 'completed' as AgentExecutionStatus,
                      completedAt: new Date(),
                      durationMs: Math.round(retryDuration),
                      error: undefined,
                    }
                  : a
              ),
            };
          });

          // Check if all agents are now complete after retry
          setTimeout(() => {
            setActiveAgentBlock((current) => {
              if (!current) return current;
              const allDone = current.agents.every(
                (a) => a.status === 'completed' || a.status === 'failed'
              );
              if (allDone && !current.agents.some((a) => a.status === 'failed')) {
                // All complete, no failures — attach to message and start streaming
                if (pendingStreamRef.current) {
                  const { assistantId, conversationId } = pendingStreamRef.current;
                  setConversations((prevConvs) =>
                    prevConvs.map((c) => {
                      if (c.id !== conversationId) return c;
                      return {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantId ? { ...m, agentActivity: current } : m
                        ),
                      };
                    })
                  );
                  setIsAgentsRunning(false);
                  const streamDelay = setTimeout(() => {
                    setActiveAgentBlock(null);
                    if (pendingStreamRef.current) {
                      startStreaming(
                        pendingStreamRef.current.assistantId,
                        pendingStreamRef.current.responseText,
                        pendingStreamRef.current.conversationId
                      );
                      pendingStreamRef.current = null;
                    }
                  }, 400);
                  agentTimeoutsRef.current.push(streamDelay);
                }
              }
              return current;
            });
          }, 100);
        }, retryDuration);
        agentTimeoutsRef.current.push(retryTimeout);

        return updated;
      });
    },
    [startStreaming]
  );

  // ========================================================================
  // Finish a turn — shared by the SSE path and the one-shot POST fallback.
  // When the SSE path already animated dispatches live, `liveBlock` carries
  // that block so we settle it instead of re-simulating with driveAgentBlock.
  // ========================================================================

  const finishTurn = useCallback(
    (
      resp: {
        responseText: string;
        suggestedActions: BackendSuggestedAction[];
        dispatches: BackendDispatch[];
      },
      assistantId: string,
      conversationId: string,
      liveBlock: AgentActivityBlock | null
    ) => {
      const actions = resp.suggestedActions.map(suggestedActionToResponseAction);
      const summaries = resp.dispatches
        .map((d) => d.summary)
        .filter((s): s is string => Boolean(s));
      const fullText = [resp.responseText, ...summaries].filter(Boolean).join('\n\n');
      const responseMeta: ResponseMeta = {
        type: 'informative',
        title: 'Asistente Leasefy',
        summary: '',
        actions,
        ...(resp.dispatches[0]
          ? { primaryAgent: backendAgentToFrontType(resp.dispatches[0].agent) }
          : {}),
      };
      pendingResponseMetaRef.current = responseMeta;

      if (liveBlock && liveBlock.agents.length > 0) {
        // The stream already showed the dispatches live — settle any straggler
        // still "running", attach the block to the message, then stream the text.
        const terminal: AgentExecution[] = liveBlock.agents.map((a) =>
          a.status === 'running'
            ? {
                ...a,
                status: 'completed' as AgentExecutionStatus,
                completedAt: new Date(),
              }
            : a
        );
        const completedBlock: AgentActivityBlock = { ...liveBlock, agents: terminal };
        setActiveAgentBlock(completedBlock);
        setConversations((prev) =>
          prev.map((c) =>
            c.id !== conversationId
              ? c
              : {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantId
                      ? { ...m, agentActivity: completedBlock, responseMeta }
                      : m
                  ),
                }
          )
        );
        setIsAgentsRunning(false);
        const toStream = setTimeout(() => {
          setActiveAgentBlock(null);
          startStreaming(assistantId, fullText, conversationId);
        }, 400);
        agentTimeoutsRef.current.push(toStream);
      } else if (resp.dispatches.length > 0) {
        driveAgentBlock(resp.dispatches, assistantId, fullText, conversationId, responseMeta);
      } else {
        attachResponseMeta(assistantId, conversationId, responseMeta);
        setIsThinking(false);
        startStreaming(assistantId, fullText, conversationId);
      }
    },
    [startStreaming, driveAgentBlock, attachResponseMeta]
  );

  // ========================================================================
  // F2c — streaming turn over SSE. Drives the agent-activity block LIVE from
  // dispatch_start/dispatch_result events while the stream is open, then
  // resolves with the final response pieces (from `done`, falling back to the
  // accumulated `message` event). Throws when the stream fails or yields
  // nothing usable — the caller falls back to the one-shot POST.
  // ========================================================================

  const runStreamTurn = useCallback(
    async (args: {
      agencyId: string;
      message: string;
      history: { role: 'user' | 'assistant'; content: string }[];
      assistantId: string;
      conversationId: string;
    }): Promise<{
      responseText: string;
      suggestedActions: BackendSuggestedAction[];
      dispatches: BackendDispatch[];
      liveBlock: AgentActivityBlock | null;
    }> => {
      const startedAt = new Date();
      let liveBlock: AgentActivityBlock | null = null;
      let messageText = '';
      let messageActions: BackendSuggestedAction[] = [];
      const resultDispatches: BackendDispatch[] = [];
      // Object holder (not bare `let`s): assignments happen inside the stream
      // callbacks, where TS control-flow narrowing would otherwise pin the
      // outer reads to the initializer type.
      const collected: {
        final: {
          responseText: string;
          suggestedActions: BackendSuggestedAction[];
          dispatches: BackendDispatch[];
        } | null;
        streamError: string | null;
      } = { final: null, streamError: null };

      await streamChatTurn({
        agencyId: args.agencyId,
        message: args.message,
        history: args.history,
        handlers: {
          onMessage: (text, actions) => {
            messageText = text;
            messageActions = actions;
          },
          onDispatchStart: (agent, taskDescription) => {
            const exec: AgentExecution = {
              id: generateId(),
              agentType: backendAgentToFrontType(agent),
              taskDescription,
              status: 'running' as AgentExecutionStatus,
              startedAt: new Date(),
            };
            liveBlock = liveBlock
              ? { ...liveBlock, agents: [...liveBlock.agents, exec] }
              : {
                  id: generateId(),
                  messageId: args.assistantId,
                  agents: [exec],
                  startedAt,
                };
            setIsThinking(false);
            setIsAgentsRunning(true);
            setActiveAgentBlock(liveBlock);
          },
          onDispatchResult: (dispatch) => {
            resultDispatches.push(dispatch);
            if (!liveBlock) return;
            const agentType = backendAgentToFrontType(dispatch.agent);
            let settled = false;
            const agents = liveBlock.agents.map((a) => {
              if (settled || a.status !== 'running' || a.agentType !== agentType) {
                return a;
              }
              settled = true;
              return {
                ...a,
                status: (dispatch.status === 'failed'
                  ? 'failed'
                  : 'completed') as AgentExecutionStatus,
                completedAt: new Date(),
                ...(dispatch.status === 'failed' ? { error: dispatch.summary } : {}),
              };
            });
            liveBlock = { ...liveBlock, agents };
            setActiveAgentBlock(liveBlock);
          },
          // F5: action_proposal events — append to the assistant message (D-42-03 fail-open).
          onActionProposal: (proposal: BackendActionProposal) => {
            try {
              const frontProposal: ActionProposal = {
                workItemId: proposal.workItemId,
                colaType: proposal.colaType,
                action: proposal.action,
                resumen: proposal.resumen,
                requiresConfirmation: true,
                status: 'pending',
              };
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id !== args.conversationId) return c;
                  return {
                    ...c,
                    messages: c.messages.map((m) => {
                      if (m.id !== args.assistantId) return m;
                      const existing = m.actionProposals ?? [];
                      // Deduplicate by workItemId (stream may re-send).
                      if (existing.some((p) => p.workItemId === proposal.workItemId)) return m;
                      return { ...m, actionProposals: [...existing, frontProposal] };
                    }),
                  };
                })
              );
            } catch {
              // Fail-open: never crash the stream.
              console.warn('[useBetaChat] failed to apply action_proposal, ignored');
            }
          },
          onDone: (f) => {
            collected.final = {
              responseText: f.responseText,
              suggestedActions: f.suggestedActions,
              dispatches: f.dispatches,
            };
          },
          onError: (message) => {
            collected.streamError = message;
          },
        },
      });

      const { final, streamError } = collected;
      if (streamError && !final) throw new Error(streamError);
      const responseText = final?.responseText || messageText;
      const dispatches =
        final && final.dispatches.length > 0 ? final.dispatches : resultDispatches;
      const suggestedActions =
        final && final.suggestedActions.length > 0
          ? final.suggestedActions
          : messageActions;
      if (!responseText && dispatches.length === 0) {
        throw new Error('empty stream');
      }
      return { responseText, suggestedActions, dispatches, liveBlock };
    },
    []
  );

  // ========================================================================
  // MOCK FALLBACK SEAM — the ONE mock path kept on purpose (dev posture).
  // Reached only when there is no agency tenant yet (auth still resolving /
  // outside the agency layout) or no NEXT_PUBLIC_AGENT_URL in the build
  // (local dev without the agent service). Answers from the keyword mock so
  // the chat home stays demoable; real-backend turns never reach this.
  // ========================================================================

  const runMockTurn = useCallback(
    (text: string, assistantId: string, conversationId: string) => {
      const responseText = getMockResponse(text);
      const responseMeta = getMockResponseMeta(text);
      pendingResponseMetaRef.current = responseMeta;
      attachResponseMeta(assistantId, conversationId, responseMeta);
      const thinkDelay = setTimeout(() => {
        setIsThinking(false);
        startStreaming(assistantId, responseText, conversationId);
      }, 600);
      agentTimeoutsRef.current.push(thinkDelay);
    },
    [attachResponseMeta, startStreaming]
  );

  // ========================================================================
  // Send message — real AI chat backend, SSE-first (F2c):
  //   stream → (on failure) one-shot POST → (on failure) honest error.
  //   No backend configured / no agency → mock fallback seam.
  // ========================================================================

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking || isStreaming || isAgentsRunning || !activeConversationId) return;

      const conversationId = activeConversationId;
      const activeConv = conversations.find((c) => c.id === conversationId);
      // History from prior turns (completed), oldest→newest, capped at 10. Sent
      // as a fallback; the backend prefers its own server-side memory when set.
      const history = (activeConv?.messages ?? [])
        .filter(
          (m) =>
            (m.role === 'user' && m.content) ||
            (m.role === 'assistant' && m.status === 'complete' && m.content)
        )
        .slice(-10)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
        status: 'sent',
      };
      const assistantId = generateId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'sending',
      };

      // Update conversation with new messages + auto-title
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          const isFirstMessage = c.messages.length === 0;
          return {
            ...c,
            title: isFirstMessage ? generateTitle(trimmed) : c.title,
            messages: [...c.messages, userMessage, assistantMessage],
            updatedAt: new Date(),
          };
        })
      );

      setIsThinking(true);
      setStreamingContent('');
      pendingDecisionRef.current = null;
      pendingResponseMetaRef.current = null;

      // MOCK FALLBACK SEAM (see runMockTurn above).
      if (!agencyId || !isAgentConfigured()) {
        runMockTurn(trimmed, assistantId, conversationId);
        return;
      }

      void (async () => {
        try {
          // F2c: SSE first — live dispatch indicators + lower perceived latency.
          const streamed = await runStreamTurn({
            agencyId,
            message: trimmed,
            history,
            assistantId,
            conversationId,
          });
          finishTurn(streamed, assistantId, conversationId, streamed.liveBlock);
        } catch {
          // Stream failed (route missing, proxy buffering, mid-stream drop) →
          // clear any partial live UI and fall back to the one-shot POST.
          setActiveAgentBlock(null);
          setIsAgentsRunning(false);
          try {
            const resp = await postChatTurn({ agencyId, message: trimmed, history });
            finishTurn(resp, assistantId, conversationId, null);
          } catch {
            finalizeError(
              assistantId,
              conversationId,
              'No pude conectarme con el asistente en este momento. Intentá de nuevo en un momento.'
            );
          }
        }
      })();
    },
    [
      isThinking,
      isStreaming,
      isAgentsRunning,
      activeConversationId,
      conversations,
      agencyId,
      runMockTurn,
      runStreamTurn,
      finishTurn,
      finalizeError,
    ]
  );

  // ========================================================================
  // Conversation CRUD
  // ========================================================================

  const createConversation = useCallback(() => {
    // Stop any in-flight streaming or agent execution
    clearTimeouts();
    setIsThinking(false);
    setIsStreaming(false);
    setStreamingContent('');
    setActiveAgentBlock(null);
    setIsAgentsRunning(false);
    pendingStreamRef.current = null;

    const newConv = createEmptyConversation();
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  }, [clearTimeouts]);

  const switchConversation = useCallback(
    (id: string) => {
      if (id === activeConversationId) return;
      // Stop streaming/agents if switching mid-stream
      clearTimeouts();
      setIsThinking(false);
      setIsStreaming(false);
      setStreamingContent('');
      setActiveAgentBlock(null);
      setIsAgentsRunning(false);
      pendingStreamRef.current = null;
      setActiveConversationId(id);
      // Switch to conversations tab so the user sees the conversation
      onTabChangeRef.current?.('conversations');
    },
    [activeConversationId, clearTimeouts]
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        // If deleting the active conversation, switch to first remaining or create new
        if (id === activeConversationId) {
          if (filtered.length > 0) {
            setActiveConversationId(filtered[0].id);
          } else {
            const newConv = createEmptyConversation();
            setActiveConversationId(newConv.id);
            return [newConv];
          }
        }
        return filtered;
      });
      clearTimeouts();
      setIsThinking(false);
      setIsStreaming(false);
      setStreamingContent('');
      setActiveAgentBlock(null);
      setIsAgentsRunning(false);
      pendingStreamRef.current = null;
    },
    [activeConversationId, clearTimeouts]
  );

  // ========================================================================
  // Decision selection
  // ========================================================================

  const selectDecisionOption = useCallback(
    (messageId: string, optionId: string) => {
      if (!activeConversationId) return;

      // Find the option label for the user response message
      let optionLabel = '';
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== messageId || !m.decision) return m;
              const option = m.decision.options.find((o) => o.id === optionId);
              if (option) optionLabel = option.label;
              return {
                ...m,
                decision: {
                  ...m.decision,
                  selectedOptionId: optionId,
                  selectedAt: new Date(),
                },
              };
            }),
            updatedAt: new Date(),
          };
        })
      );

      // Send a user message confirming the selection, then trigger a mock response
      if (optionLabel) {
        // Small delay so the decision card updates visually first
        setTimeout(() => {
          sendMessage(`He seleccionado: ${optionLabel}`);
        }, 300);
      }
    },
    [activeConversationId, sendMessage]
  );

  // ========================================================================
  // Decision aggregation (across all conversations)
  // ========================================================================

  const allDecisions: DecisionEntry[] = conversations.flatMap((c) =>
    c.messages
      .filter((m): m is ChatMessage & { decision: PendingDecision } => !!m.decision)
      .map((m) => ({
        decision: m.decision,
        conversationId: c.id,
        conversationTitle: c.title,
        messageId: m.id,
      }))
  );

  const pendingDecisionsCount = allDecisions.filter(
    (d) => !d.decision.selectedOptionId
  ).length;

  // ========================================================================
  // Agent activity aggregation (across all conversations)
  // ========================================================================

  const allAgentActivities: AgentActivityEntry[] = conversations.flatMap((c) =>
    c.messages
      .filter((m): m is ChatMessage & { agentActivity: AgentActivityBlock } => !!m.agentActivity)
      .map((m) => ({
        activity: m.agentActivity,
        conversationId: c.id,
        conversationTitle: c.title,
      }))
  );

  // ========================================================================
  // Action proposals (F5)
  // ========================================================================

  /**
   * Execute a confirmed action proposal. Updates the proposal status to
   * 'confirming' → 'executed' | 'error' in conversation state.
   */
  const confirmActionProposal = useCallback(
    async (messageId: string, workItemId: string, reason?: string): Promise<void> => {
      if (!agencyId) throw new Error('No agency');

      // Mark as confirming
      const updateStatus = (
        status: ActionProposal['status'],
        extra?: Partial<ActionProposal>
      ) => {
        setConversations((prev) =>
          prev.map((c) => ({
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== messageId || !m.actionProposals) return m;
              return {
                ...m,
                actionProposals: m.actionProposals.map((p) =>
                  p.workItemId === workItemId ? { ...p, status, ...extra } : p
                ),
              };
            }),
          }))
        );
      };

      updateStatus('confirming');
      try {
        // Find the action from state to pass to the network call
        let action: ActionProposal['action'] | undefined;
        setConversations((prev) => {
          const msg = prev
            .flatMap((c) => c.messages)
            .find((m) => m.id === messageId);
          action = msg?.actionProposals?.find((p) => p.workItemId === workItemId)?.action;
          return prev;
        });

        if (!action) throw new Error('Proposal not found');
        await executeAction({ agencyId, workItemId, action, reason });
        updateStatus('executed', { result: true });
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Error al ejecutar la acción';
        updateStatus('error', { error });
        throw err; // re-throw so the card can show the error (if it handles it)
      }
    },
    [agencyId]
  );

  /** Discard a proposal UI-only (no network call). */
  const discardActionProposal = useCallback(
    (messageId: string, workItemId: string) => {
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          messages: c.messages.map((m) => {
            if (m.id !== messageId || !m.actionProposals) return m;
            return {
              ...m,
              actionProposals: m.actionProposals.map((p) =>
                p.workItemId === workItemId ? { ...p, status: 'discarded' as const } : p
              ),
            };
          }),
        }))
      );
    },
    []
  );

  // ========================================================================
  // Search / Summaries
  // ========================================================================

  const filteredSummaries: ConversationSummary[] = conversations
    .filter((c) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      if (c.title.toLowerCase().includes(query)) return true;
      return c.messages.some((m) => m.content.toLowerCase().includes(query));
    })
    .map((c) => ({
      id: c.id,
      title: c.title,
      preview: getPreview(c.messages),
      updatedAt: c.updatedAt,
      messageCount: c.messages.length,
    }));

  // ========================================================================
  // Briefing action — sends context message and switches to conversations tab
  // ========================================================================

  const sendBriefingAction = useCallback(
    (sectionId: string, context: string) => {
      // Switch to conversations tab so the user sees the response
      onTabChangeRef.current?.('conversations');
      // Ensure there's an active conversation
      if (!activeConversationId) {
        createConversation();
      }
      // Send the context message as if the user typed it
      sendMessage(context);
    },
    [activeConversationId, createConversation, sendMessage]
  );

  // ========================================================================
  // Briefing notification & history
  // ========================================================================

  const markBriefingSeen = useCallback(() => {
    setHasNewBriefing(false);
  }, []);

  const selectBriefing = useCallback((id: string) => {
    setSelectedBriefingId(id);
  }, []);

  // Computed: selected briefing defaults to today (first in array)
  const selectedBriefing = selectedBriefingId
    ? briefings.find((b) => b.id === selectedBriefingId) ?? briefings[0] ?? null
    : briefings[0] ?? null;

  // ========================================================================
  // Preferences persistence & mutations
  // ========================================================================

  // Persist preferences to localStorage whenever they change
  useEffect(() => {
    savePreferencesToStorage(preferences);
  }, [preferences]);

  const updatePreferences = useCallback((partial: Partial<BetaPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev };
      if (partial.autonomy) {
        next.autonomy = { ...prev.autonomy, ...partial.autonomy };
      }
      if (partial.notifications) {
        next.notifications = {
          ...prev.notifications,
          ...partial.notifications,
          categories: partial.notifications.categories
            ? { ...prev.notifications.categories, ...partial.notifications.categories }
            : prev.notifications.categories,
        };
      }
      if (partial.tone !== undefined) {
        next.tone = partial.tone;
      }
      if (partial.thresholds) {
        next.thresholds = { ...prev.thresholds, ...partial.thresholds };
      }
      return next;
    });
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  return {
    // Loading state (always false in mock mode; real API sets true during fetch)
    isLoading: false,

    // Current conversation
    messages,
    sendMessage,
    isThinking,
    isStreaming,
    streamingContent,

    // Agent execution
    activeAgentBlock,
    isAgentsRunning,
    retryAgent,

    // Decision handling
    selectDecisionOption,
    pendingDecisionsCount,
    allDecisions,

    // Agent activity aggregation
    allAgentActivities,

    // Conversation management
    conversations,
    activeConversationId,
    createConversation,
    switchConversation,
    deleteConversation,

    // Search
    searchQuery,
    setSearchQuery,
    filteredSummaries,

    // Briefing
    currentBriefing,
    sendBriefingAction,
    hasNewBriefing,
    markBriefingSeen,
    briefings,
    selectedBriefing,
    selectBriefing,

    // Preferences
    preferences,
    updatePreferences,
    resetPreferences,

    // Action proposals (F5)
    confirmActionProposal,
    discardActionProposal,
  };
}
