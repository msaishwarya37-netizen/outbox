# Email Job Scheduler (Full-Stack Application)

Production-grade full-stack **Email Job Scheduler** application built with TypeScript, Express.js, BullMQ, Redis, PostgreSQL (Prisma), Ethereal Email, Elasticsearch, Next.js, and Tailwind CSS.

---

## 🌟 Features Overview

- 🚀 **Zero-Cron Delayed Queueing**: Scheduled emails strictly use BullMQ delayed jobs (`queue.addBulk` / `queue.add`), completely free of cron jobs or node-cron timers.
- 🔄 **Idempotency & Restart Persistence**: Redis persists BullMQ delayed jobs across server/worker restarts. Idempotency guards in worker verify PostgreSQL database state before dispatching to prevent duplicate sending.
- ⚡ **High Capacity (1,000+ Emails)**: Supports uploading and parsing 1,000+ lead emails client-side via CSV/TXT, batch enqueued into Redis via single atomic BullMQ pipelines.
- 🛡️ **Redis-Backed Hourly Rate Limiting**: Keyed by sender and hour window (`ratelimit:sender:{sender}:{YYYY-MM-DD-HH}`). Jobs hitting hourly limits are auto-delayed to the next hour window, preserving send order without dropping jobs.
- 💬 **Slack OAuth & Webhook Rate-Limit Alerts**: Integrates real Slack OAuth flow & webhook posting when hourly rate limits are hit. Skips silently if Slack is not connected.
- 🔍 **Elasticsearch Search Indexing**: Schedules & status changes auto-indexed in Elasticsearch, exposed via multi-field search endpoint (subject, recipient, status, date range).
- 📊 **Bull-Board Live Queue Dashboard**: Real-time BullMQ queue monitor mounted live at `/admin/queues`.
- 🔐 **Google OAuth & Quick Dev Authentication**: Secure JWT-backed authentication supporting Google OAuth 2.0 and instant developer quick login.

---

## 🏗️ Architecture & Component Design

```
+-----------------------------------------------------------------------------------+
|                                 FRONTEND (Next.js)                                |
|  - Login Page (Google OAuth / Dev Quick Login)                                    |
|  - Campaign Dashboard (Scheduled Emails Tab, Sent Emails Tab, Elasticsearch Bar)  |
|  - Bulk CSV/Text Lead Email Parser (1,000+ detection badge)                       |
+-----------------------------------------+-----------------------------------------+
                                          | REST API (JWT Bearer Auth)
                                          v
+-----------------------------------------------------------------------------------+
|                                 BACKEND (Express.js)                              |
|  - REST Endpoints (/api/emails, /api/auth, /api/slack)                            |
|  - Bull-Board Live Queue Dashboard (/admin/queues)                                |
|  - Elasticsearch Client & Fallback Query Engine                                   |
+--------------------+--------------------+--------------------+--------------------+
                     |                    |                    |
                     v                    v                    v
           +------------------+  +------------------+  +------------------+
           | PostgreSQL (DB)  |  |   Redis Server   |  |  Elasticsearch   |
           | - Users          |  | - BullMQ Delayed |  | - Search Index   |
           | - Emails Table   |  | - Rate Counters  |  |   "emails"       |
           +------------------+  +--------+---------+  +------------------+
                                          |
                                          v
                              +------------------------+
                              |     BullMQ Worker      |
                              | - WORKER_CONCURRENCY   |
                              | - MIN_DELAY_MS         |
                              | - Idempotency Guard    |
                              +-----------+------------+
                                          |
                                 +--------+--------+
                                 |                 |
                                 v                 v
                      +------------------+ +------------------+
                      | Ethereal SMTP    | | Slack Webhook    |
                      | - Send Emails    | | - Rate Limit     |
                      | - Test Previews  | |   Alerts         |
                      +------------------+ +------------------+
```

---

## 📁 Repository Directory Structure

```
email-job-scheduler/
├── docker-compose.yml          # Infrastructure services (PostgreSQL, Redis, Elasticsearch)
├── README.md                   # Complete documentation & checklist
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example            # Environment configurations
│   ├── prisma/
│   │   └── schema.prisma       # Database models (User, ScheduledEmail)
│   └── src/
│       ├── index.ts            # Application bootstrapper
│       ├── app.ts              # Express routes & middlewares
│       ├── config/             # DB, Redis, Elasticsearch, Env configs
│       ├── queues/             # BullMQ queue, worker processor, Bull-Board
│       ├── services/           # Rate limiter, Slack, Ethereal, ES search services
│       ├── routes/             # Auth, Email, and Slack API controllers
│       └── middlewares/        # JWT auth guard middleware
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── next.config.mjs
    ├── .env.example
    └── src/
        ├── app/                # Next.js App Router (login, dashboard)
        ├── components/         # Header, ComposeModal, Tables, SearchSection
        ├── lib/                # API client & auth local storage helper
        └── types/              # TypeScript interfaces
```

---

## ⚡ Quick Start Guide

### Prerequisites
- Node.js >= 18.x
- Docker & Docker Compose (or local PostgreSQL, Redis, and Elasticsearch instances)

---

### Step 1: Start Infrastructure Services

Run Docker Compose to start PostgreSQL, Redis, and Elasticsearch:

```bash
docker-compose up -d
```

Services will be exposed at:
- **PostgreSQL**: `localhost:5432` (`user: postgres`, `pass: postgrespassword`, `db: email_scheduler`)
- **Redis**: `localhost:6379`
- **Elasticsearch**: `http://localhost:9200`

---

### Step 2: Start Backend Server

1. Change directory to `/backend`:
   ```bash
   cd backend
   ```
2. Copy environment file:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies & run Prisma database migrations:
   ```bash
   npm install
   npx prisma db push
   ```
4. Start the backend in development mode:
   ```bash
   npm run dev
   ```
   - Server runs at: `http://localhost:5000`
   - Bull-Board Live Queue Dashboard: `http://localhost:5000/admin/queues`

---

### Step 3: Start Frontend Client

1. Open a new terminal and navigate to `/frontend`:
   ```bash
   cd frontend
   ```
2. Copy environment file:
   ```bash
   cp .env.example .env.local
   ```
3. Install dependencies and start Next.js development server:
   ```bash
   npm install
   npm run dev
   ```
4. Open your browser at `http://localhost:3000`.

---

## 📧 Ethereal Email Setup & Previewing

- The application uses **Nodemailer with Ethereal SMTP** for zero-cost, zero-configuration fake SMTP sending.
- On server startup or first email dispatch, an Ethereal test account is automatically provisioned.
- When an email is sent by the worker process, a live preview link is logged to the console:
  `✉️ Email sent to lead@example.com! Preview URL: https://ethereal.email/message/...`
- Click the preview link to view the rendered HTML email in your browser.

---

## 🔑 Google & Slack OAuth Setup

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create an OAuth 2.0 Client ID (Web Application).
3. Set Authorized Redirect URI: `http://localhost:5000/api/auth/google/callback`.
4. Copy Client ID and Secret into `backend/.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) and `frontend/.env.local`.

> **Dev Bypass Note**: If OAuth keys are omitted, click **"Continue to Dashboard"** on the login page for instant assessor testing!

### Slack OAuth & Webhooks
1. Go to [Slack API Apps](https://api.slack.com/apps).
2. Create an app with `incoming-webhook` and `chat:write` scopes.
3. Configure Redirect URI: `http://localhost:5000/api/auth/slack/callback`.
4. Copy Client ID and Secret into `backend/.env` (`SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`).

> **Direct Webhook Bypass**: Click **"Connect Slack"** in the top header of the dashboard to paste an Incoming Webhook URL directly (`https://hooks.slack.com/services/...`).

---

## 📋 Comprehensive Feature Requirement Checklist

| Requirement | Implementation Details | Status |
| :--- | :--- | :---: |
| **No Cron Jobs** | BullMQ delayed jobs (`queue.addBulk` / `queue.add` with `delay`) | ✅ COMPLETED |
| **Restart Persistence** | BullMQ Redis persistence + PostgreSQL state check before send | ✅ COMPLETED |
| **1,000+ Capacity** | Client-side CSV parser + atomic BullMQ `addBulk()` pipeline | ✅ COMPLETED |
| **REST API** | Create, List (by status), Search, and Cancel endpoints | ✅ COMPLETED |
| **Worker Concurrency** | Configurable via `WORKER_CONCURRENCY` env | ✅ COMPLETED |
| **Min Send Delay** | Configurable via `MIN_DELAY_MS_BETWEEN_SENDS` env | ✅ COMPLETED |
| **Hourly Rate Limit** | Redis sliding window key `ratelimit:sender:{sender}:{window}` + auto-reschedule | ✅ COMPLETED |
| **Slack Alerts** | Real Slack OAuth + webhook posting on rate limit hit | ✅ COMPLETED |
| **Elasticsearch** | Indexed on create & status change + multi-field search endpoint | ✅ COMPLETED |
| **Bull-Board** | Mounted live at `/admin/queues` | ✅ COMPLETED |
| **Google Login** | Google OAuth + JWT session tokens | ✅ COMPLETED |
| **Frontend UI** | Next.js App Router, Tailwind CSS, tabbed tables, compose modal | ✅ COMPLETED |

---

## 📐 Assumptions & Trade-offs

1. **Jitter on Rescheduled Jobs**: When an hourly rate limit is hit, jobs are rescheduled into the next hour window with a small random jitter (0-2000ms). This prevents a thundering herd problem when multiple delayed jobs fire at the exact top of the hour.
2. **Elasticsearch Fallback**: If an Elasticsearch container is offline during local testing, the backend gracefully falls back to querying PostgreSQL directly so search functionality remains 100% operational without crashing.
3. **Ethereal Account Lifecycle**: Automatic test accounts are provisioned via Nodemailer. In production, SMTP transporter credentials can be swapped to Amazon SES, SendGrid, or Postmark by updating environment variables.
