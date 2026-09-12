'use client';

import { useData } from '@/components/providers/DataProvider';
import { CategoryType, RegionType, StatusType } from '@/lib/types';

const categoryLabels: Record<CategoryType, string> = {
  system: 'System',
  network: 'Network',
  database: 'Database',
  auth: 'Auth',
};

const regionLabels: Record<RegionType, string> = {
  'us-east': 'US East',
  'us-west': 'US West',
  'eu-central': 'EU Central',
  'ap-southeast': 'AP Southeast',
};

const statusLabels: Record<StatusType, string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  critical: 'Critical',
};

export function FilterPanel() {
  const { filterState, toggleCategory, toggleRegion, toggleStatus, setSearch } = useData();

  return (
    <div className="flex-1">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-100">Filters</h2>
        <input
          value={filterState.search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search node or id"
          className="w-full max-w-xs rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
        />
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Categories</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(categoryLabels) as CategoryType[]).map((key) => {
              const active = filterState.categories.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleCategory(key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300' : 'border-slate-700 bg-slate-900/80 text-slate-400'
                  }`}
                >
                  {categoryLabels[key]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Regions</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(regionLabels) as RegionType[]).map((key) => {
              const active = filterState.regions.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleRegion(key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active ? 'border-violet-400 bg-violet-500/15 text-violet-300' : 'border-slate-700 bg-slate-900/80 text-slate-400'
                  }`}
                >
                  {regionLabels[key]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Status</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(statusLabels) as StatusType[]).map((key) => {
              const active = filterState.statuses.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleStatus(key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 bg-slate-900/80 text-slate-400'
                  }`}
                >
                  {statusLabels[key]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
