import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "cms_products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"cms_media_id" integer
  );
  
  CREATE TABLE "_cms_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"cms_media_id" integer
  );
  
  ALTER TABLE "cms_products_rels" ADD CONSTRAINT "cms_products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_products_rels" ADD CONSTRAINT "cms_products_rels_media_fk" FOREIGN KEY ("cms_media_id") REFERENCES "public"."cms_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_products_v_rels" ADD CONSTRAINT "_cms_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_cms_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_products_v_rels" ADD CONSTRAINT "_cms_products_v_rels_media_fk" FOREIGN KEY ("cms_media_id") REFERENCES "public"."cms_media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cms_products_rels_order_idx" ON "cms_products_rels" USING btree ("order");
  CREATE INDEX "cms_products_rels_parent_idx" ON "cms_products_rels" USING btree ("parent_id");
  CREATE INDEX "cms_products_rels_path_idx" ON "cms_products_rels" USING btree ("path");
  CREATE INDEX "cms_products_rels_cms_media_id_idx" ON "cms_products_rels" USING btree ("cms_media_id");
  CREATE INDEX "_cms_products_v_rels_order_idx" ON "_cms_products_v_rels" USING btree ("order");
  CREATE INDEX "_cms_products_v_rels_parent_idx" ON "_cms_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_cms_products_v_rels_path_idx" ON "_cms_products_v_rels" USING btree ("path");
  CREATE INDEX "_cms_products_v_rels_cms_media_id_idx" ON "_cms_products_v_rels" USING btree ("cms_media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms_products_rels" CASCADE;
  DROP TABLE "_cms_products_v_rels" CASCADE;`)
}
