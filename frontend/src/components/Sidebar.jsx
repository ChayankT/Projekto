import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getUnreadCount } from '../api/client';
import {
    LayoutDashboard, FolderKanban, CalendarDays,
    Bell, Users, Archive, Command, ListChecks,
    ChevronLeft, ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/my-work', icon: ListChecks, label: 'My Work' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
    { to: '/team', icon: Users, label: 'Team' },
];

const SECONDARY_ITEMS = [
    { to: '/notifications', icon: Bell, label: 'Notifications', hasBadge: true },
    { to: '/archive', icon: Archive, label: 'Archive' },
];

const Sidebar = () => {
    const { activeUserId } = useApp();
    const [unreadCount, setUnreadCount] = useState(0);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');

    useEffect(() => {
        if (!activeUserId) return;
        const fetch = async () => {
            try {
                const res = await getUnreadCount(activeUserId);
                setUnreadCount(res.data.count);
            } catch { }
        };
        fetch();
        const interval = setInterval(fetch, 30000);
        return () => clearInterval(interval);
    }, [activeUserId]);

    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', String(collapsed));
    }, [collapsed]);

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            {/* Collapse / Expand toggle */}
            <div className="sidebar-toggle-row">
                <button
                    className="sidebar-collapse-btn"
                    onClick={() => setCollapsed(c => !c)}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                </button>
            </div>

            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-mark">A</div>
                <div className="sidebar-logo-text">
                    <h2>Projekto</h2>
                    <span>Workspace</span>
                </div>
            </div>

            {/* Command Palette Trigger */}
            <button
                className="sidebar-search"
                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                title="Search (Ctrl+K)"
            >
                <Command size={14} />
                <span>Search…</span>
                <kbd>⌘K</kbd>
            </button>

            {/* Primary Nav */}
            <nav className="sidebar-nav">
                <div className="sidebar-section-label">Navigation</div>
                {NAV_ITEMS.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={16} strokeWidth={1.75} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Divider */}
            <div className="sidebar-divider" />

            {/* Secondary Nav */}
            <nav className="sidebar-nav">
                <div className="sidebar-section-label">Management</div>
                {SECONDARY_ITEMS.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={16} strokeWidth={1.75} />
                        <span>{item.label}</span>
                        {item.hasBadge && unreadCount > 0 && (
                            <span className="badge-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Footer */}
            <div className="sidebar-footer">
                <div className="sidebar-footer-meta">
                    <span>Projekto v1.0</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
