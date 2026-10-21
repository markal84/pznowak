export function buildCatalogImport(collection) {
  if (!collection || !Array.isArray(collection.products) || !Array.isArray(collection.gallery)) {
    throw new TypeError("Catalog must contain products and gallery arrays");
  }

  const products = collection.products.map((product, index) => {
    if (!Number.isInteger(product.id) || !product.slug || !product.name) {
      throw new TypeError(`Invalid product at index ${index}`);
    }

    const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    if (images.length === 0) {
      throw new TypeError(`Product ${product.id} has no image`);
    }

    const media = images.map((sourceUrl, position) => ({
      kind: "image",
      sourceUrl,
      altText: `${product.name} - zdjęcie ${position + 1}`,
      position,
      isPrimary: position === 0,
    }));

    if (product.video) {
      media.push({
        kind: "video",
        sourceUrl: product.video,
        altText: `${product.name} - film`,
        position: 0,
        isPrimary: false,
      });
    }

    return {
      id: product.id,
      wordpressId: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description ?? "",
      lead: product.lead ?? "",
      imagePath: images[0],
      videoUrl: product.video ?? "",
      metal: product.metal ?? "",
      stone: product.stone ?? "",
      carats: product.carats ?? "",
      clarity: product.clarity ?? "",
      status: "published",
      sortOrder: index,
      sourcePayload: product,
      media,
    };
  });

  const gallery = collection.gallery.map((item, index) => {
    if (!Number.isInteger(item.id) || !item.name || !item.image) {
      throw new TypeError(`Invalid gallery item at index ${index}`);
    }

    return {
      id: item.id,
      wordpressId: item.id,
      name: item.name,
      sourceUrl: item.image,
      altText: item.name,
      position: index,
      status: "published",
    };
  });

  return { products, gallery };
}
