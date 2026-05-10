<div align="center">

<img src="./apps/web/public/assets/logo.png" alt="RoomMind Logo" width="80" />

# RoomMind

### AI-Native Virtual Office for Remote Teams

Turn every meeting into captured decisions, assigned action items, and searchable team memory — all inside a shared 2D workspace your team actually lives in.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-roommind.app-C4714A?style=for-the-badge&logoColor=white)](https://roommind.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-6B8F6B?style=for-the-badge)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)

<br />

<!-- MAIN SCREENSHOT — see screenshot guide below -->
<img src="./docs/screenshots/canvas-overview.png" alt="RoomMind Office Canvas" width="100%" style="border-radius: 12px;" />

</div>

---

## What is RoomMind?

Most virtual office tools solve **presence**, not **progress**. Your team can appear online together, but decisions get lost, action items go unassigned, and the next person to join has no idea what was discussed.

RoomMind combines a **spatial 2D office canvas** with an **AI memory layer** that listens to every meeting, structures the outcomes, and makes them retrievable — in plain English — weeks later.

---

## Screenshots

<div align="center">

<!-- See screenshot guide at bottom of this file for capture instructions -->

| Office Canvas | Active Meeting Call |
|:---:|:---:|
| ![Canvas](./docs/screenshots/canvas-overview.png) | ![Call](./docs/screenshots/active-call.png) |

| Meeting Summary | Memory Q&A |
|:---:|:---:|
| ![Summary](./docs/screenshots/meeting-summary.png) | ![Memory](./docs/screenshots/memory-qa.png) |

</div>

---

## Features

### 🗺️ Spatial 2D Office Canvas
- Shared top-down office with four named zones — **Meeting**, **Working**, **Knowledge**, and **Resting**
- Move your avatar freely between areas in real time
- See teammates as live avatar dots with name tags and presence indicators
- Real-time presence powered by WebSockets and Redis pub/sub

### 🎙️ AI Meeting Pipeline
- Join a call inside the Meeting Area — audio is captured and transcribed via **Deepgram** with automatic speaker diarization
- Meeting audio is chunked every **5 minutes**, summarized by **Gemini 1.5 Pro**, and stored temporarily in Redis
- When the meeting ends, all chunk summaries are synthesized into a **final structured summary** containing decisions, open questions, risks, and action items
- Processing is fully asynchronous — a Python/Celery worker handles all AI jobs so the real-time server is never blocked

### 📋 Structured Meeting Summaries
- Every ended session produces a clean summary modal with tabbed views: **Summary**, **Transcript**, and **Action Items**
- Participant list shows everyone who was in the call alongside the speaker-labeled transcript
- Action items are extracted automatically with priority levels and can be assigned to workspace members

### 🧠 Memory Q&A (RAG)
- Ask natural language questions about any past meeting in your workspace
- Powered by **pgvector** similarity search and **Gemini embeddings** — answers are grounded in your actual meeting content
- Source cards link back to the original session with similarity scores
- Toggle between workspace-wide search and session-scoped search

### 👥 Workspace & Access Control
- Create a workspace and invite teammates with role-based access (Owner, Admin, Member)
- Workspace membership synced via **Clerk** webhooks on every sign-up and update
- Action items dashboard shows all open tasks across every meeting in the workspace

---

## Tech Stack

### Monorepo
| Tool | Purpose |
|---|---|
| [Turborepo](https://turbo.build/) | Monorepo orchestration and build caching |
| [pnpm Workspaces](https://pnpm.io/workspaces) | Package management across apps |
| TypeScript | Shared types across all apps via `@roommind/types` |

### Frontend — `apps/web`
| Technology | Purpose |
|---|---|
| [React 19](https://react.dev/) | UI shell and product overlays |
| [Phaser.js 3](https://phaser.io/) | 2D office canvas, avatar movement, zone detection |
| [Zustand](https://zustand-demo.pmnd.rs/) | Client-side state management |
| [Vite](https://vitejs.dev/) | Build tooling and dev server |
| [Clerk](https://clerk.com/) | Authentication and session management |

### Backend — `apps/backend`
| Technology | Purpose |
|---|---|
| [Node.js + Express](https://expressjs.com/) | HTTP API server |
| [ws](https://github.com/websockets/ws) | WebSocket server for real-time presence |
| [Prisma](https://www.prisma.io/) | ORM and database migrations |
| [PostgreSQL + pgvector](https://github.com/pgvector/pgvector) | Relational data + vector similarity search |
| [Redis](https://redis.io/) | Pub/sub, presence state, temporary chunk storage |
| [Clerk Express SDK](https://clerk.com/docs/references/nodejs/overview) | JWT verification middleware |

### AI Worker — `apps/worker`
| Technology | Purpose |
|---|---|
| [Python 3.11](https://python.org) | Worker runtime |
| [Celery](https://docs.celeryq.dev/) | Async job processing |
| [Deepgram](https://deepgram.com/) | Speech-to-text with speaker diarization |
| [Gemini 1.5 Pro](https://deepmind.google/technologies/gemini/) | Meeting summarization and synthesis |
| [Gemini Embeddings](https://ai.google.dev/gemini-api/docs/embeddings) | Vector generation for RAG |

### Infrastructure
| Service | Purpose |
|---|---|
| [Vercel](https://vercel.com/) | Frontend deployment |
| [Railway](https://railway.app/) | Backend and worker deployment |
| [Neon](https://neon.tech/) | Serverless PostgreSQL |
| [Redis Cloud](https://redis.com/redis-enterprise-cloud/) | Managed Redis |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Vercel)                        │
│         React UI overlay + Phaser.js 2D Canvas              │
└───────────────────────┬─────────────────────────────────────┘
                        │  HTTPS + WSS
          ┌─────────────▼─────────────┐
          │     Backend (Railway)     │
          │  Express HTTP + WS Server │
          └──────┬──────────┬─────────┘
                 │          │
        ┌────────▼──┐  ┌────▼────────────┐
        │   Neon    │  │   Redis Cloud   │
        │ Postgres  │  │ pub/sub · queue │
        │ pgvector  │  │ chunk cache     │
        └───────────┘  └────┬────────────┘
                            │  BullMQ Jobs
          ┌─────────────────▼─────────────┐
          │      AI Worker (Railway)      │
          │  Python · Celery · Deepgram   │
          │  Gemini 1.5 Pro · Embeddings  │
          └───────────────────────────────┘
```

---

## Project Structure

```
roommind/
├── apps/
│   ├── web/                    # React + Phaser frontend
│   │   └── src/
│   │       ├── game/           # Phaser scenes, entities, systems
│   │       ├── ui/             # React components, hooks, store
│   │       └── ws/             # WebSocket client
│   ├── backend/                # Node.js HTTP + WebSocket server
│   │   └── src/
│   │       ├── db/             # Prisma client, migrations, repos
│   │       ├── http/           # Express routes, middleware
│   │       ├── ws/             # WS server, connection manager
│   │       └── services/       # Business logic
│   └── worker/                 # Python AI job processor
│       └── src/
│           ├── jobs/           # transcribe, summarize, embed
│           ├── services/       # Gemini, Deepgram, notify
│           └── queue/          # Celery worker bootstrap
└── packages/
    ├── types/                  # Shared TypeScript types
    ├── utils/                  # Shared utilities
    └── config/                 # Shared tsconfig + eslint
```

---

## Getting Started

### Prerequisites

```bash
node --version    # 18+
pnpm --version    # 8+  →  npm install -g pnpm
python --version  # 3.11+
git --version
```

You will also need accounts for:
- [Clerk](https://clerk.com) — authentication
- [Neon](https://neon.tech) — PostgreSQL database
- [Redis Cloud](https://redis.com) — Redis instance
- [Deepgram](https://deepgram.com) — transcription API
- [Google AI Studio](https://aistudio.google.com) — Gemini API key

---

### 1. Clone and Install

```bash
git clone https://github.com/Usman-Khan49/roommind.git
cd roommind
pnpm install
```

---

### 2. Environment Variables

#### Backend — `apps/backend/.env`
```env
NODE_ENV=development
PORT=3001

# Neon — copy from your Neon project dashboard
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/roommind?sslmode=require"

# Redis Cloud — copy from your Redis Cloud dashboard
REDIS_URL="redis://default:password@redis-xxx.cloud.redislabs.com:port"

# Clerk — from clerk.com → your app → API Keys
CLERK_SECRET_KEY="sk_test_xxx"
CLERK_WEBHOOK_SECRET="whsec_xxx"

# Google AI Studio
GEMINI_API_KEY="AIzaSy_xxx"
```

#### Worker — `apps/worker/.env`
```env
DATABASE_URL="postgresql://..."    # same as backend
REDIS_URL="redis://..."            # same as backend
GEMINI_API_KEY="AIzaSy_xxx"
DEEPGRAM_API_KEY="xxx"
```

#### Frontend — `apps/web/.env`
```env
VITE_API_URL="http://localhost:3001"
VITE_WS_URL="ws://localhost:3001"
VITE_CLERK_PUBLISHABLE_KEY="pk_test_xxx"
```

---

### 3. Database Setup

```bash
cd apps/backend

# run migrations and generate Prisma client
npx prisma migrate dev --name init

# optional — open Prisma Studio to inspect your DB
npx prisma studio
```

---

### 4. Clerk Webhook (local)

Clerk needs to reach your local backend to sync users on sign-up.
Run this in a separate terminal:

```bash
npx clerk webhooks listen --forward-to localhost:3001/api/webhooks/clerk
```

This gives you a local tunnel and prints a `CLERK_WEBHOOK_SECRET` — 
paste it into `apps/backend/.env`.

---

### 5. Run Everything

Open four terminals:

```bash
# Terminal 1 — backend
pnpm --filter @roommind/backend dev

# Terminal 2 — frontend
pnpm --filter @roommind/web dev

# Terminal 3 — Python worker
cd apps/worker
pip install -r requirements.txt
celery -A src.queue.worker worker --loglevel=info

# Terminal 4 — Clerk webhook tunnel
npx clerk webhooks listen --forward-to localhost:3001/api/webhooks/clerk
```

Or run backend and frontend together from the root:

```bash
pnpm dev    # runs all Node.js apps via Turborepo
```

App is running at → **http://localhost:5173**

---

## Deployment

| Service | Platform | Config |
|---|---|---|
| Frontend | Vercel | Root: `apps/web`, Framework: Vite |
| Backend | Railway | Root: `apps/backend`, uses `nixpacks.toml` |
| Worker | Railway | Root: `apps/worker`, uses `Dockerfile` |
| Database | Neon | Serverless PostgreSQL |
| Redis | Redis Cloud | Managed Redis |

### Production Environment Variables

Set these in Railway (backend service):
```
NODE_ENV=production
DATABASE_URL=       ← Neon production connection string
REDIS_URL=          ← Redis Cloud connection string
CLERK_SECRET_KEY=   ← Clerk production secret key
CLERK_WEBHOOK_SECRET= ← from Clerk production webhook endpoint
GEMINI_API_KEY=
```

Set these in Vercel (web app):
```
VITE_API_URL=https://your-backend.up.railway.app
VITE_WS_URL=wss://your-backend.up.railway.app
VITE_CLERK_PUBLISHABLE_KEY=  ← Clerk production publishable key
```

Run migrations against production DB once:
```bash
DATABASE_URL="your-neon-url" npx prisma migrate deploy
```

---

## Roadmap

- [ ] Jira / Linear / Asana action item push integration
- [ ] AI Whiteboards — auto-cluster sticky notes into project plans
- [ ] Contextual Bookcases — RAG over internal PDFs and wiki pages
- [ ] Speaker identity mapping — let users manually map Speaker 1 to a name
- [ ] Mobile presence view
- [ ] Custom office map builder

---

## Contributing

Pull requests are welcome. For major changes please open an issue first to discuss what you would like to change.

```bash
# create a feature branch
git checkout -b feature/your-feature-name

# make your changes, then
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

---

## License

[MIT](./LICENSE) © Muhammad Usman

---

<div align="center">
  <sub>Built with ☕ and too many late nights.</sub>
</div>
