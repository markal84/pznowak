import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_products" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "cms_products" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "cms_products" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "_cms_products_v" ADD COLUMN "version_meta_title" varchar;
  ALTER TABLE "_cms_products_v" ADD COLUMN "version_meta_description" varchar;
  ALTER TABLE "_cms_products_v" ADD COLUMN "version_meta_image_id" integer;
  ALTER TABLE "cms_products" ADD CONSTRAINT "cms_products_meta_image_id_cms_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_products_v" ADD CONSTRAINT "_cms_products_v_version_meta_image_id_cms_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "cms_products_meta_meta_image_idx" ON "cms_products" USING btree ("meta_image_id");
  CREATE INDEX "_cms_products_v_version_meta_version_meta_image_idx" ON "_cms_products_v" USING btree ("version_meta_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_products" DROP CONSTRAINT "cms_products_meta_image_id_cms_media_id_fk";
  
  ALTER TABLE "_cms_products_v" DROP CONSTRAINT "_cms_products_v_version_meta_image_id_cms_media_id_fk";
  
  DROP INDEX "cms_products_meta_meta_image_idx";
  DROP INDEX "_cms_products_v_version_meta_version_meta_image_idx";
  ALTER TABLE "cms_products" DROP COLUMN "meta_title";
  ALTER TABLE "cms_products" DROP COLUMN "meta_description";
  ALTER TABLE "cms_products" DROP COLUMN "meta_image_id";
  ALTER TABLE "_cms_products_v" DROP COLUMN "version_meta_title";
  ALTER TABLE "_cms_products_v" DROP COLUMN "version_meta_description";
  ALTER TABLE "_cms_products_v" DROP COLUMN "version_meta_image_id";`)
}
