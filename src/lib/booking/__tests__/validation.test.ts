import { describe, it, expect } from "vitest";
import { isValidEmail } from "../validation";

describe("isValidEmail", () => {
  it("accepts ordinary addresses", () => {
    expect(isValidEmail("john@example.com")).toBe(true);
    expect(isValidEmail("a@b.co")).toBe(true);
  });

  it("accepts plus-tags and subdomains", () => {
    expect(isValidEmail("john.doe+tag@example.co.uk")).toBe(true);
    expect(isValidEmail("user_name@sub.example.com")).toBe(true);
  });

  it("rejects a trailing @ with nothing after it (the reported bug)", () => {
    expect(isValidEmail("janedoe@")).toBe(false);
    expect(isValidEmail("john@example.com@")).toBe(false);
  });

  it("rejects a leading @ with no local part", () => {
    expect(isValidEmail("@example.com")).toBe(false);
  });

  it("rejects a doubled @", () => {
    expect(isValidEmail("john@@example.com")).toBe(false);
  });

  it("rejects a missing @ entirely", () => {
    expect(isValidEmail("johnexample.com")).toBe(false);
  });

  it("rejects a domain with no dot / TLD", () => {
    expect(isValidEmail("john@example")).toBe(false);
  });

  it("rejects a dot with an empty label on either side", () => {
    expect(isValidEmail("john@.com")).toBe(false);
    expect(isValidEmail("john@example.")).toBe(false);
  });

  it("rejects embedded or surrounding whitespace", () => {
    expect(isValidEmail("john doe@example.com")).toBe(false);
    expect(isValidEmail(" john@example.com")).toBe(false);
    expect(isValidEmail("john@example.com ")).toBe(false);
    expect(isValidEmail("john@ example.com")).toBe(false);
  });

  it("rejects empty or whitespace-only input", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("   ")).toBe(false);
  });
});
