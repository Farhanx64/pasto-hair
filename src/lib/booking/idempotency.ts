import { randomUUID } from "crypto";

// Generates a UUID v4 for use as submissionId
export function generateSubmissionId(): string {
  return randomUUID();
}

// Type for an already-processed submission record
export interface ProcessedSubmission {
  submissionId: string;
  calendarEventId: string;
}

// Check if submissionId already exists in a list of processed submissions
// Returns the record if found, null otherwise
export function isDuplicateSubmission(
  submissionId: string,
  processed: ProcessedSubmission[]
): ProcessedSubmission | null {
  return processed.find((p) => p.submissionId === submissionId) ?? null;
}
