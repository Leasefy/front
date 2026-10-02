'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ArrowDown } from '@phosphor-icons/react';
import { ChatDataCard } from '@leasefy/cadence';
import type { ChatMessage } from '@/lib/types/beta-chat';
import { sinTablasDeMarkdown, tieneTabla } from '@/lib/chat/bloques';
import { mosaicosDelEstado } from '@/lib/chat/tarjeta-del-estado';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { useScrollDelTurno } from '@/lib/hooks/use-scroll-del-turno';
import { Button } from '@/components/ui/button';
import { ChatMessageSkeleton } from './BetaSkeletons';
import { BetaWelcome } from './BetaWelcome';
import { UserBubble } from './UserBubble';
import { AssistantBubble } from './AssistantBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { AgentTaskThread } from './AgentTaskThread';
import { AgentTaskProgress } from './AgentTaskProgress';
import { ResponseCard } from './ResponseCard';
import { RespuestaConForma } from './RespuestaConForma';
import { AccionesEnElHilo } from './AccionesEnElHilo';
import { MessageActions } from './MessageActions';
import { WorkspaceView } from './WorkspaceView';
import { AccionPropuestaCard } from './AccionPropuestaCard';
import { DecisionCard } from './DecisionCard';
import { ChatConversationBar } from './ChatConversationBar';
import { CabeceraDeLaRespuesta, ResumenDelTurno } from './TurnoDelAsistente';
import { leerElTurno } from '@/lib/agentes/agente-que-habla';
import { EquipoDeAgentesProvider, useEquipoDeAgentes } from '@/components/agentes/equipo-de-agentes-context';
import { RazonamientoDelTurno } from '@/components/agentes/TurnoDelEquipo';

interface ChatContainerProps {
  className?: string;
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

/**
 * El texto de la respuesta sin la tabla que el modelo copió a mano, cuando la
 * misma tabla viene como DATOS y la pinta Cadence (`RespuestaConForma`).
 */
function textoSinTablaRepetida(message: ChatMessage): string {
  return tieneTabla(message.bloques) ? sinTablasDeMarkdown(message.content) : message.content;
}

/**
 * ChatContainer — el chat: la llegada (estado 0) o la conversación.
 *
 * Desde el 02-10-2026 monta «El equipo» (`EquipoDeAgentesProvider`, commit
 * `27a3b2b8`) alrededor de todo: el modal se abre desde la llegada, desde la
 * cabecera de la conversación y desde el orbe de cada respuesta. Las
 * ejecuciones de la conversación abierta alimentan su «En esta conversación».
 */
export function ChatContainer(props: ChatContainerProps) {
  const { messages } = useBetaChatContext();
  const ejecuciones = useMemo(() => messages.flatMap((m) => m.agentActivity?.agents ?? []), [messages]);
  return (
    <EquipoDeAgentesProvider ejecuciones={ejecuciones}>
      <ConversacionDelChat {...props} />
    </EquipoDeAgentesProvider>
  );
}

/**
 * La conversación (o la llegada). Cada respuesta del asistente lleva arriba la
 * cabecera del turno —el orbe del orquestador, que ES quien responde— y, según
 * el momento:
 *   pensando   → «Ori está pensando» + las frases de la espera;
 *   trabajando → la tarjeta de los pasos, con cada especialista como delegación;
 *   respondió  → la delegación resumida en una línea, el texto, «Cómo lo
 *                pensó» (si el micro lo manda) y las acciones.
 */
function ConversacionDelChat({ className }: ChatContainerProps) {
  const { t } = useI18n();
  const { abrir: abrirEquipo } = useEquipoDeAgentes();
  const {
    isLoading,
    messages,
    sendMessage,
    isThinking,
    isStreaming,
    streamingContent,
    activeAgentBlock,
    isAgentsRunning,
    turnSteps,
    selectDecisionOption,
    confirmarAccionDelMensaje,
    cancelarAccionDelMensaje,
    activeConversationId,
  } = useBetaChatContext();

  const [workspaceMessageId, setWorkspaceMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const lastWorkspaceTriggerId = useRef<string | null>(null);

  // ── El scroll del hilo ────────────────────────────────────────────────────
  //
  // Nico, 2026-08-27: «cuando llega algo nuevo le toca a uno hacer scroll
  // down». Y el 23-09 (23:44), al revés: «no dejes en la parte de abajo de la
  // respuesta, que el usuario haga el scroll para ver toda la respuesta». Las
  // dos cosas a la vez: la pregunta queda arriba, la respuesta crece debajo y
  // el hilo acompaña sólo hasta que el INICIO de la respuesta llega arriba.
  // Toda la regla vive en `useScrollDelTurno` (antes: siempre al final).
  const listaRef = useRef<HTMLDivElement>(null);
  const espacioRef = useRef<HTMLDivElement>(null);
  const ultimaPregunta = [...messages].reverse().find((m) => m.role === 'user')?.id ?? null;
  const { verResto, irAlResto } = useScrollDelTurno({
    hilo: messagesAreaRef,
    lista: listaRef,
    fin: scrollRef,
    espacio: espacioRef,
    conversacionId: activeConversationId,
    hayHilo: messages.length > 0,
    ultimaPregunta,
    cambios: [messages, streamingContent, isThinking, activeAgentBlock, isAgentsRunning, turnSteps],
  });

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

  // La lectura del turno que corre, para la franja del compositor (el orbe
  // de quien trabaja y las delegaciones al desplegarla).
  const ultimoDelAsistente = [...messages].reverse().find((m) => m.role === 'assistant') ?? null;
  const turnoEnCurso = useMemo(
    () =>
      turnSteps.length > 0
        ? leerElTurno({ mensaje: ultimoDelAsistente, pasos: turnSteps, enCurso: isBusy })
        : null,
    [turnSteps, ultimoDelAsistente, isBusy]
  );

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
    // `chat-grises`: en oscuro, los grises neutros del chat (Nico, 02-10:
    // «unos grises como amarillos súper feos»); en claro no cambia nada.
    <div className={cn('chat-grises flex flex-col h-full', className)}>
      {hasMessages ? (
        <>
          {/* Barra de conversación — el equipo + terminar. Sin esto,
              escribir el primer mensaje tapaba el estado-0 para siempre: no
              había forma de cerrar la conversación y empezar otra (Nico,
              2026-08-27). Las plantillas viven en el compositor (02-10). */}
          <ChatConversationBar />

          {/* Messages area */}
          {/* data-lenis-prevent: Lenis hijacks wheel events globally; without it
              this nested scroller only moves via the scrollbar. Scrollbar is
              hidden (same idiom as tabs.tsx) since wheel/touch handles it. */}
          <div
            ref={messagesAreaRef}
            data-lenis-prevent
            data-hilo
            className="relative flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-6 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-live="polite"
            aria-label={t('beta.a11y.newMessageRegion')}
          >
            {/* Center-constrain messages for wider screens */}
            <div ref={listaRef} className="max-w-3xl mx-auto space-y-5">
              {messages.map((message, index) => {
                const isLastAssistant =
                  message.role === 'assistant' &&
                  index === messages.length - 1;

                if (message.role === 'user') {
                  // `data-pregunta`: el ancla del scroll del turno. La última
                  // pregunta sube a su sitio al enviarla (`chat-sube`, la
                  // `sa-rise` de la referencia; quieta con reducir movimiento).
                  return (
                    <div
                      key={message.id}
                      data-pregunta={message.id}
                      className={message.id === ultimaPregunta ? 'chat-sube' : undefined}
                    >
                      <UserBubble message={message} />
                    </div>
                  );
                }

                // ── La lectura del turno (02-10, el equipo) ─────────────────
                // Quién habla (el orquestador), a quién le pasó el trabajo y lo
                // que pensó. Pura: con los pasos en vivo si es el turno que
                // corre; si no, con lo que guardó el mensaje (las viejas, «listo»).
                const enCurso = isLastAssistant && isBusy;
                const turno = leerElTurno({
                  mensaje: message,
                  pasos: isLastAssistant ? turnSteps : [],
                  enCurso,
                });
                // El orbe del orquestador: primer hijo de TODAS las ramas, así
                // React lo conserva al pasar de pensando → trabajando → respuesta.
                const cabecera = (
                  <CabeceraDeLaRespuesta
                    turno={turno}
                    tipo={message.status === 'complete' && !enCurso ? message.responseMeta?.type : null}
                    onAbrirEquipo={abrirEquipo}
                  />
                );
                // Ya respondió: la delegación en UNA línea (se abre en el detalle).
                const resumenDelTurno = !enCurso ? (
                  <ResumenDelTurno turno={turno} onAbrirEquipo={abrirEquipo} />
                ) : null;
                // «Cómo lo pensó»: sólo si el micro lo mandó (hoy no lo manda).
                const razonamiento = <RazonamientoDelTurno turno={turno} className="mt-3" />;

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
                // 🔴 Se compara lo que SE VE, no el objeto entero. El snapshot
                // trae `generatedAt` —la hora en que se tomó—, que cambia en
                // cada turno: comparar el JSON completo daba SIEMPRE distinto y
                // el deduplicador nunca disparaba, así que las cinco tarjetas
                // volvían a salir debajo de cada respuesta con los mismos
                // números (Nico, 2026-08-31, segunda vez que lo reporta).
                const snapshotEsNuevo =
                  message.snapshot &&
                  (!snapshotPrevio ||
                    JSON.stringify(mosaicosDelEstado(snapshotPrevio, t)) !==
                      JSON.stringify(mosaicosDelEstado(message.snapshot, t)));
                const snapshotCard = snapshotEsNuevo && message.snapshot ? (
                  <ChatDataCard tiles={mosaicosDelEstado(message.snapshot, t)} />
                ) : null;

                const decision = message.decision ? (
                  <DecisionCard
                    decision={message.decision}
                    onSelect={
                      !message.decision.selectedOptionId
                        ? (optionId) => selectDecisionOption(message.id, optionId)
                        : undefined
                    }
                  />
                ) : null;
                const accion = message.accion ? (
                  <AccionPropuestaCard
                    propuesta={message.accion.propuesta}
                    estado={message.accion.estado}
                    resultado={message.accion.resultado}
                    error={message.accion.error}
                    onConfirmar={() => confirmarAccionDelMensaje(message.id)}
                    onCancelar={() => cancelarAccionDelMensaje(message.id)}
                  />
                ) : null;

                // `chat-respuesta`: el grupo que muestra las acciones (copiar,
                // pulgares) al pasar el cursor; `data-turno`, para las pruebas.
                const envoltura = 'chat-respuesta space-y-3';

                // Pensando (antes del primer despacho): la cabecera dice «Ori
                // está pensando» y debajo, las frases de la espera.
                if (isLastAssistant && isThinking) {
                  return (
                    <div key={message.id} className={envoltura} data-turno={message.id}>
                      {cabecera}
                      <TypingIndicator
                        // El par pendiente (pregunta + placeholder) no es contexto leído.
                        historyCount={Math.max(0, messages.length - 2)}
                        snapshot={message.snapshot ?? null}
                        actividad={turnSteps.find((p) => p.status === 'running' && p.actividad)?.actividad ?? null}
                      />
                    </div>
                  );
                }

                // Agentes corriendo: la tarjeta de los pasos EN el hilo, con
                // cada especialista como delegación («Ori → Laura»).
                if (isLastAssistant && isAgentsRunning && turnSteps.length > 0) {
                  return (
                    <div key={message.id} className={envoltura} data-turno={message.id}>
                      {cabecera}
                      <AgentTaskThread steps={turnSteps} turno={turno} onAbrirEquipo={abrirEquipo} />
                    </div>
                  );
                }

                // Completa con `responseMeta` (o la última que acaba de terminar).
                if (message.status === 'complete' && message.responseMeta) {
                  return (
                    <div key={message.id} className={envoltura} data-turno={message.id}>
                      {cabecera}
                      {resumenDelTurno}
                      {responseNeedsCard(message) ? (
                        <>
                          <ResponseCard
                            meta={message.responseMeta}
                            content={textoSinTablaRepetida(message)}
                            turnoId={message.turnoId}
                          />
                          <RespuestaConForma
                            bloques={message.bloques}
                            entidades={message.entidades}
                            turnoId={message.turnoId}
                            conAcciones={(message.acciones?.length ?? 0) > 0}
                            className="animate-in fade-in duration-slow motion-reduce:animate-none"
                          />
                          {/* Lo que ACTÚA en el hilo (23-09): acciones, «¿Lo hago?», resultado, datos. */}
                          <AccionesEnElHilo
                            message={message}
                            className="animate-in fade-in duration-slow motion-reduce:animate-none"
                          />
                          {razonamiento}
                          {/* La tarjeta se quedaba SIN pulgares: justo las
                              respuestas con cifras son las que hay que poder
                              corregir (Nico, 13/09: «un pulgar en CADA
                              respuesta»). Mismas acciones que la burbuja. */}
                          <MessageActions message={message} siempreVisibles={isLastAssistant} />
                        </>
                      ) : (
                        <AssistantBubble
                          message={message}
                          antesDeLasAcciones={razonamiento}
                          accionesSiempreVisibles={isLastAssistant}
                        />
                      )}
                      {snapshotCard}
                      {decision}
                      {accion}
                    </div>
                  );
                }

                // Streaming state — card only if the response needs it; else plain text
                if (isLastAssistant && isStreaming && message.responseMeta) {
                  return (
                    <div key={message.id} className={envoltura} data-turno={message.id}>
                      {cabecera}
                      {responseNeedsCard(message) ? (
                        <ResponseCard
                          meta={message.responseMeta}
                          content={textoSinTablaRepetida(message)}
                          isStreaming
                          streamingContent={
                            tieneTabla(message.bloques)
                              ? sinTablasDeMarkdown(streamingContent, { parcial: true })
                              : streamingContent
                          }
                        />
                      ) : (
                        <AssistantBubble message={message} streamingContent={streamingContent} />
                      )}
                      {snapshotCard}
                    </div>
                  );
                }

                // Respaldo: un mensaje sin `responseMeta` (los viejos, el error,
                // el que se está escribiendo sin metadatos). La delegación va en
                // su línea, en lugar del viejo «N resultados · duración».
                return (
                  <div key={message.id} className={envoltura} data-turno={message.id}>
                    {cabecera}
                    {message.status !== 'error' && resumenDelTurno}
                    {decision}
                    {accion}
                    <AssistantBubble
                      message={message}
                      streamingContent={isLastAssistant && isStreaming ? streamingContent : undefined}
                      antesDeLasAcciones={razonamiento}
                      accionesSiempreVisibles={isLastAssistant}
                    />
                  </div>
                );
              })}

              {/* Fin del contenido: hasta acá se mide (el espacio va después). */}
              <div ref={scrollRef} data-fin-del-hilo />
            </div>
            {/* El espacio que deja la pregunta arriba mientras la respuesta es
                corta. Lo calcula `useScrollDelTurno`. */}
            <div ref={espacioRef} aria-hidden data-espacio-del-hilo style={{ height: 0 }} />
          </div>

          {/* «Ver el resto»: flota sobre el borde de abajo del hilo mientras
              quede respuesta debajo. Una caja de alto cero pegada al hilo le da
              dónde anclarse sin envolver el hilo (y fuera de su `aria-live`,
              para que el lector de pantalla no lo anuncie en cada cambio). */}
          <div className="relative h-0">
            {verResto && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                hideArrow
                onClick={irAlResto}
                // Discreto (contorno, chico) pero opaco: no se lee el texto de detrás.
                className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 gap-1.5 bg-surface shadow-md"
                data-testid="ver-el-resto"
              >
                {t('beta.enElChat.verElResto')}
                <ArrowDown className="size-4" aria-hidden />
              </Button>
            )}
          </div>

          {/* Chat input, con el progreso de la tarea FUSIONADO encima (patrón
              Manus): sólo mientras hay trabajo; al terminar desaparece y el
              hilo queda como registro. */}
          <ChatInput
            onSend={sendMessage}
            disabled={isBusy}
            topSlot={
              turnSteps.length > 0 ? (
                <AgentTaskProgress steps={turnSteps} turno={turnoEnCurso} onAbrirEquipo={abrirEquipo} />
              ) : null
            }
          />
        </>
      ) : (
        /* Empty state — Manus-style: greeting + hero input + pills, all centered */
        <div data-lenis-prevent className="relative flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <BetaWelcome onPromptClick={sendMessage} />
        </div>
      )}
    </div>
  );
}
