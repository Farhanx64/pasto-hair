import { describe, it, expect } from "vitest";
import { calculatePrice } from "../pricing";
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

  it("start time 21:00 → surcharge applies", () => {
    const result = calculatePrice(baseService, [], "21:00");

    expect(result.eveningSurcharge).toBe(10);
    expect(result.hasEveningSurcharge).toBe(true);
    expect(result.total).toBe(60);
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
