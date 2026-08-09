import React from 'react';

/**
 * Table — Design system data table.
 *
 * @param {Array} columns — [{ key, label, render?, align? }]
 *   - key:    field name on the data object
 *   - label:  column header text
 *   - render: optional (row) => ReactNode for custom cell content
 *   - align:  'left' | 'center' | 'right'
 *
 * @param {Array}    data       — array of row objects
 * @param {function} onRowClick — optional click handler, receives (row)
 * @param {string}   rowKey     — field to use as React key (default: '_id')
 * @param {string}   emptyText  — text shown when data is empty
 *
 * Usage:
 *   <Table
 *     columns={[
 *       { key: 'name', label: 'Name' },
 *       { key: 'email', label: 'Email' },
 *       { key: 'role', label: 'Role', render: row => <Badge variant={row.role}>{row.role}</Badge> },
 *     ]}
 *     data={users}
 *     onRowClick={user => navigate(`/users/${user._id}`)}
 *   />
 */
const Table = ({
    columns = [],
    data = [],
    onRowClick,
    rowKey = '_id',
    emptyText = 'No data to display.',
    className = '',
}) => {
    return (
        <div className={`table-wrapper ${className}`}>
            <table className="table">
                <thead>
                    <tr>
                        {columns.map(col => (
                            <th
                                key={col.key}
                                style={col.align ? { textAlign: col.align } : undefined}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="table-empty">
                                {emptyText}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, index) => (
                            <tr
                                key={row[rowKey] || index}
                                className={onRowClick ? 'table-row-clickable' : ''}
                                onClick={() => onRowClick?.(row)}
                            >
                                {columns.map(col => (
                                    <td
                                        key={col.key}
                                        style={col.align ? { textAlign: col.align } : undefined}
                                    >
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Table;
