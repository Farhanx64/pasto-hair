/**
 * First name for a greeting, from whatever the customer typed at booking.
 * "pasto hernandez" -> "Pasto", "PASTO" -> "Pasto", "McKenzie" stays.
 * Returns null when it doesn't look like a name, so the email says "Hi there!".
 */
export function firstNameOf(fullName: string | null | undefined): string | null {
  const first = fullName?.trim().split(/\s+/)[0]?.replace(/^\p{P}+|\p{P}+$/gu, "") ?? "";
  if (first.length < 2 || first.length > 24 || !/^[\p{L}'’-]+$/u.test(first)) return null;
  const allSameCase = first === first.toLowerCase() || first === first.toUpperCase();
  return allSameCase ? first[0].toUpperCase() + first.slice(1).toLowerCase() : first;
}
