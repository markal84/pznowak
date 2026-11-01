import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cms_works_kind" AS ENUM('zamowienie', 'przerobka');
  CREATE TYPE "public"."enum_cms_works_jewelry_type" AS ENUM('pierscionek', 'obraczka', 'kolczyki', 'inne');
  CREATE TYPE "public"."enum_cms_works_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_works_v_version_kind" AS ENUM('zamowienie', 'przerobka');
  CREATE TYPE "public"."enum__cms_works_v_version_jewelry_type" AS ENUM('pierscionek', 'obraczka', 'kolczyki', 'inne');
  CREATE TYPE "public"."enum__cms_works_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "cms_works_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"alt" varchar
  );
  
  CREATE TABLE "cms_works" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"kind" "enum_cms_works_kind" DEFAULT 'zamowienie',
  	"jewelry_type" "enum_cms_works_jewelry_type" DEFAULT 'pierscionek',
  	"year" numeric,
  	"task" varchar,
  	"what_we_did" varchar,
  	"duration" varchar,
  	"product_id" integer,
  	"needs_confirmation" boolean DEFAULT false,
  	"featured" boolean DEFAULT false,
  	"position" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_cms_works_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_cms_works_v_version_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"alt" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_cms_works_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_kind" "enum__cms_works_v_version_kind" DEFAULT 'zamowienie',
  	"version_jewelry_type" "enum__cms_works_v_version_jewelry_type" DEFAULT 'pierscionek',
  	"version_year" numeric,
  	"version_task" varchar,
  	"version_what_we_did" varchar,
  	"version_duration" varchar,
  	"version_product_id" integer,
  	"version_needs_confirmation" boolean DEFAULT false,
  	"version_featured" boolean DEFAULT false,
  	"version_position" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__cms_works_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cms_works_id" integer;
  ALTER TABLE "cms_works_photos" ADD CONSTRAINT "cms_works_photos_image_id_cms_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_works_photos" ADD CONSTRAINT "cms_works_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_works" ADD CONSTRAINT "cms_works_product_id_cms_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."cms_products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_works_v_version_photos" ADD CONSTRAINT "_cms_works_v_version_photos_image_id_cms_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_works_v_version_photos" ADD CONSTRAINT "_cms_works_v_version_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_works_v" ADD CONSTRAINT "_cms_works_v_parent_id_cms_works_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_works"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_works_v" ADD CONSTRAINT "_cms_works_v_version_product_id_cms_products_id_fk" FOREIGN KEY ("version_product_id") REFERENCES "public"."cms_products"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "cms_works_photos_order_idx" ON "cms_works_photos" USING btree ("_order");
  CREATE INDEX "cms_works_photos_parent_id_idx" ON "cms_works_photos" USING btree ("_parent_id");
  CREATE INDEX "cms_works_photos_image_idx" ON "cms_works_photos" USING btree ("image_id");
  CREATE UNIQUE INDEX "cms_works_slug_idx" ON "cms_works" USING btree ("slug");
  CREATE INDEX "cms_works_product_idx" ON "cms_works" USING btree ("product_id");
  CREATE INDEX "cms_works_featured_idx" ON "cms_works" USING btree ("featured");
  CREATE INDEX "cms_works_position_idx" ON "cms_works" USING btree ("position");
  CREATE INDEX "cms_works_updated_at_idx" ON "cms_works" USING btree ("updated_at");
  CREATE INDEX "cms_works_created_at_idx" ON "cms_works" USING btree ("created_at");
  CREATE INDEX "cms_works_deleted_at_idx" ON "cms_works" USING btree ("deleted_at");
  CREATE INDEX "cms_works__status_idx" ON "cms_works" USING btree ("_status");
  CREATE INDEX "_cms_works_v_version_photos_order_idx" ON "_cms_works_v_version_photos" USING btree ("_order");
  CREATE INDEX "_cms_works_v_version_photos_parent_id_idx" ON "_cms_works_v_version_photos" USING btree ("_parent_id");
  CREATE INDEX "_cms_works_v_version_photos_image_idx" ON "_cms_works_v_version_photos" USING btree ("image_id");
  CREATE INDEX "_cms_works_v_parent_idx" ON "_cms_works_v" USING btree ("parent_id");
  CREATE INDEX "_cms_works_v_version_version_slug_idx" ON "_cms_works_v" USING btree ("version_slug");
  CREATE INDEX "_cms_works_v_version_version_product_idx" ON "_cms_works_v" USING btree ("version_product_id");
  CREATE INDEX "_cms_works_v_version_version_featured_idx" ON "_cms_works_v" USING btree ("version_featured");
  CREATE INDEX "_cms_works_v_version_version_position_idx" ON "_cms_works_v" USING btree ("version_position");
  CREATE INDEX "_cms_works_v_version_version_updated_at_idx" ON "_cms_works_v" USING btree ("version_updated_at");
  CREATE INDEX "_cms_works_v_version_version_created_at_idx" ON "_cms_works_v" USING btree ("version_created_at");
  CREATE INDEX "_cms_works_v_version_version_deleted_at_idx" ON "_cms_works_v" USING btree ("version_deleted_at");
  CREATE INDEX "_cms_works_v_version_version__status_idx" ON "_cms_works_v" USING btree ("version__status");
  CREATE INDEX "_cms_works_v_created_at_idx" ON "_cms_works_v" USING btree ("created_at");
  CREATE INDEX "_cms_works_v_updated_at_idx" ON "_cms_works_v" USING btree ("updated_at");
  CREATE INDEX "_cms_works_v_latest_idx" ON "_cms_works_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_works_fk" FOREIGN KEY ("cms_works_id") REFERENCES "public"."cms_works"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_cms_works_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_works_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_works_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_works" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_works_v_version_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_works_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms_works_photos" CASCADE;
  DROP TABLE "cms_works" CASCADE;
  DROP TABLE "_cms_works_v_version_photos" CASCADE;
  DROP TABLE "_cms_works_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_works_fk";
  
  DROP INDEX "payload_locked_documents_rels_cms_works_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cms_works_id";
  DROP TYPE "public"."enum_cms_works_kind";
  DROP TYPE "public"."enum_cms_works_jewelry_type";
  DROP TYPE "public"."enum_cms_works_status";
  DROP TYPE "public"."enum__cms_works_v_version_kind";
  DROP TYPE "public"."enum__cms_works_v_version_jewelry_type";
  DROP TYPE "public"."enum__cms_works_v_version_status";`)
}
