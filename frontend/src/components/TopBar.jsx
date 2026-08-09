import React from 'react';
import { useLocation } from 'react-router-dom';
import ThemeToggle from './ui/ThemeToggle';
import { UserSwitcher } from './ui';
import { Search, ChevronRight, Keyboard } from 'lucide-react';

const titles = {
    '/': 'Dashboard',
    '/my-work': 'My Work',
    '/projects': 'Projects',
    '/calendar': 'Calendar',
    '/notifications': 'Notifications',
    '/team': 'Team',
    '/archive': 'Archive',
};

const TopBar = () => {
    const location = useLocation();
    const path = '/' + location.pathname.split('/')[1];
    const title = titles[path] || 'Agile PM';

    return (
        <header className="topbar">
            {/* Left: breadcrumb-style title */}
            <div className="topbar-left">
                <span className="topbar-breadcrumb-root">Projekto</span>
                <ChevronRight size={13} className="topbar-breadcrumb-sep" />
                <span className="topbar-title">{title}</span>
            </div>

            {/* Right: controls */}
            <div className="topbar-right">
                {/* Quick search trigger */}
                <button
                    className="topbar-search-trigger"
                    onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                    title="Search (Ctrl+K)"
                >
                    <Search size={14} />
                    <span>Search…</span>
                    <kbd>⌘K</kbd>
                </button>

                {/* Keyboard shortcuts help trigger */}
                <button
                    className="topbar-icon-btn"
                    onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true }))}
                    title="Keyboard shortcuts (?)"
                >
                    <Keyboard size={16} />
                </button>

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* User switcher (avatar + dropdown, combined) */}
                <UserSwitcher />
            </div>
        </header>
    );
};

export default TopBar;
