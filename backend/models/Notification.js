const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        message: { type: String, required: true },
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
        isRead: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);
