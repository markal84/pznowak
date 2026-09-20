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
        image_path AS "imagePath",
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
