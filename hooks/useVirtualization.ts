'use client';

import { useState, useEffect, useCallback, useRef, UIEvent } from 'react';

interface UseVirtualizationOptions {
  totalItems: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualization({
  totalItems,
  itemHeight,
  containerHeight,
  overscan = 5,
}: UseVirtualizationOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const onScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
  const endIndex = Math.min(totalItems, startIndex + visibleCount);

  const totalHeight = totalItems * itemHeight;
  const offsetY = startIndex * itemHeight;

  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  return {
    containerRef,
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    onScroll,
    scrollToTop,
  };
}
