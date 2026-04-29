import React, { useEffect, useState, useRef } from 'react';

function useAnimatedCount(target: number, duration = 700) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return count;
}

function formatMinutos(min: number): string {
  if (min < 60) return `${Math.round(min)}min`;
  return `${(min / 60).toFixed(1)}h`;
}

interface KPI {
  label: string;
  value: number;
  isMinutos?: boolean;
}

interface Props {
  kpis: KPI[];
  cargando?: boolean;
}

const KPICard: React.FC<{ kpi: KPI }> = ({ kpi }) => {
  const animated = useAnimatedCount(kpi.isMinutos ? Math.round(kpi.value) : kpi.value);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-center flex-1 min-w-0">
      <div className="text-2xl font-bold text-white font-mono leading-none">
        {kpi.isMinutos ? formatMinutos(kpi.value) : animated}
      </div>
      <div className="text-[11px] text-slate-400 mt-1.5 font-medium">{kpi.label}</div>
    </div>
  );
};

export const StatsKPI: React.FC<Props> = ({ kpis, cargando }) => {
  if (cargando) {
    return (
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 h-16 bg-slate-800/50 border border-slate-700/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {kpis.map(k => <KPICard key={k.label} kpi={k} />)}
    </div>
  );
};
