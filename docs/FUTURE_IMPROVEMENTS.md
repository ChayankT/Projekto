# 🔮 Future Improvements

Given more time, these are the improvements that would be worth prioritizing next:

1. **JWT authentication** — real login, user sessions, and route guards on private pages.
2. **Role-based access** — separate admin and member permissions, scoped per project.
3. **Email notifications** — layer Nodemailer or SendGrid on top of the existing in-app, MongoDB-backed notifications.
4. **Real-time updates** — a WebSocket/Socket.io connection so the Kanban board stays live and synchronized across users.
5. **Audit log** — a record of every state change (who moved what, and when).
6. **Test suite** — Jest + Supertest on the API side, React Testing Library on the frontend.
7. **Docker setup** — containerize the backend and database for consistent, repeatable deployments.
8. **CI/CD pipeline** — a GitHub Actions workflow that builds and deploys automatically to something like Railway or Render.
9. **Persisted burndown snapshots** — burndown data is currently recalculated live from each sprint's task data on every request; storing a daily snapshot per sprint would keep historical burndown intact even after tasks are later edited, reassigned, or archived.
10. **Backlog reordering** — drag-and-drop prioritization of backlog stories, separate from the existing status-column Kanban drag-and-drop, to better support sprint planning.
11. **Context-aware "Create New Story"/"Create New Task" in the Command Palette** — today only "Create New Project" is a quick action, since it has one obvious global destination. Stories and tasks need a project (and, for tasks, a story) as context first; a fuller version of the palette could let someone type "New story in <project>" / "New task in <story>" and resolve the target from the query, or fall back to a project/story picker step before opening the create dialog.
12. **Comment editing, @mentions, and mention-triggered notifications** — comments currently support add/delete only; editing in place (vs. delete-and-repost) and @mentioning a specific teammate — which would notify just them, reusing the same `Notification` model the assignment/sprint triggers already use — are natural next steps once the thread gets busier.
13. **Notification triggers for comments and project-level events** — comments don't currently notify anyone (not even the story/task's assignee), and project-level completion/reopening has no notification at all, unlike sprint start/complete; both would follow the same "diff the previous value, notify the relevant people" pattern already used for assignment and sprint status.
