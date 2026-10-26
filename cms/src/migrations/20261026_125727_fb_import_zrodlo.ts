import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_products" ADD COLUMN "source_facebook_key" varchar;
  ALTER TABLE "cms_products" ADD COLUMN "source_facebook_payload" jsonb;
  ALTER TABLE "_cms_products_v" ADD COLUMN "version_source_facebook_key" varchar;
  ALTER TABLE "_cms_products_v" ADD COLUMN "version_source_facebook_payload" jsonb;
  CREATE UNIQUE INDEX "cms_products_source_source_facebook_key_idx" ON "cms_products" USING btree ("source_facebook_key");
  CREATE INDEX "_cms_products_v_version_source_version_source_facebook_k_idx" ON "_cms_products_v" USING btree ("version_source_facebook_key");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "cms_products_source_source_facebook_key_idx";
  DROP INDEX "_cms_products_v_version_source_version_source_facebook_k_idx";
  ALTER TABLE "cms_products" DROP COLUMN "source_facebook_key";
  ALTER TABLE "cms_products" DROP COLUMN "source_facebook_payload";
  ALTER TABLE "_cms_products_v" DROP COLUMN "version_source_facebook_key";
  ALTER TABLE "_cms_products_v" DROP COLUMN "version_source_facebook_payload";`)
}
