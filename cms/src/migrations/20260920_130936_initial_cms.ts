import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cms_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_cms_gallery_items_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_gallery_items_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_cms_users_roles" AS ENUM('admin', 'editor');
  CREATE TYPE "public"."enum_cms_site_content_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_site_content_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "cms_products_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"asset_id" integer,
  	"is_primary" boolean DEFAULT false,
  	"alt" varchar
  );
  
  CREATE TABLE "cms_products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"lead" varchar,
  	"description" varchar,
  	"metal" varchar,
  	"stone" varchar,
  	"carats" varchar,
  	"clarity" varchar,
  	"legacy_wordpress_id" numeric,
  	"legacy_source_payload" jsonb,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_cms_products_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_cms_products_v_version_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"asset_id" integer,
  	"is_primary" boolean DEFAULT false,
  	"alt" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_cms_products_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_lead" varchar,
  	"version_description" varchar,
  	"version_metal" varchar,
  	"version_stone" varchar,
  	"version_carats" varchar,
  	"version_clarity" varchar,
  	"version_legacy_wordpress_id" numeric,
  	"version_legacy_source_payload" jsonb,
  	"version_sort_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__cms_products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms_media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"legacy_source_url" varchar,
  	"prefix" varchar DEFAULT 'cms/media',
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "cms_gallery_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"alt" varchar,
  	"position" numeric DEFAULT 0,
  	"wordpress_id" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_cms_gallery_items_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_cms_gallery_items_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_image_id" integer,
  	"version_alt" varchar,
  	"version_position" numeric DEFAULT 0,
  	"version_wordpress_id" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__cms_gallery_items_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms_users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_cms_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms_users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "cms_users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"cms_products_id" integer,
  	"cms_media_id" integer,
  	"cms_gallery_items_id" integer,
  	"cms_users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"cms_users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_site_content" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"home_heading" varchar,
  	"home_lead" varchar,
  	"about_heading" varchar,
  	"about_text" varchar,
  	"phone" varchar,
  	"email" varchar,
  	"address" varchar,
  	"opening_hours" varchar,
  	"_status" "enum_cms_site_content_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_cms_site_content_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_home_heading" varchar,
  	"version_home_lead" varchar,
  	"version_about_heading" varchar,
  	"version_about_text" varchar,
  	"version_phone" varchar,
  	"version_email" varchar,
  	"version_address" varchar,
  	"version_opening_hours" varchar,
  	"version__status" "enum__cms_site_content_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "cms_products_media" ADD CONSTRAINT "cms_products_media_asset_id_cms_media_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_products_media" ADD CONSTRAINT "cms_products_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_products_v_version_media" ADD CONSTRAINT "_cms_products_v_version_media_asset_id_cms_media_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_products_v_version_media" ADD CONSTRAINT "_cms_products_v_version_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_products_v" ADD CONSTRAINT "_cms_products_v_parent_id_cms_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_gallery_items" ADD CONSTRAINT "cms_gallery_items_image_id_cms_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_gallery_items_v" ADD CONSTRAINT "_cms_gallery_items_v_parent_id_cms_gallery_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_gallery_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_gallery_items_v" ADD CONSTRAINT "_cms_gallery_items_v_version_image_id_cms_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_users_roles" ADD CONSTRAINT "cms_users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_users_sessions" ADD CONSTRAINT "cms_users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("cms_products_id") REFERENCES "public"."cms_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("cms_media_id") REFERENCES "public"."cms_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_gallery_items_fk" FOREIGN KEY ("cms_gallery_items_id") REFERENCES "public"."cms_gallery_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("cms_users_id") REFERENCES "public"."cms_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("cms_users_id") REFERENCES "public"."cms_users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cms_products_media_order_idx" ON "cms_products_media" USING btree ("_order");
  CREATE INDEX "cms_products_media_parent_id_idx" ON "cms_products_media" USING btree ("_parent_id");
  CREATE INDEX "cms_products_media_asset_idx" ON "cms_products_media" USING btree ("asset_id");
  CREATE INDEX "cms_products_name_idx" ON "cms_products" USING btree ("name");
  CREATE UNIQUE INDEX "cms_products_slug_idx" ON "cms_products" USING btree ("slug");
  CREATE UNIQUE INDEX "cms_products_legacy_legacy_wordpress_id_idx" ON "cms_products" USING btree ("legacy_wordpress_id");
  CREATE INDEX "cms_products_sort_order_idx" ON "cms_products" USING btree ("sort_order");
  CREATE INDEX "cms_products_updated_at_idx" ON "cms_products" USING btree ("updated_at");
  CREATE INDEX "cms_products_created_at_idx" ON "cms_products" USING btree ("created_at");
  CREATE INDEX "cms_products_deleted_at_idx" ON "cms_products" USING btree ("deleted_at");
  CREATE INDEX "cms_products__status_idx" ON "cms_products" USING btree ("_status");
  CREATE INDEX "_cms_products_v_version_media_order_idx" ON "_cms_products_v_version_media" USING btree ("_order");
  CREATE INDEX "_cms_products_v_version_media_parent_id_idx" ON "_cms_products_v_version_media" USING btree ("_parent_id");
  CREATE INDEX "_cms_products_v_version_media_asset_idx" ON "_cms_products_v_version_media" USING btree ("asset_id");
  CREATE INDEX "_cms_products_v_parent_idx" ON "_cms_products_v" USING btree ("parent_id");
  CREATE INDEX "_cms_products_v_version_version_name_idx" ON "_cms_products_v" USING btree ("version_name");
  CREATE INDEX "_cms_products_v_version_version_slug_idx" ON "_cms_products_v" USING btree ("version_slug");
  CREATE INDEX "_cms_products_v_version_legacy_version_legacy_wordpress__idx" ON "_cms_products_v" USING btree ("version_legacy_wordpress_id");
  CREATE INDEX "_cms_products_v_version_version_sort_order_idx" ON "_cms_products_v" USING btree ("version_sort_order");
  CREATE INDEX "_cms_products_v_version_version_updated_at_idx" ON "_cms_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_cms_products_v_version_version_created_at_idx" ON "_cms_products_v" USING btree ("version_created_at");
  CREATE INDEX "_cms_products_v_version_version_deleted_at_idx" ON "_cms_products_v" USING btree ("version_deleted_at");
  CREATE INDEX "_cms_products_v_version_version__status_idx" ON "_cms_products_v" USING btree ("version__status");
  CREATE INDEX "_cms_products_v_created_at_idx" ON "_cms_products_v" USING btree ("created_at");
  CREATE INDEX "_cms_products_v_updated_at_idx" ON "_cms_products_v" USING btree ("updated_at");
  CREATE INDEX "_cms_products_v_latest_idx" ON "_cms_products_v" USING btree ("latest");
  CREATE INDEX "cms_media_updated_at_idx" ON "cms_media" USING btree ("updated_at");
  CREATE INDEX "cms_media_created_at_idx" ON "cms_media" USING btree ("created_at");
  CREATE INDEX "cms_media_deleted_at_idx" ON "cms_media" USING btree ("deleted_at");
  CREATE UNIQUE INDEX "cms_media_filename_idx" ON "cms_media" USING btree ("filename");
  CREATE INDEX "cms_gallery_items_image_idx" ON "cms_gallery_items" USING btree ("image_id");
  CREATE INDEX "cms_gallery_items_position_idx" ON "cms_gallery_items" USING btree ("position");
  CREATE UNIQUE INDEX "cms_gallery_items_wordpress_id_idx" ON "cms_gallery_items" USING btree ("wordpress_id");
  CREATE INDEX "cms_gallery_items_updated_at_idx" ON "cms_gallery_items" USING btree ("updated_at");
  CREATE INDEX "cms_gallery_items_created_at_idx" ON "cms_gallery_items" USING btree ("created_at");
  CREATE INDEX "cms_gallery_items_deleted_at_idx" ON "cms_gallery_items" USING btree ("deleted_at");
  CREATE INDEX "cms_gallery_items__status_idx" ON "cms_gallery_items" USING btree ("_status");
  CREATE INDEX "_cms_gallery_items_v_parent_idx" ON "_cms_gallery_items_v" USING btree ("parent_id");
  CREATE INDEX "_cms_gallery_items_v_version_version_image_idx" ON "_cms_gallery_items_v" USING btree ("version_image_id");
  CREATE INDEX "_cms_gallery_items_v_version_version_position_idx" ON "_cms_gallery_items_v" USING btree ("version_position");
  CREATE INDEX "_cms_gallery_items_v_version_version_wordpress_id_idx" ON "_cms_gallery_items_v" USING btree ("version_wordpress_id");
  CREATE INDEX "_cms_gallery_items_v_version_version_updated_at_idx" ON "_cms_gallery_items_v" USING btree ("version_updated_at");
  CREATE INDEX "_cms_gallery_items_v_version_version_created_at_idx" ON "_cms_gallery_items_v" USING btree ("version_created_at");
  CREATE INDEX "_cms_gallery_items_v_version_version_deleted_at_idx" ON "_cms_gallery_items_v" USING btree ("version_deleted_at");
  CREATE INDEX "_cms_gallery_items_v_version_version__status_idx" ON "_cms_gallery_items_v" USING btree ("version__status");
  CREATE INDEX "_cms_gallery_items_v_created_at_idx" ON "_cms_gallery_items_v" USING btree ("created_at");
  CREATE INDEX "_cms_gallery_items_v_updated_at_idx" ON "_cms_gallery_items_v" USING btree ("updated_at");
  CREATE INDEX "_cms_gallery_items_v_latest_idx" ON "_cms_gallery_items_v" USING btree ("latest");
  CREATE INDEX "cms_users_roles_order_idx" ON "cms_users_roles" USING btree ("order");
  CREATE INDEX "cms_users_roles_parent_idx" ON "cms_users_roles" USING btree ("parent_id");
  CREATE INDEX "cms_users_sessions_order_idx" ON "cms_users_sessions" USING btree ("_order");
  CREATE INDEX "cms_users_sessions_parent_id_idx" ON "cms_users_sessions" USING btree ("_parent_id");
  CREATE INDEX "cms_users_updated_at_idx" ON "cms_users" USING btree ("updated_at");
  CREATE INDEX "cms_users_created_at_idx" ON "cms_users" USING btree ("created_at");
  CREATE UNIQUE INDEX "cms_users_email_idx" ON "cms_users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_cms_products_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_products_id");
  CREATE INDEX "payload_locked_documents_rels_cms_media_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_media_id");
  CREATE INDEX "payload_locked_documents_rels_cms_gallery_items_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_gallery_items_id");
  CREATE INDEX "payload_locked_documents_rels_cms_users_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_cms_users_id_idx" ON "payload_preferences_rels" USING btree ("cms_users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "cms_site_content__status_idx" ON "cms_site_content" USING btree ("_status");
  CREATE INDEX "_cms_site_content_v_version_version__status_idx" ON "_cms_site_content_v" USING btree ("version__status");
  CREATE INDEX "_cms_site_content_v_created_at_idx" ON "_cms_site_content_v" USING btree ("created_at");
  CREATE INDEX "_cms_site_content_v_updated_at_idx" ON "_cms_site_content_v" USING btree ("updated_at");
  CREATE INDEX "_cms_site_content_v_latest_idx" ON "_cms_site_content_v" USING btree ("latest");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms_products_media" CASCADE;
  DROP TABLE "cms_products" CASCADE;
  DROP TABLE "_cms_products_v_version_media" CASCADE;
  DROP TABLE "_cms_products_v" CASCADE;
  DROP TABLE "cms_media" CASCADE;
  DROP TABLE "cms_gallery_items" CASCADE;
  DROP TABLE "_cms_gallery_items_v" CASCADE;
  DROP TABLE "cms_users_roles" CASCADE;
  DROP TABLE "cms_users_sessions" CASCADE;
  DROP TABLE "cms_users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "cms_site_content" CASCADE;
  DROP TABLE "_cms_site_content_v" CASCADE;
  DROP TYPE "public"."enum_cms_products_status";
  DROP TYPE "public"."enum__cms_products_v_version_status";
  DROP TYPE "public"."enum_cms_gallery_items_status";
  DROP TYPE "public"."enum__cms_gallery_items_v_version_status";
  DROP TYPE "public"."enum_cms_users_roles";
  DROP TYPE "public"."enum_cms_site_content_status";
  DROP TYPE "public"."enum__cms_site_content_v_version_status";`)
}
