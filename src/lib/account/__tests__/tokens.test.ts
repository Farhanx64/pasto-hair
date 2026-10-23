import { describe, it, expect } from "vitest";
import {
  LOGIN_TOKEN_TTL_MS,
  SESSION_TTL_MS,
  consumeLoginToken,
  createSession,
  destroySession,
  generateSecret,
  hashSecret,
  isWellFormedSecret,
  issueLoginToken,
  normalizeEmail,
  resolveSession,
  type LoginTokenRecord,
  type LoginTokenStore,
  type SessionRecord,
  type SessionStore,
} from "../tokens";

// In-memory stores with the same contract as the Payload-backed ones.
function memoryLoginStore() {
  const rows = new Map<string, LoginTokenRecord>();
  const store: LoginTokenStore = {
    async insert(hash, record) {
      rows.set(hash, record);
    },
    async take(hash) {
      const record = rows.get(hash) ?? null;
      rows.delete(hash);
      return record;
    },
  };
  return { store, rows };
}

function memorySessionStore() {
  const rows = new Map<string, SessionRecord>();
  const store: SessionStore = {
    async insert(hash, record) {
      rows.set(hash, record);
    },
    async find(hash) {
      return rows.get(hash) ?? null;
    },
    async delete(hash) {
      rows.delete(hash);
    },
  };
  return { store, rows };
}

/** Flip one character of a secret, keeping it well-formed. */
function tamper(secret: string): string {
  const last = secret[secret.length - 1];
  return secret.slice(0, -1) + (last === "A" ? "B" : "A");
}

const T0 = new Date("2026-10-22T12:00:00.000Z");

describe("secrets", () => {
  it("generates 43-char base64url secrets that differ every time", () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("hashes with SHA-256 (hex) deterministically", () => {
    expect(hashSecret("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    const s = generateSecret();
    expect(hashSecret(s)).toBe(hashSecret(s));
    expect(hashSecret(s)).not.toBe(hashSecret(tamper(s)));
  });

  it("rejects malformed secrets", () => {
    expect(isWellFormedSecret(generateSecret())).toBe(true);
    expect(isWellFormedSecret("")).toBe(false);
    expect(isWellFormedSecret("short")).toBe(false);
    expect(isWellFormedSecret(generateSecret() + "x")).toBe(false);
    expect(isWellFormedSecret("a".repeat(42) + "=")).toBe(false);
    expect(isWellFormedSecret(undefined)).toBe(false);
    expect(isWellFormedSecret(12345)).toBe(false);
  });

  it("normalizes email case and whitespace", () => {
    expect(normalizeEmail("  Jane.Doe@Example.COM ")).toBe("jane.doe@example.com");
  });
});

describe("login tokens", () => {
  it("stores only the hash, never the raw secret", async () => {
    const { store, rows } = memoryLoginStore();
    const secret = await issueLoginToken(store, "a@b.com", T0);
    expect(rows.has(secret)).toBe(false);
    expect(rows.has(hashSecret(secret))).toBe(true);
    expect(JSON.stringify([...rows])).not.toContain(secret);
  });

  it("records the normalized email and a 15-minute expiry", async () => {
    const { store, rows } = memoryLoginStore();
    const secret = await issueLoginToken(store, " A@B.com", T0);
    const record = rows.get(hashSecret(secret))!;
    expect(record.email).toBe("a@b.com");
    expect(record.expiresAt.getTime() - T0.getTime()).toBe(LOGIN_TOKEN_TTL_MS);
    expect(LOGIN_TOKEN_TTL_MS).toBe(15 * 60_000);
  });

  it("consumes a valid token and returns its email", async () => {
    const { store } = memoryLoginStore();
    const secret = await issueLoginToken(store, "a@b.com", T0);
    expect(await consumeLoginToken(store, secret, T0)).toBe("a@b.com");
  });

  it("is single-use", async () => {
    const { store } = memoryLoginStore();
    const secret = await issueLoginToken(store, "a@b.com", T0);
    expect(await consumeLoginToken(store, secret, T0)).toBe("a@b.com");
    expect(await consumeLoginToken(store, secret, T0)).toBeNull();
  });

  it("rejects an expired token (and removes it)", async () => {
    const { store, rows } = memoryLoginStore();
    const secret = await issueLoginToken(store, "a@b.com", T0);
    const justAfter = new Date(T0.getTime() + LOGIN_TOKEN_TTL_MS);
    expect(await consumeLoginToken(store, secret, justAfter)).toBeNull();
    expect(rows.size).toBe(0);
  });

  it("accepts a token just before expiry", async () => {
    const { store } = memoryLoginStore();
    const secret = await issueLoginToken(store, "a@b.com", T0);
    const justBefore = new Date(T0.getTime() + LOGIN_TOKEN_TTL_MS - 1);
    expect(await consumeLoginToken(store, secret, justBefore)).toBe("a@b.com");
  });

  it("rejects a tampered token without spending the real one", async () => {
    const { store } = memoryLoginStore();
    const secret = await issueLoginToken(store, "a@b.com", T0);
    expect(await consumeLoginToken(store, tamper(secret), T0)).toBeNull();
    expect(await consumeLoginToken(store, secret, T0)).toBe("a@b.com");
  });

  it("rejects the stored hash presented as a token", async () => {
    const { store } = memoryLoginStore();
    const secret = await issueLoginToken(store, "a@b.com", T0);
    expect(await consumeLoginToken(store, hashSecret(secret), T0)).toBeNull();
  });

  it("rejects malformed input without touching the store", async () => {
    let touched = false;
    const store: LoginTokenStore = {
      async insert() {},
      async take() {
        touched = true;
        return null;
      },
    };
    expect(await consumeLoginToken(store, "not-a-token", T0)).toBeNull();
    expect(await consumeLoginToken(store, { token: "x" }, T0)).toBeNull();
    expect(touched).toBe(false);
  });
});

describe("sessions", () => {
  it("stores only the hash and expires after 30 days", async () => {
    const { store, rows } = memorySessionStore();
    const { secret, expiresAt } = await createSession(store, "cust-1", T0);
    expect(rows.has(secret)).toBe(false);
    expect(rows.get(hashSecret(secret))?.customerId).toBe("cust-1");
    expect(expiresAt.getTime() - T0.getTime()).toBe(SESSION_TTL_MS);
  });

  it("resolves a live session to its customer", async () => {
    const { store } = memorySessionStore();
    const { secret } = await createSession(store, "cust-1", T0);
    expect(await resolveSession(store, secret, T0)).toBe("cust-1");
  });

  it("rejects and deletes an expired session", async () => {
    const { store, rows } = memorySessionStore();
    const { secret } = await createSession(store, "cust-1", T0);
    const later = new Date(T0.getTime() + SESSION_TTL_MS);
    expect(await resolveSession(store, secret, later)).toBeNull();
    expect(rows.size).toBe(0);
  });

  it("rejects tampered and malformed cookie values", async () => {
    const { store } = memorySessionStore();
    const { secret } = await createSession(store, "cust-1", T0);
    expect(await resolveSession(store, tamper(secret), T0)).toBeNull();
    expect(await resolveSession(store, hashSecret(secret), T0)).toBeNull();
    expect(await resolveSession(store, "", T0)).toBeNull();
    expect(await resolveSession(store, undefined, T0)).toBeNull();
  });

  it("sign-out invalidates the session server-side", async () => {
    const { store } = memorySessionStore();
    const { secret } = await createSession(store, "cust-1", T0);
    await destroySession(store, secret);
    expect(await resolveSession(store, secret, T0)).toBeNull();
  });

  it("sign-out only removes its own session", async () => {
    const { store } = memorySessionStore();
    const a = await createSession(store, "cust-1", T0);
    const b = await createSession(store, "cust-1", T0);
    await destroySession(store, a.secret);
    expect(await resolveSession(store, b.secret, T0)).toBe("cust-1");
  });
});
