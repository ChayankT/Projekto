import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getProjects, createProject, updateProject, deleteProject } from '../api/client';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Dialog, Input, Dropdown, Badge, EmptyState, Skeleton } from '../components/ui';
import { TextArea } from '../components/ui/Input';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Edit2, Archive, ArchiveRestore, Plus, User as UserIcon, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const BASE_STATUS_OPTIONS = ['active', 'completed'];
const STATUS_LABELS = { active: 'Active', completed: 'Completed', archived: 'Archived' };
const STATUS_COLORS = { active: 'var(--accent-primary)', completed: 'var(--color-success)', archived: 'var(--text-tertiary)' };

const ProjectList = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { users, activeUserId } = useApp();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [cols, setCols] = useState({ active: [], completed: [], archived: [] });
    const [showModal, setShowModal] = useState(false);
    const [editProject, setEditProject] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', status: 'active', owner: '' });
    const [defaultStatus, setDefaultStatus] = useState('active');
    const [showArchived, setShowArchived] = useState(false);
    const [confirmArchive, setConfirmArchive] = useState(null); // project pending archive confirmation

    const STATUS_OPTIONS = showArchived ? [...BASE_STATUS_OPTIONS, 'archived'] : BASE_STATUS_OPTIONS;

    const fetchProjects = async () => {
        try {
            const res = await getProjects();
            const buckets = { active: [], completed: [], archived: [] };
            res.data.forEach(p => buckets[p.status]?.push(p));
            setCols(buckets);
        } catch { addToast('Failed to load', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchProjects(); }, []);

    const openCreate = (status = 'active') => {
        setEditProject(null);
        setDefaultStatus(status);
        setForm({ name: '', description: '', status, owner: activeUserId || '' });
        setShowModal(true);
    };

    // Deep-link support for the Command Palette's "Create New Project" quick
    // action: navigating here with ?new=project opens the create dialog
    // automatically, then the param is dropped so a refresh doesn't reopen it.
    useEffect(() => {
        if (searchParams.get('new') === 'project') {
            openCreate('active');
            setSearchParams(prev => {
                const next = new URLSearchParams(prev);
                next.delete('new');
                return next;
            }, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const openEdit = (p) => {
        setEditProject(p);
        setForm({ name: p.name, description: p.description || '', status: p.status, owner: p.owner?._id || '' });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        try {
            if (editProject) {
                await updateProject(editProject._id, form);
                addToast('Project updated');
            } else {
                await createProject(form);
                addToast('Project created');
            }
            await fetchProjects();
            setShowModal(false);
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed', 'error');
        }
    };

    const requestArchive = (project) => setConfirmArchive(project);

    const handleConfirmArchive = async () => {
        if (!confirmArchive) return;
        try {
            await updateProject(confirmArchive._id, { status: 'archived' });
            await fetchProjects();
            addToast('Project archived');
        } catch { addToast('Failed to archive', 'error'); }
        finally { setConfirmArchive(null); }
    };

    const handleRestore = async (id) => {
        try {
            const proj = cols.archived.find(p => p._id === id);
            const target = proj?.statusBeforeArchive || 'active';
            await updateProject(id, { status: target });
            await fetchProjects();
            addToast(`Project restored to ${STATUS_LABELS[target].toLowerCase()}`);
        } catch { addToast('Failed to restore', 'error'); }
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Dragging into Archived needs the same confirmation as the button action —
        // snap the card back and open the confirm dialog instead of moving it.
        if (destination.droppableId === 'archived' && source.droppableId !== 'archived') {
            const project = cols[source.droppableId][source.index];
            if (project) requestArchive(project);
            return;
        }

        const srcCol = [...cols[source.droppableId]];
        const destCol = source.droppableId === destination.droppableId ? srcCol : [...cols[destination.droppableId]];
        const [moved] = srcCol.splice(source.index, 1);
        destCol.splice(destination.index, 0, moved);

        const newCols = { ...cols, [source.droppableId]: srcCol };
        if (source.droppableId !== destination.droppableId) newCols[destination.droppableId] = destCol;
        setCols(newCols);

        if (source.droppableId !== destination.droppableId) {
            try {
                await updateProject(draggableId, { status: destination.droppableId });
            } catch {
                addToast('Failed to update', 'error');
                fetchProjects();
            }
        }
    };

    if (loading) {
        return (
            <div style={{ padding: 'var(--space-10)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
                    <Skeleton variant="heading" width="220px" />
                    <Skeleton variant="button" width="140px" />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ flex: 1 }}>
                            <Skeleton variant="card" height={400} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ animation: 'fade-in-up 0.35s ease forwards' }}>
            <div className="section-header">
                <h2>Projects</h2>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <button
                        className={`btn btn-sm ${showArchived ? 'btn-secondary' : 'btn-ghost'}`}
                        onClick={() => setShowArchived(v => !v)}
                        title={showArchived ? 'Hide archived projects' : 'Show archived projects'}
                    >
                        {showArchived ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showArchived ? 'Hide Archived' : 'Show Archived'}
                        {!showArchived && cols.archived.length > 0 && (
                            <span className="kanban-col-count" style={{ marginLeft: 2 }}>{cols.archived.length}</span>
                        )}
                    </button>
                    <button className="btn btn-primary" onClick={() => openCreate('active')}>
                        <Plus size={16} /> New Project
                    </button>
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="kanban-board">
                    {STATUS_OPTIONS.map(status => {
                        const isArchivedCol = status === 'archived';
                        return (
                        <Droppable key={status} droppableId={status}>
                            {(provided, snapshot) => (
                                <div className={`kanban-col col-${status}`} ref={provided.innerRef} {...provided.droppableProps}>
                                    <div className="kanban-col-header">
                                        <div className="kanban-col-header-left">
                                            <div className="kanban-col-indicator" style={{ background: STATUS_COLORS[status] }} />
                                            <h3>{STATUS_LABELS[status]}</h3>
                                            <span className="kanban-col-count">{cols[status].length}</span>
                                        </div>
                                        {!isArchivedCol && (
                                            <button className="kanban-add-btn" onClick={() => openCreate(status)} title={`Add ${STATUS_LABELS[status]}`}>
                                                <Plus size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div className={`kanban-col-body ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}>
                                        {cols[status].length === 0 ? (
                                            isArchivedCol ? (
                                                <div className="kanban-empty-col" style={{ cursor: 'default' }}>
                                                    <Archive size={18} />
                                                    <span>No archived projects</span>
                                                </div>
                                            ) : (
                                                <div className="kanban-empty-col" onClick={() => openCreate(status)}>
                                                    <Plus size={18} />
                                                    <span>Add project</span>
                                                </div>
                                            )
                                        ) : (
                                            cols[status].map((p, index) => (
                                                <Draggable key={p._id} draggableId={p._id} index={index}>
                                                    {(prov, snap) => (
                                                        <div
                                                            ref={prov.innerRef}
                                                            {...prov.draggableProps}
                                                            {...prov.dragHandleProps}
                                                            className={`task-card ${snap.isDragging ? 'is-dragging' : ''}`}
                                                            onClick={() => navigate(`/projects/${p._id}`)}
                                                        >
                                                            <h4>{p.name}</h4>
                                                            {p.description && <p>{p.description}</p>}
                                                            <div className="task-card-meta">
                                                                <Badge variant={p.status}>{p.status}</Badge>
                                                                <div className="task-card-actions" onClick={e => e.stopPropagation()}>
                                                                    {isArchivedCol ? (
                                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleRestore(p._id)} title="Restore">
                                                                            <ArchiveRestore size={14} />
                                                                        </button>
                                                                    ) : (
                                                                        <>
                                                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><Edit2 size={14} /></button>
                                                                            <button className="btn btn-ghost btn-sm" onClick={() => requestArchive(p)} title="Archive"><Archive size={14} /></button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {p.owner && (
                                                                <div className="task-card-footer">
                                                                    <div className="avatar-sm">{p.owner.name?.charAt(0)}</div>
                                                                    <small style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>{p.owner.name}</small>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))
                                        )}
                                        {provided.placeholder}
                                    </div>
                                </div>
                            )}
                        </Droppable>
                        );
                    })}
                </div>
            </DragDropContext>

            <Dialog
                open={showModal}
                title={editProject ? 'Edit Project' : 'New Project'}
                onClose={() => setShowModal(false)}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>{editProject ? 'Save Changes' : 'Create Project'}</button>
                </>}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <Input
                        label="Project Name"
                        required
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Mobile App Redesign"
                    />
                    <TextArea
                        label="Description"
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        placeholder="Brief project description..."
                        rows={3}
                    />
                    <div className="form-row">
                        <Dropdown
                            label="Status"
                            value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value })}
                            options={BASE_STATUS_OPTIONS.map(s => ({ value: s, label: STATUS_LABELS[s] }))}
                        />
                        <Dropdown
                            label="Owner"
                            required
                            value={form.owner}
                            onChange={e => setForm({ ...form, owner: e.target.value })}
                            placeholder="Select owner"
                            options={users.map(u => ({ value: u._id, label: u.name }))}
                        />
                    </div>
                </form>
            </Dialog>

            {/* Archive Confirmation */}
            <Dialog
                open={!!confirmArchive}
                title="Archive this project?"
                onClose={() => setConfirmArchive(null)}
                size="sm"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setConfirmArchive(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleConfirmArchive}>
                        <Archive size={14} /> Archive Project
                    </button>
                </>}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', alignItems: 'center', textAlign: 'center', padding: 'var(--space-4) 0' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 'var(--radius-full)',
                        background: 'var(--accent-subtle)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                        <AlertTriangle size={24} color="var(--accent-primary)" />
                    </div>
                    <div>
                        <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                            {confirmArchive?.name}
                        </p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                            It'll be hidden from the dashboard and this board, but nothing is deleted —
                            you can restore it anytime from here or the Archive page.
                        </p>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default ProjectList;
