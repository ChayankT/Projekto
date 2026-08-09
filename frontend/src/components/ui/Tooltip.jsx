import React from 'react';

/**
 * Tooltip — Hover tooltip using pure CSS.
 *
 * @param {string} text                        — tooltip content
 * @param {'top'|'bottom'|'left'|'right'} position — placement relative to trigger
 *
 * Usage:
 *   <Tooltip text="Edit this item" position="top">
 *     <button><Edit2 size={14} /></button>
 *   </Tooltip>
 */
const Tooltip = ({
    text,
    position = 'top',
    children,
    className = '',
}) => {
    if (!text) return children;

    return (
        <span className={`tooltip-wrapper ${className}`}>
            {children}
            <span className={`tooltip tooltip-${position}`} role="tooltip">
                {text}
            </span>
        </span>
    );
};

export default Tooltip;
