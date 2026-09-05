'use client';

import { useState, useCallback } from 'react';
import { Clock, FloppyDisk, ArrowCounterClockwise } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { DayAvailabilityRow } from './DayAvailabilityRow';
import {
  DAYS_OF_WEEK,
  DEFAULT_AVAILABILITY_SCHEDULE,
  type AvailabilitySchedule,
  type DayOfWeek,
  type DayAvailability,
} from '@/lib/types/property';

interface AvailabilityScheduleEditorProps {
  schedule: AvailabilitySchedule;
  onSave: (schedule: AvailabilitySchedule) => void;
  /** Fired on every schedule change so a parent can track it live. */
  onChange?: (schedule: AvailabilitySchedule) => void;
  /** Hide the built-in Reset/Save footer (when the parent owns saving). */
  hideFooter?: boolean;
  isLoading?: boolean;
}

export function AvailabilityScheduleEditor({
  schedule: initialSchedule,
  onSave,
  onChange,
  hideFooter = false,
  isLoading = false,
}: AvailabilityScheduleEditorProps) {
  const [schedule, setSchedule] = useState<AvailabilitySchedule>(initialSchedule);
  const [hasChanges, setHasChanges] = useState(false);

  const handleDayChange = useCallback((day: DayOfWeek, availability: DayAvailability) => {
    setSchedule((prev) => {
      const next = { ...prev, [day]: availability };
      onChange?.(next);
      return next;
    });
    setHasChanges(true);
  }, [onChange]);

  const handleSave = useCallback(() => {
    onSave(schedule);
    setHasChanges(false);
    toast.success('Horarios guardados', {
      description: 'Los horarios de disponibilidad han sido actualizados.',
    });
  }, [schedule, onSave]);

  const handleReset = useCallback(() => {
    setSchedule(DEFAULT_AVAILABILITY_SCHEDULE);
    onChange?.(DEFAULT_AVAILABILITY_SCHEDULE);
    setHasChanges(true);
    toast.info('Horarios restablecidos', {
      description: 'Se han aplicado los horarios por defecto.',
    });
  }, [onChange]);

  // Count enabled days
  const enabledDays = DAYS_OF_WEEK.filter(day => schedule[day.key].enabled).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Clock className="h-4 w-4 text-fg-muted" aria-hidden />
            Días y horas
          </h3>
        </div>
        <div className="text-body-sm text-fg-muted">
          <span className="font-medium text-fg">{enabledDays}</span> de 7 días
        </div>
      </div>

      {/* Una sola tarjeta con filas separadas por una línea, no siete
          tarjetas: con siete, la lista ocupaba la pantalla entera y había que
          hacer scroll para ver el sábado. */}
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {DAYS_OF_WEEK.map((day) => (
          <DayAvailabilityRow
            key={day.key}
            dayLabel={day.label}
            shortLabel={day.shortLabel}
            availability={schedule[day.key]}
            onChange={(availability) => handleDayChange(day.key, availability)}
          />
        ))}
      </div>

      {/* Actions */}
      {!hideFooter && (
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowCounterClockwise className="w-4 h-4" />
            Restablecer por defecto
          </button>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            isLoading={isLoading}
            hideArrow
            className="min-w-[160px]"
          >
            <FloppyDisk className="w-4 h-4" />
            Guardar cambios
          </Button>
        </div>
      )}

      {/* Help text */}
      <div className="bg-muted/50 rounded-sm p-4 space-y-2">
        <p className="text-sm font-medium text-foreground">Consejos para configurar tus horarios</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Puedes agregar múltiples rangos horarios por día (ej: mañana y tarde)</li>
          <li>• Los candidatos solo podrán solicitar visitas en los horarios habilitados</li>
          <li>• Recibirás notificaciones cuando alguien solicite una visita</li>
        </ul>
      </div>
    </div>
  );
}
