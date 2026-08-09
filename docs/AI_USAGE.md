# 🤖 AI Usage Note

**Google DeepMind's Antigravity AI assistant** was used to help build this project.

The assistant mainly handled:
- Scaffolding the initial project skeleton (models, routes, and a hand-rolled CSS design system).
- Writing the Swagger/JSDoc annotations that power the interactive API docs.
- Producing consistent, repeatable React component patterns, including the sprint board, burndown chart, and velocity panel that were layered in later.

The developer stayed responsible for:
- Core architecture calls — e.g., picking `node-cron` over something like Celery, and MongoDB over a relational database.
- Getting the deduplication logic right in the background notifier job.
- UX judgment calls, including the drag-and-drop Kanban board (`@hello-pangea/dnd`), the ideal-vs-actual burndown chart, and how often notifications should poll.
- Designing the sprint / story-point data model, and the velocity math and (now task-based) burndown math built on top of it.
- Working through and writing up the security tradeoffs.

In short, AI sped things up considerably, but every line of generated code was read, understood, and adjusted by the developer before it shipped.

**On bugs:** the AI-generated code wasn't bug-free — it introduced issues along the way. The developer was the one who identified those bugs, then fixed them iteratively: some by hand, and others by going back to the AI assistant with the specific problem and having it produce the fix.
