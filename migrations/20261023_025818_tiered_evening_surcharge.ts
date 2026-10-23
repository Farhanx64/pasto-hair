import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`booking_settings_evening_surcharge_tiers\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`start\` text NOT NULL,
  	\`amount\` numeric NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`booking_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`booking_settings_evening_surcharge_tiers_order_idx\` ON \`booking_settings_evening_surcharge_tiers\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`booking_settings_evening_surcharge_tiers_parent_id_idx\` ON \`booking_settings_evening_surcharge_tiers\` (\`_parent_id\`);`)
  // Seed the existing settings row: an empty tiers array means "no surcharge",
  // so without this the live site would stop charging the evening rate.
  await db.run(sql`INSERT INTO \`booking_settings_evening_surcharge_tiers\` (\`_order\`, \`_parent_id\`, \`id\`, \`start\`, \`amount\`)
    SELECT 1, \`id\`, lower(hex(randomblob(12))), '20:00', 10 FROM \`booking_settings\`
    UNION ALL
    SELECT 2, \`id\`, lower(hex(randomblob(12))), '21:00', 20 FROM \`booking_settings\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`evening_surcharge_start\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`evening_surcharge_amount\`;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`booking_settings_evening_surcharge_tiers\`;`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`evening_surcharge_start\` text DEFAULT '20:00';`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`evening_surcharge_amount\` numeric DEFAULT 10;`)
}
