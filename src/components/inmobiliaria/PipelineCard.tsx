'use client';

import { motion } from 'framer-motion';
import {
  HouseLine,
  User,
  Clock,
  CalendarCheck,
  Phone,
  Warning,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';
import { formatCurrency, getPipelineStageInfo } from '@/lib/types/inmobiliaria';

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
  const stageInfo = getPipelineStageInfo(item.stage);
  const riskColors = item.riskLevel ? RISK_LEVEL_COLORS[item.riskLevel] : null;

  // Check if overdue
  const isOverdue = item.nextActionDate && new Date(item.nextActionDate) < new Date();
  const daysWarning = item.daysInStage >= DAYS_WARNING_THRESHOLD;
  const daysCritical = item.daysInStage >= DAYS_CRITICAL_THRESHOLD;

  // Get initials for candidate avatar fallback
  const initials = item.candidateName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Extract stage color classes (e.g., "bg-primary-soft" -> "blue")
  const stageColor = stageInfo?.color?.split(' ')[0]?.replace('bg-', '').replace('-100', '') || 'neutral';

  return (
    <motion.div
      layoutId={`pipeline-card-${item.id}`}
      whileHover={!isDragging ? { y: -2, boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.1)' } : undefined}
      animate={isDragging ? { scale: 1.02, boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.2)' } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'w-full rounded-lg border bg-card overflow-hidden transition-all duration-200 cursor-pointer group',
        isDragging
          ? 'border-primary/30 ring-2 ring-primary/20'
          : 'border-border hover:border-primary/30',
      )}
      onClick={() => onClick?.(item)}
      {...dragHandleProps}
    >
      {/* Colored top border based on stage */}
      <div
        className={cn(
          'h-1.5',
          stageInfo?.color?.split(' ')[0] || 'bg-surface-muted'
        )}
      />

      {/* Content */}
      <div className="p-3">
        {/* Property Section */}
        <div className="flex items-start gap-2.5 mb-3">
          {/* Thumbnail */}
          {item.propertyThumbnail ? (
            <div className="w-12 h-12 rounded-md overflow-hidden shrink-0">
              <img
                src={item.propertyThumbnail}
                alt={item.propertyTitle}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
              <HouseLine className="w-6 h-6 text-muted-foreground" />
            </div>
          )}

          {/* Property Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-foreground truncate">
              {item.propertyTitle}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {item.propertyAddress}
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              {/* A sale mandate has no canon. `—`, never `$ 0` (C6). */}
              {item.monthlyRent != null ? (
                <>
                  {formatCurrency(item.monthlyRent)}
                  <span className="text-xs font-normal text-muted-foreground">/{t('inmobiliaria.pipeline.month')}</span>
                </>
              ) : (
                '—'
              )}
            </p>
          </div>
        </div>

        {/* Candidate Section */}
        <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-border">
          {/* Candidate Avatar */}
          {item.candidateAvatar ? (
            <img
              src={item.candidateAvatar}
              alt={item.candidateName}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">
                {initials}
              </span>
            </div>
          )}

          {/* Candidate Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground truncate">
                {item.candidateName}
              </p>
              {/* Risk Score Badge */}
              {riskColors && item.riskLevel && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0',
                  riskColors.bg,
                  riskColors.text
                )}>
                  {item.riskLevel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              <span className="truncate">{item.candidatePhone}</span>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          {/* Days in Stage */}
          <div className={cn(
            'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs',
            daysCritical
              ? 'bg-danger-soft text-danger'
              : daysWarning
                ? 'bg-warning-soft text-warning'
                : 'bg-muted text-muted-foreground'
          )}>
            <Clock className="w-3.5 h-3.5" />
            <span>
              {item.daysInStage} {item.daysInStage === 1 ? t('inmobiliaria.pipeline.daySingular') : t('inmobiliaria.pipeline.days')} {t('inmobiliaria.pipeline.inStage')}
            </span>
            {daysCritical && <Warning className="w-3.5 h-3.5 ml-auto" />}
          </div>

          {/* Next Action */}
          {item.nextAction && (
            <div className={cn(
              'flex items-start gap-2 px-2.5 py-1.5 rounded-md text-xs',
              isOverdue
                ? 'bg-danger-soft text-danger'
                : 'bg-muted text-muted-foreground'
            )}>
              <CalendarCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="truncate">{item.nextAction}</p>
                {item.nextActionDate && (
                  <p className={cn(
                    'text-[10px] mt-0.5',
                    isOverdue ? 'font-medium' : 'opacity-70'
                  )}>
                    {isOverdue ? t('inmobiliaria.pipeline.overdue') + ': ' : ''}
                    {formatDateI18n(new Date(item.nextActionDate), { day: 'numeric', month: 'short' })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Stage Badge */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          {/* Stage Badge */}
          <span className={cn(
            'px-2 py-1 rounded-full text-[10px] font-medium',
            stageInfo?.color || 'bg-muted text-muted-foreground'
          )}>
            {stageInfo?.labelEs || item.stage}
          </span>

          {/* Assigned Agent (small text) */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{t('inmobiliaria.pipeline.agent')} #{item.agenteId.slice(-3)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default PipelineCard;
