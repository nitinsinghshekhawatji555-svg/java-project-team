/**
 * Responsive Components Wrapper
 * Ensures mobile/desktop consistency across all pages
 */

'use client';

export function MobileOnly({ children, className = '' }) {
  return <div className={`md:hidden ${className}`}>{children}</div>;
}

export function DesktopOnly({ children, className = '' }) {
  return <div className={`hidden md:block ${className}`}>{children}</div>;
}

export function ResponsivePadding({ children }) {
  return (
    <div className="px-4 py-5 md:px-6 md:py-6">
      {children}
    </div>
  );
}

/**
 * Container for mobile with bottom nav padding
 * Automatically adds pb-24 on mobile, pb-6 on desktop
 */
export function MainContainer({ children }) {
  return (
    <main className="flex-1 px-4 py-5 pb-24 md:px-6 md:py-6 md:pb-6">
      {children}
    </main>
  );
}
