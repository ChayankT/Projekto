import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllTasks, getProjects } from '../api/client';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useDataSync } from '../context/DataSyncContext';
import { Badge, Skeleton, EmptyState, Dropdown } from '../components/ui';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Tasks (the only items shown on the calendar) don't carry a priority field —
// only stories do — so dots are colored by status instead of a priority that
// never actually varies here.
const STATUS_DOT_COLORS = { active: 'var(--accent-primary)', in_progress: 'var(--color-warning)', completed: 'var(--color-success)' };

const CalendarPage = () => {
    const navigate = useNavigate();
    const { users } = useApp();
    const { addToast } = useToast();
    const { taskVersion } = useDataSync();

    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filterProject, setFilterProject] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');

    // ── Fetch data ─────────────────────────────
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tRes, pRes] = await Promise.all([getAllTasks(), getProjects()]);
                setTasks(tRes.data || []);
                setProjects(pRes.data || []);
            } catch { addToast('Failed to load calendar data', 'error'); }
            finally { setLoading(false); }
        };
        fetchData();
        // Re-fetch whenever a task changes elsewhere (create/edit/assign/
        // complete/archive/restore) so due dates on the calendar stay current.
    }, [taskVersion]);

    // ── Calendar grid computation ──────────────
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const days = [];

        // Previous month trailing days
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ day: daysInPrevMonth - i, inMonth: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            days.push({ day: d, inMonth: true, date: new Date(year, month, d) });
        }

        // Next month leading days to fill a complete grid
        const remaining = 42 - days.length; // 6 rows × 7 cols
        for (let d = 1; d <= remaining; d++) {
            days.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) });
        }

        return days;
    }, [year, month]);

    // ── Filter tasks ───────────────────────────
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (!t.dueDate) return false;
            if (filterProject && t.story?.project !== filterProject && t.story?.project?._id !== filterProject) return false;
            if (filterAssignee && t.assignee?._id !== filterAssignee) return false;
            return true;
        });
    }, [tasks, filterProject, filterAssignee]);

    // ── Map tasks to dates ─────────────────────
    const tasksByDate = useMemo(() => {
        const map = {};
        filteredTasks.forEach(t => {
            const d = new Date(t.dueDate);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!map[key]) map[key] = [];
            map[key].push(t);
        });
        return map;
    }, [filteredTasks]);

    const getTasksForDay = (date) => {
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        return tasksByDate[key] || [];
    };

    // ── Navigation ─────────────────────────────
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToday = () => setCurrentDate(new Date());

    const today = new Date();
    const isToday = (date) =>
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

    const isOverdue = (dueDate, status) => {
        if (status === 'completed') return false;
        return new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
    };

    if (loading) return (
        <div>
            <div className="section-header">
                <Skeleton variant="heading" width="200px" />
            </div>
            <Skeleton variant="card" height={600} />
        </div>
    );

    return (
        <div style={{ animation: 'fade-in-up 0.35s ease forwards' }}>
            {/* Header */}
            <div className="section-header" style={{ marginBottom: 'var(--space-6)' }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <CalIcon size={20} /> Calendar
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                        {filteredTasks.length} tasks with due dates
                    </p>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
                    <div style={{ minWidth: 160 }}>
                        <Dropdown
                            label="Project"
                            value={filterProject}
                            onChange={e => setFilterProject(e.target.value)}
                            placeholder="All Projects"
                            options={projects.map(p => ({ value: p._id, label: p.name }))}
                        />
                    </div>
                    <div style={{ minWidth: 160 }}>
                        <Dropdown
                            label="Assignee"
                            value={filterAssignee}
                            onChange={e => setFilterAssignee(e.target.value)}
                            placeholder="All Members"
                            options={users.map(u => ({ value: u._id, label: u.name }))}
                        />
                    </div>
                </div>
            </div>

            {/* Month Navigation */}
            <div className="cal-nav">
                <div className="cal-nav-left">
                    <button className="btn btn-ghost btn-sm" onClick={prevMonth}><ChevronLeft size={18} /></button>
                    <h3 className="cal-month-title">{MONTHS[month]} {year}</h3>
                    <button className="btn btn-ghost btn-sm" onClick={nextMonth}><ChevronRight size={18} /></button>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={goToday}>Today</button>
            </div>

            {/* Calendar Grid */}
            <div className="cal-grid">
                {/* Day headers */}
                {DAYS.map(d => (
                    <div key={d} className="cal-day-header">{d}</div>
                ))}

                {/* Day cells */}
                {calendarDays.map((cell, idx) => {
                    const dayTasks = getTasksForDay(cell.date);
                    const todayClass = isToday(cell.date) ? 'cal-today' : '';
                    const outClass = !cell.inMonth ? 'cal-out' : '';

                    return (
                        <div key={idx} className={`cal-cell ${todayClass} ${outClass}`}>
                            <div className="cal-cell-header">
                                <span className={`cal-day-num ${todayClass}`}>{cell.day}</span>
                                {dayTasks.length > 0 && (
                                    <span className="cal-task-count">{dayTasks.length}</span>
                                )}
                            </div>
                            <div className="cal-cell-body">
                                {dayTasks.slice(0, 3).map(task => (
                                    <div
                                        key={task._id}
                                        className={`cal-task ${isOverdue(task.dueDate, task.status) ? 'cal-task-overdue' : ''}`}
                                        onClick={() => task.story?._id && navigate(`/stories/${task.story._id}`)}
                                        title={`${task.title}\n${task.assignee?.name || 'Unassigned'} • ${task.status}`}
                                    >
                                        <span
                                            className="cal-task-dot"
                                            style={{ background: STATUS_DOT_COLORS[task.status] || STATUS_DOT_COLORS.active }}
                                        />
                                        <span className="cal-task-label">{task.title}</span>
                                    </div>
                                ))}
                                {dayTasks.length > 3 && (
                                    <span className="cal-more">+{dayTasks.length - 3} more</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="cal-legend">
                <span className="cal-legend-item"><span className="cal-task-dot" style={{ background: STATUS_DOT_COLORS.active }} /> Active</span>
                <span className="cal-legend-item"><span className="cal-task-dot" style={{ background: STATUS_DOT_COLORS.in_progress }} /> In Progress</span>
                <span className="cal-legend-item"><span className="cal-task-dot" style={{ background: STATUS_DOT_COLORS.completed }} /> Completed</span>
                <span className="cal-legend-item"><span className="cal-task-dot cal-task-overdue-dot" /> Overdue</span>
            </div>
        </div>
    );
};

export default CalendarPage;
