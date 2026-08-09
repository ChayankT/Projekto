import React from 'react';

/**
 * Card — Glassmorphic card container.
 *
 * @param {boolean} flat       — removes shadow and glass effect
 * @param {boolean} hoverable  — enables lift-on-hover (default: true)
 * @param {boolean} interactive — adds pointer cursor
 * @param {function} onClick
 */
const Card = ({
    flat = false,
    hoverable = true,
    interactive = false,
    className = '',
    children,
    ...props
}) => {
    const classes = [
        'card',
        flat && 'card-flat',
        interactive && 'card-interactive',
        !hoverable && 'card-flat', // reuse flat style to disable hover
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classes} {...props}>
            {children}
        </div>
    );
};

/** Card sub-components for structured content */
const CardTitle = ({ children, className = '' }) => (
    <h3 className={`card-title ${className}`}>{children}</h3>
);

const CardDescription = ({ children, className = '' }) => (
    <p className={`card-desc ${className}`}>{children}</p>
);

Card.Title = CardTitle;
Card.Description = CardDescription;

export default Card;
