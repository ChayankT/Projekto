# 🗄 Database Schema

MongoDB is the datastore, accessed through Mongoose.

### User
```javascript
{
  name: String,
  email: String (unique),
  role: [admin|member],
  timestamps: true
}
```

### Project
```javascript
{
  name: String,
  description: String,
  status: [active|completed|archived],
  statusBeforeArchive: [active|completed|null], // remembers pre-archive status so Restore can return to it
  owner: ObjectId (User),
  timestamps: true
}
```

### Sprint
```javascript
{
  project: ObjectId (Project),
  name: String,
  goal: String,
  startDate: Date,
  endDate: Date,
  status: [planned|active|completed],
  capacity: Number (nullable, min: 0 — team capacity in story points; null means "not set", distinct from a deliberate 0. Compared against the sum of the sprint's stories' storyPoints to flag over-commitment in the UI),
  timestamps: true
}
```

### UserStory
```javascript
{
  project: ObjectId (Project),
  title: String,
  description: String,
  priority: [low|medium|high],
  status: [active|in_progress|completed],
  assignee: ObjectId (User),
  storyPoints: Number (default: 1),
  sprint: ObjectId (Sprint, nullable — null means the story sits in the backlog),
  completedAt: Date (nullable — filled in automatically once status becomes "completed"),
  tags: [String] (default: [] — free-form labels for filtering, unrelated to status/priority),
  archived: Boolean (default: false — soft delete; excluded from board/list queries unless requested),
  timestamps: true
}
```

### Task
```javascript
{
  story: ObjectId (UserStory),
  title: String,
  description: String,
  status: [active|in_progress|completed],
  assignee: ObjectId (User),
  dueDate: Date,
  completedAt: Date (nullable — filled in automatically once status becomes "completed"; drives the Sprint page's task-based burndown),
  archived: Boolean (default: false — soft delete; excluded from board/list queries unless requested),
  timestamps: true
}
```

### Notification
```javascript
{
  user: ObjectId (User),
  message: String,
  taskId: ObjectId (Task),
  isRead: Boolean (default: false),
  timestamps: true
}
```
