import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronDown, Check } from 'lucide-react';

/**
 * UserSwitcher — Combined avatar + "viewing as" control for the TopBar.
 *
 * Replaces a plain <select> and a separate identity pill with a single
 * glassmorphic dropdown: click the avatar/name to open a menu of every
 * user, current selection is checked, click outside or Escape to close.
 */
const UserSwitcher = () => {
    const { users, activeUserId, setActiveUserId } = useApp();
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    const activeUser = users.find(u => u._id === activeUserId);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    if (!activeUser) return null;

    return (
        <div className="user-switcher" ref={rootRef}>
            <button
                type="button"
                className="user-switcher-trigger"
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <div className="avatar-md">{activeUser.name.charAt(0).toUpperCase()}</div>
                <div className="user-switcher-info">
                    <span className="user-switcher-role">Viewing as</span>
                    <span className="user-switcher-name">{activeUser.name}</span>
                </div>
                <ChevronDown size={14} className={`user-switcher-chevron ${open ? 'open' : ''}`} />
            </button>

            {open && (
                <div className="user-switcher-menu" role="listbox">
                    <div className="user-switcher-menu-label">Switch user</div>
                    {users.map(u => {
                        const isActive = u._id === activeUserId;
                        return (
                            <button
                                key={u._id}
                                type="button"
                                className={`user-switcher-option ${isActive ? 'active' : ''}`}
                                role="option"
                                aria-selected={isActive}
                                onClick={() => { setActiveUserId(u._id); setOpen(false); }}
                            >
                                <div className="avatar-sm">{u.name.charAt(0).toUpperCase()}</div>
                                <div className="user-switcher-option-info">
                                    <span>{u.name}</span>
                                    <small>{u.email}</small>
                                </div>
                                {isActive && <Check size={14} className="user-switcher-check" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default UserSwitcher;
