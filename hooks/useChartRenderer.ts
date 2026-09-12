'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { setupHiDPICanvas } from '../lib/canvasUtils';

interface UseChartRendererOptions {
  onRender: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  dependencies?: any[];
  pauseWhenHidden?: boolean;
}

export function useChartRenderer({
  onRender,
  dependencies = [],
  pauseWhenHidden = true,
}: UseChartRendererOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 600,
    height: 300,
  });
  const isVisibleRef = useRef(true);
  const animFrameIdRef = useRef<number | null>(null);
  const lastRenderAtRef = useRef(0);
  const onRenderRef = useRef(onRender);

  onRenderRef.current = onRender;

  // Observe container dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({
            width: Math.floor(width),
            height: Math.floor(height),
          });
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Track viewport visibility (Modern Web Guidance: efficient background processing)
  useEffect(() => {
    if (!pauseWhenHidden) return;
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisibleRef.current = entry.isIntersecting;
        }
      },
      { rootMargin: '150px' } // pre-render buffer before scrolling into view
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [pauseWhenHidden]);

  // Request Animation Frame execution
  const render = useCallback(() => {
    if (!isVisibleRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const now = performance.now();
    const frameBudgetMs = 1000 / 24;
    if (now - lastRenderAtRef.current < frameBudgetMs) {
      animFrameIdRef.current = requestAnimationFrame(render);
      return;
    }
    lastRenderAtRef.current = now;

    const { width, height } = dimensions;
    if (width <= 0 || height <= 0) return;

    const { ctx } = setupHiDPICanvas(canvas, width, height);
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    onRenderRef.current(ctx, width, height);
  }, [dimensions]);

  useEffect(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [render, ...dependencies]);

  return {
    canvasRef,
    containerRef,
    dimensions,
    renderNow: render,
  };
}
