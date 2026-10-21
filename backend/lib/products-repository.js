import { getDatabase } from "./database.js";

export async function loadRandomPublishedProducts(limit) {
  const sql = getDatabase();
  const [products, countRows] = await Promise.all([
    sql`
      SELECT
        COALESCE(legacy_wordpress_id::integer, cms_products.id) AS id,
        cms_products.slug,
        cms_products.name,
        cms_products.lead,
        COALESCE(
          (
            SELECT cms_media.url
            FROM cms_products_media
            JOIN cms_media ON cms_media.id = cms_products_media.asset_id
            WHERE cms_products_media._parent_id = cms_products.id
              AND cms_media.mime_type LIKE 'image/%'
              AND cms_media.deleted_at IS NULL
            ORDER BY cms_products_media.is_primary DESC, cms_products_media._order ASC
            LIMIT 1
          ),
          ''
        ) AS "imagePath",
        cms_products.metal,
        cms_products.stone
      FROM cms_products
      WHERE cms_products._status = 'published'
        AND cms_products.deleted_at IS NULL
        AND COALESCE(cms_products.archived, false) = false
      ORDER BY random()
      LIMIT ${limit}
    `,
    sql`
      SELECT COUNT(*)::integer AS count
      FROM cms_products
      WHERE cms_products._status = 'published'
        AND cms_products.deleted_at IS NULL
        AND COALESCE(cms_products.archived, false) = false
    `,
  ]);

  return {
    products,
    available: countRows[0]?.count ?? 0,
  };
}
