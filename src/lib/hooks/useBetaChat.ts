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
} from '@/lib/types/beta-chat';
import type { DailyBriefing } from '@/lib/types/beta-chat';
import { getMockResponse } from '@/lib/data/mock-chat-responses';
import { getMockAgentScenario } from '@/lib/data/mock-agent-executions';
import { getMockDecisionScenario } from '@/lib/data/mock-decisions';
import { getTodayBriefing, getMockBriefings } from '@/lib/data/mock-briefings';

// ============================================================================
// Constants
// ============================================================================

const RESPONSE_DELAY_MIN = 800;
const RESPONSE_DELAY_MAX = 1500;
const CHARS_PER_SECOND = 40;
const LONG_PAUSE_CHARS = new Set(['.', '!', '?']);
const SHORT_PAUSE_CHARS = new Set([',', ';', ':']);
const LONG_PAUSE_MULTIPLIER = 6;
const SHORT_PAUSE_MULTIPLIER = 3;

const STORAGE_KEY = 'leasefy-beta-conversations';
const TITLE_MAX_LENGTH = 50;
const PREVIEW_MAX_LENGTH = 80;

/** Delay between agent status transitions (ms) */
const AGENT_DISPATCH_STAGGER = 300;
/** Base delay for dispatching → running transition */
const AGENT_DISPATCH_DURATION = 400;
/** Probability of an agent failing (~10%) */
const AGENT_FAILURE_PROBABILITY = 0.1;

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function randomDelay(): number {
  return Math.floor(
    Math.random() * (RESPONSE_DELAY_MAX - RESPONSE_DELAY_MIN) + RESPONSE_DELAY_MIN
  );
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
// Hook Return Type
// ============================================================================

/** A decision entry with context about its source conversation */
export interface DecisionEntry {
  decision: PendingDecision;
  conversationId: string;
  conversationTitle: string;
  messageId: string;
}

export interface UseBetaChatReturn {
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
}

// ============================================================================
// Hook
// ============================================================================

export function useBetaChat(): UseBetaChatReturn {
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

  // Briefing state
  const [currentBriefing] = useState<DailyBriefing | null>(() => getTodayBriefing());
  const [hasNewBriefing, setHasNewBriefing] = useState(true);
  const [briefings] = useState<DailyBriefing[]>(() => getMockBriefings());
  const [selectedBriefingId, setSelectedBriefingId] = useState<string | null>(null);

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
          // Complete — also attach pending decision if any
          const decision = pendingDecisionRef.current;
          pendingDecisionRef.current = null;
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
  // Agent execution simulation
  // ========================================================================

  const simulateAgentExecution = useCallback(
    (
      agentScenario: Array<{ agentType: string; taskDescription: string; durationMs: number }>,
      assistantId: string,
      responseText: string,
      conversationId: string
    ) => {
      const now = new Date();
      const blockId = generateId();

      // Pick one random agent to fail (~10% chance per scenario)
      const shouldFailIndex = Math.random() < AGENT_FAILURE_PROBABILITY
        ? Math.floor(Math.random() * agentScenario.length)
        : -1;

      // Create initial agent executions in "dispatching" state
      const agentExecutions: AgentExecution[] = agentScenario.map((scenario, idx) => ({
        id: generateId(),
        agentType: scenario.agentType as AgentExecution['agentType'],
        taskDescription: scenario.taskDescription,
        status: 'dispatching' as AgentExecutionStatus,
        startedAt: now,
        ...(idx === shouldFailIndex ? { _willFail: true } : {}),
      }));

      // Store failure flags separately (not in the type)
      const failureMap = new Map<string, boolean>();
      agentExecutions.forEach((agent, idx) => {
        if (idx === shouldFailIndex) failureMap.set(agent.id, true);
      });

      const activityBlock: AgentActivityBlock = {
        id: blockId,
        messageId: assistantId,
        agents: agentExecutions,
        startedAt: now,
      };

      setActiveAgentBlock(activityBlock);
      setIsAgentsRunning(true);

      // Store pending stream params
      pendingStreamRef.current = { assistantId, responseText, conversationId };

      // Stagger agent transitions: dispatching → running → completed/failed
      let completedCount = 0;
      const totalAgents = agentExecutions.length;

      agentExecutions.forEach((agent, index) => {
        const staggerDelay = index * AGENT_DISPATCH_STAGGER;

        // dispatching → running
        const toRunning = setTimeout(() => {
          setActiveAgentBlock((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              agents: prev.agents.map((a) =>
                a.id === agent.id ? { ...a, status: 'running' as AgentExecutionStatus } : a
              ),
            };
          });
        }, staggerDelay + AGENT_DISPATCH_DURATION);
        agentTimeoutsRef.current.push(toRunning);

        // running → completed/failed
        const scenario = agentScenario[index];
        const toComplete = setTimeout(() => {
          const willFail = failureMap.get(agent.id) ?? false;

          setActiveAgentBlock((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              agents: prev.agents.map((a) =>
                a.id === agent.id
                  ? {
                      ...a,
                      status: (willFail ? 'failed' : 'completed') as AgentExecutionStatus,
                      completedAt: new Date(),
                      durationMs: scenario.durationMs,
                      ...(willFail ? { error: 'Error de conexion con el servicio' } : {}),
                    }
                  : a
              ),
            };
          });

          completedCount += 1;
          if (completedCount === totalAgents) {
            // All agents done — attach activity block to message, then stream response
            const finishTimeout = setTimeout(() => {
              setActiveAgentBlock((prev) => {
                if (!prev) return null;
                // Attach completed agent block to the assistant message
                setConversations((prevConvs) =>
                  prevConvs.map((c) => {
                    if (c.id !== conversationId) return c;
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantId ? { ...m, agentActivity: prev } : m
                      ),
                    };
                  })
                );
                return prev; // Keep visible until streaming starts
              });

              setIsAgentsRunning(false);

              // Start streaming after a brief pause
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
            }, 300);
            agentTimeoutsRef.current.push(finishTimeout);
          }
        }, staggerDelay + AGENT_DISPATCH_DURATION + scenario.durationMs);
        agentTimeoutsRef.current.push(toComplete);
      });
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
  // Send message (with agent execution before streaming)
  // ========================================================================

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking || isStreaming || isAgentsRunning || !activeConversationId) return;

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
      const conversationId = activeConversationId;
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

      const responseText = getMockResponse(trimmed);
      const agentScenario = getMockAgentScenario(trimmed);
      const decisionScenario = getMockDecisionScenario(trimmed);

      // Store pending decision for attachment after streaming completes
      pendingDecisionRef.current = decisionScenario;

      if (agentScenario && agentScenario.length > 0) {
        // Agents to dispatch — show agent execution before streaming
        delayTimeoutRef.current = setTimeout(() => {
          setIsThinking(false);
          simulateAgentExecution(agentScenario, assistantId, responseText, conversationId);
        }, 300); // Short delay before agents start
      } else {
        // No agents — go directly to streaming (existing flow)
        delayTimeoutRef.current = setTimeout(() => {
          startStreaming(assistantId, responseText, conversationId);
        }, randomDelay());
      }
    },
    [isThinking, isStreaming, isAgentsRunning, activeConversationId, simulateAgentExecution, startStreaming]
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

  return {
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
  };
}
