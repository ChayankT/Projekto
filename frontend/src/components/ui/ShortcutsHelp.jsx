import React, { useState, useCallback } from 'react';
import Dialog from './Dialog';
import useHotkey from '../../hooks/useHotkey';

const SHORTCUTS = [
    { keys: ['Ctrl', 'K'], mac: ['⌘', 'K'], label: 'Open the command palette' },
    { keys: ['N'], label: 'New task (on a story page)' },
    { keys: ['Shift', 'N'], label: 'New user story (on a project page)' },
    { keys: ['/'], label: 'Jump to backlog search (on a project page)' },
    { keys: ['G', 'D'], sequence: true, label: 'Go to Dashboard' },
    { keys: ['G', 'M'], sequence: true, label: 'Go to My Work' },
    { keys: ['G', 'P'], sequence: true, label: 'Go to Projects' },
    { keys: ['G', 'C'], sequence: true, label: 'Go to Calendar' },
    { keys: ['G', 'T'], sequence: true, label: 'Go to Team' },
    { keys: ['G', 'N'], sequence: true, label: 'Go to Notifications' },
    { keys: ['G', 'A'], sequence: true, label: 'Go to Archive' },
    { keys: ['Esc'], label: 'Close the open dialog or palette' },
    { keys: ['?'], label: 'Show this shortcuts list' },
];

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform || navigator.userAgent);

/**
 * ShortcutsHelp — app-wide '?' overlay listing every keyboard shortcut.
 * Rendered once near the root (alongside CommandPalette) so it's reachable
 * from any page.
 */
const ShortcutsHelp = () => {
    const [open, setOpen] = useState(false);

    useHotkey('?', useCallback(() => setOpen(prev => !prev), []));

    return (
        <Dialog open={open} title="Keyboard Shortcuts" onClose={() => setOpen(false)} size="sm">
            <div className="shortcuts-help-list">
                {SHORTCUTS.map((s, i) => {
                    const keys = isMac && s.mac ? s.mac : s.keys;
                    return (
                        <div className="shortcuts-help-row" key={i}>
                            <span className="shortcuts-help-label">{s.label}</span>
                            <span className="shortcuts-help-keys">
                                {keys.map((k, j) => (
                                    <React.Fragment key={j}>
                                        {j > 0 && (
                                            <span className="shortcuts-help-then">
                                                {s.sequence ? 'then' : '+'}
                                            </span>
                                        )}
                                        <kbd className="cmd-kbd">{k}</kbd>
                                    </React.Fragment>
                                ))}
                            </span>
                        </div>
                    );
                })}
            </div>
        </Dialog>
    );
};

export default ShortcutsHelp;
