import type { ServiceSummary, AddonSummary, PriceSummary } from "./types";
import { timeToMinutes } from "./slots";

const EVENING_SURCHARGE_START_MINUTES = 20 * 60; // 20:00 = 1200 minutes
const EVENING_SURCHARGE_AMOUNT = 10;

export function calculatePrice(
  service: ServiceSummary,
  selectedAddons: AddonSummary[],
  startTimeHHMM: string // e.g. "20:00" — surcharge applies if >= 20:00
): PriceSummary {
  const basePrice = service.price;
  const addonsPrice = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);

  const startMinutes = timeToMinutes(startTimeHHMM);
  const hasEveningSurcharge = startMinutes >= EVENING_SURCHARGE_START_MINUTES;
  const eveningSurcharge = hasEveningSurcharge ? EVENING_SURCHARGE_AMOUNT : 0;

  const total = basePrice + addonsPrice + eveningSurcharge;

  return {
    basePrice,
    addonsPrice,
    eveningSurcharge,
    total,
    hasEveningSurcharge,
  };
}
