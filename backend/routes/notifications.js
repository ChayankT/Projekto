const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notifications
 */

// GET notifications for a user
/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications for a user
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: user
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/', async (req, res) => {
    try {
        if (!req.query.user) return res.status(400).json({ message: 'user query param required' });
        const notifications = await Notification.find({ user: req.query.user })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET unread count for a user
/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count for a user
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: user
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Count object
 */
router.get('/unread-count', async (req, res) => {
    try {
        if (!req.query.user) return res.status(400).json({ message: 'user query param required' });
        const count = await Notification.countDocuments({ user: req.query.user, isRead: false });
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT mark a notification as read
/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated notification
 *       404:
 *         description: Not found
 */
router.put('/:id/read', async (req, res) => {
    try {
        const notif = await Notification.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        );
        if (!notif) return res.status(404).json({ message: 'Notification not found' });
        res.json(notif);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT mark all read for a user
/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   put:
 *     summary: Mark all notifications as read for a user
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user]
 *             properties:
 *               user:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/mark-all-read', async (req, res) => {
    try {
        await Notification.updateMany({ user: req.body.user }, { isRead: true });
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
