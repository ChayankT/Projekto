import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

/**
 * ThemeToggle — Animated sun/moon icon button.
 * Place in the TopBar or anywhere a toggle is needed.
 */
const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <span className={`theme-toggle-icon ${isDark ? 'active' : ''}`}>
                <Moon size={18} />
            </span>
            <span className={`theme-toggle-icon ${!isDark ? 'active' : ''}`}>
                <Sun size={18} />
            </span>
        </button>
    );
};

export default ThemeToggle;
