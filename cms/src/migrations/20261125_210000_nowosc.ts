import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Plakietka „Nowość” (Marcin 25.11.2026): data pierwszej publikacji karty. Przez 7 dni od niej karta ma na liście
 * plakietkę. Kolumna w tabeli kart i w tabeli wersji.
 *
 * Uzupełnienie dla kart już opublikowanych: najstarsza zachowana opublikowana wersja. Panel trzyma do 30 wersji na kartę,
 * więc przy karcie z kompletem 30 wersji najstarsze mogły zostać usunięte i najstarsza zachowana nie mówi, kiedy kartę
 * opublikowano: wtedy bierzemy dzień dodania karty (to stare, wielokrotnie poprawiane karty, plakietki i tak nie dostaną).
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_products" ADD COLUMN "published_at" timestamp(3) with time zone;
  ALTER TABLE "_cms_products_v" ADD COLUMN "version_published_at" timestamp(3) with time zone;
  WITH first_pub AS (
    SELECT "parent_id",
      MIN("created_at") FILTER (WHERE "version__status" = 'published') AS "first_published",
      COUNT(*) AS "versions"
    FROM "_cms_products_v"
    GROUP BY "parent_id"
  )
  UPDATE "cms_products" p
  SET "published_at" = CASE
      WHEN f."versions" < 30 AND f."first_published" IS NOT NULL THEN f."first_published"
      ELSE p."created_at"
    END
  FROM first_pub f
  WHERE f."parent_id" = p."id" AND p."_status" = 'published';
  UPDATE "cms_products" SET "published_at" = "created_at" WHERE "_status" = 'published' AND "published_at" IS NULL;
  UPDATE "_cms_products_v" v SET "version_published_at" = p."published_at"
  FROM "cms_products" p
  WHERE v."parent_id" = p."id" AND v."latest" = true;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_products" DROP COLUMN "published_at";
  ALTER TABLE "_cms_products_v" DROP COLUMN "version_published_at";`)
}
