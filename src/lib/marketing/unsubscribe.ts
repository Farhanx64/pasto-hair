/**
 * Signed unsubscribe links for promo emails.
 *
 * The link carries the email (base64url) and an HMAC of it keyed with
 * PAYLOAD_SECRET, so nobody can unsubscribe someone else by editing the URL,
 * and nothing has to be stored per email sent.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pasto.hair";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sign(email: string): string {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error("PAYLOAD_SECRET is not set");
  return createHmac("sha256", secret).update(`unsubscribe:${normalizeEmail(email)}`).digest("base64url");
}

/** `${SITE}/unsubscribe?e=…&t=…` — the page asks before doing anything. */
export function unsubscribePageUrl(email: string): string {
  const e = Buffer.from(normalizeEmail(email)).toString("base64url");
  return `${SITE}/unsubscribe?e=${e}&t=${sign(email)}`;
}

/** Same params on the API route: the List-Unsubscribe one-click target (RFC 8058). */
export function unsubscribeOneClickUrl(email: string): string {
  const e = Buffer.from(normalizeEmail(email)).toString("base64url");
  return `${SITE}/api/unsubscribe?e=${e}&t=${sign(email)}`;
}

/** The email the link was made for, or null if it's been tampered with. */
export function verifyUnsubscribe(e: unknown, t: unknown): string | null {
  if (typeof e !== "string" || typeof t !== "string" || !e || !t) return null;
  let email: string;
  try {
    email = normalizeEmail(Buffer.from(e, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!email.includes("@")) return null;
  const expected = Buffer.from(sign(email));
  const given = Buffer.from(t);
  return expected.length === given.length && timingSafeEqual(expected, given) ? email : null;
}
