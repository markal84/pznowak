import { products } from "../data/products.js";
import { getDatabase } from "../lib/database.js";

const sql = getDatabase();

for (const product of products) {
  await sql`
    INSERT INTO products (
      id,
      slug,
      name,
      lead,
      image_path,
      metal,
      stone,
      status
    )
    VALUES (
      ${product.id},
      ${product.slug},
      ${product.name},
      ${product.lead},
      ${product.imagePath},
      ${product.metal},
      ${product.stone},
      'published'
    )
    ON CONFLICT (id) DO UPDATE SET
      slug = EXCLUDED.slug,
      name = EXCLUDED.name,
      lead = EXCLUDED.lead,
      image_path = EXCLUDED.image_path,
      metal = EXCLUDED.metal,
      stone = EXCLUDED.stone,
      status = EXCLUDED.status,
      updated_at = now()
  `;
}

console.log(`Seeded ${products.length} products.`);
