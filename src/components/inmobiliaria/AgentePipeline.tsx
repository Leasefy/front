'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Funnel,
  CaretDown,
  CaretUp,
  Buildings,
  User,
  Clock,
  ArrowRight,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';
import { PIPELINE_STAGES, formatCurrency } from '@/lib/types/inmobiliaria';

interface AgentePipelineProps {
  pipelineItems: PipelineItem[];
  className?: string;
}

// Get stage info from PIPELINE_STAGES
function getStageInfo(stage: PipelineStage) {
  return PIPELINE_STAGES.find((s) => s.stage === stage);
}

/**
 * AgentePipeline - List of active pipeline items for an agente
 * Collapsible section showing leads in progress (excluding completed/lost)
 */
export function AgentePipeline({ pipelineItems, className }: AgentePipelineProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter out completed and lost items
  const activeItems = useMemo(() => {
    return pipelineItems.filter(
      (item) => item.stage !== 'completed' && item.stage !== 'lost'
    );
  }, [pipelineItems]);

  const handleItemClick = (item: PipelineItem) => {
    toast.info(t('inmobiliaria.agente.viewLead', { name: item.candidateName }), {
      description: t('inmobiliaria.agente.propertyLabel', { title: item.propertyTitle }),
    });
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-border-faint dark:border-border-strong hover:bg-surface-muted dark:hover:bg-ink transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center">
            <Funnel className="w-4 h-4 text-fg-muted dark:text-fg-subtle" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-fg dark:text-white">
              {t('inmobiliaria.agente.activePipeline')}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-surface-muted dark:bg-ink text-xs font-medium text-fg-muted dark:text-fg-subtle">
              {activeItems.length}
            </span>
          </div>
        </div>
        {isExpanded ? (
          <CaretUp className="w-5 h-5 text-fg-subtle" />
        ) : (
          <CaretDown className="w-5 h-5 text-fg-subtle" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 space-y-3">
              {activeItems.length > 0 ? (
                activeItems.map((item) => {
                  const stageInfo = getStageInfo(item.stage);
                  const daysInStageText = item.daysInStage === 1
                    ? `1 ${t('inmobiliaria.agente.daySingular')}`
                    : `${item.daysInStage} ${t('inmobiliaria.agente.daysPlural')}`;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-start gap-3 p-3 rounded-lg bg-surface-muted dark:bg-bg hover:bg-surface-muted dark:hover:bg-ink transition-colors text-left group"
                    >
                      {/* Property Thumbnail */}
                      <div className="w-12 h-12 rounded-md bg-surface-muted dark:bg-ink overflow-hidden shrink-0">
                        {item.propertyThumbnail ? (
                          <img
                            src={item.propertyThumbnail}
                            alt={item.propertyTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Buildings className="w-5 h-5 text-fg-subtle" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Candidate Name */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <User className="w-3.5 h-3.5 text-fg-subtle shrink-0" />
                          <span className="font-medium text-fg dark:text-white truncate group-hover:text-fg-muted dark:text-fg-subtle dark:group-hover:text-fg-muted dark:text-fg-subtle transition-colors">
                            {item.candidateName}
                          </span>
                        </div>

                        {/* Property Title */}
                        <p className="text-xs text-fg-muted dark:text-fg-subtle truncate mb-2">
                          {item.propertyTitle}
                        </p>

                        {/* Stage Badge and Days in Stage */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              stageInfo?.color
                            )}
                          >
                            {stageInfo?.labelEs}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-fg-subtle">
                            <Clock className="w-3 h-3" />
                            {daysInStageText}
                          </span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ArrowRight className="w-4 h-4 text-fg-subtle dark:text-fg-muted shrink-0 mt-1 group-hover:text-fg-muted dark:group-hover:text-fg-subtle transition-colors" />
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center">
                    <Funnel className="w-6 h-6 text-fg-subtle" />
                  </div>
                  <p className="text-fg-muted dark:text-fg-subtle font-medium mb-1">
                    {t('inmobiliaria.agente.noActiveLeads')}
                  </p>
                  <p className="text-sm text-fg-muted dark:text-fg-muted">
                    {t('inmobiliaria.agente.noProspectsInPipeline')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AgentePipeline;
