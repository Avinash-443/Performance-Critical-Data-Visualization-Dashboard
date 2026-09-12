import { AggregatedBucket, AggregationPeriod, CategoryType, DataPoint, RegionType, StatusType } from './types';

const CATEGORIES: CategoryType[] = ['system', 'network', 'database', 'auth'];
const REGIONS: RegionType[] = ['us-east', 'us-west', 'eu-central', 'ap-southeast'];

// Linear congruential generator for reproducible pseudo-random values if needed
class FastRandom {
  private seed: number;
  constructor(seed = 123456789) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (1103515245 * this.seed + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
}

const DEFAULT_DATASET_END_TIME = 1710000000000;

export function generateInitialDataset(
  count: number = 10000,
  endTime: number = DEFAULT_DATASET_END_TIME
): DataPoint[] {
  const rng = new FastRandom(42);
  const points: DataPoint[] = new Array(count);
  const timeStepMs = Math.max(10, Math.floor(86400000 / count)); // e.g. spanning over up to 24h
  const startTime = endTime - count * timeStepMs;

  let baseVal = 450;
  let trend = 0;

  for (let i = 0; i < count; i++) {
    const timestamp = startTime + i * timeStepMs;
    // Diurnal sinusoidal pattern + random walk + occasional spike
    const diurnal = Math.sin((i / count) * Math.PI * 4) * 120;
    const noise = (rng.next() - 0.49) * 25;
    trend = trend * 0.95 + (rng.next() - 0.5) * 5;
    baseVal = Math.max(80, Math.min(950, baseVal + noise + trend * 0.1));

    // 1.5% chance of anomalous spike
    const isSpike = rng.next() > 0.985;
    const finalVal = Math.round(isSpike ? Math.min(1000, baseVal + 200 + rng.next() * 150) : baseVal + diurnal);
    const clampedVal = Math.max(50, Math.min(1000, finalVal));

    // Secondary value: latency in ms inversely or directly correlated with noise
    const secondary = Math.round(Math.max(5, (clampedVal / 10) + (rng.next() * 30 - 15)));

    const category = CATEGORIES[i % CATEGORIES.length];
    const region = REGIONS[(i >> 1) % REGIONS.length];

    let status: StatusType = 'healthy';
    if (clampedVal > 850) {
      status = 'critical';
    } else if (clampedVal > 700) {
      status = 'warning';
    }

    points[i] = {
      id: `pt-${timestamp}-${i}`,
      timestamp,
      value: clampedVal,
      secondaryValue: secondary,
      category,
      region,
      status,
      metadata: {
        node: `node-${(i % 16) + 1}`,
        coreLoad: Math.round(clampedVal / 10),
      },
    };
  }

  return points;
}

let streamingSeed = 500;

export function generateStreamingBatch(
  count: number = 10,
  currentTimestamp: number = Date.now(),
  lastValue: number = streamingSeed
): { points: DataPoint[]; nextValue: number } {
  const points: DataPoint[] = new Array(count);
  let val = lastValue;

  for (let i = 0; i < count; i++) {
    const timestamp = currentTimestamp + i * 10;
    const delta = (Math.random() - 0.49) * 35;
    // Mean reversion toward 500
    const meanReversion = (500 - val) * 0.05;
    val = Math.max(60, Math.min(960, val + delta + meanReversion));

    // Occasional spike
    const isSpike = Math.random() > 0.98;
    const finalVal = Math.round(isSpike ? Math.min(1000, val + 250) : val);
    const clampedVal = Math.max(50, Math.min(1000, finalVal));
    const secondary = Math.round(Math.max(5, (clampedVal / 10) + (Math.random() * 25 - 12)));

    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];

    let status: StatusType = 'healthy';
    if (clampedVal > 850) status = 'critical';
    else if (clampedVal > 700) status = 'warning';

    points[i] = {
      id: `stream-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      value: clampedVal,
      secondaryValue: secondary,
      category,
      region,
      status,
      metadata: {
        node: `node-${Math.floor(Math.random() * 16) + 1}`,
        coreLoad: Math.round(clampedVal / 10),
      },
    };
  }

  streamingSeed = val;
  return { points, nextValue: val };
}

/**
 * Memory-safe sliding window update.
 * Ensures the array length never exceeds maxCapacity to guarantee < 1MB/hour memory growth.
 */
export function appendSlidingWindow(
  existing: DataPoint[],
  incoming: DataPoint[],
  maxCapacity: number
): DataPoint[] {
  const totalLength = existing.length + incoming.length;
  if (totalLength <= maxCapacity) {
    return existing.concat(incoming);
  }
  const overflow = totalLength - maxCapacity;
  // Slice off the oldest points and append incoming points
  return existing.slice(overflow).concat(incoming);
}

/**
 * Aggregation logic for grouping data points by 1min, 5min, 1hour time buckets.
 */
export function aggregateDataPoints(
  points: DataPoint[],
  period: AggregationPeriod
): AggregatedBucket[] {
  if (period === 'raw' || points.length === 0) return [];

  let bucketSizeMs = 60000; // 1 min default
  if (period === '5min') bucketSizeMs = 300000;
  else if (period === '1hour') bucketSizeMs = 3600000;

  const bucketsMap = new Map<number, {
    count: number;
    sumValue: number;
    minValue: number;
    maxValue: number;
    sumSecondary: number;
    categories: Record<CategoryType, number>;
    statusCount: Record<StatusType, number>;
  }>();

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const bucketKey = Math.floor(pt.timestamp / bucketSizeMs) * bucketSizeMs;

    let b = bucketsMap.get(bucketKey);
    if (!b) {
      b = {
        count: 0,
        sumValue: 0,
        minValue: Infinity,
        maxValue: -Infinity,
        sumSecondary: 0,
        categories: { system: 0, network: 0, database: 0, auth: 0 },
        statusCount: { healthy: 0, warning: 0, critical: 0 },
      };
      bucketsMap.set(bucketKey, b);
    }

    b.count++;
    b.sumValue += pt.value;
    if (pt.value < b.minValue) b.minValue = pt.value;
    if (pt.value > b.maxValue) b.maxValue = pt.value;
    b.sumSecondary += pt.secondaryValue;
    b.categories[pt.category] = (b.categories[pt.category] || 0) + 1;
    b.statusCount[pt.status] = (b.statusCount[pt.status] || 0) + 1;
  }

  const result: AggregatedBucket[] = [];
  for (const [timestamp, b] of bucketsMap.entries()) {
    result.push({
      timestamp,
      count: b.count,
      avgValue: Math.round(b.sumValue / b.count),
      minValue: b.minValue === Infinity ? 0 : b.minValue,
      maxValue: b.maxValue === -Infinity ? 0 : b.maxValue,
      avgSecondaryValue: Math.round(b.sumSecondary / b.count),
      categories: b.categories,
      statusCount: b.statusCount,
    });
  }

  return result.sort((a, b) => a.timestamp - b.timestamp);
}
