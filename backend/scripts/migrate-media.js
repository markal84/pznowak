import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

import { list, put } from "@vercel/blob";

import { getDatabase } from "../lib/database.js";
import { buildMediaManifest } from "../lib/media-manifest.js";

const catalogUrl = new URL("../../src/lib/collection.json", import.meta.url);
const catalog = JSON.parse(await readFile(fileURLToPath(catalogUrl), "utf8"));
const manifest = buildMediaManifest(catalog);
const sql = getDatabase({ direct: true });

async function listExistingBlobs() {
  const blobs = [];
  let cursor;

  do {
    const page = await list({ prefix: "legacy/", cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return new Map(blobs.map((blob) => [blob.pathname, blob]));
}

async function uploadMedia(entry) {
  if (entry.kind === "image") {
    const imageUrl = new URL(`../../public${entry.sourceUrl}`, import.meta.url);
    const body = await readFile(fileURLToPath(imageUrl));

    return put(entry.pathname, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 31_536_000,
      contentType: "image/jpeg",
    });
  }

  const response = await fetch(entry.sourceUrl, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok || !response.body) {
    throw new Error(`Cannot download ${entry.sourceUrl}: HTTP ${response.status}`);
  }

  return put(entry.pathname, Readable.fromWeb(response.body), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: false,
    cacheControlMaxAge: 31_536_000,
    contentType: response.headers.get("content-type") ?? "video/mp4",
    multipart: true,
  });
}

async function mapWithConcurrency(items, concurrency, task) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await task(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

const existing = await listExistingBlobs();
let uploaded = 0;
let reused = 0;

const migrated = await mapWithConcurrency(manifest, 4, async (entry, index) => {
  const stored = existing.get(entry.pathname);
  if (stored) {
    reused += 1;
    return { ...entry, publicUrl: stored.url };
  }

  const blob = await uploadMedia(entry);
  uploaded += 1;
  console.log(`[${index + 1}/${manifest.length}] Uploaded ${entry.kind}: ${entry.pathname}`);
  return { ...entry, publicUrl: blob.url };
});

for (const entry of migrated) {
  await sql`
    UPDATE product_media
    SET public_url = ${entry.publicUrl}, updated_at = now()
    WHERE kind = ${entry.kind} AND source_url = ${entry.sourceUrl}
  `;

  if (entry.kind === "image") {
    await sql`
      UPDATE gallery_items
      SET public_url = ${entry.publicUrl}, updated_at = now()
      WHERE source_url = ${entry.sourceUrl}
    `;
  }
}

const [productMedia, galleryMedia] = await Promise.all([
  sql`
    SELECT
      COUNT(*)::integer AS total,
      COUNT(public_url)::integer AS migrated
    FROM product_media
  `,
  sql`
    SELECT
      COUNT(*)::integer AS total,
      COUNT(public_url)::integer AS migrated
    FROM gallery_items
  `,
]);

if (
  productMedia[0].total !== productMedia[0].migrated ||
  galleryMedia[0].total !== galleryMedia[0].migrated
) {
  throw new Error("Database media migration is incomplete");
}

console.log(
  `Media migration complete: ${uploaded} uploaded, ${reused} reused, ` +
    `${productMedia[0].migrated} product media and ${galleryMedia[0].migrated} gallery rows linked.`,
);
