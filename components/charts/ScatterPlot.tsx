'use client';

import { useMemo } from 'react';
import { useData } from '@/components/providers/DataProvider';
import { useChartRenderer } from '@/hooks/useChartRenderer';
import { renderCanvasScatterPlot } from '@/lib/canvasUtils';

export function ScatterPlot() {
  const { filteredData, recordRenderTime } = useData();

  const data = useMemo(() => filteredData.slice(-1200), [filteredData]);

  const { canvasRef, containerRef } = useChartRenderer({
    dependencies: [data],
    onRender: (ctx, width, height) => {
      const start = performance.now();
      const padding = 22;
      const bounds = { x: padding, y: 16, width: width - padding * 2, height: height - 38 };
      ctx.fillStyle = '#10112e';
      ctx.fillRect(0, 0, width, height);

      if (data.length === 0) {
        recordRenderTime(performance.now() - start);
        return;
      }

      const scale = {
        minX: 0,
        maxX: 1000,
        minY: 0,
        maxY: 1000,
      };

      renderCanvasScatterPlot(ctx, data, bounds, scale, { pointRadius: 3 });
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('value / latency', width - 110, 18);
      recordRenderTime(performance.now() - start);
    },
  });

  return <div ref={containerRef} className="h-full w-full"><canvas ref={canvasRef} /></div>;
}
