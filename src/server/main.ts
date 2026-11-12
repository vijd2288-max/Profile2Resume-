import { createApplicationServer } from "./app.js";
import { connectToDatabase } from "./db.js";
import { loadServerEnv } from "./env.js";

async function startServer(): Promise<void> {
  const env = loadServerEnv();
  await connectToDatabase(process.env);
  const server = createApplicationServer(process.env);
  server.listen(env.PORT, () => {
    console.info(`Profile2Resume listening on port ${env.PORT}`);
  });
}

void startServer().catch((error: unknown) => {
  console.error(
    "Profile2Resume startup failed",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exitCode = 1;
});
