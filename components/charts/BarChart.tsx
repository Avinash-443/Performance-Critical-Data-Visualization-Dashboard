'use client';

import { useMemo } from 'react';
import { useData } from '@/components/providers/DataProvider';
import { useChartRenderer } from '@/hooks/useChartRenderer';
import { aggregateDataPoints } from '@/lib/dataGenerator';
import { renderCanvasBarChart } from '@/lib/canvasUtils';

export function BarChart() {
  const { aggregatedBuckets, filteredData, recordRenderTime } = useData();

  const buckets = useMemo(() => {
    if (aggregatedBuckets.length > 0) return aggregatedBuckets.slice(-36);
    return aggregateDataPoints(filteredData, '1min').slice(-36);
  }, [aggregatedBuckets, filteredData]);

  const { canvasRef, containerRef } = useChartRenderer({
    dependencies: [buckets],
    onRender: (ctx, width, height) => {
      const start = performance.now();
      const padding = 22;
      const bounds = { x: padding, y: 10, width: width - padding * 2, height: height - 32 };
      ctx.fillStyle = '#10112e';
      ctx.fillRect(0, 0, width, height);

      if (buckets.length === 0) {
        recordRenderTime(performance.now() - start);
        return;
      }

      const minY = 0;
      const maxY = 1000;
      const scale = { minX: 0, maxX: buckets.length, minY, maxY };

      renderCanvasBarChart(ctx, buckets, bounds, scale, { barColor: '#9b8cff' });
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${buckets.length} buckets`, width - 92, 18);
      recordRenderTime(performance.now() - start);
    },
  });

  return <div ref={containerRef} className="h-full w-full"><canvas ref={canvasRef} /></div>;
}
