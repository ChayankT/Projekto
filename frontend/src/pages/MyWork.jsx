import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllStories, getAllTasks, getProjects } from '../api/client';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useDataSync } from '../context/DataSyncContext';
import { Badge, EmptyState, Skeleton } from '../components/ui';
import {
    ListChecks, Search, X, FolderKanban, Flame, CheckCircle2, Loader2, Layers,
    BookOpen, CheckSquare, Calendar,
} from 'lucide-react';

const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };
const PRIORITY_COLORS = { low: 'var(--color-info)', medium: 'var(--color-warning)', high: 'var(--color-error)' };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, none: 3 };
const PRIORITY_FILTERS = ['all', 'high', 'medium', 'low'];

const STATUS_LABELS = { active: 'Active', in_progress: 'In Progress', completed: 'Completed' };
const STATUS_FILTERS = ['all', 'active', 'in_progress', 'completed'];

const TYPE_FILTERS = ['all', 'story', 'task'];
const TYPE_LABELS = { story: 'Stories', task: 'Tasks' };

// Stories and tasks come back from the API in different shapes (stories carry
// project/priority/storyPoints/sprint/tags directly; tasks carry a nested
// story -> project and have no priority/points of their own). Normalize both
// into one shape so the rest of the page doesn't need to branch on type.
const normalizeStory = (s) => ({
    _id: s._id,
    type: 'story',
    title: s.title,
    description: s.description,
    status: s.status,
    priority: s.priority,
    assignee: s.assignee,
    storyPoints: s.storyPoints || 0,
    dueDate: null,
    projectId: s.project?._id || s.project,
    projectName: s.project?.name || 'Unknown project',
    sprintName: s.sprint?.name || null,
    updatedAt: s.updatedAt,
    linkTo: `/stories/${s._id}`,
});

const normalizeTask = (t) => ({
    _id: t._id,
    type: 'task',
    title: t.title,
    description: t.description,
    status: t.status,
    priority: null,
    assignee: t.assignee,
    storyPoints: 0,
    dueDate: t.dueDate || null,
    projectId: t.story?.project?._id || t.story?.project,
    projectName: t.story?.project?.name || 'Unknown project',
    sprintName: null,
    storyTitle: t.story?.title || null,
    updatedAt: t.updatedAt,
    linkTo: `/stories/${t.story?._id || t.story}`,
});

const MyWork = () => {
    const { users, activeUserId } = useApp();
    const { addToast } = useToast();
    const { taskVersion, storyVersion } = useDataSync();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [projectStatusById, setProjectStatusById] = useState({});
    const [search, setSearch] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');

    const fetchWork = async () => {
        setLoading(true);
        try {
            const [storiesRes, tasksRes, projectsRes] = await Promise.all([
                getAllStories(), getAllTasks(), getProjects(),
            ]);
            const statusMap = {};
            (projectsRes.data || []).forEach(p => { statusMap[p._id] = p.status; });
            setProjectStatusById(statusMap);
            setItems([
                ...(storiesRes.data || []).map(normalizeStory),
                ...(tasksRes.data || []).map(normalizeTask),
            ]);
        } catch {
            addToast('Failed to load your work', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch on the active "viewing as" user changing, and also whenever a
    // task or story is created/edited/assigned/completed/archived/restored
    // elsewhere in the app, so "assigned to you" stays accurate immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchWork(); }, [activeUserId, taskVersion, storyVersion]);

    const activeUser = users.find(u => u._id === activeUserId);

    // Everything assigned to the current user — stories AND tasks — excluding
    // items that belong to archived projects.
    const myItems = useMemo(() => {
        return items.filter(i => {
            if (!activeUserId || i.assignee?._id !== activeUserId) return false;
            const projectStatus = i.projectId ? projectStatusById[i.projectId] : null;
            return projectStatus !== 'archived';
        });
    }, [items, activeUserId, projectStatusById]);

    const stats = useMemo(() => ({
        total: myItems.length,
        high: myItems.filter(i => i.priority === 'high').length,
        inProgress: myItems.filter(i => i.status === 'in_progress').length,
        completed: myItems.filter(i => i.status === 'completed').length,
        points: myItems.reduce((sum, i) => sum + (i.storyPoints || 0), 0),
    }), [myItems]);

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        return myItems
            .filter(i => typeFilter === 'all' || i.type === typeFilter)
            .filter(i => priorityFilter === 'all' || i.priority === priorityFilter)
            .filter(i => statusFilter === 'all' || i.status === statusFilter)
            .filter(i => !q || i.title.toLowerCase().includes(q) || i.projectName.toLowerCase().includes(q))
            .sort((a, b) => {
                const byPriority = (PRIORITY_ORDER[a.priority || 'none'] ?? 3) - (PRIORITY_ORDER[b.priority || 'none'] ?? 3);
                if (byPriority !== 0) return byPriority;
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });
    }, [myItems, typeFilter, priorityFilter, statusFilter, search]);

    if (loading) {
        return (
            <div>
                <Skeleton variant="heading" width="180px" />
                <Skeleton variant="text" width="320px" />
                <div className="stats-grid" style={{ marginTop: 'var(--space-8)' }}>
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="card" height={100} />)}
                </div>
                <div className="item-grid" style={{ marginTop: 'var(--space-6)' }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} variant="card" height={130} />)}
                </div>
            </div>
        );
    }

    return (
        <div style={{ animation: 'fade-in-up 0.35s ease forwards' }}>
            <div className="dash-hero">
                <h1 className="dash-title">My Work</h1>
                <p className="dash-subtitle">
                    {activeUser
                        ? `Everything assigned to ${activeUser.name} — stories and tasks — across every active project.`
                        : 'Everything assigned to you — stories and tasks — across every active project.'}
                </p>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-label">Assigned to You</span>
                        <ListChecks size={16} style={{ color: 'var(--text-primary)', opacity: 0.7 }} />
                    </div>
                    <div className="stat-value">{stats.total}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-label">High Priority</span>
                        <Flame size={16} style={{ color: 'var(--color-error)', opacity: 0.7 }} />
                    </div>
                    <div className="stat-value" style={{ color: 'var(--color-error)' }}>{stats.high}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-label">In Progress</span>
                        <Loader2 size={16} style={{ color: 'var(--color-warning)', opacity: 0.7 }} />
                    </div>
                    <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.inProgress}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-label">Completed</span>
                        <CheckCircle2 size={16} style={{ color: 'var(--color-success)', opacity: 0.7 }} />
                    </div>
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>{stats.completed}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-label">Story Points</span>
                        <Layers size={16} style={{ color: 'var(--accent-primary)', opacity: 0.7 }} />
                    </div>
                    <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{stats.points}</div>
                </div>
            </div>

            {/* Filters */}
            {myItems.length > 0 && (
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center',
                    margin: 'var(--space-10) 0 var(--space-5)',
                }}>
                    <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
                        <Search
                            size={15}
                            style={{
                                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                color: 'var(--text-tertiary)', pointerEvents: 'none',
                            }}
                        />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search your work…"
                            style={{ paddingLeft: 36, paddingRight: search ? 34 : undefined }}
                        />
                        {search && (
                            <button
                                className="btn-ghost"
                                onClick={() => setSearch('')}
                                title="Clear search"
                                style={{
                                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: 24, height: 24, borderRadius: 'var(--radius-sm)',
                                }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-1_5)', flexWrap: 'wrap' }}>
                        {TYPE_FILTERS.map(t => (
                            <button
                                key={t}
                                className={`btn btn-sm ${typeFilter === t ? 'btn-secondary' : 'btn-ghost'}`}
                                onClick={() => setTypeFilter(t)}
                            >
                                {t === 'all' ? 'All Types' : TYPE_LABELS[t]}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-1_5)', flexWrap: 'wrap' }}>
                        {PRIORITY_FILTERS.map(p => (
                            <button
                                key={p}
                                className={`btn btn-sm ${priorityFilter === p ? 'btn-secondary' : 'btn-ghost'}`}
                                onClick={() => setPriorityFilter(p)}
                            >
                                {p === 'all' ? 'All Priority' : PRIORITY_LABELS[p]}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-1_5)', flexWrap: 'wrap' }}>
                        {STATUS_FILTERS.map(s => (
                            <button
                                key={s}
                                className={`btn btn-sm ${statusFilter === s ? 'btn-secondary' : 'btn-ghost'}`}
                                onClick={() => setStatusFilter(s)}
                            >
                                {s === 'all' ? 'All Status' : STATUS_LABELS[s]}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* List */}
            {myItems.length === 0 ? (
                <EmptyState
                    icon={<ListChecks size={40} strokeWidth={1.2} style={{ opacity: 0.4 }} />}
                    title="You're all caught up"
                    description="Nothing is assigned to you right now. New work will show up here as soon as it's assigned."
                />
            ) : filteredItems.length === 0 ? (
                <EmptyState
                    icon={<Search size={40} strokeWidth={1.2} style={{ opacity: 0.4 }} />}
                    title="No matches"
                    description="Try a different search term, or clear the type, priority, and status filters."
                />
            ) : (
                <div className="item-grid">
                    {filteredItems.map(i => (
                        <div
                            key={`${i.type}-${i._id}`}
                            className="task-card"
                            style={{ cursor: 'pointer', margin: 0 }}
                            onClick={() => navigate(i.linkTo)}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="task-card-type-bar" style={{ background: i.priority ? PRIORITY_COLORS[i.priority] : 'var(--text-tertiary)' }} />
                            <div
                                style={{
                                    paddingLeft: 10, display: 'flex', alignItems: 'center', gap: 'var(--space-1_5)',
                                    marginBottom: 'var(--space-2)', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)',
                                }}
                            >
                                <FolderKanban size={12} />
                                <span>{i.projectName}</span>
                                <span>·</span>
                                {i.type === 'story' ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: i.sprintName ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>
                                        <BookOpen size={11} /> {i.sprintName || 'Backlog'}
                                    </span>
                                ) : (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <CheckSquare size={11} /> Task{i.storyTitle ? ` · ${i.storyTitle}` : ''}
                                    </span>
                                )}
                            </div>
                            <h4 style={{ paddingLeft: 10 }}>{i.title}</h4>
                            {i.description && <p style={{ paddingLeft: 10 }}>{i.description}</p>}
                            <div className="task-card-meta" style={{ paddingLeft: 10 }}>
                                <div style={{ display: 'flex', gap: 'var(--space-1_5)', alignItems: 'center' }}>
                                    {i.priority && <Badge variant={i.priority}>{PRIORITY_LABELS[i.priority]}</Badge>}
                                    <Badge variant={i.status}>{STATUS_LABELS[i.status]}</Badge>
                                    {i.storyPoints > 0 && <Badge variant="info">{i.storyPoints} pts</Badge>}
                                    {i.dueDate && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                                            <Calendar size={11} /> {new Date(i.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyWork;
