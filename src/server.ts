import { build_app } from "./app.js";

const app = build_app();
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

async function start_server(): Promise<void> {
  try {
    await app.listen({
      host: "0.0.0.0",
      port,
    });
  } catch (error: unknown) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

async function stop_server(signal: NodeJS.Signals): Promise<void> {
  app.log.info({ signal }, "stopping server");
  await app.close();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void stop_server(signal);
  });
}

await start_server();