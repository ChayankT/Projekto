const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const UserStory = require('../models/UserStory');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management
 */

// GET all projects
/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: List of projects
 */
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find().populate('owner', 'name email').sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET project by ID (with stories)
/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get a project with its user stories
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project with stories
 *       404:
 *         description: Not found
 */
router.get('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('owner', 'name email');
        if (!project) return res.status(404).json({ message: 'Project not found' });
        const stories = await UserStory.find({ project: req.params.id, archived: { $ne: true } }).populate('assignee', 'name email').sort({ createdAt: -1 });
        res.json({ ...project.toObject(), stories });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create project
/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, owner]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, completed, archived]
 *               owner:
 *                 type: string
 *                 description: User ID
 *     responses:
 *       201:
 *         description: Created project
 */
router.post('/', async (req, res) => {
    try {
        const project = new Project(req.body);
        const saved = await project.save();
        const populated = await saved.populate('owner', 'name email');
        res.status(201).json(populated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update project
/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Update a project (marking it completed cascades to all its sprints, stories, and tasks)
 *     tags: [Projects]
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
 *         description: Updated project
 */
router.put('/:id', async (req, res) => {
    try {
        const payload = { ...req.body };
        // Archiving should remember whatever the status was right before, so a
        // later restore can put it back instead of always resetting to 'active'.
        // Any other status change (including an explicit restore) clears the
        // stash so it doesn't linger and get reused stale next time.
        if (payload.status === 'archived') {
            const existing = await Project.findById(req.params.id);
            if (existing && existing.status !== 'archived') {
                payload.statusBeforeArchive = existing.status;
            }
        } else if (payload.status) {
            payload.statusBeforeArchive = null;
        }
        const updated = await Project.findByIdAndUpdate(req.params.id, payload, {
            new: true,
            runValidators: true,
        }).populate('owner', 'name email');
        if (!updated) return res.status(404).json({ message: 'Project not found' });

        // Completing a project cascades all the way down the hierarchy: its
        // sprints, their stories, and those stories' tasks all complete too.
        if (payload.status === 'completed') {
            await Sprint.updateMany(
                { project: req.params.id, status: { $ne: 'completed' } },
                { status: 'completed' }
            );
            const stories = await UserStory.find({ project: req.params.id, archived: { $ne: true } }, '_id');
            const storyIds = stories.map(s => s._id);
            await UserStory.updateMany(
                { _id: { $in: storyIds }, status: { $ne: 'completed' } },
                { status: 'completed', completedAt: new Date() }
            );
            await Task.updateMany(
                { story: { $in: storyIds }, archived: { $ne: true }, status: { $ne: 'completed' } },
                { status: 'completed', completedAt: new Date() }
            );
        }

        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE project + cascade stories, tasks, and sprints
/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete a project and its stories, tasks, and sprints
 *     tags: [Projects]
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
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        const stories = await UserStory.find({ project: req.params.id }, '_id');
        const storyIds = stories.map(s => s._id);
        await Task.deleteMany({ story: { $in: storyIds } });
        await UserStory.deleteMany({ project: req.params.id });
        await Sprint.deleteMany({ project: req.params.id });
        res.json({ message: 'Project and related stories, tasks, and sprints deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
