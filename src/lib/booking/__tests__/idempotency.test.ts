import { describe, it, expect } from "vitest";
import { generateSubmissionId, isDuplicateSubmission } from "../idempotency";
import type { ProcessedSubmission } from "../idempotency";

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("generateSubmissionId", () => {
  it("returns a string matching UUID v4 format", () => {
    const id = generateSubmissionId();
    expect(typeof id).toBe("string");
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it("generates unique IDs on successive calls", () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateSubmissionId()));
    expect(ids.size).toBe(10);
  });
});

describe("isDuplicateSubmission", () => {
  const processed: ProcessedSubmission[] = [
    { submissionId: "id-aaa", calendarEventId: "cal-1" },
    { submissionId: "id-bbb", calendarEventId: "cal-2" },
    { submissionId: "id-ccc", calendarEventId: "cal-3" },
  ];

  it("returns null for a new (unseen) submissionId", () => {
    expect(isDuplicateSubmission("id-new", processed)).toBeNull();
  });

  it("returns the matching record for a known submissionId", () => {
    const result = isDuplicateSubmission("id-bbb", processed);
    expect(result).not.toBeNull();
    expect(result?.submissionId).toBe("id-bbb");
    expect(result?.calendarEventId).toBe("cal-2");
  });

  it("returns the first matching record when submissionId matches", () => {
    const result = isDuplicateSubmission("id-aaa", processed);
    expect(result).toEqual({ submissionId: "id-aaa", calendarEventId: "cal-1" });
  });

  it("returns null when processed array is empty", () => {
    expect(isDuplicateSubmission("id-aaa", [])).toBeNull();
  });

  it("returns null when submissionId is similar but not exact match", () => {
    expect(isDuplicateSubmission("id-aa", processed)).toBeNull();
    expect(isDuplicateSubmission("id-aaaa", processed)).toBeNull();
    expect(isDuplicateSubmission("ID-aaa", processed)).toBeNull();
  });

  it("returns last record when there are many entries", () => {
    const large: ProcessedSubmission[] = Array.from({ length: 1000 }, (_, i) => ({
      submissionId: `id-${i}`,
      calendarEventId: `cal-${i}`,
    }));
    const result = isDuplicateSubmission("id-999", large);
    expect(result).toEqual({ submissionId: "id-999", calendarEventId: "cal-999" });
  });
});
