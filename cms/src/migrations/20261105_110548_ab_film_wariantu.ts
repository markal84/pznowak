import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Zlecenie AB: pole „Film” wariantu kamienia (prawdziwy film Pyrrhy i Nyx na fasonie Urania). Tylko nowa kolumna
 * `video_id` w tabelach wariantów. Wygenerowany przez Payload diff chciał też usunąć kolumny `cms_media.prefix`
 * i `_objectkey` (znany dryf z migracji Y); usunięte ręcznie – ta zmiana ich nie dotyczy.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_products_stone_variants" ADD COLUMN "video_id" integer;
  ALTER TABLE "_cms_products_v_version_stone_variants" ADD COLUMN "video_id" integer;
  ALTER TABLE "cms_products_stone_variants" ADD CONSTRAINT "cms_products_stone_variants_video_id_cms_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cms_products_v_version_stone_variants" ADD CONSTRAINT "_cms_products_v_version_stone_variants_video_id_cms_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "cms_products_stone_variants_video_idx" ON "cms_products_stone_variants" USING btree ("video_id");
  CREATE INDEX "_cms_products_v_version_stone_variants_video_idx" ON "_cms_products_v_version_stone_variants" USING btree ("video_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_products_stone_variants" DROP CONSTRAINT "cms_products_stone_variants_video_id_cms_media_id_fk";
  
  ALTER TABLE "_cms_products_v_version_stone_variants" DROP CONSTRAINT "_cms_products_v_version_stone_variants_video_id_cms_media_id_fk";
  
  DROP INDEX "cms_products_stone_variants_video_idx";
  DROP INDEX "_cms_products_v_version_stone_variants_video_idx";
  ALTER TABLE "cms_products_stone_variants" DROP COLUMN "video_id";
  ALTER TABLE "_cms_products_v_version_stone_variants" DROP COLUMN "video_id";`)
}
