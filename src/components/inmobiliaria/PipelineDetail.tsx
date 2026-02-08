'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  X,
  MapPin,
  Phone,
  Envelope,
  Copy,
  WhatsappLogo,
  Clock,
  Warning,
  CheckCircle,
  ArrowRight,
  User,
  Buildings,
  CalendarBlank,
  CaretRight,
  Note,
  XCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  type PipelineItem,
  type PipelineStage,
  PIPELINE_STAGES,
  formatCurrency,
  getPipelineStageInfo,
} from '@/lib/types/inmobiliaria';
import Link from 'next/link';

interface PipelineDetailProps {
  isOpen: boolean;
  onClose: () => void;
  item: PipelineItem | null;
  onStageChange?: (itemId: string, newStage: PipelineStage) => void;
}

// Mock timeline data generator
function generateMockTimeline(item: PipelineItem) {
  const stages: PipelineStage[] = [
    'lead',
    'visit_scheduled',
    'visit_done',
    'application',
    'evaluation',
    'approved',
    'contract',
    'handover',
    'completed',
    'lost',
  ];

  const currentStageIndex = stages.indexOf(item.stage);
  if (currentStageIndex === -1) return [];

  const timeline: {
    stage: PipelineStage;
    enteredAt: string;
    daysSpent: number;
    isCurrent: boolean;
  }[] = [];

  // Create mock history leading up to current stage
  const createdDate = new Date(item.createdAt);
  let currentDate = new Date(createdDate);

  // Only include stages up to current (not lost if current isn't lost)
  const stagesToShow =
    item.stage === 'lost' ? stages.slice(0, currentStageIndex + 1) : stages.slice(0, currentStageIndex + 1);

  stagesToShow.forEach((stage, index) => {
    const daysInStage = index === stagesToShow.length - 1 ? item.daysInStage : Math.floor(Math.random() * 5) + 1;

    timeline.push({
      stage,
      enteredAt: currentDate.toISOString(),
      daysSpent: daysInStage,
      isCurrent: stage === item.stage,
    });

    currentDate = new Date(currentDate.getTime() + daysInStage * 24 * 60 * 60 * 1000);
  });

  return timeline.reverse(); // Most recent first
}

// Get next stage in the pipeline
function getNextStage(currentStage: PipelineStage): PipelineStage | null {
  const stages: PipelineStage[] = [
    'lead',
    'visit_scheduled',
    'visit_done',
    'application',
    'evaluation',
    'approved',
    'contract',
    'handover',
    'completed',
  ];

  const currentIndex = stages.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === stages.length - 1) return null;
  return stages[currentIndex + 1];
}

// Risk level badge component
function RiskBadge({ score, level }: { score?: number; level?: string }) {
  if (!score && !level) return null;

  const colors: Record<string, string> = {
    A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    B: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    C: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    D: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    E: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400',
  };

  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium', colors[level || 'E'])}>
      {level && <span className="font-bold">Nivel {level}</span>}
      {score && <span>({score} pts)</span>}
    </div>
  );
}

/**
 * PipelineDetail - Sheet drawer showing full pipeline item details
 * Includes property, candidate, agente info, timeline, and actions
 */
export function PipelineDetail({ isOpen, onClose, item, onStageChange }: PipelineDetailProps) {
  const [notes, setNotes] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  // Generate mock timeline
  const timeline = useMemo(() => {
    if (!item) return [];
    return generateMockTimeline(item);
  }, [item]);

  // Get stage info
  const stageInfo = useMemo(() => {
    if (!item) return null;
    return getPipelineStageInfo(item.stage);
  }, [item]);

  // Get next stage
  const nextStage = useMemo(() => {
    if (!item) return null;
    return getNextStage(item.stage);
  }, [item]);

  const nextStageInfo = useMemo(() => {
    if (!nextStage) return null;
    return getPipelineStageInfo(nextStage);
  }, [nextStage]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado', { description: `${label} copiado al portapapeles` });
  }, []);

  // Open WhatsApp
  const openWhatsApp = useCallback((phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  }, []);

  // Move to next stage
  const handleMoveToNext = useCallback(async () => {
    if (!item || !nextStage) return;

    setIsMoving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (onStageChange) {
      onStageChange(item.id, nextStage);
    }

    toast.success('Etapa actualizada', {
      description: `${item.candidateName} movido a ${nextStageInfo?.labelEs}`,
    });

    setIsMoving(false);
  }, [item, nextStage, nextStageInfo, onStageChange]);

  // Mark as lost
  const handleMarkAsLost = useCallback(async () => {
    if (!item) return;

    setIsMarking(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (onStageChange) {
      onStageChange(item.id, 'lost');
    }

    toast.info('Marcado como perdido', {
      description: `${item.candidateName} ha sido marcado como perdido`,
    });

    setIsMarking(false);
    onClose();
  }, [item, onStageChange, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    setNotes('');
    onClose();
  }, [onClose]);

  if (!item) return null;

  const isTerminal = item.stage === 'completed' || item.stage === 'lost';
  const isOverdue = item.daysInStage > 7;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
        {/* Header with Stage */}
        <div className={cn('p-6 border-b border-neutral-200 dark:border-neutral-700', stageInfo?.color)}>
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <SheetTitle className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {item.propertyTitle}
                </SheetTitle>
                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <MapPin className="w-4 h-4" />
                  <span>{item.propertyAddress}</span>
                </div>
              </div>
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold',
                  stageInfo?.color.replace('bg-', 'bg-opacity-90 ')
                )}
              >
                {stageInfo?.labelEs}
              </span>
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Property Section */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
            <div className="flex gap-4">
              {item.propertyThumbnail ? (
                <img
                  src={item.propertyThumbnail}
                  alt={item.propertyTitle}
                  className="w-24 h-24 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                  <Buildings className="w-10 h-10 text-neutral-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-neutral-900 dark:text-white truncate">{item.propertyTitle}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 truncate">{item.propertyAddress}</p>
                <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mt-2">
                  {formatCurrency(item.monthlyRent)}/mes
                </p>
                <Link
                  href={`/panel/inmobiliaria/portafolio/${item.consignacionId}`}
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-2"
                >
                  Ver consignacion
                  <CaretRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Candidate Section */}
          <div>
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Candidato
            </h4>
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
              <div className="flex items-start gap-3">
                {item.candidateAvatar ? (
                  <img
                    src={item.candidateAvatar}
                    alt={item.candidateName}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-lg font-semibold shrink-0">
                    {item.candidateName
                      .split(' ')
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-white">{item.candidateName}</p>

                  {/* Contact Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <button
                      onClick={() => copyToClipboard(item.candidateEmail, 'Email')}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      <Envelope className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[120px]">{item.candidateEmail}</span>
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(item.candidatePhone, 'Telefono')}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{item.candidatePhone}</span>
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => openWhatsApp(item.candidatePhone)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    >
                      <WhatsappLogo className="w-3.5 h-3.5" weight="fill" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Risk Score */}
              {(item.riskScore || item.riskLevel) && (
                <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Puntaje de riesgo</span>
                    <RiskBadge score={item.riskScore} level={item.riskLevel} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Section */}
          <div>
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Progreso
            </h4>
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Etapa actual</span>
                <span className={cn('px-2 py-1 rounded-md text-xs font-medium', stageInfo?.color)}>
                  {stageInfo?.labelEs}
                </span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Dias en etapa</span>
                <span
                  className={cn(
                    'font-medium text-sm',
                    isOverdue ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-900 dark:text-white'
                  )}
                >
                  {item.daysInStage} dias
                  {isOverdue && (
                    <Warning className="inline w-4 h-4 ml-1 text-amber-500" weight="fill" />
                  )}
                </span>
              </div>

              {item.nextAction && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Siguiente accion</span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">{item.nextAction}</span>
                </div>
              )}

              {item.nextActionDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Fecha objetivo</span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-white">
                    <CalendarBlank className="w-4 h-4 text-neutral-400" />
                    {new Date(item.nextActionDate).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Section */}
          <div>
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Historial de etapas
            </h4>
            <div className="relative pl-4">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-neutral-200 dark:bg-neutral-700" />

              <div className="space-y-4">
                {timeline.map((entry, index) => {
                  const entryStageInfo = getPipelineStageInfo(entry.stage);
                  return (
                    <div key={entry.stage} className="relative flex items-start gap-3">
                      {/* Dot */}
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full shrink-0 mt-1.5 border-2 z-10',
                          entry.isCurrent
                            ? 'bg-indigo-500 border-indigo-300'
                            : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600'
                        )}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              'text-sm font-medium',
                              entry.isCurrent
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-neutral-700 dark:text-neutral-300'
                            )}
                          >
                            {entryStageInfo?.labelEs}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {new Date(entry.enteredAt).toLocaleDateString('es-CO', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {entry.daysSpent} {entry.daysSpent === 1 ? 'dia' : 'dias'} en esta etapa
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
              <Note className="w-4 h-4" />
              Notas
            </h4>
            {item.notes && (
              <div className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-700 dark:text-neutral-300 mb-3">
                {item.notes}
              </div>
            )}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agregar una nota..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
            />
          </div>

          {/* Lost Reason */}
          {item.stage === 'lost' && item.lostReason && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <h4 className="font-medium text-red-700 dark:text-red-400 text-sm mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4" weight="fill" />
                Razon de perdida
              </h4>
              <p className="text-sm text-red-600 dark:text-red-400">{item.lostReason}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isTerminal && (
          <div className="sticky bottom-0 p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] flex items-center gap-3">
            <button
              onClick={handleMarkAsLost}
              disabled={isMarking || isMoving}
              className="flex-1 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              {isMarking ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Marcando...
                </span>
              ) : (
                <>
                  <XCircle className="inline w-4 h-4 mr-2" />
                  Marcar como perdido
                </>
              )}
            </button>

            {nextStage && (
              <button
                onClick={handleMoveToNext}
                disabled={isMoving || isMarking}
                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                {isMoving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Moviendo...
                  </span>
                ) : (
                  <>
                    Mover a {nextStageInfo?.labelEs}
                    <ArrowRight className="inline w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default PipelineDetail;
