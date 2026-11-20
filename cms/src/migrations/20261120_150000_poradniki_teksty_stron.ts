import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Poradniki i teksty stron w panelu (20.11.2026).
 *
 * 1. Nowa kolekcja „Poradniki” (cms_guides + bloki sekcji, kamieni i przykładów cen, pytania, wersje robocze).
 * 2. Global „Teksty stron” (cms_site_content): usuwa nieużywane kolumny z pierwszej wersji panelu (nagłówek i wstęp
 *    strony głównej, opis pracowni, telefon, e-mail, adres, godziny – stare teksty z WordPressa, których nowa strona
 *    nigdy nie czytała; kontakt i godziny są w src/lib/site.ts) i dodaje pola nagłówków, wstępów, zdań przy cenach,
 *    pytań, opisów dla Google i paska z komunikatem. Nowe pola są puste, więc strona pokazuje teksty domyślne
 *    (src/content/page-texts.ts), dopóki `npm run tresci:przenies` albo panel ich nie wypełni.
 *
 * Kolumny usunięte w kroku 2 nie wracają z danymi przy `migrate:down` (wracają puste).
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cms_guides_blocks_stone_daily" AS ENUM('Bardzo dobry', 'Dobry', 'Dobry w ochronnej oprawie');
  CREATE TYPE "public"."enum_cms_guides_blocks_stone_catalog_filter" AS ENUM('niebieskie', 'zielone', 'rozowe', 'fioletowe', 'zolte', 'bezbarwne');
  CREATE TYPE "public"."enum_cms_guides_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cms_guides_v_blocks_stone_daily" AS ENUM('Bardzo dobry', 'Dobry', 'Dobry w ochronnej oprawie');
  CREATE TYPE "public"."enum__cms_guides_v_blocks_stone_catalog_filter" AS ENUM('niebieskie', 'zielone', 'rozowe', 'fioletowe', 'zolte', 'bezbarwne');
  CREATE TYPE "public"."enum__cms_guides_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "cms_guides_blocks_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"anchor" varchar,
  	"toc_label" varchar,
  	"content" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms_guides_blocks_stone" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"anchor" varchar,
  	"mohs" varchar,
  	"colors" varchar,
  	"daily" "enum_cms_guides_blocks_stone_daily",
  	"text" jsonb,
  	"catalog_stones" varchar,
  	"include_variants" boolean,
  	"catalog_filter" "enum_cms_guides_blocks_stone_catalog_filter",
  	"catalog_link_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms_guides_blocks_price_examples" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"anchor" varchar,
  	"toc_label" varchar,
  	"intro" jsonb,
  	"link_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms_guides_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "cms_guides" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar,
  	"slug" varchar,
  	"short" varchar,
  	"description" varchar,
  	"meta_title" varchar,
  	"topic" varchar,
  	"published" varchar,
  	"updated" varchar,
  	"minutes" numeric,
  	"order" numeric DEFAULT 10,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_cms_guides_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_cms_guides_v_blocks_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"anchor" varchar,
  	"toc_label" varchar,
  	"content" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_guides_v_blocks_stone" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"anchor" varchar,
  	"mohs" varchar,
  	"colors" varchar,
  	"daily" "enum__cms_guides_v_blocks_stone_daily",
  	"text" jsonb,
  	"catalog_stones" varchar,
  	"include_variants" boolean,
  	"catalog_filter" "enum__cms_guides_v_blocks_stone_catalog_filter",
  	"catalog_link_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_guides_v_blocks_price_examples" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"anchor" varchar,
  	"toc_label" varchar,
  	"intro" jsonb,
  	"link_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_cms_guides_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_cms_guides_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_lead" varchar,
  	"version_slug" varchar,
  	"version_short" varchar,
  	"version_description" varchar,
  	"version_meta_title" varchar,
  	"version_topic" varchar,
  	"version_published" varchar,
  	"version_updated" varchar,
  	"version_minutes" numeric,
  	"version_order" numeric DEFAULT 10,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__cms_guides_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cms_guides_id" integer;
  ALTER TABLE "cms_guides_blocks_section" ADD CONSTRAINT "cms_guides_blocks_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_guides_blocks_stone" ADD CONSTRAINT "cms_guides_blocks_stone_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_guides_blocks_price_examples" ADD CONSTRAINT "cms_guides_blocks_price_examples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_guides_faq" ADD CONSTRAINT "cms_guides_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_guides_v_blocks_section" ADD CONSTRAINT "_cms_guides_v_blocks_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_guides_v_blocks_stone" ADD CONSTRAINT "_cms_guides_v_blocks_stone_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_guides_v_blocks_price_examples" ADD CONSTRAINT "_cms_guides_v_blocks_price_examples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_guides_v_version_faq" ADD CONSTRAINT "_cms_guides_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_guides_v" ADD CONSTRAINT "_cms_guides_v_parent_id_cms_guides_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_guides"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "cms_guides_blocks_section_order_idx" ON "cms_guides_blocks_section" USING btree ("_order");
  CREATE INDEX "cms_guides_blocks_section_parent_id_idx" ON "cms_guides_blocks_section" USING btree ("_parent_id");
  CREATE INDEX "cms_guides_blocks_section_path_idx" ON "cms_guides_blocks_section" USING btree ("_path");
  CREATE INDEX "cms_guides_blocks_stone_order_idx" ON "cms_guides_blocks_stone" USING btree ("_order");
  CREATE INDEX "cms_guides_blocks_stone_parent_id_idx" ON "cms_guides_blocks_stone" USING btree ("_parent_id");
  CREATE INDEX "cms_guides_blocks_stone_path_idx" ON "cms_guides_blocks_stone" USING btree ("_path");
  CREATE INDEX "cms_guides_blocks_price_examples_order_idx" ON "cms_guides_blocks_price_examples" USING btree ("_order");
  CREATE INDEX "cms_guides_blocks_price_examples_parent_id_idx" ON "cms_guides_blocks_price_examples" USING btree ("_parent_id");
  CREATE INDEX "cms_guides_blocks_price_examples_path_idx" ON "cms_guides_blocks_price_examples" USING btree ("_path");
  CREATE INDEX "cms_guides_faq_order_idx" ON "cms_guides_faq" USING btree ("_order");
  CREATE INDEX "cms_guides_faq_parent_id_idx" ON "cms_guides_faq" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "cms_guides_slug_idx" ON "cms_guides" USING btree ("slug");
  CREATE INDEX "cms_guides_updated_at_idx" ON "cms_guides" USING btree ("updated_at");
  CREATE INDEX "cms_guides_created_at_idx" ON "cms_guides" USING btree ("created_at");
  CREATE INDEX "cms_guides__status_idx" ON "cms_guides" USING btree ("_status");
  CREATE INDEX "_cms_guides_v_blocks_section_order_idx" ON "_cms_guides_v_blocks_section" USING btree ("_order");
  CREATE INDEX "_cms_guides_v_blocks_section_parent_id_idx" ON "_cms_guides_v_blocks_section" USING btree ("_parent_id");
  CREATE INDEX "_cms_guides_v_blocks_section_path_idx" ON "_cms_guides_v_blocks_section" USING btree ("_path");
  CREATE INDEX "_cms_guides_v_blocks_stone_order_idx" ON "_cms_guides_v_blocks_stone" USING btree ("_order");
  CREATE INDEX "_cms_guides_v_blocks_stone_parent_id_idx" ON "_cms_guides_v_blocks_stone" USING btree ("_parent_id");
  CREATE INDEX "_cms_guides_v_blocks_stone_path_idx" ON "_cms_guides_v_blocks_stone" USING btree ("_path");
  CREATE INDEX "_cms_guides_v_blocks_price_examples_order_idx" ON "_cms_guides_v_blocks_price_examples" USING btree ("_order");
  CREATE INDEX "_cms_guides_v_blocks_price_examples_parent_id_idx" ON "_cms_guides_v_blocks_price_examples" USING btree ("_parent_id");
  CREATE INDEX "_cms_guides_v_blocks_price_examples_path_idx" ON "_cms_guides_v_blocks_price_examples" USING btree ("_path");
  CREATE INDEX "_cms_guides_v_version_faq_order_idx" ON "_cms_guides_v_version_faq" USING btree ("_order");
  CREATE INDEX "_cms_guides_v_version_faq_parent_id_idx" ON "_cms_guides_v_version_faq" USING btree ("_parent_id");
  CREATE INDEX "_cms_guides_v_parent_idx" ON "_cms_guides_v" USING btree ("parent_id");
  CREATE INDEX "_cms_guides_v_version_version_slug_idx" ON "_cms_guides_v" USING btree ("version_slug");
  CREATE INDEX "_cms_guides_v_version_version_updated_at_idx" ON "_cms_guides_v" USING btree ("version_updated_at");
  CREATE INDEX "_cms_guides_v_version_version_created_at_idx" ON "_cms_guides_v" USING btree ("version_created_at");
  CREATE INDEX "_cms_guides_v_version_version__status_idx" ON "_cms_guides_v" USING btree ("version__status");
  CREATE INDEX "_cms_guides_v_created_at_idx" ON "_cms_guides_v" USING btree ("created_at");
  CREATE INDEX "_cms_guides_v_updated_at_idx" ON "_cms_guides_v" USING btree ("updated_at");
  CREATE INDEX "_cms_guides_v_latest_idx" ON "_cms_guides_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_guides_fk" FOREIGN KEY ("cms_guides_id") REFERENCES "public"."cms_guides"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_cms_guides_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_guides_id");
  ALTER TABLE "cms_site_content" DROP COLUMN "home_heading";
  ALTER TABLE "cms_site_content" DROP COLUMN "home_lead";
  ALTER TABLE "cms_site_content" DROP COLUMN "about_heading";
  ALTER TABLE "cms_site_content" DROP COLUMN "about_text";
  ALTER TABLE "cms_site_content" DROP COLUMN "phone";
  ALTER TABLE "cms_site_content" DROP COLUMN "email";
  ALTER TABLE "cms_site_content" DROP COLUMN "address";
  ALTER TABLE "cms_site_content" DROP COLUMN "opening_hours";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_home_heading";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_home_lead";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_about_heading";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_about_text";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_phone";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_email";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_address";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_opening_hours";
  CREATE TABLE "cms_site_content_order_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"preview_only" boolean,
  	"preview_note" varchar
  );
  
  CREATE TABLE "cms_site_content_bands_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"preview_only" boolean,
  	"preview_note" varchar
  );
  
  CREATE TABLE "_cms_site_content_v_version_order_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"preview_only" boolean,
  	"preview_note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_cms_site_content_v_version_bands_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"preview_only" boolean,
  	"preview_note" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "cms_site_content" ADD COLUMN "home_title" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "home_intro" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "catalog_title" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "catalog_intro" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "catalog_price_note" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "catalog_meta_title" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "catalog_meta_description" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "order_title" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "order_intro" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "order_price_note" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "order_meta_title" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "order_meta_description" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "bands_title" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "bands_intro" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "bands_price" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "bands_price_note" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "bands_meta_title" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "bands_meta_description" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "guides_title" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "guides_intro" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "guides_meta_title" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "guides_meta_description" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "about_title" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "about_intro" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "announcement_text" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "announcement_link_url" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "announcement_link_label" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "announcement_until" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_home_title" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_home_intro" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_catalog_title" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_catalog_intro" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_catalog_price_note" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_catalog_meta_title" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_catalog_meta_description" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_order_title" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_order_intro" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_order_price_note" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_order_meta_title" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_order_meta_description" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_bands_title" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_bands_intro" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_bands_price" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_bands_price_note" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_bands_meta_title" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_bands_meta_description" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_guides_title" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_guides_intro" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_guides_meta_title" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_guides_meta_description" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_about_title" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_about_intro" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_announcement_text" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_announcement_link_url" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_announcement_link_label" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_announcement_until" varchar;
  ALTER TABLE "cms_site_content_order_faq" ADD CONSTRAINT "cms_site_content_order_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_site_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_site_content_bands_faq" ADD CONSTRAINT "cms_site_content_bands_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_site_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_site_content_v_version_order_faq" ADD CONSTRAINT "_cms_site_content_v_version_order_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_site_content_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_site_content_v_version_bands_faq" ADD CONSTRAINT "_cms_site_content_v_version_bands_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_site_content_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cms_site_content_order_faq_order_idx" ON "cms_site_content_order_faq" USING btree ("_order");
  CREATE INDEX "cms_site_content_order_faq_parent_id_idx" ON "cms_site_content_order_faq" USING btree ("_parent_id");
  CREATE INDEX "cms_site_content_bands_faq_order_idx" ON "cms_site_content_bands_faq" USING btree ("_order");
  CREATE INDEX "cms_site_content_bands_faq_parent_id_idx" ON "cms_site_content_bands_faq" USING btree ("_parent_id");
  CREATE INDEX "_cms_site_content_v_version_order_faq_order_idx" ON "_cms_site_content_v_version_order_faq" USING btree ("_order");
  CREATE INDEX "_cms_site_content_v_version_order_faq_parent_id_idx" ON "_cms_site_content_v_version_order_faq" USING btree ("_parent_id");
  CREATE INDEX "_cms_site_content_v_version_bands_faq_order_idx" ON "_cms_site_content_v_version_bands_faq" USING btree ("_order");
  CREATE INDEX "_cms_site_content_v_version_bands_faq_parent_id_idx" ON "_cms_site_content_v_version_bands_faq" USING btree ("_parent_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms_site_content_order_faq" CASCADE;
  DROP TABLE "cms_site_content_bands_faq" CASCADE;
  DROP TABLE "_cms_site_content_v_version_order_faq" CASCADE;
  DROP TABLE "_cms_site_content_v_version_bands_faq" CASCADE;
  ALTER TABLE "cms_site_content" DROP COLUMN "home_title";
  ALTER TABLE "cms_site_content" DROP COLUMN "home_intro";
  ALTER TABLE "cms_site_content" DROP COLUMN "catalog_title";
  ALTER TABLE "cms_site_content" DROP COLUMN "catalog_intro";
  ALTER TABLE "cms_site_content" DROP COLUMN "catalog_price_note";
  ALTER TABLE "cms_site_content" DROP COLUMN "catalog_meta_title";
  ALTER TABLE "cms_site_content" DROP COLUMN "catalog_meta_description";
  ALTER TABLE "cms_site_content" DROP COLUMN "order_title";
  ALTER TABLE "cms_site_content" DROP COLUMN "order_intro";
  ALTER TABLE "cms_site_content" DROP COLUMN "order_price_note";
  ALTER TABLE "cms_site_content" DROP COLUMN "order_meta_title";
  ALTER TABLE "cms_site_content" DROP COLUMN "order_meta_description";
  ALTER TABLE "cms_site_content" DROP COLUMN "bands_title";
  ALTER TABLE "cms_site_content" DROP COLUMN "bands_intro";
  ALTER TABLE "cms_site_content" DROP COLUMN "bands_price";
  ALTER TABLE "cms_site_content" DROP COLUMN "bands_price_note";
  ALTER TABLE "cms_site_content" DROP COLUMN "bands_meta_title";
  ALTER TABLE "cms_site_content" DROP COLUMN "bands_meta_description";
  ALTER TABLE "cms_site_content" DROP COLUMN "guides_title";
  ALTER TABLE "cms_site_content" DROP COLUMN "guides_intro";
  ALTER TABLE "cms_site_content" DROP COLUMN "guides_meta_title";
  ALTER TABLE "cms_site_content" DROP COLUMN "guides_meta_description";
  ALTER TABLE "cms_site_content" DROP COLUMN "about_title";
  ALTER TABLE "cms_site_content" DROP COLUMN "about_intro";
  ALTER TABLE "cms_site_content" DROP COLUMN "announcement_text";
  ALTER TABLE "cms_site_content" DROP COLUMN "announcement_link_url";
  ALTER TABLE "cms_site_content" DROP COLUMN "announcement_link_label";
  ALTER TABLE "cms_site_content" DROP COLUMN "announcement_until";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_home_title";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_home_intro";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_catalog_title";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_catalog_intro";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_catalog_price_note";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_catalog_meta_title";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_catalog_meta_description";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_order_title";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_order_intro";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_order_price_note";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_order_meta_title";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_order_meta_description";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_bands_title";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_bands_intro";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_bands_price";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_bands_price_note";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_bands_meta_title";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_bands_meta_description";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_guides_title";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_guides_intro";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_guides_meta_title";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_guides_meta_description";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_about_title";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_about_intro";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_announcement_text";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_announcement_link_url";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_announcement_link_label";
  ALTER TABLE "_cms_site_content_v" DROP COLUMN "version_announcement_until";
  ALTER TABLE "cms_guides_blocks_section" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_guides_blocks_stone" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_guides_blocks_price_examples" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_guides_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms_guides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_guides_v_blocks_section" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_guides_v_blocks_stone" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_guides_v_blocks_price_examples" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_guides_v_version_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cms_guides_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms_guides_blocks_section" CASCADE;
  DROP TABLE "cms_guides_blocks_stone" CASCADE;
  DROP TABLE "cms_guides_blocks_price_examples" CASCADE;
  DROP TABLE "cms_guides_faq" CASCADE;
  DROP TABLE "cms_guides" CASCADE;
  DROP TABLE "_cms_guides_v_blocks_section" CASCADE;
  DROP TABLE "_cms_guides_v_blocks_stone" CASCADE;
  DROP TABLE "_cms_guides_v_blocks_price_examples" CASCADE;
  DROP TABLE "_cms_guides_v_version_faq" CASCADE;
  DROP TABLE "_cms_guides_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_guides_fk";
  
  DROP INDEX "payload_locked_documents_rels_cms_guides_id_idx";
  ALTER TABLE "cms_site_content" ADD COLUMN "home_heading" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "home_lead" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "about_heading" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "about_text" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "phone" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "email" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "address" varchar;
  ALTER TABLE "cms_site_content" ADD COLUMN "opening_hours" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_home_heading" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_home_lead" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_about_heading" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_about_text" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_phone" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_email" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_address" varchar;
  ALTER TABLE "_cms_site_content_v" ADD COLUMN "version_opening_hours" varchar;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cms_guides_id";
  DROP TYPE "public"."enum_cms_guides_blocks_stone_daily";
  DROP TYPE "public"."enum_cms_guides_blocks_stone_catalog_filter";
  DROP TYPE "public"."enum_cms_guides_status";
  DROP TYPE "public"."enum__cms_guides_v_blocks_stone_daily";
  DROP TYPE "public"."enum__cms_guides_v_blocks_stone_catalog_filter";
  DROP TYPE "public"."enum__cms_guides_v_version_status";`)
}
