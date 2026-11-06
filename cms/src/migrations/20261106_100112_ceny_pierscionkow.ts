import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Ceny pierścionków: pole „Cena (zł)” w kolekcji Products (opcjonalne). Tylko nowa kolumna w tabeli kart i w tabeli
 * wersji; istniejące karty dostają pustą cenę („Cena na zapytanie”).
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_products" ADD COLUMN "price" numeric;
  ALTER TABLE "_cms_products_v" ADD COLUMN "version_price" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_products" DROP COLUMN "price";
  ALTER TABLE "_cms_products_v" DROP COLUMN "version_price";`)
}
