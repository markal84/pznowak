import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cms_submissions_ring_size_known" AS ENUM('known', 'unknown');
  ALTER TABLE "cms_submissions" ADD COLUMN "engraving" varchar;
  ALTER TABLE "cms_submissions" ADD COLUMN "ring_size_known" "enum_cms_submissions_ring_size_known";
  ALTER TABLE "cms_submissions" ADD COLUMN "ring_size" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_submissions" DROP COLUMN "engraving";
  ALTER TABLE "cms_submissions" DROP COLUMN "ring_size_known";
  ALTER TABLE "cms_submissions" DROP COLUMN "ring_size";
  DROP TYPE "public"."enum_cms_submissions_ring_size_known";`)
}
