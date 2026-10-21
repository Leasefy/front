'use client';

import { motion } from 'framer-motion';
import { Avatar, motionSpring } from '@leasefy/cadence';
import {
  HouseLine,
  User,
  Clock,
  CalendarCheck,
  Phone,
  Warning,
} from '@phosphor-icons/react';
import { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { diaDeLaProximaAccion, proximaAccionVencida } from '@/lib/pipeline/proxima-accion';

// Risk level colors for badge
const RISK_LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-success-soft', text: 'text-success' },
  B: { bg: 'bg-primary-soft', text: 'text-primary' },
  C: { bg: 'bg-warning-soft', text: 'text-warning' },
  D: { bg: 'bg-warning-soft', text: 'text-warning' },
  E: { bg: 'bg-danger-soft', text: 'text-danger' },
};

// Overdue warning thresholds
const DAYS_WARNING_THRESHOLD = 7;
const DAYS_CRITICAL_THRESHOLD = 14;

/**
 * Quién es cada agente (por id de miembro y por id de usuario). Lo pone el
 * tablero; sin él la tarjeta no inventa un «Agente #a1b» con el final de un id.
 */
export const NombresDeAgentesContext = createContext<Record<string, string>>({});

interface PipelineCardProps {
  item: PipelineItem;
  onClick?: (item: PipelineItem) => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

/**
 * PipelineCard - Draggable card for Kanban board
 * Shows property, candidate, and pipeline progress info
 */
export function PipelineCard({
  item,
  onClick,
  isDragging = false,
  dragHandleProps,
}: PipelineCardProps) {
  const { t, formatDate: formatDateI18n } = useI18n();
  const nombreDelAgente = useContext(NombresDeAgentesContext)[item.agenteId];
  const riskColors = item.riskLevel ? RISK_LEVEL_COLORS[item.riskLevel] : null;

  // IMANA-5: la fecha es un DÍA; vencida sólo si ya pasó en Colombia.
  const isOverdue = proximaAccionVencida(item.nextActionDate);
  const diaDeLaAccion = diaDeLaProximaAccion(item.nextActionDate);
  const daysWarning = item.daysInStage >= DAYS_WARNING_THRESHOLD;
  const daysCritical = item.daysInStage >= DAYS_CRITICAL_THRESHOLD;

  const dias = `${item.daysInStage} ${item.daysInStage === 1 ? t('inmobiliaria.pipeline.daySingular') : t('inmobiliaria.pipeline.days')} ${t('inmobiliaria.pipeline.inStage')}`;

  return (
    <motion.div
      layoutId={`pipeline-card-${item.id}`}
      // Sólo `transform`: sube 2px al pasar y crece un poco al arrastrarla. La
      // sombra la pone el CSS (susurro al pasar, flotante arrastrando).
      whileHover={!isDragging ? { y: -2 } : undefined}
      animate={isDragging ? { scale: 1.02 } : { scale: 1 }}
      transition={motionSpring.snappy}
      className={cn(
        'group w-full cursor-pointer overflow-hidden rounded-[14px] border bg-surface transition-[border-color,box-shadow] duration-base',
        isDragging
          ? 'border-primary/30 ring-2 ring-primary/20 shadow-flotante'
          : 'border-border hover:border-border-strong hover:shadow-susurro',
      )}
      onClick={() => onClick?.(item)}
      {...dragHandleProps}
    >
      {/* Cadence 2: la columna ya dice la etapa; la tarjeta dice QUIÉN, POR QUÉ INMUEBLE y QUÉ SIGUE.
          Sólo lo que pide atención lleva color (lo vencido, lo que lleva mucho en la etapa). */}
      <div className="flex flex-col gap-3 p-3.5">
        {/* Quién */}
        <div className="flex items-start gap-2.5">
          <Avatar name={item.candidateName} src={item.candidateAvatar || undefined} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-medium text-fg">{item.candidateName}</p>
              {riskColors && item.riskLevel && (
                <span
                  className={cn('shrink-0 rounded-[6px] px-1.5 py-px font-mono text-[10px] font-medium', riskColors.bg, riskColors.text)}
                >
                  {item.riskLevel}
                </span>
              )}
            </div>
            {item.candidatePhone && (
              <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] tabular-nums text-fg-muted">
                <Phone className="size-3 shrink-0" />
                <span className="truncate">{item.candidatePhone}</span>
              </p>
            )}
          </div>
        </div>

        {/* Por qué inmueble */}
        <div className="flex items-center gap-2.5 border-t border-border-faint pt-3">
          <Avatar kind="inmueble" name={item.propertyTitle} src={item.propertyThumbnail || undefined} size="sm">
            <HouseLine className="size-4" />
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-fg">{item.propertyTitle}</p>
            <p className="flex min-w-0 items-baseline gap-1.5 text-[11px] text-fg-subtle">
              {/* Un mandato de venta no tiene canon: «—», nunca «$ 0» (C6). */}
              <span className="shrink-0 font-mono text-[12px] tabular-nums text-fg">
                {item.monthlyRent != null ? formatCurrency(item.monthlyRent) : '—'}
                {item.monthlyRent != null && (
                  <span className="font-body text-[11px] text-fg-subtle">{t('inmobiliaria.pipeline.month')}</span>
                )}
              </span>
              {item.propertyAddress && <span className="truncate">· {item.propertyAddress}</span>}
            </p>
          </div>
        </div>

        {/* Qué sigue: vencido = rojo suave; si no, una línea tranquila */}
        {item.nextAction && (
          <div
            className={cn(
              'flex items-start gap-2 text-xs',
              isOverdue ? 'rounded-[10px] bg-danger-soft px-2.5 py-2 text-danger' : 'text-fg-muted',
            )}
          >
            <CalendarCheck className="mt-px size-3.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate">{item.nextAction}</p>
              {diaDeLaAccion && (
                <p className={cn('mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.04em]', isOverdue ? 'font-medium' : 'text-fg-subtle')}>
                  {isOverdue ? t('inmobiliaria.pipeline.overdue') + ' ' : ''}
                  {formatDateI18n(diaDeLaAccion, { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Pie: cuánto lleva en la etapa y quién lo lleva */}
        <div className="flex items-center justify-between gap-2 border-t border-border-faint pt-2.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.04em] tabular-nums',
              daysCritical ? 'text-danger' : daysWarning ? 'text-warning' : 'text-fg-subtle',
            )}
          >
            {daysCritical ? <Warning className="size-3" /> : <Clock className="size-3" />}
            {dias}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-fg-muted">
            {nombreDelAgente ? <Avatar name={nombreDelAgente} size="xs" /> : <User className="size-3 shrink-0" />}
            <span className="max-w-[96px] truncate">{nombreDelAgente ?? 'Sin asignar'}</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default PipelineCard;
