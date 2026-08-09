import React, { useMemo, useState } from 'react';

/**
 * BurndownChart — ideal vs. actual TASK-completion burndown for a sprint.
 *
 * @param {Array<{date: string, ideal: number, actual: number|null}>} series
 * @param {number} totalTasks
 * @param {boolean} compact — render as a small supporting chart (e.g. below
 *   the task list) instead of the full-size chart.
 */
const BurndownChart = ({ series = [], totalTasks = 0, compact = false }) => {
    const [hoverIndex, setHoverIndex] = useState(null);

    const W = 640;
    const H = compact ? 120 : 260;
    const PAD_L = 34;
    const PAD_R = 12;
    const PAD_T = compact ? 10 : 16;
    const PAD_B = compact ? 18 : 28;

    const { idealPoints, actualPoints, xFor, yFor } = useMemo(() => {
        const n = Math.max(1, series.length - 1);
        const maxY = Math.max(totalTasks, 1);
        const xFor = (i) => PAD_L + (i / n) * (W - PAD_L - PAD_R);
        const yFor = (v) => PAD_T + (1 - v / maxY) * (H - PAD_T - PAD_B);

        const idealPoints = series.map((d, i) => [xFor(i), yFor(d.ideal)]);
        const actualPoints = series
            .map((d, i) => (d.actual !== null && d.actual !== undefined ? [xFor(i), yFor(d.actual)] : null))
            .filter(Boolean);

        return { idealPoints, actualPoints, xFor, yFor };
    }, [series, totalTasks]);

    if (!series.length) return null;

    const toPath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

    const gridLines = 4;
    const maxY = Math.max(totalTasks, 1);

    const hovered = hoverIndex !== null ? series[hoverIndex] : null;

    return (
        <div className={`burndown-chart ${compact ? 'burndown-chart-compact' : ''}`}>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="burndown-svg"
                style={{ height: H }}
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Grid + Y axis labels */}
                {Array.from({ length: gridLines + 1 }).map((_, i) => {
                    const val = Math.round((maxY / gridLines) * (gridLines - i));
                    const y = yFor(val);
                    return (
                        <g key={i}>
                            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} className="burndown-gridline" />
                            <text x={PAD_L - 8} y={y + 3} className="burndown-axis-label" textAnchor="end">{val}</text>
                        </g>
                    );
                })}

                {/* Ideal line (dashed) */}
                <path d={toPath(idealPoints)} className="burndown-line-ideal" fill="none" />

                {/* Actual line */}
                {actualPoints.length > 0 && (
                    <path d={toPath(actualPoints)} className="burndown-line-actual" fill="none" />
                )}
                {actualPoints.map((p, i) => (
                    <circle key={i} cx={p[0]} cy={p[1]} r={hoverIndex === i ? 4.5 : 3} className="burndown-dot-actual" />
                ))}

                {/* Hover targets */}
                {series.map((d, i) => (
                    <rect
                        key={i}
                        x={xFor(i) - (W / series.length) / 2}
                        y={PAD_T}
                        width={W / series.length}
                        height={H - PAD_T - PAD_B}
                        fill="transparent"
                        onMouseEnter={() => setHoverIndex(i)}
                        onMouseLeave={() => setHoverIndex(null)}
                    />
                ))}

                {hoverIndex !== null && (
                    <line x1={xFor(hoverIndex)} y1={PAD_T} x2={xFor(hoverIndex)} y2={H - PAD_B} className="burndown-hover-line" />
                )}
            </svg>

            <div className="burndown-legend" style={compact ? { marginTop: 'var(--space-1_5, 6px)' } : undefined}>
                <span className="burndown-legend-item"><i className="burndown-swatch ideal" /> Ideal</span>
                <span className="burndown-legend-item"><i className="burndown-swatch actual" /> Actual</span>
                {hovered && (
                    <span className="burndown-hover-readout">
                        {hovered.date} · {hovered.actual !== null ? `${hovered.actual} task${hovered.actual === 1 ? '' : 's'} remaining` : `${hovered.ideal} task${hovered.ideal === 1 ? '' : 's'} (projected)`}
                    </span>
                )}
            </div>
        </div>
    );
};

export default BurndownChart;
