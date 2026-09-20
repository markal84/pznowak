import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildMediaManifest } from "../lib/media-manifest.js";

const source = await readFile(new URL("../../src/lib/collection.json", import.meta.url), "utf8");
const manifest = buildMediaManifest(JSON.parse(source));

test("media manifest contains every unique image and video", () => {
  assert.equal(manifest.filter(({ kind }) => kind === "image").length, 110);
  assert.equal(manifest.filter(({ kind }) => kind === "video").length, 27);
  assert.equal(new Set(manifest.map(({ pathname }) => pathname)).size, 137);
});

test("media manifest uses stable paths separated by media kind", () => {
  const image = manifest.find(({ sourceUrl }) => sourceUrl === "/jewelry/1-57-1024x683.jpg");
  const video = manifest.find(({ sourceUrl }) => sourceUrl.endsWith("/vid-37.mp4"));

  assert.match(image.pathname, /^legacy\/images\/[a-f0-9]{12}-1-57-1024x683\.jpg$/);
  assert.match(video.pathname, /^legacy\/videos\/[a-f0-9]{12}-vid-37\.mp4$/);
});

test("media manifest rejects images outside the catalog directory", () => {
  assert.throws(
    () => buildMediaManifest({ products: [{ images: ["/private/file.jpg"] }], gallery: [] }),
    /Unsupported local image path/,
  );
});
