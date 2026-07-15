import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`bookings\` ADD \`discount_percent\` numeric;`)
  await db.run(sql`ALTER TABLE \`bookings\` ADD \`discount_amount\` numeric;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`multi_service_discount_enabled\` integer DEFAULT true;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`discount_tier2_percent\` numeric DEFAULT 10;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`discount_tier3_percent\` numeric DEFAULT 15;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`bookings\` DROP COLUMN \`discount_percent\`;`)
  await db.run(sql`ALTER TABLE \`bookings\` DROP COLUMN \`discount_amount\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`multi_service_discount_enabled\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`discount_tier2_percent\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`discount_tier3_percent\`;`)
}
