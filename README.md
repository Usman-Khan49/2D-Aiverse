<div align="center">


# RoomMind

### AI-Native Virtual Office for Remote Teams

Turn every meeting into captured decisions, assigned action items, and searchable team memory inside a shared 2D workspace your team actually lives in.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-roommind.app-C4714A?style=for-the-badge&logoColor=white)](https://2-d-aiverse-web.app)
[![License](https://img.shields.io/badge/License-MIT-6B8F6B?style=for-the-badge)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)

<br />

<img src="./docs/screenshots/landing-page.PNG" alt="RoomMind Office Canvas" width="100%" style="border-radius: 12px;" />

</div>

---

## What is RoomMind?

Most virtual office tools solve presence, not progress. Your team can appear online together, but decisions get lost, action items go unassigned, and the next person to join has no idea what was discussed.

RoomMind combines a spatial 2D office canvas with an AI memory layer that listens to every meeting, structures the outcomes, and makes them retrievable in plain English weeks later.

---

## Screenshots

<div align="center">

| Office Canvas | Active Meeting Call |
|:---:|:---:|
| ![Canvas](./docs/screenshots/canvas-space.PNG) | ![Call](./docs/screenshots/active-call.PNG) |

| Meeting Summary | Memory Q&A |
|:---:|:---:|
| ![Summary](./docs/screenshots/meeting-summary.PNG) | ![Memory](./docs/screenshots/memory-qa.PNG) |

</div>

---

## Features

### Spatial 2D Office Canvas

<img src="./docs/gifs/canvas-space.gif" alt="Canvas Presence" width="100%" />

A shared top-down office with four named zones: Meeting, Working, Knowledge, and Resting. Move your avatar freely between areas in real time and see teammates as live avatar dots with name tags and presence indicators. Real-time presence is powered by WebSockets and Redis pub/sub, broadcasting avatar positions and zone changes to all connected clients with zero event-loop blocking on the main server process.

---

### AI Meeting Pipeline

<img src="./docs/gifs/meeting-summary.gif" alt="Meeting Call" width="100%" />

Join a call inside the Meeting Area. Audio is captured via the browser MediaRecorder API in WebM/Opus format and transcribed with automatic speaker diarization via Deepgram. The transcription is chunked into rolling 5-minute segments and sent to Gemini 1.5 Pro for interim summarization, with chunk summaries stored temporarily in Redis. When the meeting ends, all chunk summaries are synthesized into a single structured final summary containing decisions, open questions, risks, and action items. The entire pipeline runs asynchronously through a Python/Celery worker over a BullMQ Redis queue so the WebSocket server is never blocked.

---

### Structured Meeting Summaries

<img src="./docs/gifs/meeting-summary.gif" alt="Meeting Summary" width="100%" />

Every ended session produces a summary modal with three tabs: Summary, Transcript, and Action Items. The Summary tab surfaces decisions, open questions, and risks extracted by Gemini. The Transcript tab shows the full speaker-labeled conversation alongside the participant list so teammates can visually map speakers to names. Action items are extracted automatically with AI-assigned priority levels and can be assigned to any workspace member directly from the modal.

---

### Memory Q&A

<img src="./docs/gifs/memory-qa.gif" alt="Memory Q&A" width="100%" />

Ask natural language questions about any past meeting in your workspace. After every session ends, the final summary and full transcript are chunked, embedded via Gemini embedding models, and stored in PostgreSQL using pgvector. At query time, the question is embedded and a cosine similarity search retrieves the most relevant passages. Those passages are passed to Gemini 1.5 Pro as context and it generates a grounded answer with source cards linking back to the original session. Search scope can be toggled between the full workspace history and a single session.

---

## Tech Stack

### Monorepo
| Tool | Purpose |
|---|---|
| [Turborepo](https://turbo.build/) | Monorepo orchestration and build caching |
| [pnpm Workspaces](https://pnpm.io/workspaces) | Package management across apps |
| TypeScript | Shared types across all apps via `@roommind/types` |

### Frontend
| Technology | Purpose |
|---|---|
| [React 19](https://react.dev/) | UI shell and product overlays |
| [Phaser.js 3](https://phaser.io/) | 2D office canvas, avatar movement, zone detection |
| [Zustand](https://zustand-demo.pmnd.rs/) | Client-side state management |
| [Vite](https://vitejs.dev/) | Build tooling and dev server |
| [Clerk](https://clerk.com/) | Authentication and session management |

### Backend
| Technology | Purpose |
|---|---|
| [Node.js + Express](https://expressjs.com/) | HTTP API server |
| [ws](https://github.com/websockets/ws) | WebSocket server for real-time presence |
| [Prisma](https://www.prisma.io/) | ORM and database migrations |
| [PostgreSQL + pgvector](https://github.com/pgvector/pgvector) | Relational data and vector similarity search |
| [Redis](https://redis.io/) | Pub/sub, presence state, temporary chunk storage |
| [Clerk Express SDK](https://clerk.com/docs/references/nodejs/overview) | JWT verification middleware |

### AI Worker
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
| [Neon](https://neon.tech/) | Serverless PostgreSQL |
| [Redis Cloud](https://redis.com/redis-enterprise-cloud/) | Managed Redis |

---

## Architecture

```
Browser (Vercel)
React UI + Phaser.js 2D Canvas
          |
          | HTTPS + WSS
          |
    Backend (Railway)
    Express HTTP + WebSocket Server
          |               |
       Neon            Redis Cloud
     Postgres          pub/sub
     pgvector          queue
                       chunk cache
                          |
                    AI Worker (Railway)
                    Python + Celery
                    Deepgram + Gemini
```

---

## Getting Started

### Prerequisites

```bash
node --version    # 18+
pnpm --version    # 8+  ->  npm install -g pnpm
python --version  # 3.11+
```

You will also need accounts for:
- [Clerk](https://clerk.com) for authentication
- [Neon](https://neon.tech) for PostgreSQL
- [Redis Cloud](https://redis.com) for Redis
- [Deepgram](https://deepgram.com) for transcription
- [Google AI Studio](https://aistudio.google.com) for Gemini

---

### 1. Clone and Install

```bash
git clone https://github.com/Usman-Khan49/roommind.git
cd roommind
pnpm install
```

---

### 2. Environment Variables

#### `apps/backend/.env`
```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/roommind?sslmode=require"
REDIS_URL="redis://default:password@redis-xxx.cloud.redislabs.com:port"
CLERK_SECRET_KEY="sk_test_xxx"
CLERK_WEBHOOK_SECRET="whsec_xxx"
GEMINI_API_KEY="AIzaSy_xxx"
```

#### `apps/worker/.env`
```env
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
GEMINI_API_KEY="AIzaSy_xxx"
DEEPGRAM_API_KEY="xxx"
```

#### `apps/web/.env`
```env
VITE_API_URL="http://localhost:3001"
VITE_WS_URL="ws://localhost:3001"
VITE_CLERK_PUBLISHABLE_KEY="pk_test_xxx"
```

---

### 3. Database Setup

```bash
cd apps/backend
npx prisma migrate dev --name init
```

---

### 4. Clerk Webhook

```bash
npx clerk webhooks listen --forward-to localhost:3001/api/webhooks/clerk
```

Copy the printed `CLERK_WEBHOOK_SECRET` into `apps/backend/.env`.

---

### 5. Run

```bash
# Terminal 1
pnpm --filter @roommind/backend dev

# Terminal 2
pnpm --filter @roommind/web dev

# Terminal 3
cd apps/worker && celery -A src.queue.worker worker --loglevel=info

# Terminal 4
npx clerk webhooks listen --forward-to localhost:3001/api/webhooks/clerk
```

App runs at `http://localhost:5173`

---

## Deployment

The frontend is deployed on **Vercel** and the backend and worker are deployed as separate services on **Railway**.

---

## Roadmap

- [ ] Jira / Linear / Asana action item push integration
- [ ] AI Whiteboards with auto-clustered sticky notes
- [ ] Contextual Bookcases with RAG over internal PDFs and wiki pages
- [ ] Speaker identity mapping so users can manually match Speaker 1 to a name
- [ ] Custom office map builder

---

## License

[MIT](./LICENSE) © Muhammad Usman

---

<div align="center">
  <sub>Built with coffee and too many late nights.</sub>
</div>
