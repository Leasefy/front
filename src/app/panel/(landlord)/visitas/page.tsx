'use client';

import { useState } from 'react';
import { CalendarBlank, Clock, CheckCircle, XCircle, Buildings, Chat, CalendarPlus, X, CalendarCheck, CalendarX } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useVisits, useVisitActions } from '@/lib/hooks/useVisits';
import { useLandlordProperties } from '@/lib/hooks/useLandlord';
import type { Visit, VisitStatus } from '@/lib/types/visit';
import { PlanTable, PlanTableColumn } from '@/components/ui/plan/PlanTable';
import { PlanDetailSheet, QuickAction, DetailSection } from '@/components/ui/plan/PlanDetailSheet';
import { PlanStatusBadge, PlanStatusType } from '@/components/ui/plan/PlanStatusBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { useI18n } from '@/lib/i18n';

type TabFunnel = 'all' | VisitStatus;

const STATUS_TO_PLAN: Record<VisitStatus, PlanStatusType> = {
  requested:   'new',
  confirmed:   'in_progress',
  completed:   'completed',
  cancelled:   'rejected',
  no_show:     'important',
  rejected:    'rejected',
  rescheduled: 'pending',
};

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

// ============================================================================
// Cancel Modal
// ============================================================================

function CancelModal({
  visit,
  onConfirm,
  onClose,
}: {
  visit: Visit;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const { t, formatDate } = useI18n();

  const CANCEL_REASONS = [
    { key: 'cancelReason1', value: t('landlord.visits.cancelReason1') },
    { key: 'cancelReason2', value: t('landlord.visits.cancelReason2') },
    { key: 'cancelReason3', value: t('landlord.visits.cancelReason3') },
    { key: 'cancelReason4', value: t('landlord.visits.cancelReason4') },
    { key: 'cancelReasonOther', value: t('landlord.visits.cancelReasonOther') },
  ];

  const isOtherReason = selectedReason === t('landlord.visits.cancelReasonOther');
  const finalReason = isOtherReason ? customReason : selectedReason;
  const canSubmit = finalReason.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#222224] w-full max-w-md rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-700">
          <h3 className="font-semibold text-neutral-900 dark:text-white">{t('landlord.visits.cancelModalTitle')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t('landlord.visits.cancelModalVisitWith')} <span className="font-medium text-neutral-900 dark:text-white">{visit.candidateName}</span> {t('landlord.visits.cancelModalDateAt', { date: formatDate(visit.requestedDate + 'T12:00:00'), time: formatTime(visit.requestedTime) })}
          </p>

          <div>
            <label className="text-sm font-medium text-neutral-900 dark:text-white block mb-3">
              {t('landlord.visits.cancelReasonLabel')}
            </label>
            <div className="space-y-2">
              {CANCEL_REASONS.map((reason) => (
                <label
                  key={reason.key}
                  className={cn(
                    'flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all border',
                    selectedReason === reason.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  )}
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={() => setSelectedReason(reason.value)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">{reason.value}</span>
                </label>
              ))}
            </div>
          </div>

          {isOtherReason && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder={t('landlord.visits.cancelReasonPlaceholder')}
              rows={3}
              className="w-full px-4 py-3 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            {t('landlord.visits.cancelBack')}
          </button>
          <button
            onClick={() => canSubmit && onConfirm(finalReason)}
            disabled={!canSubmit}
            className="px-5 py-2.5 text-sm font-medium bg-red-600 text-white uppercase tracking-wide font-mono rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('landlord.visits.cancelConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Reschedule Modal
// ============================================================================

function RescheduleModal({
  visit,
  onConfirm,
  onClose,
}: {
  visit: Visit;
  onConfirm: (date: string, time: string) => void;
  onClose: () => void;
}) {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const { t, formatDate } = useI18n();

  const canSubmit = newDate.length > 0 && newTime.length > 0;

  // Min date: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#222224] w-full max-w-md rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-700">
          <h3 className="font-semibold text-neutral-900 dark:text-white">{t('landlord.visits.rescheduleModalTitle')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {t('landlord.visits.rescheduleOriginal')} <span className="font-medium text-neutral-900 dark:text-white">{visit.candidateName}</span>
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-0.5">
              {t('landlord.visits.rescheduleOriginalDate', { date: formatDate(visit.requestedDate + 'T12:00:00'), time: formatTime(visit.requestedTime) })}
            </p>
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t('landlord.visits.rescheduleExplanation')}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-900 dark:text-white block mb-2">
                {t('landlord.visits.rescheduleNewDate')}
              </label>
              <input
                type="date"
                value={newDate}
                min={minDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full h-11 px-4 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-900 dark:text-white block mb-2">
                {t('landlord.visits.rescheduleNewTime')}
              </label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full h-11 px-4 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            {t('landlord.visits.rescheduleBack')}
          </button>
          <button
            onClick={() => canSubmit && onConfirm(newDate, newTime)}
            disabled={!canSubmit}
            className="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white uppercase tracking-wide font-mono rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('landlord.visits.rescheduleConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Schedule Modal
// ============================================================================

const SCHEDULE_HOURS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
];

function ScheduleModal({
  onClose,
  properties,
  onCreate,
}: {
  onClose: () => void;
  properties: { id: string; title: string }[];
  onCreate: (propertyId: string, date: string, time: string, notes?: string) => Promise<boolean>;
}) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [propiedad, setPropiedad] = useState('');
  const [notas, setNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { t } = useI18n();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const canSubmit = fecha.length > 0 && hora.length > 0 && propiedad.length > 0 && !submitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const ok = await onCreate(propiedad, fecha, hora, notas || undefined);
    setSubmitting(false);
    if (ok) {
      toast.success(t('landlord.visits.scheduleSuccessToast'), {
        description: t('landlord.visits.scheduleSuccessDesc'),
      });
      onClose();
    } else {
      toast.error('Error al agendar visita');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#222224] w-full max-w-md rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-700">
          <h3 className="font-semibold text-neutral-900 dark:text-white">{t('landlord.visits.scheduleModalTitle')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-900 dark:text-white block mb-2">{t('landlord.visits.scheduleDateLabel')}</label>
              <input
                type="date"
                value={fecha}
                min={minDate}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full h-11 px-4 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-900 dark:text-white block mb-2">{t('landlord.visits.scheduleTimeLabel')}</label>
              <select
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full h-11 px-4 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">{t('landlord.visits.scheduleTimeSelect')}</option>
                {SCHEDULE_HOURS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-900 dark:text-white block mb-2">{t('landlord.visits.schedulePropertyLabel')}</label>
            <select
              value={propiedad}
              onChange={(e) => setPropiedad(e.target.value)}
              className="w-full h-11 px-4 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">{t('landlord.visits.schedulePropertySelect')}</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-900 dark:text-white block mb-2">{t('landlord.visits.scheduleNotesLabel')}</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder={t('landlord.visits.scheduleNotesPlaceholder')}
              rows={3}
              className="w-full px-4 py-3 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            {t('landlord.visits.scheduleCancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white uppercase tracking-wide font-mono rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('landlord.visits.scheduleConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function VisitasPage() {
  const [tabFunnel, setTabFunnel] = useState<TabFunnel>('all');
  const { visits, stats, isLoading, error, refetch } = useVisits();
  const actions = useVisitActions();
  const { properties: landlordProperties } = useLandlordProperties();
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { t, formatDate } = useI18n();

  // Modal state
  const [cancelTarget, setCancelTarget] = useState<Visit | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Visit | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Visit status labels using i18n
  const visitStatusLabels: Record<VisitStatus, string> = {
    requested:   t('landlord.visits.visitStatusRequested'),
    confirmed:   t('landlord.visits.visitStatusConfirmed'),
    completed:   t('landlord.visits.visitStatusCompleted'),
    cancelled:   t('landlord.visits.visitStatusCancelled'),
    no_show:     t('landlord.visits.visitStatusNoShow'),
    rejected:    'Rechazada',
    rescheduled: 'Reprogramada',
  };

  const confirmedToday = stats.confirmedToday;

  // Counts per status
  const countByStatus = (s: VisitStatus) => visits.filter(v => v.status === s).length;

  // Funnel
  const getFunneledVisits = () => {
    if (tabFunnel === 'cancelled') {
      return visits.filter(v => v.status === 'cancelled' || v.status === 'no_show');
    }
    if (tabFunnel === 'all') return visits;
    return visits.filter(v => v.status === tabFunnel);
  };

  const tabs = [
    { id: 'all', label: t('landlord.visits.tabAll'), count: visits.length },
    { id: 'requested', label: t('landlord.visits.tabRequested'), count: countByStatus('requested') },
    { id: 'confirmed', label: t('landlord.visits.tabConfirmed'), count: countByStatus('confirmed') },
    { id: 'completed', label: t('landlord.visits.tabCompleted'), count: countByStatus('completed') },
    { id: 'cancelled', label: t('landlord.visits.tabCancelled'), count: countByStatus('cancelled') + countByStatus('no_show') },
  ];

  const columns: PlanTableColumn<Visit>[] = [
    {
      key: 'candidateName',
      header: t('landlord.visits.colCandidate'),
      sortable: true,
      type: 'avatar',
      nameKey: 'candidateName',
    },
    {
      key: 'propertyTitle',
      header: t('landlord.visits.colProperty'),
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Buildings className="w-4 h-4 text-neutral-400" />
          <span className="text-sm text-neutral-600 dark:text-neutral-300 truncate max-w-[200px]">
            {row.propertyTitle}
          </span>
        </div>
      ),
    },
    {
      key: 'requestedDate',
      header: t('landlord.visits.colDate'),
      sortable: true,
      render: (row) => (
        <span className="text-sm text-neutral-600 dark:text-neutral-300">{formatDate(row.requestedDate + 'T12:00:00')}</span>
      ),
    },
    {
      key: 'requestedTime',
      header: t('landlord.visits.colTime'),
      sortable: true,
      render: (row) => (
        <span className="text-sm text-neutral-600 dark:text-neutral-300">{formatTime(row.requestedTime)}</span>
      ),
    },
    {
      key: 'status',
      header: t('landlord.visits.colStatus'),
      sortable: true,
      render: (row) => (
        <PlanStatusBadge
          status={STATUS_TO_PLAN[row.status]}
          label={visitStatusLabels[row.status]}
          size="sm"
        />
      ),
    },
  ];

  const handleRowClick = (row: Visit) => {
    setSelectedVisit(row);
    setSheetOpen(true);
  };

  // ---- Actions ----

  const handleConfirm = async (visit: Visit) => {
    const ok = await actions.confirm(visit.id);
    setSheetOpen(false);
    if (ok) {
      toast.success(t('landlord.visits.confirmedToast'), {
        description: t('landlord.visits.confirmedToastDesc', { name: visit.candidateName, date: formatDate(visit.requestedDate + 'T12:00:00'), time: formatTime(visit.requestedTime) }),
      });
      refetch();
    } else {
      toast.error('Error al confirmar visita');
    }
  };

  const handleComplete = async (visit: Visit) => {
    const ok = await actions.confirm(visit.id);
    setSheetOpen(false);
    if (ok) {
      toast.success(t('landlord.visits.completedToast'), {
        description: t('landlord.visits.completedToastDesc', { name: visit.candidateName }),
      });
      refetch();
    } else {
      toast.error('Error al completar visita');
    }
  };

  const openCancelModal = (visit: Visit) => {
    setSheetOpen(false);
    setTimeout(() => setCancelTarget(visit), 150);
  };

  const confirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    const ok = await actions.cancel(cancelTarget.id, { reason });
    const name = cancelTarget.candidateName;
    setCancelTarget(null);
    if (ok) {
      toast(t('landlord.visits.cancelledToast'), {
        description: t('landlord.visits.cancelledToastDesc', { name }),
        icon: '❌',
      });
      refetch();
    } else {
      toast.error('Error al cancelar visita');
    }
  };

  const openRescheduleModal = (visit: Visit) => {
    setSheetOpen(false);
    setTimeout(() => setRescheduleTarget(visit), 150);
  };

  const confirmReschedule = async (newDate: string, newTime: string) => {
    if (!rescheduleTarget) return;
    const ok = await actions.reschedule(rescheduleTarget.id, { newDate, newStartTime: newTime });
    const name = rescheduleTarget.candidateName;
    setRescheduleTarget(null);
    if (ok) {
      toast.success(t('landlord.visits.rescheduledToast'), {
        description: t('landlord.visits.rescheduledToastDesc', { name, date: formatDate(newDate + 'T12:00:00'), time: formatTime(newTime) }),
      });
      refetch();
    } else {
      toast.error('Error al reagendar visita');
    }
  };

  const handleCreateVisit = async (propertyId: string, date: string, time: string, notes?: string): Promise<boolean> => {
    const ok = await actions.create({ propertyId, date, startTime: time, visitType: 'IN_PERSON', notes });
    if (ok) refetch();
    return ok;
  };

  // ---- Quick actions ----

  const getQuickActions = (visit: Visit): QuickAction[] => {
    const actions: QuickAction[] = [];

    if (visit.status === 'requested') {
      actions.push({
        id: 'confirm',
        label: t('landlord.visits.confirmAction'),
        icon: <CheckCircle className="w-4 h-4" />,
        onClick: () => handleConfirm(visit),
        variant: 'primary',
      });
      actions.push({
        id: 'reschedule',
        label: t('landlord.visits.rescheduleAction'),
        icon: <CalendarPlus className="w-4 h-4" />,
        onClick: () => openRescheduleModal(visit),
      });
      actions.push({
        id: 'cancel',
        label: t('landlord.visits.cancelAction'),
        icon: <XCircle className="w-4 h-4" />,
        onClick: () => openCancelModal(visit),
        variant: 'danger',
      });
    }

    if (visit.status === 'confirmed') {
      actions.push({
        id: 'complete',
        label: t('landlord.visits.completeAction'),
        icon: <CheckCircle className="w-4 h-4" />,
        onClick: () => handleComplete(visit),
        variant: 'primary',
      });
      actions.push({
        id: 'reschedule',
        label: t('landlord.visits.rescheduleAction'),
        icon: <CalendarPlus className="w-4 h-4" />,
        onClick: () => openRescheduleModal(visit),
      });
      actions.push({
        id: 'cancel',
        label: t('landlord.visits.cancelAction'),
        icon: <XCircle className="w-4 h-4" />,
        onClick: () => openCancelModal(visit),
        variant: 'danger',
      });
    }

    return actions;
  };

  // ---- Detail sections ----

  const getDetailSections = (visit: Visit): DetailSection[] => [
    {
      id: 'visit-info',
      title: t('landlord.visits.visitInfoTitle'),
      content: (
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.visits.dateLabel')}</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">{formatDate(visit.requestedDate + 'T12:00:00')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.visits.timeLabel')}</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">{formatTime(visit.requestedTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.visits.statusLabel')}</span>
            <PlanStatusBadge
              status={STATUS_TO_PLAN[visit.status]}
              label={visitStatusLabels[visit.status]}
              size="sm"
            />
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.visits.propertyLabel')}</span>
            <span className="text-sm text-neutral-900 dark:text-white">{visit.propertyTitle}</span>
          </div>
          {visit.rescheduledFrom && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
              <p className="text-xs text-indigo-700 dark:text-indigo-400">{t('landlord.visits.rescheduledNote')}</p>
            </div>
          )}
        </div>
      ),
    },
    ...(visit.candidateMessage ? [{
      id: 'candidate-message',
      title: t('landlord.visits.candidateMessageTitle'),
      content: (
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
          <div className="flex items-start gap-3">
            <Chat className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-neutral-600 dark:text-neutral-300 italic">
              &ldquo;{visit.candidateMessage}&rdquo;
            </p>
          </div>
        </div>
      ),
    }] : []),
    ...(visit.cancellationReason ? [{
      id: 'cancel-reason',
      title: t('landlord.visits.cancelReasonTitle'),
      content: (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
          <div className="flex items-start gap-3">
            <XCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{visit.cancellationReason}</p>
          </div>
        </div>
      ),
    }] : []),
    ...(visit.landlordNotes ? [{
      id: 'landlord-notes',
      title: t('landlord.visits.notesTitle'),
      content: (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
          <p className="text-sm text-amber-800 dark:text-amber-300">{visit.landlordNotes}</p>
        </div>
      ),
    }] : []),
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
          <button onClick={refetch} className="text-sm text-indigo-600 hover:underline">Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">{t('landlord.visits.title')}</h1>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">
              {t('landlord.visits.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white uppercase tracking-wide font-mono rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shrink-0"
          >
            <CalendarPlus className="w-4 h-4" />
            {t('landlord.visits.scheduleButton')}
          </button>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                <CalendarBlank className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.total}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.visits.totalVisits')}</p>
          </div>

          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.requested}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.visits.pendingVisits')}</p>
            {stats.requested > 0 && (
              <span className="inline-flex items-center mt-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                {t('landlord.visits.toConfirm')}
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{confirmedToday}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.visits.confirmedToday')}</p>
          </div>

          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.completed}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.visits.completedVisits')}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-1.5 mb-6 inline-flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTabFunnel(tab.id as TabFunnel)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-xl transition-all flex items-center gap-2',
                tabFunnel === tab.id
                  ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  tabFunnel === tab.id
                    ? 'bg-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200'
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        {getFunneledVisits().length === 0 ? (
          <EmptyState
            icon={CalendarBlank}
            title={
              tabFunnel === 'all'
                ? t('landlord.visits.emptyAll')
                : tabFunnel === 'requested'
                ? t('landlord.visits.emptyRequested')
                : tabFunnel === 'confirmed'
                ? t('landlord.visits.emptyConfirmed')
                : tabFunnel === 'completed'
                ? t('landlord.visits.emptyCompleted')
                : t('landlord.visits.emptyCancelled')
            }
            description={t('landlord.visits.emptyDescription')}
            action={{ label: t('landlord.visits.emptyAction'), href: '/panel/propiedades' }}
          />
        ) : (
          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <PlanTable
              data={getFunneledVisits()}
              columns={columns}
              keyExtractor={(row) => row.id}
              onRowClick={handleRowClick}
              stickyHeader
              pagination
              pageSize={5}
            />
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      {selectedVisit && (
        <PlanDetailSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          width="md"
          profile={{
            name: selectedVisit.candidateName,
            subtitle: selectedVisit.propertyTitle,
            status: STATUS_TO_PLAN[selectedVisit.status],
            statusLabel: visitStatusLabels[selectedVisit.status],
          }}
          quickActions={getQuickActions(selectedVisit)}
          sections={getDetailSections(selectedVisit)}
        />
      )}

      {/* Cancel Modal */}
      {cancelTarget && (
        <CancelModal
          visit={cancelTarget}
          onConfirm={confirmCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <RescheduleModal
          visit={rescheduleTarget}
          onConfirm={confirmReschedule}
          onClose={() => setRescheduleTarget(null)}
        />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          onClose={() => setShowScheduleModal(false)}
          properties={landlordProperties.map(p => ({ id: p.id, title: p.title }))}
          onCreate={handleCreateVisit}
        />
      )}
    </div>
  );
}
