# Performance-Critical Data Visualization Dashboard

A high-performance real-time analytics dashboard built with Next.js 14 App Router and TypeScript. It renders large time-series datasets efficiently using canvas-based charting, background aggregation, and thoughtful React state management.

## Features

- Real-time streaming dataset updates at configurable intervals
- Canvas-based line, bar, scatter, and heatmap visualizations
- Time-range and aggregation controls
- Search and filtering by category, region, status, and node
- Virtualized live data table for large datasets
- FPS, render-time, memory, and dropped-frame telemetry
- Web worker-based aggregation for off-main-thread processing

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Canvas rendering utilities
- Web Workers

## Local Setup

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Production Build

```bash
npm run build
npm run start
```

## Performance Testing

1. Open the dashboard in a browser.
2. Toggle the Stress Test mode to increase streaming load.
3. Increase the point count to 25k or 50k.
4. Observe FPS, render timing, dropped frames, and heap usage.
5. Use browser DevTools to confirm the data remains responsive with no UI freeze.

## Browser Compatibility

This dashboard is intended for modern evergreen browsers with:

- Canvas 2D support
- ResizeObserver
- requestAnimationFrame
- Web Workers

Recommended browsers: Chrome, Edge, and Firefox latest versions.

## Next.js Performance Notes

- App Router shell keeps the dashboard as a client-driven interactive surface.
- Data processing is split between worker and UI layers to reduce renderer blocking.
- Heavy chart calculations are downsampled when large data volumes exceed viewport thresholds.
- Rendering is throttled to animation frames to keep updates smooth and stable.
