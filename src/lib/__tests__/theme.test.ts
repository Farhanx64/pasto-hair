import { describe, it, expect } from "vitest";
import { isHexColor, themeOverridesCss, validateHexColor } from "../theme";

describe("isHexColor", () => {
  it("accepts #rrggbb in either case", () => {
    expect(isHexColor("#bb86fc")).toBe(true);
    expect(isHexColor("#BB86FC")).toBe(true);
  });

  it("rejects other color syntaxes", () => {
    expect(isHexColor("#fff")).toBe(false);
    expect(isHexColor("#bb86fcff")).toBe(false);
    expect(isHexColor("bb86fc")).toBe(false);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("rgb(1,2,3)")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isHexColor(null)).toBe(false);
    expect(isHexColor(undefined)).toBe(false);
    expect(isHexColor(0xbb86fc)).toBe(false);
  });
});

describe("validateHexColor", () => {
  it("allows empty (brand default)", () => {
    expect(validateHexColor("")).toBe(true);
    expect(validateHexColor(null)).toBe(true);
    expect(validateHexColor(undefined)).toBe(true);
  });

  it("allows a hex color", () => {
    expect(validateHexColor("#123abc")).toBe(true);
  });

  it("returns a message for anything else", () => {
    expect(validateHexColor("#12")).toEqual(expect.any(String));
    expect(validateHexColor("purple")).toEqual(expect.any(String));
  });
});

describe("themeOverridesCss", () => {
  it("returns an empty string when nothing is set", () => {
    expect(themeOverridesCss(null)).toBe("");
    expect(themeOverridesCss(undefined)).toBe("");
    expect(themeOverridesCss({})).toBe("");
    expect(themeOverridesCss({ accent: "", text: null })).toBe("");
  });

  it("maps each field to its CSS variable", () => {
    expect(
      themeOverridesCss({
        accent: "#112233",
        highlight: "#445566",
        background: "#778899",
        text: "#aabbcc",
      })
    ).toBe(
      "html:root{--accent:#112233;--champagne:#445566;--background:#778899;--foreground:#aabbcc;}"
    );
  });

  it("only emits the fields that are set, lowercased", () => {
    expect(themeOverridesCss({ accent: "#FF0000" })).toBe("html:root{--accent:#ff0000;}");
  });

  it("drops values that could inject CSS or markup", () => {
    expect(
      themeOverridesCss({
        accent: "#ff0000;}body{display:none",
        highlight: "</style><script>alert(1)</script>",
        background: "red",
        text: "#00ff00",
      })
    ).toBe("html:root{--foreground:#00ff00;}");
  });

  it("ignores unknown keys", () => {
    expect(
      themeOverridesCss({ accent: "#010203", evil: "#ffffff" } as Record<string, string>)
    ).toBe("html:root{--accent:#010203;}");
  });
});
