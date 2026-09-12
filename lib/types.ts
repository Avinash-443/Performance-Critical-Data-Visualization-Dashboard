export type CategoryType = 'system' | 'network' | 'database' | 'auth';
export type RegionType = 'us-east' | 'us-west' | 'eu-central' | 'ap-southeast';
export type StatusType = 'healthy' | 'warning' | 'critical';

export interface DataPoint {
  id: string;
  timestamp: number;
  value: number;
  secondaryValue: number;
  category: CategoryType;
  region: RegionType;
  status: StatusType;
  metadata?: Record<string, string | number>;
}

export type TimeRange = '5m' | '15m' | '1h' | '6h' | '24h' | 'all';
export type AggregationPeriod = 'raw' | '1min' | '5min' | '1hour';
export type ChartType = 'line' | 'bar' | 'scatter' | 'heatmap';

export interface ChartConfig {
  type: ChartType;
  dataKey: string;
  color: string;
  visible: boolean;
}

export interface AggregatedBucket {
  timestamp: number;
  count: number;
  avgValue: number;
  minValue: number;
  maxValue: number;
  avgSecondaryValue: number;
  categories: Record<CategoryType, number>;
  statusCount: Record<StatusType, number>;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  memoryLimit: number;
  renderTime: number;
  dataProcessingTime: number;
  droppedFrames: number;
  totalPoints: number;
  streamSpeedMs: number;
}

export interface FilterState {
  categories: CategoryType[];
  regions: RegionType[];
  statuses: StatusType[];
  search: string;
  timeRange: TimeRange;
  aggregation: AggregationPeriod;
  pointLimit: number;
  streamSpeed: number;
  isStreaming: boolean;
  stressTest: boolean;
}
