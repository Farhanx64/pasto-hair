/**
 * Promo usage counting, as single SQL statements.
 *
 * Deliberately below Payload's local API (same reasoning as the sign-in token
 * `take()` in src/lib/account/server.ts): read-then-update lets two bookings
 * that arrive together both see "1 use left" and both take it. One conditional
 * UPDATE can't be interleaved, so the last use goes to exactly one booking.
 */

import { and, eq, isNull, lt, or, sql } from "@payloadcms/db-sqlite/drizzle";
import type { SQLiteAdapter } from "@payloadcms/db-sqlite";
import type { Payload } from "payload";

function promoTable(payload: Payload) {
  const db = payload.db as unknown as SQLiteAdapter;
  return { db, table: db.tables["promo_codes"] };
}

/** Takes one use of the code. Returns false if it has no uses left. */
export async function claimPromoUse(payload: Payload, id: number | string): Promise<boolean> {
  const { db, table } = promoTable(payload);
  const used = sql`coalesce(${table.timesUsed}, 0)`;
  const rows = await db.drizzle
    .update(table)
    .set({ timesUsed: sql`${used} + 1` })
    .where(and(eq(table.id, Number(id)), or(isNull(table.maxUses), lt(used, table.maxUses))))
    .returning({ id: table.id });
  return rows.length > 0;
}

/** Gives one use back, for a booking that failed to save after claiming. (Cancellations: see the Bookings afterChange hook.) */
export async function releasePromoUse(payload: Payload, id: number | string): Promise<void> {
  const { db, table } = promoTable(payload);
  await db.drizzle
    .update(table)
    .set({ timesUsed: sql`max(coalesce(${table.timesUsed}, 0) - 1, 0)` })
    .where(eq(table.id, Number(id)));
}
