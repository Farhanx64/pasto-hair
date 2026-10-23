import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

import { buildStarterTerms, DEFAULT_CANCEL_CUTOFF_MINUTES } from '../src/lib/legal/terms-template'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`legal\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`terms_updated_at\` text,
  	\`terms_body\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`ALTER TABLE \`bookings\` ADD \`terms_accepted_at\` text;`)
  // Live install: start with the template terms so /terms (linked from the
  // required booking checkbox) isn't empty. Raw SQL rather than updateGlobal
  // because later migrations may not have run yet when this one does.
  const settings = await db.all<{ cancel_cutoff_minutes: number | null }>(
    sql`SELECT \`cancel_cutoff_minutes\` FROM \`booking_settings\` LIMIT 1;`,
  )
  const cutoff = settings[0]?.cancel_cutoff_minutes ?? DEFAULT_CANCEL_CUTOFF_MINUTES
  const now = new Date().toISOString()
  const body = JSON.stringify(buildStarterTerms(cutoff))
  await db.run(sql`INSERT INTO \`legal\` (\`terms_updated_at\`, \`terms_body\`, \`updated_at\`, \`created_at\`)
    VALUES (${now}, ${body}, ${now}, ${now});`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`legal\`;`)
  await db.run(sql`ALTER TABLE \`bookings\` DROP COLUMN \`terms_accepted_at\`;`)
}
