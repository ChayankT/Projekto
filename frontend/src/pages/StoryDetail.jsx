import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Edit2, Archive, Calendar, User as UserIcon, Plus, ChevronRight } from 'lucide-react';
import { getStory, createTask, updateTask, archiveTask } from '../api/client';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useDataSync } from '../context/DataSyncContext';
import { Dialog, Input, Dropdown, Badge, Skeleton } from '../components/ui';
import { TextArea } from '../components/ui/Input';
import useHotkey from '../hooks/useHotkey';

const TASK_STATUS = ['active', 'in_progress', 'completed'];
const STATUS_LABELS = { active: 'Active', in_progress: 'In Progress', completed: 'Completed' };
const STATUS_COLORS = { active: 'var(--accent-primary)', in_progress: 'var(--color-warning)', completed: 'var(--color-success)' };

const StoryDetail = () => {
    const { id } = useParams();
    const { users, activeUserId } = useApp();
    const { addToast } = useToast();
    // Notify Team / Sprint / Dashboard / Project-statistics views (and any
    // other page relying on task data) that a task changed, so they refetch
    // immediately instead of only picking up the change on their next mount.
    const { notifyTasksChanged } = useDataSync();

    const [story, setStory] = useState(null);
    const [tasks, setTasks] = useState({ active: [], in_progress: [], completed: [] });
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editTask, setEditTask] = useState(null);
    const [defaultStatus, setDefaultStatus] = useState('active');
    const [form, setForm] = useState({ title: '', description: '', status: 'active', assignee: '', dueDate: '' });

    const fetchStory = async () => {
        try {
            const res = await getStory(id);
            setStory(res.data);

            const newTasks = { active: [], in_progress: [], completed: [] };
            (res.data.tasks || []).forEach(t => {
                if (newTasks[t.status]) newTasks[t.status].push(t);
            });
            setTasks(newTasks);
        } catch {
            addToast('Story not found', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStory(); }, [id]);

    const openCreate = (status = 'active') => {
        setEditTask(null);
        setDefaultStatus(status);
        setForm({ title: '', description: '', status, assignee: activeUserId || '', dueDate: '' });
        setShowModal(true);
    };

    // Keyboard shortcut: 'n' opens the New Task dialog (disabled while a
    // dialog is already open, or while typing in a field — see useHotkey).
    useHotkey('n', () => openCreate(), { enabled: !showModal });

    const openEdit = (task) => {
        setEditTask(task);
        setForm({
            title: task.title,
            description: task.description,
            status: task.status,
            assignee: task.assignee?._id || '',
            dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        try {
            const payload = { ...form, story: id };
            if (!payload.assignee) delete payload.assignee;
            if (!payload.dueDate) delete payload.dueDate;

            if (editTask) {
                await updateTask(editTask._id, payload);
                addToast('Task updated');
            } else {
                await createTask(payload);
                addToast('Task created');
            }
            setShowModal(false);
            fetchStory();
            notifyTasksChanged();
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to save task', 'error');
        }
    };

    const handleArchive = async (taskId) => {
        if (!confirm('Archive this task? It can be restored from the Archive page.')) return;
        try {
            await archiveTask(taskId);
            fetchStory();
            notifyTasksChanged();
            addToast('Task archived');
        } catch { addToast('Failed to archive task', 'error'); }
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;

        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const sourceCol = source.droppableId;
        const destCol = destination.droppableId;
        const sourceTasks = Array.from(tasks[sourceCol]);
        const destTasks = sourceCol === destCol ? sourceTasks : Array.from(tasks[destCol]);

        const [movedTask] = sourceTasks.splice(source.index, 1);
        movedTask.status = destCol;
        destTasks.splice(destination.index, 0, movedTask);

        setTasks(prev => ({
            ...prev,
            [sourceCol]: sourceTasks,
            [destCol]: destTasks
        }));

        if (sourceCol !== destCol) {
            try {
                await updateTask(draggableId, { status: destCol });
                notifyTasksChanged();
            } catch (err) {
                addToast('Failed to move task on server', 'error');
                fetchStory();
            }
        }
    };

    const isOverdue = (dueDate, status) => {
        if (!dueDate || status === 'completed') return false;
        return new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-8)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                <Skeleton variant="text" width="60px" />
                <Skeleton variant="text" width="80px" />
                <Skeleton variant="text" width="120px" />
            </div>
            <Skeleton variant="heading" width="320px" />
            <Skeleton variant="text" width="500px" />
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-6)', flex: 1 }}>
                {[1, 2, 3].map(i => <div key={i} style={{ flex: 1 }}><Skeleton variant="card" height={360} /></div>)}
            </div>
        </div>
    );

    if (!story) return null;

    return (
        <div style={{ animation: 'fade-in-up 0.3s ease forwards', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="breadcrumb">
                <Link to="/projects">Projects</Link>
                <span className="sep"><ChevronRight size={14} /></span>
                {story.project && <Link to={`/projects/${story.project._id || story.project}`}>{story.project.name || 'Project'}</Link>}
                <span className="sep"><ChevronRight size={14} /></span>
                <span className="current">{story.title}</span>
            </div>

            <div style={{ marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                    <div>
                        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)', letterSpacing: 'var(--tracking-tighter)' }}>{story.title}</h1>
                        {story.description && <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)', maxWidth: 800, lineHeight: 'var(--leading-relaxed)' }}>{story.description}</p>}
                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Badge variant={story.status}>{story.status.replace('_', ' ')}</Badge>
                            <Badge variant={story.priority}>{story.priority}</Badge>
                            {story.assignee && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}><UserIcon size={12} /> {story.assignee.name}</span>}
                            {story.tags?.map(t => <Badge key={t} variant="info">{t}</Badge>)}
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => openCreate()} title="New Task (N)">
                        <Plus size={16} /> New Task
                    </button>
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="kanban-board" style={{ flex: 1, minHeight: 0 }}>
                    {TASK_STATUS.map(colId => (
                        <div key={colId} className={`kanban-col col-${colId}`} style={{ flex: 1, minWidth: 260, width: 'auto' }}>
                            <div className="kanban-col-header">
                                <div className="kanban-col-header-left">
                                    <div className="kanban-col-indicator" style={{ background: STATUS_COLORS[colId] }} />
                                    <h3 style={{ color: STATUS_COLORS[colId] }}>{STATUS_LABELS[colId]}</h3>
                                    <span className="kanban-col-count">{tasks[colId].length}</span>
                                </div>
                                <button className="kanban-add-btn" onClick={() => openCreate(colId)}><Plus size={16} /></button>
                            </div>

                            <Droppable droppableId={colId}>
                                {(provided, snapshot) => (
                                    <div
                                        className={`kanban-col-body ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                    >
                                        {tasks[colId].length === 0 && !snapshot.isDraggingOver && (
                                            <div className="kanban-empty-col" onClick={() => openCreate(colId)}>
                                                <Plus size={18} />
                                                <span>Add task</span>
                                            </div>
                                        )}
                                        {tasks[colId].map((task, index) => (
                                            <Draggable key={task._id} draggableId={task._id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        className={`task-card ${snapshot.isDragging ? 'is-dragging' : ''}`}
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{ ...provided.draggableProps.style }}
                                                    >
                                                        <h4>{task.title}</h4>
                                                        {task.description && <p>{task.description}</p>}

                                                        <div className="task-card-meta">
                                                            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                                                                {task.assignee && (
                                                                    <div title={task.assignee.name} className="avatar-sm">
                                                                        {task.assignee.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                {task.dueDate && (
                                                                    <span className={`due-date ${isOverdue(task.dueDate, task.status) ? 'overdue' : ''}`}>
                                                                        <Calendar size={12} /> {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="task-card-actions">
                                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(task)}><Edit2 size={14} /></button>
                                                                <button className="btn btn-ghost btn-sm" title="Archive" style={{ color: 'var(--color-error)' }} onClick={() => handleArchive(task._id)}><Archive size={14} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>

            {/* Create / Edit Task Dialog */}
            <Dialog
                open={showModal}
                title={editTask ? 'Edit Task' : 'New Task'}
                onClose={() => setShowModal(false)}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>{editTask ? 'Save Changes' : 'Create Task'}</button>
                </>}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <Input
                        label="Task Title"
                        required
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g. Implement login form"
                    />
                    <TextArea
                        label="Description"
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        placeholder="Details, notes..."
                        rows={3}
                    />
                    <div className="form-row">
                        <Dropdown
                            label="Status"
                            value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value })}
                            options={TASK_STATUS.map(s => ({ value: s, label: STATUS_LABELS[s] }))}
                        />
                        <Input
                            label="Due Date"
                            type="date"
                            value={form.dueDate}
                            onChange={e => setForm({ ...form, dueDate: e.target.value })}
                        />
                    </div>
                    <Dropdown
                        label="Assignee"
                        value={form.assignee}
                        onChange={e => setForm({ ...form, assignee: e.target.value })}
                        placeholder="Unassigned"
                        options={users.map(u => ({ value: u._id, label: u.name }))}
                    />
                </form>
            </Dialog>
        </div>
    );
};

export default StoryDetail;
