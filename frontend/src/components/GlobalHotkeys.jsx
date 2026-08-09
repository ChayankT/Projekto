import useGoToHotkeys from '../hooks/useGoToHotkeys';

/**
 * GlobalHotkeys — mounts app-wide keyboard navigation that needs router
 * access (the "g then <letter>" go-to shortcuts). Renders nothing; it's a
 * behavior-only component, mounted once near the root alongside
 * CommandPalette and ShortcutsHelp.
 */
const GlobalHotkeys = () => {
    useGoToHotkeys();
    return null;
};

export default GlobalHotkeys;
