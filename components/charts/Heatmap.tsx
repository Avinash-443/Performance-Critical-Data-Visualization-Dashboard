'use client';

import { useData } from '@/components/providers/DataProvider';
import { useChartRenderer } from '@/hooks/useChartRenderer';
import { renderCanvasHeatmap } from '@/lib/canvasUtils';

export function Heatmap() {
  const { heatmapData, recordRenderTime } = useData();

  const { canvasRef, containerRef } = useChartRenderer({
    dependencies: [heatmapData],
    onRender: (ctx, width, height) => {
      const start = performance.now();
      const padding = 12;
      const bounds = { x: padding, y: padding, width: width - padding * 2, height: height - padding * 2 };
      ctx.fillStyle = '#10112e';
      ctx.fillRect(0, 0, width, height);

      if (!heatmapData.matrix.length) {
        recordRenderTime(performance.now() - start);
        return;
      }

      renderCanvasHeatmap(ctx, heatmapData.matrix, bounds, heatmapData.minVal, heatmapData.maxVal);
      recordRenderTime(performance.now() - start);
    },
  });

  return <div ref={containerRef} className="h-full w-full"><canvas ref={canvasRef} /></div>;
}
