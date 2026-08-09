const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
    {
        story: { type: mongoose.Schema.Types.ObjectId, ref: 'UserStory', required: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        status: { type: String, enum: ['active', 'in_progress', 'completed'], default: 'active' },
        assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        dueDate: { type: Date, default: null },
        completedAt: { type: Date, default: null },
        archived: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Task', TaskSchema);
