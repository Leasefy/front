'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  X,
  Wrench,
  Lightning,
  Snowflake,
  HouseLine,
  PaintBrush,
  Key,
  DotsThreeCircle,
  Warning,
  Clock,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  User,
  Phone,
  EnvelopeSimple,
  MapPin,
  CalendarBlank,
  CurrencyDollar,
  Check,
  Trash,
  Upload,
  Plus,
  ChatCircle,
  Play,
  Note,
  Camera,
  CaretRight,
  Buildings,
  ArrowRight,
  FileText,
  Eye,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { IconButton } from '@leasefy/cadence';
import { useI18n } from '@/lib/i18n';
import type {
  SolicitudMantenimiento,
  MantenimientoType,
  MantenimientoPriority,
  MantenimientoStatus,
  MantenimientoQuote,
} from '@/lib/types/inmobiliaria';
import { formatCurrency, getMantenimientoTypeInfo } from '@/lib/types/inmobiliaria';
import { CotizacionComparator } from './CotizacionComparator';

// ============================================================================
// Types
// ============================================================================

export interface MantenimientoViewerProps {
  solicitud: SolicitudMantenimiento | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (solicitudId: string, newStatus: MantenimientoStatus) => void;
  onApproveQuote?: (solicitudId: string, quoteId: string) => void;
  onAddNote?: (solicitudId: string, note: string) => void;
  onUploadPhoto?: (solicitudId: string, type: 'before' | 'after', files: File[]) => void;
  onRequestQuote?: (solicitudId: string) => void;
}

interface TimelineEvent {
  id: string;
  status: MantenimientoStatus | 'quote_received' | 'note_added' | 'photo_added';
  title: string;
  description?: string;
  date: string;
  actor?: string;
  isCurrent?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_ICONS: Record<MantenimientoType, React.ElementType> = {
  plumbing: Wrench,
  electrical: Lightning,
  appliance: Snowflake,
  structural: HouseLine,
  painting: PaintBrush,
  locks: Key,
  other: DotsThreeCircle,
};

const PRIORITY_STYLES: Record<MantenimientoPriority, { bg: string; text: string; labelKey: string }> = {
  low: { bg: 'bg-surface-muted dark:bg-surface-muted', text: 'text-fg-muted dark:text-fg-muted', labelKey: 'inmobiliaria.mantenimiento.priorityLow' },
  medium: { bg: 'bg-primary-soft', text: 'text-primary', labelKey: 'inmobiliaria.mantenimiento.priorityMedium' },
  high: { bg: 'bg-warning-soft', text: 'text-warning', labelKey: 'inmobiliaria.mantenimiento.priorityHigh' },
  emergency: { bg: 'bg-danger-soft', text: 'text-danger', labelKey: 'inmobiliaria.mantenimiento.priorityEmergency' },
};

const STATUS_STYLES: Record<MantenimientoStatus, { bg: string; text: string; labelKey: string; icon: React.ElementType }> = {
  reported: { bg: 'bg-surface-muted dark:bg-surface-muted', text: 'text-fg-muted dark:text-fg-muted', labelKey: 'inmobiliaria.mantenimiento.statusReported', icon: Note },
  quoted: { bg: 'bg-primary-soft', text: 'text-primary', labelKey: 'inmobiliaria.mantenimiento.statusQuoted', icon: CurrencyDollar },
  approved: { bg: 'bg-success-soft', text: 'text-success', labelKey: 'inmobiliaria.mantenimiento.statusApproved', icon: Check },
  in_progress: { bg: 'bg-warning-soft', text: 'text-warning', labelKey: 'inmobiliaria.mantenimiento.statusInProgress', icon: Play },
  completed: { bg: 'bg-success-soft', text: 'text-success', labelKey: 'inmobiliaria.mantenimiento.statusCompleted', icon: CheckCircle },
  cancelled: { bg: 'bg-danger-soft', text: 'text-danger', labelKey: 'inmobiliaria.mantenimiento.statusCancelled', icon: XCircle },
};

const STATUS_ORDER: MantenimientoStatus[] = ['reported', 'quoted', 'approved', 'in_progress', 'completed'];

// ============================================================================
// Helper Functions
// ============================================================================

// formatDate and formatDateTime are replaced by fmtDate from useI18n

function generateTimelineFn(
  solicitud: SolicitudMantenimiento,
  t: (key: string, params?: Record<string, string | number>) => string
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Reported event
  events.push({
    id: 'event-reported',
    status: 'reported',
    title: t('inmobiliaria.mantenimiento.tlReported'),
    description: solicitud.title,
    date: solicitud.createdAt,
    actor: solicitud.tenantName,
    isCurrent: solicitud.status === 'reported',
  });

  // Quote events
  solicitud.quotes.forEach((quote) => {
    events.push({
      id: `quote-${quote.id}`,
      status: 'quote_received',
      title: t('inmobiliaria.mantenimiento.tlQuoteReceived'),
      description: `${quote.providerName} - ${formatCurrency(quote.amount)}`,
      date: quote.createdAt,
      isCurrent: false,
    });
  });

  // Status-based events
  if (['quoted', 'approved', 'in_progress', 'completed', 'cancelled'].includes(solicitud.status)) {
    if (solicitud.status !== 'cancelled' && solicitud.quotes.length > 0) {
      events.push({
        id: 'event-quoted',
        status: 'quoted',
        title: t('inmobiliaria.mantenimiento.tlWaitingApproval'),
        description: solicitud.selectedQuoteId
          ? `${t('inmobiliaria.mantenimiento.tlSelectedQuote')}: ${solicitud.quotes.find((q) => q.id === solicitud.selectedQuoteId)?.providerName}`
          : t('inmobiliaria.mantenimiento.tlPendingQuoteSelection'),
        date: solicitud.updatedAt,
        isCurrent: solicitud.status === 'quoted',
      });
    }
  }

  if (['approved', 'in_progress', 'completed'].includes(solicitud.status)) {
    events.push({
      id: 'event-approved',
      status: 'approved',
      title: t('inmobiliaria.mantenimiento.tlQuoteApproved'),
      description: solicitud.approvedAmount ? `${t('inmobiliaria.mantenimiento.tlAmount')}: ${formatCurrency(solicitud.approvedAmount)}` : undefined,
      date: solicitud.updatedAt,
      actor: solicitud.propietarioName,
      isCurrent: solicitud.status === 'approved',
    });
  }

  if (['in_progress', 'completed'].includes(solicitud.status)) {
    events.push({
      id: 'event-in_progress',
      status: 'in_progress',
      title: t('inmobiliaria.mantenimiento.tlWorkInProgress'),
      description: t('inmobiliaria.mantenimiento.tlProviderExecuting'),
      date: solicitud.updatedAt,
      isCurrent: solicitud.status === 'in_progress',
    });
  }

  if (solicitud.status === 'completed') {
    events.push({
      id: 'event-completed',
      status: 'completed',
      title: t('inmobiliaria.mantenimiento.tlWorkCompleted'),
      description: solicitud.completionNotes,
      date: solicitud.completedAt || solicitud.updatedAt,
      isCurrent: true,
    });
  }

  if (solicitud.status === 'cancelled') {
    events.push({
      id: 'event-cancelled',
      status: 'cancelled',
      title: t('inmobiliaria.mantenimiento.tlRequestCancelled'),
      date: solicitud.updatedAt,
      isCurrent: true,
    });
  }

  // Sort by date descending (most recent first)
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ============================================================================
// Photo Gallery Component
// ============================================================================

function PhotoGallery({
  photos,
  label,
  emptyLabel,
  onUpload,
  t,
}: {
  photos?: string[];
  label: string;
  emptyLabel: string;
  onUpload?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-2">
        <Camera className="w-8 h-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        {onUpload && (
          <Button
            variant="link"
            size="sm"
            hideArrow
            onClick={onUpload}
            className="h-auto gap-1 p-0 text-sm"
          >
            <Upload className="w-4 h-4" />
            {t('inmobiliaria.mantenimiento.uploadPhotos')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((url, idx) => (
          // allowlist: image-tile button (clickable photo thumbnail w/ hover Eye overlay) —
          // hosts a fill image; Button/IconButton can't (image-tile precedent).
          <button
            key={idx}
            onClick={() => setSelectedPhoto(url)}
            className="aspect-square rounded-md bg-muted overflow-hidden relative group"
          >
            <div className="absolute inset-0 flex items-center justify-center bg-surface-muted dark:bg-surface-muted">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
        {onUpload && (
          // allowlist: add-photo dropzone tile (aspect-square dashed grid cell) — custom upload
          // affordance; FileDropzone's chip UI can't model the in-grid square tile.
          <button
            onClick={onUpload}
            className="aspect-square rounded-md border-2 border-dashed border-border hover:border-primary/30 transition-colors flex items-center justify-center"
          >
            <Plus className="w-6 h-6 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Timeline Component
// ============================================================================

function Timeline({ events, fmtDate }: { events: TimelineEvent[]; fmtDate: (d: string) => string }) {
  return (
    <div className="space-y-1">
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;
        const StatusIcon =
          event.status === 'quote_received'
            ? CurrencyDollar
            : event.status === 'note_added'
            ? ChatCircle
            : event.status === 'photo_added'
            ? Camera
            : STATUS_STYLES[event.status as MantenimientoStatus]?.icon || Note;

        const statusStyle =
          event.status === 'quote_received' ||
          event.status === 'note_added' ||
          event.status === 'photo_added'
            ? { bg: 'bg-surface-muted dark:bg-surface-muted', text: 'text-fg-muted dark:text-fg-muted' }
            : STATUS_STYLES[event.status as MantenimientoStatus] || STATUS_STYLES.reported;

        return (
          <div key={event.id} className="flex gap-3">
            {/* Timeline Line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  event.isCurrent ? statusStyle.bg : 'bg-muted'
                )}
              >
                <StatusIcon
                  className={cn(
                    'w-4 h-4',
                    event.isCurrent ? statusStyle.text : 'text-muted-foreground'
                  )}
                  weight={event.isCurrent ? 'fill' : 'regular'}
                />
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-border my-1" />}
            </div>

            {/* Content */}
            <div className={cn('pb-4', isLast && 'pb-0')}>
              <p
                className={cn(
                  'font-medium',
                  event.isCurrent ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {event.title}
              </p>
              {event.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{event.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{fmtDate(event.date)}</span>
                {event.actor && (
                  <>
                    <span>·</span>
                    <span>{event.actor}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * MantenimientoViewer - Detailed view drawer for maintenance requests
 * Shows property info, timeline, quotes, photos, and action buttons
 */
export function MantenimientoViewer({
  solicitud,
  isOpen,
  onClose,
  onStatusChange,
  onApproveQuote,
  onAddNote,
  onUploadPhoto,
  onRequestQuote,
}: MantenimientoViewerProps) {
  const { t, formatDate: fmtDate } = useI18n();
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | undefined>(undefined);

  const TypeIcon = solicitud ? TYPE_ICONS[solicitud.type] : Wrench;
  const typeInfo = solicitud ? getMantenimientoTypeInfo(solicitud.type) : null;
  const priorityStyle = solicitud ? PRIORITY_STYLES[solicitud.priority] : PRIORITY_STYLES.medium;
  const statusStyle = solicitud ? STATUS_STYLES[solicitud.status] : STATUS_STYLES.reported;
  const timeline = useMemo(
    () => (solicitud ? generateTimelineFn(solicitud, t) : []),
    [solicitud, t]
  );

  // Initialize selected quote from solicitud
  useMemo(() => {
    if (solicitud?.selectedQuoteId) {
      setSelectedQuoteId(solicitud.selectedQuoteId);
    }
  }, [solicitud?.selectedQuoteId]);

  const handleAddNote = () => {
    if (solicitud && onAddNote && noteText.trim()) {
      onAddNote(solicitud.id, noteText);
      setNoteText('');
      setShowNoteDialog(false);
    }
  };

  const handleCancel = () => {
    if (solicitud && onStatusChange) {
      onStatusChange(solicitud.id, 'cancelled');
      setShowCancelDialog(false);
      onClose();
    }
  };

  const handleComplete = () => {
    if (solicitud && onStatusChange) {
      onStatusChange(solicitud.id, 'completed');
      setShowCompleteDialog(false);
    }
  };

  const handleSelectQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    if (solicitud && onApproveQuote) {
      onApproveQuote(solicitud.id, quoteId);
    }
  };

  const handleStartWork = () => {
    if (solicitud && onStatusChange) {
      onStatusChange(solicitud.id, 'in_progress');
    }
  };

  if (!solicitud) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b border-border">
            <SheetHeader className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0',
                      priorityStyle.bg
                    )}
                  >
                    <TypeIcon className={cn('w-5 h-5', priorityStyle.text)} />
                  </div>
                  <div>
                    <SheetTitle className="text-left">{solicitud.title}</SheetTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {typeInfo?.labelEs} · {fmtDate(solicitud.createdAt)}
                    </p>
                  </div>
                </div>
                <IconButton
                  variant="ghost"
                  onClick={onClose}
                  aria-label={t('inmobiliaria.mantenimiento.cancel')}
                  icon={<X className="w-5 h-5" />}
                />
              </div>

              {/* Status & Priority Badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                    statusStyle.bg,
                    statusStyle.text
                  )}
                >
                  <statusStyle.icon className="w-3.5 h-3.5" />
                  {t(statusStyle.labelKey)}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                    priorityStyle.bg,
                    priorityStyle.text
                  )}
                >
                  <Warning className="w-3.5 h-3.5" />
                  {t('inmobiliaria.mantenimiento.priorityLabel')}: {t(priorityStyle.labelKey)}
                </span>
              </div>
            </SheetHeader>
          </div>

          {/* Content */}
          <div className="p-4 space-y-6">
            {/* Property & People */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Buildings className="w-4 h-4" />
                {t('inmobiliaria.mantenimiento.propertyAndPeople')}
              </h4>
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div>
                  <p className="font-medium text-foreground">{solicitud.propertyTitle}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {solicitud.propertyAddress}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('inmobiliaria.mantenimiento.tenant')}</p>
                    <p className="font-medium text-foreground">{solicitud.tenantName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('inmobiliaria.mantenimiento.owner')}</p>
                    <p className="font-medium text-foreground">{solicitud.propietarioName}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t('inmobiliaria.mantenimiento.descriptionLabel')}
              </h4>
              <p className="text-sm text-muted-foreground">{solicitud.description}</p>
            </div>

            {/* Before Photos */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Camera className="w-4 h-4" />
                {t('inmobiliaria.mantenimiento.photosBefore')}
              </h4>
              <PhotoGallery
                photos={solicitud.photoUrls}
                label=""
                emptyLabel={t('inmobiliaria.mantenimiento.noPhotosProblem')}
                t={t}
                onUpload={
                  onUploadPhoto
                    ? () => onUploadPhoto(solicitud.id, 'before', [])
                    : undefined
                }
              />
            </div>

            {/* Quotations Section */}
            {(solicitud.status === 'quoted' ||
              solicitud.status === 'reported' ||
              solicitud.quotes.length > 0) && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CurrencyDollar className="w-4 h-4" />
                  {t('inmobiliaria.mantenimiento.quotations')}
                </h4>
                <CotizacionComparator
                  solicitud={solicitud}
                  onSelectQuote={handleSelectQuote}
                  onRequestNewQuote={
                    onRequestQuote ? () => onRequestQuote(solicitud.id) : undefined
                  }
                  selectedQuoteId={selectedQuoteId}
                />
              </div>
            )}

            {/* After Photos (if in progress or completed) */}
            {['in_progress', 'completed'].includes(solicitud.status) && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {t('inmobiliaria.mantenimiento.photosAfter')}
                </h4>
                <PhotoGallery
                  photos={solicitud.completionPhotoUrls}
                  label=""
                  emptyLabel={t('inmobiliaria.mantenimiento.noPhotosCompleted')}
                  t={t}
                  onUpload={
                    solicitud.status === 'in_progress' && onUploadPhoto
                      ? () => onUploadPhoto(solicitud.id, 'after', [])
                      : undefined
                  }
                />
              </div>
            )}

            {/* Completion Notes */}
            {solicitud.status === 'completed' && solicitud.completionNotes && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Note className="w-4 h-4" />
                  {t('inmobiliaria.mantenimiento.completionNotes')}
                </h4>
                <p className="text-sm text-muted-foreground p-3 rounded-md bg-muted">
                  {solicitud.completionNotes}
                </p>
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('inmobiliaria.mantenimiento.history')}
              </h4>
              <Timeline events={timeline} fmtDate={fmtDate} />
            </div>

            {/* Who Pays */}
            <div className="p-4 rounded-xl border border-border bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CurrencyDollar className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{t('inmobiliaria.mantenimiento.whoPays')}</span>
                </div>
                <Badge
                  variant={
                    solicitud.paidBy === 'owner'
                      ? 'default'
                      : solicitud.paidBy === 'tenant'
                      ? 'warning'
                      : 'secondary'
                  }
                >
                  {solicitud.paidBy === 'owner'
                    ? t('inmobiliaria.mantenimiento.paidByOwner')
                    : solicitud.paidBy === 'tenant'
                    ? t('inmobiliaria.mantenimiento.paidByTenant')
                    : solicitud.paidBy === 'split'
                    ? t('inmobiliaria.mantenimiento.paidBySplit')
                    : t('inmobiliaria.mantenimiento.paidByAgency')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          {solicitud.status !== 'completed' && solicitud.status !== 'cancelled' && (
            <div className="sticky bottom-0 border-t border-border bg-background p-4 space-y-3">
              {/* Primary Action based on status */}
              {solicitud.status === 'approved' && (
                <Button
                  hideArrow
                  onClick={handleStartWork}
                  className="w-full"
                >
                  <Play className="w-5 h-5" weight="fill" />
                  {t('inmobiliaria.mantenimiento.startWork')}
                </Button>
              )}

              {solicitud.status === 'in_progress' && (
                // success/green: Cadence Button has no success variant (logged gap) — real Button
                // keeps DS states; only the fill is overridden for the missing tone.
                <Button
                  hideArrow
                  onClick={() => setShowCompleteDialog(true)}
                  className="w-full bg-success text-white hover:bg-success/90"
                >
                  <CheckCircle className="w-5 h-5" weight="fill" />
                  {t('inmobiliaria.mantenimiento.markCompleted')}
                </Button>
              )}

              {/* Secondary Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  hideArrow
                  onClick={() => setShowNoteDialog(true)}
                  className="flex-1"
                >
                  <ChatCircle className="w-4 h-4" />
                  {t('inmobiliaria.mantenimiento.addNote')}
                </Button>
                <IconButton
                  variant="outline"
                  onClick={() => setShowCancelDialog(true)}
                  aria-label={t('inmobiliaria.mantenimiento.cancelRequest')}
                  icon={<Trash className="w-4 h-4" />}
                  className="border-danger/30 text-danger hover:bg-danger-soft hover:text-danger"
                />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inmobiliaria.mantenimiento.addNote')}</DialogTitle>
            <DialogDescription>
              {t('inmobiliaria.mantenimiento.addNoteDesc')}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={t('inmobiliaria.mantenimiento.notePlaceholder')}
            className="w-full min-h-[100px] resize-none"
          />
          <DialogFooter>
            <Button
              variant="outline"
              hideArrow
              onClick={() => setShowNoteDialog(false)}
            >
              {t('inmobiliaria.mantenimiento.cancel')}
            </Button>
            <Button
              hideArrow
              onClick={handleAddNote}
              disabled={!noteText.trim()}
            >
              {t('inmobiliaria.mantenimiento.saveNote')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inmobiliaria.mantenimiento.cancelRequest')}</DialogTitle>
            <DialogDescription>
              {t('inmobiliaria.mantenimiento.cancelConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              hideArrow
              onClick={() => setShowCancelDialog(false)}
            >
              {t('inmobiliaria.mantenimiento.noKeep')}
            </Button>
            <Button
              variant="destructive"
              hideArrow
              onClick={handleCancel}
            >
              {t('inmobiliaria.mantenimiento.yesCancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inmobiliaria.mantenimiento.markAsCompleted')}</DialogTitle>
            <DialogDescription>
              {t('inmobiliaria.mantenimiento.completeConfirm')}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            placeholder={t('inmobiliaria.mantenimiento.completionNotesPlaceholder')}
            className="w-full min-h-[100px] resize-none"
          />
          <DialogFooter>
            <Button
              variant="outline"
              hideArrow
              onClick={() => setShowCompleteDialog(false)}
            >
              {t('inmobiliaria.mantenimiento.cancel')}
            </Button>
            {/* success/green: Cadence Button has no success variant (logged gap) — real Button + bg override. */}
            <Button
              hideArrow
              onClick={handleComplete}
              className="bg-success text-white hover:bg-success/90"
            >
              {t('inmobiliaria.mantenimiento.confirmCompleted')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
