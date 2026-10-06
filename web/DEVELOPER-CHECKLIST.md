# RoadRescue Developer Checklist

## UI Consistency for New Pages

Use this checklist when creating new dashboard pages to ensure mobile/desktop consistency.

### Page Structure

- [ ] Import `MainContainer` from `@/components/responsive/ResponsiveWrappers`
- [ ] Wrap page content with `<MainContainer>`
- [ ] Remove any custom padding (handled by MainContainer)

```jsx
import { MainContainer } from '@/components/responsive/ResponsiveWrappers'

export default function NewPage() {
  return (
    <MainContainer>
      {/* Page content automatically has correct padding */}
      <h1>Page Title</h1>
    </MainContainer>
  )
}
```

### Mobile Responsiveness

- [ ] Test page on mobile (< 768px)
- [ ] Verify content doesn't overlap with bottom nav
- [ ] Check that navigation items are in BottomNav (role-based)
- [ ] Ensure touch targets are at least 44x44px using `MobileSafeButton`
- [ ] Verify images scale properly

### Desktop Responsiveness  

- [ ] Test page on desktop (≥ 768px)
- [ ] Verify top navbar navigation is visible
- [ ] Check that bottom nav is hidden
- [ ] Footer is visible and properly styled

### Component Usage

**For Buttons:**
```jsx
import { MobileSafeButton } from '@/components/mobile/MobileOptimized'

<MobileSafeButton onClick={handleClick}>
  Click me
</MobileSafeButton>
```

**For Cards:**
```jsx
import { ResponsiveCard } from '@/components/mobile/MobileOptimized'

<ResponsiveCard>
  Card content
</ResponsiveCard>
```

**For Grids:**
```jsx
import { ResponsiveGrid } from '@/components/mobile/MobileOptimized'

<ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }}>
  <Item />
  <Item />
  <Item />
</ResponsiveGrid>
```

**For Mobile/Desktop Conditional Content:**
```jsx
import { MobileOnly, DesktopOnly } from '@/components/responsive/ResponsiveWrappers'

<MobileOnly>
  Mobile content here
</MobileOnly>

<DesktopOnly>
  Desktop content here
</DesktopOnly>
```

### Navigation Updates

- [ ] New role/route? Update `BottomNav.jsx` `driverNav` or `mechanicNav` arrays
- [ ] New navigation item? Add to `BottomNav.jsx`
- [ ] Protect page routes with `RBACProtectedPage` wrapper

### Testing Requirements

#### Mobile (< 768px)
- [ ] Bottom nav shows all items for role
- [ ] Active route highlighted in gold (#F5D108)
- [ ] No content overlap with bottom nav
- [ ] All buttons are touchable (44x44px minimum)
- [ ] Text is readable (at least 16px base font size)

#### Tablet (768px - 1024px)
- [ ] Navigation smoothly transitions
- [ ] Spacing adjusts properly
- [ ] Layout reflows correctly

#### Desktop (> 1024px)
- [ ] Top navigation links visible
- [ ] Bottom nav hidden
- [ ] Full navbar with all controls present
- [ ] Footer visible

### Performance Considerations

- [ ] Use lazy loading for images: `<ResponsiveImage loading="lazy" />`
- [ ] Avoid large payload for mobile devices
- [ ] Use responsive images for different screen sizes
- [ ] Test network throttling (3G) on mobile

### Accessibility

- [ ] Navigation buttons have proper labels
- [ ] Active navigation state clearly visible
- [ ] Touch targets are 44x44px minimum
- [ ] Color contrast meets WCAG AA standards
- [ ] Form inputs are properly labeled

### Common Gotchas

❌ **DON'T**: Add custom `pb-6` padding (use MainContainer)
❌ **DON'T**: Hide navigation on mobile/show on desktop manually
❌ **DON'T**: Create small buttons (< 44x44px on mobile)
❌ **DON'T**: Assume same layout for mobile and desktop

✅ **DO**: Use responsive components from `@/components/responsive/*`
✅ **DO**: Use mobile-optimized components from `@/components/mobile/*`
✅ **DO**: Test on actual mobile devices
✅ **DO**: Use Tailwind's responsive prefixes (md:, lg:)

### Deployment Checklist

Before deploying:
- [ ] Responsive design tested on all breakpoints
- [ ] Mobile bottom nav working on all pages
- [ ] No console errors on mobile
- [ ] Touch events working properly
- [ ] Navigation state properly maintained
- [ ] All role-based routes accessible correctly

### Resources

- **UI Consistency Guide**: `UI-CONSISTENCY.md`
- **Responsive Wrappers**: `@/components/responsive/ResponsiveWrappers.jsx`
- **Mobile Optimized Components**: `@/components/mobile/MobileOptimized.jsx`
- **Bottom Navigation**: `@/components/layout/BottomNav.jsx`
- **RBAC Protection**: `@/components/auth/RBACProtected.jsx`
