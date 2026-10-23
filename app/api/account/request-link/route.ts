import { checkRateLimit, getClientIp } from "@/src/lib/booking/rate-limit";
import { isValidEmail } from "@/src/lib/booking/validation";
import { loginTokenStore } from "@/src/lib/account/server";
import { issueLoginToken, normalizeEmail } from "@/src/lib/account/tokens";
import { sendSignInLinkEmail } from "@/src/lib/notifications/index";

// Force the full Node.js runtime (never edge) — required on cPanel/Passenger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 1 of passwordless sign-in: email a single-use link.
 *
 * Answers identically whether or not the address has an account — it never
 * looks one up. The customer record is only created once a link is used
 * (/api/account/verify), so this route can't be used to enumerate customers,
 * and typing a stranger's address only sends them an email they can ignore.
 *
 * It does send email to an arbitrary address, which makes it the abuse vector
 * on this feature (inbox flooding, burning Resend quota / sender reputation):
 * rate-limited per IP and per address. Keys are prefixed so these buckets are
 * separate from the booking endpoint's.
 */
const IP_LIMIT_MAX = 5;
const IP_LIMIT_WINDOW_MS = 15 * 60_000; // 15 min
const EMAIL_LIMIT_MAX = 3;
const EMAIL_LIMIT_WINDOW_MS = 60 * 60_000; // 1 hr

const SENT = {
  success: true,
  message: "If that address can receive email, a sign-in link is on its way. It expires in 15 minutes.",
};

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`signin-ip:${ip}`, IP_LIMIT_MAX, IP_LIMIT_WINDOW_MS);
  if (!ipLimit.allowed) {
    return Response.json(
      { success: false, message: "Too many sign-in requests. Please try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } },
    );
  }

  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return Response.json({ success: false, message: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!email || email.length > 254 || !isValidEmail(email)) {
    return Response.json(
      { success: false, message: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const emailLimit = checkRateLimit(`signin-email:${email}`, EMAIL_LIMIT_MAX, EMAIL_LIMIT_WINDOW_MS);
  if (!emailLimit.allowed) {
    return Response.json(
      { success: false, message: "Too many sign-in requests for this email. Please try again later." },
      { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSeconds) } },
    );
  }

  try {
    const token = await issueLoginToken(loginTokenStore, email);
    // Not awaited: response time shouldn't depend on the mail provider, and
    // a send failure isn't something to report back differently anyway.
    sendSignInLinkEmail(email, token).catch((err) => {
      console.error("[account] Sign-in email failed:", err);
    });
  } catch (err) {
    console.error("[account] Could not issue sign-in link:", err);
    return Response.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json(SENT);
}
