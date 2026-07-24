'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Clock } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';
import { Spinner } from '@/components/ui/spinner';
import { AvailabilityScheduleEditor } from '@/components/panel/AvailabilityScheduleEditor';
import { type AvailabilitySchedule, DEFAULT_AVAILABILITY_SCHEDULE } from '@/lib/types/property';
import { agendaApi } from '@/lib/api/agenda.service';
import { scheduleToWindows, windowsToSchedule } from '@/lib/utils/availability-schedule';

/**
 * Agent working-hours for visits. A single weekly schedule set from the agent's
 * profile that governs every property they manage (fanned out on save).
 */
export function AgenteHorarioVisitas({ agenteId }: { agenteId: string }) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.agenda.${s}`;

  const [schedule, setSchedule] = useState<AvailabilitySchedule | null>(null);
  const [slotDuration, setSlotDuration] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    agendaApi
      .getAgenteDisponibilidad(agenteId)
      .then((windows) => {
        if (!active) return;
        setSlotDuration(windows[0]?.slotDuration ?? 30);
        setSchedule(windows.length > 0 ? windowsToSchedule(windows) : DEFAULT_AVAILABILITY_SCHEDULE);
      })
      .catch(() => {
        if (active) setSchedule(DEFAULT_AVAILABILITY_SCHEDULE);
      });
    return () => {
      active = false;
    };
  }, [agenteId]);

  const handleSave = useCallback(async () => {
    if (!schedule) return;
    setSaving(true);
    try {
      const { applied } = await agendaApi.setAgenteDisponibilidad(
        agenteId,
        scheduleToWindows(schedule, slotDuration),
      );
      toast.success(t(k('horarioAgenteGuardado'), { count: applied }));
    } catch (err) {
      toast.error(t(k('horarioAgenteError')), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }, [schedule, slotDuration, agenteId, t]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Clock className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-fg">{t(k('horarioAgenteTitle'))}</h3>
          <p className="text-xs text-fg-muted mt-0.5">{t(k('horarioAgenteDesc'))}</p>
        </div>
      </div>

      <div className="p-5">
        {schedule ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-fg-muted">{t(k('duracionCita'))}</label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full sm:w-56 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>

            <AvailabilityScheduleEditor
              key={agenteId}
              schedule={schedule}
              onSave={() => {}}
              onChange={setSchedule}
              hideFooter
            />

            <div className="flex justify-end pt-4 border-t border-border">
              <Button hideArrow className="min-w-[160px]" onClick={handleSave} disabled={saving}>
                {t('inmobiliaria.common.save')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-12 flex justify-center">
            <Spinner />
          </div>
        )}
      </div>
    </div>
  );
}

export default AgenteHorarioVisitas;
