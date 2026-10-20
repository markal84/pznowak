import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cms_submissions_verification" AS ENUM('verified', 'quarantine');
  ALTER TABLE "cms_submissions" ADD COLUMN "verification" "enum_cms_submissions_verification" DEFAULT 'verified' NOT NULL;
  CREATE INDEX "cms_submissions_verification_idx" ON "cms_submissions" USING btree ("verification");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "cms_submissions_verification_idx";
  ALTER TABLE "cms_submissions" DROP COLUMN "verification";
  DROP TYPE "public"."enum_cms_submissions_verification";`)
}
