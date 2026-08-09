import React from 'react';

/**
 * Badge — Status, priority, or label indicator.
 *
 * @param {'active'|'in_progress'|'completed'|'archived'|'backlog'|
 *          'low'|'medium'|'high'|
 *          'success'|'warning'|'error'|'info'} variant
 * @param {boolean} dot — show a colored dot indicator before text
 *
 * Usage:
 *   <Badge variant="active">Active</Badge>
 *   <Badge variant="high" dot>High Priority</Badge>
 */
const Badge = ({
    variant = 'active',
    dot = false,
    className = '',
    children,
    ...props
}) => {
    return (
        <span className={`badge badge-${variant} ${className}`} {...props}>
            {dot && <span className="badge-dot-indicator" />}
            {children}
        </span>
    );
};

export default Badge;
