import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cms_products_stone_variants_swatch" AS ENUM('zielony', 'niebieski', 'granatowy', 'jasnoniebieski', 'fioletowy', 'czerwony', 'rozowy', 'zolty', 'bialy');
  CREATE TYPE "public"."enum__cms_products_v_version_stone_variants_swatch" AS ENUM('zielony', 'niebieski', 'granatowy', 'jasnoniebieski', 'fioletowy', 'czerwony', 'rozowy', 'zolty', 'bialy');
  CREATE TABLE "cms_products_stone_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"stone" varchar,
  	"swatch" "enum_cms_products_stone_variants_swatch",
  	"image_id" integer,
  	"alt" varchar,
  	"is_visualization" boolean DEFAULT true
  );
  
  CREATE TABLE "_cms_products_v_version_stone_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"stone" varchar,
  	"swatch" "enum__cms_products_v_version_stone_variants_swatch",
  	"image_id" integer,
  	"alt" varchar,
  	"is_visualization" boolean DEFAULT true,
  	"_uuid" varchar
  );
  
  ALTER TABLE "cms_products_stone_variants" ADD CONSTRAINT "cms_products_stone_variants_image_id_cms_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_products_stone_variants" ADD CONSTRAINT "cms_products_stone_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_products_v_version_stone_variants" ADD CONSTRAINT "_cms_products_v_version_stone_variants_image_id_cms_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_products_v_version_stone_variants" ADD CONSTRAINT "_cms_products_v_version_stone_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cms_products_stone_variants_order_idx" ON "cms_products_stone_variants" USING btree ("_order");
  CREATE INDEX "cms_products_stone_variants_parent_id_idx" ON "cms_products_stone_variants" USING btree ("_parent_id");
  CREATE INDEX "cms_products_stone_variants_image_idx" ON "cms_products_stone_variants" USING btree ("image_id");
  CREATE INDEX "_cms_products_v_version_stone_variants_order_idx" ON "_cms_products_v_version_stone_variants" USING btree ("_order");
  CREATE INDEX "_cms_products_v_version_stone_variants_parent_id_idx" ON "_cms_products_v_version_stone_variants" USING btree ("_parent_id");
  CREATE INDEX "_cms_products_v_version_stone_variants_image_idx" ON "_cms_products_v_version_stone_variants" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms_products_stone_variants" CASCADE;
  DROP TABLE "_cms_products_v_version_stone_variants" CASCADE;
  DROP TYPE "public"."enum_cms_products_stone_variants_swatch";
  DROP TYPE "public"."enum__cms_products_v_version_stone_variants_swatch";`)
}
