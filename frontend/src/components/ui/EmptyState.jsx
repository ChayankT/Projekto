import React from 'react';

/**
 * EmptyState — Placeholder for empty data views.
 *
 * @param {React.ReactNode} icon        — emoji or icon component
 * @param {string}          title       — bold heading
 * @param {string}          description — muted explanatory text
 * @param {React.ReactNode} action      — CTA button/link
 *
 * Usage:
 *   <EmptyState
 *     icon="📁"
 *     title="No projects yet"
 *     description="Create your first project to get started."
 *     action={<Button onClick={openCreate}>New Project</Button>}
 *   />
 */
const EmptyState = ({
    icon,
    title,
    description,
    action,
    className = '',
}) => {
    return (
        <div className={`empty-state ${className}`}>
            {icon && (
                <div className="empty-state-icon">
                    {icon}
                </div>
            )}
            {title && (
                <h3 className="empty-state-title">{title}</h3>
            )}
            {description && (
                <p className="empty-state-description">{description}</p>
            )}
            {action && (
                <div className="empty-state-action">{action}</div>
            )}
        </div>
    );
};

export default EmptyState;
