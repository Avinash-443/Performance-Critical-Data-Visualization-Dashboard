'use client';

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useTransition,
  ReactNode,
  useCallback,
} from 'react';
import {
  AggregatedBucket,
  AggregationPeriod,
  CategoryType,
  DataPoint,
  FilterState,
  PerformanceMetrics,
  RegionType,
  StatusType,
  TimeRange,
} from '../../lib/types';
import { useDataStream } from '../../hooks/useDataStream';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { generateInitialDataset } from '../../lib/dataGenerator';

interface DataContextValue {
  data: DataPoint[];
  filteredData: DataPoint[];
  aggregatedBuckets: AggregatedBucket[];
  heatmapData: { matrix: number[][]; minVal: number; maxVal: number };
  filterState: FilterState;
  metrics: PerformanceMetrics;
  isPending: boolean;
  // Filter mutations
  toggleCategory: (category: CategoryType) => void;
  toggleRegion: (region: RegionType) => void;
  toggleStatus: (status: StatusType) => void;
  setSearch: (search: string) => void;
  setTimeRange: (timeRange: TimeRange) => void;
  setAggregation: (agg: AggregationPeriod) => void;
  setPointLimit: (limit: number) => void;
  setStreamSpeed: (speed: number) => void;
  // Stream Controls
  isStreaming: boolean;
  toggleStreaming: () => void;
  stressTest: boolean;
  toggleStressTest: () => void;
  resetWithCount: (count: number) => void;
  // Performance record callback
  recordRenderTime: (durationMs: number) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({
  children,
  initialData = [],
}: {
  children: ReactNode;
  initialData?: DataPoint[];
}) {
  const [isPending, startTransition] = useTransition();

  const [filterState, setFilterState] = useState<FilterState>({
    categories: ['system', 'network', 'database', 'auth'],
    regions: ['us-east', 'us-west', 'eu-central', 'ap-southeast'],
    statuses: ['healthy', 'warning', 'critical'],
    search: '',
    timeRange: 'all',
    aggregation: 'raw',
    pointLimit: 10000,
    streamSpeed: 100,
    isStreaming: true,
    stressTest: false,
  });

  const {
    data,
    capacity,
    setCapacity,
    streamSpeed,
    setStreamSpeed: setStreamSpeedRaw,
    isStreaming,
    toggleStreaming,
    stressTest,
    toggleStressTest,
    aggregatedBuckets,
    heatmapData,
    resetData,
  } = useDataStream({
    initialData,
    defaultCapacity: filterState.pointLimit,
    defaultStreamSpeed: filterState.streamSpeed,
    aggregationPeriod: filterState.aggregation,
  });

  const { metrics, recordRenderTime, recordDataProcessingTime } = usePerformanceMonitor(
    streamSpeed,
    data.length
  );

  // Filter mutation handlers wrapped with useTransition for non-blocking rendering
  const toggleCategory = useCallback((cat: CategoryType) => {
    startTransition(() => {
      setFilterState((prev) => {
        const exists = prev.categories.includes(cat);
        const categories = exists
          ? prev.categories.filter((c) => c !== cat)
          : [...prev.categories, cat];
        return { ...prev, categories };
      });
    });
  }, []);

  const toggleRegion = useCallback((reg: RegionType) => {
    startTransition(() => {
      setFilterState((prev) => {
        const exists = prev.regions.includes(reg);
        const regions = exists
          ? prev.regions.filter((r) => r !== reg)
          : [...prev.regions, reg];
        return { ...prev, regions };
      });
    });
  }, []);

  const toggleStatus = useCallback((st: StatusType) => {
    startTransition(() => {
      setFilterState((prev) => {
        const exists = prev.statuses.includes(st);
        const statuses = exists
          ? prev.statuses.filter((s) => s !== st)
          : [...prev.statuses, st];
        return { ...prev, statuses };
      });
    });
  }, []);

  const setSearch = useCallback((search: string) => {
    startTransition(() => {
      setFilterState((prev) => ({ ...prev, search }));
    });
  }, []);

  const setTimeRange = useCallback((timeRange: TimeRange) => {
    startTransition(() => {
      setFilterState((prev) => ({ ...prev, timeRange }));
    });
  }, []);

  const setAggregation = useCallback((aggregation: AggregationPeriod) => {
    startTransition(() => {
      setFilterState((prev) => ({ ...prev, aggregation }));
    });
  }, []);

  const setPointLimit = useCallback(
    (pointLimit: number) => {
      const safeLimit = Math.min(10000, Math.max(5000, Math.round(pointLimit)));
      setFilterState((prev) => ({ ...prev, pointLimit: safeLimit }));
      setCapacity(safeLimit);
      if (safeLimit !== data.length) {
        resetData(generateInitialDataset(safeLimit));
      }
    },
    [data.length, resetData, setCapacity]
  );

  const setStreamSpeed = useCallback(
    (speed: number) => {
      setFilterState((prev) => ({ ...prev, streamSpeed: speed }));
      setStreamSpeedRaw(speed);
    },
    [setStreamSpeedRaw]
  );

  const resetWithCount = useCallback(
    (count: number) => {
      setPointLimit(count);
      resetData(generateInitialDataset(count));
    },
    [resetData, setPointLimit]
  );

  // Compute filtered dataset efficiently with useMemo and high-res timing
  const filteredData = useMemo(() => {
    const startFilterTime = performance.now();

    if (data.length === 0) return [];

    const { categories, regions, statuses, search, timeRange } = filterState;

    // Time window calculation
    let minTimestamp = 0;
    if (timeRange !== 'all') {
      const now = data[data.length - 1]?.timestamp || Date.now();
      const rangeMap: Record<Exclude<TimeRange, 'all'>, number> = {
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
      };
      minTimestamp = now - rangeMap[timeRange];
    }

    const catSet = new Set(categories);
    const regSet = new Set(regions);
    const statSet = new Set(statuses);
    const searchLower = search.trim().toLowerCase();

    const filtered = data.filter((pt) => {
      if (minTimestamp > 0 && pt.timestamp < minTimestamp) return false;
      if (!catSet.has(pt.category)) return false;
      if (!regSet.has(pt.region)) return false;
      if (!statSet.has(pt.status)) return false;
      if (searchLower) {
        const idMatch = pt.id.toLowerCase().includes(searchLower);
        const nodeMatch = (pt.metadata?.node as string)?.toLowerCase().includes(searchLower);
        if (!idMatch && !nodeMatch) return false;
      }
      return true;
    });

    recordDataProcessingTime(performance.now() - startFilterTime);
    return filtered;
  }, [data, filterState, recordDataProcessingTime]);

  const value: DataContextValue = {
    data,
    filteredData,
    aggregatedBuckets,
    heatmapData,
    filterState,
    metrics,
    isPending,
    toggleCategory,
    toggleRegion,
    toggleStatus,
    setSearch,
    setTimeRange,
    setAggregation,
    setPointLimit,
    setStreamSpeed,
    isStreaming,
    toggleStreaming,
    stressTest,
    toggleStressTest,
    resetWithCount,
    recordRenderTime,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
