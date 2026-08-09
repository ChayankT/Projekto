import React from 'react';

/**
 * Dropdown — Design system select / dropdown.
 *
 * @param {string}  label       — field label
 * @param {boolean} required    — shows a red asterisk
 * @param {string}  error       — error message
 * @param {string}  placeholder — disabled first option text (e.g. "Select...")
 * @param {Array}   options     — [{ value, label }] or ['string', ...]
 *
 * Usage:
 *   <Dropdown
 *     label="Status"
 *     placeholder="Select status"
 *     options={[
 *       { value: 'active', label: 'Active' },
 *       { value: 'completed', label: 'Completed' },
 *     ]}
 *     value={status}
 *     onChange={e => setStatus(e.target.value)}
 *   />
 */
const Dropdown = ({
    label,
    required = false,
    error,
    placeholder,
    options = [],
    className = '',
    id,
    ...props
}) => {
    const inputId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    // Normalize options: support both { value, label } and plain strings
    const normalizedOptions = options.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

    return (
        <div className={`form-field ${className}`}>
            {label && (
                <label className="form-label" htmlFor={inputId}>
                    {label}
                    {required && <span className="required"> *</span>}
                </label>
            )}
            <select
                id={inputId}
                className={error ? 'error' : ''}
                aria-invalid={!!error}
                {...props}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {normalizedOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && (
                <span className="form-helper form-error" role="alert">{error}</span>
            )}
        </div>
    );
};

export default Dropdown;
