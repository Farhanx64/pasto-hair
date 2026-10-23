/**
 * Customer sign-in secrets: magic-link login tokens and session ids.
 *
 * Pure logic over a small storage interface, so the rules (hash-at-rest,
 * expiry, single use, malformed/tampered input rejected) can be unit-tested
 * without Payload. The Payload-backed stores live in ./server.ts.
 *
 * Both secrets are 32 random bytes, base64url. Only their SHA-256 is ever
 * stored: a leaked database (or backup) then holds nothing that signs anyone
 * in. A plain unsalted hash is enough here — unlike a password, the input is
 * 256 bits of randomness, so there is nothing to brute-force or rainbow-table.
 */

import { createHash, randomBytes } from "crypto";

export const LOGIN_TOKEN_TTL_MS = 15 * 60_000; // 15 min
export const SESSION_TTL_MS = 30 * 24 * 60 * 60_000; // 30 days

const SECRET_BYTES = 32;
// 32 bytes → 43 base64url chars, no padding.
const SECRET_RE = /^[A-Za-z0-9_-]{43}$/;

export function generateSecret(): string {
  return randomBytes(SECRET_BYTES).toString("base64url");
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/**
 * Shape check before any database lookup. Not the security boundary — an
 * altered token simply hashes to a row that doesn't exist — but it keeps junk
 * (and oversized input) away from the query.
 */
export function isWellFormedSecret(value: unknown): value is string {
  return typeof value === "string" && SECRET_RE.test(value);
}

/** Emails are the account key: compare and store them trimmed + lowercased. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Login tokens (magic link)
// ---------------------------------------------------------------------------

export interface LoginTokenRecord {
  email: string;
  expiresAt: Date;
}

export interface LoginTokenStore {
  insert(tokenHash: string, record: LoginTokenRecord): Promise<void>;
  /**
   * Remove the row for `tokenHash` and return what it held, atomically — two
   * concurrent calls for the same hash must not both get the record. This is
   * what makes a link single-use.
   */
  take(tokenHash: string): Promise<LoginTokenRecord | null>;
}

/** Creates a login token for `email` and returns the raw secret for the link. */
export async function issueLoginToken(
  store: LoginTokenStore,
  email: string,
  now: Date = new Date(),
): Promise<string> {
  const secret = generateSecret();
  await store.insert(hashSecret(secret), {
    email: normalizeEmail(email),
    expiresAt: new Date(now.getTime() + LOGIN_TOKEN_TTL_MS),
  });
  return secret;
}

/**
 * Spends a login token. Returns the email it was issued for, or null if the
 * token is malformed, unknown, already used, or expired. An expired token is
 * still removed — `take` runs before the expiry check — so it can't linger.
 */
export async function consumeLoginToken(
  store: LoginTokenStore,
  secret: unknown,
  now: Date = new Date(),
): Promise<string | null> {
  if (!isWellFormedSecret(secret)) return null;
  const record = await store.take(hashSecret(secret));
  if (!record) return null;
  if (record.expiresAt.getTime() <= now.getTime()) return null;
  return record.email;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface SessionRecord {
  customerId: string;
  expiresAt: Date;
}

export interface SessionStore {
  insert(sessionHash: string, record: SessionRecord): Promise<void>;
  find(sessionHash: string): Promise<SessionRecord | null>;
  delete(sessionHash: string): Promise<void>;
}

export async function createSession(
  store: SessionStore,
  customerId: string,
  now: Date = new Date(),
): Promise<{ secret: string; expiresAt: Date }> {
  const secret = generateSecret();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await store.insert(hashSecret(secret), { customerId, expiresAt });
  return { secret, expiresAt };
}

/** The signed-in customer's id for a session cookie value, or null. */
export async function resolveSession(
  store: SessionStore,
  secret: unknown,
  now: Date = new Date(),
): Promise<string | null> {
  if (!isWellFormedSecret(secret)) return null;
  const hash = hashSecret(secret);
  const record = await store.find(hash);
  if (!record) return null;
  if (record.expiresAt.getTime() <= now.getTime()) {
    await store.delete(hash);
    return null;
  }
  return record.customerId;
}

export async function destroySession(store: SessionStore, secret: unknown): Promise<void> {
  if (!isWellFormedSecret(secret)) return;
  await store.delete(hashSecret(secret));
}
