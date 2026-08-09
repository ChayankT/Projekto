const express = require('express');
const router = express.Router();
const Sprint = require('../models/Sprint');
const UserStory = require('../models/UserStory');
const Task = require('../models/Task');
const { reopenProject } = require('../utils/cascadeUp');

/**
 * @swagger
 * tags:
 *   name: Sprints
 *   description: Sprint planning, boards, and burndown tracking
 */

// GET sprints (optionally filter by project)
/**
 * @swagger
 * /api/sprints:
 *   get:
 *     summary: Get all sprints (optionally filter by project)
 *     tags: [Sprints]
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of sprints
 */
router.get('/', async (req, res) => {
    try {
        const filter = req.query.project ? { project: req.query.project } : {};
        const sprints = await Sprint.find(filter)
            .populate('project', 'name')
            .sort({ startDate: -1 });
        res.json(sprints);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET single sprint (with its stories)
router.get('/:id', async (req, res) => {
    try {
        const sprint = await Sprint.findById(req.params.id).populate('project', 'name');
        if (!sprint) return res.status(404).json({ message: 'Sprint not found' });
        const stories = await UserStory.find({ sprint: req.params.id, archived: { $ne: true } })
            .populate('assignee', 'name email')
            .sort({ createdAt: -1 });
        res.json({ ...sprint.toObject(), stories });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET burndown data for a sprint — tracks TASK completion (not story points).
// Total/completed/remaining/percentage are computed from the real Task
// documents belonging to the sprint's stories, and the day-by-day series
// plots remaining task counts using each task's completedAt.
/**
 * @swagger
 * /api/sprints/{id}/burndown:
 *   get:
 *     summary: Get ideal-vs-actual task-completion burndown series for a sprint
 *     tags: [Sprints]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task-based burndown series
 */
router.get('/:id/burndown', async (req, res) => {
    try {
        const sprint = await Sprint.findById(req.params.id);
        if (!sprint) return res.status(404).json({ message: 'Sprint not found' });

        const stories = await UserStory.find({ sprint: req.params.id, archived: { $ne: true } }, '_id');
        const storyIds = stories.map(s => s._id);
        const tasks = await Task.find({ story: { $in: storyIds }, archived: { $ne: true } });

        const totalTasks = tasks.length;

        const start = new Date(sprint.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(sprint.endDate);
        end.setHours(0, 0, 0, 0);
        const dayMs = 24 * 60 * 60 * 1000;
        const totalDays = Math.max(1, Math.round((end - start) / dayMs));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Weekend-aware ideal line: the ideal burn only decreases on weekdays,
        // so it holds flat over Sat/Sun instead of implying weekend work.
        const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
        let weekdayCount = 0;
        for (let i = 1; i <= totalDays; i++) {
            const day = new Date(start.getTime() + i * dayMs);
            if (!isWeekend(day)) weekdayCount++;
        }
        // If the whole sprint span is weekend days (edge case), fall back to
        // an even split across all days so the line still reaches zero.
        const perStepBurn = weekdayCount > 0 ? totalTasks / weekdayCount : totalTasks / totalDays;

        const series = [];
        let idealRemaining = totalTasks;
        for (let i = 0; i <= totalDays; i++) {
            const day = new Date(start.getTime() + i * dayMs);
            if (i > 0 && (weekdayCount === 0 || !isWeekend(day))) {
                idealRemaining = Math.max(0, idealRemaining - perStepBurn);
            }
            const ideal = idealRemaining;

            let actual = null;
            if (day <= today) {
                const completedByDay = tasks.reduce((sum, t) => {
                    if (t.status === 'completed' && t.completedAt && new Date(t.completedAt) <= day) {
                        return sum + 1;
                    }
                    return sum;
                }, 0);
                actual = Math.max(0, totalTasks - completedByDay);
            }

            series.push({
                date: day.toISOString().slice(0, 10),
                ideal: Math.round(ideal * 10) / 10,
                actual,
            });
        }

        const completedTasks = tasks.reduce((sum, t) => sum + (t.status === 'completed' ? 1 : 0), 0);
        const remainingTasks = totalTasks - completedTasks;
        const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        res.json({ totalTasks, completedTasks, remainingTasks, completionPercentage, series });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET velocity across a project's completed sprints
/**
 * @swagger
 * /api/sprints/velocity/{projectId}:
 *   get:
 *     summary: Get completed-points velocity for each completed sprint in a project
 *     tags: [Sprints]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Velocity per sprint
 */
router.get('/velocity/:projectId', async (req, res) => {
    try {
        const sprints = await Sprint.find({ project: req.params.projectId, status: 'completed' }).sort({ endDate: 1 });
        const velocity = await Promise.all(sprints.map(async (sprint) => {
            const stories = await UserStory.find({ sprint: sprint._id, archived: { $ne: true } });
            const totalPoints = stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
            const completedPoints = stories.reduce((sum, s) => sum + (s.status === 'completed' ? (s.storyPoints || 0) : 0), 0);
            return { sprintId: sprint._id, name: sprint.name, totalPoints, completedPoints };
        }));
        res.json(velocity);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create sprint
/**
 * @swagger
 * /api/sprints:
 *   post:
 *     summary: Create a new sprint
 *     tags: [Sprints]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [project, name, startDate, endDate]
 *             properties:
 *               project:
 *                 type: string
 *               name:
 *                 type: string
 *               goal:
 *                 type: string
 *               startDate:
 *                 type: string
 *               endDate:
 *                 type: string
 *               capacity:
 *                 type: number
 *                 description: Team capacity for the sprint, in story points
 *     responses:
 *       201:
 *         description: Created sprint
 */
router.post('/', async (req, res) => {
    try {
        if (req.body.startDate && req.body.endDate && new Date(req.body.endDate) <= new Date(req.body.startDate)) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }
        if (req.body.capacity !== undefined && req.body.capacity !== null && req.body.capacity !== '' && Number(req.body.capacity) < 0) {
            return res.status(400).json({ message: 'Capacity cannot be negative' });
        }
        const sprint = new Sprint(req.body);
        const saved = await sprint.save();

        // A newly created sprint that isn't itself completed means the
        // project has active work again — reopen the project if it had
        // been marked completed OR archived.
        if (saved.status !== 'completed') {
            await reopenProject(saved.project);
        }

        const populated = await saved.populate('project', 'name');
        res.status(201).json(populated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update sprint (also used to start/complete a sprint via { status }; marking it
// completed cascades to all its stories and their tasks)
router.put('/:id', async (req, res) => {
    try {
        if (req.body.startDate && req.body.endDate && new Date(req.body.endDate) <= new Date(req.body.startDate)) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }
        if (req.body.capacity !== undefined && req.body.capacity !== null && req.body.capacity !== '' && Number(req.body.capacity) < 0) {
            return res.status(400).json({ message: 'Capacity cannot be negative' });
        }
        const updated = await Sprint.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        }).populate('project', 'name');
        if (!updated) return res.status(404).json({ message: 'Sprint not found' });

        // Completing a sprint cascades down: all of its stories, and all of
        // those stories' tasks, complete too.
        if (req.body.status === 'completed') {
            const stories = await UserStory.find({ sprint: req.params.id, archived: { $ne: true } }, '_id');
            const storyIds = stories.map(s => s._id);
            await UserStory.updateMany(
                { _id: { $in: storyIds }, status: { $ne: 'completed' } },
                { status: 'completed', completedAt: new Date() }
            );
            await Task.updateMany(
                { story: { $in: storyIds }, archived: { $ne: true }, status: { $ne: 'completed' } },
                { status: 'completed', completedAt: new Date() }
            );
        } else if (updated.status !== 'completed') {
            // Editing a sprint into (or leaving it in) a non-completed state
            // means the project has active work again — reopen it if it had
            // been marked completed or archived.
            await reopenProject(updated.project._id);
        }

        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE sprint (stories are unassigned back to the backlog, not deleted)
router.delete('/:id', async (req, res) => {
    try {
        const sprint = await Sprint.findByIdAndDelete(req.params.id);
        if (!sprint) return res.status(404).json({ message: 'Sprint not found' });
        await UserStory.updateMany({ sprint: req.params.id }, { sprint: null });
        res.json({ message: 'Sprint deleted; stories returned to backlog' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
