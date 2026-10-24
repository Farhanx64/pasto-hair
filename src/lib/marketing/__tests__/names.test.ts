import { describe, expect, it } from "vitest";

import { firstNameOf } from "../names";

describe("firstNameOf", () => {
  it("takes the first word and fixes all-lower / all-caps", () => {
    expect(firstNameOf("pasto hernandez")).toBe("Pasto");
    expect(firstNameOf("  PASTO  ")).toBe("Pasto");
    expect(firstNameOf("José García")).toBe("José");
  });

  it("keeps deliberate capitals", () => {
    expect(firstNameOf("McKenzie Smith")).toBe("McKenzie");
    expect(firstNameOf("Jean-Luc")).toBe("Jean-Luc");
  });

  it("returns null for things that aren't names", () => {
    expect(firstNameOf("")).toBeNull();
    expect(firstNameOf(null)).toBeNull();
    expect(firstNameOf("J")).toBeNull();
    expect(firstNameOf("test123")).toBeNull();
    expect(firstNameOf("me@example.com")).toBeNull();
  });
});
