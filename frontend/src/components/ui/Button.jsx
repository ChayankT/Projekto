import React from 'react';

/**
 * Button — Design system button component.
 *
 * @param {'primary'|'secondary'|'danger'|'success'|'ghost'} variant
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} loading    — shows a spinner and disables the button
 * @param {boolean} iconOnly   — renders as a square icon button
 * @param {React.ReactNode} leftIcon
 * @param {React.ReactNode} rightIcon
 */
const Button = ({
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    iconOnly = false,
    leftIcon,
    rightIcon,
    children,
    className = '',
    ...props
}) => {
    const classes = [
        'btn',
        `btn-${variant}`,
        size !== 'md' && `btn-${size}`,
        iconOnly && 'btn-icon',
        className,
    ].filter(Boolean).join(' ');

    return (
        <button
            className={classes}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className={`spinner ${size === 'sm' ? 'spinner-sm' : ''}`} />
            ) : (
                <>
                    {leftIcon && <span className="btn-icon-slot">{leftIcon}</span>}
                    {children}
                    {rightIcon && <span className="btn-icon-slot">{rightIcon}</span>}
                </>
            )}
        </button>
    );
};

export default Button;
