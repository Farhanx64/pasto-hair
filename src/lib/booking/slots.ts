import type { SlotGenerationInput, WeeklyAvailability } from "./types";
import { slotOverlapsBusy } from "./conflicts";

const SLOT_INTERVAL = 15; // minutes
const TIMEZONE = "America/New_York";

// NY-local calendar date + minutes-since-midnight for a given instant.
function nyNowParts(now: Date): { dateStr: string; minutes: number } {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  // en-CA renders as "YYYY-MM-DD, HH:mm"
  const [dateStr, timePart] = formatted.split(", ");
  const [h, m] = timePart.split(":").map(Number);
  // hour12:false renders midnight as 24 on some ICU builds
  return { dateStr, minutes: (h % 24) * 60 + m };
}

// Shift a "YYYY-MM-DD" by whole calendar days (UTC math, so DST can't skew it).
export function addDays(dateStr: string, days: number): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const base = new Date(Date.UTC(y, mo - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

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
  const {
    dateStr,
    totalDurationMinutes,
    weeklyAvailability,
    blockedDates,
    busyBlocks,
    now,
    minLeadTimeMinutes,
    maxBookingWindowDays,
  } = input;

  // 1. Return [] if dateStr is in blockedDates
  if (blockedDates.includes(dateStr)) {
    return [];
  }

  // 2. Enforce lead time + booking window (only when the caller supplies `now`).
  //    "YYYY-MM-DD" strings compare correctly lexicographically.
  let earliestDate: string | null = null;
  let earliestMinutes = 0;

  if (now) {
    const nyNow = nyNowParts(now);
    const leadTotal = nyNow.minutes + Math.max(0, minLeadTimeMinutes ?? 0);
    earliestDate = addDays(nyNow.dateStr, Math.floor(leadTotal / 1440));
    earliestMinutes = leadTotal % 1440;

    // Whole day is in the past, or before the lead-time cutoff
    if (dateStr < earliestDate) {
      return [];
    }

    if (typeof maxBookingWindowDays === "number" && maxBookingWindowDays >= 0) {
      if (dateStr > addDays(nyNow.dateStr, maxBookingWindowDays)) {
        return [];
      }
    }
  }

  // 3. Get day name and check if enabled
  const dayName = getDayName(dateStr);
  const dayAvailability = weeklyAvailability[dayName];

  if (!dayAvailability.enabled) {
    return [];
  }

  // 4. For each shift: generate slots at 15-min intervals where slotStart + totalDuration <= shiftEnd
  const slotSet = new Set<string>();

  for (const shift of dayAvailability.shifts) {
    const shiftStart = timeToMinutes(shift.start);
    const shiftEnd = timeToMinutes(shift.end);

    for (
      let slotStart = shiftStart;
      slotStart + totalDurationMinutes <= shiftEnd;
      slotStart += SLOT_INTERVAL
    ) {
      // 5. Drop slots earlier than the lead-time cutoff on the cutoff day
      if (earliestDate !== null && dateStr === earliestDate && slotStart < earliestMinutes) {
        continue;
      }

      // 6. Filter out slots overlapping busyBlocks
      if (!slotOverlapsBusy(slotStart, totalDurationMinutes, busyBlocks)) {
        slotSet.add(minutesToTime(slotStart));
      }
    }
  }

  // 7. Return deduplicated sorted array of "HH:MM" strings
  return Array.from(slotSet).sort();
}
