# ThankATech Typography & Icon Design System

## Font Size Hierarchy (Mobile-First Responsive)

### Headers
- **Main Hero Title**: `text-2xl sm:text-3xl lg:text-4xl` (32px → 48px → 64px)
- **Section Headers**: `text-xl sm:text-2xl` (24px → 32px)
- **Card Titles**: `text-lg sm:text-xl lg:text-2xl` (18px → 24px → 32px)
- **Subsection Headers**: `text-base sm:text-lg` (16px → 18px)

### Body Text
- **Large Body**: `text-base sm:text-lg` (16px → 18px)
- **Normal Body**: `text-sm sm:text-base` (14px → 16px)
- **Small Text**: `text-xs sm:text-sm` (12px → 14px)
- **Micro Text**: `text-xs` (12px) - captions, labels

### Interactive Elements
- **Button Text**: `text-sm sm:text-base` (14px → 16px)
- **Link Text**: `text-sm sm:text-base` (14px → 16px)
- **Tab Text**: `text-xs sm:text-sm` (12px → 14px)

## Icon Size Standards

### Logo & Brand
- **Main Logo Icon**: `text-base sm:text-xl` (16px → 24px)
- **Favicon Size**: 16x16, Apple Touch 180x180

### UI Icons
- **Navigation Icons**: `text-base sm:text-lg` (16px → 18px)
- **Category Badge Icons**: `text-base sm:text-lg` (16px → 18px)
- **Action Button Icons**: `text-base sm:text-lg` (16px → 18px)
- **Status Icons**: `text-sm sm:text-base` (14px → 16px)

### Decorative & Hero Icons
- **Empty State Icons**: `text-2xl sm:text-3xl lg:text-4xl` (32px → 48px → 64px)
- **Feature Icons**: `text-xl sm:text-2xl` (24px → 32px)
- **Info Panel Icons**: `text-base sm:text-lg` (16px → 18px)

### Achievement & Badges
- **Badge Icons**: `text-sm sm:text-base` (14px → 16px)
- **Points Display**: `text-xs sm:text-sm` (12px → 14px)
- **Metric Icons**: `text-sm` (14px)

## Mobile Touch Target Standards

### Minimum Sizes (iOS Guidelines)
- **All Interactive Elements**: `min-h-[44px]` (44px minimum)
- **Button Padding**: `px-4 py-3` minimum for mobile
- **Icon Containers**: `w-8 h-8` minimum (32px)

### Mobile-Specific Classes
```css
.mobile-btn {
  padding: 0.875rem 1.5rem; /* 14px 24px */
  font-size: 1rem; /* 16px */
  border-radius: 0.75rem; /* 12px */
  min-height: 44px;
  touch-action: manipulation;
}
```

## Emoji & Icon Best Practices

### Emoji Rendering
- Always use proper fallback fonts: `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Emoji"`
- Consistent emoji size within context groups
- Use semantic HTML when possible

### Icon Accessibility
- Provide `aria-label` for icon-only buttons
- Use `role="img"` for decorative icons
- Ensure sufficient color contrast

## Responsive Breakpoints

### Size Progression
- **Mobile**: Base size (320px+)
- **Tablet**: `sm:` prefix (640px+)
- **Desktop**: `lg:` prefix (1024px+)
- **Large Desktop**: `xl:` prefix (1280px+)

### Common Patterns
- Icons: `text-base sm:text-lg`
- Titles: `text-lg sm:text-xl lg:text-2xl`
- Body: `text-sm sm:text-base`
- Captions: `text-xs sm:text-sm`

## Quality Checklist

✅ All interactive elements meet 44px minimum
✅ Font sizes progress logically across breakpoints
✅ Icons are consistent within feature groups
✅ Sufficient color contrast maintained
✅ Responsive patterns follow mobile-first approach
✅ Touch targets are appropriately sized
✅ Text remains readable at all screen sizes

## Implementation Notes

- Use consistent class patterns across components
- Test on actual devices, not just browser dev tools
- Consider text scaling accessibility settings
- Maintain visual hierarchy at all screen sizes
- Keep icon meanings intuitive and culturally appropriate

Last Updated: October 2, 2025
Version: 1.28.1