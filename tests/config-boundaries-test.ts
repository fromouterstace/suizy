import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { ConfigurationError, load_config } from "../src/config.js";

void test("defaults require no deferred secrets and never expose database credentials", () => {
  const config = load_config({});
  assert.equal(config.app_env, "development");
  assert.equal(config.port, 3000);
  assert.equal(config.resource_namespace, "suizy-development");
  assert.equal(config.database_configured, false);
  assert.ok(Object.isFrozen(config));
  const configured = load_config({
    DATABASE_ENV: "development",
    DATABASE_URL: "postgresql://synthetic:synthetic@localhost/synthetic",
  });
  assert.equal(configured.database_configured, true);
  assert.equal(JSON.stringify(configured).includes("synthetic"), false);
});

void test("explicit development, test and production contracts", () => {
  for (const app_env of ["development", "test", "production"]) {
    const config = load_config({
      APP_ENV: app_env,
      NODE_ENV: app_env,
      PUBLIC_BASE_URL: "https://synthetic.example",
    });
    assert.equal(config.app_env, app_env);
  }
  assert.throws(() => load_config({ NODE_ENV: "production" }), ConfigurationError);
  assert.throws(() => load_config({ APP_ENV: "production" }), ConfigurationError);
  assert.throws(
    () => load_config({ APP_ENV: "production", NODE_ENV: "production" }),
    ConfigurationError,
  );
});

void test("invalid ports and explicit blanks fail rather than partially parsing", () => {
  for (const port of ["", "0", "-1", "65536", "3000tail", "1.5", "1e3", " 3000 ", "Infinity"]) {
    assert.throws(() => load_config({ PORT: port }), ConfigurationError);
  }
  for (const port of ["1", "65535"]) {
    assert.equal(load_config({ PORT: port }).port, Number(port));
  }
  assert.throws(() => load_config({ APP_ENV: "" }), ConfigurationError);
});

void test("cross-environment databases and grants are rejected", () => {
  for (const environment of [
    { RESOURCE_NAMESPACE: "suizy-production" },
    { DATABASE_ENV: "production" },
    { PROVIDER_GRANT_ENV: "production" },
    { DATABASE_URL: "postgresql://synthetic:synthetic@localhost/synthetic" },
    { DATABASE_URL: "https://synthetic.example", DATABASE_ENV: "development" },
    { GOOGLE_CLOUD_PROJECT_ID: "suizy-production-example", PROVIDER_GRANT_ENV: "development" },
    { GOOGLE_CLOUD_PROJECT_ID: "suizy-development-example" },
  ]) {
    assert.throws(() => load_config(environment), ConfigurationError);
  }
});

void test("callbacks require matching origins, environment paths and grant labels", () => {
  const environment = {
    PUBLIC_BASE_URL: "https://synthetic.example",
    PROVIDER_GRANT_ENV: "development",
    GOOGLE_CLOUD_PROJECT_ID: "suizy-development-example",
    GOOGLE_OAUTH_REDIRECT_URI: "https://synthetic.example/development/oauth/google/callback",
    FATHOM_WEBHOOK_URL: "https://synthetic.example/development/webhooks/fathom",
  };
  assert.doesNotThrow(() => load_config(environment));
  for (const callback of [
    "https://other.example/development/oauth/google/callback",
    "https://synthetic.example/production/oauth/google/callback",
    "https://synthetic.example/development/oauth/google/callback?token=synthetic",
  ]) {
    assert.throws(
      () => load_config({ ...environment, GOOGLE_OAUTH_REDIRECT_URI: callback }),
      ConfigurationError,
    );
  }
  for (const url of [
    "not-a-url",
    "http://synthetic.example",
    "https://synthetic:synthetic@synthetic.example",
    "https://synthetic.example/path",
    "https://synthetic.example?token=synthetic",
    "https://synthetic.example#synthetic",
  ]) {
    assert.throws(() => load_config({ PUBLIC_BASE_URL: url }), ConfigurationError);
  }
  assert.throws(
    () =>
      load_config({
        APP_ENV: "production",
        NODE_ENV: "production",
        PUBLIC_BASE_URL: "http://localhost:3000",
      }),
    ConfigurationError,
  );
});

void test("test environment refuses live resources", () => {
  for (const extra of [
    { DATABASE_URL: "postgresql://synthetic:synthetic@localhost/synthetic", DATABASE_ENV: "test" },
    { GOOGLE_CLOUD_PROJECT_ID: "suizy-test-example", PROVIDER_GRANT_ENV: "test" },
    {
      PUBLIC_BASE_URL: "https://synthetic.example",
      FATHOM_WEBHOOK_URL: "https://synthetic.example/test/webhooks/fathom",
      PROVIDER_GRANT_ENV: "test",
    },
  ]) {
    assert.throws(() => load_config({ APP_ENV: "test", ...extra }), ConfigurationError);
  }
});

void test("invalid values never appear in the error or serialized config", () => {
  const sentinel = "SYNTHETIC_DO_NOT_LOG_12345";
  for (const field of ["PORT", "APP_ENV", "DATABASE_URL", "PUBLIC_BASE_URL"]) {
    assert.throws(
      () => load_config({ [field]: sentinel }),
      (error: unknown) => {
        assert.ok(error instanceof ConfigurationError);
        assert.equal(error.message.includes(sentinel), false);
        assert.ok(error.message.includes(field));
        return true;
      },
    );
  }
  assert.equal(
    JSON.stringify(load_config({ GOOGLE_OAUTH_CLIENT_SECRET: sentinel })).includes(sentinel),
    false,
  );
});

void test("invalid startup exits nonzero with no input leakage", async () => {
  const child = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    env: { PATH: process.env.PATH, PORT: "SYNTHETIC_DO_NOT_LOG_12345" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  const timer = setTimeout(() => child.kill("SIGKILL"), 10000);
  try {
    await once(child, "close");
    assert.equal(child.exitCode, 1);
    assert.match(output, /Invalid configuration: PORT/u);
    assert.equal(output.includes("SYNTHETIC_DO_NOT_LOG"), false);
  } finally {
    clearTimeout(timer);
    child.kill("SIGKILL");
  }
});

void test("safe startup opens a local listener and shuts down without provider secrets", async () => {
  const probe = net.createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();
  assert.ok(address !== null && typeof address !== "string");
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    probe.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    }),
  );
  const child = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    env: {
      PATH: process.env.PATH,
      APP_ENV: "development",
      NODE_ENV: "development",
      PORT: String(port),
    },
    stdio: "ignore",
  });
  const closed = once(child, "close");
  let listening = false;
  try {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${String(port)}/`, {
          signal: AbortSignal.timeout(250),
        });
        assert.equal(response.status, 404);
        listening = true;
        break;
      } catch {
        await delay(50);
      }
    }
    assert.ok(listening, "application must become ready without secrets");
    child.kill("SIGTERM");
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    try {
      await closed;
      assert.equal(child.exitCode, 0);
    } finally {
      clearTimeout(timer);
    }
  } finally {
    child.kill("SIGKILL");
  }
});
