'use client';

import { Plus } from '@phosphor-icons/react';
import { Switch } from '@/components/ui/switch';
import { TimeRangeInput } from './TimeRangeInput';
import type { DayAvailability, TimeRange } from '@/lib/types/property';
import { cn } from '@/lib/utils';

interface DayAvailabilityRowProps {
  dayLabel: string;
  shortLabel: string;
  availability: DayAvailability;
  onChange: (availability: DayAvailability) => void;
}

const DEFAULT_TIME_RANGE: TimeRange = { start: '09:00', end: '18:00' };

export function DayAvailabilityRow({
  dayLabel,
  shortLabel,
  availability,
  onChange,
}: DayAvailabilityRowProps) {
  const { enabled, ranges } = availability;

  const handleToggle = (checked: boolean) => {
    if (checked) {
      // Enable with default range if no ranges exist
      onChange({
        enabled: true,
        ranges: ranges.length > 0 ? ranges : [DEFAULT_TIME_RANGE],
      });
    } else {
      // Disable but keep ranges for when user re-enables
      onChange({ ...availability, enabled: false });
    }
  };

  const handleRangeChange = (index: number, newRange: TimeRange) => {
    const newRanges = [...ranges];
    newRanges[index] = newRange;
    onChange({ ...availability, ranges: newRanges });
  };

  const handleRemoveRange = (index: number) => {
    const newRanges = ranges.filter((_, i) => i !== index);
    // If removing last range, disable the day
    if (newRanges.length === 0) {
      onChange({ enabled: false, ranges: [] });
    } else {
      onChange({ ...availability, ranges: newRanges });
    }
  };

  const handleAddRange = () => {
    // Find a time slot after the last range
    const lastRange = ranges[ranges.length - 1];
    const lastEndIndex = lastRange
      ? Math.min(
          ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'].indexOf(lastRange.end) + 1,
          28 // Cap at 20:30 start for new range
        )
      : 4; // Default to 09:00

    const timeSlots = ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];

    const newStart = timeSlots[Math.min(lastEndIndex, 28)];
    const newEnd = timeSlots[Math.min(lastEndIndex + 2, 30)];

    onChange({
      ...availability,
      ranges: [...ranges, { start: newStart, end: newEnd }],
    });
  };

  // Check if we can add another range (needs room before 22:00)
  const canAddRange = enabled && ranges.length < 3 && (
    ranges.length === 0 ||
    ranges[ranges.length - 1].end < '21:00'
  );

  return (
    <div className={cn(
      "flex items-start gap-4 py-3 px-4 rounded-sm border transition-colors",
      enabled
        ? "bg-card border-border"
        : "bg-muted/30 border-border/50"
    )}>
      {/* Toggle and day name */}
      <div className="flex items-center gap-3 min-w-[140px] pt-1.5">
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          aria-label={`Habilitar ${dayLabel}`}
        />
        <span className={cn(
          "text-sm font-medium transition-colors",
          enabled ? "text-foreground" : "text-muted-foreground"
        )}>
          <span className="hidden sm:inline">{dayLabel}</span>
          <span className="sm:hidden">{shortLabel}</span>
        </span>
      </div>

      {/* Time ranges or disabled message */}
      <div className="flex-1">
        {enabled ? (
          <div className="space-y-2">
            {ranges.map((range, index) => (
              <TimeRangeInput
                key={index}
                range={range}
                onChange={(newRange) => handleRangeChange(index, newRange)}
                onRemove={() => handleRemoveRange(index)}
                showRemove={ranges.length > 1}
              />
            ))}

            {canAddRange && (
              <button
                type="button"
                onClick={handleAddRange}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar horario</span>
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground pt-1.5">No disponible</p>
        )}
      </div>
    </div>
  );
}
