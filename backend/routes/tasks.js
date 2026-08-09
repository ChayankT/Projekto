const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const UserStory = require('../models/UserStory');
const { reopenStoryHierarchy } = require('../utils/cascadeUp');

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management
 */

// GET tasks (filter by story)
/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks (optionally filter by story)
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: story
 *         schema:
 *           type: string
 *         description: Story ID to filter by
 *       - in: query
 *         name: archived
 *         schema:
 *           type: string
 *         description: "'true' to get only archived tasks, 'all' to include both, otherwise only non-archived (default)"
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.story) filter.story = req.query.story;
        if (req.query.archived === 'true') filter.archived = true;
        else if (req.query.archived !== 'all') filter.archived = { $ne: true };
        const tasks = await Task.find(filter)
            .populate({ path: 'story', select: 'title project', populate: { path: 'project', select: 'name' } })
            .populate('assignee', 'name email')
            .sort({ createdAt: 1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET task by ID
/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a task by ID
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task
 *       404:
 *         description: Not found
 */
router.get('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('story', 'title')
            .populate('assignee', 'name email');
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create task
/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [story, title]
 *             properties:
 *               story:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, in_progress, completed]
 *               assignee:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Created task
 */
router.post('/', async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.status === 'completed') payload.completedAt = new Date();
        const task = new Task(payload);
        const saved = await task.save();

        // A newly created task that isn't itself completed means there's
        // active work again — walk up the hierarchy (task -> story ->
        // sprint / project) and reopen anything that had been closed,
        // including an archived project.
        if (saved.status !== 'completed') {
            const story = await UserStory.findById(saved.story);
            await reopenStoryHierarchy(story, { includeStory: true });
        }

        const populated = await Task.findById(saved._id)
            .populate('story', 'title')
            .populate('assignee', 'name email');
        res.status(201).json(populated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update task
/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated task
 */
router.put('/:id', async (req, res) => {
    try {
        const payload = { ...req.body };
        // Track completion time — the Sprint page's task-based burndown
        // uses this to know which day each task finished on.
        if (payload.status === 'completed') {
            payload.completedAt = new Date();
        } else if (payload.status) {
            payload.completedAt = null;
        }
        const updated = await Task.findByIdAndUpdate(req.params.id, payload, {
            new: true,
            runValidators: true,
        })
            .populate('story', 'title')
            .populate('assignee', 'name email');
        if (!updated) return res.status(404).json({ message: 'Task not found' });

        // Editing a task into (or leaving it in) a non-completed state means
        // there's active work again — walk up the hierarchy (task -> story
        // -> sprint / project) and reopen anything that had been closed,
        // including an archived project.
        if (updated.status !== 'completed') {
            const story = await UserStory.findById(updated.story._id);
            await reopenStoryHierarchy(story, { includeStory: true });
        }

        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE task
/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
