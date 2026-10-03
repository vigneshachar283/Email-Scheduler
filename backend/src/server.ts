import { app } from "./app";
import { env } from "./config/env";
import { reconcilePendingJobs } from "./db/reconcile";
import { emailWorker } from "./queue/emailWorker";

async function main() {
  await reconcilePendingJobs();

  app.listen(env.PORT, () => {
    console.log(`[server] API listening on http://localhost:${env.PORT}`);
    console.log(
      `[server] BullMQ worker started with concurrency=${env.WORKER_CONCURRENCY}`
    );
  });
}

main().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});