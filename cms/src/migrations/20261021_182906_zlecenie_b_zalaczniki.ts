import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cms_submissions_attachments_state" AS ENUM('none', 'uploading', 'complete', 'incomplete', 'refused_quarantine', 'refused_limit', 'refused_unavailable', 'expired');
  ALTER TABLE "cms_submissions" ADD COLUMN "attachments_state" "enum_cms_submissions_attachments_state" DEFAULT 'none';
  ALTER TABLE "cms_submissions" ADD COLUMN "attachments_declared" numeric DEFAULT 0;
  ALTER TABLE "cms_submissions" ADD COLUMN "attachments_count" numeric DEFAULT 0;
  ALTER TABLE "cms_submissions" ADD COLUMN "attachments_keep" boolean DEFAULT false;
  CREATE INDEX "cms_submissions_attachments_state_idx" ON "cms_submissions" USING btree ("attachments_state");`)

  // Miejsca na zdjęcia od klientów (poza schematem kolekcji, jak cms_limit_counters; obsługa: src/lib/attachments/store.ts).
  // Wiersze znikają razem ze zgłoszeniem; pliki w magazynie usuwa hook kolekcji „Zgłoszenia”.
  await db.execute(sql`
  CREATE TABLE "cms_submission_attachments" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"submission_id" integer NOT NULL REFERENCES "cms_submissions"("id") ON DELETE CASCADE,
  	"slot" smallint NOT NULL CHECK ("slot" BETWEEN 1 AND 20),
  	"state" varchar(16) DEFAULT 'pending' NOT NULL
  	  CHECK ("state" IN ('pending', 'stored', 'rejected', 'skipped', 'missing', 'expired')),
  	"declared_bytes" integer NOT NULL CHECK ("declared_bytes" > 0),
  	"original_name" varchar(160),
  	"detected_type" varchar(16),
  	"bytes" integer,
  	"width" integer,
  	"height" integer,
  	"path" varchar(300),
  	"thumb_path" varchar(300),
  	"reject_reason" varchar(40),
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	UNIQUE ("submission_id", "slot")
  );
  CREATE INDEX "cms_submission_attachments_state_idx" ON "cms_submission_attachments" USING btree ("state", "created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "cms_submission_attachments";`)
  await db.execute(sql`
   DROP INDEX "cms_submissions_attachments_state_idx";
  ALTER TABLE "cms_submissions" DROP COLUMN "attachments_state";
  ALTER TABLE "cms_submissions" DROP COLUMN "attachments_declared";
  ALTER TABLE "cms_submissions" DROP COLUMN "attachments_count";
  ALTER TABLE "cms_submissions" DROP COLUMN "attachments_keep";
  DROP TYPE "public"."enum_cms_submissions_attachments_state";`)
}
