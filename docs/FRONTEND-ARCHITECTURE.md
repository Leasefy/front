# Frontend Architecture

**Last Updated:** 2026-01-29
**Status:** Complete (MVP Ready)

---

## Directory Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout with providers
│   ├── globals.css           # Global styles & design tokens
│   │
│   ├── auth/                 # Authentication
│   │   └── page.tsx          # Login/Register split layout
│   │
│   ├── propiedades/          # Public property catalog
│   │   ├── page.tsx          # Listing with map + filters
│   │   └── [id]/page.tsx     # Property detail
│   │
│   ├── publicar/             # Property publishing wizard
│   │   └── page.tsx          # 9-step wizard
│   │
│   ├── aplicar/              # Application wizard
│   │   └── [propertyId]/page.tsx
│   │
│   ├── pricing/              # Public pricing page
│   │   └── page.tsx
│   │
│   ├── panel/                # Landlord portal (protected)
│   │   ├── page.tsx          # Dashboard
│   │   ├── layout.tsx        # Sidebar layout
│   │   ├── propiedades/      # Property management
│   │   ├── candidatos/       # All candidates
│   │   ├── contratos/        # Contract management
│   │   ├── leases/           # Active leases
│   │   ├── [propertyId]/     # Property detail + candidates
│   │   │   └── contract/[candidateId]/  # Contract signing
│   │   ├── configuracion/    # Settings
│   │   ├── notificaciones/   # Notifications
│   │   ├── mensajes/         # Messages
│   │   ├── checkout/         # Plan checkout
│   │   └── upgrade/          # Plan upgrade
│   │
│   ├── inquilino/            # Tenant portal (protected)
│   │   ├── page.tsx          # Dashboard
│   │   ├── layout.tsx        # Sidebar layout
│   │   ├── aplicaciones/     # Application tracking
│   │   ├── arriendo/         # Active lease
│   │   ├── pagos/            # Payment history
│   │   ├── documentos/       # Document management
│   │   ├── configuracion/    # Settings
│   │   ├── notificaciones/   # Notifications
│   │   ├── mensajes/         # Messages
│   │   └── perfil/           # Profile
│   │
│   └── demo/                 # Demo pages (dev only)
│       └── score/page.tsx    # Risk score demo
│
├── components/
│   ├── ui/                   # Base UI components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx
│   │   ├── select.tsx
│   │   ├── checkbox.tsx
│   │   ├── badge.tsx
│   │   ├── skeleton.tsx
│   │   ├── empty-state.tsx
│   │   ├── error-state.tsx
│   │   └── plan/             # Plan-related components
│   │
│   ├── layout/               # Layout components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── Sidebar.tsx
│   │
│   ├── auth/                 # Authentication components
│   │   ├── AuthForm.tsx
│   │   ├── AuthInput.tsx
│   │   ├── SocialButtons.tsx
│   │   └── ProtectedRoute.tsx
│   │
│   ├── property/             # Property components
│   │   ├── PropertyCard.tsx
│   │   ├── PropertyGrid.tsx
│   │   ├── FilterSidebar.tsx
│   │   ├── AISearchInput.tsx
│   │   ├── PropertyMap.tsx
│   │   └── PropertyAccordion.tsx
│   │
│   ├── publish/              # Publishing wizard
│   │   ├── PublishShell.tsx
│   │   ├── PublishSuccess.tsx
│   │   └── steps/
│   │       ├── StepType.tsx
│   │       ├── StepLocation.tsx
│   │       ├── StepDetails.tsx
│   │       ├── StepAmenities.tsx
│   │       ├── StepPhotos.tsx
│   │       ├── StepPricing.tsx
│   │       ├── StepDescription.tsx
│   │       ├── StepPlan.tsx      # NEW: Plan selection
│   │       └── StepReview.tsx
│   │
│   ├── wizard/               # Application wizard
│   │   ├── WizardShell.tsx
│   │   ├── WizardProgress.tsx
│   │   └── Steps...
│   │
│   ├── landlord/             # Landlord-specific
│   │   ├── CandidateCard.tsx
│   │   ├── CandidateList.tsx
│   │   ├── CandidateDetail.tsx
│   │   ├── DecisionButtons.tsx
│   │   └── PropertyDashboardCard.tsx
│   │
│   ├── tenant/               # Tenant-specific
│   │   ├── ApplicationCard.tsx
│   │   ├── ApplicationTimeline.tsx
│   │   └── TenantDashboardSidebar.tsx
│   │
│   ├── score/                # Risk score display
│   │   ├── LevelBadge.tsx
│   │   ├── ScoreCard.tsx
│   │   ├── AIExplanation.tsx
│   │   ├── RiskFlags.tsx
│   │   └── SuggestedConditions.tsx
│   │
│   ├── contract/             # Contract components
│   │   ├── ContractPreview.tsx
│   │   ├── ContractTimeline.tsx
│   │   ├── SignatureForm.tsx
│   │   └── InsuranceSelector.tsx
│   │
│   ├── lease/                # Lease components
│   │   ├── LeaseCard.tsx
│   │   ├── PaymentHistory.tsx
│   │   └── PaymentMethodSelector.tsx
│   │
│   ├── pricing/              # Pricing components
│   │   ├── PricingCard.tsx
│   │   ├── PricingTable.tsx
│   │   ├── CouponInput.tsx
│   │   └── PriceSummary.tsx
│   │
│   ├── map/                  # Map components
│   │   ├── PropertyMap.tsx
│   │   ├── PriceMarker.tsx
│   │   └── ClusterMarker.tsx
│   │
│   └── skeleton/             # Loading skeletons
│       ├── PropertyCardSkeleton.tsx
│       ├── CandidateCardSkeleton.tsx
│       └── ApplicationCardSkeleton.tsx
│
├── lib/
│   ├── types/                # TypeScript interfaces
│   │   ├── property.ts
│   │   ├── application.ts
│   │   ├── candidate.ts
│   │   ├── risk-score.ts
│   │   ├── contract.ts
│   │   ├── lease.ts
│   │   ├── subscription.ts
│   │   ├── coupon.ts
│   │   ├── insurance.ts
│   │   ├── publish.ts        # Publishing wizard types
│   │   └── index.ts          # Central export
│   │
│   ├── data/                 # Mock data
│   │   ├── mock-properties.ts
│   │   ├── mock-candidates.ts
│   │   ├── mock-landlord-data.ts
│   │   ├── mock-tenant-applications.ts
│   │   ├── mock-contracts.ts
│   │   ├── mock-leases.ts
│   │   ├── mock-subscriptions.ts
│   │   ├── mock-coupons.ts
│   │   └── mock-insurance.ts
│   │
│   ├── context/              # React Context providers
│   │   ├── ApplicationContext.tsx
│   │   ├── PublishContext.tsx
│   │   ├── DecisionContext.tsx
│   │   ├── TenantApplicationContext.tsx
│   │   ├── UserProfileContext.tsx
│   │   └── SidebarContext.tsx
│   │
│   ├── auth/                 # Auth utilities
│   │   ├── auth-context.tsx
│   │   └── types.ts
│   │
│   ├── hooks/                # Custom hooks
│   │   ├── usePropertyFilters.ts
│   │   └── useTypingAnimation.ts
│   │
│   ├── utils/                # Utility functions
│   │   ├── cn.ts             # Class name merger
│   │   └── coupon-validation.ts
│   │
│   ├── constants/            # Constants
│   │   └── risk-levels.ts
│   │
│   ├── search/               # Search utilities
│   │   └── parseSearchQuery.ts
│   │
│   ├── scoring/              # Scoring utilities
│   │   └── qualificationScore.ts
│   │
│   └── format.ts             # Formatting utilities
│
└── prisma/                   # Database schema (reference)
    └── schema.prisma
```

---

## State Management

### React Context Providers

| Context | Purpose | Location |
|---------|---------|----------|
| `AuthContext` | User authentication state | `lib/auth/auth-context.tsx` |
| `ApplicationContext` | Application wizard state | `lib/context/ApplicationContext.tsx` |
| `PublishContext` | Property publishing wizard | `lib/context/PublishContext.tsx` |
| `DecisionContext` | Landlord decisions (approve/reject) | `lib/context/DecisionContext.tsx` |
| `TenantApplicationContext` | Tenant application tracking | `lib/context/TenantApplicationContext.tsx` |
| `UserProfileContext` | Mock user profile for personalization | `lib/context/UserProfileContext.tsx` |
| `SidebarContext` | Sidebar open/closed state | `lib/context/SidebarContext.tsx` |

### localStorage Keys

| Key | Purpose |
|-----|---------|
| `arriendo-facil-auth` | Mock auth user data |
| `arriendo-facil-decisions` | Landlord decisions |
| `arriendo-facil-notes` | Candidate notes |
| `arriendo-facil-applications` | Tenant applications |
| `arriendo-facil-user-profile` | Mock user profile |
| `arriendo-facil-application-[propertyId]` | Wizard draft per property |
| `arriendo-facil-publish-draft` | Publish wizard draft |
| `arriendo-facil-wishlist` | Saved properties |

---

## Key Components

### PublishContext (Property Publishing)

```typescript
interface PublishContextType {
  draft: PropertyDraft;          // Current form state
  currentStep: number;           // 1-9
  totalSteps: number;            // 9
  completedSteps: number[];      // Completed step IDs
  isSubmitting: boolean;
  isComplete: boolean;

  updateDraft: (updates: Partial<PropertyDraft>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  submitProperty: () => Promise<void>;
  resetDraft: () => void;

  isStepValid: (step: number) => boolean;
  canProceed: boolean;
}
```

**Publishing Steps:**
1. Type (apartment/house/studio/room)
2. Location (city + neighborhood + address)
3. Details (bedrooms, bathrooms, area, etc.)
4. Amenities (multi-select)
5. Photos (file upload)
6. Pricing (rent, admin fee, deposit)
7. Description (title + description)
8. Plan (free/pro/business) **← NEW**
9. Review (summary before submit)

### AuthContext

```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, role: UserRole) => Promise<void>;
  logout: () => void;
}
```

### Risk Score Display

The `RiskScoreDisplay` component shows:
- Level badge (A/B/C/D with colors)
- Score progress bar (0-100)
- AI explanation (typing animation)
- Key drivers (positive/negative factors)
- Risk flags (warnings)
- Suggested conditions (codeudor, deposit, etc.)

---

## Design System

### Colors
```css
--background: 0 0% 98.4%;       /* #FBFBFB - almost white */
--foreground: 0 0% 0%;          /* Black */
--primary: 74 100% 59%;         /* #D4F934 - lime accent */
--muted: 0 0% 96%;              /* Light gray */
--border: 0 0% 0% / 0.05;       /* 5% black */
```

### Risk Level Colors
```css
--risk-a: emerald (#10B981)
--risk-b: blue (#3B82F6)
--risk-c: amber (#F59E0B)
--risk-d: red (#EF4444)
```

### Border Radius
```css
--radius-sm: 2px;
--radius-md: 4px;
--radius-lg: 8px;
```

### Typography
- **Font:** System font stack
- **Scale:** text-xs (12px) to text-display (48px)

---

## Protected Routes

Routes wrapped in `<ProtectedRoute>`:

**Landlord Only (`role="landlord"`):**
- `/panel/*`

**Tenant Only (`role="tenant"`):**
- `/inquilino/*`
- `/mis-aplicaciones`
- `/mi-arriendo`

**Authenticated (any role):**
- `/aplicar/*`

---

## API Integration Points

### Current: Mock Data
All data currently comes from `src/lib/data/mock-*.ts` files.

### Future: API Calls
Replace mock data with API calls in:

1. **Property listing:** `src/app/propiedades/page.tsx`
2. **Property detail:** `src/app/propiedades/[id]/page.tsx`
3. **Property publishing:** `src/lib/context/PublishContext.tsx`
4. **Application submit:** `src/lib/context/ApplicationContext.tsx`
5. **Candidates fetch:** `src/app/panel/[propertyId]/page.tsx`
6. **Decision actions:** `src/lib/context/DecisionContext.tsx`
7. **Tenant applications:** `src/lib/context/TenantApplicationContext.tsx`
8. **Contracts:** `src/app/panel/[propertyId]/contract/[candidateId]/page.tsx`
9. **Leases:** `src/app/panel/leases/page.tsx`
10. **Subscriptions:** `src/app/panel/checkout/page.tsx`

---

## Recent Changes (Phase 11)

### Property Publishing Wizard Improvements

1. **New Plan Selection Step (Step 8)**
   - Users must select a plan before publishing
   - Three options: Gratis, Propietario, Inmobiliaria
   - Visual cards with features and pricing

2. **Location Step Changes**
   - City: Visual card selection (6 major cities)
   - Neighborhood: Free text input (no dropdown)

3. **Success Screen Improvements**
   - Confetti celebration animation
   - Property summary with image
   - Selected plan display
   - Auto-redirect countdown (5 seconds)

4. **Review Step Updates**
   - Shows selected plan with icon and price
   - All sections editable via "Editar" links

### Navbar Updates
- "Publicar Inmueble" button with gray background
- "Buscar Inmueble" as plain text link
- "Precios" link restored

### Contract Flow Fix
- Approving candidate now starts fresh contract (step 1)
- Added `?new=true` query param support

---

*Document generated: 2026-01-29*
