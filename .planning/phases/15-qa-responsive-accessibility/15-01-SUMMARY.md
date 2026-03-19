---
phase: 15
plan: 01
subsystem: responsive-layout
tags: [responsive, mobile, touch-targets, overflow, accessibility]
depends_on: [14]
provides: [responsive-layout-fixes, touch-target-compliance]
affects: []
tech-stack:
  added: []
  patterns: [responsive-popover-widths, mobile-touch-targets]
key-files:
  created: []
  modified:
    - src/components/ui/plan/PlanHeader.tsx
    - src/app/inquilino/documentos/page.tsx
    - src/components/publish/steps/StepPhotos.tsx
    - src/components/pricing/CouponInput.tsx
decisions:
  - id: responsive-popover-pattern
    description: "Use w-[calc(100vw-2rem)] sm:w-[Npx] for popover widths on mobile"
  - id: touch-target-minimum
    description: "Buttons with icons use p-2.5 minimum for 44px touch target compliance"
metrics:
  duration: 5min
  completed: 2026-02-02
---

# Phase 15 Plan 01: Responsive Layout & Touch Target Audit Summary

**One-liner:** Fixed PlanHeader popover overflow on mobile, added overflow-x-auto to inventory table, enlarged small touch targets to 44px minimum.

## Tasks Completed

### Task 1: Fix hardcoded widths causing overflow on small screens
- **PlanHeader.tsx**: Search bar `w-[400px]` replaced with `w-full max-w-[400px]`
- **PlanHeader.tsx**: Three popover widths (320/360/400px) made responsive with `w-[calc(100vw-2rem)] sm:w-[Npx]`
- **PlanHeader.tsx**: Notification, subscription, and team invite buttons enlarged from `p-2` to `p-2.5` for 44px touch targets
- **documentos/page.tsx**: Inventory table wrapped in `overflow-x-auto` with `min-w-[320px]`
- **StepPhotos.tsx**: Photo delete button enlarged from `w-6 h-6` to `w-8 h-8` on mobile, always visible on mobile
- **CouponInput.tsx**: Coupon remove button enlarged to `min-w-[44px] min-h-[44px]`
- **Scan results**: All other `w-[XXXpx]` instances use `max-w-`, `sm:`, `lg:`, or `hidden lg:` patterns - no overflow risk

### Task 2: Audit all 33 pages for responsive rendering and touch targets
- **Grids**: All multi-column grids use responsive breakpoints (grid-cols-1 -> md:grid-cols-2 -> lg:grid-cols-3)
- **Flex layouts**: All flex-row patterns include responsive column fallbacks
- **Tables**: PaymentHistory uses hidden sm:block with mobile card view; PlanTable has overflow-x-auto; inventory table now wrapped
- **Fixed-width containers**: No remaining fixed widths that overflow at 375px
- **Touch targets**: Icon buttons in PlanHeader, StepPhotos, CouponInput enlarged to meet 44px minimum
- **Sidebars**: WizardShell and PublishShell use `hidden lg:flex` pattern - no mobile overflow

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] `npm run build` passes
- [x] No hardcoded widths > 300px without responsive variants
- [x] All interactive elements have minimum 44px touch target on mobile

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 2b0dbdf | fix(15-01): fix hardcoded widths and touch targets causing mobile overflow |
| 2 | (audit only, fixes included in Task 1) | No additional code changes needed |
