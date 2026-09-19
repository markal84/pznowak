import assert from "node:assert/strict";
import test from "node:test";

import healthHandler from "../api/health.js";

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

test("GET /health reports a ready service", () => {
  const response = createResponse();

  healthHandler({ method: "GET" }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.service, "pznowak-catalog-api");
  assert.equal(response.body.status, "ok");
  assert.match(response.body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(response.headers["Access-Control-Allow-Origin"], "*");
  assert.equal(response.headers["Cache-Control"], "no-store");
});

test("OPTIONS /health supports a browser preflight", () => {
  const response = createResponse();

  healthHandler({ method: "OPTIONS" }, response);

  assert.equal(response.statusCode, 204);
  assert.equal(response.ended, true);
  assert.equal(response.headers["Access-Control-Allow-Methods"], "GET, OPTIONS");
});

test("unsupported methods are rejected", () => {
  const response = createResponse();

  healthHandler({ method: "POST" }, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, "GET, OPTIONS");
  assert.equal(response.body.error, "method_not_allowed");
});
