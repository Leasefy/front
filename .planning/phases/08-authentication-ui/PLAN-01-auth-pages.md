---
phase: "08-authentication-ui"
plan: "01"
title: "Auth Pages - Split Layout Design"
wave: 1
autonomous: true
must_haves:
  truths:
    - "Split-layout auth page exists with image left, form right"
    - "Login/Register tabs toggle between modes"
    - "Social login buttons (Google, Apple) are styled and prominent"
    - "Email/password form with validation"
    - "Testimonial overlay on image panel"
    - "Responsive: stacked on mobile, split on desktop"
  artifacts:
    - path: "src/app/auth/page.tsx"
      description: "Main auth page with split layout"
      min_lines: 100
    - path: "src/components/auth/AuthForm.tsx"
      description: "Login/Register form component"
      min_lines: 80
    - path: "src/components/auth/SocialButtons.tsx"
      description: "Social login buttons component"
      min_lines: 40
  key_links:
    - from: "auth/page.tsx"
      to: "AuthForm"
      via: "direct import"
    - from: "AuthForm"
      to: "SocialButtons"
      via: "composition"
---

# Plan 01: Auth Pages - Split Layout Design

## Objective

Create a beautiful, minimal authentication page with split-layout design following Luxterra aesthetic.

## Context

Based on user's reference image and requirements:
- Split layout: property image with testimonial (left), form (right)
- Login/Register toggle tabs
- Social login: Google, Apple
- Email/password form
- NO glass effects - clean, solid design
- Responsive behavior

### Design Specifications

**Left Panel (Desktop only):**
- Property image as background (from mock data)
- Dark overlay for readability
- Testimonial card floating on image
- Quote + name + role

**Right Panel:**
- White/light background
- Logo at top
- Login/Register tabs
- Social buttons (Google, Apple)
- "or continue with email" divider
- Email input
- Password input with show/hide
- Submit button
- Forgot password link (Login) / Terms checkbox (Register)

**Colors:**
- Background: #FBFBFB
- Card: white
- Primary gradient for CTA
- Dark grays for text

## Tasks

### Task 1: Create Auth Page Structure
**File**: `src/app/auth/page.tsx`

Create the split-layout page:
```tsx
// Split layout: image panel (left) + form panel (right)
// Responsive: form only on mobile, split on lg+
// Property image from mock data with overlay
// Testimonial card component

export default function AuthPage() {
  return (
    <div className="min-h-screen flex">
      {/* Image Panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        {/* Background image */}
        {/* Overlay */}
        {/* Testimonial card */}
      </div>

      {/* Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <AuthForm />
      </div>
    </div>
  )
}
```

**Verification**: Page renders with split layout on desktop.

### Task 2: Create Testimonial Component
**File**: `src/components/auth/Testimonial.tsx`

```tsx
interface TestimonialProps {
  quote: string
  name: string
  role: string
  avatar?: string
}

// Card with quote, name, role
// Positioned over image panel
// White/light card with shadow
```

**Verification**: Testimonial displays on image panel.

### Task 3: Create Social Buttons Component
**File**: `src/components/auth/SocialButtons.tsx`

```tsx
// Google button with icon
// Apple button with icon
// Styled buttons (not generic)
// Consistent with Luxterra design
// onClick handlers (mock for now)
```

Button styling:
- Border, not filled
- Icon + text
- Hover states
- Proper spacing

**Verification**: Social buttons render with proper styling.

### Task 4: Create Auth Form Component
**File**: `src/components/auth/AuthForm.tsx`

```tsx
// State: mode ('login' | 'register')
// Tab buttons to toggle mode
// Conditional fields based on mode
// Form validation with react-hook-form
// Submit handler (mock auth)

// Login mode:
// - Email input
// - Password input
// - "Forgot password?" link
// - Submit button

// Register mode:
// - Name input
// - Email input
// - Password input
// - Terms checkbox
// - Submit button
```

Form elements:
- Clean input styling (following design system)
- Error states
- Password visibility toggle
- Loading state on submit

**Verification**: Form switches between login/register with validation.

### Task 5: Create Input Components for Auth
**File**: `src/components/auth/AuthInput.tsx`

```tsx
// Email input with icon
// Password input with show/hide toggle
// Text input for name
// Consistent styling
// Error state display
```

**Verification**: Inputs have proper styling and functionality.

### Task 6: Add Divider Component
**File**: `src/components/auth/Divider.tsx`

```tsx
// "or continue with email" divider
// Line — text — line pattern
// Subtle styling
```

**Verification**: Divider renders between social buttons and form.

### Task 7: Wire Up Complete Auth Page
**File**: `src/app/auth/page.tsx`

Integrate all components:
1. Import all auth components
2. Add proper testimonial data
3. Select property image for background
4. Test responsive behavior
5. Add logo/branding at top of form

**Verification**: Complete auth page works on all breakpoints.

### Task 8: Add Auth Barrel Export
**File**: `src/components/auth/index.ts`

```tsx
export { AuthForm } from './AuthForm'
export { SocialButtons } from './SocialButtons'
export { Testimonial } from './Testimonial'
export { AuthInput } from './AuthInput'
export { Divider } from './Divider'
```

**Verification**: All auth components exported properly.

## Verification Checklist

- [ ] Split layout: image left, form right (desktop)
- [ ] Mobile: form only, centered
- [ ] Testimonial card on image panel
- [ ] Login/Register tabs work
- [ ] Social buttons styled (Google, Apple)
- [ ] Email/password form with validation
- [ ] Password show/hide toggle
- [ ] NO glass effects - clean, solid design
- [ ] Follows Luxterra aesthetic (light grays, 2px radius)

## Output

After completion:
1. `/auth` page with split layout
2. Reusable auth components
3. Responsive design
4. Ready for auth state integration (Plan 02)
