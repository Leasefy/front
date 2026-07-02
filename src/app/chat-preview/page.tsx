'use client';

/**
 * /chat-preview — Public, self-contained preview of the §34 "Leasefy AI Chat"
 * primitives built in @leasefy/cadence (Batch 20–22).
 *
 * Renders the real cadence chat components with the exact sample data from the
 * claude-design §34 spec so the visual direction can be validated before the
 * primitives are wired into the actual chat screen. No auth/data.
 */

import { FileX, WifiSlash, Lock } from '@phosphor-icons/react';
import { useState } from 'react';
import {
  PromptComposer,
  AgentSuggestionCard,
  ChatWelcome,
  AiAgentCard,
  WorkState,
  AgentActivity,
  ChatContextBar,
  ChatSuggestions,
  ChatSystemEvent,
  ConfidenceBar,
  ChatFeedback,
  SourceChip,
  SensitiveActionConfirm,
  ChatEmptyState,
  PaymentCard,
  ContractCard,
  ApplicantCard,
  AppraisalCard,
  CollectionCard,
  ReconciliationCard,
  Eyebrow,
} from '@leasefy/cadence';

const SUGGESTIONS = [
  { id: 'a', label: 'Revisar asegurabilidad' },
  { id: 'b', label: 'Comparar aseguradoras' },
  { id: 'c', label: 'Documentos faltantes' },
];

const AGENTS = [
  { name: 'Laura', specialty: 'Asegurabilidad', description: 'Evalúa aprobación de aseguradoras y documentos faltantes.', selected: true },
  { name: 'Estudio de inquilino', specialty: 'Riesgo & documentos', description: 'Analiza ingresos, capacidad de pago y consistencia.' },
  { name: 'Nicolás', specialty: 'Avalúos', description: 'Estima valor de arriendo o venta con comparables.' },
  { name: 'Cobranza', specialty: 'Cartera & mora', description: 'Prioriza deudores, redacta mensajes y registra acuerdos.' },
  { name: 'Pagos', specialty: 'Recaudo & dispersión', description: 'Explica pagos, descuentos, saldos y dispersión a propietarios.' },
  { name: 'Conciliación', specialty: 'Cruce de recaudos', description: 'Cruza pagos con contratos y detecta inconsistencias.', available: false },
];

const WORK_STATES = [
  'Consultando pagos…',
  'Revisando aseguradoras…',
  'Buscando inmuebles compatibles…',
  'Generando recomendación…',
  'Conciliando recaudos…',
];

const SOURCES = ['SOL-432', 'Cédula.pdf', 'Cert. laboral', 'Reglas aseg. A'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <Eyebrow>{title}</Eyebrow>
      {children}
    </section>
  );
}

export default function ChatPreviewPage() {
  const [prompt, setPrompt] = useState(
    'Evalúa al inquilino de la solicitud SOL-432 y dame el nivel de riesgo'
  );
  return (
    <main className="min-h-screen bg-bg px-6 py-12 font-body text-fg">
      <div className="mx-auto flex max-w-[600px] flex-col gap-10">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-h1 font-medium tracking-[-0.02em]">
            Leasefy AI Chat · §34
          </h1>
          <p className="text-body-sm text-fg-muted">
            Primitivos cadence (Batch 20–22) con los datos exactos del spec claude-design.
          </p>
        </header>

        <Section title="Prompt composer (estado 0)">
          <PromptComposer
            value={prompt}
            onChange={setPrompt}
            onSend={() => {}}
            onAttach={() => {}}
            onTemplates={() => {}}
            contexts={[
              { id: 'a', label: 'Estudio de inquilino', tone: 'neutral' },
              { id: 'b', label: 'Contexto · AR-1023', tone: 'active', onRemove: () => {} },
            ]}
          />
        </Section>

        <Section title="Sugerencias · Agentes Leasefy">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AgentSuggestionCard initials="E" gradient="linear-gradient(140deg,#1A40FF,#2BB5E8)" title="Inquilino" description="Evalúa la asegurabilidad del solicitante SOL-432." onSelect={() => {}} />
            <AgentSuggestionCard initials="C" gradient="linear-gradient(140deg,#1F8A5B,#7DE08A)" title="Cobranza" description="Redacta un recordatorio de pago para AR-881, 32 días de mora." onSelect={() => {}} />
            <AgentSuggestionCard initials="A" gradient="linear-gradient(140deg,#8E7BF0,#F5A878)" title="Avalúo" description="Sugiere el rango de canon para Reforma 312, 68 m²." onSelect={() => {}} />
            <AgentSuggestionCard initials="Co" gradient="linear-gradient(140deg,#2BB5E8,#1A40FF)" title="Conciliación" description="Concilia el pago sin referencia de $2.500.000." onSelect={() => {}} />
          </div>
        </Section>

        <Section title="Contexto & bienvenida">
          <ChatContextBar className="rounded-t-[14px] border border-b-0 border-border-faint">
            solicitud SOL-432 · Juan Pérez
          </ChatContextBar>
          <div className="rounded-b-[14px] border border-t-0 border-border-faint p-4">
            <ChatWelcome agentInitials="L" agentName="Laura" suggestions={SUGGESTIONS}>
              Hola, soy Laura, tu agente de asegurabilidad. Puedo revisar si un solicitante es
              aceptable para aseguradoras, identificar documentos faltantes y recomendar el mejor
              camino para enviar el caso.
            </ChatWelcome>
          </div>
        </Section>

        <Section title="Selector de agentes">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {AGENTS.map((a) => (
              <AiAgentCard key={a.name} {...a} onSelect={() => {}} />
            ))}
          </div>
        </Section>

        <Section title="Estados de trabajo (un agente)">
          <div className="flex flex-col gap-3 rounded-[14px] border border-border-faint p-4">
            {WORK_STATES.map((w) => (
              <WorkState key={w}>{w}</WorkState>
            ))}
          </div>
        </Section>

        <Section title="Orquestación (multi-agente)">
          <AgentActivity
            runningLabel="Agentes trabajando"
            steps={[
              { id: '1', label: 'Consultando pagos', status: 'done', duration: '0.8s' },
              { id: '2', label: 'Revisando aseguradoras', status: 'done', duration: '1.2s' },
              { id: '3', label: 'Generando recomendación', status: 'running' },
              { id: '4', label: 'Conciliando recaudos', status: 'pending' },
            ]}
          />
        </Section>

        <Section title="Sugerencias sueltas">
          <ChatSuggestions items={SUGGESTIONS} />
        </Section>

        <Section title="Rich cards de entidad">
          <PaymentCard amount="$2,800,000" date="12 jun" contractRef="AR-1023" toDisperse="$2,570,000" onDisperse={() => {}} onDetail={() => {}} />
          <ContractCard title="AR-1023 · Reforma 312" parties="Juan Pérez → Prop. M. Salas" canon="$18,500" start="01/07/23" end="19/07/26" statusLabel="Vence en 23 días" onRenew={() => {}} onOpen={() => {}} />
          <ApplicantCard name="Juan Pérez" initials="JP" reference="SOL-432 · CC 79.xxx.xxx" insurers={[{ name: 'Aseguradora A', likelihood: 'Alta', tone: 'success' }, { name: 'Aseguradora B', likelihood: 'Media', tone: 'warning' }]} missing="Falta: extractos bancarios últimos 3 meses." onSend={() => {}} onProfile={() => {}} />
          <AppraisalCard range="$3,200,000 – $3,450,000" min="$2.9M" market="mercado" max="$3.6M" note="Basado en 14 comparables del sector, área y parqueadero." onRationale={() => {}} />
          <CollectionCard amount="$1,250,000" overdue="32 días mora" tenant="Ana Gómez" actionsTaken="2 recordatorios" nextAction="Escalar a jurídico" onEscalate={() => {}} onDraft={() => {}} />
          <ReconciliationCard summary="Pago sin referencia por $2,500,000. Coincidencia probable:" matchRef="Contrato AR-881" difference="Diferencia: $50,000 vs canon" matchPct="86%" onReview={() => {}} onReconcile={() => {}} />
        </Section>

        <Section title="Confirmación de acción sensible">
          <SensitiveActionConfirm
            agentInitials="L"
            description="El mensaje de cobranza está listo para enviarse al inquilino Juan Pérez del contrato AR-1023."
            message="“Hola Juan, te recordamos que el canon de junio presenta 8 días de mora. Agradecemos regularizar antes del 30 de junio…”"
            onConfirm={() => {}}
            onEdit={() => {}}
            onCancel={() => {}}
          />
        </Section>

        <Section title="Trazabilidad, fuentes & feedback">
          <div className="flex flex-col gap-3 rounded-[14px] border border-border-faint p-4">
            <p className="text-body-sm leading-relaxed text-fg">
              Juan Pérez tiene probabilidad media-alta de aprobación. Aseguradora A es la mejor
              opción; falta el soporte de ingresos actualizado.
            </p>
            <ConfidenceBar value={78} />
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((s) => (
                <SourceChip key={s}>{s}</SourceChip>
              ))}
            </div>
            <ChatFeedback onRate={() => {}} onReport={() => {}} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <ChatSystemEvent>Tarea creada · “Solicitar extractos a Juan Pérez”</ChatSystemEvent>
            <ChatSystemEvent>Laura cambió el contexto a contrato AR-1023</ChatSystemEvent>
          </div>
        </Section>

        <Section title="Vacíos, errores & permisos">
          <div className="grid gap-3 sm:grid-cols-3">
            <ChatEmptyState icon={<FileX />} title="Sin documentos" description="No encontré documentos cargados para este solicitante." actionLabel="Solicitar documentos" onAction={() => {}} />
            <ChatEmptyState icon={<WifiSlash />} title="Sin conexión a pagos" description="No pude consultar pagos ahora. Intenta de nuevo o abre el módulo." actionLabel="Reintentar" actionVariant="danger-soft" onAction={() => {}} />
            <ChatEmptyState icon={<Lock />} title="Sin permisos" description="No tienes permiso para dispersar pagos. Solicítalo a un administrador." actionLabel="Solicitar acceso" onAction={() => {}} />
          </div>
        </Section>
      </div>
    </main>
  );
}
