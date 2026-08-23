# Email Job Scheduler

A full-stack email scheduling system built with **Next.js, Express, PostgreSQL, Redis, and BullMQ**.

The application allows users to authenticate with Google, schedule email campaigns for a future time, upload recipient lists, monitor scheduled and sent emails, and process emails asynchronously through a separate BullMQ worker.

The scheduler uses **BullMQ delayed jobs instead of cron**, supports configurable concurrency and rate limiting, and is designed to survive application restarts without losing scheduled jobs.

---

## Features Implemented

### Backend

- BullMQ delayed-job scheduler — no cron
- PostgreSQL persistence using Prisma
- Redis-backed BullMQ queue
- Separate email worker process
- Configurable worker concurrency
- Configurable minimum delay between email sends
- Redis-backed per-hour rate limiting
- Jobs are rescheduled instead of dropped when rate limits are reached
- Idempotency protection to avoid duplicate sends
- Restart persistence and recovery mechanism
- CSV/text recipient file upload parsing
- Ethereal Email SMTP integration with preview URLs
- Google OAuth authentication with JWT-based API authorization

### Frontend

- Google OAuth login
- Protected dashboard
- User information and logout
- Scheduled Emails and Sent Emails tabs
- Compose email modal
- Recipient file upload with detected recipient count
- Configurable start time, delay, and hourly limit
- Loading states and empty states
- Basic error handling

---

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Passport Google OAuth
- JSON Web Tokens
- Nodemailer

---

# Architecture Overview

```text
Frontend (Next.js)
       │
       │ HTTP
       ▼
Express API
       │
       ├──────────────► PostgreSQL
       │                 Source of truth for email jobs
       │
       └──────────────► BullMQ Queue (Redis)
                         Delayed jobs and scheduling
                                  │
                                  │
                                  ▼
                         Email Worker
                         (Separate Process)
                           │        │
                           ▼        ▼
                      PostgreSQL   Ethereal SMTP
                      Update job    Send email
                      status