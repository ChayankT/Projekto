# ⚡ Projekto — Agile Project Management Tool

A full-stack app for running agile projects on small teams (roughly 3–10 people).
Work is organized as **Project → Sprint → User Story → Task**, tracked on a drag-and-drop Kanban
board, with sprint planning via story points, a task-completion-based ideal-vs-actual burndown chart,
per-sprint velocity, and background notifications for overdue work.

📚 **Full documentation lives in [`/docs`](./docs):**

| Doc | What's in it |
|---|---|
| [`ARCHITECTURE_OVERVIEW.md`](./docs/ARCHITECTURE_OVERVIEW.md) | Pages, hierarchy, completion/reopening cascades, keyboard shortcuts, sprints/burndown, the background job |
| [`API_DOCUMENTATION.md`](./docs/API_DOCUMENTATION.md) | Every REST endpoint, at a glance |
| [`DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) | Every Mongoose model, field by field |
| [`DESIGN_DECISIONS.md`](./docs/DESIGN_DECISIONS.md) | Notable tradeoffs and why they were made |
| [`SECURITY_CONSIDERATIONS.md`](./docs/SECURITY_CONSIDERATIONS.md) | Known gaps in this MVP and what a production hardening pass would need |
| [`AI_USAGE.md`](./docs/AI_USAGE.md) | How AI tools were used while building this |
| [`FUTURE_IMPROVEMENTS.md`](./docs/FUTURE_IMPROVEMENTS.md) | What's next with more time |
| [`DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md) | Deploying to Render (backend) + Vercel (frontend) |

This README covers **local setup** only.

---

## 🧱 Stack

- **Frontend**: React 19 + Vite, plain CSS (dark theme), `@hello-pangea/dnd` for the Kanban board
- **Backend**: Node.js + Express 5, Mongoose ODM
- **Database**: MongoDB (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works fine)
- **Docs**: Swagger UI, generated from JSDoc comments on the routes

## ✅ Prerequisites

- Node.js 18+ and npm
- A MongoDB connection string (Atlas free tier, or a local `mongod`)

## 🚀 Local Setup

### 1. Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
MONGO_URI=your-mongodb-connection-string
PORT=5000
```

Start the server:

```bash
npm run dev
```

You should see:

```
🚀 Server running on http://localhost:5000
📄 API Docs: http://localhost:5000/api-docs
```

The interactive Swagger docs are served at **http://localhost:5000/api-docs**.

### 2. Frontend

In a separate terminal:

```bash
cd frontend
npm install
```

By default the frontend talks to `http://localhost:5000/api`. If your backend runs somewhere else,
create a `.env` file in `frontend/`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the dev server:

```bash
npm run dev
```

Vite will print the local URL (typically **http://localhost:5173**) — open it in a browser.

### 3. (Optional) One-time data migrations

A few standalone scripts in `backend/` were used to backfill data when the schema changed. They're
safe to run against a fresh database (they'll just find nothing to update) and unnecessary otherwise:

```bash
cd backend
node migrate-status.js               # normalizes old status values
node migrate-tasks.js                # todo/done -> active/completed on tasks
node migrate-task-completed-at.js    # backfills completedAt on already-completed tasks
```

## 🖱 Using the App

There's no login (see [`SECURITY_CONSIDERATIONS.md`](./docs/SECURITY_CONSIDERATIONS.md)) — a
**user switcher** in the sidebar lets you pick who you're "viewing as." Create a project, add user
stories to it, break stories into tasks, optionally group stories into a sprint, and drag cards across
the Kanban board as work progresses. Press `Ctrl/Cmd+K` anywhere for the command palette, or `?` for
the full keyboard shortcut list.

## 🩺 Troubleshooting

- **Backend won't connect to Mongo** — double-check `MONGO_URI` in `backend/.env` and that your
  Atlas cluster's network access allows your current IP.
- **Frontend loads but no data appears** — confirm the backend is running and reachable at the URL
  the frontend expects (`VITE_API_URL`, or the `http://localhost:5000/api` default).
- **Port 5000 already in use** — change `PORT` in `backend/.env` and update `VITE_API_URL` to match.

## DEMO

-LINK: https://projekto-flax.vercel.app/

-VIDEO: https://drive.google.com/file/d/1AyE57Rr0F3atSz_MTbVjyaLGBWOErPwO/view?usp=drive_link
NOTE: At 11:03, I meant to say "authentication" but slipped up and said "authorization" instead.
