# Agent instructions

## PRs and documentation

Do not add "Made with Cursor", cursor.com links, or similar Cursor branding to:

- Pull request titles or descriptions
- Commit messages
- README or other user-facing docs

Keep PR bodies neutral: summary, test plan, and technical notes only.

## Project context

**Task 2** is a small full-stack slice: a **NestJS** API (in-memory events, priority eviction, **SSE** live stream) and a static **AngularJS** UI. Prefer matching existing patterns under `backend/src/` and keeping the frontend as plain static assets unless the brief changes.

## Project structure

```
task2/
├── AGENTS.md                 # This file
├── README.md                 # Task 2 setup (run commands from backend/)
├── backend/                  # NestJS API + static hosting of ../frontend
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   └── events/           # POST/GET /events, GET /events/stream (SSE)
│   ├── package.json
│   ├── nest-cli.json
│   └── tsconfig*.json
└── frontend/                 # AngularJS static UI (served from /)
    ├── index.html            # Shell: loads CSS + app scripts
    ├── styles/
    │   └── app.css
    └── app/
        ├── app.module.js
        ├── activity-feed.service.js   # $http + EventSource
        └── activity-feed.controller.js
```

At runtime the server resolves `frontend/` relative to `backend/dist/` (`join(__dirname, '..', '..', 'frontend')`).

## Commands

Run all install/build/start commands from **`task2/backend/`**:

- Install: `npm install`
- Dev: `npm run start:dev`
- Build: `npm run build`
- Prod: `npm run start:prod` (after `npm run build`)

The app serves the UI from `../frontend/` and the API on the same origin (`/events`, `/events/stream`).
