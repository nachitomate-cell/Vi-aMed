import React, { useState } from 'react';

const DONUT_COLORS = ['#0E7490', '#059669', '#7C3AED', '#DC2626', '#D97706', '#2563EB', '#0891b2', '#65a30d'];

interface Props {
  datos: Record<string, number>;
  titulo?: string;
}

const CX = 90;
const CY = 90;
const R = 62;
const SW = 26;
const CIRC = 2 * Math.PI * R;

export const GraficoDonut: React.FC<Props> = ({ datos, titulo }) => {
  const [hover, setHover] = useState<string | null>(null);

  const entries = Object.entries(datos)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (!total) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Sin datos
      </div>
    );
  }

  let cumulative = 0;
  const segments = entries.map(([label, count], i) => {
    const fraction = count / total;
    const length = fraction * CIRC;
    const seg = { label, count, fraction, length, offset: cumulative, color: DONUT_COLORS[i % DONUT_COLORS.length] };
    cumulative += length;
    return seg;
  });

  return (
    <div>
      {titulo && <p className="text-xs font-semibold text-slate-400 mb-2">{titulo}</p>}
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 180 180" width={180} height={180} className="flex-shrink-0">
          {/* Background ring */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e293b" strokeWidth={SW} />

          {/* Segments */}
          {segments.map(seg => (
            <circle
              key={seg.label}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={hover === seg.label ? SW + 4 : SW}
              strokeDasharray={`${seg.length} ${CIRC - seg.length}`}
              strokeDashoffset={-seg.offset}
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{ cursor: 'pointer', transition: 'stroke-width 0.15s' }}
              onMouseEnter={() => setHover(seg.label)}
              onMouseLeave={() => setHover(null)}
            />
          ))}

          {/* Center */}
          <text x={CX} y={CY - 8} textAnchor="middle" fill="white" fontSize={22} fontWeight="700">
            {hover ? segments.find(s => s.label === hover)?.count ?? total : total}
          </text>
          <text x={CX} y={CY + 10} textAnchor="middle" fill="#64748b" fontSize={10}>
            {hover ? hover.slice(0, 12) : 'total'}
          </text>
        </svg>

        {/* Legend */}
        <div className="flex-1 space-y-2 min-w-0">
          {segments.map(seg => (
            <div
              key={seg.label}
              className="flex items-center gap-2 cursor-default"
              onMouseEnter={() => setHover(seg.label)}
              onMouseLeave={() => setHover(null)}
            >
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-xs text-slate-300 truncate flex-1">{seg.label}</span>
              <span className="text-xs font-mono text-slate-400 flex-shrink-0">{seg.count}</span>
              <span className="text-xs text-slate-500 flex-shrink-0 w-8 text-right">
                {Math.round(seg.fraction * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
