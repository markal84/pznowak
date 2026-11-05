import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Zlecenie Z: dwa nowe kółka kolorów (`oliwkowy`, `londonblue`) w polu „Kolor kółka” wariantów kamieni.
 * Tylko wartości enuma. Wygenerowany przez Payload diff chciał też usunąć kolumny `cms_media.prefix` i `_objectkey`
 * (z migracji Y); usunięte ręcznie – ta zmiana ich nie dotyczy.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_cms_products_stone_variants_swatch" ADD VALUE 'oliwkowy' BEFORE 'niebieski';
  ALTER TYPE "public"."enum_cms_products_stone_variants_swatch" ADD VALUE 'londonblue' BEFORE 'jasnoniebieski';
  ALTER TYPE "public"."enum__cms_products_v_version_stone_variants_swatch" ADD VALUE 'oliwkowy' BEFORE 'niebieski';
  ALTER TYPE "public"."enum__cms_products_v_version_stone_variants_swatch" ADD VALUE 'londonblue' BEFORE 'jasnoniebieski';`)
}

/**
 * Postgres nie usuwa wartości z enuma, więc cofnięcie odtwarza enum bez nowych kółek. Wiersze z `oliwkowy`
 * i `londonblue` trzeba wcześniej przepisać (np. na `zielony` i `granatowy`), inaczej rzutowanie się nie uda.
 */
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_products_stone_variants" ALTER COLUMN "swatch" SET DATA TYPE text;
  DROP TYPE "public"."enum_cms_products_stone_variants_swatch";
  CREATE TYPE "public"."enum_cms_products_stone_variants_swatch" AS ENUM('zielony', 'niebieski', 'granatowy', 'jasnoniebieski', 'fioletowy', 'czerwony', 'rozowy', 'zolty', 'bialy');
  ALTER TABLE "cms_products_stone_variants" ALTER COLUMN "swatch" SET DATA TYPE "public"."enum_cms_products_stone_variants_swatch" USING "swatch"::"public"."enum_cms_products_stone_variants_swatch";
  ALTER TABLE "_cms_products_v_version_stone_variants" ALTER COLUMN "swatch" SET DATA TYPE text;
  DROP TYPE "public"."enum__cms_products_v_version_stone_variants_swatch";
  CREATE TYPE "public"."enum__cms_products_v_version_stone_variants_swatch" AS ENUM('zielony', 'niebieski', 'granatowy', 'jasnoniebieski', 'fioletowy', 'czerwony', 'rozowy', 'zolty', 'bialy');
  ALTER TABLE "_cms_products_v_version_stone_variants" ALTER COLUMN "swatch" SET DATA TYPE "public"."enum__cms_products_v_version_stone_variants_swatch" USING "swatch"::"public"."enum__cms_products_v_version_stone_variants_swatch";`)
}
