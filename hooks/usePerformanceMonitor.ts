'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PerformanceMetrics } from '../lib/types';
import { FPSTracker, getHeapMemoryUsage } from '../lib/performanceUtils';

export function usePerformanceMonitor(streamSpeedMs = 100, activePointsCount = 10000) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.6,
    memoryUsage: 45,
    memoryLimit: 2048,
    renderTime: 1.2,
    dataProcessingTime: 0.8,
    droppedFrames: 0,
    totalPoints: activePointsCount,
    streamSpeedMs,
  });

  const trackerRef = useRef(new FPSTracker());
  const renderTimeRef = useRef(1.2);
  const dataProcessingTimeRef = useRef(0.8);
  const rafIdRef = useRef<number | null>(null);
  const lastStateUpdateRef = useRef(performance.now());

  const recordRenderTime = useCallback((durationMs: number) => {
    // Exponential moving average to smooth render time
    renderTimeRef.current = renderTimeRef.current * 0.8 + durationMs * 0.2;
  }, []);

  const recordDataProcessingTime = useCallback((durationMs: number) => {
    dataProcessingTimeRef.current = dataProcessingTimeRef.current * 0.8 + durationMs * 0.2;
  }, []);

  useEffect(() => {
    const tracker = trackerRef.current;

    const loop = (currentTime: number) => {
      const { fps, frameTime, dropped } = tracker.tick(currentTime);

      // Decouple 60fps telemetry sampling from React state:
      // Update React state at 4Hz (every 250ms) to prevent UI thrashing
      if (currentTime - lastStateUpdateRef.current >= 250) {
        lastStateUpdateRef.current = currentTime;
        const memory = getHeapMemoryUsage();

        setMetrics({
          fps,
          frameTime: Math.round(frameTime * 10) / 10,
          memoryUsage: memory.usedMB,
          memoryLimit: memory.totalMB,
          renderTime: Math.round(renderTimeRef.current * 10) / 10,
          dataProcessingTime: Math.round(dataProcessingTimeRef.current * 10) / 10,
          droppedFrames: dropped,
          totalPoints: activePointsCount,
          streamSpeedMs,
        });
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [activePointsCount, streamSpeedMs]);

  return {
    metrics,
    recordRenderTime,
    recordDataProcessingTime,
  };
}
