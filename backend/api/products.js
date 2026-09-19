import { products } from "../data/products.js";

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

function parseLimit(value) {
  const firstValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(firstValue ?? "3", 10);

  if (!Number.isFinite(parsed)) {
    return 3;
  }

  return Math.min(Math.max(parsed, 1), 10);
}

function randomSample(items, count) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled.slice(0, count);
}

export default function productsHandler(request, response) {
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

  const limit = parseLimit(request.query?.limit);
  const sample = randomSample(products, limit);

  return response.status(200).json({
    products: sample,
    meta: {
      available: products.length,
      count: sample.length,
      randomized: true,
      source: "astra_snapshot",
    },
  });
}
