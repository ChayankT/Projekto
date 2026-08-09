const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const UserStory = require('../models/UserStory');
const Task = require('../models/Task');

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Free-text comments left on a story or a task
 */

const ENTITY_MODELS = { story: UserStory, task: Task };

// GET comments for a story or task
/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: Get comments for a story or task, oldest first
 *     tags: [Comments]
 *     parameters:
 *       - in: query
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [story, task]
 *       - in: query
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments
 *       400:
 *         description: Missing or invalid entityType/entityId
 */
router.get('/', async (req, res) => {
    try {
        const { entityType, entityId } = req.query;
        if (!entityType || !entityId) {
            return res.status(400).json({ message: 'entityType and entityId query params are required' });
        }
        if (!ENTITY_MODELS[entityType]) {
            return res.status(400).json({ message: "entityType must be 'story' or 'task'" });
        }
        const comments = await Comment.find({ entityType, entityId })
            .populate('author', 'name email')
            .sort({ createdAt: 1 });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create a comment
/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Add a comment to a story or task
 *     tags: [Comments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [entityType, entityId, author, body]
 *             properties:
 *               entityType:
 *                 type: string
 *                 enum: [story, task]
 *               entityId:
 *                 type: string
 *               author:
 *                 type: string
 *               body:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created comment
 *       400:
 *         description: Missing/invalid fields
 *       404:
 *         description: The story or task doesn't exist
 */
router.post('/', async (req, res) => {
    try {
        const { entityType, entityId, author, body } = req.body;
        if (!entityType || !entityId || !author || !body) {
            return res.status(400).json({ message: 'entityType, entityId, author, and body are required' });
        }
        const Model = ENTITY_MODELS[entityType];
        if (!Model) {
            return res.status(400).json({ message: "entityType must be 'story' or 'task'" });
        }
        // Confirm the target still exists rather than silently letting
        // comments accumulate on a story/task that's already been deleted.
        const target = await Model.findById(entityId, '_id');
        if (!target) {
            return res.status(404).json({ message: `${entityType === 'story' ? 'Story' : 'Task'} not found` });
        }

        const comment = new Comment({ entityType, entityId, author, body });
        const saved = await comment.save();
        const populated = await Comment.findById(saved._id).populate('author', 'name email');
        res.status(201).json(populated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE a comment
/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id', async (req, res) => {
    try {
        const comment = await Comment.findByIdAndDelete(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        res.json({ message: 'Comment deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
