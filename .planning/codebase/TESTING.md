# Testing Patterns

**Analysis Date:** 2026-01-28

## Test Framework

**Runner:**
- No testing framework currently configured
- No Jest, Vitest, or other test runner in `package.json`
- No test configuration files present (`jest.config.*`, `vitest.config.*`)

**Assertion Library:**
- Not configured

**Run Commands:**
```bash
# No test commands configured
# package.json scripts:
# - dev, build, start, lint
# - db:seed, db:reset, db:generate, db:push, db:studio
```

## Test File Organization

**Location:**
- No test directories exist (`__tests__/`, `tests/`, `*.test.*`)
- No test files found in `src/` directory
- Grep search for test patterns returned no matches in source code

**Naming:**
- Not established (recommend: `ComponentName.test.tsx` or `utility.test.ts`)

**Recommended Structure:**
```
src/
├── components/
│   └── landlord/
│       ├── CandidateCard.tsx
│       └── CandidateCard.test.tsx  # co-located tests (recommended)
├── lib/
│   └── validation/
│       ├── applicationValidation.ts
│       └── applicationValidation.test.ts
└── __tests__/                      # or separate test directory
    └── integration/
```

## Test Structure

**Suite Organization:**
- Not established in codebase

**Recommended Pattern Based on Codebase:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest'; // or jest
import { validatePersonalStep, isAdult, isValidColombianPhone } from '@/lib/validation/applicationValidation';

describe('applicationValidation', () => {
  describe('isAdult', () => {
    it('returns true for dates making person 18+', () => {
      const adultDate = '2000-01-01';
      expect(isAdult(adultDate)).toBe(true);
    });

    it('returns false for dates making person under 18', () => {
      const minorDate = '2015-01-01';
      expect(isAdult(minorDate)).toBe(false);
    });
  });

  describe('validatePersonalStep', () => {
    it('returns errors for empty data', () => {
      const result = validatePersonalStep({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('fullName');
    });
  });
});
```

## Mocking

**Framework:**
- Not established

**Recommended Patterns Based on Architecture:**

**Mock localStorage (for storage utilities):**
```typescript
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });
});
```

**Mock Context Providers:**
```typescript
import { DecisionProvider } from '@/lib/context/DecisionContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DecisionProvider>{children}</DecisionProvider>
);

// Use with @testing-library/react-hooks
const { result } = renderHook(() => useDecisions(), { wrapper });
```

**What to Mock:**
- `localStorage` for storage utilities
- `next/navigation` hooks (`useRouter`, `useSearchParams`)
- External API calls (when implemented)
- Date/time for deterministic tests

**What NOT to Mock:**
- Pure validation functions in `@/lib/validation/`
- Formatting utilities in `@/lib/format.ts`
- Type definitions and constants

## Fixtures and Factories

**Test Data:**
- Existing mock data can serve as test fixtures
- Located in `@/lib/data/mock-*.ts` files

**Available Mock Data (usable as fixtures):**
```typescript
// @/lib/data/mock-candidates.ts
import { MOCK_CANDIDATES } from '@/lib/data/mock-candidates';

// @/lib/data/mock-landlord-data.ts
import { mockLandlordProperties } from '@/lib/data/mock-landlord-data';

// @/lib/data/mock-users.ts
import { mockUsers, validateMockCredentials } from '@/lib/data/mock-users';
```

**Recommended Factory Pattern:**
```typescript
// tests/factories/application.ts
import type { PersonalInfo, EmploymentInfo } from '@/lib/types/application';

export function createPersonalInfo(overrides: Partial<PersonalInfo> = {}): PersonalInfo {
  return {
    fullName: 'Juan Perez',
    documentType: 'cc',
    documentNumber: '1234567890',
    dateOfBirth: '1990-01-15',
    phone: '3001234567',
    email: 'juan@example.com',
    currentAddress: 'Calle 123 #45-67, Bogota',
    timeAtCurrentAddress: 24,
    maritalStatus: 'single',
    dependents: 0,
    ...overrides,
  };
}

export function createEmploymentInfo(overrides: Partial<EmploymentInfo> = {}): EmploymentInfo {
  return {
    employmentStatus: 'employed',
    companyName: 'Tech Company',
    industry: 'technology',
    position: 'Developer',
    contractType: 'indefinite',
    timeAtJob: 12,
    ...overrides,
  };
}
```

## Coverage

**Requirements:**
- None enforced (no test configuration)

**Recommended Targets:**
- Critical validation logic: 90%+ coverage
- UI components: 70%+ coverage
- Utilities and formatters: 100% coverage

**View Coverage:**
```bash
# After configuring test framework:
npm run test -- --coverage
# or
npx vitest --coverage
```

## Test Types

**Unit Tests:**
- Primary focus for this codebase
- Target: Validation functions, formatting utilities, hooks
- High-priority files for unit tests:
  - `@/lib/validation/applicationValidation.ts` (509 lines of validation logic)
  - `@/lib/format.ts` (formatting utilities)
  - `@/lib/scoring/qualificationScore.ts` (scoring algorithms)
  - `@/lib/search/parseSearchQuery.ts` (NLP parsing)

**Integration Tests:**
- Context providers with localStorage persistence
- Hook interactions with context
- Form submission flows

**E2E Tests:**
- Framework: Not configured
- Recommended: Playwright for E2E testing
- Priority flows:
  - Application wizard completion
  - Landlord candidate review flow
  - Authentication flow

## Recommended Test Setup

**Vitest Configuration (recommended):**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/lib/data/mock-*.ts', // Mock data
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Setup File:**
```typescript
// tests/setup.ts
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
```

**Package.json Scripts to Add:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui"
  }
}
```

## Priority Testing Targets

**Highest Priority (Business-Critical Logic):**

1. **`@/lib/validation/applicationValidation.ts`**
   - Colombian phone validation: `isValidColombianPhone()`
   - Document validation: `isValidDocument()`
   - Age validation: `isAdult()`
   - Step validators: `validatePersonalStep()`, `validateEmploymentStep()`, etc.

2. **`@/lib/search/parseSearchQuery.ts`**
   - City pattern matching
   - Price range parsing
   - Bedroom count extraction
   - Natural language to structured query conversion

3. **`@/lib/scoring/qualificationScore.ts`**
   - Affordability calculations
   - Score computation
   - Property ranking algorithm

**Medium Priority (User-Facing Utilities):**

4. **`@/lib/format.ts`**
   - Currency formatting (Colombian Peso)
   - Date formatting
   - Relative time formatting

5. **`@/lib/utils/storage.ts`**
   - SSR-safe localStorage operations
   - Error handling
   - StorageManager class

**Lower Priority (UI Components):**

6. **Reusable UI Components:**
   - `@/components/ui/empty-state.tsx`
   - `@/components/ui/error-state.tsx`
   - `@/components/score/LevelBadge.tsx`

## Common Patterns

**Async Testing (for Context/Hooks):**
```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/lib/auth/use-auth';
import { AuthProvider } from '@/lib/auth/auth-context';

describe('useAuth', () => {
  it('logs in successfully with valid credentials', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      const response = await result.current.login('landlord@example.com', 'password123');
      expect(response.success).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});
```

**Error Testing:**
```typescript
describe('validatePersonalStep', () => {
  it('returns specific error for invalid Colombian phone', () => {
    const result = validatePersonalStep({
      fullName: 'Juan Perez',
      phone: '1234567890', // Invalid - doesn't start with 3
      // ... other required fields
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.phone).toBe('Telefono debe empezar con 3 y tener 10 digitos');
  });
});
```

**Snapshot Testing (for Components):**
```typescript
import { render } from '@testing-library/react';
import { EmptyState } from '@/components/ui/empty-state';
import { FileSearch } from 'lucide-react';

describe('EmptyState', () => {
  it('renders correctly with all props', () => {
    const { container } = render(
      <EmptyState
        icon={FileSearch}
        title="No hay resultados"
        description="Intenta con otros filtros"
        action={{ label: 'Limpiar filtros', href: '/propiedades' }}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
```

## Testing Gaps Analysis

**Critical Untested Areas:**

| Area | Files | Risk | Priority |
|------|-------|------|----------|
| Application Validation | `applicationValidation.ts` | High - affects user data integrity | P0 |
| Search Query Parser | `parseSearchQuery.ts` | High - affects property discovery | P0 |
| Qualification Scoring | `qualificationScore.ts` | High - affects tenant matching | P0 |
| Auth Context | `auth-context.tsx` | Medium - mock auth for MVP | P1 |
| Decision Context | `DecisionContext.tsx` | Medium - state management | P1 |
| Storage Utilities | `storage.ts` | Medium - localStorage persistence | P1 |
| Format Utilities | `format.ts` | Low - presentation only | P2 |

---

*Testing analysis: 2026-01-28*
