import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_products" ADD COLUMN "archived" boolean DEFAULT false;
  ALTER TABLE "_cms_products_v" ADD COLUMN "version_archived" boolean DEFAULT false;
  CREATE INDEX "cms_products_archived_idx" ON "cms_products" USING btree ("archived");
  CREATE INDEX "_cms_products_v_version_version_archived_idx" ON "_cms_products_v" USING btree ("version_archived");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "cms_products_archived_idx";
  DROP INDEX "_cms_products_v_version_version_archived_idx";
  ALTER TABLE "cms_products" DROP COLUMN "archived";
  ALTER TABLE "_cms_products_v" DROP COLUMN "version_archived";`)
}
