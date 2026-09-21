import { build_app } from "./app.js";
import { ConfigurationError, load_config } from "./config.js";

async function main(): Promise<void> {
  const config = load_config(process.env);
  const app = build_app();
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void app.close().catch(() => {
        process.stderr.write("Shutdown failed.\n");
        process.exitCode = 1;
      });
    });
  }
  try {
    await app.listen({
      host: "0.0.0.0",
      port: config.port,
    });
  } catch {
    process.stderr.write("Startup failed: could not listen on the configured port.\n");
    await app.close();
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (error: unknown) {
  process.stderr.write(
    error instanceof ConfigurationError ? `${error.message}\n` : "Startup failed.\n",
  );
  process.exitCode = 1;
}
