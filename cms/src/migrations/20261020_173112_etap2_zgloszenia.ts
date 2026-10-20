import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cms_submissions_kind" AS ENUM('creator', 'contact');
  CREATE TYPE "public"."enum_cms_submissions_topic" AS ENUM('nowy', 'kolekcja', 'obraczki', 'naprawa', 'inne');
  CREATE TYPE "public"."enum_cms_submissions_status" AS ENUM('draft', 'contacted', 'closed', 'spam');
  CREATE TYPE "public"."enum_cms_submissions_visualization_status" AS ENUM('not_applicable', 'waiting', 'approved', 'in_progress', 'done', 'failed', 'rejected');
  CREATE TYPE "public"."enum_cms_submissions_notification" AS ENUM('pending', 'sent', 'skipped', 'failed');
  CREATE TABLE "cms_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"email" varchar,
  	"summary" varchar,
  	"message" varchar,
  	"details" jsonb,
  	"consent_text" varchar NOT NULL,
  	"consent_at" timestamp(3) with time zone NOT NULL,
  	"meta_ip_hash" varchar,
  	"meta_user_agent" varchar,
  	"meta_fill_seconds" numeric,
  	"meta_verified_with_test_keys" boolean,
  	"kind" "enum_cms_submissions_kind" NOT NULL,
  	"topic" "enum_cms_submissions_topic",
  	"status" "enum_cms_submissions_status" DEFAULT 'draft' NOT NULL,
  	"visualization_status" "enum_cms_submissions_visualization_status" DEFAULT 'not_applicable' NOT NULL,
  	"visualization_started_at" timestamp(3) with time zone,
  	"visualization_finished_at" timestamp(3) with time zone,
  	"notification" "enum_cms_submissions_notification" DEFAULT 'pending',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cms_submissions_id" integer;
  CREATE INDEX "cms_submissions_kind_idx" ON "cms_submissions" USING btree ("kind");
  CREATE INDEX "cms_submissions_status_idx" ON "cms_submissions" USING btree ("status");
  CREATE INDEX "cms_submissions_visualization_status_idx" ON "cms_submissions" USING btree ("visualization_status");
  CREATE INDEX "cms_submissions_updated_at_idx" ON "cms_submissions" USING btree ("updated_at");
  CREATE INDEX "cms_submissions_created_at_idx" ON "cms_submissions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_submissions_fk" FOREIGN KEY ("cms_submissions_id") REFERENCES "public"."cms_submissions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_cms_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_submissions_id");`)

  // Liczniki limitów (IP na godzinę, dzienny sufit zgłoszeń, dzienny limit wizualizacji). Tabela spoza
  // schematu kolekcji Payloada: czytają ją i piszą tylko zapytania z src/lib/submissions/store.ts.
  await db.execute(sql`
  CREATE TABLE "cms_limit_counters" (
  	"bucket" varchar(200) PRIMARY KEY NOT NULL,
  	"hits" integer DEFAULT 0 NOT NULL CHECK ("hits" >= 0),
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE INDEX "cms_limit_counters_expires_at_idx" ON "cms_limit_counters" USING btree ("expires_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "cms_limit_counters";
  ALTER TABLE "cms_submissions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms_submissions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_submissions_fk";

  DROP INDEX IF EXISTS "payload_locked_documents_rels_cms_submissions_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cms_submissions_id";
  DROP TYPE "public"."enum_cms_submissions_kind";
  DROP TYPE "public"."enum_cms_submissions_topic";
  DROP TYPE "public"."enum_cms_submissions_status";
  DROP TYPE "public"."enum_cms_submissions_visualization_status";
  DROP TYPE "public"."enum_cms_submissions_notification";`)
}
