const mongoose = require('mongoose');

/**
 * Comment — a free-text note left on a UserStory or a Task, so more than one
 * person can leave context on why something moved or changed without that
 * context living only in someone's head or a Slack thread.
 *
 * Deliberately polymorphic (`entityType` + `entityId`) rather than two
 * separate collections (StoryComment/TaskComment): stories and tasks need
 * identical comment behavior, so one model + one route file covers both
 * instead of duplicating the same CRUD twice.
 */
const CommentSchema = new mongoose.Schema(
    {
        entityType: { type: String, enum: ['story', 'task'], required: true },
        entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        body: { type: String, required: true, trim: true },
    },
    { timestamps: true }
);

// Every read is "all comments for this one story/task, oldest first" — this
// is exactly that compound shape.
CommentSchema.index({ entityType: 1, entityId: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', CommentSchema);
