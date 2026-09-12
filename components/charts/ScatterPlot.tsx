'use client';

import { useMemo } from 'react';
import { useData } from '@/components/providers/DataProvider';
import { useChartRenderer } from '@/hooks/useChartRenderer';
import { renderCanvasScatterPlot } from '@/lib/canvasUtils';

export function ScatterPlot() {
  const { filteredData, recordRenderTime } = useData();

  const chart = useMemo(() => {
    const source = filteredData.slice(-1000);
    const stride = Math.max(1, Math.ceil(source.length / 600));
    const data = source.filter((_, index) => index % stride === 0);

    if (data.length === 0) {
      return { data, scale: { minX: 0, maxX: 1000, minY: 0, maxY: 1000 } };
    }

    let maxValue = 0;
    let maxSecondaryValue = 0;
    for (const point of data) {
      maxValue = Math.max(maxValue, point.value);
      maxSecondaryValue = Math.max(maxSecondaryValue, point.secondaryValue);
    }

    return {
      data,
      scale: {
        minX: 0,
        maxX: Math.max(100, Math.ceil(maxValue / 100) * 100),
        minY: 0,
        maxY: Math.max(100, Math.ceil(maxSecondaryValue / 100) * 100),
      },
    };
  }, [filteredData]);

  const { canvasRef, containerRef } = useChartRenderer({
    dependencies: [chart],
    onRender: (ctx, width, height) => {
      const start = performance.now();
      const padding = 22;
      const bounds = { x: padding, y: 16, width: width - padding * 2, height: height - 38 };
      ctx.fillStyle = '#10112e';
      ctx.fillRect(0, 0, width, height);

      if (chart.data.length === 0) {
        recordRenderTime(performance.now() - start);
        return;
      }

      renderCanvasScatterPlot(ctx, chart.data, bounds, chart.scale, { pointRadius: 2.5 });
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${chart.data.length} points`, width - 82, 18);
      recordRenderTime(performance.now() - start);
    },
  });

  return <div ref={containerRef} className="h-full w-full"><canvas ref={canvasRef} /></div>;
}
