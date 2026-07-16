import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`bookings\` ADD \`cancel_token\` text;`)
  await db.run(sql`CREATE UNIQUE INDEX \`bookings_cancel_token_idx\` ON \`bookings\` (\`cancel_token\`);`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`cancel_cutoff_minutes\` numeric DEFAULT 90;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`bookings_cancel_token_idx\`;`)
  await db.run(sql`ALTER TABLE \`bookings\` DROP COLUMN \`cancel_token\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`cancel_cutoff_minutes\`;`)
}
