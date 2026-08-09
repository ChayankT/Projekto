/**
 * cascadeUp.js
 * ------------------------------------------------------------------
 * The app already cascades DOWN when something is marked completed
 * (completing a project completes its sprints/stories/tasks, etc. —
 * see the PUT handlers in routes/projects.js, routes/sprints.js, and
 * routes/stories.js).
 *
 * This module is the reverse direction: whenever a sprint, story, or
 * task is created or edited into a non-completed state, anything
 * "above" it in the hierarchy that had been marked completed (or, for
 * projects, archived) no longer reflects reality — there's active
 * work underneath it again — so it gets reopened to 'active'.
 *
 * Hierarchy: Project -> Sprint -> UserStory -> Task
 * (Tasks hang off a UserStory, not directly off a Sprint/Project.)
 * ------------------------------------------------------------------
 */

const Project = require('../models/Project');
const Sprint = require('../models/Sprint');
const UserStory = require('../models/UserStory');

// Reopens a project if it's completed OR archived. Archived projects also
// have their pre-archive status snapshot cleared, since it no longer
// applies once the project has been reopened this way.
async function reopenProject(projectId) {
    if (!projectId) return;
    await Project.updateOne(
        { _id: projectId, status: { $in: ['completed', 'archived'] } },
        { status: 'active', statusBeforeArchive: null }
    );
}

// Reopens a sprint if it's completed.
async function reopenSprint(sprintId) {
    if (!sprintId) return;
    await Sprint.updateOne(
        { _id: sprintId, status: 'completed' },
        { status: 'active' }
    );
}

// Reopens a user story if it's completed (also clears completedAt, mirroring
// the existing "moved away from completed" behavior in the story/task PUT
// handlers).
async function reopenStory(storyId) {
    if (!storyId) return;
    await UserStory.updateOne(
        { _id: storyId, status: 'completed' },
        { status: 'active', completedAt: null }
    );
}

// Given a story document (needs at least _id, project, sprint), reopens its
// project and sprint (if any) wherever they'd been closed. Pass
// { includeStory: true } to also reopen the story itself — used when a new
// task is added underneath it.
async function reopenStoryHierarchy(story, { includeStory = false } = {}) {
    if (!story) return;
    const ops = [reopenProject(story.project)];
    if (story.sprint) ops.push(reopenSprint(story.sprint));
    if (includeStory) ops.push(reopenStory(story._id));
    await Promise.all(ops);
}

module.exports = { reopenProject, reopenSprint, reopenStory, reopenStoryHierarchy };
