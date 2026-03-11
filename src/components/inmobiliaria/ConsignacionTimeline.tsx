'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  UserPlus,
  Megaphone,
  CalendarCheck,
  Eye,
  CheckCircle,
  Signature,
  Key,
  ArrowsClockwise,
  CaretDown,
  Clock,
  User,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { Consignacion } from '@/lib/types/inmobiliaria';

// Timeline event types
type TimelineEventType =
  | 'consignacion_created'
  | 'agent_assigned'
  | 'property_published'
  | 'visit_scheduled'
  | 'visit_completed'
  | 'candidate_approved'
  | 'contract_signed'
  | 'handover_completed'
  | 'lease_renewal';

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  title: string;
  description?: string;
  actor?: string;
}

// Event type styling
const EVENT_STYLES: Record<TimelineEventType, { bg: string; text: string; icon: React.ElementType }> = {
  consignacion_created: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-600 dark:text-indigo-400',
    icon: FileText,
  },
  agent_assigned: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
    icon: UserPlus,
  },
  property_published: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    icon: Megaphone,
  },
  visit_scheduled: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    icon: CalendarCheck,
  },
  visit_completed: {
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    text: 'text-teal-600 dark:text-teal-400',
    icon: Eye,
  },
  candidate_approved: {
    bg: 'bg-lime-100 dark:bg-lime-900/30',
    text: 'text-lime-600 dark:text-lime-400',
    icon: CheckCircle,
  },
  contract_signed: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: Signature,
  },
  handover_completed: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-600 dark:text-cyan-400',
    icon: Key,
  },
  lease_renewal: {
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-600 dark:text-rose-400',
    icon: ArrowsClockwise,
  },
};

interface ConsignacionTimelineProps {
  consignacion: Consignacion;
  agenteName?: string;
  maxVisibleItems?: number;
}

/**
 * ConsignacionTimeline - Timeline showing the history of a consignment
 * Generates mock events from consignacion data
 */
export function ConsignacionTimeline({
  consignacion,
  agenteName,
  maxVisibleItems = 5,
}: ConsignacionTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t, formatDate: fmtDate, formatRelativeDate: fmtRelDate } = useI18n();

  // Generate timeline events from consignacion data
  const events = useMemo(() => {
    const generatedEvents: TimelineEvent[] = [];

    // 1. Consignacion created
    generatedEvents.push({
      id: 'evt-1',
      type: 'consignacion_created',
      date: consignacion.contractDate,
      title: t('inmobiliaria.consignaciones.timeline.events.consignacionCreated'),
      description: t('inmobiliaria.consignaciones.timeline.events.consignacionCreatedDesc'),
      actor: t('inmobiliaria.consignaciones.timeline.actors.system'),
    });

    // 2. Agent assigned (same day or day after)
    const agentDate = new Date(consignacion.contractDate);
    agentDate.setDate(agentDate.getDate() + 1);
    generatedEvents.push({
      id: 'evt-2',
      type: 'agent_assigned',
      date: agentDate.toISOString().split('T')[0],
      title: t('inmobiliaria.consignaciones.timeline.events.agentAssigned'),
      description: agenteName ? t('inmobiliaria.consignaciones.timeline.events.agentAssignedWithName', { name: agenteName }) : t('inmobiliaria.consignaciones.timeline.events.agentAssignedDefault'),
      actor: t('inmobiliaria.consignaciones.timeline.actors.coordinator'),
    });

    // 3. Property published (2-3 days after)
    if (consignacion.availability !== 'maintenance') {
      const publishDate = new Date(consignacion.contractDate);
      publishDate.setDate(publishDate.getDate() + 3);
      generatedEvents.push({
        id: 'evt-3',
        type: 'property_published',
        date: publishDate.toISOString().split('T')[0],
        title: t('inmobiliaria.consignaciones.timeline.events.propertyPublished'),
        description: t('inmobiliaria.consignaciones.timeline.events.propertyPublishedDesc'),
        actor: agenteName || t('inmobiliaria.consignaciones.timeline.actors.agent'),
      });
    }

    // 4-5. Generate 2-3 mock visits if property has been active
    const daysSinceContract = Math.floor(
      (Date.now() - new Date(consignacion.contractDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceContract > 7) {
      // First visit scheduled
      const visit1ScheduledDate = new Date(consignacion.contractDate);
      visit1ScheduledDate.setDate(visit1ScheduledDate.getDate() + 7);
      generatedEvents.push({
        id: 'evt-4',
        type: 'visit_scheduled',
        date: visit1ScheduledDate.toISOString().split('T')[0],
        title: t('inmobiliaria.consignaciones.timeline.events.visitScheduled'),
        description: t('inmobiliaria.consignaciones.timeline.events.firstVisit'),
        actor: agenteName || t('inmobiliaria.consignaciones.timeline.actors.agent'),
      });

      // First visit completed
      const visit1CompletedDate = new Date(visit1ScheduledDate);
      visit1CompletedDate.setDate(visit1CompletedDate.getDate() + 1);
      generatedEvents.push({
        id: 'evt-5',
        type: 'visit_completed',
        date: visit1CompletedDate.toISOString().split('T')[0],
        title: t('inmobiliaria.consignaciones.timeline.events.visitCompleted'),
        description: t('inmobiliaria.consignaciones.timeline.events.visitCompletedDesc'),
        actor: agenteName || t('inmobiliaria.consignaciones.timeline.actors.agent'),
      });

      if (daysSinceContract > 14) {
        // Second visit
        const visit2Date = new Date(consignacion.contractDate);
        visit2Date.setDate(visit2Date.getDate() + 12);
        generatedEvents.push({
          id: 'evt-6',
          type: 'visit_scheduled',
          date: visit2Date.toISOString().split('T')[0],
          title: t('inmobiliaria.consignaciones.timeline.events.visitScheduled'),
          description: t('inmobiliaria.consignaciones.timeline.events.secondVisit'),
          actor: agenteName || t('inmobiliaria.consignaciones.timeline.actors.agent'),
        });

        const visit2CompletedDate = new Date(visit2Date);
        visit2CompletedDate.setDate(visit2CompletedDate.getDate() + 1);
        generatedEvents.push({
          id: 'evt-7',
          type: 'visit_completed',
          date: visit2CompletedDate.toISOString().split('T')[0],
          title: t('inmobiliaria.consignaciones.timeline.events.visitCompleted'),
          description: t('inmobiliaria.consignaciones.timeline.events.secondVisitCompleted'),
          actor: agenteName || t('inmobiliaria.consignaciones.timeline.actors.agent'),
        });
      }
    }

    // 6. If rented - candidate approved
    if (consignacion.availability === 'rented' && consignacion.currentTenantName) {
      // Candidate approved date (some weeks before lease end - simulating)
      const approvedDate = consignacion.leaseEndDate
        ? new Date(consignacion.leaseEndDate)
        : new Date();
      approvedDate.setFullYear(approvedDate.getFullYear() - 1);
      approvedDate.setDate(approvedDate.getDate() + 14);

      generatedEvents.push({
        id: 'evt-8',
        type: 'candidate_approved',
        date: approvedDate.toISOString().split('T')[0],
        title: t('inmobiliaria.consignaciones.timeline.events.candidateApproved'),
        description: t('inmobiliaria.consignaciones.timeline.events.candidateApprovedDesc', { name: consignacion.currentTenantName }),
        actor: t('inmobiliaria.consignaciones.timeline.actors.scoringSystem'),
      });

      // 7. Contract signed (days after approval)
      const signedDate = new Date(approvedDate);
      signedDate.setDate(signedDate.getDate() + 5);
      generatedEvents.push({
        id: 'evt-9',
        type: 'contract_signed',
        date: signedDate.toISOString().split('T')[0],
        title: t('inmobiliaria.consignaciones.timeline.events.contractSigned'),
        description: t('inmobiliaria.consignaciones.timeline.events.contractSignedDesc'),
        actor: consignacion.currentTenantName,
      });

      // 8. Handover completed (days after signing)
      const handoverDate = new Date(signedDate);
      handoverDate.setDate(handoverDate.getDate() + 3);
      generatedEvents.push({
        id: 'evt-10',
        type: 'handover_completed',
        date: handoverDate.toISOString().split('T')[0],
        title: t('inmobiliaria.consignaciones.timeline.events.handoverCompleted'),
        description: t('inmobiliaria.consignaciones.timeline.events.handoverCompletedDesc'),
        actor: agenteName || t('inmobiliaria.consignaciones.timeline.actors.agent'),
      });
    }

    // Sort by date descending (newest first)
    return generatedEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [consignacion, agenteName, t]);

  const visibleEvents = isExpanded ? events : events.slice(0, maxVisibleItems);
  const hasMoreEvents = events.length > maxVisibleItems;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <Clock className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
          </div>
          <h3 className="font-semibold text-neutral-900 dark:text-white">{t('inmobiliaria.consignaciones.timeline.title')}</h3>
          <span className="ml-auto text-sm text-neutral-500 dark:text-neutral-400">
            {t('inmobiliaria.consignaciones.timeline.eventsCount', { count: events.length })}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-5">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-neutral-200 dark:bg-neutral-700" />

          {/* Events */}
          <div className="space-y-4">
            <AnimatePresence>
              {visibleEvents.map((event, index) => {
                const style = EVENT_STYLES[event.type];
                const Icon = style.icon;

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative pl-10"
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center',
                        style.bg
                      )}
                    >
                      <Icon className={cn('w-4 h-4', style.text)} />
                    </div>

                    {/* Content */}
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#141416]">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-neutral-900 dark:text-white text-sm">
                          {event.title}
                        </h4>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
                          {fmtRelDate(event.date)}
                        </span>
                      </div>

                      {event.description && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                          {event.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                        <span>{fmtDate(event.date)}</span>
                        {event.actor && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {event.actor}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Show More / Less */}
        {hasMoreEvents && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-sm text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
          >
            {isExpanded ? t('inmobiliaria.consignaciones.timeline.showLess') : t('inmobiliaria.consignaciones.timeline.showMoreEvents', { count: events.length - maxVisibleItems })}
            <CaretDown
              className={cn(
                'w-4 h-4 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </button>
        )}
      </div>
    </div>
  );
}

export default ConsignacionTimeline;
