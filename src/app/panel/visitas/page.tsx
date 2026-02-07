'use client';

import { useState } from 'react';
import { CalendarBlank, Clock, CheckCircle, XCircle, Buildings, Chat, CalendarPlus, X, CalendarCheck, CalendarX } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MOCK_VISITS, getVisitStats } from '@/lib/data/mock-visits';
import { VISIT_STATUS_LABELS } from '@/lib/types/visit';
import type { Visit, VisitStatus } from '@/lib/types/visit';
import { PlanTable, PlanTableColumn } from '@/components/ui/plan/PlanTable';
import { PlanDetailSheet, QuickAction, DetailSection } from '@/components/ui/plan/PlanDetailSheet';
import { PlanStatusBadge, PlanStatusType } from '@/components/ui/plan/PlanStatusBadge';
import { EmptyState } from '@/components/ui/empty-state';

type TabFunnel = 'all' | VisitStatus;

const STATUS_TO_PLAN: Record<VisitStatus, PlanStatusType> = {
  requested: 'new',
  confirmed: 'in_progress',
  completed: 'completed',
  cancelled: 'rejected',
  no_show: 'important',
};

const CANCEL_REASONS = [
  'No tengo disponibilidad en esa fecha',
  'La propiedad ya no está disponible',
  'El candidato no cumple los requisitos',
  'Problemas de agenda, prefiero reagendar',
  'Otro motivo',
];

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

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

  const finalReason = selectedReason === 'Otro motivo' ? customReason : selectedReason;
  const canSubmit = finalReason.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#222224] w-full max-w-md rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-700">
          <h3 className="font-semibold text-neutral-900 dark:text-white">Cancelar visita</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Visita con <span className="font-medium text-neutral-900 dark:text-white">{visit.candidateName}</span> el {formatDate(visit.requestedDate)} a las {formatTime(visit.requestedTime)}.
          </p>

          <div>
            <label className="text-sm font-medium text-neutral-900 dark:text-white block mb-3">
              Motivo de cancelación
            </label>
            <div className="space-y-2">
              {CANCEL_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={cn(
                    'flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all border',
                    selectedReason === reason
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  )}
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedReason === 'Otro motivo' && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Escribe el motivo..."
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
            Volver
          </button>
          <button
            onClick={() => canSubmit && onConfirm(finalReason)}
            disabled={!canSubmit}
            className="px-5 py-2.5 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar cancelación
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
          <h3 className="font-semibold text-neutral-900 dark:text-white">Reagendar visita</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Visita original con <span className="font-medium text-neutral-900 dark:text-white">{visit.candidateName}</span>
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-0.5">
              {formatDate(visit.requestedDate)} a las {formatTime(visit.requestedTime)}
            </p>
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Se propondrá una nueva fecha al candidato. La visita original será cancelada automáticamente.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-900 dark:text-white block mb-2">
                Nueva fecha
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
                Nueva hora
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
            Volver
          </button>
          <button
            onClick={() => canSubmit && onConfirm(newDate, newTime)}
            disabled={!canSubmit}
            className="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Reagendar visita
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

const SCHEDULE_PROPERTIES = [
  'Apartamento Centro Histórico',
  'Casa Laureles',
  'Estudio Poblado',
  'Apartamento Chapinero Alto',
  'Casa Envigado',
];

function ScheduleModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [propiedad, setPropiedad] = useState('');
  const [notas, setNotas] = useState('');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const canSubmit = fecha.length > 0 && hora.length > 0 && propiedad.length > 0;

  const handleConfirm = () => {
    if (!canSubmit) return;
    toast.success('Visita agendada exitosamente', {
      description: 'Se ha programado la visita.',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#222224] w-full max-w-md rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-700">
          <h3 className="font-semibold text-neutral-900 dark:text-white">Agendar visita</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-900 dark:text-white block mb-2">Fecha</label>
              <input
                type="date"
                value={fecha}
                min={minDate}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full h-11 px-4 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-900 dark:text-white block mb-2">Hora</label>
              <select
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full h-11 px-4 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Seleccionar</option>
                {SCHEDULE_HOURS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-900 dark:text-white block mb-2">Propiedad</label>
            <select
              value={propiedad}
              onChange={(e) => setPropiedad(e.target.value)}
              className="w-full h-11 px-4 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Seleccionar propiedad</option>
              {SCHEDULE_PROPERTIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-900 dark:text-white block mb-2">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas adicionales para la visita..."
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
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar
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
  const [visits, setVisits] = useState<Visit[]>(MOCK_VISITS);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Modal state
  const [cancelTarget, setCancelTarget] = useState<Visit | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Visit | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const stats = getVisitStats();

  // Today's confirmed
  const today = new Date().toISOString().split('T')[0];
  const confirmedToday = visits.filter(
    v => v.status === 'confirmed' && v.requestedDate === today
  ).length;

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
    { id: 'all', label: 'Todas', count: visits.length },
    { id: 'requested', label: 'Solicitadas', count: countByStatus('requested') },
    { id: 'confirmed', label: 'Confirmadas', count: countByStatus('confirmed') },
    { id: 'completed', label: 'Completadas', count: countByStatus('completed') },
    { id: 'cancelled', label: 'Canceladas', count: countByStatus('cancelled') + countByStatus('no_show') },
  ];

  const columns: PlanTableColumn<Visit>[] = [
    {
      key: 'candidateName',
      header: 'Candidato',
      sortable: true,
      type: 'avatar',
      nameKey: 'candidateName',
    },
    {
      key: 'propertyTitle',
      header: 'Propiedad',
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
      header: 'Fecha',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-neutral-600 dark:text-neutral-300">{formatDate(row.requestedDate)}</span>
      ),
    },
    {
      key: 'requestedTime',
      header: 'Hora',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-neutral-600 dark:text-neutral-300">{formatTime(row.requestedTime)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      render: (row) => (
        <PlanStatusBadge
          status={STATUS_TO_PLAN[row.status]}
          label={VISIT_STATUS_LABELS[row.status]}
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

  const handleConfirm = (visit: Visit) => {
    setVisits(prev => prev.map(v =>
      v.id === visit.id ? { ...v, status: 'confirmed' as VisitStatus } : v
    ));
    setSheetOpen(false);
    toast.success('Visita confirmada', {
      description: `Visita con ${visit.candidateName} confirmada para ${formatDate(visit.requestedDate)} a las ${formatTime(visit.requestedTime)}.`,
    });
  };

  const handleComplete = (visit: Visit) => {
    setVisits(prev => prev.map(v =>
      v.id === visit.id ? { ...v, status: 'completed' as VisitStatus } : v
    ));
    setSheetOpen(false);
    toast.success('Visita completada', {
      description: `Visita con ${visit.candidateName} marcada como completada.`,
    });
  };

  const openCancelModal = (visit: Visit) => {
    setSheetOpen(false);
    // Small delay so sheet closes before modal opens
    setTimeout(() => setCancelTarget(visit), 150);
  };

  const confirmCancel = (reason: string) => {
    if (!cancelTarget) return;
    setVisits(prev => prev.map(v =>
      v.id === cancelTarget.id
        ? { ...v, status: 'cancelled' as VisitStatus, cancellationReason: reason }
        : v
    ));
    setCancelTarget(null);
    toast('Visita cancelada', {
      description: `La visita con ${cancelTarget.candidateName} ha sido cancelada.`,
      icon: '❌',
    });
  };

  const openRescheduleModal = (visit: Visit) => {
    setSheetOpen(false);
    setTimeout(() => setRescheduleTarget(visit), 150);
  };

  const confirmReschedule = (newDate: string, newTime: string) => {
    if (!rescheduleTarget) return;

    const newVisit: Visit = {
      id: `visit-${Date.now()}`,
      candidateId: rescheduleTarget.candidateId,
      candidateName: rescheduleTarget.candidateName,
      propertyId: rescheduleTarget.propertyId,
      propertyTitle: rescheduleTarget.propertyTitle,
      requestedDate: newDate,
      requestedTime: newTime,
      status: 'requested',
      candidateMessage: rescheduleTarget.candidateMessage,
      rescheduledFrom: rescheduleTarget.id,
      createdAt: new Date().toISOString(),
    };

    setVisits(prev => [
      newVisit,
      ...prev.map(v =>
        v.id === rescheduleTarget.id
          ? { ...v, status: 'cancelled' as VisitStatus, cancellationReason: 'Reagendada a nueva fecha' }
          : v
      ),
    ]);

    setRescheduleTarget(null);
    toast.success('Visita reagendada', {
      description: `Nueva visita con ${rescheduleTarget.candidateName} propuesta para ${formatDate(newDate)} a las ${formatTime(newTime)}.`,
    });
  };

  // ---- Quick actions ----

  const getQuickActions = (visit: Visit): QuickAction[] => {
    const actions: QuickAction[] = [];

    if (visit.status === 'requested') {
      actions.push({
        id: 'confirm',
        label: 'Confirmar',
        icon: <CheckCircle className="w-4 h-4" />,
        onClick: () => handleConfirm(visit),
        variant: 'primary',
      });
      actions.push({
        id: 'reschedule',
        label: 'Reagendar',
        icon: <CalendarPlus className="w-4 h-4" />,
        onClick: () => openRescheduleModal(visit),
      });
      actions.push({
        id: 'cancel',
        label: 'Cancelar',
        icon: <XCircle className="w-4 h-4" />,
        onClick: () => openCancelModal(visit),
        variant: 'danger',
      });
    }

    if (visit.status === 'confirmed') {
      actions.push({
        id: 'complete',
        label: 'Completar',
        icon: <CheckCircle className="w-4 h-4" />,
        onClick: () => handleComplete(visit),
        variant: 'primary',
      });
      actions.push({
        id: 'reschedule',
        label: 'Reagendar',
        icon: <CalendarPlus className="w-4 h-4" />,
        onClick: () => openRescheduleModal(visit),
      });
      actions.push({
        id: 'cancel',
        label: 'Cancelar',
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
      title: 'Información de la Visita',
      content: (
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Fecha</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">{formatDate(visit.requestedDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Hora</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">{formatTime(visit.requestedTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Estado</span>
            <PlanStatusBadge
              status={STATUS_TO_PLAN[visit.status]}
              label={VISIT_STATUS_LABELS[visit.status]}
              size="sm"
            />
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Propiedad</span>
            <span className="text-sm text-neutral-900 dark:text-white">{visit.propertyTitle}</span>
          </div>
          {visit.rescheduledFrom && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
              <p className="text-xs text-indigo-700 dark:text-indigo-400">Reagendada desde otra visita</p>
            </div>
          )}
        </div>
      ),
    },
    ...(visit.candidateMessage ? [{
      id: 'candidate-message',
      title: 'Mensaje del Candidato',
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
      title: 'Motivo de Cancelación',
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
      title: 'Notas',
      content: (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
          <p className="text-sm text-amber-800 dark:text-amber-300">{visit.landlordNotes}</p>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Visitas</h1>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">
              Gestiona las visitas programadas a tus propiedades
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shrink-0"
          >
            <CalendarPlus className="w-4 h-4" />
            Agendar visita
          </button>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                <CalendarBlank className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.total}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Total visitas</p>
          </div>

          <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.requested}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Pendientes</p>
            {stats.requested > 0 && (
              <span className="inline-flex items-center mt-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                Por confirmar
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{confirmedToday}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Confirmadas hoy</p>
          </div>

          <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.completed}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Completadas</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 p-1.5 mb-6 inline-flex">
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
                ? 'No hay visitas programadas'
                : tabFunnel === 'requested'
                ? 'No hay visitas solicitadas'
                : tabFunnel === 'confirmed'
                ? 'No hay visitas confirmadas'
                : tabFunnel === 'completed'
                ? 'No hay visitas completadas'
                : 'No hay visitas canceladas'
            }
            description="Cuando los inquilinos soliciten visitar tus propiedades, aparecerán aquí."
            action={{ label: 'Ver propiedades', href: '/panel/propiedades' }}
          />
        ) : (
          <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
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
            statusLabel: VISIT_STATUS_LABELS[selectedVisit.status],
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
        <ScheduleModal onClose={() => setShowScheduleModal(false)} />
      )}
    </div>
  );
}
