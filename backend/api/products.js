import { loadRandomPublishedProducts } from "../lib/products-repository.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function setHeaders(response) {
  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    response.setHeader(name, value);
  }

  response.setHeader("Cache-Control", "no-store");
}

export function parseLimit(value) {
  const firstValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(firstValue ?? "3", 10);

  if (!Number.isFinite(parsed)) {
    return 3;
  }

  return Math.min(Math.max(parsed, 1), 10);
}

export function createProductsHandler({
  loadProducts = loadRandomPublishedProducts,
  logger = console,
} = {}) {
  return async function productsHandler(request, response) {
    setHeaders(response);

    if (request.method === "OPTIONS") {
      return response.status(204).end();
    }

    if (request.method !== "GET") {
      response.setHeader("Allow", "GET, OPTIONS");
      return response.status(405).json({
        error: "method_not_allowed",
        message: "Use GET to read the product sample.",
      });
    }

    try {
      const limit = parseLimit(request.query?.limit);
      const { products, available } = await loadProducts(limit);

      return response.status(200).json({
        products,
        meta: {
          available,
          count: products.length,
          randomized: true,
          source: "payload_cms",
        },
      });
    } catch (error) {
      logger.error("Unable to read products from Neon", error);

      return response.status(503).json({
        error: "database_unavailable",
        message: "The product catalog is temporarily unavailable.",
      });
    }
  };
}

export default createProductsHandler();
