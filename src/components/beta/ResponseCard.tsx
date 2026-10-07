'use client';

import {
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChatCircleDots,
  ChartBar,
  ListChecks,
  CheckCircle,
  GearSix,
  Buildings,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { Button } from '@/components/ui';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ResponseMeta, ResponseAction } from '@/lib/types/beta-chat';
import { entidadDeLaIntencion, type IntencionDelChat } from '@/lib/chat/acciones-del-hilo';
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
  ListChecks,
  CheckCircle,
  GearSix,
  Buildings,
};

// ============================================================================
// Types
// ============================================================================

interface ResponseCardProps {
  meta: ResponseMeta;
  content: string;
  /** El turno del micro: tocar una sugerencia sobre una entidad se le cuenta al cerebro. */
  turnoId?: string;
  isStreaming?: boolean;
  streamingContent?: string;
  className?: string;
}

/**
 * El título que el chat le pone a TODA respuesta (`useBetaChat`, camino del
 * micro). No dice nada: quién responde ya lo dice la cabecera del turno (el
 * orbe del orquestador). Sólo se pinta un título que sea de verdad de esa
 * respuesta.
 */
const TITULO_GENERICO = 'Asistente Leasefy';

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Una acción sugerida es un MENSAJE DE LA PERSONA — nunca un enlace.
 *
 * ── Historia ───────────────────────────────────────────────────────────────
 * Nico, 2026-08-27: «Todas estas acciones deben verse reflejadas en el chat,
 * porque para eso es ese chat, no para que lo lleves a otro lado». Después se
 * volvió a navegar cuando la acción tenía pantalla («Ver inmuebles
 * disponibles» dejaba ~25 s esperando al modelo). Nico, 23-09 (22:51), con la
 * captura de «Ver contrato 24» y «Gestionar cobranza de Mateo Pérez»: «¿Por
 * qué las acciones siguen sacando fuera del chat? … ya te había dicho que sí
 * para todas las acciones.»
 *
 * Ahora el botón manda su texto como mensaje de la persona CON su intención
 * (`action.intencion`, que el micro pega cuando la lee sin duda) y el micro
 * lo contesta por su camino directo —la ficha del back, ~2 s— sin el bucle
 * largo del modelo. Ya no existe `href`: no hay rama que navegue.
 */
function ActionButton({
  action,
  onAsk,
  disabled,
}: {
  action: ResponseAction;
  onAsk: (prompt: string, intencion?: IntencionDelChat) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const ActionIcon = ICON_MAP[action.icon] ?? ChatCircleDots;
  // Todas iguales, en contorno (02-10): «Ver cobranza» en índigo relleno se
  // leía como un botón que lleva a otra página. Es una pregunta que se hace
  // AQUÍ: el texto lo dice al pasar el cursor.
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      hideArrow
      disabled={disabled}
      title={t('beta.response.seRespondeAqui')}
      onClick={() => onAsk(action.prompt ?? action.label, action.intencion)}
      className="chat-sugerencia shrink-0 gap-1.5 rounded-full bg-surface"
      data-testid="sugerencia-del-chat"
    >
      <ActionIcon className="h-3.5 w-3.5 text-fg-muted" aria-hidden="true" />
      {action.label}
    </Button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ResponseCard — una respuesta con algo que hacer (sugerencias, decisión o
 * tipo «para actuar»).
 *
 * Rediseño del 02-10-2026 (Nico: «¿por qué sigo viendo un chat viejo y
 * feo?»): ya no es una tarjeta con «● Asistente Leasefy · Informativo» y el
 * texto en un recuadro gris. Es el texto de lectura, igual que una respuesta
 * simple, con un título sólo si es de verdad de esta respuesta, y las
 * sugerencias como preguntas en contorno que se contestan en el hilo.
 */
export function ResponseCard({
  meta,
  content,
  isStreaming = false,
  streamingContent,
  turnoId,
  className,
}: ResponseCardProps) {
  // El chat es el destino de estas acciones, así que la tarjeta habla con él
  // directamente en vez de pedirle al padre que le pase un callback: vive
  // dentro del provider, y hacerlo prop obligaba a cablearlo en cada sitio
  // donde se monta una tarjeta.
  const { sendMessage, isThinking, isStreaming: streamingTurno, isAgentsRunning, anotarTarjetaAbierta } =
    useBetaChatContext();
  const preguntar = (texto: string, intencion?: IntencionDelChat) => {
    const entidad = entidadDeLaIntencion(intencion);
    if (entidad) anotarTarjetaAbierta(turnoId, entidad);
    sendMessage(texto, { intencion: intencion ?? null });
  };
  const ocupado = isThinking || streamingTurno || isAgentsRunning;

  const displayContent = isStreaming && streamingContent
    ? streamingContent
    : content;

  const hasActions = meta.actions && meta.actions.length > 0;
  const titulo = meta.title && meta.title !== TITULO_GENERICO ? meta.title : null;

  return (
    <div className={cn('min-w-0', className)} data-testid="respuesta-con-acciones">
      {/* Sin tarjeta ni recuadro gris (Nico, 02-10): el texto se lee como el
          de cualquier respuesta. Quién responde y el tipo de respuesta van en
          la cabecera del turno, arriba. */}
      {titulo && (
        <h3 className="mb-1 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-fg">{titulo}</h3>
      )}
      {meta.summary && (
        <p className="mb-2 text-[14px] leading-relaxed text-fg-muted">{meta.summary}</p>
      )}

      <div className="chat-lectura text-[16px] leading-[1.65] text-fg">
        <MarkdownRenderer content={displayContent} isStreaming={isStreaming} />
      </div>

      {/* Las sugerencias: preguntas que se hacen aquí mismo, nunca enlaces. */}
      {hasActions && !isStreaming && (
        <div className="mt-4 flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-slow motion-reduce:animate-none">
          {meta.actions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              onAsk={preguntar}
              disabled={ocupado}
            />
          ))}
        </div>
      )}
    </div>
  );
}
