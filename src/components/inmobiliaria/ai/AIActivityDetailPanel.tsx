'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle,
  Clock,
  Warning,
  FileText,
  MagnifyingGlass,
  Brain,
  Bell,
  ShieldCheck,
  GitMerge,
} from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import type { AgentActivity } from '@/lib/types/ai-agents';
import { useLenis } from '@/components/providers/SmoothScroll';

/**
 * Lo que de esta ejecución quedó guardado, que es bastante menos de lo que la
 * pantalla mostraba.
 *
 * ── Lo que había acá ─────────────────────────────────────────────────────
 * `buildTrace()` armaba un «Trace de ejecución» de cuatro a seis pasos con
 * etiqueta, estado, duración y salida para cada uno. Nada de eso venía del
 * back: los pasos estaban escritos a mano según el `type` de la actividad,
 * las duraciones («4.1s», «0.2s») quemadas, y uno de los renglones le decía
 * a la inmobiliaria cuántas propiedades había analizado el agente con
 * `Math.floor(Math.random() * 30 + 15)`. Encima, el «X.Xs total» y el
 * «N pasos» del encabezado se calculaban sumando esas duraciones inventadas,
 * mientras `metadata.durationMs` —la duración REAL, que sí viene— no se
 * usaba en ninguna parte.
 *
 * ── Lo que el back devuelve de verdad ────────────────────────────────────
 * `GET /inmobiliaria/ai/activity` (`AiActivityItem`) trae el desenlace, no el
 * camino: `title`, `description`, `status`, `timestamp` y un `metadata` con
 * `durationMs`, `result` y `applicationId`. No hay traza por pasos en
 * ninguna parte del contrato, así que no es cuestión de cablearla: no
 * existe.
 */

/** La duración real, o `null` si esta ejecución no la registró. */
function duracionReal(activity: AgentActivity): string | null {
  const ms = activity.metadata?.durationMs;
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return null;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** El desenlace tal como lo mandó el agente, sin adornarlo. */
function resultadoReal(activity: AgentActivity): string | null {
  return activity.metadata?.result || activity.description || null;
}

interface ErrorContext {
  whatHappened: string;
  whyItMatters: string;
  whatToDo: string[];
  severity: 'warning' | 'critical';
}

/**
 * ⚠️ «Qué pasó» tiene que salir de la actividad, no de un guion.
 *
 * Las tres ramas de acá abajo se eligen por el `type` y por un pedazo del
 * `title`, y eso está bien para decidir QUÉ RECOMENDAR: «por qué importa» y
 * «qué hacer» son consejo editorial, valen para la clase de caso.
 *
 * Lo que no valía era el «qué pasó»: afirmaba hallazgos concretos que nadie
 * verificó en ESTE caso —«los ingresos del certificado laboral no coinciden
 * con los extractos», «falta el certificado laboral»— sobre un aplicante real,
 * en un panel donde eso se lee como el diagnóstico del agente. Ahora ese
 * renglón es el `description` / `metadata.result` que mandó el agente, y si no
 * mandó ninguno lo dice.
 */
function getErrorContext(activity: AgentActivity): ErrorContext | null {
  const loQuePaso =
    resultadoReal(activity) ??
    'El agente no dejó escrito el detalle de esta escalación. Revisá la postulación para ver qué la disparó.';

  if (activity.type === 'escalation' && activity.title.includes('revisión humana')) {
    return {
      whatHappened: loQuePaso,
      whyItMatters: 'Esto puede indicar documentos falsificados o adulterados. Aprobar un inquilino con documentación inconsistente representa un riesgo financiero alto para el propietario.',
      whatToDo: [
        'Solicitar al aplicante que aclare la discrepancia entre certificado laboral y extractos',
        'Pedir extractos bancarios adicionales (últimos 6 meses en vez de 3)',
        'Contactar la empresa del certificado laboral para verificar la información',
        'Si la inconsistencia persiste, rechazar la aplicación o solicitar un codeudor',
      ],
      severity: 'critical',
    };
  }

  if (activity.type === 'escalation' && activity.title.includes('incompletos')) {
    return {
      whatHappened: loQuePaso,
      whyItMatters: 'Sin el certificado laboral no es posible verificar los ingresos del aplicante ni calcular un score de riesgo confiable. La evaluación está pausada hasta que se complete la documentación.',
      whatToDo: [
        'Notificar al aplicante que debe subir su certificado laboral',
        'Establecer un plazo de 48 horas para completar la documentación',
        'Si no responde, cerrar la aplicación y notificar al propietario',
      ],
      severity: 'warning',
    };
  }

  if (activity.status === 'failed') {
    return {
      whatHappened: loQuePaso,
      whyItMatters: 'No se generó un resultado para esta acción. Puede reintentarse automáticamente o requerir intervención manual.',
      whatToDo: [
        'El sistema reintentará automáticamente en los próximos minutos',
        'Si el error persiste, contactar soporte técnico',
      ],
      severity: 'critical',
    };
  }

  return null;
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffH < 24) return `hace ${diffH}h`;
  return `hace ${diffD}d`;
}

interface AIActivityDetailPanelProps {
  activity: AgentActivity;
  onClose: () => void;
}

export function AIActivityDetailPanel({ activity, onClose }: AIActivityDetailPanelProps) {
  const duracion = duracionReal(activity);
  const resultado = resultadoReal(activity);
  const errorContext = getErrorContext(activity);
  const isScoring = activity.agentId === 'tenant-scoring';
  const AgentIcon = isScoring ? ShieldCheck : GitMerge;
  const panelRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const { stop, start } = useLenis();

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      start();
      onClose();
    }, 350);
  }, [onClose, start]);

  useEffect(() => {
    stop();
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
    };
  }, [handleClose, stop]);

  return createPortal(
    <div className="fixed inset-0 z-[60]" style={{ pointerEvents: 'auto' }}>
      {/* Backdrop */}
      <div className={cn('absolute inset-0 bg-black/10 backdrop-blur-[2px]', isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in')} onClick={handleClose} />

      {/* Panel — single scrollable container */}
      <div
        ref={panelRef}
        data-lenis-prevent
        className={cn('absolute top-0 right-0 bottom-0 w-full max-w-lg bg-surface border-l border-border shadow-black/10', isClosing ? 'animate-panel-out' : 'animate-panel-in')}
        style={{ overflowY: 'auto', overscrollBehavior: 'none' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface border-b border-border-faint px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              'rounded-md p-2 flex-shrink-0 mt-0.5',
              isScoring ? 'bg-primary-soft' : 'bg-surface-muted',
            )}>
              <AgentIcon weight="duotone" className={cn(
                'h-4 w-4',
                isScoring ? 'text-primary' : 'text-fg-muted',
              )} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg truncate">{activity.title}</p>
              <p className="text-xs text-fg-subtle mt-0.5">
                {activity.agentName} · {timeAgo(activity.timestamp)}
              </p>
            </div>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            icon={<X className="h-4 w-4" />}
            onClick={handleClose}
            aria-label="Cerrar"
            className="flex-shrink-0"
          />
        </div>

        {/* Result summary */}
        {activity.metadata?.score !== undefined && (
          <div className="mx-6 mt-5 rounded-lg border border-border bg-surface-muted p-4 animate-content-reveal" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-fg-subtle">Resultado</p>
                <p className="text-lg font-semibold text-fg mt-0.5">
                  Score {activity.metadata.score}/100
                </p>
              </div>
              <span className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold',
                activity.metadata.level === 'A' && 'bg-success-soft text-success',
                activity.metadata.level === 'B' && 'bg-primary-soft text-primary',
                activity.metadata.level === 'C' && 'bg-warning-soft text-warning',
                activity.metadata.level === 'D' && 'bg-danger-soft text-danger',
              )}>
                {activity.metadata.level}
              </span>
            </div>
            {activity.description && (
              <p className="text-sm text-fg-muted mt-2">{activity.description}</p>
            )}
          </div>
        )}

        {/* Status bar */}
        <div className="mx-6 mt-5 flex items-center gap-4 text-xs text-fg-subtle animate-content-reveal" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-1.5">
            {activity.status === 'success' ? (
              <CheckCircle weight="fill" className="h-3.5 w-3.5 text-success" />
            ) : activity.status === 'pending' ? (
              <Warning weight="fill" className="h-3.5 w-3.5 text-warning" />
            ) : (
              <Warning weight="fill" className="h-3.5 w-3.5 text-danger" />
            )}
            <span className="font-medium">
              {activity.status === 'success' ? 'Completado' : activity.status === 'pending' ? 'Pendiente' : 'Error'}
            </span>
          </div>
          {/* La duración REAL (`metadata.durationMs`). Antes acá se sumaban las
              duraciones inventadas de los pasos; cuando la ejecución no
              registró duración, ahora no se dice nada en vez de decir «0.0s». */}
          {duracion && (
            <div className="flex items-center gap-1.5" data-testid="actividad-duracion">
              <Clock className="h-3.5 w-3.5" />
              <span className="tabular-nums">{duracion} total</span>
            </div>
          )}
        </div>

        {/* Lo que el agente devolvió, y lo que no quedó registrado.

            Antes esto era «Trace de ejecución»: una lista de pasos con sus
            duraciones, toda escrita a mano en el front. La actividad real no
            trae pasos —trae el desenlace—, así que eso es lo que se muestra, y
            el hueco se dice en vez de rellenarse. */}
        <div className="px-6 py-5 animate-content-reveal" style={{ animationDelay: '0.25s' }} data-testid="actividad-resultado">
          <h3 className="text-sm font-semibold text-fg mb-3">Qué devolvió el agente</h3>
          {resultado ? (
            <p className="text-sm text-fg-muted leading-relaxed">{resultado}</p>
          ) : (
            <p className="text-sm text-fg-subtle leading-relaxed">
              Esta ejecución no dejó un resultado escrito.
            </p>
          )}

          <div className="mt-4 rounded-lg border border-border bg-surface-muted px-4 py-3">
            <p className="text-xs text-fg-subtle leading-relaxed" data-testid="actividad-sin-paso-a-paso">
              El paso a paso de la ejecución no se guarda: el agente registra el
              resultado y cuánto tardó, no cada operación que hizo para llegar
              ahí.
            </p>
          </div>

          {activity.metadata?.applicationId && (
            <p className="mt-3 text-xs text-fg-subtle">
              Postulación{' '}
              <span className="font-mono tabular-nums">
                {activity.metadata.applicationId}
              </span>
            </p>
          )}
        </div>

        {/* Error context — explains what happened and what to do */}
        {errorContext && (
          <div className="px-6 pb-6 animate-content-reveal" style={{ animationDelay: '0.35s' }}>
            <div className={cn(
              'rounded-lg border p-5 space-y-4',
              errorContext.severity === 'critical'
                ? 'border-danger/30 bg-danger-soft/50'
                : 'border-warning/30 bg-warning-soft/50',
            )}>
              {/* What happened */}
              <div>
                <h4 className={cn(
                  'text-xs font-semibold uppercase tracking-wide mb-1.5',
                  errorContext.severity === 'critical' ? 'text-danger' : 'text-warning',
                )}>
                  Qué pasó
                </h4>
                <p className="text-sm text-fg-muted leading-relaxed">
                  {errorContext.whatHappened}
                </p>
              </div>

              {/* Why it matters */}
              <div>
                <h4 className={cn(
                  'text-xs font-semibold uppercase tracking-wide mb-1.5',
                  errorContext.severity === 'critical' ? 'text-danger' : 'text-warning',
                )}>
                  Por qué importa
                </h4>
                <p className="text-sm text-fg-muted leading-relaxed">
                  {errorContext.whyItMatters}
                </p>
              </div>

              {/* What to do */}
              <div>
                <h4 className={cn(
                  'text-xs font-semibold uppercase tracking-wide mb-1.5',
                  errorContext.severity === 'critical' ? 'text-danger' : 'text-warning',
                )}>
                  Qué hacer
                </h4>
                <ol className="space-y-2">
                  {errorContext.whatToDo.map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-fg-muted">
                      <span className={cn(
                        'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5',
                        errorContext.severity === 'critical'
                          ? 'bg-danger-soft text-danger'
                          : 'bg-warning-soft text-warning',
                      )}>
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
