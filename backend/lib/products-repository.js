import { getDatabase } from "./database.js";

export async function loadRandomPublishedProducts(limit) {
  const sql = getDatabase();
  const [products, countRows] = await Promise.all([
    sql`
      SELECT
        id,
        slug,
        name,
        lead,
        COALESCE(
          (
            SELECT COALESCE(product_media.public_url, product_media.source_url)
            FROM product_media
            WHERE product_media.product_id = products.id
              AND product_media.kind = 'image'
            ORDER BY product_media.is_primary DESC, product_media.position ASC
            LIMIT 1
          ),
          image_path
        ) AS "imagePath",
        metal,
        stone
      FROM products
      WHERE status = 'published'
      ORDER BY random()
      LIMIT ${limit}
    `,
    sql`
      SELECT COUNT(*)::integer AS count
      FROM products
      WHERE status = 'published'
    `,
  ]);

  return {
    products,
    available: countRows[0]?.count ?? 0,
  };
}
