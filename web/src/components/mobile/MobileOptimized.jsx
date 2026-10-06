/**
 * Mobile-Optimized Components & Utilities
 * OSE standards for better mobile UX
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

/**
 * ResponsiveGrid Component
 * Auto-adjusts columns based on screen size
 */
export function ResponsiveGrid({ children, cols = { mobile: 1, tablet: 2, desktop: 3 } }) {
  const colClasses = `grid gap-4 grid-cols-${cols.mobile} md:grid-cols-${cols.tablet} lg:grid-cols-${cols.desktop}`;
  return <div className={colClasses}>{children}</div>;
}

/**
 * ResponsiveImage Component
 * Optimizes image loading and sizing for mobile
 */
export function ResponsiveImage({ src, alt, priority = false, width, height, ...props }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width || 800}
      height={height || 600}
      priority={priority}
      className="w-full h-auto object-cover rounded-lg"
      {...props}
    />
  );
}

/**
 * MobileSafeButton Component
 * Larger touch targets on mobile (min 44x44px)
 */
export function MobileSafeButton({ children, className = '', ...props }) {
  const baseClasses = 'min-h-[44px] min-w-[44px] md:min-h-auto md:min-w-auto';
  return (
    <button className={`${baseClasses} ${className}`} {...props}>
      {children}
    </button>
  );
}

/**
 * ResponsiveCard Component
 * Adjusts padding and spacing for mobile
 */
export function ResponsiveCard({ children, className = '' }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 md:p-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * ResponsiveModal Component
 * Full-screen on mobile, modal on desktop
 */
export function ResponsiveModal({ isOpen, onClose, title, children, className = '' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:items-start md:justify-center md:pt-12">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative w-full md:w-auto md:max-w-md bg-white rounded-t-2xl md:rounded-lg shadow-lg max-h-[90vh] overflow-y-auto md:max-h-auto ${className}`}>
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 md:rounded-t-lg">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

import Select from '@/components/ui/Select';

/**
 * TouchFriendlySelect Component
 * Larger dropdown for better mobile usability
 */
export function TouchFriendlySelect({ options, onChange, defaultValue, label }) {
  return (
    <Select
      label={label}
      defaultValue={defaultValue}
      onChange={onChange}
      options={options}
      className="h-12 text-base md:h-10 md:text-sm"
    />
  );
}

/**
 * ResponsiveStack Component
 * Stack vertically on mobile, horizontally on desktop
 */
export function ResponsiveStack({ children, gap = 4, className = '' }) {
  const gapClass = `gap-${gap}`;
  return (
    <div className={`flex flex-col md:flex-row ${gapClass} ${className}`}>
      {children}
    </div>
  );
}

/**
 * SafeBottomSpacing Component
 * Adds safe spacing for bottom nav on mobile
 */
export function SafeBottomSpacing({ children, className = '' }) {
  return (
    <div className={`pb-24 md:pb-0 ${className}`}>
      {children}
    </div>
  );
}
