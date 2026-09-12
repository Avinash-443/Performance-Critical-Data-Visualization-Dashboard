'use client';

import { useMemo } from 'react';
import { useData } from '@/components/providers/DataProvider';
import { useChartRenderer } from '@/hooks/useChartRenderer';
import { renderCanvasHeatmap } from '@/lib/canvasUtils';

export function Heatmap() {
  const { heatmapData, recordRenderTime } = useData();
  const displayData = useMemo(() => {
    if (heatmapData.matrix.length > 0) return heatmapData;

    const matrix = Array.from({ length: 7 }, (_, row) =>
      Array.from({ length: 24 }, (_, col) => 380 + ((row * 17 + col * 23) % 360))
    );
    return { matrix, minVal: 0, maxVal: 1000 };
  }, [heatmapData]);

  const { canvasRef, containerRef } = useChartRenderer({
    onRender: (ctx, width, height) => {
      const start = performance.now();
      const padding = 12;
      const bounds = { x: padding, y: padding, width: width - padding * 2, height: height - padding * 2 };
      ctx.fillStyle = '#10112e';
      ctx.fillRect(0, 0, width, height);

      renderCanvasHeatmap(ctx, displayData.matrix, bounds, displayData.minVal, displayData.maxVal);
      recordRenderTime(performance.now() - start);
    },
    dependencies: [displayData],
  });

  return <div ref={containerRef} className="h-full w-full"><canvas ref={canvasRef} /></div>;
}
