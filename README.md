# DIY Rocks — Technical Assessment

Public repo for **Full Stack Web Developer — Pre-Employment Tasks** (DIY Rocks).

## Contents

- **Task 1:** Code review + refactor (AngularJS) — see [`REVIEW.md`](./REVIEW.md) and implementation under [`task1/`](./task1/).
- **Task 2:** Live activity feed — NestJS API + AngularJS UI in [`task2/backend/`](./task2/backend/) and [`task2/frontend/`](./task2/frontend/).

---

## Task 2 — Quick start

```bash
cd task2/backend
npm install
npm run start:dev
```

Open **http://localhost:3000** — static UI is served from `task2/frontend/`; API is on the same origin (`/events`, `/events/stream`).

See also [`task2/README.md`](./task2/README.md) and [`task2/AGENTS.md`](./task2/AGENTS.md).

### API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/events` | Body: `{ "type": string, "message": string, "priority": "low" \| "normal" \| "high" }` |
| `GET` | `/events` | Current buffer, newest first |
| `GET` | `/events/stream` | **SSE** stream of new events + periodic heartbeats |

**Buffer rules (max 5 events):** when full, evict **oldest `low`**, else **oldest `normal`**; **`high` is never evicted**. If the buffer is full of **only** `high` events, `POST /events` returns **429**.

### Example `curl`

```bash
curl -s http://localhost:3000/events | jq .
curl -s -X POST http://localhost:3000/events \
  -H 'Content-Type: application/json' \
  -d '{"type":"demo","message":"hello","priority":"normal"}'
```

**Task 2 written answers (SSE, DB, scale, production):** see **[`task2/README.md` → Assessment answers](./task2/README.md#assessment-answers-task-2-brief)**.

---

## License

Submitted as part of a hiring assessment; code is provided for evaluation purposes.
