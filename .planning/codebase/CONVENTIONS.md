# Coding Conventions

**Analysis Date:** 2026-01-28

## Naming Patterns

**Files:**
- React components: `PascalCase.tsx` (e.g., `CandidateCard.tsx`, `AuthForm.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useTypingAnimation.ts`, `usePropertyFilters.ts`)
- Type files: `kebab-case.ts` (e.g., `risk-score.ts`, `tenant-application.ts`)
- Utility files: `kebab-case.ts` (e.g., `design-tokens.ts`, `mock-candidates.ts`)
- Constants: `kebab-case.ts` (e.g., `risk-levels.ts`)
- Context providers: `PascalCase.tsx` with `Context` suffix (e.g., `DecisionContext.tsx`, `auth-context.tsx`)

**Functions:**
- Regular functions: `camelCase` (e.g., `formatCurrency`, `parseSearchQuery`)
- React components: `PascalCase` (e.g., `CandidateCard`, `EmptyState`)
- Custom hooks: `use` prefix + `PascalCase` (e.g., `useTypingAnimation`, `useDecisions`)
- Event handlers: `handle` prefix + action (e.g., `handleDecision`, `handleLoginSubmit`)
- Validation functions: `validate` prefix + subject (e.g., `validatePersonalStep`, `isValidEmail`)
- Helper predicates: `is` or `has` prefix (e.g., `isAdult`, `hasDocument`, `requiresJobDetails`)

**Variables:**
- Regular variables: `camelCase` (e.g., `filteredProperties`, `currentStatus`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `MAX_PRE_APPROVALS`, `AFFORDABILITY_THRESHOLD`)
- Boolean variables: `is`, `has`, `can`, `should` prefix (e.g., `isLoading`, `hasActiveFilters`, `canPreApprove`)

**Types:**
- Interfaces: `PascalCase` (e.g., `CandidateBasic`, `PropertyFilters`)
- Type aliases: `PascalCase` (e.g., `DocumentType`, `CandidateStatus`)
- Props interfaces: Component name + `Props` suffix (e.g., `CandidateCardProps`, `EmptyStateProps`)
- Context value interfaces: Feature name + `ContextValue` suffix (e.g., `DecisionContextValue`)

## Code Style

**Formatting:**
- No explicit Prettier config (uses defaults)
- Indentation: 2 spaces
- Semicolons: Required
- Quotes: Single quotes for imports, double for JSX strings
- Trailing commas: Yes in multiline

**Linting:**
- ESLint with `next/core-web-vitals` preset
- No custom ESLint rules defined
- `eslint-disable-next-line no-console` used for intentional console usage in logging

## Import Organization

**Order:**
1. React core imports (`'use client'` directive first if needed)
2. React and Next.js imports (`react`, `next/*`)
3. Third-party libraries (`lucide-react`, `sonner`, `framer-motion`)
4. Internal absolute imports using `@/*` path alias
5. Relative imports (types, local components)

**Path Aliases:**
- `@/*` maps to `./src/*` (defined in `tsconfig.json`)
- Use absolute imports for all cross-directory references
- Relative imports only within same directory (e.g., `./types`, `./helpers`)

**Example Pattern:**
```typescript
'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { LandlordCandidate } from '@/lib/types/landlord';
```

## Error Handling

**Patterns:**
- Use `try/catch` blocks for async operations with explicit error states
- Display user-friendly error messages in Spanish (app locale)
- Generic fallback: `'Ocurrio un error. Intenta de nuevo.'`
- Log errors to console in development only using `@/lib/utils/logger`

**Error State Components:**
- Use `ErrorState` component from `@/components/ui/error-state.tsx`
- Default Spanish messages: title `'Algo salio mal'`, description `'No pudimos cargar esta pagina...'`
- Optional `onRetry` callback for recovery actions

**Form Validation:**
- Return `ValidationResult` interface: `{ isValid: boolean; errors: Record<string, string> }`
- Error messages in Spanish without accents (e.g., `'Email invalido'`)
- Use react-hook-form for form management with `register` and `handleSubmit`

**Example Pattern:**
```typescript
try {
  const result = await login(data.email, data.password);
  if (result.success) {
    handleRedirect();
  } else {
    setError(result.error || 'Error al iniciar sesion');
  }
} catch {
  setError('Ocurrio un error. Intenta de nuevo.');
} finally {
  setIsLoading(false);
}
```

## Logging

**Framework:** Custom logger utility at `@/lib/utils/logger.ts`

**Patterns:**
- Create namespaced loggers: `createLoggerWithNamespace('Auth')`
- Pre-defined loggers: `storageLogger`, `authLogger`, `contextLogger`
- Development-only logging controlled by `process.env.NODE_ENV`
- Use `eslint-disable-next-line no-console` for intentional console calls

**Log Levels:**
- `debug`: Verbose debugging information
- `info`: General information
- `warn`: Warning conditions
- `error`: Error conditions (always logged, even in production)

## Comments

**When to Comment:**
- File-level JSDoc describing module purpose
- Section dividers using `// ============` for visual separation
- Complex business logic or algorithms
- Non-obvious type definitions with usage examples

**JSDoc/TSDoc:**
- Use JSDoc for exported functions with `@param`, `@returns`, `@example`
- Document complex interfaces with field descriptions
- Use `@example` for non-obvious usage patterns

**Example Pattern:**
```typescript
/**
 * useTypingAnimation - Custom hook for typewriter effect
 *
 * Creates a natural-feeling typing animation with configurable speed,
 * initial delay, and punctuation-aware pauses.
 *
 * @example
 * ```tsx
 * const { displayText, isComplete } = useTypingAnimation({
 *   text: "Hello, world!",
 *   speed: 40,
 * });
 * ```
 */
```

## Function Design

**Size:**
- Keep functions under 50 lines
- Extract complex logic into helper functions
- Group related helpers with section dividers

**Parameters:**
- Use options objects for 3+ parameters
- Define explicit interfaces for props/options
- Use optional properties with `?` syntax
- Provide sensible defaults

**Return Values:**
- Return explicit types (avoid implicit `any`)
- Use discriminated unions for complex returns (e.g., `{ success: true } | { success: false; error: string }`)
- Return `null` instead of `undefined` for "not found" cases

## Module Design

**Exports:**
- Named exports for components and utilities
- Default exports only for page components (Next.js convention)
- Re-export types with `export type` for type-only exports

**Barrel Files:**
- Use `index.ts` files in component directories for clean imports
- Group exports by category with comments
- Export both components and their types from barrel files

**Example Pattern (from `@/components/landlord/index.ts`):**
```typescript
/**
 * Landlord dashboard components
 * @module components/landlord
 */

// Dashboard layout components
export { DashboardSidebar } from './DashboardSidebar';
export { DashboardHeader } from './DashboardHeader';

// Re-export types for convenience
export type { CandidateCardProps } from './CandidateCard';
```

## TypeScript Patterns

**Type Definitions:**
- Prefer `interface` for object shapes, `type` for unions/primitives
- Use `as const` for readonly arrays of options
- Define string literal unions from constants

**Example Pattern:**
```typescript
export const DOCUMENT_TYPES = [
  { value: 'cc', label: 'Cedula de Ciudadania' },
  { value: 'ce', label: 'Cedula de Extranjeria' },
] as const;

export type DocumentType = 'cc' | 'ce' | 'passport';
```

**Generics:**
- Use generics for reusable utilities (e.g., `StorageManager<T>`)
- Provide explicit type parameters when inference unclear

**Null Handling:**
- Use `null` for intentional absence of value
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Avoid `!` non-null assertion except when TypeScript inference fails

## Component Patterns

**Functional Components Only:**
- Use function declarations for components
- Use `forwardRef` for components that need ref forwarding

**Props Interface Pattern:**
```typescript
export interface EmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Main title text */
  title: string;
  /** Optional CTA button */
  action?: EmptyStateAction;
  /** Additional CSS classes */
  className?: string;
}
```

**Client Components:**
- Add `'use client'` directive at top of file
- Only mark as client component when using hooks/browser APIs

**Component Structure:**
1. `'use client'` directive (if needed)
2. Imports
3. Types section (marked with `// Types` or divider)
4. Constants (if any)
5. Helper functions (if any)
6. Component function
7. Named export

## Styling Patterns

**Tailwind CSS:**
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Import design tokens from `@/lib/design-tokens.ts` for consistency
- Use semantic color variables (e.g., `text-foreground`, `bg-card`)

**Design Tokens:**
- `borderRadius`: `rounded-[2px]` (minimal, brand style)
- `cardStyles`: Pre-defined card variants (`base`, `interactive`, `highlighted`)
- `transitions`: Consistent animation durations
- `badgeStyles`: Badge variants (`base`, `pill`, `sm`)

**Example Pattern:**
```typescript
import { cn } from '@/lib/utils';
import { cardStyles, borderRadius, transitions } from '@/lib/design-tokens';

<Card className={cn(
  cardStyles.interactive,
  'flex flex-col',
  currentStatus === 'rejected' && 'opacity-60',
  className
)}>
```

## Context/State Patterns

**Context Provider Pattern:**
```typescript
const DecisionContext = createContext<DecisionContextValue | null>(null);

export function DecisionProvider({ children }: DecisionProviderProps) {
  // State and methods
  const value: DecisionContextValue = { /* ... */ };
  return (
    <DecisionContext.Provider value={value}>
      {children}
    </DecisionContext.Provider>
  );
}

export function useDecisions(): DecisionContextValue {
  const context = useContext(DecisionContext);
  if (!context) {
    throw new Error('useDecisions must be used within a DecisionProvider');
  }
  return context;
}
```

**localStorage Persistence:**
- Use `StorageManager` class from `@/lib/utils/storage`
- SSR-safe with `isStorageAvailable()` check
- Hydration state tracking with `isHydrated` flag

---

*Convention analysis: 2026-01-28*
