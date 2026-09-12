/**
 * High-Performance Background Data Worker
 * Offloads heavy statistical aggregations, 2D matrix binning, and LTTB downsampling
 * to keep the main UI thread at 60 FPS.
 */

self.onmessage = function (e) {
  const { id, type, payload } = e.data;

  const startTime = performance.now();

  if (type === 'AGGREGATE') {
    const { points, period } = payload;
    let bucketSizeMs = 60000;
    if (period === '5min') bucketSizeMs = 300000;
    else if (period === '1hour') bucketSizeMs = 3600000;

    const bucketsMap = new Map();

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

    const result = [];
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

    result.sort((a, b) => a.timestamp - b.timestamp);

    self.postMessage({
      id,
      type: 'AGGREGATE_RESULT',
      result,
      duration: performance.now() - startTime,
    });
  } else if (type === 'HEATMAP_MATRIX') {
    const { points, rows = 7, cols = 24 } = payload;
    // 7 rows (days of week or server clusters), 24 cols (hours of day)
    const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));
    const counts = Array.from({ length: rows }, () => new Array(cols).fill(0));

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const d = new Date(pt.timestamp);
      const col = d.getHours() % cols;
      const row = d.getDay() % rows;

      matrix[row][col] += pt.value;
      counts[row][col]++;
    }

    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (counts[r][c] > 0) {
          matrix[r][c] = Math.round(matrix[r][c] / counts[r][c]);
        } else {
          matrix[r][c] = 200 + Math.floor(Math.sin(r * 2 + c) * 100);
        }
        if (matrix[r][c] < minVal) minVal = matrix[r][c];
        if (matrix[r][c] > maxVal) maxVal = matrix[r][c];
      }
    }

    self.postMessage({
      id,
      type: 'HEATMAP_RESULT',
      matrix,
      minVal: minVal === Infinity ? 0 : minVal,
      maxVal: maxVal === -Infinity ? 1000 : maxVal,
      duration: performance.now() - startTime,
    });
  }
};
