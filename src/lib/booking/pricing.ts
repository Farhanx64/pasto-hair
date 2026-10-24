import type {
  ServiceSummary,
  AddonSummary,
  PriceSummary,
  EveningSurchargeTier,
  AppliedPromo,
} from "./types";

// Fallback when the booking-settings global has no tiers field at all (e.g. before
// the migration has run). An empty array from the admin means "no evening surcharge".
export const DEFAULT_EVENING_SURCHARGE_TIERS: EveningSurchargeTier[] = [
  { start: "20:00", amount: 10 },
  { start: "21:00", amount: 20 },
];

const roundCents = (n: number) => Math.round(n * 100) / 100;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function hhmmToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Sanitize tiers read from the admin: drop malformed rows, sort by start time.
// null/undefined (field missing) => defaults; [] => no surcharge.
export function normalizeEveningTiers(
  tiers: { start?: string | null; amount?: number | null }[] | null | undefined
): EveningSurchargeTier[] {
  if (!Array.isArray(tiers)) return DEFAULT_EVENING_SURCHARGE_TIERS;
  return tiers
    .filter(
      (t): t is EveningSurchargeTier =>
        typeof t?.start === "string" &&
        HHMM.test(t.start) &&
        typeof t.amount === "number" &&
        Number.isFinite(t.amount) &&
        t.amount > 0
    )
    .map((t) => ({ start: t.start, amount: t.amount }))
    .sort((a, b) => hhmmToMinutes(a.start) - hhmmToMinutes(b.start));
}

// The latest tier the start time falls into. Tiers don't stack: a 21:30 booking
// with tiers 20:00/$10 and 21:00/$20 pays $20, not $30.
export function eveningTierFor(
  tiers: EveningSurchargeTier[],
  startTimeHHMM: string
): EveningSurchargeTier | null {
  if (!HHMM.test(startTimeHHMM)) return null;
  const startMinutes = hhmmToMinutes(startTimeHHMM);
  let match: EveningSurchargeTier | null = null;
  for (const tier of normalizeEveningTiers(tiers)) {
    if (startMinutes >= hhmmToMinutes(tier.start)) match = tier;
  }
  return match;
}

export const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
// Mon-first, for reading back to customers ("Fri, Sat & Sun").
const WEEK_ORDER: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export interface WeekendSurcharge {
  days: Weekday[];
  multiplier: number; // 2 => every evening tier costs double on these days
}

// Fallback when the booking-settings global has no weekend fields (before the migration).
export const DEFAULT_WEEKEND_SURCHARGE: WeekendSurcharge = {
  days: ["fri", "sat", "sun"],
  multiplier: 2,
};

// Sanitize the admin's weekend settings. Missing fields => defaults; no days
// or a multiplier of 1 => weekends cost the same as weekdays.
export function normalizeWeekendSurcharge(
  days: readonly (string | null | undefined)[] | null | undefined,
  multiplier: number | null | undefined
): WeekendSurcharge {
  return {
    days: Array.isArray(days)
      ? WEEK_ORDER.filter((d) => days.includes(d))
      : DEFAULT_WEEKEND_SURCHARGE.days,
    multiplier:
      typeof multiplier === "number" && Number.isFinite(multiplier) && multiplier >= 1
        ? multiplier
        : DEFAULT_WEEKEND_SURCHARGE.multiplier,
  };
}

/** "2026-10-24" -> "sat". The date is already the shop's local calendar date. */
export function weekdayOf(dateYYYYMMDD: string): Weekday | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYYYYMMDD);
  if (!m) return null;
  return WEEKDAYS[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()];
}

// The evening tiers that apply on a given date: on weekend days every tier's
// amount is multiplied (20:00/$10 + 21:00/$20 => $20 / $40 at 2x).
export function eveningTiersForDate(
  tiers: EveningSurchargeTier[],
  dateYYYYMMDD: string,
  weekend: WeekendSurcharge = DEFAULT_WEEKEND_SURCHARGE
): EveningSurchargeTier[] {
  const day = weekdayOf(dateYYYYMMDD);
  if (!day || !weekend.days.includes(day) || weekend.multiplier === 1) return tiers;
  return tiers.map((t) => ({ start: t.start, amount: roundCents(t.amount * weekend.multiplier) }));
}

const DAY_LABELS: Record<Weekday, string> = {
  sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat",
};

/** "Fri, Sat & Sun: +$20 from 8:00 PM, +$40 from 9:00 PM" ("" when there's no weekend rate) */
export function describeWeekendSurcharge(
  tiers: EveningSurchargeTier[],
  weekend: WeekendSurcharge
): string {
  const normalized = normalizeEveningTiers(tiers);
  if (weekend.days.length === 0 || weekend.multiplier === 1 || normalized.length === 0) return "";
  const labels = weekend.days.map((d) => DAY_LABELS[d]);
  const days = labels.length > 1 ? `${labels.slice(0, -1).join(", ")} & ${labels.at(-1)}` : labels[0];
  const boosted = normalized.map((t) => ({ start: t.start, amount: roundCents(t.amount * weekend.multiplier) }));
  return `${days}: ${describeEveningTiers(boosted)}`;
}

/** "20:00" -> "8:00 PM" */
export function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

/** "+$10 from 8:00 PM, +$20 from 9:00 PM" */
export function describeEveningTiers(tiers: EveningSurchargeTier[]): string {
  return normalizeEveningTiers(tiers)
    .map((t) => `+$${t.amount} from ${formatTime12(t.start)}`)
    .join(", ");
}

export interface DiscountConfig {
  enabled: boolean;
  tier2Percent: number; // applied when serviceCount === 2
  tier3Percent: number; // applied when serviceCount >= 3
}

// Coerce a tier percentage to a safe, non-negative number (missing/NaN/negative => 0).
function safePercent(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

// Dollars a promo takes off `servicesAmount` (the services subtotal after the
// multi-service discount — never the evening surcharge). Capped so the services
// portion can't go below $0. Shared with the booking form's live receipt.
export function promoDiscountFor(servicesAmount: number, promo?: AppliedPromo | null): number {
  if (!promo || !(servicesAmount > 0)) return 0;
  const value = typeof promo.value === "number" && Number.isFinite(promo.value) && promo.value > 0
    ? promo.value
    : 0;
  const raw = promo.type === "percent"
    ? Math.round(servicesAmount * value) / 100 // same 2-decimal rounding as the multi-service discount
    : roundCents(value);
  return Math.min(raw, roundCents(servicesAmount));
}

export function calculatePrice(
  service: ServiceSummary,
  selectedAddons: AddonSummary[],
  startTimeHHMM: string, // e.g. "20:00"
  discount?: DiscountConfig, // omitted or {enabled:false} => no discount
  eveningTiers: EveningSurchargeTier[] = DEFAULT_EVENING_SURCHARGE_TIERS,
  promo?: AppliedPromo | null // already validated; stacks after the multi-service discount
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

  const eveningTier = eveningTierFor(eveningTiers, startTimeHHMM);
  const hasEveningSurcharge = eveningTier !== null;
  const eveningSurcharge = eveningTier?.amount ?? 0;

  // Promo applies to what's left of the services after the multi-service discount.
  const promoDiscountAmount = promoDiscountFor(roundCents(subtotal - discountAmount), promo);

  const total = roundCents(
    basePrice + addonsPrice - discountAmount - promoDiscountAmount + eveningSurcharge
  );

  return {
    basePrice,
    addonsPrice,
    eveningSurcharge,
    eveningSurchargeStart: eveningTier?.start ?? null,
    total,
    hasEveningSurcharge,
    serviceCount,
    discountPercent,
    discountAmount,
    promoCode: promo?.code ?? null,
    promoDiscountAmount,
  };
}
