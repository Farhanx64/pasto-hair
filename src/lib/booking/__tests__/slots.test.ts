import { describe, it, expect } from "vitest";
import { generateSlots, timeToMinutes, minutesToTime, getDayName } from "../slots";
import type { WeeklyAvailability, BusyBlock } from "../types";

// Helper: build a WeeklyAvailability where every day is disabled except overrides
function makeWeeklyAvailability(
  overrides: Partial<WeeklyAvailability>
): WeeklyAvailability {
  const disabledDay = { enabled: false, shifts: [] };
  return {
    sunday: disabledDay,
    monday: disabledDay,
    tuesday: disabledDay,
    wednesday: disabledDay,
    thursday: disabledDay,
    friday: disabledDay,
    saturday: disabledDay,
    ...overrides,
  };
}

describe("timeToMinutes", () => {
  it("converts 00:00 to 0", () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });

  it("converts 12:00 to 720", () => {
    expect(timeToMinutes("12:00")).toBe(720);
  });

  it("converts 20:00 to 1200", () => {
    expect(timeToMinutes("20:00")).toBe(1200);
  });

  it("converts 23:59 to 1439", () => {
    expect(timeToMinutes("23:59")).toBe(1439);
  });
});

describe("minutesToTime", () => {
  it("converts 0 to 00:00", () => {
    expect(minutesToTime(0)).toBe("00:00");
  });

  it("converts 720 to 12:00", () => {
    expect(minutesToTime(720)).toBe("12:00");
  });

  it("converts 1200 to 20:00", () => {
    expect(minutesToTime(1200)).toBe("20:00");
  });

  it("converts 1439 to 23:59", () => {
    expect(minutesToTime(1439)).toBe("23:59");
  });
});

describe("getDayName", () => {
  // 2024-01-07 is a Sunday
  it("returns sunday for 2024-01-07", () => {
    expect(getDayName("2024-01-07")).toBe("sunday");
  });

  // 2024-01-08 is a Monday
  it("returns monday for 2024-01-08", () => {
    expect(getDayName("2024-01-08")).toBe("monday");
  });

  // 2024-01-13 is a Saturday
  it("returns saturday for 2024-01-13", () => {
    expect(getDayName("2024-01-13")).toBe("saturday");
  });
});

describe("generateSlots", () => {
  // 2024-06-03 is a Monday
  const MONDAY = "2024-06-03";
  // 2024-06-01 is a Saturday
  const SATURDAY = "2024-06-01";

  it("generates correct slots for a single shift with 45-min service", () => {
    // 12:00-14:00 with 45min → 12:00, 12:15, 12:30, 12:45 (but NOT 13:00 since 13:00+45=13:45 <= 14:00? yes)
    // 12:00 + 45 = 12:45 <=14:00 ✓
    // 12:15 + 45 = 13:00 <=14:00 ✓
    // 12:30 + 45 = 13:15 <=14:00 ✓
    // 12:45 + 45 = 13:30 <=14:00 ✓
    // 13:00 + 45 = 13:45 <=14:00 ✓
    // 13:15 + 45 = 14:00 <=14:00 ✓ (boundary included)
    // 13:30 + 45 = 14:15 > 14:00 ✗
    const slots = generateSlots({
      dateStr: MONDAY,
      totalDurationMinutes: 45,
      weeklyAvailability: makeWeeklyAvailability({
        monday: { enabled: true, shifts: [{ start: "12:00", end: "14:00" }] },
      }),
      blockedDates: [],
      busyBlocks: [],
    });

    expect(slots).toEqual(["12:00", "12:15", "12:30", "12:45", "13:00", "13:15"]);
  });

  it("includes slot that exactly fits at shift end (end boundary)", () => {
    // 13:15 + 45 = 14:00 = shiftEnd → should be included
    const slots = generateSlots({
      dateStr: MONDAY,
      totalDurationMinutes: 45,
      weeklyAvailability: makeWeeklyAvailability({
        monday: { enabled: true, shifts: [{ start: "13:15", end: "14:00" }] },
      }),
      blockedDates: [],
      busyBlocks: [],
    });

    expect(slots).toEqual(["13:15"]);
  });

  it("excludes slot one step past end boundary", () => {
    // Only 13:15 fits (13:15+45=14:00), 13:30+45=14:15 > 14:00
    const slots = generateSlots({
      dateStr: MONDAY,
      totalDurationMinutes: 45,
      weeklyAvailability: makeWeeklyAvailability({
        monday: { enabled: true, shifts: [{ start: "13:15", end: "14:00" }] },
      }),
      blockedDates: [],
      busyBlocks: [],
    });

    expect(slots).not.toContain("13:30");
  });

  it("returns [] for a disabled day", () => {
    const slots = generateSlots({
      dateStr: MONDAY,
      totalDurationMinutes: 30,
      weeklyAvailability: makeWeeklyAvailability({
        monday: { enabled: false, shifts: [{ start: "09:00", end: "17:00" }] },
      }),
      blockedDates: [],
      busyBlocks: [],
    });

    expect(slots).toEqual([]);
  });

  it("returns [] for a blocked date", () => {
    const slots = generateSlots({
      dateStr: MONDAY,
      totalDurationMinutes: 30,
      weeklyAvailability: makeWeeklyAvailability({
        monday: { enabled: true, shifts: [{ start: "09:00", end: "17:00" }] },
      }),
      blockedDates: [MONDAY],
      busyBlocks: [],
    });

    expect(slots).toEqual([]);
  });

  it("generates slots from both shifts on a multi-shift day", () => {
    // morning: 09:00-10:00 (30min service → 09:00, 09:15, 09:30)
    // afternoon: 14:00-15:00 → 14:00, 14:15, 14:30
    const slots = generateSlots({
      dateStr: MONDAY,
      totalDurationMinutes: 30,
      weeklyAvailability: makeWeeklyAvailability({
        monday: {
          enabled: true,
          shifts: [
            { start: "09:00", end: "10:00" },
            { start: "14:00", end: "15:00" },
          ],
        },
      }),
      blockedDates: [],
      busyBlocks: [],
    });

    expect(slots).toContain("09:00");
    expect(slots).toContain("09:15");
    expect(slots).toContain("09:30");
    expect(slots).toContain("14:00");
    expect(slots).toContain("14:15");
    expect(slots).toContain("14:30");
    // Should not include times between shifts
    expect(slots).not.toContain("10:30");
    expect(slots).not.toContain("12:00");
  });

  it("generates correct slots for an evening shift (20:00-23:59, 60min service)", () => {
    // Slots at 15-min intervals from 20:00: 1200, 1215, 1230, ...
    // slotStart + 60 <= 1439: slotStart <= 1379
    // Last 15-min-aligned slot from 20:00 that fits: 1365 (22:45) since 1365+60=1425<=1439
    // 1380 (23:00) + 60 = 1440 > 1439, so NOT included
    const slots = generateSlots({
      dateStr: SATURDAY,
      totalDurationMinutes: 60,
      weeklyAvailability: makeWeeklyAvailability({
        saturday: { enabled: true, shifts: [{ start: "20:00", end: "23:59" }] },
      }),
      blockedDates: [],
      busyBlocks: [],
    });

    expect(slots).toContain("20:00");
    expect(slots).toContain("22:45"); // last valid 15-min-aligned slot (22:45+60=23:45<=23:59)
    expect(slots[0]).toBe("20:00");
    // 23:00 + 60 = 24:00 > 23:59 → NOT included
    expect(slots).not.toContain("23:00");
    expect(slots[slots.length - 1]).toBe("22:45");
  });

  it("removes slot fully inside a busy block", () => {
    // shift 09:00-12:00, 30min service
    // busy: 10:00-11:00 → slots 10:00, 10:15, 10:30 removed (10:30+30=11:00, slotEnd > busyStart=10:00 ✓ && slotStart<busyEnd=11:00 ✓)
    const busyBlocks: BusyBlock[] = [{ start: "10:00", end: "11:00" }];
    const slots = generateSlots({
      dateStr: MONDAY,
      totalDurationMinutes: 30,
      weeklyAvailability: makeWeeklyAvailability({
        monday: { enabled: true, shifts: [{ start: "09:00", end: "12:00" }] },
      }),
      blockedDates: [],
      busyBlocks,
    });

    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:15");
    expect(slots).not.toContain("10:30");
    // Slots before and after should be there
    expect(slots).toContain("09:00");
    expect(slots).toContain("11:00");
  });

  it("keeps slot where slotEnd === busyStart (exact boundary - allowed)", () => {
    // slot 09:30 + 30min = 10:00 = busyStart → allowed (slotEnd > busyStart is false since 10:00 == 10:00, not strictly greater)
    const busyBlocks: BusyBlock[] = [{ start: "10:00", end: "11:00" }];
    const slots = generateSlots({
      dateStr: MONDAY,
      totalDurationMinutes: 30,
      weeklyAvailability: makeWeeklyAvailability({
        monday: { enabled: true, shifts: [{ start: "09:00", end: "12:00" }] },
      }),
      blockedDates: [],
      busyBlocks,
    });

    // 09:30 + 30 = 10:00 === busyStart → kept
    expect(slots).toContain("09:30");
  });

  it("keeps slot where slotStart === busyEnd (exact boundary - allowed)", () => {
    // slot at 11:00 = busyEnd → allowed (slotStart < busyEnd is false since 11:00 == 11:00)
    const busyBlocks: BusyBlock[] = [{ start: "10:00", end: "11:00" }];
    const slots = generateSlots({
      dateStr: MONDAY,
      totalDurationMinutes: 30,
      weeklyAvailability: makeWeeklyAvailability({
        monday: { enabled: true, shifts: [{ start: "09:00", end: "12:00" }] },
      }),
      blockedDates: [],
      busyBlocks,
    });

    // slotStart=11:00 === busyEnd → kept
    expect(slots).toContain("11:00");
  });

  it("removes slot with partial overlap (starts before busy, ends inside)", () => {
    // slot 09:45 + 30min = 10:15, busy 10:00-11:00 → 09:45 < 11:00 && 10:15 > 10:00 → overlap
    const busyBlocks: BusyBlock[] = [{ start: "10:00", end: "11:00" }];
    const slots = generateSlots({
      dateStr: MONDAY,
      totalDurationMinutes: 30,
      weeklyAvailability: makeWeeklyAvailability({
        monday: { enabled: true, shifts: [{ start: "09:00", end: "12:00" }] },
      }),
      blockedDates: [],
      busyBlocks,
    });

    expect(slots).not.toContain("09:45");
  });

  it("returns slots sorted in ascending order", () => {
    const slots = generateSlots({
      dateStr: MONDAY,
      totalDurationMinutes: 15,
      weeklyAvailability: makeWeeklyAvailability({
        monday: { enabled: true, shifts: [{ start: "09:00", end: "10:00" }] },
      }),
      blockedDates: [],
      busyBlocks: [],
    });

    const sorted = [...slots].sort();
    expect(slots).toEqual(sorted);
  });

  it("deduplicates slots from overlapping shifts", () => {
    // Two shifts that produce the same slots
    const slots = generateSlots({
      dateStr: MONDAY,
      totalDurationMinutes: 30,
      weeklyAvailability: makeWeeklyAvailability({
        monday: {
          enabled: true,
          shifts: [
            { start: "09:00", end: "10:00" },
            { start: "09:00", end: "10:00" },
          ],
        },
      }),
      blockedDates: [],
      busyBlocks: [],
    });

    // No duplicate times
    const unique = [...new Set(slots)];
    expect(slots).toEqual(unique);
  });
});
