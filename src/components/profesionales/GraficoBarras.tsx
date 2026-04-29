import React, { useState } from 'react';

export interface BarDatum {
  label: string;
  value: number;
}

interface Props {
  datos: BarDatum[];
  color: string;
  titulo?: string;
}

const W = 520;
const H = 160;
const ML = 36;
const MR = 12;
const MT = 12;
const MB = 28;
const innerW = W - ML - MR;
const innerH = H - MT - MB;

export const GraficoBarras: React.FC<Props> = ({ datos, color, titulo }) => {
  const [hover, setHover] = useState<number | null>(null);

  if (!datos.length) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
        Sin datos para el período seleccionado
      </div>
    );
  }

  const maxVal = Math.max(...datos.map(d => d.value), 1);
  const n = datos.length;
  const slotW = innerW / n;
  const barW = Math.max(slotW * 0.6, 4);

  const yTicks = Array.from(new Set([0, Math.ceil(maxVal / 2), maxVal])).sort((a, b) => a - b);

  return (
    <div>
      {titulo && <p className="text-xs font-semibold text-slate-400 mb-2">{titulo}</p>}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="overflow-visible"
      >
        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y = MT + innerH - (tick / maxVal) * innerH;
          return (
            <g key={`tick-${i}`}>
              <line
                x1={ML} x2={ML + innerW} y1={y} y2={y}
                stroke="#1e293b" strokeWidth={1}
              />
              <text
                x={ML - 4} y={y} textAnchor="end" dominantBaseline="middle"
                fill="#475569" fontSize={10}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {datos.map((d, i) => {
          const barH = Math.max((d.value / maxVal) * innerH, d.value > 0 ? 2 : 0);
          const x = ML + i * slotW + (slotW - barW) / 2;
          const y = MT + innerH - barH;
          const isHovered = hover === i;
          return (
            <g
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'default' }}
            >
              <rect
                x={x} y={y} width={barW} height={barH}
                rx={3}
                fill={color}
                opacity={isHovered ? 1 : 0.75}
                style={{ transition: 'opacity 0.15s' }}
              />
              {isHovered && d.value > 0 && (
                <g>
                  <rect
                    x={x + barW / 2 - 22} y={y - 26}
                    width={44} height={20} rx={4}
                    fill="#0f172a" stroke="#334155" strokeWidth={1}
                  />
                  <text
                    x={x + barW / 2} y={y - 16}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize={11} fontWeight="600"
                  >
                    {d.value}
                  </text>
                </g>
              )}
              <text
                x={x + barW / 2}
                y={MT + innerH + 14}
                textAnchor="middle"
                fill="#64748b"
                fontSize={9}
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* Axis line */}
        <line
          x1={ML} x2={ML + innerW} y1={MT + innerH} y2={MT + innerH}
          stroke="#334155" strokeWidth={1}
        />
      </svg>
    </div>
  );
};
