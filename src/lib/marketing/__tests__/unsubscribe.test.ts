import { beforeAll, describe, expect, it } from "vitest";

import { unsubscribeOneClickUrl, unsubscribePageUrl, verifyUnsubscribe } from "../unsubscribe";

beforeAll(() => {
  process.env.PAYLOAD_SECRET = "test-secret";
});

function params(url: string) {
  const u = new URL(url);
  return { e: u.searchParams.get("e"), t: u.searchParams.get("t") };
}

describe("unsubscribe links", () => {
  it("round-trips the (normalized) email", () => {
    const { e, t } = params(unsubscribePageUrl("  Client@Example.com "));
    expect(verifyUnsubscribe(e, t)).toBe("client@example.com");
  });

  it("uses the same signature for the one-click URL", () => {
    const url = unsubscribeOneClickUrl("a@b.co");
    expect(url).toContain("/api/unsubscribe?");
    const { e, t } = params(url);
    expect(verifyUnsubscribe(e, t)).toBe("a@b.co");
  });

  it("rejects a link edited to point at someone else", () => {
    const { t } = params(unsubscribePageUrl("me@example.com"));
    const other = Buffer.from("victim@example.com").toString("base64url");
    expect(verifyUnsubscribe(other, t)).toBeNull();
  });

  it("rejects missing or junk params", () => {
    expect(verifyUnsubscribe(undefined, undefined)).toBeNull();
    expect(verifyUnsubscribe("", "x")).toBeNull();
    expect(verifyUnsubscribe("bm90LWFuLWVtYWls", "x")).toBeNull();
    const { e } = params(unsubscribePageUrl("me@example.com"));
    expect(verifyUnsubscribe(e, "short")).toBeNull();
  });
});
