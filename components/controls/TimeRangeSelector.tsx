'use client';

import { useData } from '@/components/providers/DataProvider';
import { AggregationPeriod, TimeRange } from '@/lib/types';

const timeRangeOptions: Array<{ value: TimeRange; label: string }> = [
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: 'all', label: 'All' },
];

const aggregationOptions: Array<{ value: AggregationPeriod; label: string }> = [
  { value: 'raw', label: 'Raw' },
  { value: '1min', label: '1m' },
  { value: '5min', label: '5m' },
  { value: '1hour', label: '1h' },
];

export function TimeRangeSelector() {
  const { filterState, setTimeRange, setAggregation, setPointLimit, setStreamSpeed } = useData();

  return (
    <div className="range-controls flex flex-col gap-4 xl:items-end">
      <div className="flex flex-wrap items-center gap-2">
        {timeRangeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setTimeRange(option.value)}
            className={`range-button rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              filterState.timeRange === option.value
                ? 'range-button-active'
                : 'range-button-idle'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
          aggregation
          <select
            value={filterState.aggregation}
            onChange={(e) => setAggregation(e.target.value as AggregationPeriod)}
            className="range-select rounded-lg px-2 py-1.5 text-sm"
          >
            {aggregationOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
          points
          <select
            value={filterState.pointLimit}
            onChange={(e) => setPointLimit(Number(e.target.value))}
            className="range-select rounded-lg px-2 py-1.5 text-sm"
          >
            <option value={5000}>5k</option>
            <option value={10000}>10k</option>
            <option value={25000}>25k</option>
            <option value={50000}>50k</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
          speed
          <select
            value={filterState.streamSpeed}
            onChange={(e) => setStreamSpeed(Number(e.target.value))}
            className="range-select rounded-lg px-2 py-1.5 text-sm"
          >
            <option value={50}>50ms</option>
            <option value={100}>100ms</option>
            <option value={250}>250ms</option>
            <option value={500}>500ms</option>
          </select>
        </label>
      </div>
    </div>
  );
}
