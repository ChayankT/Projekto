# 🏛 Architecture & Project Overview

## ⚡ Projekto — Agile Project Management Tool

A full-stack app for running agile projects on small teams (roughly 3–10 people).
Work is organized as **Project → Sprint → User Story → Task**, tracked on a drag-and-drop Kanban board, with sprint planning via story points, a task-completion-based ideal-vs-actual burndown chart, per-sprint velocity (still points-based), and background notifications for overdue work.

## ✅ Completion Cascades Down the Hierarchy

Marking any container as `completed` — a project, a sprint, or a story — cascades that status to everything it contains, all the way down to tasks. Archived items are skipped so completing a parent never un-archives or resurrects something intentionally set aside:

- **Project → completed**: all its sprints, all its (non-archived) stories, and all of those stories' (non-archived) tasks are set to `completed`.
- **Sprint → completed** (via the "Complete Sprint" action): all of the sprint's (non-archived) stories, and their tasks, are set to `completed`.
- **Story → completed**: all of the story's (non-archived) tasks are set to `completed`.

This only cascades downward — completing every task in a story does not automatically complete the story, and completing a story doesn't automatically complete its sprint or project. Marking the container itself as done is a deliberate, separate action. (The reverse direction — reopening — does travel upward automatically; see below.)

## 🔼 Reopening Cascades Up the Hierarchy

The mirror image of the section above, via `backend/utils/cascadeUp.js`: whenever a sprint, story, or task is **created**, or **edited into (or left in) a non-completed state**, anything above it that had been closed no longer reflects reality — so it reopens to `active`:

- **New or edited task, not completed**: its story, sprint (if any), and project all reopen — including un-archiving the project if it had been archived.
- **New or edited story, not completed**: its project and sprint (if any) reopen the same way.
- **New or edited sprint, not completed**: its project reopens.

Un-archiving a project this way also clears its `statusBeforeArchive` snapshot (see `DESIGN_DECISIONS.md`) — that snapshot exists for restoring via the Archive page's explicit **Restore** action, and no longer applies once the project has been reopened by new work appearing underneath it instead.

This is genuinely the reverse of the cascade above, not an extension of it: completion still never propagates upward on its own — reopening is the only thing that travels up the hierarchy, and only in response to *new or edited* non-completed work, never as a side effect of merely reading or viewing data.

## 🔄 Same-Session Data Freshness

There's no websocket/live-update layer (see `FUTURE_IMPROVEMENTS.md`) — every page fetches its own slice of data from the REST API, which is enough when navigating between routes since React Router unmounts/remounts the page. It falls short for pages that stay mounted while a mutation happens elsewhere in the same session — e.g. completing a task on Story Detail while Team, a Sprint board, or My Work (open in another tab, or navigated back to) were computed from an earlier fetch.

`DataSyncContext` (`frontend/src/context/DataSyncContext.jsx`) is a minimal, additive fix for that specific gap — not a websocket replacement, just two version counters (`taskVersion`, `storyVersion`) bumped via `notifyTasksChanged()`/`notifyStoriesChanged()` whenever a task or story is created, edited, archived, restored, or dragged to a new status. Aggregate/dependent views depend on those counters in their data-loading `useEffect`, so they refetch immediately instead of waiting for a remount.

## 🗂 Core Pages (frontend)

- **Dashboard** (`/`) — a cross-project snapshot: project stat counts, plus an "Active Sprints" section (any sprint currently `active`, across every project) that deep-links straight to that sprint's board — the fastest way to reach a burndown chart without drilling into a specific project first.
- **My Work** (`/my-work`) — the stories and tasks assigned to whoever is currently signed in.
- **Projects** (`/projects`, `/projects/:id`) — the project list, plus a drag-and-drop Kanban board (built with `@hello-pangea/dnd`) for a project's stories.
- **Sprint Detail** (`/projects/:id/sprints/:sprintId`) — a single sprint's drag-and-drop board plus its task-based burndown chart and task-completion totals (not story points — see "Sprints & Burndown" below). An "Add Story" action lets you pull any of the project's uncompleted stories into the sprint directly from here — whether they're currently sitting in the backlog or in a different sprint — instead of needing to open each story individually from the project board to change its sprint field.
- **Calendar** (`/calendar`) — a calendar view organized around due dates.
- **Story Detail** (`/stories/:id`) — a story broken down into its tasks.
- **Notifications** (`/notifications`) — overdue-task alerts, with the ability to mark them read or dismiss them.
- **Team** (`/team`) — where users are managed.
- **Archive** (`/archive`) — archived projects, stories, and tasks, each restorable or permanently deletable from their own tab.
- A command palette (`Ctrl/Cmd+K`) is available app-wide for quick navigation and actions.

## ⌨ Keyboard Shortcuts

| Shortcut | Where | Action |
|---|---|---|
| `Ctrl/Cmd + K` | Anywhere | Open the command palette |
| `N` | Story Detail (`/stories/:id`) | Open the **New Task** dialog |
| `Shift + N` | Project board (`/projects/:id`) | Open the **New Story** dialog |
| `/` | Project board (`/projects/:id`) | Jump to the backlog search box (switches to the Backlog tab first if needed) |
| `G` then `D` | Anywhere | Go to Dashboard |
| `G` then `M` | Anywhere | Go to My Work |
| `G` then `P` | Anywhere | Go to Projects |
| `G` then `C` | Anywhere | Go to Calendar |
| `G` then `T` | Anywhere | Go to Team |
| `G` then `N` | Anywhere | Go to Notifications |
| `G` then `A` | Anywhere | Go to Archive |
| `?` | Anywhere | Open the keyboard shortcuts help dialog |
| `Esc` | Anywhere a dialog/palette is open | Close it |

Create shortcuts are deliberately page-scoped rather than global: a task only makes sense in the context of a specific story, and a story only in the context of a specific project, so `N`/`Shift+N` only fire on the page that already has that context — the same reasoning behind the command palette only deep-linking "Create New Project" (see `DESIGN_DECISIONS.md`). Shortcuts are ignored while typing in a text field, and disabled while a dialog is already open, so they never fire underneath a modal or hijack a form field.

The `G` go-to shortcuts are a two-key sequence rather than a chord: pressing `G` arms an 800ms window, and the next keystroke (if it matches the map above) navigates; anything else, or letting the window lapse, cancels the sequence silently. Like the other shortcuts, a `G` sequence won't arm or continue while typing in a field or while a dialog/palette is open.

## 🗃 Filtering, Tags & Archiving

- The project board's backlog view supports search (title/description/tags) plus filters for priority, assignee, and sprint scope (backlog only, any sprint, or one specific sprint).
- `UserStory` carries a free-form `tags: [String]` field, editable as a comma-separated list on the story form and shown as badges on cards; it's included in the board's search matching.
- Soft delete now extends below the project level: `UserStory` and `Task` both carry an `archived` boolean. Archiving a story or task (via the board's archive action) hides it from boards, `My Work`, the calendar, and the overdue-task notifier, without deleting it. The `/archive` page's Stories and Tasks tabs list archived items for restore or permanent deletion, mirroring the existing project archive/restore/delete-forever pattern.

## 📈 Sprints & Burndown

Each `UserStory` carries a `storyPoints` value and an optional link to a `sprint`; each `Task` carries a `completedAt` timestamp that's set the moment its status flips to `completed` (and cleared if it moves away from that status).

- `GET /api/sprints/:id/burndown` is **task-based, not points-based**: it pulls every (non-archived) `Task` belonging to the sprint's stories and builds a daily ideal line next to an actual line, both plotted in units of task count rather than story points. The ideal line is weekend-aware: the sprint's total task count is spread evenly across its weekdays only, so the line holds flat over Saturday/Sunday instead of implying weekend work (falls back to an even day-by-day split in the edge case where a sprint's span contains no weekdays at all). The actual line is built from each task's `completedAt` date.
- `GET /api/sprints/velocity/:projectId` still reports total vs. completed **story points** for each of a project's finished sprints; this is what feeds the project's velocity panel. Velocity was not changed by the burndown switch — it's the one place in the app that still measures work in points rather than tasks.
- Deleting a sprint doesn't delete its stories — they fall back into the backlog (`sprint` is set to `null`). Deleting a project, by contrast, cascades and removes its sprints and stories along with it.

## ⚙ Async Background Workflow

File: `backend/jobs/overdueNotifier.js`

**What it does:**
A `node-cron` job fires once every 60 seconds and:
1. Looks for tasks where `dueDate` is in the past, `status` isn't `completed`, there's an `assignee` set, and the task isn't archived
2. For each one, checks whether an unread notification for that task already exists (so the same task doesn't spam a user with duplicates)
3. If not, creates a new `Notification` for the assignee

**Failure handling:**
- The whole job body runs inside a `try/catch`
- Errors get logged to stdout rather than crashing the process
- Because the cron schedule fires again every 60 seconds regardless of the previous run's outcome, a failed pass effectively retries itself on the next tick

**Visibility:**
- A bell icon in the sidebar shows the unread count, refreshed every 30 seconds
- Clicking it opens the `/notifications` page, where notifications can be dismissed or marked read
