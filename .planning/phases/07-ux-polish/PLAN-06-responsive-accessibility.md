---
phase: "07-ux-polish"
plan: "06"
title: "Responsive & Accessibility Polish"
wave: 3
autonomous: false
checkpoint_after: "Task 3"
must_haves:
  truths:
    - "All pages work on mobile, tablet, and desktop breakpoints"
    - "Keyboard navigation works for all interactive elements"
    - "Screen reader can navigate all major flows"
    - "Focus indicators are visible on all focusable elements"
  artifacts:
    - path: "src/app/globals.css"
      description: "Responsive utilities and focus styles"
      min_lines: 100
  key_links:
    - from: "All interactive components"
      to: "Focus styles"
      via: "CSS focus-visible"
---

# Plan 06: Responsive & Accessibility Polish

## Objective

Ensure the application works across all breakpoints and meets accessibility standards.

## Context

This is the final polish phase. We verify:
- Responsive behavior at mobile (320px), tablet (768px), desktop (1280px)
- Keyboard navigation for all interactive elements
- Screen reader compatibility (VoiceOver/NVDA basics)
- Focus indicators for accessibility

### Breakpoints
- **Mobile**: < 768px (single column, drawer filters)
- **Tablet**: 768px - 1279px (two columns, adapted grid)
- **Desktop**: ≥ 1280px (full layout, sidebar filters)

### Accessibility Requirements (WCAG AA)
- Color contrast ≥ 4.5:1 for text
- Focus indicators visible
- Keyboard navigable
- Screen reader friendly

## Tasks

### Task 1: Add Focus Visible Styles
**File**: `src/app/globals.css`

Add clear focus indicators:
```css
/* Focus styles for accessibility */
*:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Remove outline for mouse users */
*:focus:not(:focus-visible) {
  outline: none;
}

/* Custom focus for buttons */
.focus-ring:focus-visible {
  ring: 2px;
  ring-offset: 2px;
  ring-color: hsl(var(--primary));
}
```

**Verification**: Tab through page shows clear focus indicators.

### Task 2: Test Mobile Breakpoint
**Manual testing with notes**

Test at 375px width:
1. Property grid → single column ✓
2. Filter drawer → bottom sheet ✓
3. Property detail → stacked layout ✓
4. Wizard → full-width steps ✓
5. Landlord dashboard → stacked cards ✓

Document any issues for fixing.

**Verification**: All pages functional at mobile size.

### Task 3: Test Tablet Breakpoint
**Manual testing with notes**

Test at 768px width:
1. Property grid → 2 columns
2. Filters → sidebar or top bar
3. Property detail → adapted layout
4. Dashboard → 2-column grid

Document any issues for fixing.

**Verification**: All pages functional at tablet size.

**CHECKPOINT**: Pause for user review of responsive testing.

### Task 4: Keyboard Navigation Audit
**Manual testing**

Test keyboard navigation (Tab, Enter, Escape, Arrow keys):
1. Property cards → focusable, Enter opens detail
2. Filter controls → all accessible via Tab
3. Wizard steps → Tab through fields, Enter submits
4. Modals/Drawers → Escape closes, focus trapped
5. Accordions → Enter/Space toggles

**Verification**: All interactive elements keyboard accessible.

### Task 5: Screen Reader Basics
**Testing with VoiceOver (Mac) or NVDA**

Verify:
1. Page headings read correctly (h1, h2, h3 hierarchy)
2. Images have alt text
3. Buttons have accessible names
4. Form labels associated with inputs
5. Dynamic content announced (live regions)

**Verification**: Major flows navigable with screen reader.

### Task 6: Fix Identified Issues
**Based on testing results**

Common fixes:
- Add missing aria-labels
- Fix heading hierarchy
- Add alt text to images
- Ensure button names are descriptive
- Add skip links if needed

**Verification**: All identified issues resolved.

### Task 7: Color Contrast Verification
**File**: Various components

Check contrast ratios:
- Text on backgrounds ≥ 4.5:1
- Large text ≥ 3:1
- Interactive elements ≥ 3:1

Tools: Chrome DevTools Accessibility panel, or axe extension.

**Verification**: All text meets WCAG AA contrast.

### Task 8: Final Responsive Polish
**Files**: Various components

Fix any remaining responsive issues:
- Overflow on small screens
- Touch targets ≥ 44px
- Proper spacing at all breakpoints
- Text doesn't overflow containers

**Verification**: Polished experience at all breakpoints.

## Verification Checklist

- [ ] Focus indicators visible on all interactive elements
- [ ] Mobile (375px) - all pages work
- [ ] Tablet (768px) - all pages work
- [ ] Desktop (1280px) - all pages work
- [ ] Keyboard navigation complete
- [ ] Screen reader navigable
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets adequate

## Output

After completion:
1. Fully responsive application
2. Accessible to keyboard and screen reader users
3. WCAG AA compliance achieved
4. Phase 7 complete - MVP ready!
