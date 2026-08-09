import React, { createContext, useContext, useCallback, useState } from 'react';

/**
 * DataSyncContext
 * ─────────────────────────────────────────────────────────────────────────
 * The app has no websocket/live-update layer (see docs/FUTURE_IMPROVEMENTS.md
 * item 4) — every page fetches its own slice of task/story data from the
 * REST API. That's fine when navigating between routes (React Router
 * unmounts/remounts the page, so it naturally refetches). It falls short
 * for pages that stay mounted while a mutation happens elsewhere in the
 * same session (e.g. creating/editing/assigning/completing a task in
 * StoryDetail while Team, Sprint, or My Work stats were computed from an
 * earlier fetch) — those views would keep showing stale numbers until the
 * next full remount.
 *
 * This context is a minimal, additive fix for that gap: it does not change
 * the REST/refetch architecture, add polling, or introduce a websocket. It
 * just gives mutating pages a way to say "tasks/stories changed" and gives
 * aggregate/dependent views (Team, Sprint, Dashboard, Project stats, My
 * Work) a version number to depend on so they refetch immediately instead
 * of waiting for their next mount.
 */
const DataSyncContext = createContext();

export const DataSyncProvider = ({ children }) => {
    // Bumped whenever a task is created/edited/assigned/archived/restored/
    // completed, or its status changes via drag-and-drop.
    const [taskVersion, setTaskVersion] = useState(0);
    // Bumped whenever a story is created/edited/archived/restored, or its
    // status changes (including the "completed" cascade that also marks
    // its tasks complete).
    const [storyVersion, setStoryVersion] = useState(0);

    const notifyTasksChanged = useCallback(() => setTaskVersion(v => v + 1), []);
    const notifyStoriesChanged = useCallback(() => setStoryVersion(v => v + 1), []);

    return (
        <DataSyncContext.Provider value={{ taskVersion, storyVersion, notifyTasksChanged, notifyStoriesChanged }}>
            {children}
        </DataSyncContext.Provider>
    );
};

export const useDataSync = () => useContext(DataSyncContext);
