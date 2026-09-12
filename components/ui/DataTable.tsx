'use client';

import { useMemo } from 'react';
import { useData } from '@/components/providers/DataProvider';
import { useVirtualization } from '@/hooks/useVirtualization';

export function DataTable() {
  const { filteredData } = useData();

  const rowHeight = 38;
  const containerHeight = 320;

  const formatTimestamp = (timestamp: number) =>
    new Date(timestamp).toISOString().slice(11, 19);

  const virtualization = useVirtualization({
    totalItems: filteredData.length,
    itemHeight: rowHeight,
    containerHeight,
    overscan: 6,
  });

  const visibleRows = useMemo(
    () => filteredData.slice(virtualization.startIndex, virtualization.endIndex),
    [filteredData, virtualization.startIndex, virtualization.endIndex]
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60">
      <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1.2fr] border-b border-slate-800 bg-slate-900/80 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-slate-400">
        <span>Timestamp</span>
        <span>Category</span>
        <span>Region</span>
        <span>Status</span>
        <span>Value</span>
      </div>

      <div
        ref={virtualization.containerRef}
        onScroll={virtualization.onScroll}
        className="relative overflow-auto"
        style={{ height: `${containerHeight}px` }}
      >
        <div style={{ height: `${virtualization.totalHeight}px`, position: 'relative' }}>
          {visibleRows.map((point, index) => {
            const actualIndex = virtualization.startIndex + index;
            return (
              <div
                key={point.id}
                className="absolute left-0 right-0 grid grid-cols-[1.2fr_1fr_1fr_1fr_1.2fr] items-center border-b border-slate-800 px-4 text-sm text-slate-200"
                style={{
                  top: `${actualIndex * rowHeight}px`,
                  height: `${rowHeight}px`,
                }}
              >
                <span>{formatTimestamp(point.timestamp)}</span>
                <span className="capitalize">{point.category}</span>
                <span className="capitalize">{point.region}</span>
                <span className={`capitalize ${point.status === 'critical' ? 'text-rose-300' : point.status === 'warning' ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {point.status}
                </span>
                <span>{point.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
