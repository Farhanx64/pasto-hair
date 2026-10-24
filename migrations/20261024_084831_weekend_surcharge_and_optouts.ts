import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`email_opt_outs\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`email\` text NOT NULL,
  	\`source\` text DEFAULT 'manual',
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`email_opt_outs_email_idx\` ON \`email_opt_outs\` (\`email\`);`)
  await db.run(sql`CREATE INDEX \`email_opt_outs_updated_at_idx\` ON \`email_opt_outs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`email_opt_outs_created_at_idx\` ON \`email_opt_outs\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`booking_settings_weekend_surcharge_days\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`booking_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`booking_settings_weekend_surcharge_days_order_idx\` ON \`booking_settings_weekend_surcharge_days\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`booking_settings_weekend_surcharge_days_parent_idx\` ON \`booking_settings_weekend_surcharge_days\` (\`parent_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`email_opt_outs_id\` integer REFERENCES email_opt_outs(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_email_opt_outs_id_idx\` ON \`payload_locked_documents_rels\` (\`email_opt_outs_id\`);`)
  await db.run(sql`ALTER TABLE \`booking_settings\` ADD \`weekend_surcharge_multiplier\` numeric DEFAULT 2;`)
  // Seed the existing settings row: an empty days list means "weekends cost the
  // same", so without this the doubled Fri–Sun evening rate would never apply.
  await db.run(sql`INSERT INTO \`booking_settings_weekend_surcharge_days\` (\`order\`, \`parent_id\`, \`value\`)
    SELECT 1, \`id\`, 'fri' FROM \`booking_settings\`
    UNION ALL SELECT 2, \`id\`, 'sat' FROM \`booking_settings\`
    UNION ALL SELECT 3, \`id\`, 'sun' FROM \`booking_settings\`;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`email_opt_outs\`;`)
  await db.run(sql`DROP TABLE \`booking_settings_weekend_surcharge_days\`;`)
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
  	\`promo_codes_id\` integer,
  	\`customers_id\` integer,
  	\`customer_sessions_id\` integer,
  	\`customer_login_tokens_id\` integer,
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
  	FOREIGN KEY (\`testimonials_id\`) REFERENCES \`testimonials\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`promo_codes_id\`) REFERENCES \`promo_codes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`customers_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`customer_sessions_id\`) REFERENCES \`customer_sessions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`customer_login_tokens_id\`) REFERENCES \`customer_login_tokens\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id", "services_id", "addons_id", "staff_id", "availability_rules_id", "blocked_dates_id", "bookings_id", "gallery_items_id", "testimonials_id", "promo_codes_id", "customers_id", "customer_sessions_id", "customer_login_tokens_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id", "services_id", "addons_id", "staff_id", "availability_rules_id", "blocked_dates_id", "bookings_id", "gallery_items_id", "testimonials_id", "promo_codes_id", "customers_id", "customer_sessions_id", "customer_login_tokens_id" FROM \`payload_locked_documents_rels\`;`)
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
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_promo_codes_id_idx\` ON \`payload_locked_documents_rels\` (\`promo_codes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_customers_id_idx\` ON \`payload_locked_documents_rels\` (\`customers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_customer_sessions_id_idx\` ON \`payload_locked_documents_rels\` (\`customer_sessions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_customer_login_tokens_id_idx\` ON \`payload_locked_documents_rels\` (\`customer_login_tokens_id\`);`)
  await db.run(sql`ALTER TABLE \`booking_settings\` DROP COLUMN \`weekend_surcharge_multiplier\`;`)
}
