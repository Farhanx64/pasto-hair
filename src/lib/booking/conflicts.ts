import type { BusyBlock } from "./types";
import { timeToMinutes } from "./slots";

// Returns true if [slotStart, slotStart+duration) overlaps any busy block
// Exact boundary is ALLOWED: slot ending at busyStart is OK, slot starting at busyEnd is OK
export function slotOverlapsBusy(
  slotStartMinutes: number,
  durationMinutes: number,
  busyBlocks: BusyBlock[]
): boolean {
  const slotEnd = slotStartMinutes + durationMinutes;

  for (const block of busyBlocks) {
    const busyStart = timeToMinutes(block.start);
    const busyEnd = timeToMinutes(block.end);

    // Overlap condition: slotStart < busyEnd && slotEnd > busyStart
    // Exact boundary is allowed (strict inequalities)
    if (slotStartMinutes < busyEnd && slotEnd > busyStart) {
      return true;
    }
  }

  return false;
}

// Filter a list of "HH:MM" slots by removing any that overlap busy blocks
export function filterBusySlots(
  slots: string[],
  durationMinutes: number,
  busyBlocks: BusyBlock[]
): string[] {
  return slots.filter((slot) => {
    const slotStartMinutes = timeToMinutes(slot);
    return !slotOverlapsBusy(slotStartMinutes, durationMinutes, busyBlocks);
  });
}
