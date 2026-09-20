import assert from "node:assert/strict";
import { test } from "node:test";

import { build_app } from "../src/app.js";

void test("Fastify application becomes ready and closes cleanly", async () => {
  const app = build_app();

  await app.ready();

  assert.equal(app.server.listening, false);

  await app.close();
});
