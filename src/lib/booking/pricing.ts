import type { ServiceSummary, AddonSummary, PriceSummary } from "./types";
import { timeToMinutes } from "./slots";

const EVENING_SURCHARGE_START_MINUTES = 20 * 60; // 20:00 = 1200 minutes
const EVENING_SURCHARGE_AMOUNT = 10;

export interface DiscountConfig {
  enabled: boolean;
  tier2Percent: number; // applied when serviceCount === 2
  tier3Percent: number; // applied when serviceCount >= 3
}

// Coerce a tier percentage to a safe, non-negative number (missing/NaN/negative => 0).
function safePercent(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

export function calculatePrice(
  service: ServiceSummary,
  selectedAddons: AddonSummary[],
  startTimeHHMM: string, // e.g. "20:00" — surcharge applies if >= 20:00
  discount?: DiscountConfig // omitted or {enabled:false} => no discount
): PriceSummary {
  const basePrice = service.price;
  const addonsPrice = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
  const subtotal = basePrice + addonsPrice;

  const serviceCount = 1 + selectedAddons.length;

  let discountPercent = 0;
  if (discount?.enabled) {
    if (serviceCount >= 3) {
      discountPercent = safePercent(discount.tier3Percent);
    } else if (serviceCount === 2) {
      discountPercent = safePercent(discount.tier2Percent);
    }
  }
  const discountAmount = Math.round(subtotal * discountPercent) / 100; // 2-decimal money rounding

  const startMinutes = timeToMinutes(startTimeHHMM);
  const hasEveningSurcharge = startMinutes >= EVENING_SURCHARGE_START_MINUTES;
  const eveningSurcharge = hasEveningSurcharge ? EVENING_SURCHARGE_AMOUNT : 0;

  const total = basePrice + addonsPrice - discountAmount + eveningSurcharge;

  return {
    basePrice,
    addonsPrice,
    eveningSurcharge,
    total,
    hasEveningSurcharge,
    serviceCount,
    discountPercent,
    discountAmount,
  };
}
