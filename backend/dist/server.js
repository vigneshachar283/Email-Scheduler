"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const reconcile_1 = require("./db/reconcile");
async function main() {
 
    await (0, reconcile_1.reconcilePendingJobs)();
    app_1.app.listen(env_1.env.PORT, () => {
        console.log(`[server] API listening on http://localhost:${env_1.env.PORT}`);
        console.log(`[server] Run "npm run worker" in a separate process to start processing jobs.`);
    });
}
main().catch((err) => {
    console.error("[server] failed to start:", err);
    process.exit(1);
});
