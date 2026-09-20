import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { buildCatalogImport } from "../lib/catalog-import.js";
import { getDatabase } from "../lib/database.js";

const catalogUrl = new URL("../../src/lib/collection.json", import.meta.url);
const catalogSource = await readFile(fileURLToPath(catalogUrl), "utf8");
const catalog = buildCatalogImport(JSON.parse(catalogSource));
const sourceHash = createHash("sha256").update(catalogSource).digest("hex");
const sql = getDatabase({ direct: true });

for (const product of catalog.products) {
  const queries = [sql`
    INSERT INTO products (
      id,
      wordpress_id,
      slug,
      name,
      description,
      lead,
      image_path,
      video_url,
      metal,
      stone,
      carats,
      clarity,
      status,
      sort_order,
      source_payload,
      published_at
    )
    VALUES (
      ${product.id},
      ${product.wordpressId},
      ${product.slug},
      ${product.name},
      ${product.description},
      ${product.lead},
      ${product.imagePath},
      ${product.videoUrl},
      ${product.metal},
      ${product.stone},
      ${product.carats},
      ${product.clarity},
      ${product.status},
      ${product.sortOrder},
      ${JSON.stringify(product.sourcePayload)}::jsonb,
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      wordpress_id = EXCLUDED.wordpress_id,
      slug = EXCLUDED.slug,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      lead = EXCLUDED.lead,
      image_path = EXCLUDED.image_path,
      video_url = EXCLUDED.video_url,
      metal = EXCLUDED.metal,
      stone = EXCLUDED.stone,
      carats = EXCLUDED.carats,
      clarity = EXCLUDED.clarity,
      status = EXCLUDED.status,
      sort_order = EXCLUDED.sort_order,
      source_payload = EXCLUDED.source_payload,
      published_at = COALESCE(products.published_at, EXCLUDED.published_at),
      updated_at = now()
  `];

  for (const media of product.media) {
    queries.push(sql`
      INSERT INTO product_media (
        product_id,
        kind,
        source_url,
        alt_text,
        position,
        is_primary
      )
      VALUES (
        ${product.id},
        ${media.kind},
        ${media.sourceUrl},
        ${media.altText},
        ${media.position},
        ${media.isPrimary}
      )
      ON CONFLICT (product_id, kind, position) DO UPDATE SET
        source_url = EXCLUDED.source_url,
        public_url = CASE
          WHEN product_media.source_url = EXCLUDED.source_url THEN product_media.public_url
          ELSE NULL
        END,
        alt_text = EXCLUDED.alt_text,
        is_primary = EXCLUDED.is_primary,
        updated_at = now()
    `);
  }

  const imageCount = product.media.filter(({ kind }) => kind === "image").length;
  const hasVideo = product.media.some(({ kind }) => kind === "video");
  queries.push(sql`
    DELETE FROM product_media
    WHERE product_id = ${product.id}
      AND kind = 'image'
      AND position >= ${imageCount}
  `);

  if (!hasVideo) {
    queries.push(sql`
      DELETE FROM product_media
      WHERE product_id = ${product.id} AND kind = 'video'
    `);
  }

  await sql.transaction(queries);
}

const galleryQueries = [];

for (const item of catalog.gallery) {
  galleryQueries.push(sql`
    INSERT INTO gallery_items (
      id,
      wordpress_id,
      name,
      source_url,
      alt_text,
      position,
      status
    )
    VALUES (
      ${item.id},
      ${item.wordpressId},
      ${item.name},
      ${item.sourceUrl},
      ${item.altText},
      ${item.position},
      ${item.status}
    )
    ON CONFLICT (id) DO UPDATE SET
      wordpress_id = EXCLUDED.wordpress_id,
      name = EXCLUDED.name,
      source_url = EXCLUDED.source_url,
      public_url = CASE
        WHEN gallery_items.source_url = EXCLUDED.source_url THEN gallery_items.public_url
        ELSE NULL
      END,
      alt_text = EXCLUDED.alt_text,
      position = EXCLUDED.position,
      status = EXCLUDED.status,
      updated_at = now()
  `);
}

await sql.transaction(galleryQueries);

const mediaCount = catalog.products.reduce((count, product) => count + product.media.length, 0);

await sql`
  INSERT INTO catalog_imports (
    source,
    source_hash,
    product_count,
    media_count,
    gallery_count
  )
  VALUES (
    'src/lib/collection.json',
    ${sourceHash},
    ${catalog.products.length},
    ${mediaCount},
    ${catalog.gallery.length}
  )
`;

console.log(
  `Imported ${catalog.products.length} products, ${mediaCount} media entries and ${catalog.gallery.length} gallery items.`,
);
