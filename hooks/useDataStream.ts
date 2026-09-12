'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AggregatedBucket, AggregationPeriod, DataPoint } from '../lib/types';
import {
  generateStreamingBatch,
  appendSlidingWindow,
  aggregateDataPoints,
} from '../lib/dataGenerator';

interface UseDataStreamOptions {
  initialData?: DataPoint[];
  defaultCapacity?: number;
  defaultStreamSpeed?: number;
  aggregationPeriod?: AggregationPeriod;
}

export function useDataStream({
  initialData = [],
  defaultCapacity = 10000,
  defaultStreamSpeed = 100,
  aggregationPeriod = 'raw',
}: UseDataStreamOptions = {}) {
  const [data, setData] = useState<DataPoint[]>(() =>
    initialData.length > 0 ? initialData : []
  );
  const MAX_DATA_POINTS = 10000;
  const MIN_STREAM_SPEED = 80;
  const SAFE_STREAM_SPEED = Math.max(MIN_STREAM_SPEED, defaultStreamSpeed);

  const [capacity, setCapacity] = useState<number>(Math.min(defaultCapacity, MAX_DATA_POINTS));
  const [streamSpeed, setStreamSpeed] = useState<number>(SAFE_STREAM_SPEED);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [stressTest, setStressTest] = useState<boolean>(false);
  const [aggregatedBuckets, setAggregatedBuckets] = useState<AggregatedBucket[]>([]);
  const [heatmapData, setHeatmapData] = useState<{
    matrix: number[][];
    minVal: number;
    maxVal: number;
  }>({
    matrix: [],
    minVal: 0,
    maxVal: 1000,
  });

  const workerRef = useRef<Worker | null>(null);
  const dataRef = useRef<DataPoint[]>(data);
  dataRef.current = data;

  const lastValueRef = useRef<number>(500);

  // Initialize Web Worker for background aggregations
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const worker = new Worker('/dataWorker.js');
      worker.onmessage = (e) => {
        const { type, result, matrix, minVal, maxVal } = e.data;
        if (type === 'AGGREGATE_RESULT') {
          setAggregatedBuckets(result);
        } else if (type === 'HEATMAP_RESULT') {
          setHeatmapData({ matrix, minVal, maxVal });
        }
      };
      workerRef.current = worker;
    } catch (err) {
      console.warn('Web Worker initialization failed, using main thread fallback:', err);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Request worker aggregation when data or period changes
  const updateWorkerCalculations = useCallback(
    (currentPoints: DataPoint[], period: AggregationPeriod) => {
      if (workerRef.current) {
        if (period !== 'raw') {
          workerRef.current.postMessage({
            type: 'AGGREGATE',
            payload: { points: currentPoints, period },
          });
        }
        workerRef.current.postMessage({
          type: 'HEATMAP_MATRIX',
          payload: { points: currentPoints, rows: 7, cols: 24 },
        });
      } else {
        // Fallback for environments without worker
        if (period !== 'raw') {
          setAggregatedBuckets(aggregateDataPoints(currentPoints, period));
        }
      }
    },
    []
  );

  // Initial calculation
  useEffect(() => {
    if (data.length > 0) {
      updateWorkerCalculations(data, aggregationPeriod);
    }
  }, [aggregationPeriod]);

  // Main streaming loop
  useEffect(() => {
    if (!isStreaming) return;

    const intervalMs = stressTest ? 80 : Math.max(MIN_STREAM_SPEED, streamSpeed);
    const batchSize = stressTest ? 10 : Math.max(5, Math.round(1000 / intervalMs));

    const timer = setInterval(() => {
      const { points: newPoints, nextValue } = generateStreamingBatch(
        batchSize,
        Date.now(),
        lastValueRef.current
      );
      lastValueRef.current = nextValue;

      setData((prev) => {
        const safeCapacity = Math.min(capacity, MAX_DATA_POINTS);
        const updated = appendSlidingWindow(prev, newPoints, safeCapacity);
        return updated;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isStreaming, streamSpeed, capacity, stressTest]);

  // Periodically refresh worker aggregations at reduced frequency (1Hz) to conserve CPU
  useEffect(() => {
    if (!isStreaming) return;
    const refreshTimer = setInterval(() => {
      updateWorkerCalculations(dataRef.current, aggregationPeriod);
    }, 1000);
    return () => clearInterval(refreshTimer);
  }, [isStreaming, aggregationPeriod, updateWorkerCalculations]);

  // Controls
  const toggleStreaming = useCallback(() => setIsStreaming((prev) => !prev), []);
  const resetData = useCallback((newPoints: DataPoint[]) => {
    setData(newPoints);
    updateWorkerCalculations(newPoints, aggregationPeriod);
  }, [aggregationPeriod, updateWorkerCalculations]);

  const toggleStressTest = useCallback(() => {
    setStressTest((prev) => !prev);
  }, []);

  return {
    data,
    capacity,
    setCapacity,
    streamSpeed,
    setStreamSpeed,
    isStreaming,
    toggleStreaming,
    stressTest,
    toggleStressTest,
    aggregatedBuckets,
    heatmapData,
    resetData,
  };
}
