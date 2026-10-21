import { createHash } from "node:crypto";
import path from "node:path";

function createPathname(kind, sourceUrl) {
  const sourcePath = new URL(sourceUrl, "https://local.invalid").pathname;
  const filename = decodeURIComponent(path.basename(sourcePath));
  const sourceHash = createHash("sha256").update(sourceUrl).digest("hex").slice(0, 12);

  return `legacy/${kind === "image" ? "images" : "videos"}/${sourceHash}-${filename}`;
}

export function buildMediaManifest(collection) {
  const imageSources = new Set();
  const videoSources = new Set();

  for (const product of collection.products ?? []) {
    for (const image of product.images ?? []) {
      if (image) imageSources.add(image);
    }
    if (product.video) videoSources.add(product.video);
  }

  for (const item of collection.gallery ?? []) {
    if (item.image) imageSources.add(item.image);
  }

  const images = [...imageSources].map((sourceUrl) => {
    if (!sourceUrl.startsWith("/jewelry/")) {
      throw new TypeError(`Unsupported local image path: ${sourceUrl}`);
    }

    return {
      kind: "image",
      sourceUrl,
      pathname: createPathname("image", sourceUrl),
    };
  });

  const videos = [...videoSources].map((sourceUrl) => {
    const source = new URL(sourceUrl);
    if (source.protocol !== "https:") {
      throw new TypeError(`Unsupported video URL: ${sourceUrl}`);
    }

    return {
      kind: "video",
      sourceUrl,
      pathname: createPathname("video", sourceUrl),
    };
  });

  return [...images, ...videos];
}
