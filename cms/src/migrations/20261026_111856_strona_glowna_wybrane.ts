import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_products" ADD COLUMN "featured_on_home" boolean DEFAULT false;
  ALTER TABLE "cms_products" ADD COLUMN "home_order" numeric DEFAULT 0;
  ALTER TABLE "_cms_products_v" ADD COLUMN "version_featured_on_home" boolean DEFAULT false;
  ALTER TABLE "_cms_products_v" ADD COLUMN "version_home_order" numeric DEFAULT 0;
  CREATE INDEX "cms_products_featured_on_home_idx" ON "cms_products" USING btree ("featured_on_home");
  CREATE INDEX "_cms_products_v_version_version_featured_on_home_idx" ON "_cms_products_v" USING btree ("version_featured_on_home");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "cms_products_featured_on_home_idx";
  DROP INDEX "_cms_products_v_version_version_featured_on_home_idx";
  ALTER TABLE "cms_products" DROP COLUMN "featured_on_home";
  ALTER TABLE "cms_products" DROP COLUMN "home_order";
  ALTER TABLE "_cms_products_v" DROP COLUMN "version_featured_on_home";
  ALTER TABLE "_cms_products_v" DROP COLUMN "version_home_order";`)
}
