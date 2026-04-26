'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldCheck,
  GitMerge,
  Lightning,
  Eye,
  Bell,
  Brain,
  FileText,
  ShieldWarning,
  ChartLineUp,
  Fingerprint,
  Database,
  MagnifyingGlass,
  PaperPlaneTilt,
  Target,
  Sparkle,
  Clock,
  UserCircle,
  Robot,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AIAgentDefinition } from '@/lib/types/ai-agents';

const ICON_MAP: Record<string, Icon> = { ShieldCheck, GitMerge };

interface AIAgentDetailSidebarProps {
  agent: AIAgentDefinition;
  onClose: () => void;
}

export function AIAgentDetailSidebar({ agent, onClose }: AIAgentDetailSidebarProps) {
  const { locale } = useI18n();
  const AgentIcon = ICON_MAP[agent.icon] || ShieldCheck;
  const detail = agent.detail;
  const name = locale === 'es' ? agent.nameEs : agent.nameEn;
  const isScoring = agent.id === 'tenant-scoring';

  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.documentElement.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const scoringPipeline = [
    { icon: FileText, label: 'Recibe documentos', desc: 'Cédula, certificación laboral, extractos bancarios' },
    { icon: Eye, label: 'Extrae datos con OCR', desc: 'Nombre, empresa, salario, fechas — automáticamente' },
    { icon: Database, label: 'Consulta DataCrédito', desc: 'Historial crediticio en tiempo real' },
    { icon: Brain, label: 'Analiza consistencia', desc: '¿Ingresos coinciden con extractos? ¿Empresa existe?' },
    { icon: ChartLineUp, label: 'Calcula score', desc: 'Financiera 35% · Historial 25% · Docs 25% · Perfil 15%' },
    { icon: Sparkle, label: 'Genera explicación', desc: 'Resumen en lenguaje natural del resultado' },
    { icon: PaperPlaneTilt, label: 'Entrega resultado', desc: 'PDF con QR + notificación a tu equipo' },
  ];

  const matchingPipeline = [
    { icon: UserCircle, label: 'Candidato aplica', desc: 'Se postula a una propiedad de tu portafolio' },
    { icon: Fingerprint, label: 'Analiza perfil', desc: 'Score, presupuesto, zona, tipo de inmueble' },
    { icon: MagnifyingGlass, label: 'Escanea portafolio', desc: 'Todas tus propiedades disponibles' },
    { icon: Brain, label: 'Calcula compatibilidad', desc: 'Pago 40% · Riesgo 30% · Prefs 15% · Aceptación 15%' },
    { icon: Target, label: 'Selecciona top 3', desc: 'Las mejores opciones con explicación de por qué' },
    { icon: PaperPlaneTilt, label: 'Envía sugerencias', desc: '"Estas propiedades podrían interesarte"' },
    { icon: Bell, label: 'Notifica a tu equipo', desc: 'Agente de zona recibe alerta con candidato' },
  ];

  const pipeline = isScoring ? scoringPipeline : matchingPipeline;
  const triggers = detail ? (locale === 'es' ? detail.triggersEs : detail.triggersEn) : [];

  const escalation = isScoring
    ? [
        { textEs: 'Posible fraude detectado', textEn: 'Possible fraud detected' },
        { textEs: 'Confianza del modelo < 60%', textEn: 'Model confidence < 60%' },
        { textEs: 'Documentos ilegibles', textEn: 'Illegible documents' },
      ]
    : [
        { textEs: 'Sin alternativas claras para el candidato', textEn: 'No clear alternatives for candidate' },
        { textEs: 'Propiedad sin aplicantes por +14 días', textEn: 'No applicants for 14+ days' },
      ];

  const accentColor = 'text-neutral-600 dark:text-neutral-400';
  const accentBg = 'bg-neutral-50';
  const accentBorder = 'border-neutral-200';
  const accentDot = 'bg-emerald-500';

  const content = (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex: 9999 }}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[460px] bg-white shadow-2xl flex flex-col overflow-hidden">
        <div
          className="flex-1 overflow-y-auto overscroll-none"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* ═══ HEADER ═══ */}
          <div className={cn('px-6 pt-6 pb-6', accentBg)}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider', accentBg, accentColor)} style={{ border: `1px solid` }}>
                  <Robot weight="bold" className="h-2.5 w-2.5" />
                  Agente AI
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', accentDot)} />
                    <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', accentDot)} />
                  </span>
                  <span className={cn('text-[11px] font-medium', accentColor)}>Activo</span>
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 hover:bg-black/5 transition-colors -mr-1"
              >
                <X weight="bold" className="h-4 w-4 text-neutral-500" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className={cn('rounded-2xl p-3', 'bg-white')} style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <AgentIcon weight="duotone" className={cn('h-7 w-7', accentColor)} />
              </div>
              <div>
                <h2 className="text-[20px] font-semibold text-neutral-900 tracking-tight leading-tight">{name}</h2>
                {detail && (
                  <p className="mt-1 text-[13px] text-neutral-500 leading-relaxed">
                    {locale === 'es' ? detail.taglineEs : detail.taglineEn}
                  </p>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-4 mt-5 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              {(isScoring
                ? [{ val: '< 3 min', label: 'Tiempo avg' }, { val: '94%', label: 'Precisión' }, { val: '3%', label: 'Escala a humano' }]
                : [{ val: '87%', label: 'Compat. avg' }, { val: '31%', label: 'Conversión' }, { val: '24h', label: 'Re-escaneo' }]
              ).map((s) => (
                <div key={s.label} className="flex-1 text-center">
                  <p className="text-[18px] font-semibold text-neutral-900">{s.val}</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ CONTENT ═══ */}
          <div className="px-6 py-6 space-y-8">

            {/* ── Pipeline ── */}
            <div>
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                {locale === 'es' ? 'Cómo funciona' : 'How it works'}
              </p>

              {pipeline.map((step, i) => {
                const StepIcon = step.icon;
                const isLast = i === pipeline.length - 1;
                return (
                  <div key={i} className="flex gap-3 relative">
                    {!isLast && (
                      <div className="absolute left-[15px] top-[34px] bottom-0 w-px bg-neutral-200" />
                    )}
                    <div className="relative z-10 flex-shrink-0">
                      <div
                        className="h-[30px] w-[30px] rounded-lg bg-white flex items-center justify-center"
                        style={{ border: '1px solid rgba(0,0,0,0.1)' }}
                      >
                        <StepIcon weight="duotone" className={cn('h-3.5 w-3.5', accentColor)} />
                      </div>
                    </div>
                    <div className={cn('flex-1 min-w-0', !isLast && 'pb-4')}>
                      <p className="text-[13px] font-medium text-neutral-900">{step.label}</p>
                      <p className="text-[12px] text-neutral-500 mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="h-px bg-neutral-100" />

            {/* ── Triggers ── */}
            <div>
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                {locale === 'es' ? 'Se activa cuando' : 'Activates when'}
              </p>
              <div className="space-y-2">
                {triggers.map((trigger, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Lightning weight="fill" className="h-3.5 w-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[13px] text-neutral-700 leading-relaxed">{trigger}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-neutral-100" />

            {/* ── Escalation ── */}
            <div>
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                {locale === 'es' ? 'Escala a tu equipo cuando' : 'Escalates to your team when'}
              </p>
              <div className="space-y-2">
                {escalation.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <ShieldWarning weight="fill" className="h-3.5 w-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[13px] text-neutral-700 leading-relaxed">
                      {locale === 'es' ? item.textEs : item.textEn}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-neutral-100" />

            {/* ── Impact ── */}
            <div className={cn('rounded-xl p-4', accentBg)} style={{ border: `1px solid rgba(0,0,0,0.06)` }}>
              <p className="text-[14px] font-semibold text-neutral-900">
                {isScoring
                  ? (locale === 'es' ? 'Evaluación que tomaba 2-5 días → resultado en menos de 3 minutos' : 'Evaluation that took 2-5 days → result in under 3 minutes')
                  : (locale === 'es' ? 'Cada candidato que aplica a 1 propiedad descubre 3 más de tu portafolio' : 'Every candidate who applies to 1 property discovers 3 more from your portfolio')}
              </p>
              <p className="text-[12px] text-neutral-500 mt-1.5 leading-relaxed">
                {isScoring
                  ? (locale === 'es' ? 'Sin errores humanos · Sin sesgos · Con explicación completa y código de verificación' : 'No human errors · No bias · With full explanation and verification code')
                  : (locale === 'es' ? 'Automático · Proactivo · Sin intervención manual' : 'Automatic · Proactive · No manual intervention')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(content, document.body);
}
