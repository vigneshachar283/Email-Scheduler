# Email Job Scheduler

A full-stack email scheduling application built with **Next.js, Express, PostgreSQL, Redis, BullMQ, Prisma, and Google OAuth**.

The application allows users to sign in with Google, create email campaigns, schedule emails for future delivery, upload recipient lists, and track scheduled and sent emails from a dashboard.

Emails are scheduled using **BullMQ delayed jobs** and processed asynchronously by a separate worker. The system includes persistence across restarts, configurable concurrency, rate limiting, and Ethereal Email for safe email testing.

> This project uses BullMQ delayed jobs for scheduling and does not use cron.

---

## Features Implemented

### Backend

- Email scheduling using BullMQ delayed jobs
- PostgreSQL persistence for email jobs and application data
- Redis-backed BullMQ queue
- Separate worker process for asynchronous email processing
- Configurable worker concurrency
- Configurable minimum delay between email sends
- Redis-backed per-hour rate limiting
- Rescheduling of jobs instead of dropping them when limits are reached
- Idempotency protections to reduce duplicate processing
- Persistence and recovery of pending jobs after restart
- CSV/text recipient file upload and parsing
- Ethereal SMTP integration for safe email testing
- Google OAuth authentication
- JWT-based authentication for protected API routes

### Frontend

- Login using Google OAuth
- Protected dashboard
- User information and logout functionality
- Compose New Email interface
- Recipient file upload
- Detected recipient count
- Subject and email body input
- Configurable email start time
- Configurable delay between emails
- Configurable hourly limit
- Scheduled Emails table
- Sent Emails table
- Loading states
- Empty states
- Basic error handling

---

# Architecture Overview

```text
                         ┌─────────────────────┐
                         │  Next.js Frontend   │
                         └──────────┬──────────┘
                                    │
                                  HTTP
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Express API      │
                         └───────┬───────┬─────┘
                                 │       │
                    Stores data  │       │ Enqueues jobs
                                 │       │
                                 ▼       ▼
                       ┌─────────────┐ ┌─────────────┐
                       │ PostgreSQL  │ │ Redis/BullMQ│
                       │ Source of   │ │ Delayed Jobs│
                       │ Truth       │ └──────┬──────┘
                       └─────────────┘        │
                                              │
                                              ▼
                                      ┌───────────────┐
                                      │ BullMQ Worker │
                                      │ Separate      │
                                      │ Process       │
                                      └───────┬───────┘
                                              │
                                   ┌──────────┴──────────┐
                                   ▼                     ▼
                            Update PostgreSQL      Ethereal SMTP
                            Email Job Status       Send Email
```

## How Scheduling Works

1. The user logs in using Google OAuth.
2. The user creates an email campaign from the frontend.
3. The user uploads a recipient file and enters the email subject and body.
4. The user configures a start time, delay between emails, and hourly limit.
5. The frontend sends the campaign data to the Express API.
6. The backend creates email job records in PostgreSQL.
7. Each email is added to BullMQ as a delayed job.
8. When the scheduled time arrives, BullMQ makes the job available to the worker.
9. The BullMQ worker processes the job and sends the email through Ethereal SMTP.
10. The worker updates the email status in PostgreSQL.
11. The frontend displays emails in the Scheduled or Sent sections based on their status.

**BullMQ delayed jobs are used for scheduling instead of cron jobs.**

---

## How Persistence on Restart Works

PostgreSQL is the application's **source of truth** for email jobs and their status.

The application handles restart scenarios using the following approach:

- Email jobs and their statuses are stored persistently in PostgreSQL.
- BullMQ delayed jobs are stored in Redis.
- The API runs `reconcilePendingJobs()` during startup as a defensive recovery mechanism.
- Pending jobs that are present in the database but missing from the queue can be re-enqueued.
- Database job IDs are used when queueing jobs to help prevent duplicates.
- The worker checks the database status before processing an email to reduce duplicate sending.
- The API server and email worker run as separate processes.

This means that restarting the API or worker does not normally cause scheduled emails to be lost.

---

## Rate Limiting and Concurrency

### Worker Concurrency

Worker concurrency is configurable through the environment:

```env
WORKER_CONCURRENCY=5
```

This controls how many jobs the BullMQ worker can process concurrently.

### Minimum Delay Between Emails

The minimum delay between sends is also configurable:

```env
MIN_DELAY_BETWEEN_EMAILS_MS=2000
```

This prevents emails from being sent too quickly.

### Per-Hour Rate Limiting

The application uses Redis-backed counters to track email sending limits.

Because the rate-limit state is stored in Redis, the limit can be shared across worker instances.

When a job would exceed the configured hourly limit:

- The job is not dropped.
- The job is marked as rescheduled.
- The job is delayed until the next available sending window.

The implementation uses fixed hourly buckets instead of a rolling 60-minute window as a trade-off for simplicity.

---

# Setup and Running the Project

## Prerequisites

Install the following software before running the project:

- Node.js (v18 or newer recommended)
- npm
- Docker Desktop
- Git

You can verify the installations:

```bash
node -v
npm -v
docker --version
git --version
```

---

## 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd email-scheduler
```

The project contains two main folders:

```text
email-scheduler/
├── backend/
├── frontend/
└── README.md
```

---

# Backend Setup

## 2. Start PostgreSQL and Redis

Navigate to the backend folder:

```bash
cd backend
```

Start PostgreSQL and Redis using Docker:

```bash
docker compose up -d
```

Verify that the containers are running:

```bash
docker compose ps
```

PostgreSQL is used for persistent application data, while Redis is used for BullMQ jobs and rate limiting.

---

## 3. Configure Backend Environment Variables

Create a `.env` file inside the `backend` folder.

If `.env.example` is available, copy it:

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

### macOS/Linux

```bash
cp .env.example .env
```

Configure the `backend/.env` file:

```env
# Server
PORT=4000
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL="postgresql://scheduler:scheduler@localhost:5432/email_scheduler"

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Worker configuration
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS_MS=2000
MAX_EMAILS_PER_HOUR_GLOBAL=500

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback

# Application authentication
JWT_SECRET=replace_with_a_secure_random_secret
```

> **Security Note:** Never commit your actual `.env` file or secrets to GitHub.

---

## 4. Install Backend Dependencies

From the `backend` folder:

```bash
npm install
```

---

## 5. Set Up the Database

Generate the Prisma client:

```bash
npm run prisma:generate
```

Run the database migrations:

```bash
npm run prisma:migrate
```

This creates the database tables required by the application.

---

## 6. Set Up Ethereal Email

This project uses **Ethereal Email** for testing email delivery.

Ethereal is a fake SMTP service designed for development and testing. Emails are not delivered to real inboxes. Instead, Ethereal provides preview URLs that allow sent emails to be inspected in a browser.

Run the seed command from the backend directory:

```bash
npm run seed
```

This creates or configures the test sender used by the application.

When an email is successfully sent, the worker displays an Ethereal preview URL similar to:

```text
[worker] Sent <job-id> to example@example.com
[worker] job <job-id> completed
```

Open the preview URL printed in the terminal to inspect the sent email.

---

## 7. Start the Express API

From the `backend` directory:

```bash
npm run dev
```

The backend API runs at:

```text
http://localhost:4000
```

You can verify that it is running by opening:

```text
http://localhost:4000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

---

## 8. Start the BullMQ Worker

The email worker runs separately from the Express API.

Open a **second terminal**, navigate to the backend folder, and run:

```bash
npm run worker
```

The worker processes scheduled BullMQ jobs and sends emails.

You should see a message similar to:

```text
[worker] started — concurrency=5
```

---

# Frontend Setup

## 9. Install Frontend Dependencies

Open another terminal and navigate to the frontend folder:

```bash
cd frontend
npm install
```

---

## 10. Configure Frontend Environment Variables

Create a `.env.local` file inside the `frontend` folder.

For example:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

> Google OAuth secrets are stored only on the backend. Never put `GOOGLE_CLIENT_SECRET` in frontend environment variables.

---

## 11. Start the Next.js Frontend

From the `frontend` directory:

```bash
npm run dev
```

Open the application in your browser:

```text
http://localhost:3000
```

You can now log in using Google OAuth and use the Email Scheduler.

---

# Google OAuth Setup

The application uses Google OAuth through `passport-google-oauth20`.

## Steps

1. Open Google Cloud Console.
2. Create a new project or select an existing project.
3. Configure the OAuth Consent Screen.
4. Create an **OAuth 2.0 Client ID**.
5. Select **Web Application** as the application type.
6. Add the following Authorized Redirect URI:

```text
http://localhost:4000/auth/google/callback
```

7. Add the Client ID and Client Secret to `backend/.env`:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
```

After successful authentication, Google redirects the user back to the backend callback. The backend issues an application JWT, and the frontend uses that token for authenticated API requests.

---

# Running Processes Summary

To run the complete application, the following services should be active:

| Service | Command | Purpose |
|---|---|---|
| PostgreSQL + Redis | `docker compose up -d` | Database and queue infrastructure |
| Express API | `npm run dev` | Backend API |
| BullMQ Worker | `npm run worker` | Processes scheduled emails |
| Next.js Frontend | `npm run dev` | User interface |

You will typically need **four terminals** running:

```text
Terminal 1 → docker compose up -d
Terminal 2 → Backend API (npm run dev)
Terminal 3 → Email Worker (npm run worker)
Terminal 4 → Frontend (npm run dev)
```

---

# How to Test the Application

Once all services are running:

1. Open `http://localhost:3000`.
2. Click **Sign in with Google**.
3. Complete Google authentication.
4. Open the dashboard.
5. Click **Compose New Email**.
6. Enter an email subject and body.
7. Upload a CSV or text file containing recipient email addresses.
8. Select a future start time.
9. Configure the delay between emails and hourly limit.
10. Submit the campaign.
11. Verify that emails appear under **Scheduled Emails**.
12. Watch the BullMQ worker terminal when the scheduled time arrives.
13. Verify that processed emails move to **Sent Emails**.
14. Open the Ethereal preview URL from the worker logs to inspect the email.

---

# Testing Persistence After Restart

To demonstrate persistence across restarts:

1. Schedule an email a few minutes in the future.
2. Confirm that it appears under **Scheduled Emails**.
3. Stop the backend API or worker using `Ctrl + C`.
4. Start the process again:

```bash
npm run dev
```

For the worker:

```bash
npm run worker
```

5. The pending job remains persisted and should continue to be processed at its scheduled time.

PostgreSQL stores the persistent application state, while Redis/BullMQ manages delayed execution. The `reconcilePendingJobs()` function provides an additional recovery mechanism for pending jobs.

---

# Testing Rate Limiting and Delay

Rate limiting and minimum delay can be tested by scheduling multiple emails.

For example, configure:

```env
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS_MS=2000
MAX_EMAILS_PER_HOUR_GLOBAL=5
```

Schedule multiple recipients and observe the worker logs.

The system should:

- Respect the configured delay between sends.
- Process jobs according to the configured concurrency.
- Reschedule jobs instead of dropping them when the hourly limit is reached.

---

# Production Build Check

Before submitting the assignment, verify that both applications build successfully.

## Backend

```bash
cd backend
npm run build
```

## Frontend

```bash
cd frontend
npm run build
```

Both builds should complete successfully without errors.

---

# Assumptions, Shortcuts, and Trade-offs

- **Fixed hourly buckets:** Rate limiting uses clock-hour buckets instead of a strict rolling 60-minute window.
- **Ethereal Email:** Used for safe development and testing instead of real email delivery.
- **Google OAuth credentials:** Anyone running the project locally must configure their own Google OAuth credentials.
- **UI design:** The frontend prioritizes functionality and required features over pixel-perfect UI reproduction.
- **PostgreSQL as source of truth:** Email job data is stored persistently in PostgreSQL, while Redis/BullMQ handles delayed execution.
- **Recovery mechanism:** `reconcilePendingJobs()` acts as a defensive backstop for pending jobs that need to be restored to the queue.

---

# Demo Video

The demo video demonstrates:

- Google OAuth login
- Creating scheduled emails
- Scheduled Emails and Sent Emails dashboard views
- BullMQ worker processing
- Ethereal Email previews
- Restart persistence
- Rate limiting or minimum delay behavior

**Demo Video:** `<ADD_DEMO_VIDEO_LINK_HERE>`

---

# Assignment Requirements Coverage

| Assignment Requirement | Implementation |
|---|---|
| Backend scheduler | BullMQ delayed jobs |
| No cron | BullMQ handles delayed scheduling |
| Database persistence | PostgreSQL |
| Queue infrastructure | Redis + BullMQ |
| Separate worker | BullMQ worker process |
| Restart persistence | Redis persistence + database reconciliation |
| Rate limiting | Redis-backed counters |
| Concurrency | Configurable worker concurrency |
| Authentication | Google OAuth + JWT |
| Frontend login | Google OAuth |
| Dashboard | Scheduled and Sent Email views |
| Compose email | Email campaign creation and recipient upload |
| Email testing | Ethereal Email |
| Backend setup | Documented in this README |
| Frontend setup | Documented in this README |