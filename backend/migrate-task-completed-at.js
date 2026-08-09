/**
 * One-time migration: backfill `completedAt` on tasks that are already
 * status: 'completed' but predate the field (so the Sprint page's
 * task-based burndown has a real completion date to plot instead of
 * treating them as "completed on an unknown day").
 *
 * Falls back to each task's `updatedAt` as the best available estimate
 * of when it was completed.
 *
 * Run: node migrate-task-completed-at.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

async function migrate() {
    await mongoose.connect(MONGO_URI, { tlsAllowInvalidCertificates: true });
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const col = db.collection('tasks');

    const tasks = await col.find({
        status: 'completed',
        $or: [{ completedAt: null }, { completedAt: { $exists: false } }],
    }).toArray();

    let updated = 0;
    for (const task of tasks) {
        await col.updateOne(
            { _id: task._id },
            { $set: { completedAt: task.updatedAt || task.createdAt || new Date() } }
        );
        updated += 1;
    }
    console.log(`completedAt backfilled: ${updated} documents updated`);

    console.log('Migration complete!');
    await mongoose.disconnect();
}

migrate().catch(err => { console.error(err); process.exit(1); });
