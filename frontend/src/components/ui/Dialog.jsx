import React, { useEffect, useCallback } from 'react';

/**
 * Dialog — Modal dialog with glassmorphic styling.
 *
 * Drop-in replacement for the existing Modal component with proper
 * CSS class usage (.dialog-overlay, .dialog, .dialog-header, etc.).
 *
 * @param {boolean}  open     — controls visibility
 * @param {string}   title    — dialog heading
 * @param {function} onClose  — called when overlay or close button is clicked
 * @param {React.ReactNode} children — dialog body content
 * @param {React.ReactNode} footer   — footer actions (e.g. Cancel / Submit)
 * @param {'sm'|'md'|'lg'|'xl'} size — max-width variant
 */
const Dialog = ({
    open,
    title,
    onClose,
    children,
    footer,
    size = 'md',
}) => {
    // Close on Escape key
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') onClose?.();
    }, [onClose]);

    useEffect(() => {
        if (!open) return;
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [open, handleKeyDown]);

    if (!open) return null;

    const sizeClass = size !== 'md' ? `dialog-${size}` : '';

    return (
        <div
            className="dialog-overlay"
            onClick={e => e.target === e.currentTarget && onClose?.()}
        >
            <div className={`dialog ${sizeClass}`} role="dialog" aria-modal="true">
                <div className="dialog-header">
                    <h3>{title}</h3>
                    <button
                        onClick={onClose}
                        className="dialog-close"
                        aria-label="Close dialog"
                    >
                        ×
                    </button>
                </div>
                <div className="dialog-body">
                    {children}
                </div>
                {footer && (
                    <div className="dialog-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dialog;
