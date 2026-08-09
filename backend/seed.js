/**
 * seed.js
 * ------------------------------------------------------------------
 * Populates the database with a realistic, connected set of sample
 * data: users, projects, sprints, user stories, tasks, and a couple
 * of notifications — including some overdue tasks so the built-in
 * overdueNotifier cron job (backend/jobs/overdueNotifier.js) has
 * something to fire on within a minute of the server starting.
 *
 * Usage:
 *   node seed.js            # adds seed data (skips if already seeded)
 *   node seed.js --reset    # wipes the 6 collections first, then reseeds
 *
 * Requires MONGO_URI to be set (via .env, same as the rest of the app).
 * ------------------------------------------------------------------
 */

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/User');
const Project = require('./models/Project');
const Sprint = require('./models/Sprint');
const UserStory = require('./models/UserStory');
const Task = require('./models/Task');
const Notification = require('./models/Notification');

const MONGO_URI = process.env.MONGO_URI;
const RESET = process.argv.includes('--reset');

// Small helper to shift a date by N days from today (day-boundary aligned,
// same as the overdueNotifier job's comparison).
function daysFromNow(n) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return d;
}

async function seed() {
    if (!MONGO_URI) {
        console.error('MONGO_URI is not set. Add it to backend/.env before running this script.');
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI, { tlsAllowInvalidCertificates: true });
    console.log('Connected to MongoDB');

    if (RESET) {
        console.log('--reset flag detected: clearing existing data...');
        await Promise.all([
            User.deleteMany({}),
            Project.deleteMany({}),
            Sprint.deleteMany({}),
            UserStory.deleteMany({}),
            Task.deleteMany({}),
            Notification.deleteMany({}),
        ]);
        console.log('Existing data cleared.');
    } else {
        const existingUsers = await User.countDocuments();
        if (existingUsers > 0) {
            console.log(`Found ${existingUsers} existing user(s). Re-run with --reset to wipe and reseed. Aborting.`);
            await mongoose.disconnect();
            return;
        }
    }

    // ── Users ────────────────────────────────────────────────────────
    const [alice, bob, carla, dev] = await User.insertMany([
        { name: 'Alice Johnson', email: 'alice.johnson@kpit.dev', role: 'admin' },
        { name: 'Bob Martinez', email: 'bob.martinez@kpit.dev', role: 'member' },
        { name: 'Carla Nguyen', email: 'carla.nguyen@kpit.dev', role: 'member' },
        { name: 'Dev Patel', email: 'dev.patel@kpit.dev', role: 'member' },
    ]);
    console.log('Created 4 users');

    // ── Projects ─────────────────────────────────────────────────────
    const [webApp, mobileApp, analyticsApp] = await Project.insertMany([
        {
            name: 'Customer Portal Revamp',
            description: 'Redesign and rebuild the customer-facing web portal with a modern UI and faster performance.',
            status: 'active',
            owner: alice._id,
        },
        {
            name: 'Field Service Mobile App',
            description: 'Cross-platform mobile app for field technicians to manage service tickets on the go.',
            status: 'active',
            owner: bob._id,
        },
        {
            name: 'Internal Analytics Dashboard',
            description: 'Internal reporting tool giving leadership visibility into project and team performance.',
            status: 'active',
            owner: carla._id,
        },
    ]);
    console.log('Created 3 projects');

    // ── Sprints (spread across all 3 projects) ─────────────────────────
    const [sprintWeb1, sprintWeb2, sprintMobile1, sprintAnalytics1] = await Sprint.insertMany([
        {
            project: webApp._id,
            name: 'Sprint 1 - Foundations',
            goal: 'Set up project scaffolding and core authentication flows.',
            startDate: daysFromNow(-21),
            endDate: daysFromNow(-7),
            status: 'completed',
        },
        {
            project: webApp._id,
            name: 'Sprint 2 - Dashboard & Profile',
            goal: 'Ship the customer dashboard and profile management screens.',
            startDate: daysFromNow(-7),
            endDate: daysFromNow(7),
            status: 'active',
        },
        {
            project: mobileApp._id,
            name: 'Sprint 1 - Ticket Sync',
            goal: 'Build offline-first ticket syncing between the app and backend.',
            startDate: daysFromNow(-3),
            endDate: daysFromNow(11),
            status: 'active',
        },
        {
            project: analyticsApp._id,
            name: 'Sprint 1 - Core Reporting',
            goal: 'Deliver the first set of project and team performance reports.',
            startDate: daysFromNow(-5),
            endDate: daysFromNow(9),
            status: 'active',
        },
    ]);
    console.log('Created 4 sprints');

    // ── User Stories (spread across all 3 projects) ────────────────────
    const [
        storyLogin,
        storyDashboard,
        storyProfile,
        storyOfflineSync,
        storyTicketList,
        storyPushNotifs,
        storyReportBuilder,
        storyDataExport,
    ] = await UserStory.insertMany([
        // -- Customer Portal Revamp --
        {
            project: webApp._id,
            title: 'As a customer, I can log in securely to the portal',
            description: 'Implement email/password login with session handling and error states.',
            priority: 'high',
            status: 'completed',
            assignee: carla._id,
            storyPoints: 5,
            sprint: sprintWeb1._id,
            completedAt: daysFromNow(-10),
            tags: ['auth', 'frontend'],
        },
        {
            project: webApp._id,
            title: 'As a customer, I can view a summary dashboard',
            description: 'Show account status, recent activity, and quick links on the dashboard.',
            priority: 'high',
            status: 'in_progress',
            assignee: dev._id,
            storyPoints: 8,
            sprint: sprintWeb2._id,
            tags: ['frontend', 'dashboard'],
        },
        {
            project: webApp._id,
            title: 'As a customer, I can update my profile information',
            description: 'Allow editing of name, contact details, and notification preferences.',
            priority: 'medium',
            status: 'active',
            assignee: carla._id,
            storyPoints: 3,
            sprint: sprintWeb2._id,
            tags: ['frontend', 'profile'],
        },
        // -- Field Service Mobile App --
        {
            project: mobileApp._id,
            title: 'As a technician, I can work on tickets while offline',
            description: 'Cache assigned tickets locally and sync changes once connectivity is restored.',
            priority: 'high',
            status: 'in_progress',
            assignee: bob._id,
            storyPoints: 13,
            sprint: sprintMobile1._id,
            tags: ['mobile', 'sync'],
        },
        {
            project: mobileApp._id,
            title: 'As a technician, I can see my assigned ticket list',
            description: 'Display a sortable, filterable list of tickets assigned to the current user.',
            priority: 'medium',
            status: 'active',
            assignee: dev._id,
            storyPoints: 5,
            sprint: sprintMobile1._id,
            tags: ['mobile', 'ui'],
        },
        {
            project: mobileApp._id,
            title: 'As a technician, I receive push notifications for new tickets',
            description: 'Send a push notification whenever a new ticket is assigned to the technician.',
            priority: 'low',
            status: 'active',
            assignee: null,
            storyPoints: 3,
            sprint: null,
            tags: ['mobile', 'notifications'],
        },
        // -- Internal Analytics Dashboard --
        {
            project: analyticsApp._id,
            title: 'As a manager, I can build custom performance reports',
            description: 'Drag-and-drop report builder covering velocity, burndown, and workload metrics.',
            priority: 'high',
            status: 'in_progress',
            assignee: alice._id,
            storyPoints: 8,
            sprint: sprintAnalytics1._id,
            tags: ['analytics', 'frontend'],
        },
        {
            project: analyticsApp._id,
            title: 'As a manager, I can export reports to CSV',
            description: 'Add a CSV export option to any generated report.',
            priority: 'low',
            status: 'active',
            assignee: bob._id,
            storyPoints: 2,
            sprint: sprintAnalytics1._id,
            tags: ['analytics', 'export'],
        },
    ]);
    console.log('Created 8 user stories');

    // ── Tasks (spread across all stories/projects, including overdue ones) ──
    const taskDocs = await Task.insertMany([
        // storyLogin (completed) — Customer Portal
        {
            story: storyLogin._id,
            title: 'Build login form UI',
            description: 'Create the login form component with validation states.',
            status: 'completed',
            assignee: carla._id,
            dueDate: daysFromNow(-15),
            completedAt: daysFromNow(-14),
        },
        {
            story: storyLogin._id,
            title: 'Wire up auth API endpoint',
            description: 'Connect the login form to the /api/users/login endpoint.',
            status: 'completed',
            assignee: bob._id,
            dueDate: daysFromNow(-12),
            completedAt: daysFromNow(-11),
        },
        // storyDashboard (in progress) — Customer Portal
        {
            story: storyDashboard._id,
            title: 'Design dashboard layout',
            description: 'Create wireframes and component layout for the dashboard.',
            status: 'completed',
            assignee: dev._id,
            dueDate: daysFromNow(-4),
            completedAt: daysFromNow(-5),
        },
        {
            story: storyDashboard._id,
            title: 'Implement recent activity widget',
            description: 'Build the widget that lists the customer\'s recent account activity.',
            status: 'in_progress',
            assignee: dev._id,
            dueDate: daysFromNow(-2), // OVERDUE — not completed, has assignee
        },
        {
            story: storyDashboard._id,
            title: 'Add account status summary card',
            description: 'Show plan tier, renewal date, and status badge.',
            status: 'active',
            assignee: alice._id,
            dueDate: daysFromNow(5),
        },
        // storyProfile — Customer Portal
        {
            story: storyProfile._id,
            title: 'Build profile edit form',
            description: 'Form fields for name, email, and phone with inline validation.',
            status: 'active',
            assignee: carla._id,
            dueDate: daysFromNow(-1), // OVERDUE
        },
        {
            story: storyProfile._id,
            title: 'Add notification preferences toggle',
            description: 'Let customers opt in/out of email and SMS notifications.',
            status: 'active',
            assignee: null,
            dueDate: daysFromNow(9),
        },
        // storyOfflineSync — Field Service Mobile
        {
            story: storyOfflineSync._id,
            title: 'Set up local storage schema',
            description: 'Define the local cache structure for offline tickets.',
            status: 'completed',
            assignee: bob._id,
            dueDate: daysFromNow(-1),
            completedAt: daysFromNow(-1),
        },
        {
            story: storyOfflineSync._id,
            title: 'Implement conflict resolution logic',
            description: 'Handle sync conflicts when the same ticket is edited offline and online.',
            status: 'in_progress',
            assignee: bob._id,
            dueDate: daysFromNow(-3), // OVERDUE
        },
        // storyTicketList — Field Service Mobile
        {
            story: storyTicketList._id,
            title: 'Build ticket list screen',
            description: 'Sortable, filterable list view of tickets assigned to the technician.',
            status: 'active',
            assignee: dev._id,
            dueDate: daysFromNow(10),
        },
        {
            story: storyTicketList._id,
            title: 'Add ticket priority filter',
            description: 'Let technicians filter the ticket list by priority level.',
            status: 'active',
            assignee: null,
            dueDate: daysFromNow(12),
        },
        // storyReportBuilder — Internal Analytics
        {
            story: storyReportBuilder._id,
            title: 'Build metric selector UI',
            description: 'Dropdown/checkbox UI for choosing which metrics appear on a report.',
            status: 'in_progress',
            assignee: alice._id,
            dueDate: daysFromNow(6),
        },
        {
            story: storyReportBuilder._id,
            title: 'Implement velocity calculation',
            description: 'Compute team velocity from completed story points per sprint.',
            status: 'active',
            assignee: carla._id,
            dueDate: daysFromNow(-5), // OVERDUE
        },
        // storyDataExport — Internal Analytics
        {
            story: storyDataExport._id,
            title: 'Add CSV export button',
            description: 'Wire up a CSV download button on the report view.',
            status: 'active',
            assignee: bob._id,
            dueDate: daysFromNow(8),
        },
    ]);
    console.log(`Created ${taskDocs.length} tasks (including 5 overdue)`);

    // ── Notifications ────────────────────────────────────────────────
    // Straightforward assignment notifications. Overdue notifications for
    // the overdue tasks above are intentionally NOT created here — the
    // app's own cron job (backend/jobs/overdueNotifier.js) runs every 60
    // seconds and will generate those automatically once the server is
    // running, so simply starting the server after seeding is enough to
    // see them appear for Dev, Carla, Bob, and Carla again (analytics task).
    const dashboardTask = taskDocs.find((t) => t.title === 'Implement recent activity widget');
    await Notification.insertMany([
        {
            user: dev._id,
            message: 'You have been assigned to task "Implement recent activity widget"',
            taskId: dashboardTask?._id ?? null,
            isRead: false,
        },
        {
            user: bob._id,
            message: 'You have been assigned to task "Implement conflict resolution logic"',
            isRead: false,
        },
    ]);
    console.log('Created 2 assignment notifications');
    console.log('Note: overdue notifications will be generated automatically by the');
    console.log('      overdueNotifier cron job within ~60s of starting the server.');

    console.log('\nSeed complete! Summary:');
    console.log('  Users:                4');
    console.log('  Projects:             3');
    console.log('  Sprints:              4  (spread across all 3 projects)');
    console.log('  User Stories:         8  (spread across all 3 projects)');
    console.log('  Tasks:                14 (spread across all stories, 5 overdue)');
    console.log('  Notifications:        2  (+ overdue notifications generated on server start)');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
}

seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
