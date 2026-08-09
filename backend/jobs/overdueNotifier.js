const cron = require('node-cron');
const Task = require('../models/Task');
const Notification = require('../models/Notification');

/**
 * Overdue Task Notifier — runs every 60 seconds.
 *
 * Logic:
 *  1. Find all tasks where dueDate < today AND status != 'completed' AND assignee is set.
 *  2. For each task, check if an unread notification for this task already exists for the assignee.
 *  3. If not, create a new Notification record.
 *
 * Failure handling:
 *  - Wrapped in try/catch; errors logged to console.
 *  - node-cron reschedules automatically on the next interval — no manual retry needed.
 */
const startOverdueNotifier = () => {
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            now.setHours(0, 0, 0, 0); // compare at day boundary

            const overdueTasks = await Task.find({
                dueDate: { $lt: now },
                status: { $ne: 'completed' },
                assignee: { $ne: null },
                archived: { $ne: true },
            }).populate('assignee', 'name');

            for (const task of overdueTasks) {
                // Avoid duplicate unread notifications for the same task+user
                const exists = await Notification.findOne({
                    user: task.assignee._id,
                    taskId: task._id,
                    isRead: false,
                });

                if (!exists) {
                    await Notification.create({
                        user: task.assignee._id,
                        taskId: task._id,
                        message: `⚠ Task "${task.title}" was due on ${task.dueDate.toDateString()} and is still not done.`,
                    });
                    console.log(`[Notifier] Created overdue notification for task: ${task.title}`);
                }
            }
        } catch (err) {
            console.error('[Notifier] Error in overdue task job:', err.message);
        }
    });

    console.log('[Notifier] Overdue task notifier started (runs every 60 seconds).');
};

module.exports = startOverdueNotifier;
