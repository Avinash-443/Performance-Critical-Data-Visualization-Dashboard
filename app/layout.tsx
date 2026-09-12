import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Performance-Critical Data Visualization Dashboard',
  description: 'High-performance real-time dashboard built with Next.js App Router, TypeScript, and canvas rendering.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
