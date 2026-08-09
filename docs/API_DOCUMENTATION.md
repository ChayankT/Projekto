# 📡 API Documentation

Base URL: `http://localhost:5000`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/users` | List all users / create a user |
| GET/PUT/DELETE | `/api/users/:id` | Fetch, update, or remove one user. Delete is blocked with `400` if the user still owns any project (reassign ownership first); otherwise it also clears (`null`s) that user as `assignee` on any of their stories and tasks, rather than leaving a dangling reference behind |
| GET/POST | `/api/projects` | List all projects / create a project |
| GET/PUT/DELETE | `/api/projects/:id` | Fetch a project (with its stories) / update / delete (cascades to the project's sprints, stories, **and** their tasks) |
| GET/POST | `/api/stories?project=X&sprint=Y&archived=Z` | List stories, optionally filtered by project and/or sprint (`sprint=none` returns backlog items); `archived=true` returns only archived stories, `archived=all` returns both, otherwise only non-archived (default) / create a story |
| GET/PUT/DELETE | `/api/stories/:id` | Fetch a story (with its non-archived tasks) / update (also how a story is archived/restored, via `{ archived: true|false }`) / permanently delete |
| GET/POST | `/api/tasks?story=X&archived=Y` | List tasks, optionally by story; `archived=true` returns only archived tasks, `archived=all` returns both, otherwise only non-archived (default) / create a task |
| GET/PUT/DELETE | `/api/tasks/:id` | Fetch, update (also how a task is archived/restored, via `{ archived: true|false }`), or permanently remove one task |
| GET/POST | `/api/sprints?project=X` | List sprints, optionally by project / create a sprint |
| GET/PUT/DELETE | `/api/sprints/:id` | Fetch a sprint (with its stories) / update (also how a sprint is started or completed, via the `status` field, and how its `capacity` — team capacity in story points — is set or cleared) / delete (its stories move back to the backlog rather than being deleted) |
| GET | `/api/sprints/:id/burndown` | Ideal-vs-actual TASK-completion burndown series for a sprint (totals/percentage plus a day-by-day series of remaining tasks). The ideal line is weekend-aware: it only decreases on weekdays and holds flat across Saturday/Sunday. |
| GET | `/api/sprints/velocity/:projectId` | Completed-points velocity across a project's completed sprints |
| GET | `/api/notifications?user=X` | Fetch a user's notifications |
| GET | `/api/notifications/unread-count?user=X` | Fetch a user's unread notification count |
| PUT | `/api/notifications/:id/read` | Mark a single notification as read |
| PUT | `/api/notifications/mark-all-read` | Mark every notification for a user as read |
| GET | `/api-docs` | Swagger UI |

The full interactive API reference is served by Swagger UI at **http://localhost:5000/api-docs** whenever the backend is running.

Creating or editing a sprint, story, or task into a non-completed state also **reopens** anything closed above it in the hierarchy — a `completed` sprint/project, or an `archived` project — the mirror of the completion cascade described in `ARCHITECTURE_OVERVIEW.md`.
