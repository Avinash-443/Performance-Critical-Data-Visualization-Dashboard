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

function buildHeatmapData(points: DataPoint[]) {
  const rows = 7;
  const cols = 24;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const counts = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (const point of points) {
    const date = new Date(point.timestamp);
    const row = date.getDay() % rows;
    const col = date.getHours() % cols;
    matrix[row][col] += point.value;
    counts[row][col]++;
  }

  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      matrix[row][col] = counts[row][col]
        ? Math.round(matrix[row][col] / counts[row][col])
        : 0;
      minVal = Math.min(minVal, matrix[row][col]);
      maxVal = Math.max(maxVal, matrix[row][col]);
    }
  }

  return {
    matrix,
    minVal: minVal === Infinity ? 0 : minVal,
    maxVal: maxVal === -Infinity ? 1000 : maxVal,
  };
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
      const displayPeriod: AggregationPeriod = period === 'raw' ? '1min' : period;
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'AGGREGATE',
          payload: { points: currentPoints, period: displayPeriod },
        });
        workerRef.current.postMessage({
          type: 'HEATMAP_MATRIX',
          payload: { points: currentPoints, rows: 7, cols: 24 },
        });
      } else {
        setAggregatedBuckets(aggregateDataPoints(currentPoints, displayPeriod));
        setHeatmapData(buildHeatmapData(currentPoints));
      }
    },
    []
  );

  // Initial calculation
  useEffect(() => {
    if (data.length > 0) {
      const displayPeriod: AggregationPeriod = aggregationPeriod === 'raw' ? '1min' : aggregationPeriod;
      setAggregatedBuckets(aggregateDataPoints(data, displayPeriod));
      setHeatmapData(buildHeatmapData(data));
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
    const displayPeriod: AggregationPeriod = aggregationPeriod === 'raw' ? '1min' : aggregationPeriod;
    setAggregatedBuckets(aggregateDataPoints(newPoints, displayPeriod));
    setHeatmapData(buildHeatmapData(newPoints));
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
