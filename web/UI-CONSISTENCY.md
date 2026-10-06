# RoadRescue UI Consistency Guide

## Responsive Navigation Architecture

This document outlines the UI/UX consistency standards for RoadRescue across desktop and mobile devices.

### Device Breakpoints

```
- Mobile: < 768px (md)
- Tablet: 768px - 1024px (md to lg)
- Desktop: > 1024px (lg)
```

---

## Navigation System

### Desktop (≥ 768px)
- **Top Navbar**: Full desktop navigation with:
  - Logo & branding
  - Navigation links (hidden on mobile)
  - Notifications bell
  - User profile card
  - Audio toggle
  - Sign out button
- **Layout**: Sidebar (if applicable) + Main content
- **Footer**: Full footer with branding and info

### Mobile (< 768px)
- **Top Navbar**: Compact version with:
  - Logo & branding only
  - Notifications bell
  - Audio toggle
  - Sign out button (compact)
  - **Navigation links: HIDDEN** (moved to bottom nav)
- **Bottom Navigation**: PWA-style bottom tab bar with:
  - Role-based menu items
  - Active state highlighting (amber color)
  - Fixed position at bottom
  - 80px height with 4-5 items max
- **Main Content**: Padding bottom: 6rem (pb-24) to accommodate bottom nav
- **Footer**: HIDDEN on mobile

---

## Layout Padding Guidelines

### Mobile Content Area
```jsx
<main className="flex-1 px-4 py-5 pb-24 md:px-6 md:py-6 md:pb-6">
  {children}
</main>
```

**Breakdown:**
- `px-4`: Horizontal padding (1rem = 16px)
- `py-5`: Vertical padding (1.25rem = 20px)
- `pb-24`: Bottom padding on mobile (6rem = 96px) for bottom nav
- `md:px-6`: Desktop horizontal padding (1.5rem = 24px)
- `md:py-6`: Desktop vertical padding (1.5rem = 24px)
- `md:pb-6`: Desktop bottom padding (1.5rem = 24px)

### Bottom Navigation Height
- Fixed height: `h-20` (5rem = 80px)
- Always at bottom: `fixed bottom-0`
- Full width: `left-0 right-0`
- Z-index: `z-40` (below modals/dropdowns at z-50)

---

## Color & Styling Consistency

### Active Navigation State
- **Color**: `text-[#F5D108]` (gold)
- **Background**: `bg-[#F5D108]` for active pill
- **Icon Size**: `size={19}` (1.2rem)
- **Label**: `text-[9.5px] font-black uppercase tracking-wider`

### Navigation Item Sizes
- **Driver mode**: 4 tabs with center SOS button
- **Mechanic mode**: 5 tabs evenly distributed
- **Admin mode**: No bottom nav (uses top navbar)

---

## Component Imports

### Use these responsive wrappers in pages:
```jsx
import { MainContainer, DesktopOnly, MobileOnly } from '@/components/responsive/ResponsiveWrappers'

export default function Page() {
  return (
    <MainContainer>
      <DesktopOnly>Desktop content here</DesktopOnly>
      <MobileOnly>Mobile content here</MobileOnly>
    </MainContainer>
  )
}
```

---

## Responsive Components

### BottomNav Component
- **Location**: `@/components/layout/BottomNav.jsx`
- **Props**: None (uses `useAuth()` for role, `usePathname()` for active link)
- **Visibility**: `md:hidden` (hidden on desktop)
- **Role-based items**:
  - **Driver**: Home, AI Assist, Activity, Profile (plus center SOS button)
  - **Mechanic**: Jobs, Requests, Navigation, Activity, Profile
  - **Admin**: No bottom nav

### Navbar Component
- **Location**: `@/components/layout/Navbar.jsx`
- **Desktop Navigation**: `hidden md:flex` (hidden on mobile)
- **Mobile Navigation**: Moved to BottomNav
- **Notifications**: Always visible, responsive dropdown

---

---

## Full-Bleed Map Layout Architecture (`FullBleedMapShell`)

Full-viewport map screens (`/dashboard/driver/explore` and `/dashboard/mechanic/navigation`) share the `@/components/map/FullBleedMapShell.jsx` layout container to ensure visual and functional parity.

```
┌─────────────────────────────────────────────────────────────┐
│  Top Floating Overlay (Z: 20)                              │
│  [Search Bar / Filter Pills] or [Duty Status Pill / Ping]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                           [Recenter Compass]│
│                  Full-Bleed Map Canvas    [Quick Action]    │
│                  (Leaflet, 100% Viewport) (Z: 500)          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Bottom Floating Overlay (Z: 600)                           │
│  [Selected Mechanic Drawer] or [Incident/Live Nav Details]  │
└─────────────────────────────────────────────────────────────┘
```

- **Props**:
  - `topOverlay`: ReactNode for top floating controls (search input, status pills).
  - `controlOverlay`: ReactNode for bottom-right action button stack (re-center compass, skip).
  - `children`: Leaflet `<MapContainer>` filling 100% height/width.
  - `bottomOverlay`: ReactNode for bottom drawer or floating telemetry sheet.
- **Scroll Handling**: Full-bleed pages pass `isFullHeightPage` in `web/src/app/dashboard/layout.jsx` to eliminate outer scrollbars and allow edge-to-edge touch gestures.

---

## Dashboard Card Grid & Mobile Density Standards

### Stat / Counter Cards
- **Mobile (< 768px)**: Render as a 2-column grid (`grid-cols-2`) with compact padding (`p-3.5 sm:p-4`), concise label subtitles, and scaled numbers (`text-2xl sm:text-3xl`).
- **Desktop (≥ 768px)**: Expand to a 3-column grid (`md:grid-cols-3`) with standard padding (`p-5`) and full descriptive subtitles.

### Reference-Only Cards
- Cards containing self-identity reference information (e.g. "Operation Center / Terminal identity node") are hidden on mobile using `hidden md:block` (breakpoint 768px) to eliminate dead card slots and elevate action items (assigned jobs and live dispatches) into the initial viewport fold.

---

## Testing Checklist

- [ ] Mobile (< 768px): Bottom nav visible, top nav compact
- [ ] Tablet (768px - 1024px): Transition point properly handled
- [ ] Desktop (> 1024px): Top nav with links visible, bottom nav hidden
- [ ] Bottom nav items responsive to 4-5 items
- [ ] Bottom nav doesn't overflow content
- [ ] Active state (amber) works on all items
- [ ] Notifications bell works on both desktop and mobile
- [ ] Footer hidden on mobile, visible on desktop
- [ ] No scrolling with bottom nav overlapping content
- [ ] Full-bleed maps occupy 100% space between header and bottom nav on mobile
- [ ] Counter cards render side-by-side (2 columns) on mobile

---

## Common Issues & Fixes

### Issue: Content hidden behind bottom nav
**Fix**: Add `pb-24 md:pb-6` to main content container

### Issue: Bottom nav not sticking to bottom
**Fix**: Ensure parent container has `min-h-screen` and use `fixed` positioning

### Issue: Bottom nav z-index conflicts
**Fix**: Ensure z-index is `z-40`, modals/dropdowns should be `z-50`

### Issue: Navigation items misaligned on mobile
**Fix**: Use `flex items-center justify-center` for consistent vertical centering

---

## Future Enhancements

- [ ] Implement slide-out menu for admin with many items
- [ ] Add swipe gestures for bottom nav (optional)
- [ ] Add toast notifications on mobile (no modal overlap)
- [ ] Implement offline indicator on mobile bottom nav

