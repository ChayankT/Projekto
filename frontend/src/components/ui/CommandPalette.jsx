import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, getAllStories, getAllTasks } from '../../api/client';
import {
    Search, Home, FolderKanban, Bell, Users, Plus,
    FileText, CheckSquare, ArrowRight, Command, Layers, CalendarDays, Archive
} from 'lucide-react';

/* ═══════════════════════════════════════════
   Fuzzy Search
   ═══════════════════════════════════════════ */

/**
 * Simple but effective fuzzy match scoring.
 *
 * Returns { match: true, score } or { match: false }.
 * Higher score = better match.
 *
 * Scoring rules:
 *   +10 per matched character
 *   +15 bonus for consecutive matches
 *   +20 bonus for match at start of word
 *   +30 bonus for match at position 0
 *   -1  penalty per gap between matches
 */
function fuzzyMatch(query, text) {
    if (!query) return { match: true, score: 0 };

    const q = query.toLowerCase();
    const t = text.toLowerCase();

    // Direct substring match gets a high base score
    if (t.includes(q)) {
        const idx = t.indexOf(q);
        return { match: true, score: 1000 - idx + q.length * 10 };
    }

    let qi = 0;
    let score = 0;
    let lastMatchIdx = -2;
    let firstMatch = -1;

    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) {
            score += 10;

            // Consecutive match bonus
            if (ti === lastMatchIdx + 1) score += 15;

            // Word-start bonus
            if (ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '_' || t[ti - 1] === '-') score += 20;

            // First position bonus
            if (ti === 0 && qi === 0) score += 30;

            // Gap penalty
            if (lastMatchIdx >= 0 && ti > lastMatchIdx + 1) score -= (ti - lastMatchIdx - 1);

            if (firstMatch < 0) firstMatch = ti;
            lastMatchIdx = ti;
            qi++;
        }
    }

    if (qi !== q.length) return { match: false, score: 0 };
    return { match: true, score };
}


/* ═══════════════════════════════════════════
   Command Palette Component
   ═══════════════════════════════════════════ */

const CommandPalette = () => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [projects, setProjects] = useState([]);
    const [stories, setStories] = useState([]);
    const [tasks, setTasks] = useState([]);

    const inputRef = useRef(null);
    const listRef = useRef(null);

    // ── Ctrl+K listener ───────────────────────
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(prev => !prev);
            }
            if (e.key === 'Escape' && open) {
                e.preventDefault();
                setOpen(false);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open]);

    // ── Focus input and fetch data when opened ─
    useEffect(() => {
        if (open) {
            setQuery('');
            setActiveIndex(0);
            // Focus after the opening animation frame
            requestAnimationFrame(() => inputRef.current?.focus());
            // Refetch every time the palette opens rather than once per page
            // load — projects/stories/tasks created elsewhere in the session
            // would otherwise never show up in search until a full reload.
            fetchData();
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchData = async () => {
        try {
            const [pRes, sRes, tRes] = await Promise.all([
                getProjects(),
                getAllStories(),
                getAllTasks(),
            ]);
            setProjects(pRes.data || []);
            setStories(sRes.data || []);
            setTasks(tRes.data || []);
        } catch (e) {
            console.error('[CommandPalette] Failed to fetch data:', e);
        }
    };

    // ── Build the command list ─────────────────
    const allItems = useMemo(() => {
        const items = [];

        // Navigation
        items.push(
            { id: 'nav-dashboard', type: 'navigate', icon: Home, label: 'Go to Dashboard', path: '/', group: 'Navigate' },
            { id: 'nav-projects', type: 'navigate', icon: FolderKanban, label: 'Go to Projects', path: '/projects', group: 'Navigate' },
            { id: 'nav-calendar', type: 'navigate', icon: CalendarDays, label: 'Go to Calendar', path: '/calendar', group: 'Navigate' },
            { id: 'nav-notifications', type: 'navigate', icon: Bell, label: 'Go to Notifications', path: '/notifications', group: 'Navigate' },
            { id: 'nav-team', type: 'navigate', icon: Users, label: 'Go to Team', path: '/team', group: 'Navigate' },
            { id: 'nav-archive', type: 'navigate', icon: Archive, label: 'Go to Archive', path: '/archive', group: 'Navigate' },
        );

        // Create actions.
        // Only "Create New Project" is listed here: it's the only creation
        // flow with a single global destination. Stories and tasks only make
        // sense in the context of a specific project/story, so a "Create New
        // Story"/"Create New Task" entry can't deep-link anywhere meaningful
        // without first asking which project/story it belongs to — that's
        // tracked as a follow-up in docs/FUTURE_IMPROVEMENTS.md instead of
        // shipping a quick action that silently does nothing.
        items.push(
            { id: 'create-project', type: 'create', icon: Plus, label: 'Create New Project', path: '/projects?new=project', group: 'Create' },
        );

        // Projects
        projects.forEach(p => {
            items.push({
                id: `project-${p._id}`,
                type: 'project',
                icon: FolderKanban,
                label: p.name,
                sublabel: p.status,
                path: `/projects/${p._id}`,
                group: 'Projects',
            });
        });

        // Stories
        stories.forEach(s => {
            items.push({
                id: `story-${s._id}`,
                type: 'story',
                icon: Layers,
                label: s.title,
                sublabel: s.project?.name || 'Story',
                path: `/stories/${s._id}`,
                group: 'Stories',
            });
        });

        // Tasks
        tasks.forEach(t => {
            items.push({
                id: `task-${t._id}`,
                type: 'task',
                icon: CheckSquare,
                label: t.title,
                sublabel: t.story?.title || 'Task',
                path: null, // tasks don't have their own page
                storyId: t.story?._id,
                group: 'Tasks',
            });
        });

        return items;
    }, [projects, stories, tasks]);

    // ── Fuzzy-filtered results ─────────────────
    const filtered = useMemo(() => {
        if (!query.trim()) {
            // Show navigation + create actions when query is empty
            return allItems.filter(i => i.type === 'navigate' || i.type === 'create');
        }

        return allItems
            .map(item => {
                const result = fuzzyMatch(query, item.label);
                const sublabelResult = item.sublabel ? fuzzyMatch(query, item.sublabel) : { match: false, score: 0 };
                const bestScore = Math.max(result.score, sublabelResult.score * 0.7);
                return { ...item, _match: result.match || sublabelResult.match, _score: bestScore };
            })
            .filter(item => item._match)
            .sort((a, b) => b._score - a._score)
            .slice(0, 20);
    }, [query, allItems]);

    // ── Group results ──────────────────────────
    const grouped = useMemo(() => {
        const groups = {};
        filtered.forEach(item => {
            const g = item.group || 'Results';
            if (!groups[g]) groups[g] = [];
            groups[g].push(item);
        });
        return groups;
    }, [filtered]);

    // ── Flatten for keyboard navigation ────────
    const flatItems = useMemo(() => {
        const flat = [];
        Object.values(grouped).forEach(groupItems => flat.push(...groupItems));
        return flat;
    }, [grouped]);

    // ── Reset active index when results change ─
    useEffect(() => { setActiveIndex(0); }, [query]);

    // ── Keyboard navigation ────────────────────
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => Math.min(prev + 1, flatItems.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && flatItems[activeIndex]) {
            e.preventDefault();
            executeItem(flatItems[activeIndex]);
        }
    }, [flatItems, activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Scroll active item into view ───────────
    useEffect(() => {
        const el = listRef.current?.querySelector('.cmd-item.active');
        el?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    // ── Execute an item ────────────────────────
    const executeItem = (item) => {
        setOpen(false);

        if (item.type === 'task' && item.storyId) {
            navigate(`/stories/${item.storyId}`);
        } else if (item.path) {
            navigate(item.path);
        }
    };

    // ── Highlight matched characters ───────────
    const highlightMatch = (text) => {
        if (!query.trim()) return text;

        const q = query.toLowerCase();
        const t = text.toLowerCase();
        const idx = t.indexOf(q);

        if (idx >= 0) {
            return (
                <>
                    {text.slice(0, idx)}
                    <mark className="cmd-highlight">{text.slice(idx, idx + q.length)}</mark>
                    {text.slice(idx + q.length)}
                </>
            );
        }

        // Character-by-character highlight for fuzzy matches
        let qi = 0;
        const parts = [];
        for (let i = 0; i < text.length; i++) {
            if (qi < q.length && t[i] === q[qi]) {
                parts.push(<mark key={i} className="cmd-highlight">{text[i]}</mark>);
                qi++;
            } else {
                parts.push(text[i]);
            }
        }
        return <>{parts}</>;
    };

    if (!open) return null;

    let itemIndex = -1;

    return (
        <div
            className="cmd-overlay"
            onClick={e => e.target === e.currentTarget && setOpen(false)}
        >
            <div className="cmd-palette" role="dialog" aria-label="Command palette">
                {/* Search Input */}
                <div className="cmd-input-wrapper">
                    <Search size={18} className="cmd-input-icon" />
                    <input
                        ref={inputRef}
                        className="cmd-input"
                        placeholder="Type a command or search..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        spellCheck={false}
                        autoComplete="off"
                    />
                    <kbd className="cmd-kbd">ESC</kbd>
                </div>

                {/* Results */}
                <div className="cmd-results" ref={listRef}>
                    {flatItems.length === 0 ? (
                        <div className="cmd-empty">
                            <FileText size={32} style={{ opacity: 0.3 }} />
                            <span>No results for "{query}"</span>
                        </div>
                    ) : (
                        Object.entries(grouped).map(([groupName, groupItems]) => (
                            <div key={groupName} className="cmd-group">
                                <div className="cmd-group-label">{groupName}</div>
                                {groupItems.map(item => {
                                    itemIndex++;
                                    const isActive = itemIndex === activeIndex;
                                    const Icon = item.icon;
                                    const currentIndex = itemIndex;

                                    return (
                                        <div
                                            key={item.id}
                                            className={`cmd-item ${isActive ? 'active' : ''}`}
                                            onClick={() => executeItem(item)}
                                            onMouseEnter={() => setActiveIndex(currentIndex)}
                                        >
                                            <div className="cmd-item-left">
                                                <Icon size={16} className="cmd-item-icon" />
                                                <span className="cmd-item-label">{highlightMatch(item.label)}</span>
                                                {item.sublabel && (
                                                    <span className="cmd-item-sublabel">{item.sublabel}</span>
                                                )}
                                            </div>
                                            <ArrowRight size={14} className="cmd-item-arrow" />
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="cmd-footer">
                    <div className="cmd-footer-hint">
                        <kbd>↑</kbd><kbd>↓</kbd> navigate
                    </div>
                    <div className="cmd-footer-hint">
                        <kbd>↵</kbd> select
                    </div>
                    <div className="cmd-footer-hint">
                        <kbd>esc</kbd> close
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
