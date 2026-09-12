import { PerformanceMetrics } from './types';

export class FPSTracker {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private frameTimes: number[] = [];
  private maxHistory = 60;
  private droppedFrames = 0;

  public tick(currentTime: number): { fps: number; frameTime: number; dropped: number } {
    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (delta > 0) {
      const instantaneousFps = 1000 / delta;
      this.frameTimes.push(delta);
      if (this.frameTimes.length > this.maxHistory) {
        this.frameTimes.shift();
      }

      // Frame time > 20ms implies a dropped 60fps frame
      if (delta > 20) {
        this.droppedFrames++;
      }

      // Calculate rolling average
      const sum = this.frameTimes.reduce((acc, v) => acc + v, 0);
      const avgDelta = sum / this.frameTimes.length;
      this.fps = Math.min(60, Math.round(1000 / avgDelta));
    }

    return {
      fps: this.fps,
      frameTime: this.frameTimes.length > 0 ? this.frameTimes[this.frameTimes.length - 1] : 16.6,
      dropped: this.droppedFrames,
    };
  }

  public reset(): void {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 60;
    this.frameTimes = [];
    this.droppedFrames = 0;
  }
}

export function getHeapMemoryUsage(): { usedMB: number; totalMB: number } {
  if (typeof window !== 'undefined' && (performance as any).memory) {
    const mem = (performance as any).memory;
    return {
      usedMB: Math.round((mem.usedJSHeapSize / (1024 * 1024)) * 10) / 10,
      totalMB: Math.round((mem.jsHeapSizeLimit / (1024 * 1024)) * 10) / 10,
    };
  }
  // Estimated baseline memory for environments where performance.memory is unavailable
  return {
    usedMB: 42.5,
    totalMB: 2048,
  };
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

export function formatMs(ms: number): string {
  return `${ms.toFixed(1)}ms`;
}

export function formatTimestamp(ts: number, includeSeconds = true): string {
  const d = new Date(ts);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  if (!includeSeconds) return `${hours}:${minutes}`;
  const seconds = d.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
