// Shared field validators for the public booking submission endpoint
// (app/api/book/route.ts). Extracted so the rules can be unit-tested without
// pulling in the Payload/Next request machinery.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

// The booking form's "I agree to the Terms of Service" checkbox. Strictly
// `true` — a missing field, "true", or 1 is not agreement, so a client that
// skips the checkbox can't slip a booking through.
export function hasAcceptedTerms(value: unknown): boolean {
  return value === true;
}
