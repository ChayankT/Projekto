import React from 'react';

/**
 * Skeleton — Loading placeholder with shimmer animation.
 *
 * @param {'text'|'heading'|'avatar'|'card'|'button'|'custom'} variant
 * @param {string|number} width   — CSS width
 * @param {string|number} height  — CSS height
 * @param {string}        borderRadius — CSS border-radius override
 * @param {number}        count   — render multiple skeleton lines (for text variant)
 *
 * Usage:
 *   <Skeleton variant="heading" />
 *   <Skeleton variant="text" count={3} />
 *   <Skeleton variant="avatar" width={48} height={48} />
 *   <Skeleton variant="card" height={160} />
 */
const Skeleton = ({
    variant = 'text',
    width,
    height,
    borderRadius,
    count = 1,
    className = '',
}) => {
    const style = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;
    if (borderRadius) style.borderRadius = borderRadius;

    const variantClass = variant !== 'custom' ? `skeleton-${variant}` : '';

    if (variant === 'text' && count > 1) {
        return (
            <div className={className}>
                {Array.from({ length: count }).map((_, i) => (
                    <div
                        key={i}
                        className={`skeleton skeleton-text`}
                        style={i === count - 1 ? { ...style, width: style.width || '60%' } : style}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className={`skeleton ${variantClass} ${className}`} style={style} />
    );
};

/**
 * SkeletonCard — Pre-composed card skeleton for common loading states.
 */
const SkeletonCard = ({ className = '' }) => (
    <div className={`card card-flat ${className}`} style={{ padding: 'var(--space-5)' }}>
        <Skeleton variant="heading" />
        <Skeleton variant="text" count={2} />
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            <Skeleton variant="button" />
            <Skeleton variant="avatar" width={24} height={24} />
        </div>
    </div>
);

Skeleton.Card = SkeletonCard;

export default Skeleton;
