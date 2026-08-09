/**
 * One-time migration: backlog → active, done → completed
 * Run: node migrate-status.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

async function migrate() {
    await mongoose.connect(MONGO_URI, { tlsAllowInvalidCertificates: true });
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const col = db.collection('userstories');

    const r1 = await col.updateMany({ status: 'backlog' }, { $set: { status: 'active' } });
    console.log(`backlog → active: ${r1.modifiedCount} documents updated`);

    const r2 = await col.updateMany({ status: 'done' }, { $set: { status: 'completed' } });
    console.log(`done → completed: ${r2.modifiedCount} documents updated`);

    console.log('Migration complete!');
    await mongoose.disconnect();
}

migrate().catch(err => { console.error(err); process.exit(1); });
