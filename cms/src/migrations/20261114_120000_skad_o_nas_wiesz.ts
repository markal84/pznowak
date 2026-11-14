import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/** „Skąd o nas wiesz?” w zgłoszeniach z formularza kontaktowego (pomiar źródeł klientów). */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cms_submissions_heard_from" AS ENUM('google', 'mapy-google', 'facebook', 'instagram', 'olx', 'polecenie', 'klient', 'witryna', 'inne');
  ALTER TABLE "cms_submissions" ADD COLUMN "heard_from" "enum_cms_submissions_heard_from";
  ALTER TABLE "cms_submissions" ADD COLUMN "heard_from_other" varchar;
  CREATE INDEX "cms_submissions_heard_from_idx" ON "cms_submissions" USING btree ("heard_from");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "cms_submissions_heard_from_idx";
  ALTER TABLE "cms_submissions" DROP COLUMN "heard_from";
  ALTER TABLE "cms_submissions" DROP COLUMN "heard_from_other";
  DROP TYPE "public"."enum_cms_submissions_heard_from";`)
}
