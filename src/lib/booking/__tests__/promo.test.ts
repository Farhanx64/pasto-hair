import { describe, it, expect } from "vitest";
import { checkPromoCode, describePromo, normalizePromoCode, type PromoCodeRecord } from "../promo";

const now = new Date("2026-10-22T15:00:00.000Z");

const base: PromoCodeRecord = {
  code: "SAVE10",
  type: "percent",
  value: 10,
  active: true,
  startsAt: null,
  expiresAt: null,
  maxUses: null,
  timesUsed: 0,
};

describe("normalizePromoCode", () => {
  it("trims and upper-cases", () => {
    expect(normalizePromoCode("  save10 ")).toBe("SAVE10");
  });

  it("non-strings → empty", () => {
    expect(normalizePromoCode(undefined)).toBe("");
    expect(normalizePromoCode(42)).toBe("");
  });
});

describe("checkPromoCode", () => {
  it("valid code → normalized promo", () => {
    expect(checkPromoCode({ ...base, code: "save10" }, now)).toEqual({
      valid: true,
      promo: { code: "SAVE10", type: "percent", value: 10 },
    });
  });

  it("no such code → unknown", () => {
    const result = checkPromoCode(null, now);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("unknown");
      expect(result.message).toMatch(/recognise/);
    }
  });

  it("unchecked active → inactive", () => {
    expect(checkPromoCode({ ...base, active: false }, now)).toMatchObject({ valid: false, reason: "inactive" });
  });

  it("zero value → inactive", () => {
    expect(checkPromoCode({ ...base, value: 0 }, now)).toMatchObject({ valid: false, reason: "inactive" });
  });

  it("before startsAt → not_started; at startsAt → valid", () => {
    expect(checkPromoCode({ ...base, startsAt: "2026-10-23T00:00:00.000Z" }, now)).toMatchObject({
      valid: false,
      reason: "not_started",
    });
    expect(checkPromoCode({ ...base, startsAt: now.toISOString() }, now).valid).toBe(true);
  });

  it("at/after expiresAt → expired; before → valid", () => {
    expect(checkPromoCode({ ...base, expiresAt: now.toISOString() }, now)).toMatchObject({
      valid: false,
      reason: "expired",
    });
    expect(checkPromoCode({ ...base, expiresAt: "2026-10-22T15:00:01.000Z" }, now).valid).toBe(true);
  });

  it("timesUsed reached maxUses → used_up", () => {
    expect(checkPromoCode({ ...base, maxUses: 3, timesUsed: 3 }, now)).toMatchObject({
      valid: false,
      reason: "used_up",
    });
    expect(checkPromoCode({ ...base, maxUses: 3, timesUsed: 2 }, now).valid).toBe(true);
  });

  it("no maxUses → unlimited", () => {
    expect(checkPromoCode({ ...base, maxUses: null, timesUsed: 9999 }, now).valid).toBe(true);
  });

  it("inactive wins over the other reasons", () => {
    expect(
      checkPromoCode({ ...base, active: false, expiresAt: "2020-01-01T00:00:00.000Z" }, now)
    ).toMatchObject({ reason: "inactive" });
  });
});

describe("describePromo", () => {
  it("formats percent and fixed", () => {
    expect(describePromo({ type: "percent", value: 15 })).toBe("15% off");
    expect(describePromo({ type: "fixed", value: 5 })).toBe("$5 off");
    expect(describePromo({ type: "fixed", value: 2.5 })).toBe("$2.50 off");
  });
});
