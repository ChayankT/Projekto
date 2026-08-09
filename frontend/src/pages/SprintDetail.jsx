import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getSprint, getSprintBurndown, updateSprint, updateStory, getStories } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useDataSync } from '../context/DataSyncContext';
import { Badge, Skeleton, Card, Dialog, EmptyState } from '../components/ui';
import BurndownChart from '../components/BurndownChart';
import { motion } from 'framer-motion';
import { ChevronRight, Target, Calendar, Play, CheckCircle2, TrendingDown, Layers, LogIn, ListChecks, ChevronDown, ChevronUp, Plus } from 'lucide-react';

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
                                </div>
                                <Droppable droppableId={colId}>
                                    {(provided, snapshot) => (
                                        <div
                                            className={`kanban-col-body ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                        >
                                            {stories.length === 0 && !snapshot.isDraggingOver && (
                                                <div className="kanban-empty-col">
                                                    <Icon size={20} style={{ opacity: 0.4 }} />
                                                    <span>No stories here.</span>
                                                </div>
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
