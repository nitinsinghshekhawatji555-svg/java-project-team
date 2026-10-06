'use client'

/**
 * FullBleedMapShell.jsx
 * Unified full-viewport map layout shell with layered floating overlay slots.
 * Shared across /dashboard/driver/explore and /dashboard/mechanic/navigation.
 */
export default function FullBleedMapShell({
  children, // The map canvas
  topOverlay,
  bottomOverlay,
  controlOverlay,
  className = '',
}) {
  return (
    <div className={`relative w-full h-full min-h-[calc(100dvh-4rem)] md:min-h-0 flex-1 flex flex-col overflow-hidden bg-[#F6F2E7] ${className}`}>
      
      {/* FLOATING TOP OVERLAY SLOT */}
      {topOverlay && (
        <div className="absolute top-4 left-4 right-4 z-20 max-w-lg mx-auto flex flex-col gap-2 pointer-events-auto">
          {topOverlay}
        </div>
      )}

      {/* FLOATING ACTION CONTROL STACK (Recenter, buttons) */}
      {controlOverlay && (
        <div className="absolute bottom-28 md:bottom-8 right-4 z-[500] pointer-events-auto flex flex-col items-end gap-2.5">
          {controlOverlay}
        </div>
      )}

      {/* FULL BLEED MAP CANVAS CONTAINER */}
      <div className="w-full h-full flex-1 relative z-0 min-h-[350px]">
        {children}
      </div>

      {/* FLOATING BOTTOM OVERLAY SLOT (Drawer / info panel) */}
      {bottomOverlay && (
        <div className="absolute bottom-0 left-0 right-0 z-[600] p-4 pb-24 md:pb-6 bg-gradient-to-t from-black/25 via-black/10 to-transparent pointer-events-none">
          <div className="max-w-lg mx-auto pointer-events-auto">
            {bottomOverlay}
          </div>
        </div>
      )}
    </div>
  )
}
