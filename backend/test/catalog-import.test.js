import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildCatalogImport } from "../lib/catalog-import.js";

const catalogSource = await readFile(new URL("../../src/lib/collection.json", import.meta.url), "utf8");
const catalog = buildCatalogImport(JSON.parse(catalogSource));

test("catalog import maps all repository products and gallery items", () => {
  assert.equal(catalog.products.length, 34);
  assert.equal(catalog.gallery.length, 11);
  assert.equal(
    catalog.products.reduce((count, product) => count + product.media.length, 0),
    133,
  );
});

test("catalog import keeps the first image compatible with the public API", () => {
  const merope = catalog.products.find(({ id }) => id === 529);

  assert.equal(merope.imagePath, "/jewelry/1-57-1024x683.jpg");
  assert.equal(merope.media[0].isPrimary, true);
  assert.equal(merope.media[0].position, 0);
  assert.equal(merope.wordpressId, 529);
  assert.equal(merope.status, "published");
});

test("catalog import rejects a product without an image", () => {
  assert.throws(
    () =>
      buildCatalogImport({
        products: [{ id: 1, slug: "test", name: "Test", images: [] }],
        gallery: [],
      }),
    /has no image/,
  );
});
