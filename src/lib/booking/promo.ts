// Promo code rules, shared by the validation endpoint (app/api/promo/route.ts)
// and the booking endpoint's re-check (app/api/book/route.ts). Pure so the
// rules can be unit-tested without Payload.

import type { AppliedPromo, PromoType } from "./types";

/** Codes are stored and matched trimmed + upper-case: " save10 " === "SAVE10". */
export function normalizePromoCode(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toUpperCase() : "";
}

// The subset of a promo-codes document the rules need. Payload hands back
// nullable fields, hence the `| null`s.
export interface PromoCodeRecord {
  code: string;
  type: PromoType;
  value: number;
  active?: boolean | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
  timesUsed?: number | null;
}

export type PromoInvalidReason = "unknown" | "inactive" | "not_started" | "expired" | "used_up";

export type PromoCheckResult =
  | { valid: true; promo: AppliedPromo }
  | { valid: false; reason: PromoInvalidReason; message: string };

const MESSAGES: Record<PromoInvalidReason, string> = {
  unknown: "We don't recognise that promo code.",
  inactive: "That promo code isn't active right now.",
  not_started: "That promo code isn't valid yet.",
  expired: "That promo code has expired.",
  used_up: "That promo code has reached its usage limit.",
};

function invalid(reason: PromoInvalidReason): PromoCheckResult {
  return { valid: false, reason, message: MESSAGES[reason] };
}

/** Is `record` (null = no such code) usable at `now`? */
export function checkPromoCode(record: PromoCodeRecord | null | undefined, now: Date): PromoCheckResult {
  if (!record) return invalid("unknown");
  if (!record.active) return invalid("inactive");

  // A code worth nothing is as good as switched off.
  if (!(typeof record.value === "number" && Number.isFinite(record.value) && record.value > 0)) {
    return invalid("inactive");
  }

  if (record.startsAt && now.getTime() < new Date(record.startsAt).getTime()) {
    return invalid("not_started");
  }
  if (record.expiresAt && now.getTime() >= new Date(record.expiresAt).getTime()) {
    return invalid("expired");
  }

  // maxUses empty/0 => unlimited.
  if (typeof record.maxUses === "number" && record.maxUses > 0 && (record.timesUsed ?? 0) >= record.maxUses) {
    return invalid("used_up");
  }

  return {
    valid: true,
    promo: { code: normalizePromoCode(record.code), type: record.type, value: record.value },
  };
}

/** "10% off" / "$5 off" */
export function describePromo(promo: Pick<AppliedPromo, "type" | "value">): string {
  if (promo.type === "percent") return `${promo.value}% off`;
  return `$${Number.isInteger(promo.value) ? promo.value : promo.value.toFixed(2)} off`;
}
