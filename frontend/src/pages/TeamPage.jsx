import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useDataSync } from '../context/DataSyncContext';
import { updateUser, deleteUser, getAllTasks, getAllStories } from '../api/client';
import {
    Mail, Edit2, Trash2, Shield, UserPlus, Users,
    CheckCircle2, Clock, AlertTriangle, ListChecks, TrendingUp
} from 'lucide-react';
import { Dialog, Input, Dropdown, Badge, EmptyState, Skeleton } from '../components/ui';

const ROLES = ['admin', 'member'];
const OVERLOAD_THRESHOLD = 8; // items (stories + tasks) assigned = overloaded

/* ═══════════════════════════════════════════
   SVG Donut Chart — Pure React, no deps
   ═══════════════════════════════════════════ */
const DonutChart = ({ value, size = 52, stroke = 5, color = 'var(--accent-primary)' }) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const pct = Math.min(Math.max(value, 0), 100);
    const dashoffset = circ - (pct / 100) * circ;

    return (
        <svg width={size} height={size} className="donut-chart">
            <circle cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke="var(--bg-surface-2)" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={circ} strokeDashoffset={dashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
                fill="var(--text-primary)" fontSize="12" fontWeight="700">
                {Math.round(pct)}%
            </text>
        </svg>
    );
};

/* ═══════════════════════════════════════════
   Progress Bar
   ═══════════════════════════════════════════ */
const ProgressBar = ({ value, color = 'var(--accent-primary)', height = 6 }) => (
    <div className="team-progress-track" style={{ height }}>
        <div className="team-progress-fill" style={{ width: `${Math.min(value, 100)}%`, background: color, height }} />
    </div>
);

/* ═══════════════════════════════════════════
   Workload Bar — shows relative task load
   ═══════════════════════════════════════════ */
const WorkloadBar = ({ count, max }) => {
    const pct = max > 0 ? (count / max) * 100 : 0;
    const isOverloaded = count >= OVERLOAD_THRESHOLD;
    const color = isOverloaded ? 'var(--color-error)' : pct > 60 ? 'var(--color-warning)' : 'var(--accent-primary)';
    return (
        <div className="team-workload">
            <div className="team-workload-bar">
                <div className="team-workload-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
            </div>
            <span className={`team-workload-label ${isOverloaded ? 'overloaded' : ''}`}>
                {count} item{count !== 1 ? 's' : ''}
                {isOverloaded && <AlertTriangle size={12} />}
            </span>
        </div>
    );
};

/* ═══════════════════════════════════════════
   Team Page
   ═══════════════════════════════════════════ */
const TeamPage = () => {
    const { users, addUser, fetchUsers } = useApp();
    const { addToast } = useToast();
    const { taskVersion, storyVersion } = useDataSync();
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', role: 'member' });
    const [items, setItems] = useState([]); // combined tasks + stories
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWork = async () => {
            try {
                // Tasks and stories are both independently assignable, so a
                // member's real workload (and completion rate) has to combine
                // both — counting only tasks silently drops every story
                // assigned directly to someone.
                const [tasksRes, storiesRes] = await Promise.all([getAllTasks(), getAllStories()]);
                const tasks = (tasksRes.data || []).map(t => ({ ...t, _kind: 'task' }));
                const stories = (storiesRes.data || []).map(s => ({ ...s, _kind: 'story' }));
                setItems([...tasks, ...stories]);
            } catch { /* silent — stats just won't show */ }
            finally { setLoading(false); }
        };
        fetchWork();
        // Re-fetch whenever a task or story is created/edited/assigned/
        // completed/archived/restored anywhere else in the app (e.g. from
        // StoryDetail or the Archive page) so workload and completion stats
        // stay accurate without needing to leave and re-enter this page.
    }, [taskVersion, storyVersion]);

    // ── Per-user stats ─────────────────────────
    const memberStats = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return users.map(u => {
            const assigned = items.filter(i => i.assignee?._id === u._id);
            const completed = assigned.filter(i => i.status === 'completed');
            const inProgress = assigned.filter(i => i.status === 'in_progress');
            // Only tasks carry a dueDate — stories have no due date field, so
            // this naturally (and correctly) counts tasks only.
            const overdue = assigned.filter(i =>
                i.status !== 'completed' && i.dueDate && new Date(i.dueDate) < now
            );
            const completionPct = assigned.length > 0 ? Math.round((completed.length / assigned.length) * 100) : 0;

            return {
                user: u,
                assigned: assigned.length,
                completed: completed.length,
                inProgress: inProgress.length,
                overdue: overdue.length,
                completionPct,
                isOverloaded: assigned.length >= OVERLOAD_THRESHOLD,
            };
        });
    }, [users, items]);

    const maxTasks = useMemo(() => Math.max(...memberStats.map(m => m.assigned), 1), [memberStats]);

    // ── Team-wide stats ────────────────────────
    const teamStats = useMemo(() => {
        const total = items.length;
        const completed = items.filter(i => i.status === 'completed').length;
        const inProgress = items.filter(i => i.status === 'in_progress').length;
        const now = new Date(); now.setHours(0, 0, 0, 0);
        const overdue = items.filter(i => i.status !== 'completed' && i.dueDate && new Date(i.dueDate) < now).length;
        return { total, completed, inProgress, overdue, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }, [items]);

    // ── CRUD handlers ──────────────────────────
    const openCreate = () => { setEditUser(null); setForm({ name: '', email: '', role: 'member' }); setShowModal(true); };
    const openEdit = (user) => { setEditUser(user); setForm({ name: user.name, email: user.email, role: user.role }); setShowModal(true); };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        try {
            if (editUser) { await updateUser(editUser._id, form); addToast('User updated'); }
            else { await addUser(form); addToast('User created'); }
            await fetchUsers();
            setShowModal(false);
        } catch (err) { addToast(err.response?.data?.message || 'Failed to save user', 'error'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Remove this team member?')) return;
        try { await deleteUser(id); await fetchUsers(); addToast('User removed'); }
        catch (err) { addToast(err.response?.data?.message || 'Failed to delete', 'error'); }
    };

    if (loading) {
        return (
            <div>
                <div className="section-header"><Skeleton variant="heading" width="200px" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="card" height={90} />)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-5)' }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} variant="card" height={260} />)}
                </div>
            </div>
        );
    }

    return (
        <div style={{ animation: 'fade-in-up 0.35s ease forwards' }}>
            {/* Header */}
            <div className="section-header" style={{ marginBottom: 'var(--space-6)' }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Users size={20} /> Team
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                        {users.length} member{users.length !== 1 ? 's' : ''} • {teamStats.total} total items
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><UserPlus size={16} /> Add Member</button>
            </div>

            {/* Team-Wide Summary Stats */}
            <div className="stats-grid" style={{ marginBottom: 'var(--space-8)' }}>
                <div className="stat-card">
                    <span className="stat-label">Total Items</span>
                    <div className="stat-value">{teamStats.total}</div>
                    <span className="stat-icon"><ListChecks size={20} /></span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Completed</span>
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>{teamStats.completed}</div>
                    <span className="stat-icon"><CheckCircle2 size={20} /></span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">In Progress</span>
                    <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{teamStats.inProgress}</div>
                    <span className="stat-icon"><Clock size={20} /></span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Overdue</span>
                    <div className="stat-value" style={{ color: 'var(--color-error)' }}>{teamStats.overdue}</div>
                    <span className="stat-icon"><AlertTriangle size={20} /></span>
                </div>
            </div>

            {/* Team-Wide Progress */}
            <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-8)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <TrendingUp size={16} color="var(--accent-primary)" />
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Overall Completion</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--accent-primary)' }}>{teamStats.pct}%</span>
                </div>
                <ProgressBar value={teamStats.pct} height={10} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    <span>{teamStats.completed} completed</span>
                    <span>{teamStats.total - teamStats.completed} remaining</span>
                </div>
            </div>

            {/* Member Cards */}
            {users.length === 0 ? (
                <EmptyState
                    icon={<Users size={48} opacity={0.5} />}
                    title="No team members"
                    description="Add the first person to your team!"
                />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-5)' }}>
                    {memberStats.map(({ user: u, assigned, completed, inProgress, overdue, completionPct, isOverloaded }) => (
                        <div key={u._id} className={`card team-member-card ${isOverloaded ? 'team-overloaded' : ''}`}>
                            {/* Header: Avatar + Name */}
                            <div className="team-card-header">
                                <div className="avatar-lg">{u.name.charAt(0).toUpperCase()}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="team-member-name">
                                        {u.name}
                                        {isOverloaded && (
                                            <span className="team-overloaded-badge" title="Overloaded">
                                                <AlertTriangle size={12} /> Overloaded
                                            </span>
                                        )}
                                    </div>
                                    <div className="team-member-email">
                                        <Mail size={12} /> {u.email}
                                    </div>
                                </div>
                                <DonutChart
                                    value={completionPct}
                                    color={completionPct >= 80 ? 'var(--color-success)' :
                                           completionPct >= 40 ? 'var(--color-warning)' : 'var(--accent-primary)'}
                                />
                            </div>

                            {/* Stats Grid */}
                            <div className="team-stats-grid">
                                <div className="team-stat">
                                    <ListChecks size={14} className="team-stat-icon" />
                                    <span className="team-stat-value">{assigned}</span>
                                    <span className="team-stat-label">Assigned</span>
                                </div>
                                <div className="team-stat">
                                    <CheckCircle2 size={14} color="var(--color-success)" />
                                    <span className="team-stat-value" style={{ color: 'var(--color-success)' }}>{completed}</span>
                                    <span className="team-stat-label">Completed</span>
                                </div>
                                <div className="team-stat">
                                    <Clock size={14} color="var(--color-warning)" />
                                    <span className="team-stat-value" style={{ color: 'var(--color-warning)' }}>{inProgress}</span>
                                    <span className="team-stat-label">In Progress</span>
                                </div>
                                <div className="team-stat">
                                    <AlertTriangle size={14} color="var(--color-error)" />
                                    <span className="team-stat-value" style={{ color: overdue > 0 ? 'var(--color-error)' : 'var(--text-secondary)' }}>{overdue}</span>
                                    <span className="team-stat-label">Overdue</span>
                                </div>
                            </div>

                            {/* Workload Indicator */}
                            <div className="team-card-section">
                                <span className="team-section-label">Workload</span>
                                <WorkloadBar count={assigned} max={maxTasks} />
                            </div>

                            {/* Completion Progress */}
                            <div className="team-card-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="team-section-label">Completion</span>
                                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>{completionPct}%</span>
                                </div>
                                <ProgressBar
                                    value={completionPct}
                                    color={completionPct >= 80 ? 'var(--color-success)' : completionPct >= 40 ? 'var(--color-warning)' : 'var(--accent-primary)'}
                                />
                            </div>

                            {/* Footer: Role + Actions */}
                            <div className="team-card-footer">
                                <Badge variant={u.role === 'admin' ? 'active' : 'backlog'}>
                                    {u.role === 'admin' && <Shield size={12} />} {u.role}
                                </Badge>
                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)} title="Edit"><Edit2 size={14} /></button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(u._id)} title="Remove" style={{ color: 'var(--color-error)' }}><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog
                open={showModal}
                title={editUser ? 'Edit Member' : 'Add Team Member'}
                onClose={() => setShowModal(false)}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>{editUser ? 'Save' : 'Add Member'}</button>
                </>}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <Input label="Full Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
                    <Input label="Email" required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
                    <Dropdown label="Role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} options={ROLES.map(r => ({ value: r, label: r }))} />
                </form>
            </Dialog>
        </div>
    );
};

export default TeamPage;
