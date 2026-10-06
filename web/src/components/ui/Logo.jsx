import React from 'react'

export default function Logo({ className = '', compact = false, title = 'RoadRescue' }) {
  return (
    <div className={`inline-flex items-center ${className}`} aria-hidden={false} role="img" aria-label={title}>
      <svg
        width="48"
        height="48"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <title>{title}</title>
        {/* Tow truck body */}
        <rect x="6" y="28" width="36" height="12" rx="2" fill="#0F172A" />
        {/* Cab */}
        <path d="M38 28h8l4 6v6" fill="#0F172A" />
        {/* Wheels */}
        <circle cx="18" cy="44" r="4" fill="#0F172A" />
        <circle cx="40" cy="44" r="4" fill="#0F172A" />

        {/* Tow arm */}
        <path d="M42 30 L54 22" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />

        {/* Signal arcs (gold) */}
        <path d="M54 16c-3 0-6 2-8 4" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M56 12c-5 0-10 4-12 6" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />

        {/* Dashed road under truck (gold dashes) */}
        <path d="M4 52 H60" stroke="#F59E0B" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
      </svg>

      {!compact && (
        <span className="ml-3 select-none font-display text-lg font-bold tracking-wide">
          <span className="text-[#0F172A]">ROAD</span>
          <span className="text-[#F59E0B]">RESCUE</span>
        </span>
      )}
    </div>
  )
}
