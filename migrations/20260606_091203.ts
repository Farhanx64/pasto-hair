import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`services\` (
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`price\` numeric NOT NULL,
  	\`duration_minutes\` numeric NOT NULL,
  	\`active\` integer DEFAULT true,
  	\`sort_order\` numeric,
  	\`description\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`services_updated_at_idx\` ON \`services\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`services_created_at_idx\` ON \`services\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`addons\` (
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`price\` numeric NOT NULL,
  	\`duration_minutes\` numeric NOT NULL,
  	\`active\` integer DEFAULT true,
  	\`description\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`addons_updated_at_idx\` ON \`addons\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`addons_created_at_idx\` ON \`addons\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`staff\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`email\` text,
  	\`calendar_id\` text NOT NULL,
  	\`role\` text,
  	\`active\` integer DEFAULT true,
  	\`bio\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`staff_updated_at_idx\` ON \`staff\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`staff_created_at_idx\` ON \`staff\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`availability_rules_shifts\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`start\` text,
  	\`end\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`availability_rules\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`availability_rules_shifts_order_idx\` ON \`availability_rules_shifts\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`availability_rules_shifts_parent_id_idx\` ON \`availability_rules_shifts\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`availability_rules\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`day\` text NOT NULL,
  	\`enabled\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`availability_rules_updated_at_idx\` ON \`availability_rules\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`availability_rules_created_at_idx\` ON \`availability_rules\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`blocked_dates\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`date\` text NOT NULL,
  	\`reason\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`blocked_dates_updated_at_idx\` ON \`blocked_dates\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`blocked_dates_created_at_idx\` ON \`blocked_dates\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`bookings_addons\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`addon\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`bookings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`bookings_addons_order_idx\` ON \`bookings_addons\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`bookings_addons_parent_id_idx\` ON \`bookings_addons\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`bookings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`submission_id\` text NOT NULL,
  	\`status\` text DEFAULT 'pending',
  	\`customer_name\` text NOT NULL,
  	\`customer_email\` text NOT NULL,
  	\`customer_phone\` text NOT NULL,
  	\`service\` text NOT NULL,
  	\`notes\` text,
  	\`local_date\` text NOT NULL,
  	\`local_start_time\` text NOT NULL,
  	\`local_end_time\` text NOT NULL,
  	\`time_zone\` text DEFAULT 'America/New_York',
  	\`total_price\` numeric NOT NULL,
  	\`evening_surcharge\` integer,
  	\`calendar_event_id\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`bookings_submission_id_idx\` ON \`bookings\` (\`submission_id\`);`)
  await db.run(sql`CREATE INDEX \`bookings_updated_at_idx\` ON \`bookings\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`bookings_created_at_idx\` ON \`bookings\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`gallery_items_style_tags\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`tag\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`gallery_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`gallery_items_style_tags_order_idx\` ON \`gallery_items_style_tags\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`gallery_items_style_tags_parent_id_idx\` ON \`gallery_items_style_tags\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`gallery_items\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`image_id\` integer,
  	\`caption\` text,
  	\`type\` text,
  	\`sort_order\` numeric,
  	\`active\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`gallery_items_image_idx\` ON \`gallery_items\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`gallery_items_updated_at_idx\` ON \`gallery_items\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`gallery_items_created_at_idx\` ON \`gallery_items\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`testimonials\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`customer_name\` text NOT NULL,
  	\`quote\` text NOT NULL,
  	\`active\` integer DEFAULT true,
  	\`sort_order\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`testimonials_updated_at_idx\` ON \`testimonials\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`testimonials_created_at_idx\` ON \`testimonials\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`business_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`business_name\` text,
  	\`tagline\` text,
  	\`timezone\` text DEFAULT 'America/New_York',
  	\`address\` text,
  	\`phone\` text,
  	\`email\` text,
  	\`instagram_url\` text,
  	\`facebook_url\` text,
  	\`twitter_url\` text,
  	\`booking_url\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`CREATE TABLE \`booking_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`slot_interval_minutes\` numeric DEFAULT 15,
  	\`evening_surcharge_start\` text DEFAULT '20:00',
  	\`evening_surcharge_amount\` numeric DEFAULT 10,
  	\`fail_behavior\` text DEFAULT 'closed',
  	\`min_lead_time_minutes\` numeric DEFAULT 0,
  	\`max_booking_window_days\` numeric DEFAULT 90,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`services_id\` text REFERENCES services(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`addons_id\` text REFERENCES addons(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`staff_id\` integer REFERENCES staff(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`availability_rules_id\` integer REFERENCES availability_rules(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`blocked_dates_id\` integer REFERENCES blocked_dates(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`bookings_id\` integer REFERENCES bookings(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`gallery_items_id\` integer REFERENCES gallery_items(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`testimonials_id\` integer REFERENCES testimonials(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_services_id_idx\` ON \`payload_locked_documents_rels\` (\`services_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_addons_id_idx\` ON \`payload_locked_documents_rels\` (\`addons_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_staff_id_idx\` ON \`payload_locked_documents_rels\` (\`staff_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_availability_rules_id_idx\` ON \`payload_locked_documents_rels\` (\`availability_rules_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_blocked_dates_id_idx\` ON \`payload_locked_documents_rels\` (\`blocked_dates_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_bookings_id_idx\` ON \`payload_locked_documents_rels\` (\`bookings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_gallery_items_id_idx\` ON \`payload_locked_documents_rels\` (\`gallery_items_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_testimonials_id_idx\` ON \`payload_locked_documents_rels\` (\`testimonials_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`services\`;`)
  await db.run(sql`DROP TABLE \`addons\`;`)
  await db.run(sql`DROP TABLE \`staff\`;`)
  await db.run(sql`DROP TABLE \`availability_rules_shifts\`;`)
  await db.run(sql`DROP TABLE \`availability_rules\`;`)
  await db.run(sql`DROP TABLE \`blocked_dates\`;`)
  await db.run(sql`DROP TABLE \`bookings_addons\`;`)
  await db.run(sql`DROP TABLE \`bookings\`;`)
  await db.run(sql`DROP TABLE \`gallery_items_style_tags\`;`)
  await db.run(sql`DROP TABLE \`gallery_items\`;`)
  await db.run(sql`DROP TABLE \`testimonials\`;`)
  await db.run(sql`DROP TABLE \`business_settings\`;`)
  await db.run(sql`DROP TABLE \`booking_settings\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
}
