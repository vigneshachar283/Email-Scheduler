# Email Job Scheduler

A full-stack, production-grade email scheduling system built as a portfolio
project adapted from ReachInbox.ai's hiring assignment. Accepts email send
requests via API, schedules them for a specific time using **BullMQ +
Redis** (no cron), sends via Ethereal fake SMTP, enforces per-hour rate
limits safely across multiple workers, and survives server restarts without
losing or duplicating jobs.

## Architecture overview

```
Frontend (Next.js) ──HTTP──▶ Express API ──writes──▶ Postgres (source of truth)
                                   │
                                   │ enqueues delayed job
                                   ▼
                             BullMQ Queue (Redis)
                                   │
                                   │ fires when delay elapses
                                   ▼
                       BullMQ Worker (separate process)
                          │                    │
                          ▼                    ▼
                    reads job from DB    sends via Ethereal SMTP
                          │                    │
                          └──────▶ updates status in Postgres
```

**Design principle:** Postgres is the source of truth for *what* should be
sent, to whom, and its current status. Redis/BullMQ is purely the timing
mechanism — it wakes the worker up at the right moment. This separation is
what makes restart-safety possible.

### How scheduling works

- `POST /emails/schedule` creates one `EmailJob` row per recipient in
  Postgres, staggered by `delayBetweenEmailsMs` starting from `startTime`.
- Each row gets a unique `idempotencyKey` (`campaignId:recipientEmail`).
- Each row is enqueued into BullMQ as a **delayed job**, using the DB row's
  own `id` as the BullMQ `jobId`. BullMQ refuses to create a second job with
  the same `jobId`, so re-running the same schedule call is a no-op — this
  is the first layer of idempotency.
- The worker also checks the DB status before sending (`SENT` → skip) as a
  second layer, in case a job is somehow delivered to the worker twice.

### How persistence on restart is handled

- Redis is run with `--appendonly yes` (see `backend/docker-compose.yml`),
  so BullMQ's delayed jobs survive a Redis container restart.
- On API server boot, `reconcilePendingJobs()` runs as a defensive backstop:
  it scans Postgres for `PENDING`/`QUEUED`/`RESCHEDULED` rows that have no
  matching job in Redis (only relevant if Redis data itself was wiped) and
  re-enqueues them using the same `emailJobId`-as-`jobId` trick, so nothing
  is double-sent even in that edge case.
- The worker process is independent from the API process — restarting one
  doesn't affect jobs already sitting in Redis.

### How rate limiting & concurrency are implemented

- **Concurrency**: `WORKER_CONCURRENCY` env var passed directly to BullMQ's
  `Worker` constructor — how many jobs run in parallel.
- **Minimum delay between sends**: enforced via BullMQ's built-in `limiter`
  option (`{ max: 1, duration: MIN_DELAY_BETWEEN_EMAILS_MS }`) on the
  Worker, which throttles the whole queue's throughput queue-wide,
  regardless of concurrency.
- **Per-hour rate limit**: a Redis `INCR`/`EXPIRE`-based counter, bucketed
  by `sender+campaign+hourEpoch` (see `src/services/rateLimiter.ts`). This
  is safe across multiple worker instances because the counter lives in
  Redis, not in a process-local variable — every worker instance shares the
  same source of truth. Buckets reset at the top of each clock hour (a
  cheap trade-off vs. a true rolling 60-minute window using a sorted set).
- **Rescheduling instead of dropping**: when a job would exceed the hourly
  limit, the worker calls `job.moveToDelayed()` to push it to the start of
  the next hour window and marks it `RESCHEDULED` in the DB — it is never
  failed or dropped.
- **Behavior under load (1000+ emails at once)**: each recipient gets its
  own staggered `scheduledFor` at schedule time, so they don't all fire in
  the same instant. Once the hourly quota is hit, remaining jobs cascade
  into subsequent hour windows automatically via the reschedule logic
  above, preserving order as much as possible.

## Features implemented

**Backend**
- [x] BullMQ delayed-job scheduler (no cron)
- [x] Configurable worker concurrency
- [x] Configurable minimum delay between sends (BullMQ limiter)
- [x] Configurable per-hour rate limiting, Redis-backed, safe across workers
- [x] Jobs rescheduled (not dropped) when rate limit is hit
- [x] Idempotency (DB unique key + BullMQ jobId dedup + status check)
- [x] Restart persistence (Redis AOF + DB reconciliation backstop)
- [x] CSV/text recipient file upload parsing
- [x] Ethereal SMTP sending with preview URLs

**Frontend**
- [x] Login (see note on scope below)
- [x] Dashboard with header (user info + logout)
- [x] Scheduled Emails / Sent Emails tabs
- [x] Compose modal: subject, body, recipient file upload with detected
      count, start time, delay, hourly limit
- [x] Tables with loading and empty states
- [x] Basic error handling

## Assumptions, shortcuts & trade-offs

- **Mock login instead of real Google OAuth.** The assignment asks for real
  OAuth; for this solo/portfolio build, the engineering time was
  deliberately weighted toward the scheduler internals (queueing, rate
  limiting, persistence) since that's the harder and more differentiating
  part. The auth layer is structurally the same shape it would be with real
  OAuth (signed token, middleware guard, `req.user`), so swapping in
  `passport-google-oauth20` later is a contained change — see
  `backend/src/middleware/mockAuth.ts` for the note on how.
- Hourly rate-limit buckets reset on the clock hour rather than being a
  strict rolling 60-minute window — documented trade-off above.
- The Figma-matching pixel-perfect frontend work was skipped in favor of a
  clean, functional UI covering all required screens/states.

## Running locally

### 1. Start infra
```bash
cd backend
docker compose up -d       # Postgres + Redis
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed                # creates an Ethereal test sender
```

### 2. Start the backend (two processes)
```bash
npm run dev                 # API server on :4000
npm run worker              # BullMQ worker, in a separate terminal
```

### 3. Start the frontend
```bash
cd ../frontend
cp .env.local.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

Log in with any name/email (mock auth), then use **Compose New Email** to
schedule a campaign. Sent-mail previews are viewable at
https://ethereal.email/login using the seeded sender's credentials (printed
by `npm run seed`).

### Testing the restart guarantee
1. Schedule a campaign a few minutes out.
2. Stop the worker (`Ctrl+C`).
3. Restart it (`npm run worker`) — the job is still in Redis and fires at
   its original scheduled time, not from scratch.
