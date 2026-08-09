import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, getSprints } from '../api/client';
import { useApp } from '../context/AppContext';
import { Badge, Skeleton, EmptyState } from '../components/ui';
import { FolderKanban, Rocket, CheckCircle2, Archive, ArrowUpRight, Calendar } from 'lucide-react';

const STAT_CONFIG = [
    { key: 'total', label: 'Total Projects', icon: FolderKanban, colorVar: '--text-primary' },
    { key: 'active', label: 'Active', icon: Rocket, colorVar: '--accent-primary' },
    { key: 'completed', label: 'Completed', icon: CheckCircle2, colorVar: '--color-success' },
    { key: 'archived', label: 'Archived', icon: Archive, colorVar: '--text-tertiary' },
];

const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const Dashboard = () => {
    const { activeUserId } = useApp();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [activeSprints, setActiveSprints] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pRes, sRes] = await Promise.all([getProjects(), getSprints()]);
                setProjects(pRes.data);
                setActiveSprints((sRes.data || []).filter(s => s.status === 'active'));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const stats = {
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        completed: projects.filter(p => p.status === 'completed').length,
        archived: projects.filter(p => p.status === 'archived').length,
    };
    const visibleProjects = projects.filter(p => p.status !== 'archived');

    if (loading) {
        return (
            <div>
                <Skeleton variant="heading" width="220px" />
                <Skeleton variant="text" width="320px" />
                <div className="stats-grid" style={{ marginTop: 'var(--space-8)' }}>
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="card" height={100} />)}
                </div>
                <Skeleton variant="heading" width="160px" />
                <div className="item-grid" style={{ marginTop: 'var(--space-4)' }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} variant="card" height={160} />)}
                </div>
            </div>
        );
    }

    return (
        <div style={{ animation: 'fade-in-up 0.35s ease forwards' }}>
            {/* Hero Section */}
            <div className="dash-hero">
                <div>
                    <h1 className="dash-title">Welcome back</h1>
                    <p className="dash-subtitle">
                        Here's an overview of your workspace. You have {stats.active} active project{stats.active !== 1 ? 's' : ''}.
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                {STAT_CONFIG.map(({ key, label, icon: Icon, colorVar }) => (
                    <div key={key} className="stat-card">
                        <div className="stat-card-header">
                            <span className="stat-label">{label}</span>
                            <Icon size={16} style={{ color: `var(${colorVar})`, opacity: 0.7 }} />
                        </div>
                        <div className="stat-value" style={{ color: `var(${colorVar})` }}>
                            {stats[key]}
                        </div>
                    </div>
                ))}
            </div>

            {/* Active Sprints — the sprint board & burndown chart live one level
                deeper (inside each project's Sprints tab), so surface a direct
                link to whatever's currently running right here. */}
            {activeSprints.length > 0 && (
                <>
                    <div className="section-header" style={{ marginTop: 'var(--space-10)' }}>
                        <h2>Active Sprints</h2>
                    </div>
                    <div className="item-grid">
                        {activeSprints.map(s => (
                            <div
                                key={s._id}
                                className="item-card"
                                onClick={() => navigate(`/projects/${s.project?._id}/sprints/${s._id}`)}
                                style={{ cursor: 'pointer' }}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="item-card-top">
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        <Rocket size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                                        {s.name}
                                    </h3>
                                    <ArrowUpRight size={14} className="item-card-arrow" />
                                </div>
                                <p className="item-card-desc">{s.goal || 'No sprint goal set'}</p>
                                <div className="item-card-footer">
                                    <Badge variant="active">{s.project?.name || 'Unknown project'}</Badge>
                                    <span className="item-card-owner" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                        <Calendar size={11} /> {fmtDate(s.startDate)} – {fmtDate(s.endDate)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Recent Projects */}
            <div className="section-header" style={{ marginTop: 'var(--space-10)' }}>
                <h2>Recent Projects</h2>
                {visibleProjects.length > 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>
                        View all <ArrowUpRight size={14} />
                    </button>
                )}
            </div>

            {visibleProjects.length === 0 ? (
                <EmptyState
                    icon={<FolderKanban size={40} strokeWidth={1.2} style={{ opacity: 0.4 }} />}
                    title="No projects yet"
                    description="Create your first project to get started."
                />
            ) : (
                <div className="item-grid">
                    {visibleProjects.slice(0, 6).map(p => (
                        <div
                            key={p._id}
                            className="item-card"
                            onClick={() => navigate(`/projects/${p._id}`)}
                            style={{ cursor: 'pointer' }}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="item-card-top">
                                <h3>{p.name}</h3>
                                <ArrowUpRight size={14} className="item-card-arrow" />
                            </div>
                            <p className="item-card-desc">{p.description || 'No description'}</p>
                            <div className="item-card-footer">
                                <Badge variant={p.status}>{p.status}</Badge>
                                <span className="item-card-owner">
                                    {p.owner?.name || 'Unknown'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
