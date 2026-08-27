'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatDataCard, type ChatDataTile } from '@leasefy/cadence';
import type { ChatSnapshot } from '@/lib/types/beta-chat';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { ChatMessageSkeleton } from './BetaSkeletons';
import { BetaWelcome } from './BetaWelcome';
import { UserBubble } from './UserBubble';
import { AssistantBubble } from './AssistantBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { AgentActivityIndicator } from './AgentActivityIndicator';
import { AgentTaskThread } from './AgentTaskThread';
import { AgentTaskProgress } from './AgentTaskProgress';
import { ResponseCard } from './ResponseCard';
import { WorkspaceView } from './WorkspaceView';
import { DecisionCard } from './DecisionCard';
import { ChatConversationBar } from './ChatConversationBar';

interface ChatContainerProps {
  className?: string;
}

/**
 * Helper: format duration in ms to human string.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Should this response render as a rich ResponseCard, or as plain assistant text?
 *
 * A simple/informative answer with nothing to act on reads like ChatGPT/Claude —
 * just text (AssistantBubble). The framed card (header + type badge + actions) is
 * reserved for responses that actually carry structure: an actionable result, CTA
 * actions, or an attached decision. Rich data (tables, entity cards, etc.) rides
 * inside the content/decision when present, not as default chrome on every reply.
 */
function responseNeedsCard(message: {
  responseMeta?: { type?: string; actions?: unknown[] };
  decision?: unknown;
}): boolean {
  const meta = message.responseMeta;
  if (!meta) return false;
  return meta.type === 'actionable' || (meta.actions?.length ?? 0) > 0 || !!message.decision;
}

/** Compact COP for a narrow mono tile, e.g. 8_420_000 → "$8,4 M". */
function formatCopCompact(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

/**
 * The "estado de hoy" snapshot → ChatDataCard tiles. Always shows the 3 core
 * KPIs (deudores / pagado hoy / llamadas); appends escalaciones + prejurídico
 * only when > 0 so the glance stays clean when there's nothing pending.
 */
function snapshotTiles(s: ChatSnapshot): ChatDataTile[] {
  const tiles: ChatDataTile[] = [
    { label: 'Deudores activos', value: s.deudoresActivos },
    { label: 'Pagado hoy', value: formatCopCompact(s.pagadoHoyCop) },
    { label: 'Llamadas hoy', value: s.llamadasHoy },
  ];
  if (s.escalacionesPendientes > 0) {
    tiles.push({ label: 'Escalaciones', value: s.escalacionesPendientes });
  }
  if (s.enPrejuridico > 0) {
    tiles.push({ label: 'Prejurídico', value: s.enPrejuridico });
  }
  return tiles;
}

/**
 * ChatContainer - Main chat area with premium visual experience.
 *
 * Empty state: BetaWelcome with animated prompt cards.
 * Active state: message list with ResponseCards + WorkspaceView.
 * Features: subtle dot grid background, floating input, glass morphism throughout.
 */
export function ChatContainer({ className }: ChatContainerProps) {
  const { t } = useI18n();
  const {
    isLoading,
    messages,
    sendMessage,
    isThinking,
    isStreaming,
    streamingContent,
    activeAgentBlock,
    isAgentsRunning,
    retryAgent,
    selectDecisionOption,
  } = useBetaChatContext();

  const [workspaceMessageId, setWorkspaceMessageId] = useState<string | null>(null);
  // El contenedor de mensajes sólo existe con mensajes; el listener de scroll
  // se engancha cuando aparece.
  const hasMessagesForScroll = messages.length > 0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const lastWorkspaceTriggerId = useRef<string | null>(null);

  // ── Auto-scroll que sigue la respuesta (patrón Claude / ChatGPT) ──────────
  //
  // Nico, 2026-08-27: «cuando llega algo nuevo le toca a uno hacer scroll
  // down, y no debería: él debería ir haciendo el scroll».
  //
  // Lo que había medía «¿estás cerca del fondo?» DENTRO del efecto, o sea
  // DESPUÉS de que el contenido nuevo ya se pintó. Un párrafo largo o un
  // bloque de agentes hacía crecer `scrollHeight` más de 100px de golpe, la
  // medición concluía «el usuario se alejó del fondo» y no bajaba — justo
  // cuando más contenido llegaba. La pregunta correcta no es dónde está el
  // scroll ahora, sino qué hizo el USUARIO: si él no se despegó del fondo,
  // se lo sigue; si subió a leer algo, se lo respeta hasta que vuelva abajo.
  // Eso se sabe escuchando el scroll, no midiendo después del render.
  const siguiendo = useRef(true);
  useEffect(() => {
    const el = messagesAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      siguiendo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasMessagesForScroll]);

  useEffect(() => {
    if (!siguiendo.current) return;
    const el = messagesAreaRef.current;
    if (!el) return;
    // Directo, sin `smooth`: durante el streaming llegan varios cambios por
    // segundo y una animación encadenada sobre otra tartamudea; el salto
    // inmediato al fondo es lo que hacen Claude y ChatGPT.
    el.scrollTop = el.scrollHeight;
  }, [messages, streamingContent, isThinking, activeAgentBlock, isAgentsRunning]);

  // Auto-enter workspace mode when an actionable response with steps completes
  useEffect(() => {
    if (isStreaming || isThinking || isAgentsRunning || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage.role === 'assistant' &&
      lastMessage.status === 'complete' &&
      lastMessage.responseMeta?.type === 'actionable' &&
      lastMessage.responseMeta?.steps &&
      lastMessage.responseMeta.steps.length > 0 &&
      lastMessage.id !== lastWorkspaceTriggerId.current
    ) {
      lastWorkspaceTriggerId.current = lastMessage.id;
      setWorkspaceMessageId(lastMessage.id);
    }
  }, [messages, isStreaming, isThinking, isAgentsRunning]);

  const closeWorkspace = useCallback(() => {
    setWorkspaceMessageId(null);
  }, []);

  // Find workspace message
  const workspaceMessage = workspaceMessageId
    ? messages.find((m) => m.id === workspaceMessageId)
    : null;

  const hasMessages = messages.length > 0;
  const isBusy = isThinking || isStreaming || isAgentsRunning;

  if (isLoading) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <ChatMessageSkeleton />
      </div>
    );
  }

  // Workspace mode — full takeover for actionable responses with steps
  if (workspaceMessage && workspaceMessage.responseMeta) {
    return (
      <WorkspaceView
        meta={workspaceMessage.responseMeta}
        content={workspaceMessage.content}
        onClose={closeWorkspace}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn('flex flex-col h-full', className)}
    >
      {hasMessages ? (
        <>
          {/* Barra de conversación — plantillas siempre alcanzables + terminar.
              Sin esto, escribir el primer mensaje tapaba el estado-0 para
              siempre: no había forma de volver a las plantillas ni de cerrar
              la conversación y empezar otra (Nico, 2026-08-27). */}
          <ChatConversationBar onSelectTemplate={sendMessage} />

          {/* Messages area */}
          {/* data-lenis-prevent: Lenis hijacks wheel events globally; without it
              this nested scroller only moves via the scrollbar. Scrollbar is
              hidden (same idiom as tabs.tsx) since wheel/touch handles it. */}
          <div
            ref={messagesAreaRef}
            data-lenis-prevent
            className="relative flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-6 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-live="polite"
            aria-label={t('beta.a11y.newMessageRegion')}
          >
            {/* Center-constrain messages for wider screens */}
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((message, index) => {
                const isLastAssistant =
                  message.role === 'assistant' &&
                  index === messages.length - 1;

                if (message.role === 'user') {
                  return <UserBubble key={message.id} message={message} />;
                }

                // Completed agent activity stored on the message (from previous turns)
                const storedActivity = message.agentActivity;

                // "Estado de hoy" KPI glance — rendered under the reply when the
                // backend (or mock) attached a snapshot to this turn.
                // Sólo cuando los números CAMBIARON respecto a la última vez
                // que se mostraron (Nico, 2026-08-27: «no repitas esta
                // información en cada respuesta»). El backend adjunta el
                // snapshot en cada turno; repetir cinco tarjetas idénticas
                // debajo de cada respuesta es ruido, no información.
                const snapshotPrevio = messages
                  .slice(0, index)
                  .reverse()
                  .find((m) => m.role === 'assistant' && m.snapshot)?.snapshot;
                const snapshotEsNuevo =
                  message.snapshot &&
                  (!snapshotPrevio ||
                    JSON.stringify(snapshotPrevio) !== JSON.stringify(message.snapshot));
                const snapshotCard = snapshotEsNuevo && message.snapshot ? (
                  <ChatDataCard tiles={snapshotTiles(message.snapshot)} />
                ) : null;

                // For the last assistant message, use live activeAgentBlock if agents are running
                const liveActivity = isLastAssistant ? activeAgentBlock : null;

                // During thinking phase, hide the placeholder assistant bubble
                if (isLastAssistant && isThinking) {
                  return null;
                }

                // Agentes corriendo: la tarea EN el hilo, a la manera de Manus
                // (filas planas + reloj vivo), en vez de la tarjeta con borde.
                if (isLastAssistant && isAgentsRunning && activeAgentBlock) {
                  return (
                    <div key={message.id} className="space-y-3 animate-fade-in">
                      <AgentTaskThread activity={activeAgentBlock} />
                    </div>
                  );
                }

                // Completed message with responseMeta → render ResponseCard
                if (
                  message.status === 'complete' &&
                  message.responseMeta &&
                  !isLastAssistant
                ) {
                  return (
                    <div key={message.id} className="space-y-3">
                      {responseNeedsCard(message) ? (
                        <ResponseCard
                          meta={message.responseMeta}
                          content={message.content}
                        />
                      ) : (
                        <AssistantBubble message={message} />
                      )}
                      {snapshotCard}
                      {message.decision && (
                        <DecisionCard
                          decision={message.decision}
                          onSelect={
                            !message.decision.selectedOptionId
                              ? (optionId) => selectDecisionOption(message.id, optionId)
                              : undefined
                          }
                        />
                      )}
                    </div>
                  );
                }

                // Last assistant message that just completed with responseMeta
                if (
                  isLastAssistant &&
                  message.status === 'complete' &&
                  message.responseMeta
                ) {
                  return (
                    <div key={message.id} className="space-y-3">
                      {responseNeedsCard(message) ? (
                        <ResponseCard
                          meta={message.responseMeta}
                          content={message.content}
                        />
                      ) : (
                        <AssistantBubble message={message} />
                      )}
                      {snapshotCard}
                      {message.decision && (
                        <DecisionCard
                          decision={message.decision}
                          onSelect={
                            !message.decision.selectedOptionId
                              ? (optionId) => selectDecisionOption(message.id, optionId)
                              : undefined
                          }
                        />
                      )}
                    </div>
                  );
                }

                // Streaming state — card only if the response needs it; else plain text
                if (isLastAssistant && isStreaming && message.responseMeta) {
                  return (
                    <div key={message.id} className="space-y-3">
                      {responseNeedsCard(message) ? (
                        <ResponseCard
                          meta={message.responseMeta}
                          content={message.content}
                          isStreaming
                          streamingContent={streamingContent}
                        />
                      ) : (
                        <AssistantBubble
                          message={message}
                          streamingContent={streamingContent}
                        />
                      )}
                      {snapshotCard}
                    </div>
                  );
                }

                // Fallback: legacy AssistantBubble for messages without responseMeta
                return (
                  <div key={message.id} className="space-y-3">
                    {/* Agent activity summary (collapsed) for older messages */}
                    {(liveActivity || storedActivity) && (
                      <div className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                        {(liveActivity || storedActivity)!.agents.length} {t('beta.agents.results').toLowerCase()}
                        {' · '}
                        {formatDuration(
                          (liveActivity || storedActivity)!.agents.reduce(
                            (sum, a) => sum + (a.durationMs ?? 0),
                            0
                          )
                        )}
                      </div>
                    )}

                    {/* Decision card */}
                    {message.decision && (
                      <DecisionCard
                        decision={message.decision}
                        onSelect={
                          !message.decision.selectedOptionId
                            ? (optionId) => selectDecisionOption(message.id, optionId)
                            : undefined
                        }
                      />
                    )}

                    {/* Legacy assistant bubble */}
                    <AssistantBubble
                      message={message}
                      streamingContent={isLastAssistant && isStreaming ? streamingContent : undefined}
                    />
                  </div>
                );
              })}

              {/* Typing indicator shown during the thinking delay */}
              {isThinking && (
                <TypingIndicator
                  // El par pendiente (pregunta + placeholder) no es contexto leído.
                  historyCount={Math.max(0, messages.length - 2)}
                  snapshot={messages[messages.length - 1]?.snapshot ?? null}
                />
              )}

              {/* Scroll sentinel */}
              <div ref={scrollRef} />
            </div>
          </div>

          {/* Chat input, con el progreso de la tarea FUSIONADO encima (patrón
              Manus): sólo mientras hay trabajo; al terminar desaparece y el
              hilo queda como registro. */}
          <ChatInput
            onSend={sendMessage}
            disabled={isBusy}
            topSlot={
              isThinking || isStreaming || (activeAgentBlock && activeAgentBlock.agents.length > 0) ? (
                <AgentTaskProgress
                  activity={activeAgentBlock}
                  thinking={isThinking}
                  streaming={isStreaming}
                />
              ) : null
            }
          />
        </>
      ) : (
        /* Empty state — Manus-style: greeting + hero input + pills, all centered */
        <div data-lenis-prevent className="relative flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <BetaWelcome
            onPromptClick={sendMessage}
            inputSlot={<ChatInput variant="hero" onSend={sendMessage} disabled={isBusy} />}
          />
        </div>
      )}
    </div>
  );
}
