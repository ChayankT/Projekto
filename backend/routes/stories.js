const express = require('express');
const router = express.Router();
const UserStory = require('../models/UserStory');
const Task = require('../models/Task');
const { reopenProject, reopenSprint } = require('../utils/cascadeUp');

/**
 * @swagger
 * tags:
 *   name: Stories
 *   description: User Story management
 */

// GET stories (filter by project)
/**
 * @swagger
 * /api/stories:
 *   get:
 *     summary: Get all user stories (optionally filter by project)
 *     tags: [Stories]
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: Project ID to filter by
 *       - in: query
 *         name: sprint
 *         schema:
 *           type: string
 *         description: Sprint ID to filter by ("none" for backlog / unassigned stories)
 *       - in: query
 *         name: archived
 *         schema:
 *           type: string
 *         description: "'true' to get only archived stories, 'all' to include both, otherwise only non-archived (default)"
 *     responses:
 *       200:
 *         description: List of stories
 */
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.project) filter.project = req.query.project;
        if (req.query.sprint === 'none') filter.sprint = null;
        else if (req.query.sprint) filter.sprint = req.query.sprint;
        if (req.query.archived === 'true') filter.archived = true;
        else if (req.query.archived !== 'all') filter.archived = { $ne: true };
        const stories = await UserStory.find(filter)
            .populate('project', 'name')
            .populate('assignee', 'name email')
            .populate('sprint', 'name status')
            .sort({ createdAt: -1 });
        res.json(stories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET story by ID (with tasks)
/**
 * @swagger
 * /api/stories/{id}:
 *   get:
 *     summary: Get a story with its tasks
 *     tags: [Stories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Story with tasks
 *       404:
 *         description: Not found
 */
router.get('/:id', async (req, res) => {
    try {
        const story = await UserStory.findById(req.params.id)
            .populate('project', 'name')
            .populate('assignee', 'name email')
            .populate('sprint', 'name status');
        if (!story) return res.status(404).json({ message: 'Story not found' });
        const tasks = await Task.find({ story: req.params.id, archived: { $ne: true } })
            .populate('assignee', 'name email')
            .sort({ createdAt: 1 });
        res.json({ ...story.toObject(), tasks });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create story
/**
 * @swagger
 * /api/stories:
 *   post:
 *     summary: Create a new user story
 *     tags: [Stories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [project, title]
 *             properties:
 *               project:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               status:
 *                 type: string
 *                 enum: [active, in_progress, completed]
 *               assignee:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created story
 */
router.post('/', async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.status === 'completed') payload.completedAt = new Date();
        const story = new UserStory(payload);
        const saved = await story.save();

        // A newly created story that isn't itself completed means there's
        // active work again — reopen its project (even if archived), and
        // its sprint (if any), wherever either had been closed.
        if (saved.status !== 'completed') {
            const reopenOps = [reopenProject(saved.project)];
            if (saved.sprint) reopenOps.push(reopenSprint(saved.sprint));
            await Promise.all(reopenOps);
        }

        const populated = await UserStory.findById(saved._id)
            .populate('project', 'name')
            .populate('assignee', 'name email')
            .populate('sprint', 'name status');
        res.status(201).json(populated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update story
/**
 * @swagger
 * /api/stories/{id}:
 *   put:
 *     summary: Update a user story (marking it completed cascades to all its tasks)
 *     tags: [Stories]
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
 *         description: Updated story
 */
router.put('/:id', async (req, res) => {
    try {
        const payload = { ...req.body };
        // Track completion time (used for cascading to tasks below; the
        // Sprint page's burndown is driven by each Task's own completedAt).
        if (payload.status === 'completed') {
            payload.completedAt = new Date();
        } else if (payload.status) {
            payload.completedAt = null;
        }
        const updated = await UserStory.findByIdAndUpdate(req.params.id, payload, {
            new: true,
            runValidators: true,
        })
            .populate('project', 'name')
            .populate('assignee', 'name email')
            .populate('sprint', 'name status');
        if (!updated) return res.status(404).json({ message: 'Story not found' });

        // Completing a story cascades down: all of its tasks complete too.
        if (payload.status === 'completed') {
            await Task.updateMany(
                { story: req.params.id, archived: { $ne: true }, status: { $ne: 'completed' } },
                { status: 'completed', completedAt: new Date() }
            );
        } else if (updated.status !== 'completed') {
            // Editing a story into (or leaving it in) a non-completed state
            // means there's active work again — reopen its project (even if
            // archived) and its sprint (if any), wherever either had been
            // closed.
            const reopenOps = [reopenProject(updated.project._id)];
            if (updated.sprint) reopenOps.push(reopenSprint(updated.sprint._id));
            await Promise.all(reopenOps);
        }

        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE story + cascade tasks
/**
 * @swagger
 * /api/stories/{id}:
 *   delete:
 *     summary: Delete a story and its tasks
 *     tags: [Stories]
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
        const story = await UserStory.findByIdAndDelete(req.params.id);
        if (!story) return res.status(404).json({ message: 'Story not found' });
        await Task.deleteMany({ story: req.params.id });
        res.json({ message: 'Story and related tasks deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
