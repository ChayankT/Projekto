require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

async function migrateTasks() {
    await mongoose.connect(MONGO_URI, { tlsAllowInvalidCertificates: true });
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const col = db.collection('tasks');

    const r1 = await col.updateMany({ status: 'todo' }, { $set: { status: 'active' } });
    console.log(`todo → active: ${r1.modifiedCount} documents updated`);

    const r2 = await col.updateMany({ status: 'done' }, { $set: { status: 'completed' } });
    console.log(`done → completed: ${r2.modifiedCount} documents updated`);

    console.log('Task Migration complete!');
    await mongoose.disconnect();
}

migrateTasks().catch(err => { console.error(err); process.exit(1); });
