import assert from "node:assert/strict";
import test from "node:test";

import { createProductsHandler } from "../api/products.js";

const testProducts = [
  {
    id: 529,
    slug: "merope-2",
    name: "Merope",
    lead: "Elegancki pierścionek Merope",
    imagePath: "/jewelry/1-57-1024x683.jpg",
    metal: "Złoto",
    stone: "",
  },
  {
    id: 517,
    slug: "electra-2",
    name: "Electra",
    lead: "Topaz mystic o cudownej tęczowej barwie z diamentami",
    imagePath: "/jewelry/1-54-1024x683.jpg",
    metal: "Złoto",
    stone: "Topaz i diament",
  },
  {
    id: 503,
    slug: "prometheus-2",
    name: "Prometheus",
    lead: "Pierścionek z naturalnymi szafirami i szmaragdem",
    imagePath: "/jewelry/1-51-1024x683.jpg",
    metal: "Złoto",
    stone: "Szafir i szmaragd",
  },
];

function createHandler({ products = testProducts, available = 8, error } = {}) {
  return createProductsHandler({
    logger: { error() {} },
    async loadProducts(limit) {
      if (error) {
        throw error;
      }

      return {
        products: products.slice(0, limit),
        available,
      };
    },
  });
}

function createResponse() {
  return {
    body: undefined,
    headers: {},
    statusCode: undefined,
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

test("GET /products returns three unique products from Payload CMS", async () => {
  const response = createResponse();
  const productsHandler = createHandler();

  await productsHandler({ method: "GET", query: {} }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.products.length, 3);
  assert.equal(new Set(response.body.products.map(({ id }) => id)).size, 3);
  assert.equal(response.body.meta.available, 8);
  assert.equal(response.body.meta.randomized, true);
  assert.equal(response.body.meta.source, "payload_cms");

  for (const product of response.body.products) {
    assert.equal(typeof product.name, "string");
    assert.match(product.imagePath, /^\/jewelry\//);
  }
});

test("GET /products accepts a bounded limit", async () => {
  const response = createResponse();
  const productsHandler = createHandler({
    products: [...testProducts, ...testProducts.map((product) => ({ ...product, id: product.id + 1000 }))],
  });

  await productsHandler({ method: "GET", query: { limit: "5" } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.products.length, 5);
});

test("GET /products falls back to three products for an invalid limit", async () => {
  const response = createResponse();
  const productsHandler = createHandler();

  await productsHandler({ method: "GET", query: { limit: "invalid" } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.products.length, 3);
});

test("POST /products is rejected", async () => {
  const response = createResponse();
  const productsHandler = createHandler();

  await productsHandler({ method: "POST", query: {} }, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.body.error, "method_not_allowed");
});

test("database errors return a safe service unavailable response", async () => {
  const response = createResponse();
  const productsHandler = createHandler({ error: new Error("connection failed") });

  await productsHandler({ method: "GET", query: {} }, response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.error, "database_unavailable");
  assert.doesNotMatch(response.body.message, /connection failed/);
});
