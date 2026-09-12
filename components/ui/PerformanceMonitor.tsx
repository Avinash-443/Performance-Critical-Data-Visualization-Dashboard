'use client';

import { useData } from '@/components/providers/DataProvider';

export function PerformanceMonitor() {
  const { metrics, filterState } = useData();

  const rows = [
    { label: 'Render time', value: `${metrics.renderTime.toFixed(1)} ms` },
    { label: 'Data processing', value: `${metrics.dataProcessingTime.toFixed(1)} ms` },
    { label: 'Dropped frames', value: `${metrics.droppedFrames}` },
    { label: 'Stream speed', value: `${filterState.streamSpeed} ms` },
    { label: 'Total points', value: metrics.totalPoints.toLocaleString() },
    { label: 'Window', value: filterState.stressTest ? 'Stress mode' : 'Balanced' },
  ];

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm">
          <span className="text-slate-400">{row.label}</span>
          <span className="font-medium text-slate-100">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
