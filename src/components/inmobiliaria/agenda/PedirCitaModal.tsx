'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarPlus } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { useLenis } from '@/components/providers/SmoothScroll';
import { Button, Textarea } from '@/components/ui';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog';
import { useConsignaciones } from '@/lib/hooks/useInmobiliaria';
import { ApiError } from '@/lib/api/client';
import { agendaApi } from '@/lib/api/agenda.service';

interface PedirCitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a visit is scheduled so the agenda can refetch. */
  onCreated: () => void;
  /** When set, the visit is scheduled for this property (selector is locked). */
  presetPropertyId?: string;
  presetPropertyTitle?: string;
}

export function PedirCitaModal({
  isOpen,
  onClose,
  onCreated,
  presetPropertyId,
  presetPropertyTitle,
}: PedirCitaModalProps) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.agenda.${s}`;
  const lenis = useLenis();

  const isPreset = !!presetPropertyId;

  // Only properties that carry a real propertyId can host a PropertyVisit.
  const { consignaciones } = useConsignaciones();
  const properties = useMemo(
    () => consignaciones.filter((c) => c.propertyId),
    [consignaciones],
  );

  const [propertyId, setPropertyId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:30');
  const [visitType, setVisitType] = useState<'IN_PERSON' | 'VIRTUAL'>('IN_PERSON');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    lenis?.stop();
    return () => {
      lenis?.start();
    };
  }, [isOpen, lenis]);

  useEffect(() => {
    if (isOpen) {
      setPropertyId(presetPropertyId ?? '');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setDate('');
      setStartTime('10:00');
      setEndTime('10:30');
      setVisitType('IN_PERSON');
      setNotes('');
    }
  }, [isOpen, presetPropertyId]);

  const canSubmit =
    !submitting &&
    propertyId !== '' &&
    contactName.trim() !== '' &&
    date !== '' &&
    startTime !== '' &&
    endTime !== '' &&
    endTime > startTime;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await agendaApi.createCita({
        propertyId,
        date,
        startTime,
        endTime,
        visitType,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(t(k('citaSuccess')));
      onCreated();
      onClose();
    } catch (err) {
      // Con la sesión vencida el cliente ya está cerrando sesión: un «no se
      // pudo agendar» encima sería mentira (la cita no falló, la sesión sí).
      if (err instanceof ApiError && err.status === 401) return;
      toast.error(t(k('citaError')), {
        description: err instanceof ApiError && err.message.length < 160 ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <ResponsiveDialogContent
        className="max-w-lg max-h-[90dvh] overflow-y-auto"
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(k('citaTitle'))}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="space-y-4">
          {/* Property */}
          <div>
            <label className="mb-1.5 block text-caption text-muted-foreground">
              {t(k('citaProperty'))} <span className="text-danger">*</span>
            </label>
            {isPreset ? (
              <div className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-fg">
                {presetPropertyTitle ?? presetPropertyId}
              </div>
            ) : (
              <Select value={propertyId || undefined} onValueChange={setPropertyId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t(k('citaSelectProperty'))} />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((c) => (
                    <SelectItem key={c.id} value={c.propertyId}>
                      {c.propertyTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Contact */}
          <div>
            <label className="mb-1.5 block text-caption text-muted-foreground">
              {t(k('citaContact'))} <span className="text-danger">*</span>
            </label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder={t(k('citaContact'))}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-caption text-muted-foreground">
                {t(k('citaEmail'))}
              </label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-caption text-muted-foreground">
                {t(k('citaPhone'))}
              </label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="3001234567"
                maxLength={20}
              />
            </div>
          </div>

          {/* Date + times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-caption text-muted-foreground">
                {t(k('citaDate'))} <span className="text-danger">*</span>
              </label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-caption text-muted-foreground">
                {t(k('citaStart'))} <span className="text-danger">*</span>
              </label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-caption text-muted-foreground">
                {t(k('citaEnd'))} <span className="text-danger">*</span>
              </label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="mb-1.5 block text-caption text-muted-foreground">
              {t(k('citaType'))}
            </label>
            <Select value={visitType} onValueChange={(v) => setVisitType(v as 'IN_PERSON' | 'VIRTUAL')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_PERSON">{t(k('citaTypeInPerson'))}</SelectItem>
                <SelectItem value="VIRTUAL">{t(k('citaTypeVirtual'))}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-caption text-muted-foreground">
              {t(k('citaNotes'))}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t(k('citaNotes'))}
            />
          </div>
        </div>

        <ResponsiveDialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            {t('inmobiliaria.common.cancel')}
          </Button>
          <Button type="button" size="sm" hideArrow onClick={() => void handleSubmit()} disabled={!canSubmit}>
            <CalendarPlus className="w-4 h-4" />
            {t(k('citaSubmit'))}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
