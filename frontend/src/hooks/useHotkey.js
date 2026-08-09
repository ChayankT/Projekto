import { useEffect } from 'react';

/**
 * useHotkey — binds a single-key keyboard shortcut for as long as the
 * calling component is mounted and `enabled` is true.
 *
 * Matching is against `event.key` case-sensitively, which is what lets one
 * hook cleanly tell 'n' apart from Shift+n ('N') — the browser already
 * folds Shift into `event.key` for both letters ('n' -> 'N') and symbol
 * keys ('/' -> '?'), so there's no separate shiftKey bookkeeping to get
 * wrong. Pass the exact character you want, e.g. 'n', 'N', or '?'.
 *
 * Keystrokes are ignored while the user is typing in an <input>,
 * <textarea>, <select>, or any contentEditable element, and can be
 * disabled entirely via `enabled: false` (e.g. while a dialog is open) so
 * shortcuts don't fire underneath an already-open modal.
 *
 * @param {string}   key      — the exact character to match (case-sensitive)
 * @param {function} handler  — called with the KeyboardEvent on match
 * @param {object}   [options]
 * @param {boolean}  [options.enabled] — set false to temporarily disable
 */
export default function useHotkey(key, handler, { enabled = true } = {}) {
    useEffect(() => {
        if (!enabled) return;

        const isTypingTarget = (target) => {
            if (!target) return false;
            const tag = target.tagName;
            return (
                tag === 'INPUT' ||
                tag === 'TEXTAREA' ||
                tag === 'SELECT' ||
                target.isContentEditable
            );
        };

        const onKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser/OS combos alone
            if (e.key !== key) return;
            if (isTypingTarget(e.target)) return;

            e.preventDefault();
            handler(e);
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [key, handler, enabled]);
}
