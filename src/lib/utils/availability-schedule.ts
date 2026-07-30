import type { AvailabilitySchedule, DayOfWeek } from '@/lib/types/property';
import type { AvailabilityWindow } from '@/lib/api/agenda.service';

/**
 * Maps the weekly AvailabilitySchedule (per-day, multiple ranges) used by the
 * editor to/from the backend's flat PropertyAvailability windows. The backend
 * keys day-of-week as 0=Sunday … 6=Saturday.
 */

const DAY_TO_NUM: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const NUM_TO_DAY: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/** Default slot length (minutes) for agency-published availability. */
export const DEFAULT_SLOT_DURATION = 30;

/** All-days-disabled schedule to build on. */
function emptySchedule(): AvailabilitySchedule {
  return NUM_TO_DAY.reduce((acc, day) => {
    acc[day] = { enabled: false, ranges: [] };
    return acc;
  }, {} as AvailabilitySchedule);
}

export function scheduleToWindows(
  schedule: AvailabilitySchedule,
  slotDuration: number = DEFAULT_SLOT_DURATION,
): AvailabilityWindow[] {
  const windows: AvailabilityWindow[] = [];
  for (const day of Object.keys(DAY_TO_NUM) as DayOfWeek[]) {
    const dayAvail = schedule[day];
    if (!dayAvail?.enabled) continue;
    for (const range of dayAvail.ranges) {
      if (!range.start || !range.end || range.end <= range.start) continue;
      windows.push({
        dayOfWeek: DAY_TO_NUM[day],
        startTime: range.start,
        endTime: range.end,
        slotDuration,
      });
    }
  }
  return windows;
}

export function windowsToSchedule(
  windows: AvailabilityWindow[],
): AvailabilitySchedule {
  const schedule = emptySchedule();
  for (const w of windows) {
    const day = NUM_TO_DAY[w.dayOfWeek];
    if (!day) continue;
    schedule[day].enabled = true;
    schedule[day].ranges.push({ start: w.startTime, end: w.endTime });
  }
  return schedule;
}
