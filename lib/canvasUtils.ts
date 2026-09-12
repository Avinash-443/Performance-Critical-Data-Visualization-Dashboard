import { AggregatedBucket, CategoryType, DataPoint } from './types';

export interface ChartBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChartScale {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Configure Canvas for High-DPI / Retina displays without blurry lines.
 */
export function setupHiDPICanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number
): { ctx: CanvasRenderingContext2D | null; dpr: number } {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

  if (!ctx) return { ctx: null, dpr };

  // Set physical display buffer size
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);

  // Set CSS size
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  // Scale context to draw in CSS units
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  return { ctx, dpr };
}

/**
 * Largest-Triangle-Three-Buckets (LTTB) Downsampling Algorithm.
 * Downsamples large time-series datasets (e.g., 10,000 - 100,000 points) to a target threshold
 * matching the screen pixel resolution while preserving visual peaks, valleys, and trends.
 */
export function downsampleLTTB(data: DataPoint[], threshold: number): DataPoint[] {
  const dataLength = data.length;
  if (threshold >= dataLength || threshold <= 2) {
    return data;
  }

  const sampled: DataPoint[] = new Array(threshold);
  let sampledIndex = 0;

  // Bucket size. Leave room for start and end data points
  const every = (dataLength - 2) / (threshold - 2);

  let a = 0; // Initially first point
  let maxAreaPoint = data[0];
  let maxArea = 0;
  let nextA = 0;

  sampled[sampledIndex++] = data[a]; // Always add the first point

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket (containing c)
    let avgX = 0;
    let avgY = 0;
    const avgRangeStart = Math.floor((i + 1) * every) + 1;
    const avgRangeEnd = Math.min(Math.floor((i + 2) * every) + 1, dataLength);
    const avgRangeLength = avgRangeEnd - avgRangeStart;

    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += data[j].timestamp;
      avgY += data[j].value;
    }
    avgX /= avgRangeLength || 1;
    avgY /= avgRangeLength || 1;

    // Get the range for this bucket
    const rangeOffs = Math.floor(i * every) + 1;
    const rangeTo = Math.floor((i + 1) * every) + 1;

    // Point a
    const pointAX = data[a].timestamp;
    const pointAY = data[a].value;

    maxArea = -1;

    for (let k = rangeOffs; k < rangeTo; k++) {
      // Calculate triangle area over points a, this point, and the average point of next bucket
      const area = Math.abs(
        (pointAX - avgX) * (data[k].value - pointAY) -
        (pointAX - data[k].timestamp) * (avgY - pointAY)
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = data[k];
        nextA = k; // Next a is this point
      }
    }

    sampled[sampledIndex++] = maxAreaPoint;
    a = nextA;
  }

  sampled[sampledIndex++] = data[dataLength - 1]; // Always add the last point
  return sampled;
}

/**
 * Map data coordinates (timestamp, value) to pixel space (x, y)
 */
export function dataToPixel(
  timestamp: number,
  value: number,
  bounds: ChartBounds,
  scale: ChartScale
): { x: number; y: number } {
  const xSpan = scale.maxX - scale.minX || 1;
  const ySpan = scale.maxY - scale.minY || 1;

  const x = bounds.x + ((timestamp - scale.minX) / xSpan) * bounds.width;
  const y = bounds.y + bounds.height - ((value - scale.minY) / ySpan) * bounds.height;

  return { x, y };
}

/**
 * Map pixel X back to closest timestamp
 */
export function pixelToTimestamp(
  pixelX: number,
  bounds: ChartBounds,
  scale: ChartScale
): number {
  const xSpan = scale.maxX - scale.minX || 1;
  const ratio = Math.max(0, Math.min(1, (pixelX - bounds.x) / bounds.width));
  return scale.minX + ratio * xSpan;
}

/**
 * Fast binary search for closest point by timestamp in a sorted array
 */
export function findClosestPoint(
  data: DataPoint[],
  targetTimestamp: number
): DataPoint | null {
  if (!data || data.length === 0) return null;
  let low = 0;
  let high = data.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (data[mid].timestamp < targetTimestamp) {
      low = mid + 1;
    } else if (data[mid].timestamp > targetTimestamp) {
      high = mid - 1;
    } else {
      return data[mid];
    }
  }

  // Choose the closer neighbor between low and high
  const idx1 = Math.max(0, Math.min(data.length - 1, low));
  const idx2 = Math.max(0, Math.min(data.length - 1, high));
  const diff1 = Math.abs(data[idx1].timestamp - targetTimestamp);
  const diff2 = Math.abs(data[idx2].timestamp - targetTimestamp);

  return diff1 < diff2 ? data[idx1] : data[idx2];
}

/**
 * Batch line rendering with smooth gradient fill
 */
export function renderCanvasLineChart(
  ctx: CanvasRenderingContext2D,
  data: DataPoint[],
  bounds: ChartBounds,
  scale: ChartScale,
  options: {
    strokeColor?: string;
    lineWidth?: number;
    showArea?: boolean;
    areaColorTop?: string;
    areaColorBottom?: string;
  } = {}
): void {
  if (data.length === 0) return;

  const strokeColor = options.strokeColor || '#06b6d4';
  const lineWidth = options.lineWidth || 2;
  const showArea = options.showArea !== false;

  const points: { x: number; y: number }[] = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    points[i] = dataToPixel(data[i].timestamp, data[i].value, bounds, scale);
  }

  // Draw area fill under line
  if (showArea && points.length > 1) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, bounds.y + bounds.height);
    ctx.lineTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.lineTo(points[points.length - 1].x, bounds.y + bounds.height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, bounds.y, 0, bounds.y + bounds.height);
    gradient.addColorStop(0, options.areaColorTop || 'rgba(6, 182, 212, 0.28)');
    gradient.addColorStop(1, options.areaColorBottom || 'rgba(6, 182, 212, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  // Draw main line path
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Batch bar rendering
 */
export function renderCanvasBarChart(
  ctx: CanvasRenderingContext2D,
  buckets: AggregatedBucket[],
  bounds: ChartBounds,
  scale: ChartScale,
  options: {
    barColor?: string;
    hoverIndex?: number;
  } = {}
): void {
  if (buckets.length === 0) return;

  const barColor = options.barColor || '#10b981';
  const bucketCount = buckets.length;
  const totalBarWidth = bounds.width / bucketCount;
  const padding = Math.max(1, totalBarWidth * 0.2);
  const barWidth = Math.max(2, totalBarWidth - padding);
  const yRange = Math.max(1, scale.maxY - scale.minY);

  ctx.save();
  for (let i = 0; i < bucketCount; i++) {
    const bucket = buckets[i];
    const x = bounds.x + i * totalBarWidth + padding / 2;
    const valueRatio = Math.max(0, Math.min(1, (bucket.avgValue - scale.minY) / yRange));
    const yVal = bounds.y + bounds.height - valueRatio * bounds.height;
    const barHeight = Math.max(2, Math.min(bounds.height, bounds.y + bounds.height - yVal));

    ctx.fillStyle = options.hoverIndex === i ? '#34d399' : barColor;
    ctx.fillRect(x, yVal, barWidth, barHeight);
  }
  ctx.restore();
}

/**
 * Category color map for ScatterPlot & Heatmap
 */
export const CATEGORY_COLORS: Record<CategoryType, string> = {
  system: '#06b6d4', // Cyan
  network: '#3b82f6', // Blue
  database: '#8b5cf6', // Purple
  auth: '#10b981', // Emerald
};

/**
 * Batch scatter plot rendering grouped by category for high performance
 */
export function renderCanvasScatterPlot(
  ctx: CanvasRenderingContext2D,
  data: DataPoint[],
  bounds: ChartBounds,
  scale: { minX: number; maxX: number; minY: number; maxY: number },
  options: {
    pointRadius?: number;
    hoverPoint?: DataPoint | null;
  } = {}
): void {
  if (data.length === 0) return;

  const radius = options.pointRadius || 2.5;

  // Group by category to minimize context state switches
  const groups: Record<CategoryType, { x: number; y: number }[]> = {
    system: [],
    network: [],
    database: [],
    auth: [],
  };

  const xSpan = scale.maxX - scale.minX || 1;
  const ySpan = scale.maxY - scale.minY || 1;

  for (let i = 0; i < data.length; i++) {
    const pt = data[i];
    const x = bounds.x + ((pt.value - scale.minX) / xSpan) * bounds.width;
    const y = bounds.y + bounds.height - ((pt.secondaryValue - scale.minY) / ySpan) * bounds.height;

    if (groups[pt.category]) {
      groups[pt.category].push({ x, y });
    }
  }

  ctx.save();
  for (const cat of ['system', 'network', 'database', 'auth'] as CategoryType[]) {
    const pts = groups[cat];
    if (pts.length === 0) continue;

    ctx.fillStyle = CATEGORY_COLORS[cat];
    ctx.beginPath();

    for (let i = 0; i < pts.length; i++) {
      ctx.rect(pts[i].x - radius, pts[i].y - radius, radius * 2, radius * 2);
    }
    ctx.fill();
  }

  // Highlight hover point if present
  if (options.hoverPoint) {
    const hp = options.hoverPoint;
    const hx = bounds.x + ((hp.value - scale.minX) / xSpan) * bounds.width;
    const hy = bounds.y + bounds.height - ((hp.secondaryValue - scale.minY) / ySpan) * bounds.height;

    ctx.beginPath();
    ctx.arc(hx, hy, radius * 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f43f5e';
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Render Heatmap grid of time-of-day / clusters
 */
export function renderCanvasHeatmap(
  ctx: CanvasRenderingContext2D,
  matrix: number[][], // rows x cols
  bounds: ChartBounds,
  minVal: number,
  maxVal: number
): void {
  const rows = matrix.length;
  if (rows === 0) return;
  const cols = matrix[0].length;
  if (cols === 0) return;

  const cellWidth = bounds.width / cols;
  const cellHeight = bounds.height / rows;
  const valRange = maxVal - minVal || 1;

  ctx.save();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const val = matrix[r][c];
      const intensity = Math.max(0, Math.min(1, (val - minVal) / valRange));

      // Color mapping: dark blue -> cyan -> yellow -> red
      const red = Math.round(Math.min(255, intensity * 2 * 255));
      const green = Math.round(Math.min(255, (1 - Math.abs(intensity - 0.5) * 2) * 255));
      const blue = Math.round(Math.min(255, (1 - intensity) * 255));

      ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      ctx.fillRect(
        bounds.x + c * cellWidth + 0.5,
        bounds.y + r * cellHeight + 0.5,
        Math.max(1, cellWidth - 1),
        Math.max(1, cellHeight - 1)
      );
    }
  }
  ctx.restore();
}
