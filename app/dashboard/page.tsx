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
import { Activity, BarChart3, Gauge, LayoutGrid, Pause, Play, RotateCcw, Settings2, Table2 } from 'lucide-react';

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
    <main className="app-frame">
      <aside className="side-rail">
        <div className="brand-mark"><span>PX</span><strong>Pulse<br />index</strong></div>
        <div className="rail-group">
          <span className="rail-label">Workspace</span>
          <a className="rail-link rail-link-active" href="#overview"><LayoutGrid size={16} /> Overview</a>
          <a className="rail-link" href="#charts"><BarChart3 size={16} /> Signals</a>
          <a className="rail-link" href="#feed"><Table2 size={16} /> Live feed</a>
        </div>
        <div className="rail-footer">
          <span className="rail-label">Environment</span>
          <div className="environment"><span className="live-pip" /> Production</div>
          <a className="rail-link" href="#controls"><Settings2 size={16} /> Preferences</a>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div><span className="breadcrumb">OPS / MORNING SHIFT</span><h1>Node health</h1></div>
          <div className="masthead-actions">
            <div className="status-chip"><Activity size={14} /> {isStreaming ? 'Live' : 'Paused'}</div>
              <button
                onClick={toggleStreaming}
                className="control-button control-button-quiet"
              >
                {isStreaming ? <Pause size={15} /> : <Play size={15} />}
                {isStreaming ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={toggleStressTest}
                className={`control-button ${stressTest ? 'control-button-hot' : 'control-button-quiet'}`}
              >
                <Gauge size={15} /> {stressTest ? 'Normal load' : 'Stress test'}
              </button>
              <button
                onClick={() => resetWithCount(10000)}
                className="control-button control-button-primary"
              >
                <RotateCcw size={15} /> Reset
              </button>
          </div>
        </header>

        <div className="workspace-content">
        <section id="overview" className="intro-row">
          <div><span className="eyebrow">Field notes / 09:30 UTC</span><h2>The network is holding steady.</h2></div>
          <p>04 regions online <span className="inline-status"><span className="live-pip" /> nominal</span></p>
        </section>

        <section className="signal-strip">
          <div className="metric-card metric-featured">
            <div className="metric-label"><span className="metric-index">01</span> FPS</div>
            <div className="metric-value text-cyan-300">{metrics.fps}<small> fps</small></div>
            <div className="metric-foot">Frame time {metrics.frameTime.toFixed(1)} ms <span className="trend-up">stable</span></div>
          </div>
          <div className="metric-card">
            <div className="metric-label"><span className="metric-index">02</span> Heap</div>
            <div className="metric-value text-emerald-300">{metrics.memoryUsage.toFixed(1)}<small> MB</small></div>
            <div className="metric-foot">Limit {metrics.memoryLimit.toFixed(0)} MB</div>
          </div>
          <div className="metric-card">
            <div className="metric-label"><span className="metric-index">03</span> Avg value</div>
            <div className="metric-value text-amber-300">{summary.avg}</div>
            <div className="metric-foot">Peak {summary.peak}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label"><span className="metric-index">04</span> Visible points</div>
            <div className="metric-value text-rose-300">{summary.active.toLocaleString()}<small> pts</small></div>
            <div className="metric-foot">Update every {filterState.streamSpeed} ms</div>
          </div>
        </section>

        <section id="controls" className="control-deck">
          <div className="deck-heading"><span>Shape the readout</span><b>updates as you work</b></div>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <FilterPanel />
            <TimeRangeSelector />
          </div>
        </section>

        <section id="charts" className="dashboard-grid gap-4">
          <div className="panel chart-panel col-span-12 rounded-2xl p-4 xl:col-span-8">
            <div className="panel-heading">
              <div><span className="panel-kicker">01 / live trace</span><h2>Signal trace</h2></div>
              <span className="chart-tag"><span className="live-pip" /> line chart</span>
            </div>
            <div className="chart-surface" style={{ height: 320 }}>
              <LineChart />
            </div>
          </div>

          <div className="panel col-span-12 rounded-2xl p-4 xl:col-span-4">
            <div className="panel-heading">
              <div><span className="panel-kicker">02 / pulse check</span><h2>Engine pulse</h2></div>
              <span className="chart-tag">live</span>
            </div>
            <PerformanceMonitor />
          </div>

          <div className="panel chart-panel col-span-12 rounded-2xl p-4 xl:col-span-6">
            <div className="panel-heading">
              <div><span className="panel-kicker">03 / volume</span><h2>Throughput</h2></div>
              <span className="chart-tag">bar chart</span>
            </div>
            <div className="chart-surface" style={{ height: 260 }}>
              <BarChart />
            </div>
          </div>

          <div className="panel chart-panel col-span-12 rounded-2xl p-4 xl:col-span-6">
            <div className="panel-heading">
              <div><span className="panel-kicker">04 / relationship</span><h2>Value / latency</h2></div>
              <span className="chart-tag">scatter</span>
            </div>
            <div className="chart-surface" style={{ height: 260 }}>
              <ScatterPlot />
            </div>
          </div>

          <div className="panel chart-panel col-span-12 rounded-2xl p-4">
            <div className="panel-heading">
              <div><span className="panel-kicker">05 / density field</span><h2>Load atlas</h2></div>
              <span className="chart-tag">hourly intensity</span>
            </div>
            <div className="chart-surface" style={{ height: 220 }}>
              <Heatmap />
            </div>
          </div>
        </section>

        <section id="feed" className="panel table-panel rounded-2xl p-4">
          <div className="panel-heading">
            <div><span className="panel-kicker">06 / raw feed</span><h2>Event ledger</h2></div>
            <span className="chart-tag"><span className="live-pip" /> live table</span>
          </div>
          <DataTable />
        </section>
        </div>
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
