import type { Viewport } from 'next';

/**
 * Public front-desk pages are phone-first: `viewport-fit=cover` exposes the
 * iOS safe-area insets, and `interactive-widget=resizes-content` makes Android
 * Chrome shrink the layout viewport (and so `100dvh`) when the keyboard opens.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: '#047857',
};

export default function FrontDeskLayout({ children }: { children: React.ReactNode }) {
  return children;
}
