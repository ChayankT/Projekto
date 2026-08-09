import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * useGoToHotkeys — Gmail/Linear-style "g then <letter>" navigation, active
 * app-wide (mounted once near the root, alongside CommandPalette and
 * ShortcutsHelp).
 *
 * Pressing "g" arms a 800ms window; the next keystroke in GO_TO_MAP
 * navigates to the matching route. Any other key, or letting the window
 * lapse, cancels the sequence with no side effect.
 *
 * Ignored the same way useHotkey ignores single keys: while the target is
 * a text input/textarea/select/contenteditable, while a modifier key
 * (Ctrl/Cmd/Alt) is held, or while a dialog/palette is open (both set
 * document.body.style.overflow = 'hidden' while open, which doubles here
 * as a simple "is something modal open" signal without needing a new
 * global context).
 */
const GO_TO_MAP = {
    d: '/',
    m: '/my-work',
    p: '/projects',
    c: '/calendar',
    t: '/team',
    n: '/notifications',
    a: '/archive',
};

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

export default function useGoToHotkeys() {
    const navigate = useNavigate();
    const armed = useRef(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        const disarm = () => {
            armed.current = false;
            clearTimeout(timeoutRef.current);
        };

        const onKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (isTypingTarget(e.target)) return;
            // A dialog/palette is open — don't arm or continue a sequence
            // underneath it.
            if (document.body.style.overflow === 'hidden') { disarm(); return; }

            if (armed.current) {
                const path = GO_TO_MAP[e.key.toLowerCase()];
                disarm();
                if (path) {
                    e.preventDefault();
                    navigate(path);
                }
                return;
            }

            if (e.key === 'g' || e.key === 'G') {
                armed.current = true;
                timeoutRef.current = setTimeout(disarm, 800);
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            clearTimeout(timeoutRef.current);
        };
    }, [navigate]);
}
