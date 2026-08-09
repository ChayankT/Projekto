import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getSprint, getSprintBurndown, updateSprint, updateStory, createStory, getStories } from '../api/client';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useDataSync } from '../context/DataSyncContext';
import { Badge, Skeleton, Card, Dialog, Input, Dropdown, EmptyState } from '../components/ui';
import { TextArea } from '../components/ui/Input';
import BurndownChart from '../components/BurndownChart';
import { motion } from 'framer-motion';
import { ChevronRight, Target, Calendar, Play, CheckCircle2, TrendingDown, Layers, LogIn, ListChecks, ChevronDown, ChevronUp, Plus, Gauge, Edit2, AlertTriangle } from 'lucide-react';

const PRIORITY = ['low', 'medium', 'high'];
const STATUS = ['active', 'in_progress', 'completed'];
const STATUS_LABELS = { active: 'Active', in_progress: 'In Progress', completed: 'Completed' };
const STATUS_COLORS = { active: 'var(--accent-primary)', in_progress: 'var(--color-warning)', completed: 'var(--color-success)' };
const STATUS_ICONS = { active: Layers, in_progress: LogIn, completed: CheckCircle2 };
const PRIORITY_COLORS = { low: 'var(--color-info)', medium: 'var(--color-warning)', high: 'var(--color-error)' };
const SPRINT_STATUS_VARIANT = { planned: 'info', active: 'active', completed: 'completed' };
const VISIBLE_CARD_COUNT = 5;

const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const buildCols = (stories) => {
    const grouped = { active: [], in_progress: [], completed: [] };
    stories.forEach(s => { if (grouped[s.status]) grouped[s.status].push(s); });
    return grouped;
};

const SprintDetail = () => {
    const { id, sprintId } = useParams();
    const navigate = useNavigate();
    const { users, activeUserId } = useApp();
    const { addToast } = useToast();
    const { storyVersion, taskVersion, notifyStoriesChanged, notifyTasksChanged } = useDataSync();
    const [sprint, setSprint] = useState(null);
    const [cols, setCols] = useState({ active: [], in_progress: [], completed: [] });
    const [burndown, setBurndown] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedCols, setExpandedCols] = useState({});
    const [showAddStory, setShowAddStory] = useState(false);
    const [eligibleStories, setEligibleStories] = useState([]);
    const [loadingEligible, setLoadingEligible] = useState(false);
    const [selectedStoryIds, setSelectedStoryIds] = useState([]);
    const [addingStories, setAddingStories] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ title: '', description: '', priority: 'medium', status: 'active', assignee: '', storyPoints: 1, tags: '' });
    const [showCapacityModal, setShowCapacityModal] = useState(false);
    const [capacityInput, setCapacityInput] = useState('');
    const [savingCapacity, setSavingCapacity] = useState(false);

    const toggleExpanded = (colId) => setExpandedCols(prev => ({ ...prev, [colId]: !prev[colId] }));

    const load = async () => {
        try {
            const [sprintRes, burndownRes] = await Promise.all([
                getSprint(sprintId),
                getSprintBurndown(sprintId),
            ]);
            setSprint(sprintRes.data);
            setCols(buildCols(sprintRes.data.stories || []));
            setBurndown(burndownRes.data);
        } catch {
            addToast('Sprint not found', 'error');
            navigate(`/projects/${id}`);
        } finally {
            setLoading(false);
        }
    };

    // Re-run when the sprint changes, OR when a story/task mutation happened
    // elsewhere in the app (e.g. completing a task from Story Detail, or a
    // story edited from the Command Palette or another tab) so the board
    // and task-based progress/burndown stay in sync without needing a
    // remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); setExpandedCols({}); }, [sprintId, storyVersion, taskVersion]);

    const setSprintStatus = async (status) => {
        try {
            await updateSprint(sprintId, { status });
            addToast(status === 'active' ? 'Sprint started' : 'Sprint completed');
            // Completing a sprint cascades to complete all of its stories and
            // their tasks on the backend — let other task/story-dependent
            // views (My Work, Team, Project) know, not just this page.
            if (status === 'completed') {
                notifyStoriesChanged();
                notifyTasksChanged();
            }
            load();
        } catch {
            addToast('Failed to update sprint', 'error');
        }
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const sourceCol = source.droppableId;
        const destCol = destination.droppableId;
        const sourceStories = Array.from(cols[sourceCol]);
        const destStories = sourceCol === destCol ? sourceStories : Array.from(cols[destCol]);

        const [moved] = sourceStories.splice(source.index, 1);
        moved.status = destCol;
        destStories.splice(destination.index, 0, moved);

        setCols(prev => ({ ...prev, [sourceCol]: sourceStories, [destCol]: destStories }));

        if (sourceCol !== destCol) {
            try {
                await updateStory(draggableId, { status: destCol });
                notifyStoriesChanged();
                // Completing a story here cascades to complete its tasks on
                // the backend too — let task-dependent views (My Work, Team)
                // know, not just story-dependent ones.
                if (destCol === 'completed') notifyTasksChanged();
                // Refresh burndown too — a status change here can cascade to
                // complete the story's tasks, which shifts task progress.
                const burndownRes = await getSprintBurndown(sprintId);
                setBurndown(burndownRes.data);
            } catch {
                addToast('Failed to move story', 'error');
                load();
            }
        }
    };

    // Any story in the project that isn't already in this sprint and isn't
    // completed — completed work doesn't belong in sprint planning, but
    // that's the only restriction: an active/in-progress story sitting in
    // the backlog *or* in a different sprint is fair game to pull in here.
    const openAddStory = async () => {
        setShowAddStory(true);
        setSelectedStoryIds([]);
        setLoadingEligible(true);
        try {
            const res = await getStories(id);
            const eligible = res.data.filter(s =>
                s.status !== 'completed' && (s.sprint?._id || s.sprint) !== sprintId
            );
            setEligibleStories(eligible);
        } catch {
            addToast('Failed to load stories', 'error');
        } finally {
            setLoadingEligible(false);
        }
    };

    const toggleSelected = (storyId) => {
        setSelectedStoryIds(prev =>
            prev.includes(storyId) ? prev.filter(sid => sid !== storyId) : [...prev, storyId]
        );
    };

    const handleAddStories = async () => {
        if (selectedStoryIds.length === 0) return;
        setAddingStories(true);
        try {
            await Promise.all(selectedStoryIds.map(sid => updateStory(sid, { sprint: sprintId })));
            addToast(`${selectedStoryIds.length} ${selectedStoryIds.length === 1 ? 'story' : 'stories'} added to sprint`);
            setShowAddStory(false);
            notifyStoriesChanged();
            load();
        } catch {
            addToast('Failed to add stories to sprint', 'error');
        } finally {
            setAddingStories(false);
        }
    };

    // Create a brand-new story directly in this sprint, preset to whichever
    // column's "+" was clicked — same pattern as the Project backlog board
    // and a story's task board.
    const openCreate = (status = 'active') => {
        setCreateForm({ title: '', description: '', priority: 'medium', status, assignee: activeUserId || '', storyPoints: 1, tags: '' });
        setShowCreateModal(true);
    };

    const handleCreateSubmit = async (e) => {
        e?.preventDefault();
        try {
            const tags = createForm.tags.split(',').map(t => t.trim()).filter(Boolean);
            const payload = { ...createForm, project: id, sprint: sprintId, storyPoints: Number(createForm.storyPoints) || 0, tags };
            await createStory(payload);
            addToast('Story created');
            setShowCreateModal(false);
            notifyStoriesChanged();
            // A story created directly as completed cascades to complete its
            // tasks too (none yet, but keep task-dependent views in sync).
            if (payload.status === 'completed') notifyTasksChanged();
            load();
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to create story', 'error');
        }
    };

    const openCapacityEdit = () => {
        setCapacityInput(sprint.capacity != null ? String(sprint.capacity) : '');
        setShowCapacityModal(true);
    };

    const handleCapacitySubmit = async (e) => {
        e?.preventDefault();
        setSavingCapacity(true);
        try {
            const capacity = capacityInput === '' ? null : Number(capacityInput);
            const res = await updateSprint(sprintId, { capacity });
            setSprint(prev => ({ ...prev, capacity: res.data.capacity }));
            addToast('Capacity updated');
            setShowCapacityModal(false);
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to update capacity', 'error');
        } finally {
            setSavingCapacity(false);
        }
    };

    if (loading) return (
        <div style={{ padding: 'var(--space-8)' }}>
            <Skeleton variant="text" width="160px" />
            <Skeleton variant="heading" width="280px" />
            <div style={{ marginTop: 'var(--space-6)' }}><Skeleton variant="card" height={300} /></div>
        </div>
    );

    if (!sprint) return null;

    const totalTasks = burndown?.totalTasks ?? 0;
    const completedTasks = burndown?.completedTasks ?? 0;
    const remainingTasks = burndown?.remainingTasks ?? 0;
    const completionPercentage = burndown?.completionPercentage ?? 0;

    // Story points committed to this sprint (all stories, any column) vs.
    // the team's stated capacity — separate from the task-based burndown
    // above, since capacity is a story-point concept.
    const committedPoints = Object.values(cols).flat().reduce((sum, s) => sum + (s.storyPoints || 0), 0);
    const hasCapacity = sprint.capacity != null;
    const overCapacity = hasCapacity && committedPoints > sprint.capacity;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                <Link to="/projects" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>Projects</Link>
                <ChevronRight size={13} color="var(--text-tertiary)" />
                <Link to={`/projects/${id}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>{sprint.project?.name}</Link>
                <ChevronRight size={13} color="var(--text-tertiary)" />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>{sprint.name}</span>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <h1 style={{ margin: 0 }}>{sprint.name}</h1>
                        <Badge variant={SPRINT_STATUS_VARIANT[sprint.status]}>{sprint.status}</Badge>
                    </div>
                    {sprint.goal && (
                        <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                            <Target size={14} /> {sprint.goal}
                        </p>
                    )}
                    <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                        <Calendar size={13} /> {fmtDate(sprint.startDate)} – {fmtDate(sprint.endDate)}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {sprint.status !== 'completed' && (
                        <button className="btn btn-secondary" onClick={openAddStory}>
                            <Plus size={15} /> Add Story
                        </button>
                    )}
                    {sprint.status === 'planned' && (
                        <button className="btn btn-primary" onClick={() => setSprintStatus('active')}>
                            <Play size={15} /> Start Sprint
                        </button>
                    )}
                    {sprint.status === 'active' && (
                        <button className="btn btn-primary" onClick={() => setSprintStatus('completed')}>
                            <CheckCircle2 size={15} /> Complete Sprint
                        </button>
                    )}
                </div>
            </div>

            {/* Task-based progress — front and center in the header, not buried in the chart */}
            <div className="sprint-points-header">
                <div className="sprint-points-stat">
                    <ListChecks size={15} />
                    <span className="sprint-points-value">{totalTasks}</span>
                    <span className="sprint-points-label">tasks total</span>
                </div>
                <div className="sprint-points-divider" />
                <div className="sprint-points-stat">
                    <span className="sprint-points-value" style={{ color: 'var(--color-success)' }}>{completedTasks}</span>
                    <span className="sprint-points-label">completed</span>
                </div>
                <div className="sprint-points-divider" />
                <div className="sprint-points-stat">
                    <span className="sprint-points-value" style={{ color: 'var(--color-warning)' }}>{remainingTasks}</span>
                    <span className="sprint-points-label">remaining</span>
                </div>
                <div className="sprint-points-divider" />
                <div className="sprint-points-stat">
                    <span className="sprint-points-value">{completionPercentage}%</span>
                    <span className="sprint-points-label">complete</span>
                </div>
            </div>

            {/* Capacity vs. commitment — story points, not tasks. Warns when the
                sprint is carrying more than the team said it could handle. */}
            <div className="sprint-points-header" style={{ marginTop: 'var(--space-3)', borderColor: overCapacity ? 'var(--color-error-border)' : undefined }}>
                <div className="sprint-points-stat">
                    <Gauge size={15} />
                    <span className="sprint-points-value" style={overCapacity ? { color: 'var(--color-error)' } : undefined}>{committedPoints}</span>
                    <span className="sprint-points-label">points committed</span>
                </div>
                <div className="sprint-points-divider" />
                {hasCapacity ? (
                    <>
                        <div className="sprint-points-stat">
                            <span className="sprint-points-value">{sprint.capacity}</span>
                            <span className="sprint-points-label">capacity</span>
                        </div>
                        {overCapacity && (
                            <>
                                <div className="sprint-points-divider" />
                                <Badge variant="error">
                                    <AlertTriangle size={11} style={{ marginRight: 3 }} />
                                    {committedPoints - sprint.capacity} pts over capacity
                                </Badge>
                            </>
                        )}
                    </>
                ) : (
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>No capacity set</span>
                )}
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={openCapacityEdit}
                    style={{ marginLeft: 'auto' }}
                >
                    <Edit2 size={12} /> {hasCapacity ? 'Edit' : 'Set'} capacity
                </button>
            </div>

            {/* Sprint board — the task list is the primary content of this page, so it
                sits directly under the header/metrics, not below the chart. */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="kanban-board sprint-board" style={{ height: 'auto', marginTop: 'var(--space-6)' }}>
                    {STATUS.map(colId => {
                        const Icon = STATUS_ICONS[colId];
                        const color = STATUS_COLORS[colId];
                        const stories = cols[colId];
                        return (
                            <div key={colId} className={`kanban-col col-${colId}`} style={{ flex: 1, minWidth: 260 }}>
                                <div className="kanban-col-header">
                                    <div className="kanban-col-header-left">
                                        <div className="kanban-col-indicator" style={{ background: color }} />
                                        <h3 style={{ color }}>{STATUS_LABELS[colId]}</h3>
                                        <span className="kanban-col-count">{stories.length}</span>
                                    </div>
                                    {sprint.status !== 'completed' && (
                                        <button className="kanban-add-btn" onClick={() => openCreate(colId)} title={`Add to ${STATUS_LABELS[colId]}`}>
                                            <Plus size={15} />
                                        </button>
                                    )}
                                </div>
                                <Droppable droppableId={colId}>
                                    {(provided, snapshot) => (
                                        <div
                                            className={`kanban-col-body ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                        >
                                            {stories.length === 0 && !snapshot.isDraggingOver && (
                                                sprint.status !== 'completed' ? (
                                                    <div className="kanban-empty-col" onClick={() => openCreate(colId)}>
                                                        <Icon size={20} style={{ opacity: 0.4 }} />
                                                        <span>No stories yet.<br />Click to add one.</span>
                                                    </div>
                                                ) : (
                                                    <div className="kanban-empty-col">
                                                        <Icon size={20} style={{ opacity: 0.4 }} />
                                                        <span>No stories here.</span>
                                                    </div>
                                                )
                                            )}
                                            {stories.map((story, index) => {
                                                const hidden = !expandedCols[colId] && index >= VISIBLE_CARD_COUNT;
                                                return (
                                                <Draggable key={story._id} draggableId={story._id} index={index}>
                                                    {(prov, snap) => (
                                                        <div
                                                            className={`task-card ${snap.isDragging ? 'is-dragging' : ''} ${hidden ? 'task-card-collapsed' : ''}`}
                                                            onClick={() => navigate(`/stories/${story._id}`)}
                                                            ref={prov.innerRef}
                                                            {...prov.draggableProps}
                                                            {...prov.dragHandleProps}
                                                        >
                                                            <div className="task-card-type-bar" style={{ background: PRIORITY_COLORS[story.priority] }} />
                                                            <h4 style={{ paddingLeft: 10 }}>{story.title}</h4>
                                                            <div className="task-card-meta" style={{ paddingLeft: 10 }}>
                                                                <div style={{ display: 'flex', gap: 'var(--space-1_5)', alignItems: 'center' }}>
                                                                    <Badge variant={story.priority}>{story.priority}</Badge>
                                                                    <Badge variant="info">{story.storyPoints ?? 0} pts</Badge>
                                                                </div>
                                                            </div>
                                                            {story.assignee && (
                                                                <div className="task-card-footer" style={{ paddingLeft: 10 }}>
                                                                    <div className="avatar-sm">{story.assignee.name.charAt(0).toUpperCase()}</div>
                                                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{story.assignee.name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </Draggable>
                                                );
                                            })}
                                            {provided.placeholder}
                                            {stories.length > VISIBLE_CARD_COUNT && (
                                                <button
                                                    type="button"
                                                    className="kanban-show-more-btn"
                                                    onClick={() => toggleExpanded(colId)}
                                                >
                                                    {expandedCols[colId] ? (
                                                        <>Show less <ChevronUp size={13} /></>
                                                    ) : (
                                                        <>Show {stories.length - VISIBLE_CARD_COUNT} more <ChevronDown size={13} /></>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </div>
            </DragDropContext>

            {/* Burndown — a compact supporting chart below the task list, not the
                first thing the page shows. Tracks task completion, not story points. */}
            <Card className="burndown-card-compact" style={{ marginTop: 'var(--space-6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <Card.Title style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                        <TrendingDown size={14} /> Task Burndown
                    </Card.Title>
                </div>
                {burndown && burndown.totalTasks > 0 ? (
                    <BurndownChart series={burndown.series} totalTasks={burndown.totalTasks} compact />
                ) : (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                        Add tasks to this sprint's stories to see a burndown chart.
                    </p>
                )}
            </Card>

            {/* Edit Capacity Dialog */}
            <Dialog
                open={showCapacityModal}
                title="Sprint Capacity"
                onClose={() => setShowCapacityModal(false)}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowCapacityModal(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleCapacitySubmit} disabled={savingCapacity}>
                        {savingCapacity ? 'Saving…' : 'Save'}
                    </button>
                </>}
            >
                <form onSubmit={handleCapacitySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <Input
                        label="Team Capacity (story points)"
                        type="number"
                        min="0"
                        step="1"
                        value={capacityInput}
                        onChange={e => setCapacityInput(e.target.value)}
                        placeholder="Leave blank to clear"
                        autoFocus
                    />
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', margin: 0 }}>
                        Currently {committedPoints} {committedPoints === 1 ? 'point' : 'points'} committed to this sprint.
                    </p>
                </form>
            </Dialog>

            {/* Create Story Dialog — new story, preset to this sprint and to
                whichever column's "+" was clicked */}
            <Dialog
                open={showCreateModal}
                title="New User Story"
                onClose={() => setShowCreateModal(false)}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleCreateSubmit}>Create Story</button>
                </>}
            >
                <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <Input
                        label="Story Title"
                        required
                        value={createForm.title}
                        onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                        placeholder="As a user, I want to..."
                    />
                    <TextArea
                        label="Description"
                        value={createForm.description}
                        onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                        placeholder="Acceptance criteria, notes..."
                        rows={3}
                    />
                    <div className="form-row">
                        <Dropdown
                            label="Priority"
                            value={createForm.priority}
                            onChange={e => setCreateForm({ ...createForm, priority: e.target.value })}
                            options={PRIORITY.map(p => ({ value: p, label: p }))}
                        />
                        <Dropdown
                            label="Status"
                            value={createForm.status}
                            onChange={e => setCreateForm({ ...createForm, status: e.target.value })}
                            options={STATUS.map(s => ({ value: s, label: STATUS_LABELS[s] }))}
                        />
                    </div>
                    <div className="form-row">
                        <Dropdown
                            label="Assignee"
                            value={createForm.assignee}
                            onChange={e => setCreateForm({ ...createForm, assignee: e.target.value })}
                            placeholder="Unassigned"
                            options={users.map(u => ({ value: u._id, label: u.name }))}
                        />
                        <Input
                            label="Story Points"
                            type="number"
                            min="0"
                            step="1"
                            value={createForm.storyPoints}
                            onChange={e => setCreateForm({ ...createForm, storyPoints: e.target.value })}
                        />
                    </div>
                    <Input
                        label="Tags"
                        value={createForm.tags}
                        onChange={e => setCreateForm({ ...createForm, tags: e.target.value })}
                        placeholder="e.g. frontend, bug, needs-design (comma separated)"
                    />
                </form>
            </Dialog>

            {/* Add Story Dialog */}
            <Dialog
                open={showAddStory}
                title="Add Story to Sprint"
                onClose={() => setShowAddStory(false)}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowAddStory(false)}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleAddStories}
                        disabled={selectedStoryIds.length === 0 || addingStories}
                    >
                        {addingStories
                            ? 'Adding…'
                            : `Add ${selectedStoryIds.length > 0 ? selectedStoryIds.length : ''} ${selectedStoryIds.length === 1 ? 'Story' : 'Stories'}`}
                    </button>
                </>}
            >
                {loadingEligible ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {[1, 2, 3].map(i => <Skeleton key={i} variant="card" height={56} />)}
                    </div>
                ) : eligibleStories.length === 0 ? (
                    <EmptyState
                        icon="📋"
                        title="No stories available"
                        description="Every uncompleted story in this project is either already in this sprint or there aren't any yet."
                    />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: 360, overflowY: 'auto' }}>
                        {eligibleStories.map(story => (
                            <label
                                key={story._id}
                                className="add-story-row"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedStoryIds.includes(story._id)}
                                    onChange={() => toggleSelected(story._id)}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {story.title}
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--space-1_5)', marginTop: 'var(--space-1)', alignItems: 'center' }}>
                                        <Badge variant={story.priority}>{story.priority}</Badge>
                                        <Badge variant="info">{story.storyPoints ?? 0} pts</Badge>
                                        {story.sprint && (
                                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                                                currently in {story.sprint.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                )}
            </Dialog>
        </motion.div>
    );
};

export default SprintDetail;
