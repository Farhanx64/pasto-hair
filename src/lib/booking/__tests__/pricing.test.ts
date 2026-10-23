import { describe, it, expect } from "vitest";
import {
  calculatePrice,
  describeEveningTiers,
  eveningTierFor,
  normalizeEveningTiers,
} from "../pricing";
import type { ServiceSummary, AddonSummary } from "../types";

const baseService: ServiceSummary = {
  id: "svc-1",
  price: 50,
  durationMinutes: 60,
};

const addon1: AddonSummary = {
  id: "addon-1",
  price: 20,
  durationMinutes: 30,
};

const addon2: AddonSummary = {
  id: "addon-2",
  price: 15,
  durationMinutes: 15,
};

const freeAddon: AddonSummary = {
  id: "addon-free",
  price: 0,
  durationMinutes: 10,
};

describe("calculatePrice", () => {
  it("service only, no addons, daytime: correct total, no surcharge", () => {
    const result = calculatePrice(baseService, [], "10:00");

    expect(result.basePrice).toBe(50);
    expect(result.addonsPrice).toBe(0);
    expect(result.eveningSurcharge).toBe(0);
    expect(result.total).toBe(50);
    expect(result.hasEveningSurcharge).toBe(false);
  });

  it("service + addons: total = service + sum(addons)", () => {
    const result = calculatePrice(baseService, [addon1, addon2], "10:00");

    expect(result.basePrice).toBe(50);
    expect(result.addonsPrice).toBe(35); // 20 + 15
    expect(result.eveningSurcharge).toBe(0);
    expect(result.total).toBe(85); // 50 + 35
    expect(result.hasEveningSurcharge).toBe(false);
  });

  it("start time 20:00 → surcharge applies", () => {
    const result = calculatePrice(baseService, [], "20:00");

    expect(result.eveningSurcharge).toBe(10);
    expect(result.hasEveningSurcharge).toBe(true);
    expect(result.total).toBe(60); // 50 + 10
  });

  it("start time 19:59 → no surcharge", () => {
    const result = calculatePrice(baseService, [], "19:59");

    expect(result.eveningSurcharge).toBe(0);
    expect(result.hasEveningSurcharge).toBe(false);
    expect(result.total).toBe(50);
  });

  it("start time 21:00 → second tier applies ($20, not stacked)", () => {
    const result = calculatePrice(baseService, [], "21:00");

    expect(result.eveningSurcharge).toBe(20);
    expect(result.eveningSurchargeStart).toBe("21:00");
    expect(result.hasEveningSurcharge).toBe(true);
    expect(result.total).toBe(70);
  });

  it("start time 20:59 → still first tier", () => {
    const result = calculatePrice(baseService, [], "20:59");

    expect(result.eveningSurcharge).toBe(10);
    expect(result.eveningSurchargeStart).toBe("20:00");
  });

  it("zero-price addon does not change total", () => {
    const result = calculatePrice(baseService, [freeAddon], "10:00");

    expect(result.addonsPrice).toBe(0);
    expect(result.total).toBe(50);
  });

  it("service + addons + evening surcharge: total includes all three", () => {
    const result = calculatePrice(baseService, [addon1], "20:30");

    expect(result.basePrice).toBe(50);
    expect(result.addonsPrice).toBe(20);
    expect(result.eveningSurcharge).toBe(10);
    expect(result.total).toBe(80); // 50 + 20 + 10
    expect(result.hasEveningSurcharge).toBe(true);
  });

  it("midnight start (00:00) → no surcharge (before 20:00)", () => {
    const result = calculatePrice(baseService, [], "00:00");

    expect(result.hasEveningSurcharge).toBe(false);
    expect(result.eveningSurcharge).toBe(0);
  });

  it("exactly 20:00 boundary returns surcharge = 10", () => {
    const result = calculatePrice(baseService, [], "20:00");

    expect(result.eveningSurcharge).toBe(10);
  });
});

describe("multi-service discount", () => {
  const discount = { enabled: true, tier2Percent: 10, tier3Percent: 15 };

  const svc30: ServiceSummary = { id: "svc-30", price: 30, durationMinutes: 60 };
  const addon20: AddonSummary = { id: "addon-20", price: 20, durationMinutes: 30 };
  const addon20b: AddonSummary = { id: "addon-20b", price: 20, durationMinutes: 30 };

  it("1 service (no add-ons) → no discount", () => {
    const result = calculatePrice(svc30, [], "10:00", discount);

    expect(result.serviceCount).toBe(1);
    expect(result.discountPercent).toBe(0);
    expect(result.discountAmount).toBe(0);
    expect(result.total).toBe(30);
  });

  it("2 services (1 add-on) → 10% discount", () => {
    const result = calculatePrice(svc30, [addon20], "10:00", discount);

    expect(result.serviceCount).toBe(2);
    expect(result.discountPercent).toBe(10);
    expect(result.discountAmount).toBe(5); // 50 * 10% = 5
    expect(result.total).toBe(45); // 50 - 5
  });

  it("3 services (2 add-ons) → 15% discount with fractional rounding", () => {
    const result = calculatePrice(svc30, [addon20, addon20b], "10:00", discount);

    expect(result.serviceCount).toBe(3);
    expect(result.discountPercent).toBe(15);
    expect(result.discountAmount).toBe(10.5); // 70 * 15% = 10.5
    expect(result.total).toBe(59.5); // 70 - 10.5
  });

  it("discount is applied BEFORE the evening surcharge", () => {
    const result = calculatePrice(svc30, [addon20, addon20b], "20:00", discount);

    expect(result.serviceCount).toBe(3);
    expect(result.discountAmount).toBe(10.5);
    expect(result.eveningSurcharge).toBe(10);
    expect(result.total).toBe(69.5); // 70 - 10.5 + 10
  });

  it("enabled: false → no discount even with 3 services", () => {
    const result = calculatePrice(
      svc30,
      [addon20, addon20b],
      "10:00",
      { enabled: false, tier2Percent: 10, tier3Percent: 15 }
    );

    expect(result.serviceCount).toBe(3);
    expect(result.discountPercent).toBe(0);
    expect(result.discountAmount).toBe(0);
    expect(result.total).toBe(70);
  });

  it("omitted discount arg → no discount even with 3 services", () => {
    const result = calculatePrice(svc30, [addon20, addon20b], "10:00");

    expect(result.serviceCount).toBe(3);
    expect(result.discountPercent).toBe(0);
    expect(result.discountAmount).toBe(0);
    expect(result.total).toBe(70);
  });

  it("reports serviceCount correctly (1, 2, 3)", () => {
    expect(calculatePrice(svc30, [], "10:00", discount).serviceCount).toBe(1);
    expect(calculatePrice(svc30, [addon20], "10:00", discount).serviceCount).toBe(2);
    expect(
      calculatePrice(svc30, [addon20, addon20b], "10:00", discount).serviceCount
    ).toBe(3);
  });
});

describe("evening surcharge tiers from admin", () => {
  it("uses the tiers passed in rather than the defaults", () => {
    const tiers = [
      { start: "19:00", amount: 5 },
      { start: "22:00", amount: 30 },
    ];
    expect(calculatePrice(baseService, [], "18:59", undefined, tiers).eveningSurcharge).toBe(0);
    expect(calculatePrice(baseService, [], "19:30", undefined, tiers).eveningSurcharge).toBe(5);
    expect(calculatePrice(baseService, [], "22:15", undefined, tiers).eveningSurcharge).toBe(30);
  });

  it("empty tiers → no surcharge at any time", () => {
    const result = calculatePrice(baseService, [], "23:00", undefined, []);

    expect(result.hasEveningSurcharge).toBe(false);
    expect(result.eveningSurchargeStart).toBeNull();
    expect(result.total).toBe(50);
  });

  it("tiers entered out of order are sorted", () => {
    const tiers = [
      { start: "21:00", amount: 20 },
      { start: "20:00", amount: 10 },
    ];
    expect(eveningTierFor(tiers, "20:30")?.amount).toBe(10);
    expect(eveningTierFor(tiers, "21:30")?.amount).toBe(20);
  });

  it("normalize: missing field → defaults; malformed rows dropped", () => {
    expect(normalizeEveningTiers(undefined)).toEqual([
      { start: "20:00", amount: 10 },
      { start: "21:00", amount: 20 },
    ]);
    expect(
      normalizeEveningTiers([
        { start: "8pm", amount: 10 },
        { start: "21:00", amount: null },
        { start: "22:00", amount: 0 },
        { start: "23:00", amount: 25 },
      ])
    ).toEqual([{ start: "23:00", amount: 25 }]);
  });

  it("describe formats tiers for display", () => {
    expect(
      describeEveningTiers([
        { start: "20:00", amount: 10 },
        { start: "21:00", amount: 20 },
      ])
    ).toBe("+$10 from 8:00 PM, +$20 from 9:00 PM");
  });
});
