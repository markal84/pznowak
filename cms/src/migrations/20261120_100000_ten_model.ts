import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * „Ten model”: krótki tekst tylko dla jednej karty (80–120 słów), osobno od wspólnego opisu fasonu. Nowa kolumna w tabeli
 * kart i w tabeli wersji; istniejące karty dostają puste pole (na stronie nic się nie zmienia, dopóki go nie wypełnimy).
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_products" ADD COLUMN "unique_note" varchar;
  ALTER TABLE "_cms_products_v" ADD COLUMN "version_unique_note" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_products" DROP COLUMN "unique_note";
  ALTER TABLE "_cms_products_v" DROP COLUMN "version_unique_note";`)
}
