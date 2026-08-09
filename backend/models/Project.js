const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
        // Remembers what `status` was right before the project was archived, so
        // restoring can put it back where it was instead of always landing on 'active'.
        statusBeforeArchive: { type: String, enum: ['active', 'completed'], default: null },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Project', ProjectSchema);
