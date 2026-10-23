import config from "@payload-config";
import { getPayload } from "payload";

import { checkPromoCode, normalizePromoCode } from "@/src/lib/booking/promo";
import { checkRateLimit, getClientIp } from "@/src/lib/booking/rate-limit";

// Force the full Node.js runtime (never edge) — required on cPanel/Passenger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Slows down guessing codes through this endpoint. Generous for a real
// customer fixing a typo or two, too low to work through a wordlist.
const IP_LIMIT_MAX = 10;
const IP_LIMIT_WINDOW_MS = 10 * 60_000; // 10 minutes

/**
 * Checks one promo code for the booking form's "Apply" button. Answers for a
 * single code only — the promo-codes collection itself is admin-read-only, so
 * the codes can't be listed through Payload's REST API.
 *
 * Display only: /api/book re-checks the code when the booking is submitted.
 */
export async function POST(request: Request) {
  const ipLimit = checkRateLimit(`promo-ip:${getClientIp(request)}`, IP_LIMIT_MAX, IP_LIMIT_WINDOW_MS);
  if (!ipLimit.allowed) {
    return Response.json(
      { valid: false, message: "Too many tries. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } },
    );
  }

  let body: { code?: unknown };

  try {
    body = (await request.json()) as { code?: unknown };
  } catch {
    return Response.json({ valid: false, message: "Invalid request." }, { status: 400 });
  }

  const code = normalizePromoCode(body.code);
  if (!code) {
    return Response.json({ valid: false, message: "Enter a promo code." }, { status: 400 });
  }

  try {
    const payload = await getPayload({ config });

    const found = await payload.find({
      collection: "promo-codes",
      where: { code: { equals: code } },
      limit: 1,
    });

    const result = checkPromoCode(found.docs[0], new Date());
    if (!result.valid) {
      return Response.json({ valid: false, reason: result.reason, message: result.message });
    }

    return Response.json({ valid: true, ...result.promo });
  } catch (err) {
    console.error("[promo] Unexpected error:", err);
    return Response.json(
      { valid: false, message: "Couldn't check that code right now. Please try again." },
      { status: 500 },
    );
  }
}
