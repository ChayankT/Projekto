import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getProjects, updateProject, deleteProject,
    getArchivedStories, restoreStory, deleteStory,
    getArchivedTasks, restoreTask, deleteTask,
} from '../api/client';
import { useToast } from '../context/ToastContext';
import { useDataSync } from '../context/DataSyncContext';
import { Dialog, Badge, EmptyState, Skeleton } from '../components/ui';
import { ArchiveRestore, Trash2, FolderKanban, AlertTriangle, Search, X, BookText, ListChecks } from 'lucide-react';

const TABS = [
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'stories', label: 'Stories', icon: BookText },
    { id: 'tasks', label: 'Tasks', icon: ListChecks },
];

const ArchivePage = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { notifyTasksChanged, notifyStoriesChanged } = useDataSync();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('projects');

    const [archivedProjects, setArchivedProjects] = useState([]);
    const [archivedStories, setArchivedStories] = useState([]);
    const [archivedTasks, setArchivedTasks] = useState([]);

    // { type: 'project'|'story'|'task', id, label } of item pending permanent delete
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [search, setSearch] = useState('');

    const fetchArchived = async () => {
        try {
            const [projectsRes, storiesRes, tasksRes] = await Promise.all([
                getProjects(),
                getArchivedStories(),
                getArchivedTasks(),
            ]);
            setArchivedProjects((projectsRes.data || []).filter(p => p.status === 'archived'));
            setArchivedStories(storiesRes.data || []);
            setArchivedTasks(tasksRes.data || []);
        } catch { addToast('Failed to load archive', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchArchived(); }, []);

    const handleRestore = async (type, id) => {
        try {
            if (type === 'project') {
                const proj = archivedProjects.find(p => p._id === id);
                // Fall back to 'active' only for projects archived before this
                // field existed (statusBeforeArchive will be unset for those).
                await updateProject(id, { status: proj?.statusBeforeArchive || 'active' });
            }
            else if (type === 'story') await restoreStory(id);
            else await restoreTask(id);
            addToast(`${type[0].toUpperCase()}${type.slice(1)} restored`);
            fetchArchived();
            if (type === 'story') notifyStoriesChanged();
            else if (type === 'task') notifyTasksChanged();
        } catch { addToast(`Failed to restore ${type}`, 'error'); }
    };

    const handlePermanentDelete = async () => {
        if (!confirmDelete) return;
        const { type, id } = confirmDelete;
        try {
            if (type === 'project') await deleteProject(id);
            else if (type === 'story') await deleteStory(id);
            else await deleteTask(id);
            addToast(`${type[0].toUpperCase()}${type.slice(1)} permanently deleted`);
            setConfirmDelete(null);
            fetchArchived();
            if (type === 'story') notifyStoriesChanged();
            else if (type === 'task') notifyTasksChanged();
        } catch { addToast(`Failed to delete ${type}`, 'error'); }
    };

    const q = search.trim().toLowerCase();
    const filteredProjects = archivedProjects.filter(p => {
        if (!q) return true;
        return (
            p.name?.toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q) ||
            (p.owner?.name || '').toLowerCase().includes(q)
        );
    });
    const filteredStories = archivedStories.filter(s => {
        if (!q) return true;
        return (
            s.title?.toLowerCase().includes(q) ||
            (s.description || '').toLowerCase().includes(q) ||
            (s.project?.name || '').toLowerCase().includes(q)
        );
    });
    const filteredTasks = archivedTasks.filter(t => {
        if (!q) return true;
        return (
            t.title?.toLowerCase().includes(q) ||
            (t.description || '').toLowerCase().includes(q) ||
            (t.story?.title || '').toLowerCase().includes(q)
        );
    });

    const counts = { projects: archivedProjects.length, stories: archivedStories.length, tasks: archivedTasks.length };
    const totalArchived = counts.projects + counts.stories + counts.tasks;

    if (loading) {
        return (
            <div>
                <div className="section-header">
                    <Skeleton variant="heading" width="200px" />
                </div>
                <div className="item-grid" style={{ marginTop: 'var(--space-4)' }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} variant="card" height={140} />)}
                </div>
            </div>
        );
    }

    return (
        <div style={{ animation: 'fade-in-up 0.35s ease forwards' }}>
            <div className="section-header" style={{ marginBottom: 'var(--space-5)' }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        📦 Archive
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                        {totalArchived} archived item{totalArchived !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            <div className="tab-switch">
                {TABS.map(t => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.id}
                            className={`tab-switch-btn ${activeTab === t.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(t.id)}
                        >
                            <Icon size={13} /> {t.label} <span className="tab-switch-count">{counts[t.id]}</span>
                        </button>
                    );
                })}
            </div>

            {totalArchived > 0 && (
                <div style={{ position: 'relative', maxWidth: 360, marginBottom: 'var(--space-6)' }}>
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
                        placeholder={`Search archived ${TABS.find(t => t.id === activeTab).label.toLowerCase()}…`}
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
            )}

            {/* Projects tab */}
            {activeTab === 'projects' && (
                archivedProjects.length === 0 ? (
                    <EmptyState
                        icon="📦"
                        title="No archived projects"
                        description="Archived projects will appear here. You can archive projects from the Projects page."
                    />
                ) : filteredProjects.length === 0 ? (
                    <EmptyState
                        icon={<Search size={40} strokeWidth={1.2} style={{ opacity: 0.4 }} />}
                        title="No matches"
                        description={`Nothing archived matches "${search}".`}
                    />
                ) : (
                    <div className="item-grid">
                        {filteredProjects.map(p => (
                            <div key={p._id} className="item-card archive-card">
                                <div className="archive-card-header">
                                    <h3>{p.name}</h3>
                                    <Badge variant="archived">Archived</Badge>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
                                    {p.description || 'No description'}
                                </p>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>
                                    Owner: {p.owner?.name || 'Unknown'} • Archived {new Date(p.updatedAt).toLocaleDateString()}
                                </div>
                                <div className="archive-card-actions">
                                    <button className="btn btn-secondary btn-sm" onClick={() => handleRestore('project', p._id)}>
                                        <ArchiveRestore size={14} /> Restore
                                    </button>
                                    <button
                                        className="btn btn-sm"
                                        style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', border: '1px solid var(--color-error-border)' }}
                                        onClick={() => setConfirmDelete({ type: 'project', id: p._id, label: p.name })}
                                    >
                                        <Trash2 size={14} /> Delete Forever
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/projects/${p._id}`)}>
                                        <FolderKanban size={14} /> View
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Stories tab */}
            {activeTab === 'stories' && (
                archivedStories.length === 0 ? (
                    <EmptyState
                        icon="📦"
                        title="No archived stories"
                        description="Stories you archive from a project board will appear here."
                    />
                ) : filteredStories.length === 0 ? (
                    <EmptyState
                        icon={<Search size={40} strokeWidth={1.2} style={{ opacity: 0.4 }} />}
                        title="No matches"
                        description={`Nothing archived matches "${search}".`}
                    />
                ) : (
                    <div className="item-grid">
                        {filteredStories.map(s => (
                            <div key={s._id} className="item-card archive-card">
                                <div className="archive-card-header">
                                    <h3>{s.title}</h3>
                                    <Badge variant="archived">Archived</Badge>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
                                    {s.description || 'No description'}
                                </p>
                                <div style={{ display: 'flex', gap: 'var(--space-1_5)', marginBottom: 'var(--space-3)' }}>
                                    <Badge variant={s.priority}>{s.priority}</Badge>
                                    <Badge variant="info">{s.storyPoints ?? 0} pts</Badge>
                                </div>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>
                                    Project: {s.project?.name || 'Unknown'} • Archived {new Date(s.updatedAt).toLocaleDateString()}
                                </div>
                                <div className="archive-card-actions">
                                    <button className="btn btn-secondary btn-sm" onClick={() => handleRestore('story', s._id)}>
                                        <ArchiveRestore size={14} /> Restore
                                    </button>
                                    <button
                                        className="btn btn-sm"
                                        style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', border: '1px solid var(--color-error-border)' }}
                                        onClick={() => setConfirmDelete({ type: 'story', id: s._id, label: s.title })}
                                    >
                                        <Trash2 size={14} /> Delete Forever
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/stories/${s._id}`)}>
                                        <BookText size={14} /> View
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Tasks tab */}
            {activeTab === 'tasks' && (
                archivedTasks.length === 0 ? (
                    <EmptyState
                        icon="📦"
                        title="No archived tasks"
                        description="Tasks you archive from a story board will appear here."
                    />
                ) : filteredTasks.length === 0 ? (
                    <EmptyState
                        icon={<Search size={40} strokeWidth={1.2} style={{ opacity: 0.4 }} />}
                        title="No matches"
                        description={`Nothing archived matches "${search}".`}
                    />
                ) : (
                    <div className="item-grid">
                        {filteredTasks.map(t => (
                            <div key={t._id} className="item-card archive-card">
                                <div className="archive-card-header">
                                    <h3>{t.title}</h3>
                                    <Badge variant="archived">Archived</Badge>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
                                    {t.description || 'No description'}
                                </p>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>
                                    Story: {t.story?.title || 'Unknown'} • Archived {new Date(t.updatedAt).toLocaleDateString()}
                                </div>
                                <div className="archive-card-actions">
                                    <button className="btn btn-secondary btn-sm" onClick={() => handleRestore('task', t._id)}>
                                        <ArchiveRestore size={14} /> Restore
                                    </button>
                                    <button
                                        className="btn btn-sm"
                                        style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', border: '1px solid var(--color-error-border)' }}
                                        onClick={() => setConfirmDelete({ type: 'task', id: t._id, label: t.title })}
                                    >
                                        <Trash2 size={14} /> Delete Forever
                                    </button>
                                    {(t.story?._id || t.story) && (
                                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/stories/${t.story?._id || t.story}`)}>
                                            <BookText size={14} /> View Story
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Permanent Delete Confirmation */}
            <Dialog
                open={!!confirmDelete}
                title="Permanently Delete?"
                onClose={() => setConfirmDelete(null)}
                size="sm"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
                    <button className="btn" style={{ background: 'var(--color-error)', color: '#fff' }} onClick={handlePermanentDelete}>
                        <Trash2 size={14} /> Delete Forever
                    </button>
                </>}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', alignItems: 'center', textAlign: 'center', padding: 'var(--space-4) 0' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 'var(--radius-full)',
                        background: 'var(--color-error-subtle)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                        <AlertTriangle size={24} color="var(--color-error)" />
                    </div>
                    <div>
                        <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>This action cannot be undone</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                            {confirmDelete?.type === 'project'
                                ? 'This will permanently delete the project, all its stories, and all associated tasks.'
                                : confirmDelete?.type === 'story'
                                    ? 'This will permanently delete the story and all of its tasks.'
                                    : 'This will permanently delete the task.'}
                        </p>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default ArchivePage;
