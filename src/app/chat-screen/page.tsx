'use client';

/**
 * /chat-screen — Full §34 "Leasefy AI Chat" screen redesign (standalone mockup).
 *
 * Shows the two chat states from the cadence design:
 *   · STATE 0 (empty)  — centered greeting + the framed <PromptComposer> +
 *     the "Sugerencias · Agentes Leasefy" grid (<AgentSuggestionCard>).
 *   · ACTIVE (typing)  — the composer "se vuelve más pequeño": the conversation
 *     thread (agent prose stays Manus-inline via <MessageBubble>) + the compact
 *     bottom <Composer>.
 *
 * Sending from state-0 (or picking a suggestion) flips to the active state.
 * Static mockup — no data/streaming. Thread carries `data-lenis-prevent` since
 * the site runs Lenis globally (DESIGN.md §8).
 */

import { useState } from 'react';
import {
  ChatContextBar,
  PromptComposer,
  AgentSuggestionCard,
  ChatWelcome,
  MessageBubble,
  Composer,
} from '@leasefy/cadence';

const SUGGESTIONS = [
  { id: 'a', label: 'Revisar asegurabilidad' },
  { id: 'b', label: 'Comparar aseguradoras' },
  { id: 'c', label: 'Documentos faltantes' },
];

const AGENT_SUGGESTIONS = [
  { id: 'inq', initials: 'E', gradient: 'linear-gradient(140deg,#1A40FF,#2BB5E8)', title: 'Inquilino', description: 'Evalúa la asegurabilidad del solicitante SOL-432.' },
  { id: 'cob', initials: 'C', gradient: 'linear-gradient(140deg,#1F8A5B,#7DE08A)', title: 'Cobranza', description: 'Redacta un recordatorio de pago para AR-881, 32 días de mora.' },
  { id: 'ava', initials: 'A', gradient: 'linear-gradient(140deg,#8E7BF0,#F5A878)', title: 'Avalúo', description: 'Sugiere el rango de canon para Reforma 312, 68 m².' },
  { id: 'con', initials: 'Co', gradient: 'linear-gradient(140deg,#2BB5E8,#1A40FF)', title: 'Conciliación', description: 'Concilia el pago sin referencia de $2.500.000.' },
];

const CONTEXTS = [
  { id: 'a', label: 'Estudio de inquilino', tone: 'neutral' as const },
  { id: 'b', label: 'Contexto · AR-1023', tone: 'active' as const, onRemove: () => {} },
];

export default function ChatScreenPage() {
  const [active, setActive] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [sent, setSent] = useState('');
  const [draft, setDraft] = useState('');

  const start = (text: string) => {
    setSent(text || 'Evalúa al inquilino de la solicitud SOL-432 y dame el nivel de riesgo');
    setActive(true);
  };

  return (
    <div className="flex h-screen flex-col bg-bg">
      <ChatContextBar className="shrink-0">solicitud SOL-432 · Juan Pérez</ChatContextBar>

      {/* Thread — own scroll container (Lenis-exempt, DESIGN.md §8) */}
      <div
        className="flex-1 overflow-y-auto"
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
      >
        {!active ? (
          /* ── STATE 0 — empty ── */
          <div className="mx-auto flex max-w-[760px] flex-col items-center gap-8 px-6 py-16">
            <h1 className="text-center font-display text-h1 font-medium tracking-[-0.02em] text-fg">
              ¿En qué te ayudo hoy?
            </h1>
            <PromptComposer
              className="w-full"
              value={prompt}
              onChange={setPrompt}
              onSend={start}
              onAttach={() => {}}
              onTemplates={() => {}}
              contexts={CONTEXTS}
              placeholder="Asigna una tarea o pregunta lo que necesites"
            />
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {AGENT_SUGGESTIONS.map((a) => (
                <AgentSuggestionCard key={a.id} {...a} onSelect={() => start(a.description)} />
              ))}
            </div>
          </div>
        ) : (
          /* ── ACTIVE — conversation ── */
          <div className="mx-auto flex max-w-[720px] flex-col gap-5 px-6 py-8">
            <ChatWelcome agentInitials="L" agentName="Laura" suggestions={SUGGESTIONS} onSelectSuggestion={() => {}}>
              Hola, soy Laura, tu agente de asegurabilidad. Puedo revisar si un solicitante es
              aceptable para aseguradoras, identificar documentos faltantes y recomendar el mejor
              camino para enviar el caso.
            </ChatWelcome>
            <MessageBubble role="user" timestamp="14:32">
              {sent}
            </MessageBubble>
          </div>
        )}
      </div>

      {/* Compact composer — only in the active state ("se vuelve más pequeño") */}
      {active && (
        <div className="shrink-0 border-t border-border-faint bg-surface px-6 py-4">
          <div className="mx-auto max-w-[720px]">
            <Composer value={draft} onChange={setDraft} onSend={() => setDraft('')} />
          </div>
        </div>
      )}
    </div>
  );
}
