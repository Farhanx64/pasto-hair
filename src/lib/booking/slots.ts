import type { SlotGenerationInput, WeeklyAvailability } from "./types";
import { slotOverlapsBusy } from "./conflicts";

const SLOT_INTERVAL = 15; // minutes

// Convert "HH:MM" to minutes since midnight
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Convert minutes since midnight to "HH:MM"
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Get day name from YYYY-MM-DD string
// Uses T12:00:00 to avoid UTC midnight edge case
export function getDayName(dateStr: string): keyof WeeklyAvailability {
  const date = new Date(dateStr + "T12:00:00");
  const days: (keyof WeeklyAvailability)[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[date.getDay()];
}

// Generate all valid slots
export function generateSlots(input: SlotGenerationInput): string[] {
  const { dateStr, totalDurationMinutes, weeklyAvailability, blockedDates, busyBlocks } = input;

  // 1. Return [] if dateStr is in blockedDates
  if (blockedDates.includes(dateStr)) {
    return [];
  }

  // 2. Get day name and check if enabled
  const dayName = getDayName(dateStr);
  const dayAvailability = weeklyAvailability[dayName];

  if (!dayAvailability.enabled) {
    return [];
  }

  // 3. For each shift: generate slots at 15-min intervals where slotStart + totalDuration <= shiftEnd
  const slotSet = new Set<string>();

  for (const shift of dayAvailability.shifts) {
    const shiftStart = timeToMinutes(shift.start);
    const shiftEnd = timeToMinutes(shift.end);

    for (
      let slotStart = shiftStart;
      slotStart + totalDurationMinutes <= shiftEnd;
      slotStart += SLOT_INTERVAL
    ) {
      // 4. Filter out slots overlapping busyBlocks
      if (!slotOverlapsBusy(slotStart, totalDurationMinutes, busyBlocks)) {
        slotSet.add(minutesToTime(slotStart));
      }
    }
  }

  // 5. Return deduplicated sorted array of "HH:MM" strings
  return Array.from(slotSet).sort();
}
