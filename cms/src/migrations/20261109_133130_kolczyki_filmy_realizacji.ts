import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Kolczyki w Realizacjach: pole „Filmy” (lista: film, podpis, okładka). Tylko dwie nowe tabele. Wygenerowany przez Payload
 * diff chciał też dodać kolumny `cms_media.prefix` i `_objectkey` (znany dryf z migracji Y, jak w AB); usunięte ręcznie.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "cms_works_videos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"file_id" integer,
  	"caption" varchar,
  	"poster_id" integer
  );
  
  CREATE TABLE "_cms_works_v_version_videos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"file_id" integer,
  	"caption" varchar,
  	"poster_id" integer,
  	"_uuid" varchar
  );
  
  ALTER TABLE "cms_works_videos" ADD CONSTRAINT "cms_works_videos_file_id_cms_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_works_videos" ADD CONSTRAINT "cms_works_videos_poster_id_cms_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_works_videos" ADD CONSTRAINT "cms_works_videos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cms_works_v_version_videos" ADD CONSTRAINT "_cms_works_v_version_videos_file_id_cms_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_works_v_version_videos" ADD CONSTRAINT "_cms_works_v_version_videos_poster_id_cms_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_works_v_version_videos" ADD CONSTRAINT "_cms_works_v_version_videos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cms_works_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cms_works_videos_order_idx" ON "cms_works_videos" USING btree ("_order");
  CREATE INDEX "cms_works_videos_parent_id_idx" ON "cms_works_videos" USING btree ("_parent_id");
  CREATE INDEX "cms_works_videos_file_idx" ON "cms_works_videos" USING btree ("file_id");
  CREATE INDEX "cms_works_videos_poster_idx" ON "cms_works_videos" USING btree ("poster_id");
  CREATE INDEX "_cms_works_v_version_videos_order_idx" ON "_cms_works_v_version_videos" USING btree ("_order");
  CREATE INDEX "_cms_works_v_version_videos_parent_id_idx" ON "_cms_works_v_version_videos" USING btree ("_parent_id");
  CREATE INDEX "_cms_works_v_version_videos_file_idx" ON "_cms_works_v_version_videos" USING btree ("file_id");
  CREATE INDEX "_cms_works_v_version_videos_poster_idx" ON "_cms_works_v_version_videos" USING btree ("poster_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms_works_videos" CASCADE;
  DROP TABLE "_cms_works_v_version_videos" CASCADE;`)
}
