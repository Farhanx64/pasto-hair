import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit, getClientIp, _resetRateLimitState } from "../rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    _resetRateLimitState();
  });

  it("allows requests under the limit", () => {
    expect(checkRateLimit("k1", 3, 10_000).allowed).toBe(true);
    expect(checkRateLimit("k1", 3, 10_000).allowed).toBe(true);
    expect(checkRateLimit("k1", 3, 10_000).allowed).toBe(true);
  });

  it("blocks once the limit is reached, with a retryAfterSeconds", () => {
    checkRateLimit("k2", 2, 10_000);
    checkRateLimit("k2", 2, 10_000);
    const result = checkRateLimit("k2", 2, 10_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks distinct keys independently", () => {
    checkRateLimit("a", 1, 10_000);
    expect(checkRateLimit("a", 1, 10_000).allowed).toBe(false);
    expect(checkRateLimit("b", 1, 10_000).allowed).toBe(true);
  });

  it("resets once the window has elapsed", () => {
    vi.useFakeTimers();
    try {
      checkRateLimit("k3", 1, 1_000);
      expect(checkRateLimit("k3", 1, 1_000).allowed).toBe(false);
      vi.advanceTimersByTime(1_001);
      expect(checkRateLimit("k3", 1, 1_000).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

describe("getClientIp", () => {
  it("reads the first address from X-Forwarded-For", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("falls back to X-Real-IP when X-Forwarded-For is absent", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "203.0.113.9" },
    });
    expect(getClientIp(req)).toBe("203.0.113.9");
  });

  it("falls back to 'unknown' when neither header is present", () => {
    const req = new Request("https://example.com");
    expect(getClientIp(req)).toBe("unknown");
  });
});
