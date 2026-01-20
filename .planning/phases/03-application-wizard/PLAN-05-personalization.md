# PLAN-05: Personalization Features

**Phase**: 03-application-wizard
**Focus**: User-specific property recommendations and qualification indicators
**Estimated Scope**: ~5 files, ~450 LOC
**Depends on**: PLAN-04 (AI Search), indirectly on PLAN-01/02/03 (user profile data)

---

## Goal Statement

When a logged-in user with a completed financial profile visits `/propiedades`, show personalized features: a "Para Ti" carousel with best-match properties, visual indicators of qualification status on each property card, and optional automatic filtering to only show properties within their budget.

---

## Success Criteria

- [ ] "Para Ti" carousel appears above the property grid for logged-in users
- [ ] Carousel shows 4-6 properties ranked by match score
- [ ] PropertyCard shows subtle "Califica" / "No califica" badge
- [ ] User can toggle "Solo propiedades para mí" filter
- [ ] All personalization gracefully degrades for anonymous users

---

## Files to Create/Modify

### New Files

```
src/lib/context/UserProfileContext.tsx     # Mock user profile state
src/lib/scoring/qualificationScore.ts      # Calculate if user qualifies
src/components/property/ForYouCarousel.tsx # "Para Ti" carousel
```

### Modified Files

```
src/components/property/PropertyCard.tsx   # Add qualification badge
src/app/propiedades/page.tsx               # Add carousel + personalization toggle
src/lib/hooks/usePropertyFilters.ts        # Add budget-based filtering
```

---

## User Profile Context (Mock)

### Profile Data Structure

```typescript
interface UserProfile {
  isLoggedIn: boolean;
  hasCompletedProfile: boolean;

  // Financial data (from wizard or manual entry)
  monthlyIncome: number;
  monthlyObligations: number;
  availableForRent: number; // income - obligations

  // Preferences (optional, for better matching)
  preferredCities: string[];
  preferredBedrooms: number | null;
  preferredPropertyTypes: PropertyType[];

  // Computed
  maxAffordableRent: number; // availableForRent × 0.30
}
```

### Mock Implementation

For MVP, use localStorage to simulate logged-in state:
- Button to "Simular usuario logueado"
- Pre-filled financial profile
- Toggle to show/hide personalization

---

## Qualification Scoring

### Simple Affordability Check

```typescript
function calculateQualification(
  property: Property,
  userProfile: UserProfile
): {
  qualifies: boolean;
  score: number; // 0-100 match score
  reason?: string;
} {
  const totalMonthlyRent = property.monthlyRent + property.adminFee;
  const affordabilityRatio = totalMonthlyRent / userProfile.availableForRent;

  // Must be ≤ 30% of available income
  if (affordabilityRatio > 0.30) {
    return {
      qualifies: false,
      score: Math.max(0, 100 - (affordabilityRatio - 0.30) * 200),
      reason: 'Supera el 30% de tu ingreso disponible',
    };
  }

  // Calculate match score based on multiple factors
  let score = 100;

  // Affordability factor (perfect if 20-25% of income)
  const idealRatio = 0.22;
  const affordabilityScore = 100 - Math.abs(affordabilityRatio - idealRatio) * 200;
  score = Math.min(score, affordabilityScore);

  // City preference bonus
  if (userProfile.preferredCities.includes(property.city)) {
    score += 10;
  }

  // Bedrooms preference bonus
  if (userProfile.preferredBedrooms === property.bedrooms) {
    score += 10;
  }

  // Property type preference bonus
  if (userProfile.preferredPropertyTypes.includes(property.type)) {
    score += 10;
  }

  return {
    qualifies: true,
    score: Math.min(100, Math.max(0, score)),
  };
}
```

---

## "Para Ti" Carousel

### UI Design

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌─ • ─┐  Para ti                                             │
│                                                                │
│  Propiedades que coinciden con tu perfil                       │
│                                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────  │
│  │          │ │          │ │          │ │          │ │        │
│  │   🏠     │ │   🏢     │ │   🏠     │ │   🏢     │ │   🏠   │
│  │          │ │          │ │          │ │          │ │        │
│  │ Match 95%│ │ Match 92%│ │ Match 88%│ │ Match 85%│ │ Match  │
│  │          │ │          │ │          │ │          │ │        │
│  │ Apto en  │ │ Casa en  │ │ Estudio  │ │ Apto en  │ │ Casa   │
│  │ Poblado  │ │ Laureles │ │ Chapinero│ │ Rosales  │ │ Usaq   │
│  │ $2.8M    │ │ $3.2M    │ │ $1.5M    │ │ $3.0M    │ │ $4.2   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────  │
│                                                                │
│                    ← ● ○ ○ →                                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Carousel Behavior
- Shows top 6 properties by match score
- Horizontal scroll on mobile
- Arrow navigation on desktop
- Dot indicators for pagination
- Cards slightly smaller than grid cards

### Carousel Card Design

```tsx
<div className="relative w-[260px] shrink-0">
  {/* Match score badge */}
  <div className="absolute top-3 left-3 z-10 bg-purple-600 text-white text-xs px-2 py-1 rounded-sm">
    95% match
  </div>

  {/* Property image */}
  <div className="aspect-[4/3] relative">
    <Image src={property.thumbnailUrl} fill className="object-cover rounded-sm" />
  </div>

  {/* Property info */}
  <div className="mt-3">
    <h3 className="text-sm font-normal text-gray-900 truncate">
      {property.title}
    </h3>
    <p className="text-xs text-gray-500">{property.neighborhood}, {property.city}</p>
    <p className="text-sm font-medium text-gray-900 mt-1">
      ${formatPrice(property.monthlyRent)}/mes
    </p>
  </div>
</div>
```

---

## PropertyCard Qualification Badge

### Badge Designs

**Qualifies (subtle positive):**
```tsx
<div className="absolute top-3 right-3 z-10 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-sm border border-green-200">
  ✓ Califica
</div>
```

**Doesn't Qualify (subtle warning):**
```tsx
<div className="absolute top-3 right-3 z-10 bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-sm border border-amber-200">
  Fuera de presupuesto
</div>
```

### Badge Position
- Top-right corner of card image
- Semi-transparent background
- Doesn't obscure wishlist button

---

## Personalization Toggle

### UI Design

```
┌────────────────────────────────────────┐
│  ☐ Solo propiedades para mí            │
│  Ver solo lo que calificas según tu    │
│  perfil financiero                     │
└────────────────────────────────────────┘
```

### Placement
- In FilterSidebar, at the top
- Only visible for logged-in users with profile
- When enabled, filters out non-qualifying properties

---

## Implementation Steps

### Step 1: Create UserProfileContext
Create `src/lib/context/UserProfileContext.tsx`:
- Mock profile state
- localStorage persistence
- "Simular usuario" functionality
- Provider component

### Step 2: Create qualificationScore utility
Create `src/lib/scoring/qualificationScore.ts`:
- `calculateQualification()` function
- `rankPropertiesByMatch()` function
- Constants for thresholds (30% rule, etc.)

### Step 3: Create ForYouCarousel component
Create `src/components/property/ForYouCarousel.tsx`:
- Horizontal scroll container
- Arrow navigation (desktop)
- Dot pagination
- Compact property cards with match score
- Uses qualification scoring
- Link to full property page

### Step 4: Update PropertyCard
Modify `src/components/property/PropertyCard.tsx`:
- Accept optional `userProfile` prop
- Show qualification badge when profile exists
- Badge styling based on qualification status

### Step 5: Update FilterSidebar
Modify `src/components/property/FilterSidebar.tsx`:
- Add "Solo propiedades para mí" toggle
- Only show when user has profile
- Connect to filter state

### Step 6: Update propiedades page
Modify `src/app/propiedades/page.tsx`:
- Wrap in UserProfileContext
- Add ForYouCarousel above grid
- Pass qualification data to PropertyCard
- Connect personalization toggle to filters

---

## Mock User Profile (for testing)

```typescript
const MOCK_USER_PROFILE: UserProfile = {
  isLoggedIn: true,
  hasCompletedProfile: true,

  // Financial (from wizard Step 3)
  monthlyIncome: 5500000,        // $5.5M COP
  monthlyObligations: 800000,    // $800K COP
  availableForRent: 4700000,     // $4.7M COP
  maxAffordableRent: 1410000,    // $1.41M COP (30% of available)

  // Preferences
  preferredCities: ['Medellin', 'Bogota'],
  preferredBedrooms: 2,
  preferredPropertyTypes: ['apartment', 'studio'],
};
```

---

## Graceful Degradation

| User State | ForYouCarousel | Badges | Toggle |
|------------|----------------|--------|--------|
| Anonymous | Hidden | Hidden | Hidden |
| Logged in, no profile | Hidden | Hidden | Hidden |
| Logged in, partial profile | Hidden | Hidden | Hidden |
| Logged in, complete profile | Visible | Visible | Visible |

---

## Testing Checklist

- [ ] ForYouCarousel shows for mock logged-in user
- [ ] Carousel ranks properties by match score
- [ ] Carousel scrolls horizontally
- [ ] PropertyCard shows "Califica" badge correctly
- [ ] PropertyCard shows "Fuera de presupuesto" badge correctly
- [ ] Toggle filters to only qualifying properties
- [ ] Anonymous user sees no personalization
- [ ] Match percentages calculate correctly
- [ ] 30% affordability rule enforced

---

## Notes

- This is all mock/frontend - no real user authentication
- Financial data would come from completed wizard in real app
- Consider privacy: don't expose exact income on badges
- Match score is indicative, not a guarantee
- Could later integrate with actual ML scoring
