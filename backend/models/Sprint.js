const mongoose = require('mongoose');

const SprintSchema = new mongoose.Schema(
    {
        project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
        name: { type: String, required: true, trim: true },
        goal: { type: String, default: '' },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        status: { type: String, enum: ['planned', 'active', 'completed'], default: 'planned' },
        // Team capacity for this sprint, in story points. Optional — null
        // means "not set", distinct from 0 (a deliberately empty sprint).
        // Compared against the sum of committed stories' storyPoints so the
        // UI can warn when a sprint is over-committed.
        capacity: { type: Number, default: null, min: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Sprint', SprintSchema);
