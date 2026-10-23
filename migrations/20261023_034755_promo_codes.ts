import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`promo_codes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`code\` text NOT NULL,
  	\`type\` text DEFAULT 'percent' NOT NULL,
  	\`value\` numeric NOT NULL,
  	\`active\` integer DEFAULT true,
  	\`starts_at\` text,
  	\`expires_at\` text,
  	\`max_uses\` numeric,
  	\`times_used\` numeric DEFAULT 0,
  	\`note\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`promo_codes_code_idx\` ON \`promo_codes\` (\`code\`);`)
  await db.run(sql`CREATE INDEX \`promo_codes_updated_at_idx\` ON \`promo_codes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`promo_codes_created_at_idx\` ON \`promo_codes\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`bookings\` ADD \`promo_code\` text;`)
  await db.run(sql`ALTER TABLE \`bookings\` ADD \`promo_discount_amount\` numeric;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`promo_codes_id\` integer REFERENCES promo_codes(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_promo_codes_id_idx\` ON \`payload_locked_documents_rels\` (\`promo_codes_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`promo_codes\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	\`services_id\` text,
  	\`addons_id\` text,
  	\`staff_id\` integer,
  	\`availability_rules_id\` integer,
  	\`blocked_dates_id\` integer,
  	\`bookings_id\` integer,
  	\`gallery_items_id\` integer,
  	\`testimonials_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`services_id\`) REFERENCES \`services\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`addons_id\`) REFERENCES \`addons\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`staff_id\`) REFERENCES \`staff\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`availability_rules_id\`) REFERENCES \`availability_rules\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`blocked_dates_id\`) REFERENCES \`blocked_dates\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`bookings_id\`) REFERENCES \`bookings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`gallery_items_id\`) REFERENCES \`gallery_items\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`testimonials_id\`) REFERENCES \`testimonials\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id", "services_id", "addons_id", "staff_id", "availability_rules_id", "blocked_dates_id", "bookings_id", "gallery_items_id", "testimonials_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id", "services_id", "addons_id", "staff_id", "availability_rules_id", "blocked_dates_id", "bookings_id", "gallery_items_id", "testimonials_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_services_id_idx\` ON \`payload_locked_documents_rels\` (\`services_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_addons_id_idx\` ON \`payload_locked_documents_rels\` (\`addons_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_staff_id_idx\` ON \`payload_locked_documents_rels\` (\`staff_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_availability_rules_id_idx\` ON \`payload_locked_documents_rels\` (\`availability_rules_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_blocked_dates_id_idx\` ON \`payload_locked_documents_rels\` (\`blocked_dates_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_bookings_id_idx\` ON \`payload_locked_documents_rels\` (\`bookings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_gallery_items_id_idx\` ON \`payload_locked_documents_rels\` (\`gallery_items_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_testimonials_id_idx\` ON \`payload_locked_documents_rels\` (\`testimonials_id\`);`)
  await db.run(sql`ALTER TABLE \`bookings\` DROP COLUMN \`promo_code\`;`)
  await db.run(sql`ALTER TABLE \`bookings\` DROP COLUMN \`promo_discount_amount\`;`)
}
