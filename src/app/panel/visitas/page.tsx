'use client';

import { useState } from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  MessageSquare,
  CalendarPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_VISITS, getVisitStats } from '@/lib/data/mock-visits';
import { VISIT_STATUS_LABELS } from '@/lib/types/visit';
import type { Visit, VisitStatus } from '@/lib/types/visit';
import { PlanTable, PlanTableColumn } from '@/components/ui/plan/PlanTable';
import { PlanTabs, PlanTab } from '@/components/ui/plan/PlanTabs';
import { PlanDetailSheet, QuickAction, DetailSection } from '@/components/ui/plan/PlanDetailSheet';
import { PlanStatusBadge, PlanStatusType } from '@/components/ui/plan/PlanStatusBadge';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';

type TabFilter = 'all' | VisitStatus;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card w-full max-w-md mx-4 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-plan-border">
          <h3 className="font-semibold text-plan-primary">Cancelar visita</h3>
          <button onClick={onClose} className="text-plan-muted hover:text-plan-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-plan-secondary">
            Visita con <span className="font-medium text-plan-primary">{visit.candidateName}</span> el {formatDate(visit.requestedDate)} a las {formatTime(visit.requestedTime)}.
          </p>

          <div>
            <label className="text-sm font-medium text-plan-primary block mb-2">
              Motivo de cancelación
            </label>
            <div className="space-y-2">
              {CANCEL_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${
                    selectedReason === reason
                      ? 'border-primary bg-indigo-50/50'
                      : 'border-plan-border hover:bg-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-plan-primary">{reason}</span>
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
              className="w-full px-3 py-2 text-sm border border-plan-border bg-muted placeholder:text-plan-muted focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-plan-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-plan-secondary hover:text-plan-primary transition-colors"
          >
            Volver
          </button>
          <button
            onClick={() => canSubmit && onConfirm(finalReason)}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card w-full max-w-md mx-4 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-plan-border">
          <h3 className="font-semibold text-plan-primary">Reagendar visita</h3>
          <button onClick={onClose} className="text-plan-muted hover:text-plan-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div className="p-3 bg-muted rounded-sm">
            <p className="text-sm text-plan-secondary">
              Visita original con <span className="font-medium text-plan-primary">{visit.candidateName}</span>
            </p>
            <p className="text-sm text-plan-muted mt-0.5">
              {formatDate(visit.requestedDate)} a las {formatTime(visit.requestedTime)}
            </p>
          </div>

          <p className="text-sm text-plan-secondary">
            Se propondrá una nueva fecha al candidato. La visita original será cancelada automáticamente.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-plan-primary block mb-1.5">
                Nueva fecha
              </label>
              <input
                type="date"
                value={newDate}
                min={minDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-plan-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-plan-primary block mb-1.5">
                Nueva hora
              </label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-plan-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-plan-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-plan-secondary hover:text-plan-primary transition-colors"
          >
            Volver
          </button>
          <button
            onClick={() => canSubmit && onConfirm(newDate, newTime)}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card w-full max-w-md mx-4 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-plan-border">
          <h3 className="font-semibold text-plan-primary">Agendar visita</h3>
          <button onClick={onClose} className="text-plan-muted hover:text-plan-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-plan-primary block mb-1.5">Fecha</label>
              <input
                type="date"
                value={fecha}
                min={minDate}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-plan-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-plan-primary block mb-1.5">Hora</label>
              <select
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-plan-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Seleccionar</option>
                {SCHEDULE_HOURS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-plan-primary block mb-1.5">Propiedad</label>
            <select
              value={propiedad}
              onChange={(e) => setPropiedad(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-plan-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Seleccionar propiedad</option>
              {SCHEDULE_PROPERTIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-plan-primary block mb-1.5">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas adicionales para la visita..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-plan-border bg-card placeholder:text-plan-muted focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-plan-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-plan-secondary hover:text-plan-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
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

  // Filter
  const getFilteredVisits = () => {
    if (tabFilter === 'cancelled') {
      return visits.filter(v => v.status === 'cancelled' || v.status === 'no_show');
    }
    if (tabFilter === 'all') return visits;
    return visits.filter(v => v.status === tabFilter);
  };

  const tabs: PlanTab[] = [
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
          <Building2 className="w-4 h-4 text-plan-muted" />
          <span className="text-sm text-plan-secondary truncate max-w-[200px]">
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
        <span className="text-sm text-plan-secondary">{formatDate(row.requestedDate)}</span>
      ),
    },
    {
      key: 'requestedTime',
      header: 'Hora',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-plan-secondary">{formatTime(row.requestedTime)}</span>
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
            <span className="text-sm text-plan-secondary">Fecha</span>
            <span className="text-sm font-medium text-plan-primary">{formatDate(visit.requestedDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-plan-secondary">Hora</span>
            <span className="text-sm font-medium text-plan-primary">{formatTime(visit.requestedTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-plan-secondary">Estado</span>
            <PlanStatusBadge
              status={STATUS_TO_PLAN[visit.status]}
              label={VISIT_STATUS_LABELS[visit.status]}
              size="sm"
            />
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-plan-secondary">Propiedad</span>
            <span className="text-sm text-plan-primary">{visit.propertyTitle}</span>
          </div>
          {visit.rescheduledFrom && (
            <div className="p-2 bg-indigo-50 rounded-sm">
              <p className="text-xs text-indigo-700">Reagendada desde otra visita</p>
            </div>
          )}
        </div>
      ),
    },
    ...(visit.candidateMessage ? [{
      id: 'candidate-message',
      title: 'Mensaje del Candidato',
      content: (
        <div className="p-3 bg-muted rounded-sm">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-plan-muted mt-0.5 flex-shrink-0" />
            <p className="text-sm text-plan-secondary italic">
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
        <div className="p-3 bg-red-50 rounded-sm">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{visit.cancellationReason}</p>
          </div>
        </div>
      ),
    }] : []),
    ...(visit.landlordNotes ? [{
      id: 'landlord-notes',
      title: 'Notas',
      content: (
        <div className="p-3 bg-amber-50 rounded-sm">
          <p className="text-sm text-amber-800">{visit.landlordNotes}</p>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-plan-primary">Visitas</h1>
            <p className="mt-1 text-plan-secondary">
              Gestiona las visitas programadas a tus propiedades
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-sm text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
          >
            <CalendarPlus className="w-4 h-4" />
            Agendar visita
          </button>
        </header>

        {/* Stats */}
        <PlanStatsGrid columns={4} className="mb-8">
          <PlanStatsCard
            label="Total visitas"
            value={stats.total}
            icon={CalendarDays}
          />
          <PlanStatsCard
            label="Pendientes"
            value={stats.requested}
            sublabel="Por confirmar"
            variant={stats.requested > 0 ? 'accent' : 'default'}
            icon={Clock}
          />
          <PlanStatsCard
            label="Confirmadas hoy"
            value={confirmedToday}
            sublabel={today}
            icon={CheckCircle}
          />
          <PlanStatsCard
            label="Completadas"
            value={stats.completed}
            icon={CheckCircle}
          />
        </PlanStatsGrid>

        {/* Tabs */}
        <PlanTabs
          tabs={tabs}
          activeTab={tabFilter}
          onChange={(tab) => setTabFilter(tab as TabFilter)}
          variant="underline"
          className="mb-6"
        />

        {/* Table */}
        <PlanTable
          data={getFilteredVisits()}
          columns={columns}
          keyExtractor={(row) => row.id}
          onRowClick={handleRowClick}
          emptyMessage={
            tabFilter === 'all'
              ? 'No hay visitas programadas aún'
              : `No hay visitas ${tabs.find(t => t.id === tabFilter)?.label.toLowerCase() || ''}`
          }
          stickyHeader
          pagination
          pageSize={5}
        />
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
