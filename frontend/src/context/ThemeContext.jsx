import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * ThemeContext — Dark / Light mode provider.
 *
 * Priority order:
 *   1. localStorage("theme")    — user's manual choice
 *   2. prefers-color-scheme     — system preference
 *   3. "dark"                   — fallback default
 *
 * Sets `data-theme` on <html> and stores the choice in localStorage.
 * Adds a `.theme-transitioning` class during switch for animated CSS transitions.
 */

const ThemeContext = createContext(undefined);

const getInitialTheme = () => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(getInitialTheme);

    const applyTheme = useCallback((newTheme) => {
        const root = document.documentElement;

        // Enable CSS transition on all themed properties
        root.classList.add('theme-transitioning');

        // Apply the theme attribute
        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Remove transition class after the animation completes
        const timer = setTimeout(() => root.classList.remove('theme-transitioning'), 500);
        return () => clearTimeout(timer);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            return next;
        });
    }, [applyTheme]);

    // Apply saved theme on first mount (before paint)
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Listen for system preference changes (auto-switch when no manual override)
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => {
            if (!localStorage.getItem('theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                setTheme(newTheme);
                applyTheme(newTheme);
            }
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [applyTheme]);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: (t) => { setTheme(t); applyTheme(t); } }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
    return ctx;
};

export default ThemeContext;
