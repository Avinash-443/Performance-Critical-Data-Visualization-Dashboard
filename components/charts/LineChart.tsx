'use client';

import { useMemo } from 'react';
import { useData } from '@/components/providers/DataProvider';
import { useChartRenderer } from '@/hooks/useChartRenderer';
import { renderCanvasLineChart, downsampleLTTB } from '@/lib/canvasUtils';

export function LineChart() {
  const { filteredData, recordRenderTime } = useData();

  const chartData = useMemo(() => {
    if (filteredData.length > 2000) {
      return downsampleLTTB(filteredData, 1200);
    }
    return filteredData;
  }, [filteredData]);

  const { canvasRef, containerRef } = useChartRenderer({
    dependencies: [chartData],
    onRender: (ctx, width, height) => {
      const start = performance.now();
      const padding = 22;
      const bounds = { x: padding, y: 10, width: width - padding * 2, height: height - 30 };

      ctx.fillStyle = '#10112e';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(167, 151, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const y = bounds.y + (bounds.height / 4) * i;
        ctx.moveTo(bounds.x, y);
        ctx.lineTo(bounds.x + bounds.width, y);
      }
      ctx.stroke();

      if (chartData.length === 0) {
        recordRenderTime(performance.now() - start);
        return;
      }

      const values = chartData.map((p) => p.value);
      const minY = 0;
      const maxY = 1000;
      const minX = chartData[0].timestamp;
      const maxX = chartData[chartData.length - 1].timestamp;
      const scale = { minX, maxX: Math.max(maxX, minX + 1), minY, maxY };

      renderCanvasLineChart(ctx, chartData, bounds, scale, {
        strokeColor: '#6ee7ff',
        lineWidth: 2.2,
        showArea: true,
        areaColorTop: 'rgba(110, 231, 255, 0.38)',
        areaColorBottom: 'rgba(110, 231, 255, 0.02)',
      });

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${chartData.length} samples`, width - 108, 18);
      recordRenderTime(performance.now() - start);
    },
  });

  return <div ref={containerRef} className="h-full w-full"><canvas ref={canvasRef} /></div>;
}
