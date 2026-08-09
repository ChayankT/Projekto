const mongoose = require('mongoose');

const UserStorySchema = new mongoose.Schema(
    {
        project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        status: { type: String, enum: ['active', 'in_progress', 'completed'], default: 'active' },
        assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        storyPoints: { type: Number, default: 1, min: 0 },
        sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', default: null },
        completedAt: { type: Date, default: null },
        tags: { type: [String], default: [] },
        archived: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model('UserStory', UserStorySchema);
