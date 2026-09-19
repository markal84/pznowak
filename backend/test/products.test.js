import assert from "node:assert/strict";
import test from "node:test";

import productsHandler from "../api/products.js";

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

test("GET /products returns three unique real catalog products", () => {
  const response = createResponse();

  productsHandler({ method: "GET", query: {} }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.products.length, 3);
  assert.equal(new Set(response.body.products.map(({ id }) => id)).size, 3);
  assert.equal(response.body.meta.available, 8);
  assert.equal(response.body.meta.randomized, true);
  assert.equal(response.body.meta.source, "astra_snapshot");

  for (const product of response.body.products) {
    assert.equal(typeof product.name, "string");
    assert.match(product.imagePath, /^\/jewelry\//);
  }
});

test("GET /products accepts a bounded limit", () => {
  const response = createResponse();

  productsHandler({ method: "GET", query: { limit: "5" } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.products.length, 5);
});

test("GET /products falls back to three products for an invalid limit", () => {
  const response = createResponse();

  productsHandler({ method: "GET", query: { limit: "invalid" } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.products.length, 3);
});

test("POST /products is rejected", () => {
  const response = createResponse();

  productsHandler({ method: "POST", query: {} }, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.body.error, "method_not_allowed");
});
