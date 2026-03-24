# Task 2 — Live activity feed

NestJS **backend** + static **AngularJS frontend**. See [`AGENTS.md`](./AGENTS.md) for agent rules and folder layout.

## Run locally

```bash
cd backend
npm install
npm run start:dev
```

Open **http://localhost:3000** (UI from `frontend/` — `index.html`, `styles/`, `app/`; API on same host).

### API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/events` | Body: `{ "type": string, "message": string, "priority": "low" \| "normal" \| "high" }` |
| `GET` | `/events` | Current buffer, newest first |
| `GET` | `/events/stream` | **SSE** stream of new events + periodic heartbeats |

**Buffer rules (max 5 events):** when full, evict **oldest `low`**, else **oldest `normal`**; **`high` is never evicted**. If the buffer is full of **only** `high` events, `POST /events` returns **429**.

---

## Assessment answers (Task 2 brief)

### 1) Which real-time approach did you choose and why? What trade-offs did you consider?

**Choice: Server-Sent Events (SSE)** via `GET /events/stream`.

**Why:** The feed is **server → client** only. SSE is built for one-way push over HTTP, works through many corporate proxies better than raw WebSockets, and is easy to consume in the browser with `EventSource`. For this exercise it keeps the server model simple (no socket handshake / framing).

**Trade-offs considered:**

| Approach | Pros | Cons |
|----------|------|------|
| **SSE** | Simple, HTTP-friendly, auto-reconnect in browsers | One-way only; binary support is awkward; connection limits per browser/domain still apply |
| **WebSockets** | Full duplex, great for collaborative apps | More moving parts; infra/proxy config can be harder; overkill here |
| **Polling** | Easiest to deploy | Wastes requests; higher latency; worse at scale |

### 2) The priority-based eviction logic — how would this change if we needed to persist events to a database? What would you change in the architecture?

Today eviction is **in-memory** and **O(n)** scan for the oldest `low`/`normal`. With a database:

- **Model:** Store `id`, `type`, `message`, `priority`, `timestamp` (and optionally a monotonic `sequence`).
- **Enforcement:** Run **insert + optional delete** inside a **transaction** so concurrent `POST`s cannot race past the 5-cap.
- **Queries:** Optimize “pick oldest low/normal to delete” with indexes, e.g. partial or composite index on `(priority, timestamp)` for fast `ORDER BY timestamp ASC LIMIT 1` per tier.
- **Never drop high:** Keep that rule in the **service/domain layer** (or explicit SQL), not a naive `LIMIT 50` on the whole table without priority rules.
- **Realtime:** After commit, **publish** the new event to a **message bus** (Redis pub/sub, NATS, Kafka, etc.). SSE/WebSocket **worker processes** subscribe and fan out — so you are not limited to a single Node process `Subject`, and horizontal scaling stays consistent.

### 3) If this needed to handle 10,000 connected clients, what would break first and what would you change?

**Likely first breaks:**

1. **Single Node process limits** — open connections (file descriptors), memory per socket buffer, and event-loop time to write to every client.
2. **Naive in-process broadcast** — O(clients) work per event on one machine.
3. **Load balancer / proxy timeouts** — long-lived SSE needs tuned idle timeouts and heartbeats (already partially addressed).

**Changes:**

- **Horizontal scale:** Multiple API nodes; use **Redis pub/sub** (or similar) so any instance that accepts `POST /events` publishes once, and each instance pushes only to **its** connected SSE clients.
- **Operational guardrails:** Per-instance connection caps, rate limits on `POST /events`, payload size limits, backpressure when clients read slowly.
- **At very large fan-out:** Consider a **dedicated realtime edge** (managed WebSocket/SSE service) or CDN-style patterns instead of fan-out from app servers.

### 4) What did you intentionally leave out that you would add for production?

- **Authentication / authorization** on `POST /events` and possibly on opening the stream.
- **Persistence** and **auditability**; **idempotency** keys for producers.
- **Structured logging, metrics, tracing** (429 rate, eviction counts, connected SSE clients, p95 write latency).
- **Rate limiting**, **request size limits**, and **input hardening** beyond DTO validation.
- **Automated tests** for eviction order, 429 when buffer is all-high, and SSE message shape.
- **Graceful shutdown** (close SSE connections, drain in-flight work).
