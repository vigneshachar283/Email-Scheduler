import { app } from "./app";
import { env } from "./config/env";
import { reconcilePendingJobs } from "./db/reconcile";

async function main() {
  // Defensive backstop described in emailWorker.ts — re-enqueues any DB
  // rows that don't have a matching Redis job (only matters if Redis data
  // was lost; normally a no-op).
  await reconcilePendingJobs();

  app.listen(env.PORT, () => {
    console.log(`[server] API listening on http://localhost:${env.PORT}`);
    console.log(`[server] Run "npm run worker" in a separate process to start processing jobs.`);
  });
}

main().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});
