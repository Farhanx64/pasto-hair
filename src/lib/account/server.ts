/**
 * Customer accounts — server-only glue between the pure token/session logic in
 * ./tokens.ts, Payload, and the session cookie.
 *
 * Sessions are server-side rows (hashed id + expiry), not an HMAC-signed
 * cookie. A signed cookie can't be revoked before it expires: sign-out would
 * only delete the browser's copy, and a copied cookie would stay valid for the
 * full 30 days. A row can be deleted — by sign-out, by deleting the customer,
 * or by the owner in the admin — and a leaked PAYLOAD_SECRET doesn't let
 * anyone mint sessions. The cost is one indexed lookup per account request,
 * which is nothing at this site's traffic.
 */

import "server-only";

import config from "@payload-config";
import { eq } from "@payloadcms/db-sqlite/drizzle";
import type { SQLiteAdapter } from "@payloadcms/db-sqlite";
import { cookies } from "next/headers";
import { getPayload } from "payload";

import type { Booking, Customer } from "@/payload-types";
import {
  SESSION_TTL_MS,
  resolveSession,
  type LoginTokenStore,
  type SessionStore,
} from "./tokens";

export const SESSION_COOKIE = "pasto_session";

/**
 * httpOnly: page scripts (and any injected script) can't read it.
 * SameSite=Lax: not sent on cross-site POSTs, which is the CSRF defence for
 * the account mutation routes. Secure in production only — local dev is http.
 */
export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

// ---------------------------------------------------------------------------
// Payload-backed stores
// ---------------------------------------------------------------------------

export const loginTokenStore: LoginTokenStore = {
  async insert(tokenHash, record) {
    const payload = await getPayload({ config });
    const now = new Date().toISOString();
    // Sweep expired links while we're here — nothing else runs background
    // jobs in this app (same approach as the rate limiter).
    await payload.delete({
      collection: "customer-login-tokens",
      where: { expiresAt: { less_than: now } },
    });
    await payload.create({
      collection: "customer-login-tokens",
      data: { tokenHash, email: record.email, expiresAt: record.expiresAt.toISOString() },
    });
  },

  async take(tokenHash) {
    // A single DELETE … RETURNING, deliberately below Payload's local API:
    // payload.delete() is find-then-delete, so two near-simultaneous clicks on
    // one link could both "find" it and both sign in. One SQL statement can't
    // be interleaved — exactly one caller gets the row back. (Drizzle's API is
    // the same on the Postgres adapter, so this survives a DB swap.)
    const payload = await getPayload({ config });
    const db = payload.db as unknown as SQLiteAdapter;
    const table = db.tables["customer_login_tokens"];
    const rows = await db.drizzle
      .delete(table)
      .where(eq(table.tokenHash, tokenHash))
      .returning({ email: table.email, expiresAt: table.expiresAt });
    const row = rows[0] as { email: string; expiresAt: string } | undefined;
    if (!row) return null;
    return { email: row.email, expiresAt: new Date(row.expiresAt) };
  },
};

export const sessionStore: SessionStore = {
  async insert(sessionHash, record) {
    const payload = await getPayload({ config });
    await payload.delete({
      collection: "customer-sessions",
      where: { expiresAt: { less_than: new Date().toISOString() } },
    });
    await payload.create({
      collection: "customer-sessions",
      data: {
        sessionHash,
        customer: Number(record.customerId),
        expiresAt: record.expiresAt.toISOString(),
      },
    });
  },

  async find(sessionHash) {
    const payload = await getPayload({ config });
    const found = await payload.find({
      collection: "customer-sessions",
      where: { sessionHash: { equals: sessionHash } },
      limit: 1,
      depth: 0,
    });
    const doc = found.docs[0];
    if (!doc) return null;
    const customerId = typeof doc.customer === "object" ? doc.customer.id : doc.customer;
    return { customerId: String(customerId), expiresAt: new Date(doc.expiresAt) };
  },

  async delete(sessionHash) {
    const payload = await getPayload({ config });
    await payload.delete({
      collection: "customer-sessions",
      where: { sessionHash: { equals: sessionHash } },
    });
  },
};

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

/** Find the customer for a verified email, creating them on first sign-in. */
export async function findOrCreateCustomer(email: string): Promise<Customer> {
  const payload = await getPayload({ config });
  const existing = await payload.find({
    collection: "customers",
    where: { email: { equals: email } },
    limit: 1,
  });
  if (existing.docs[0]) return existing.docs[0];

  try {
    return await payload.create({ collection: "customers", data: { email } });
  } catch (err) {
    // Lost a race with a second link for the same new email: the unique
    // index rejected our insert, so the other one exists now.
    const retry = await payload.find({
      collection: "customers",
      where: { email: { equals: email } },
      limit: 1,
    });
    if (retry.docs[0]) return retry.docs[0];
    throw err;
  }
}

/** The signed-in customer for this request, or null. Server Components + route handlers. */
export async function getCurrentCustomer(): Promise<Customer | null> {
  const cookieStore = await cookies();
  const customerId = await resolveSession(sessionStore, cookieStore.get(SESSION_COOKIE)?.value);
  if (!customerId) return null;

  const payload = await getPayload({ config });
  try {
    return await payload.findByID({ collection: "customers", id: customerId });
  } catch {
    // Customer deleted out from under a live session.
    return null;
  }
}

/**
 * Every booking made with this customer's email. Bookings store the address
 * as typed, so the match has to be case-insensitive — Payload's `like` is,
 * but it's also a substring match, so the exact comparison happens here.
 */
export async function findBookingsForEmail(email: string): Promise<Booking[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "bookings",
    where: { customerEmail: { like: email } },
    pagination: false,
    sort: "-localDate",
  });
  const target = email.toLowerCase();
  return result.docs.filter((b) => b.customerEmail.trim().toLowerCase() === target);
}
