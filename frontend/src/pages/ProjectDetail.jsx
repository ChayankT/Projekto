import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProject, createStory, updateStory, archiveStory, getSprints, createSprint, deleteSprint, getSprintVelocity } from '../api/client';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useDataSync } from '../context/DataSyncContext';
import { Dialog, Input, Dropdown, Badge, Skeleton, Card } from '../components/ui';
import { TextArea } from '../components/ui/Input';
import useHotkey from '../hooks/useHotkey';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Archive, Plus, ChevronRight, User as UserIcon, Layers, LogIn, CheckCircle2, Rocket, Calendar, Target, BarChart3, Search, X } from 'lucide-react';

const PRIORITY = ['low', 'medium', 'high'];
const STATUS = ['active', 'in_progress', 'completed'];
const STATUS_LABELS = { active: 'Active', in_progress: 'In Progress', completed: 'Completed' };
const STATUS_COLORS = { active: 'var(--accent-primary)', in_progress: 'var(--color-warning)', completed: 'var(--color-success)' };
const STATUS_ICONS = { active: Layers, in_progress: LogIn, completed: CheckCircle2 };
const PRIORITY_COLORS = { low: 'var(--color-info)', medium: 'var(--color-warning)', high: 'var(--color-error)' };

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { users, activeUserId } = useApp();
    const { addToast } = useToast();
    const { notifyStoriesChanged, notifyTasksChanged } = useDataSync();
    const [project, setProject] = useState(null);
    const [allStories, setAllStories] = useState([]);
    const [storiesState, setStoriesState] = useState({ active: [], in_progress: [], completed: [] });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editStory, setEditStory] = useState(null);
    const [form, setForm] = useState({ title: '', description: '', priority: 'medium', status: 'active', assignee: '', storyPoints: 1, sprint: '', tags: '' });

    const [activeTab, setActiveTab] = useState('backlog');
    const [sprints, setSprints] = useState([]);
    const [velocity, setVelocity] = useState([]);
    const [showSprintModal, setShowSprintModal] = useState(false);
    const [sprintForm, setSprintForm] = useState({ name: '', goal: '', startDate: '', endDate: '' });

    // Board filters (Kanban/backlog view)
    const [search, setSearch] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [assigneeFilter, setAssigneeFilter] = useState('all');
    const [sprintFilter, setSprintFilter] = useState('backlog');

    const buildColumns = (stories) => {
        const newStories = { active: [], in_progress: [], completed: [] };
        stories.forEach(s => {
            if (newStories[s.status]) newStories[s.status].push(s);
        });
        return newStories;
    };

    const fetchProject = async () => {
        try {
            const res = await getProject(id);
            setProject(res.data);
            const stories = res.data.stories || [];
            setAllStories(stories);
        } catch { addToast('Project not found', 'error'); navigate('/projects'); }
        finally { setLoading(false); }
    };

    const visibleStories = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allStories.filter(s => {
            if (sprintFilter === 'backlog') {
                if (s.sprint) return false;
            } else if (sprintFilter !== 'all') {
                if ((s.sprint?._id || s.sprint) !== sprintFilter) return false;
            }
            if (priorityFilter !== 'all' && s.priority !== priorityFilter) return false;
            if (assigneeFilter === 'unassigned') {
                if (s.assignee) return false;
            } else if (assigneeFilter !== 'all') {
                if ((s.assignee?._id || '') !== assigneeFilter) return false;
            }
            if (q) {
                const haystack = `${s.title} ${s.description || ''} ${(s.tags || []).join(' ')}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [allStories, sprintFilter, priorityFilter, assigneeFilter, search]);

    useEffect(() => { setStoriesState(buildColumns(visibleStories)); }, [visibleStories]);

    const filtersActive = search.trim() !== '' || priorityFilter !== 'all' || assigneeFilter !== 'all' || sprintFilter !== 'backlog';
    const clearFilters = () => { setSearch(''); setPriorityFilter('all'); setAssigneeFilter('all'); setSprintFilter('backlog'); };

    const fetchSprints = async () => {
        try {
            const res = await getSprints(id);
            setSprints(res.data);
        } catch { /* non-fatal */ }
        try {
            const velRes = await getSprintVelocity(id);
            setVelocity(velRes.data);
        } catch { /* non-fatal */ }
    };

    useEffect(() => { fetchProject(); fetchSprints(); }, [id]);

    const openCreate = (status = 'active') => {
        setEditStory(null);
        setForm({ title: '', description: '', priority: 'medium', status, assignee: activeUserId || '', storyPoints: 1, sprint: '', tags: '' });
        setShowModal(true);
    };

    // Keyboard shortcut: Shift+N opens the New Story dialog (disabled while
    // a dialog is already open, or while typing in a field — see useHotkey).
    useHotkey('N', () => openCreate(), { enabled: !showModal && !showSprintModal });

    // Keyboard shortcut: "/" jumps to the backlog search box, switching to
    // the Backlog tab first if the Sprints tab is active so there's always
    // a search field to land in.
    const searchInputRef = useRef(null);
    useHotkey('/', () => {
        setActiveTab('backlog');
        requestAnimationFrame(() => searchInputRef.current?.focus());
    }, { enabled: !showModal && !showSprintModal });

    const openEdit = (e, story) => {
        e.stopPropagation();
        setEditStory(story);
        setForm({
            title: story.title,
            description: story.description,
            priority: story.priority,
            status: story.status,
            assignee: story.assignee?._id || '',
            storyPoints: story.storyPoints ?? 1,
            sprint: story.sprint?._id || story.sprint || '',
            tags: (story.tags || []).join(', '),
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        try {
            const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
            const payload = { ...form, project: id, storyPoints: Number(form.storyPoints) || 0, sprint: form.sprint || null, tags };
            if (editStory) {
                await updateStory(editStory._id, payload);
                addToast('Story updated');
            } else {
                await createStory(payload);
                addToast('Story created');
            }
            setShowModal(false);
            fetchProject();
            notifyStoriesChanged();
            // Completing a story here cascades to complete its tasks on the
            // backend too — let task-dependent views (My Work, Team, Sprint)
            // know, not just story-dependent ones.
            if (payload.status === 'completed') notifyTasksChanged();
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to save story', 'error');
        }
    };

    const handleSprintSubmit = async (e) => {
        e?.preventDefault();
        if (sprintForm.startDate && sprintForm.endDate && sprintForm.endDate <= sprintForm.startDate) {
            addToast('Sprint end date must be after the start date', 'error');
            return;
        }
        try {
            await createSprint({ ...sprintForm, project: id });
            addToast('Sprint created');
            setShowSprintModal(false);
            setSprintForm({ name: '', goal: '', startDate: '', endDate: '' });
            fetchSprints();
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to create sprint', 'error');
        }
    };

    const handleDeleteSprint = async (e, sprintIdToDelete) => {
        e.stopPropagation();
        if (!confirm('Delete this sprint? Its stories will return to the backlog.')) return;
        try {
            await deleteSprint(sprintIdToDelete);
            addToast('Sprint deleted');
            fetchProject();
            fetchSprints();
        } catch { addToast('Failed to delete sprint', 'error'); }
    };

    const handleArchive = async (e, sid) => {
        e.stopPropagation();
        if (!confirm('Archive this story? It can be restored from the Archive page.')) return;
        try {
            await archiveStory(sid);
            fetchProject();
            notifyStoriesChanged();
            addToast('Story archived');
        } catch { addToast('Failed to archive story', 'error'); }
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const sourceCol = source.droppableId;
        const destCol = destination.droppableId;
        const sourceStories = Array.from(storiesState[sourceCol]);
        const destStories = sourceCol === destCol ? sourceStories : Array.from(storiesState[destCol]);

        const [movedStory] = sourceStories.splice(source.index, 1);
        movedStory.status = destCol;
        destStories.splice(destination.index, 0, movedStory);

        setStoriesState(prev => ({
            ...prev,
            [sourceCol]: sourceStories,
            [destCol]: destStories
        }));

        if (sourceCol !== destCol) {
            try {
                await updateStory(draggableId, { status: destCol });
                notifyStoriesChanged();
                // Completing a story here cascades to complete its tasks on
                // the backend too — let task-dependent views (My Work, Team,
                // Sprint) know, not just story-dependent ones.
                if (destCol === 'completed') notifyTasksChanged();
            } catch {
                addToast('Failed to move story', 'error');
                fetchProject();
            }
        }
    };

    const totalStories = allStories.length;
    // The tab badge should reflect the true size of the backlog, not how many
    // of those stories happen to match the currently active filters — using
    // storiesState here would make the badge shrink whenever a priority/
    // assignee/search filter is applied, which reads as if stories vanished.
    const backlogCount = allStories.filter(s => !s.sprint).length;

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-8)' }}>
            <Skeleton variant="text" width="160px" />
            <Skeleton variant="heading" width="280px" />
            <Skeleton variant="text" width="400px" />
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-6)', flex: 1 }}>
                {[1, 2, 3].map(i => <div key={i} style={{ flex: 1 }}><Skeleton variant="card" height={360} /></div>)}
            </div>
        </div>
    );

    if (!project) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
        >
            <div className="kanban-wrapper">
                {/* Header */}
                <div className="kanban-header">
                    <div className="kanban-header-left">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                            <Link to="/projects" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>Projects</Link>
                            <ChevronRight size={13} color="var(--text-tertiary)" />
                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>{project.name}</span>
                        </div>
                        <h1>{project.name}</h1>
                        {project.description && <p>{project.description}</p>}
                        <div className="kanban-meta">
                            <Badge variant={project.status}>{project.status}</Badge>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                <UserIcon size={11} /> {project.owner?.name}
                            </span>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>·</span>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{totalStories} stories</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                        {activeTab === 'sprints' ? (
                            <button className="btn btn-primary" onClick={() => setShowSprintModal(true)}>
                                <Plus size={16} /> New Sprint
                            </button>
                        ) : (
                            <button className="btn btn-primary" onClick={() => openCreate()} title="New Story (Shift+N)">
                                <Plus size={16} /> New Story
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab switcher */}
                <div className="tab-switch">
                    <button
                        className={`tab-switch-btn ${activeTab === 'backlog' ? 'active' : ''}`}
                        onClick={() => setActiveTab('backlog')}
                    >
                        Backlog <span className="tab-switch-count">{backlogCount}</span>
                    </button>
                    <button
                        className={`tab-switch-btn ${activeTab === 'sprints' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sprints')}
                    >
                        <Rocket size={13} /> Sprints <span className="tab-switch-count">{sprints.length}</span>
                    </button>
                </div>

                {activeTab === 'backlog' && (
                    <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center',
                        margin: '0 0 var(--space-5)',
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
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search stories…"
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

                        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ width: 'auto', minWidth: 120 }}>
                            <option value="all">All Priority</option>
                            {PRIORITY.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                        </select>

                        <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
                            <option value="all">All Assignees</option>
                            <option value="unassigned">Unassigned</option>
                            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                        </select>

                        <select value={sprintFilter} onChange={e => setSprintFilter(e.target.value)} style={{ width: 'auto', minWidth: 150 }}>
                            <option value="backlog">Backlog only</option>
                            <option value="all">Any sprint</option>
                            {sprints.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>

                        {filtersActive && (
                            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                                <X size={13} /> Clear filters
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'sprints' && (
                    <>
                    {velocity.length > 0 && (
                        <div className="velocity-panel">
                            <div className="velocity-panel-header">
                                <BarChart3 size={14} /> Velocity <span className="velocity-panel-sub">points completed per past sprint</span>
                            </div>
                            <div className="velocity-bars">
                                {velocity.map(v => {
                                    const maxPts = Math.max(...velocity.map(x => x.totalPoints), 1);
                                    const h = Math.max(4, Math.round((v.completedPoints / maxPts) * 64));
                                    return (
                                        <div className="velocity-bar-col" key={v.sprintId} title={`${v.name}: ${v.completedPoints}/${v.totalPoints} pts`}>
                                            <div className="velocity-bar" style={{ height: `${h}px` }} />
                                            <span className="velocity-bar-label">{v.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <div className="sprint-grid">
                        {sprints.length === 0 && (
                            <div className="kanban-empty-col" onClick={() => setShowSprintModal(true)} style={{ maxWidth: 320 }}>
                                <Rocket size={22} style={{ opacity: 0.4 }} />
                                <span>No sprints yet.<br />Click to plan one.</span>
                            </div>
                        )}
                        {sprints.map(sprint => {
                            const sprintStories = allStories.filter(s => (s.sprint?._id || s.sprint) === sprint._id);
                            const points = sprintStories.reduce((a, s) => a + (s.storyPoints || 0), 0);
                            const donePoints = sprintStories.reduce((a, s) => a + (s.status === 'completed' ? (s.storyPoints || 0) : 0), 0);
                            const pct = points > 0 ? Math.round((donePoints / points) * 100) : 0;
                            return (
                                <Card key={sprint._id} interactive onClick={() => navigate(`/projects/${id}/sprints/${sprint._id}`)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Card.Title>{sprint.name}</Card.Title>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Badge variant={sprint.status === 'active' ? 'active' : sprint.status === 'completed' ? 'completed' : 'info'}>{sprint.status}</Badge>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                title="Delete sprint"
                                                style={{ color: 'var(--color-error)', padding: '4px 6px' }}
                                                onClick={(e) => handleDeleteSprint(e, sprint._id)}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                    {sprint.goal && (
                                        <Card.Description style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Target size={12} /> {sprint.goal}
                                        </Card.Description>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
                                        <Calendar size={12} /> {new Date(sprint.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {new Date(sprint.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                    <div className="sprint-progress-track" style={{ marginTop: 'var(--space-3)' }}>
                                        <div className="sprint-progress-fill" style={{ width: `${pct}%` }} />
                                    </div>
                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                        {donePoints} / {points} points · {sprintStories.length} {sprintStories.length === 1 ? 'story' : 'stories'}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                    </>
                )}

                {/* Kanban Board */}
                {activeTab === 'backlog' && (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="kanban-board">
                        {STATUS.map(colId => {
                            const Icon = STATUS_ICONS[colId];
                            const color = STATUS_COLORS[colId];
                            const stories = storiesState[colId];

                            return (
                                <div key={colId} className={`kanban-col col-${colId}`} style={{ flex: 1, minWidth: 260, width: 'auto' }}>
                                    <div className="kanban-col-header">
                                        <div className="kanban-col-header-left">
                                            <div className="kanban-col-indicator" style={{ background: color }} />
                                            <h3 style={{ color }}>{STATUS_LABELS[colId]}</h3>
                                            <span className="kanban-col-count">{stories.length}</span>
                                        </div>
                                        <button className="kanban-add-btn" onClick={() => openCreate(colId)} title={`Add to ${STATUS_LABELS[colId]}`}>
                                            <Plus size={15} />
                                        </button>
                                    </div>

                                    <Droppable droppableId={colId}>
                                        {(provided, snapshot) => (
                                            <div
                                                className={`kanban-col-body ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                            >
                                                {stories.length === 0 && !snapshot.isDraggingOver && (
                                                    filtersActive ? (
                                                        <div className="kanban-empty-col">
                                                            <Search size={22} style={{ opacity: 0.4 }} />
                                                            <span>No matches here.</span>
                                                        </div>
                                                    ) : (
                                                        <div className="kanban-empty-col" onClick={() => openCreate(colId)}>
                                                            <Icon size={22} style={{ opacity: 0.4 }} />
                                                            <span>No stories yet.<br />Click to add one.</span>
                                                        </div>
                                                    )
                                                )}

                                                <AnimatePresence>
                                                    {stories.map((story, index) => (
                                                        <Draggable key={story._id} draggableId={story._id} index={index}>
                                                            {(provided, snapshot) => (
                                                                <motion.div
                                                                    className={`task-card ${snapshot.isDragging ? 'is-dragging' : ''}`}
                                                                    onClick={() => navigate(`/stories/${story._id}`)}
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    style={{ ...provided.draggableProps.style }}
                                                                    initial={{ opacity: 0, y: 8 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                                    transition={{ duration: 0.18 }}
                                                                >
                                                                    <div className="task-card-type-bar" style={{ background: PRIORITY_COLORS[story.priority] }} />
                                                                    <h4 style={{ paddingLeft: 10 }}>{story.title}</h4>
                                                                    {story.description && <p style={{ paddingLeft: 10 }}>{story.description}</p>}
                                                                    {story.tags?.length > 0 && (
                                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 10, marginBottom: 'var(--space-1_5)' }}>
                                                                            {story.tags.map(t => (
                                                                                <Badge key={t} variant="info">{t}</Badge>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    <div className="task-card-meta" style={{ paddingLeft: 10 }}>
                                                                        <Badge variant={story.priority}>{story.priority}</Badge>
                                                                        <Badge variant="info">{story.storyPoints ?? 0} pts</Badge>
                                                                        <div className="task-card-actions">
                                                                            <button className="btn btn-ghost btn-sm" title="Edit" onClick={e => openEdit(e, story)} style={{ padding: '4px 6px' }}>
                                                                                <Edit2 size={13} />
                                                                            </button>
                                                                            <button className="btn btn-ghost btn-sm" title="Archive" style={{ color: 'var(--color-error)', padding: '4px 6px' }} onClick={e => handleArchive(e, story._id)}>
                                                                                <Archive size={13} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    {story.assignee && (
                                                                        <div className="task-card-footer" style={{ paddingLeft: 10 }}>
                                                                            <div className="avatar-sm">{story.assignee.name.charAt(0).toUpperCase()}</div>
                                                                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{story.assignee.name}</span>
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                </AnimatePresence>
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            );
                        })}
                    </div>
                </DragDropContext>
                )}
            </div>

            {/* Create / Edit Story Dialog */}
            <Dialog
                open={showModal}
                title={editStory ? 'Edit User Story' : 'New User Story'}
                onClose={() => setShowModal(false)}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>{editStory ? 'Save Changes' : 'Create Story'}</button>
                </>}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <Input
                        label="Story Title"
                        required
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        placeholder="As a user, I want to..."
                    />
                    <TextArea
                        label="Description"
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        placeholder="Acceptance criteria, notes..."
                        rows={3}
                    />
                    <div className="form-row">
                        <Dropdown
                            label="Priority"
                            value={form.priority}
                            onChange={e => setForm({ ...form, priority: e.target.value })}
                            options={PRIORITY.map(p => ({ value: p, label: p }))}
                        />
                        <Dropdown
                            label="Status"
                            value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value })}
                            options={STATUS.map(s => ({ value: s, label: STATUS_LABELS[s] }))}
                        />
                    </div>
                    <div className="form-row">
                        <Dropdown
                            label="Assignee"
                            value={form.assignee}
                            onChange={e => setForm({ ...form, assignee: e.target.value })}
                            placeholder="Unassigned"
                            options={users.map(u => ({ value: u._id, label: u.name }))}
                        />
                        <Input
                            label="Story Points"
                            type="number"
                            min="0"
                            step="1"
                            value={form.storyPoints}
                            onChange={e => setForm({ ...form, storyPoints: e.target.value })}
                        />
                    </div>
                    <Dropdown
                        label="Sprint"
                        value={form.sprint}
                        onChange={e => setForm({ ...form, sprint: e.target.value })}
                        placeholder="Backlog (no sprint)"
                        options={sprints.filter(s => s.status !== 'completed').map(s => ({ value: s._id, label: s.name }))}
                    />
                    <Input
                        label="Tags"
                        value={form.tags}
                        onChange={e => setForm({ ...form, tags: e.target.value })}
                        placeholder="e.g. frontend, bug, needs-design (comma separated)"
                    />
                </form>
            </Dialog>

            {/* Create Sprint Dialog */}
            <Dialog
                open={showSprintModal}
                title="Plan New Sprint"
                onClose={() => setShowSprintModal(false)}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowSprintModal(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSprintSubmit}>Create Sprint</button>
                </>}
            >
                <form onSubmit={handleSprintSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <Input
                        label="Sprint Name"
                        required
                        value={sprintForm.name}
                        onChange={e => setSprintForm({ ...sprintForm, name: e.target.value })}
                        placeholder="Sprint 1"
                    />
                    <Input
                        label="Sprint Goal"
                        value={sprintForm.goal}
                        onChange={e => setSprintForm({ ...sprintForm, goal: e.target.value })}
                        placeholder="What should this sprint achieve?"
                    />
                    <div className="form-row">
                        <Input
                            label="Start Date"
                            type="date"
                            required
                            value={sprintForm.startDate}
                            onChange={e => setSprintForm({ ...sprintForm, startDate: e.target.value })}
                        />
                        <Input
                            label="End Date"
                            type="date"
                            required
                            min={sprintForm.startDate || undefined}
                            value={sprintForm.endDate}
                            onChange={e => setSprintForm({ ...sprintForm, endDate: e.target.value })}
                        />
                    </div>
                </form>
            </Dialog>
        </motion.div>
    );
};

export default ProjectDetail;
