import React from 'react';

/**
 * Input — Design system text input with label, error, and helper text.
 *
 * @param {string}  label      — field label
 * @param {boolean} required   — shows a red asterisk
 * @param {string}  error      — error message (turns border red)
 * @param {string}  helperText — subtle hint below the input
 * @param {string}  type       — input type (text, email, password, date, etc.)
 */
const Input = ({
    label,
    required = false,
    error,
    helperText,
    className = '',
    id,
    ...props
}) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
        <div className={`form-field ${className}`}>
            {label && (
                <label className="form-label" htmlFor={inputId}>
                    {label}
                    {required && <span className="required"> *</span>}
                </label>
            )}
            <input
                id={inputId}
                className={error ? 'error' : ''}
                aria-invalid={!!error}
                aria-describedby={error ? `${inputId}-error` : undefined}
                {...props}
            />
            {error && (
                <span className="form-helper form-error" id={`${inputId}-error`} role="alert">
                    {error}
                </span>
            )}
            {!error && helperText && (
                <span className="form-helper">{helperText}</span>
            )}
        </div>
    );
};

/**
 * TextArea — Design system textarea with label, error, and helper text.
 */
const TextArea = ({
    label,
    required = false,
    error,
    helperText,
    className = '',
    rows = 3,
    id,
    ...props
}) => {
    const inputId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
        <div className={`form-field ${className}`}>
            {label && (
                <label className="form-label" htmlFor={inputId}>
                    {label}
                    {required && <span className="required"> *</span>}
                </label>
            )}
            <textarea
                id={inputId}
                className={error ? 'error' : ''}
                rows={rows}
                aria-invalid={!!error}
                {...props}
            />
            {error && (
                <span className="form-helper form-error" role="alert">{error}</span>
            )}
            {!error && helperText && (
                <span className="form-helper">{helperText}</span>
            )}
        </div>
    );
};

export { TextArea };
export default Input;
