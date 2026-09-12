'use client';

import { useMemo } from 'react';
import { DataProvider, useData } from '@/components/providers/DataProvider';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { ScatterPlot } from '@/components/charts/ScatterPlot';
import { Heatmap } from '@/components/charts/Heatmap';
import { FilterPanel } from '@/components/controls/FilterPanel';
import { TimeRangeSelector } from '@/components/controls/TimeRangeSelector';
import { PerformanceMonitor } from '@/components/ui/PerformanceMonitor';
import { DataTable } from '@/components/ui/DataTable';
import { generateInitialDataset } from '@/lib/dataGenerator';

function DashboardShell() {
  const { filteredData, metrics, filterState, isStreaming, toggleStreaming, stressTest, toggleStressTest, resetWithCount } = useData();

  const summary = useMemo(() => {
    const values = filteredData.map((point) => point.value);
    if (values.length === 0) {
      return { avg: 0, peak: 0, active: 0 };
    }
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    const peak = Math.max(...values);
    return { avg: Math.round(avg), peak, active: filteredData.length };
  }, [filteredData]);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="panel rounded-2xl p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">telemetry</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-100 md:text-3xl">Performance-Critical Dashboard</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={toggleStreaming}
                className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-400 hover:text-cyan-300"
              >
                {isStreaming ? 'Pause stream' : 'Resume stream'}
              </button>
              <button
                onClick={toggleStressTest}
                className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-amber-400 hover:text-amber-300"
              >
                {stressTest ? 'Normal load' : 'Stress test'}
              </button>
              <button
                onClick={() => resetWithCount(10000)}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Reset dataset
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="metric-card">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">FPS</div>
            <div className="mt-3 text-3xl font-semibold text-cyan-300">{metrics.fps}</div>
            <div className="mt-1 text-xs text-slate-400">Frame time {metrics.frameTime.toFixed(1)} ms</div>
          </div>
          <div className="metric-card">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Heap</div>
            <div className="mt-3 text-3xl font-semibold text-emerald-300">{metrics.memoryUsage.toFixed(1)} MB</div>
            <div className="mt-1 text-xs text-slate-400">Limit {metrics.memoryLimit.toFixed(0)} MB</div>
          </div>
          <div className="metric-card">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Avg value</div>
            <div className="mt-3 text-3xl font-semibold text-violet-300">{summary.avg}</div>
            <div className="mt-1 text-xs text-slate-400">Peak {summary.peak}</div>
          </div>
          <div className="metric-card">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Visible points</div>
            <div className="mt-3 text-3xl font-semibold text-amber-300">{summary.active.toLocaleString()}</div>
            <div className="mt-1 text-xs text-slate-400">Update every {filterState.streamSpeed} ms</div>
          </div>
        </section>

        <section className="panel rounded-2xl p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <FilterPanel />
            <TimeRangeSelector />
          </div>
        </section>

        <section className="dashboard-grid gap-4">
          <div className="panel col-span-12 rounded-2xl p-4 xl:col-span-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Primary signal</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">line chart</span>
            </div>
            <div className="chart-surface" style={{ height: 320 }}>
              <LineChart />
            </div>
          </div>

          <div className="panel col-span-12 rounded-2xl p-4 xl:col-span-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Performance</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">live</span>
            </div>
            <PerformanceMonitor />
          </div>

          <div className="panel col-span-12 rounded-2xl p-4 xl:col-span-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Aggregated throughput</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">bar chart</span>
            </div>
            <div className="chart-surface" style={{ height: 260 }}>
              <BarChart />
            </div>
          </div>

          <div className="panel col-span-12 rounded-2xl p-4 xl:col-span-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Value vs latency</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">scatter</span>
            </div>
            <div className="chart-surface" style={{ height: 260 }}>
              <ScatterPlot />
            </div>
          </div>

          <div className="panel col-span-12 rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Load heatmap</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">hourly intensity</span>
            </div>
            <div className="chart-surface" style={{ height: 220 }}>
              <Heatmap />
            </div>
          </div>
        </section>

        <section className="panel rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Data stream</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">live table</span>
          </div>
          <DataTable />
        </section>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  const initialData = generateInitialDataset(10000, 1710000000000);

  return (
    <DataProvider initialData={initialData}>
      <DashboardShell />
    </DataProvider>
  );
}
