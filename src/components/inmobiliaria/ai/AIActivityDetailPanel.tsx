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
import { cn } from '@/lib/utils';
import type { AgentActivity } from '@/lib/types/ai-agents';
import { useLenis } from '@/components/providers/SmoothScroll';

interface TraceStep {
  label: string;
  status: 'completed' | 'pending' | 'failed';
  duration?: string;
  output?: string;
}

function buildTrace(activity: AgentActivity): TraceStep[] {
  const isScoring = activity.agentId === 'tenant-scoring';

  if (activity.type === 'escalation') {
    return [
      { label: 'Recibir documentos del aplicante', status: 'completed', duration: '0.2s' },
      { label: 'Extraer datos con OCR (Claude Vision)', status: 'completed', duration: '4.1s', output: 'Cédula, certificado laboral, extractos bancarios procesados' },
      { label: 'Verificar consistencia entre documentos', status: 'failed', duration: '2.3s', output: 'Inconsistencias severas detectadas — ingresos no coinciden entre certificado y extractos' },
      { label: 'Escalar a revisión humana', status: 'completed', duration: '0.1s', output: 'Notificación enviada al equipo' },
    ];
  }

  if (isScoring && activity.type === 'execution') {
    const score = activity.metadata?.score;
    const level = activity.metadata?.level;
    return [
      { label: 'Recibir documentos del aplicante', status: 'completed', duration: '0.2s' },
      { label: 'Extraer datos con OCR (Claude Vision)', status: 'completed', duration: '3.8s', output: 'Cédula, certificado laboral, extractos (3 meses) procesados' },
      { label: 'Verificar consistencia entre documentos', status: 'completed', duration: '1.2s', output: 'Sin inconsistencias detectadas' },
      { label: 'Calcular score de riesgo', status: 'completed', duration: '0.5s', output: score ? `Score: ${score}/100 — Nivel ${level}` : 'Score calculado' },
      { label: 'Generar reporte PDF con QR', status: 'completed', duration: '1.1s', output: 'Reporte disponible para descarga' },
      { label: 'Notificar resultado al agente', status: 'completed', duration: '0.1s' },
    ];
  }

  if (!isScoring && activity.type === 'execution') {
    return [
      { label: 'Analizar perfil del aplicante', status: 'completed', duration: '0.3s', output: 'Presupuesto, ubicación y requisitos identificados' },
      { label: 'Escanear portafolio de propiedades', status: 'completed', duration: '2.1s', output: `${Math.floor(Math.random() * 30 + 15)} propiedades disponibles analizadas` },
      { label: 'Calcular compatibilidad', status: 'completed', duration: '1.4s', output: activity.description || 'Compatibilidades calculadas' },
      { label: 'Enviar sugerencias al panel', status: 'completed', duration: '0.2s' },
    ];
  }

  // notification type
  return [
    { label: 'Detectar evento', status: 'completed', duration: '0.1s' },
    { label: 'Preparar notificación', status: 'completed', duration: '0.2s', output: activity.description || '' },
    { label: 'Enviar al panel', status: 'completed', duration: '0.1s' },
  ];
}

interface ErrorContext {
  whatHappened: string;
  whyItMatters: string;
  whatToDo: string[];
  severity: 'warning' | 'critical';
}

function getErrorContext(activity: AgentActivity): ErrorContext | null {
  if (activity.type === 'escalation' && activity.title.includes('revisión humana')) {
    return {
      whatHappened: 'El agente detectó inconsistencias graves entre los documentos presentados por el aplicante. Los ingresos declarados en el certificado laboral no coinciden con los movimientos de los extractos bancarios.',
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
      whatHappened: 'El aplicante no subió todos los documentos requeridos para completar la evaluación. Falta el certificado laboral que confirma ingresos y estabilidad.',
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
      whatHappened: 'El agente encontró un error durante la ejecución de esta tarea. El proceso se detuvo automáticamente para evitar resultados incorrectos.',
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
  const trace = buildTrace(activity);
  const errorContext = getErrorContext(activity);
  const isScoring = activity.agentId === 'tenant-scoring';
  const AgentIcon = isScoring ? ShieldCheck : GitMerge;
  const panelRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const totalDuration = trace.reduce((sum, s) => {
    const d = parseFloat(s.duration || '0');
    return sum + d;
  }, 0);

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
      <div className={cn('absolute inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-[2px]', isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in')} onClick={handleClose} />

      {/* Panel — single scrollable container */}
      <div
        ref={panelRef}
        data-lenis-prevent
        className={cn('absolute top-0 right-0 bottom-0 w-full max-w-lg bg-white dark:bg-[#1a1a1c] border-l border-neutral-200 dark:border-neutral-700 shadow-black/10 dark:shadow-black/30', isClosing ? 'animate-panel-out' : 'animate-panel-in')}
        style={{ overflowY: 'auto', overscrollBehavior: 'none' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-[#1a1a1c] border-b border-neutral-100 dark:border-neutral-800 px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              'rounded-md p-2 flex-shrink-0 mt-0.5',
              isScoring ? 'bg-primary-soft' : 'bg-neutral-100 dark:bg-neutral-800',
            )}>
              <AgentIcon weight="duotone" className={cn(
                'h-4 w-4',
                isScoring ? 'text-primary' : 'text-neutral-600 dark:text-neutral-300',
              )} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{activity.title}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {activity.agentName} · {timeAgo(activity.timestamp)}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>

        {/* Result summary */}
        {activity.metadata?.score !== undefined && (
          <div className="mx-6 mt-5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-white/[0.03] p-4 animate-content-reveal" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Resultado</p>
                <p className="text-lg font-semibold text-neutral-900 dark:text-white mt-0.5">
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
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">{activity.description}</p>
            )}
          </div>
        )}

        {/* Status bar */}
        <div className="mx-6 mt-5 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 animate-content-reveal" style={{ animationDelay: '0.2s' }}>
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
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{totalDuration.toFixed(1)}s total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>{trace.length} pasos</span>
          </div>
        </div>

        {/* Execution trace */}
        <div className="px-6 py-5 animate-content-reveal" style={{ animationDelay: '0.25s' }}>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">Trace de ejecución</h3>
          <div className="space-y-0">
            {trace.map((step, i) => (
              <div key={i} className="flex gap-3">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                    step.status === 'completed' && 'bg-success-soft',
                    step.status === 'pending' && 'bg-warning-soft',
                    step.status === 'failed' && 'bg-danger-soft',
                  )}>
                    {step.status === 'completed' && <CheckCircle weight="fill" className="h-3.5 w-3.5 text-success" />}
                    {step.status === 'pending' && <Clock weight="fill" className="h-3.5 w-3.5 text-warning" />}
                    {step.status === 'failed' && <Warning weight="fill" className="h-3.5 w-3.5 text-danger" />}
                  </div>
                  {i < trace.length - 1 && (
                    <div className={cn(
                      'w-px flex-1 min-h-[20px]',
                      step.status === 'completed' ? 'bg-success-soft' : 'bg-neutral-200 dark:bg-neutral-700',
                    )} />
                  )}
                </div>

                {/* Content */}
                <div className="pb-5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                      'text-sm font-medium',
                      step.status === 'failed' ? 'text-danger' : 'text-neutral-900 dark:text-white',
                    )}>
                      {step.label}
                    </p>
                    {step.duration && (
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 tabular-nums flex-shrink-0">{step.duration}</span>
                    )}
                  </div>
                  {step.output && (
                    <p className={cn(
                      'text-xs mt-1',
                      step.status === 'failed' ? 'text-danger/80 dark:text-danger/70' : 'text-neutral-500 dark:text-neutral-400',
                    )}>
                      {step.output}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error context — explains what happened and what to do */}
        {errorContext && (
          <div className="px-6 pb-6 animate-content-reveal" style={{ animationDelay: '0.35s' }}>
            <div className={cn(
              'rounded-xl border p-5 space-y-4',
              errorContext.severity === 'critical'
                ? 'border-danger/30 bg-danger-soft/50 dark:bg-danger/10'
                : 'border-warning/30 bg-warning-soft/50 dark:bg-warning/10',
            )}>
              {/* What happened */}
              <div>
                <h4 className={cn(
                  'text-xs font-semibold uppercase tracking-wide mb-1.5',
                  errorContext.severity === 'critical' ? 'text-danger' : 'text-warning',
                )}>
                  Qué pasó
                </h4>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
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
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
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
                    <li key={i} className="flex gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
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
