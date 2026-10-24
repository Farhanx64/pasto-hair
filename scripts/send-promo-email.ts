/**
 * One-off promo announcement to past clients ("slots are filling up" + codes).
 *
 * Run on the server through the wrapper, which loads .env and the node venv:
 *
 *   scripts/promo-email.sh count     CODE1 CODE2   # who would get it — sends nothing
 *   scripts/promo-email.sh test  you@example.com CODE1 CODE2   # one copy, to you
 *   scripts/promo-email.sh send-all  CODE1 CODE2   # every past client
 *
 * Sends from MARKETING_EMAIL_FROM — a separate subdomain (e.g. news.pasto.hair)
 * verified in Resend — so spam complaints on promos can't drag down the
 * booking emails' domain reputation. Only `test` may fall back to EMAIL_FROM.
 *
 * Recipients are the distinct emails on bookings plus signed-up customers.
 * Each person gets their own email (never a shared To/CC list). Codes are read
 * from the admin and must be valid right now, so the email can't advertise a
 * code that won't work at checkout.
 */

import { getPayload } from "payload";
import { Resend } from "resend";

import config from "../payload.config";
import { checkPromoCode, describePromo, normalizePromoCode } from "../src/lib/booking/promo";
import {
  buildPromoAnnouncementHtml,
  buildPromoAnnouncementText,
  type PromoAnnouncementCode,
} from "../src/lib/notifications";

const SUBJECT = "Slots are filling up — book your chair";
// Resend's default limit is 2 requests/second; stay under it.
const SEND_GAP_MS = 600;

function fail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

const [mode, ...rest] = process.argv.slice(2);
if (mode !== "count" && mode !== "test" && mode !== "send-all") {
  fail("Usage: promo-email.sh count|send-all CODE... | test you@example.com CODE...");
}
const testTo = mode === "test" ? rest.shift() : undefined;
if (mode === "test" && !testTo?.includes("@")) fail("test needs an email address first.");
const codeArgs = rest.map(normalizePromoCode).filter(Boolean);
if (codeArgs.length === 0) fail("Name at least one promo code.");

const payload = await getPayload({ config });

// --- codes: must exist and be usable today --------------------------------
const codes: PromoAnnouncementCode[] = [];
for (const code of codeArgs) {
  const found = await payload.find({
    collection: "promo-codes",
    where: { code: { equals: code } },
    limit: 1,
    depth: 0,
  });
  const check = checkPromoCode(found.docs[0], new Date());
  if (!check.valid) fail(`${code}: ${check.message} Fix it in the admin first.`);
  const maxUses = found.docs[0]?.maxUses;
  codes.push({
    code: check.promo.code,
    label: describePromo(check.promo),
    // Uses the cap from the admin, so the email always matches what checkout enforces.
    limit: maxUses ? `First ${maxUses} booking${maxUses === 1 ? "" : "s"} only` : undefined,
  });
}

// --- recipients -------------------------------------------------------------
const emails = new Set<string>();
const bookings = await payload.find({ collection: "bookings", limit: 0, pagination: false, depth: 0 });
for (const b of bookings.docs) if (b.customerEmail) emails.add(b.customerEmail.trim().toLowerCase());
const customers = await payload.find({ collection: "customers", limit: 0, pagination: false, depth: 0 });
for (const c of customers.docs) if (c.email) emails.add(c.email.trim().toLowerCase());
const recipients = [...emails].filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)).sort();

console.log(`\nCodes: ${codes.map((c) => `${c.code} (${c.label})`).join(", ")}`);
console.log(`Past clients: ${recipients.length}`);

if (mode === "count") {
  console.log("\nNothing sent (count mode).\n");
  process.exit(0);
}

// --- send -------------------------------------------------------------------
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) fail("RESEND_API_KEY missing from .env.");
const marketingFrom = process.env.MARKETING_EMAIL_FROM;
if (!marketingFrom && mode !== "test") {
  fail("MARKETING_EMAIL_FROM missing from .env — promos must not go out from the booking address.");
}
const from = marketingFrom || process.env.EMAIL_FROM;
if (!from) fail("MARKETING_EMAIL_FROM (or EMAIL_FROM for a test) missing from .env.");
if (!marketingFrom) console.log("Note: MARKETING_EMAIL_FROM not set — this test goes out from the booking address.");
console.log(`From: ${from}`);
const replyTo = process.env.OWNER_EMAIL || undefined; // "reply unsubscribe" reaches the owner

const settings = await payload.findGlobal({ slug: "business-settings" });
const business = {
  name: settings.businessName ?? undefined,
  address: settings.address ?? undefined,
  phone: settings.phone ?? undefined,
  email: settings.email ?? undefined,
};
const html = buildPromoAnnouncementHtml(codes, business);
const text = buildPromoAnnouncementText(codes, business);
const resend = new Resend(apiKey);

const targets = mode === "test" ? [testTo!] : recipients;
let sent = 0;
const failed: string[] = [];
for (const to of targets) {
  const { error } = await resend.emails.send({
    from,
    to,
    replyTo,
    subject: mode === "test" ? `[TEST] ${SUBJECT}` : SUBJECT,
    html,
    text,
  });
  if (error) {
    failed.push(to);
    console.error(`  failed: ${to} — ${error.message}`);
  } else {
    sent += 1;
  }
  await new Promise((r) => setTimeout(r, SEND_GAP_MS));
}

console.log(`\nSent ${sent} of ${targets.length}.${failed.length ? ` Failed: ${failed.join(", ")}` : ""}\n`);
process.exit(failed.length ? 1 : 0);
