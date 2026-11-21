import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Parametry pierścionka (Marcin 21.11.2026): próba złota, szlif i wymiary kamienia głównego. Nowe kolumny w tabeli
 * kart i w tabeli wersji. Michał pracuje tylko w złocie próby 585, więc wszystkie istniejące karty (i ich wersje)
 * dostają 585 od razu. Szlif i wymiary zostają puste: szlif wpisuje `staging:szlif`, wymiary poda Michał.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cms_products_gold_fineness" AS ENUM('585', '750');
  CREATE TYPE "public"."enum_cms_products_stone_cut" AS ENUM('okragly', 'owalny', 'szmaragdowy', 'radiant', 'poduszka', 'kwadratowy', 'kropla', 'markiza', 'serce', 'kaboszon');
  CREATE TYPE "public"."enum__cms_products_v_version_gold_fineness" AS ENUM('585', '750');
  CREATE TYPE "public"."enum__cms_products_v_version_stone_cut" AS ENUM('okragly', 'owalny', 'szmaragdowy', 'radiant', 'poduszka', 'kwadratowy', 'kropla', 'markiza', 'serce', 'kaboszon');
  ALTER TABLE "cms_products" ADD COLUMN "gold_fineness" "enum_cms_products_gold_fineness" DEFAULT '585';
  ALTER TABLE "cms_products" ADD COLUMN "stone_cut" "enum_cms_products_stone_cut";
  ALTER TABLE "cms_products" ADD COLUMN "stone_size" varchar;
  ALTER TABLE "_cms_products_v" ADD COLUMN "version_gold_fineness" "enum__cms_products_v_version_gold_fineness" DEFAULT '585';
  ALTER TABLE "_cms_products_v" ADD COLUMN "version_stone_cut" "enum__cms_products_v_version_stone_cut";
  ALTER TABLE "_cms_products_v" ADD COLUMN "version_stone_size" varchar;
  UPDATE "cms_products" SET "gold_fineness" = '585' WHERE "gold_fineness" IS NULL;
  UPDATE "_cms_products_v" SET "version_gold_fineness" = '585' WHERE "version_gold_fineness" IS NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_products" DROP COLUMN "gold_fineness";
  ALTER TABLE "cms_products" DROP COLUMN "stone_cut";
  ALTER TABLE "cms_products" DROP COLUMN "stone_size";
  ALTER TABLE "_cms_products_v" DROP COLUMN "version_gold_fineness";
  ALTER TABLE "_cms_products_v" DROP COLUMN "version_stone_cut";
  ALTER TABLE "_cms_products_v" DROP COLUMN "version_stone_size";
  DROP TYPE "public"."enum_cms_products_gold_fineness";
  DROP TYPE "public"."enum_cms_products_stone_cut";
  DROP TYPE "public"."enum__cms_products_v_version_gold_fineness";
  DROP TYPE "public"."enum__cms_products_v_version_stone_cut";`)
}
