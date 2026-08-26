// Shared field validators for the public booking submission endpoint
// (app/api/book/route.ts). Extracted so the rules can be unit-tested without
// pulling in the Payload/Next request machinery.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}
