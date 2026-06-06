import { describe, it, expect } from "vitest";
import { slotOverlapsBusy, filterBusySlots } from "../conflicts";
import type { BusyBlock } from "../types";

describe("slotOverlapsBusy", () => {
  it("returns false when there are no busy blocks", () => {
    expect(slotOverlapsBusy(600, 30, [])).toBe(false);
  });

  it("returns false when slot does not overlap any busy block", () => {
    // slot 09:00-09:30, busy 10:00-11:00
    const busy: BusyBlock[] = [{ start: "10:00", end: "11:00" }];
    expect(slotOverlapsBusy(540, 30, busy)).toBe(false);
  });

  it("returns true when slot is fully inside busy block", () => {
    // slot 10:15-10:45, busy 10:00-11:00
    const busy: BusyBlock[] = [{ start: "10:00", end: "11:00" }];
    expect(slotOverlapsBusy(615, 30, busy)).toBe(true);
  });

  it("returns true when busy block is fully inside slot", () => {
    // slot 09:00-12:00 (180min), busy 10:00-11:00
    const busy: BusyBlock[] = [{ start: "10:00", end: "11:00" }];
    expect(slotOverlapsBusy(540, 180, busy)).toBe(true);
  });

  it("returns true when slot starts before busy and ends inside (partial overlap)", () => {
    // slot 09:45-10:15, busy 10:00-11:00 → slotStart(585) < busyEnd(660) && slotEnd(615) > busyStart(600)
    const busy: BusyBlock[] = [{ start: "10:00", end: "11:00" }];
    expect(slotOverlapsBusy(585, 30, busy)).toBe(true);
  });

  it("returns true when slot starts inside busy and ends after (partial overlap)", () => {
    // slot 10:30-11:30, busy 10:00-11:00 → slotStart(630) < busyEnd(660) && slotEnd(690) > busyStart(600)
    const busy: BusyBlock[] = [{ start: "10:00", end: "11:00" }];
    expect(slotOverlapsBusy(630, 60, busy)).toBe(true);
  });

  it("returns false when slotEnd === busyStart (exact boundary - allowed)", () => {
    // slot 09:30-10:00, busy 10:00-11:00 → slotEnd(600) NOT > busyStart(600)
    const busy: BusyBlock[] = [{ start: "10:00", end: "11:00" }];
    expect(slotOverlapsBusy(570, 30, busy)).toBe(false);
  });

  it("returns false when slotStart === busyEnd (exact boundary - allowed)", () => {
    // slot 11:00-11:30, busy 10:00-11:00 → slotStart(660) NOT < busyEnd(660)
    const busy: BusyBlock[] = [{ start: "10:00", end: "11:00" }];
    expect(slotOverlapsBusy(660, 30, busy)).toBe(false);
  });

  it("returns true when slot overlaps the second of multiple busy blocks", () => {
    const busy: BusyBlock[] = [
      { start: "08:00", end: "09:00" },
      { start: "10:00", end: "11:00" },
    ];
    // slot 10:30-11:00 overlaps second block
    expect(slotOverlapsBusy(630, 30, busy)).toBe(true);
  });

  it("returns true when slot overlaps the first of multiple busy blocks", () => {
    const busy: BusyBlock[] = [
      { start: "08:00", end: "09:00" },
      { start: "10:00", end: "11:00" },
    ];
    // slot 08:30-09:30 overlaps first block (08:30+60=09:30, busyStart=480, busyEnd=540)
    // slotStart=510 < busyEnd=540 && slotEnd=570 > busyStart=480
    expect(slotOverlapsBusy(510, 60, busy)).toBe(true);
  });

  it("returns false when slot fits between two busy blocks", () => {
    const busy: BusyBlock[] = [
      { start: "08:00", end: "09:00" },
      { start: "10:00", end: "11:00" },
    ];
    // slot 09:00-10:00 → slotEnd(600) === busyStart2(600) → NOT > (ok); slotStart(540) === busyEnd1(540) → NOT < (ok)
    expect(slotOverlapsBusy(540, 60, busy)).toBe(false);
  });
});

describe("filterBusySlots", () => {
  it("returns all slots when no busy blocks", () => {
    const slots = ["09:00", "09:15", "09:30"];
    expect(filterBusySlots(slots, 30, [])).toEqual(["09:00", "09:15", "09:30"]);
  });

  it("removes slots overlapping a busy block and keeps others", () => {
    // busy 10:00-11:00, duration 30
    // 09:30 + 30 = 10:00 = busyStart → kept (exact boundary)
    // 09:45 + 30 = 10:15 → overlaps → removed
    // 10:00 → inside busy → removed
    // 10:30 → inside busy → removed
    // 11:00 = busyEnd → kept (exact boundary)
    const busy: BusyBlock[] = [{ start: "10:00", end: "11:00" }];
    const slots = ["09:00", "09:30", "09:45", "10:00", "10:30", "11:00", "11:30"];
    const result = filterBusySlots(slots, 30, busy);

    expect(result).toContain("09:00");
    expect(result).toContain("09:30");
    expect(result).not.toContain("09:45");
    expect(result).not.toContain("10:00");
    expect(result).not.toContain("10:30");
    expect(result).toContain("11:00");
    expect(result).toContain("11:30");
  });

  it("returns empty array when all slots are filtered out", () => {
    const busy: BusyBlock[] = [{ start: "09:00", end: "12:00" }];
    const slots = ["09:00", "09:15", "09:30", "10:00", "11:00"];
    const result = filterBusySlots(slots, 60, busy);

    expect(result).toEqual([]);
  });

  it("preserves order of non-overlapping slots", () => {
    const busy: BusyBlock[] = [{ start: "10:00", end: "10:30" }];
    const slots = ["09:00", "09:15", "10:00", "10:30", "11:00"];
    const result = filterBusySlots(slots, 15, busy);

    // 09:00+15=09:15 ok, 09:15+15=09:30 ok, 10:00 inside busy (10:00<10:30 && 10:15>10:00) removed,
    // 10:30 = busyEnd → kept, 11:00 ok
    expect(result).toEqual(["09:00", "09:15", "10:30", "11:00"]);
  });
});
