'use client';

import { X } from '@phosphor-icons/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TIME_OPTIONS, type TimeRange } from '@/lib/types/property';
import { cn } from '@/lib/utils';

interface TimeRangeInputProps {
  range: TimeRange;
  onChange: (range: TimeRange) => void;
  onRemove?: () => void;
  showRemove?: boolean;
  disabled?: boolean;
}

/**
 * Format time for display (e.g., "09:00" -> "9:00 AM")
 */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get valid end time options based on start time
 */
function getEndTimeOptions(startTime: string): string[] {
  const startIndex = TIME_OPTIONS.indexOf(startTime);
  if (startIndex === -1) return TIME_OPTIONS.slice(1);
  return TIME_OPTIONS.slice(startIndex + 1);
}

export function TimeRangeInput({
  range,
  onChange,
  onRemove,
  showRemove = false,
  disabled = false,
}: TimeRangeInputProps) {
  const endTimeOptions = getEndTimeOptions(range.start);

  const handleStartChange = (value: string) => {
    // If new start is >= current end, adjust end to next available slot
    const startIndex = TIME_OPTIONS.indexOf(value);
    const endIndex = TIME_OPTIONS.indexOf(range.end);

    if (startIndex >= endIndex) {
      const newEndIndex = Math.min(startIndex + 2, TIME_OPTIONS.length - 1);
      onChange({ start: value, end: TIME_OPTIONS[newEndIndex] });
    } else {
      onChange({ ...range, start: value });
    }
  };

  const handleEndChange = (value: string) => {
    onChange({ ...range, end: value });
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={range.start}
        onValueChange={handleStartChange}
        disabled={disabled}
      >
        <SelectTrigger className={cn(
          "w-[110px] h-9 text-sm",
          disabled && "opacity-50"
        )}>
          <SelectValue placeholder="Inicio" />
        </SelectTrigger>
        <SelectContent>
          {TIME_OPTIONS.slice(0, -1).map((time) => (
            <SelectItem key={time} value={time}>
              {formatTime(time)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-muted-foreground text-sm">-</span>

      <Select
        value={range.end}
        onValueChange={handleEndChange}
        disabled={disabled}
      >
        <SelectTrigger className={cn(
          "w-[110px] h-9 text-sm",
          disabled && "opacity-50"
        )}>
          <SelectValue placeholder="Fin" />
        </SelectTrigger>
        <SelectContent>
          {endTimeOptions.map((time) => (
            <SelectItem key={time} value={time}>
              {formatTime(time)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showRemove && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className={cn(
            "p-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
            disabled && "pointer-events-none opacity-50"
          )}
          aria-label="Eliminar rango horario"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
