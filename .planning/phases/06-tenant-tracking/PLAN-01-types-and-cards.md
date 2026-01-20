---
phase: "06-tenant-tracking"
plan: "01"
title: "Types, Mock Data & Application Card"
wave: 1
autonomous: true
must_haves:
  truths:
    - "TenantApplication type exists with status, events, propertyId"
    - "Status states include: Enviada, En revision, Pre-aprobada, Aprobada, Rechazada"
    - "Mock data includes 5+ applications in various states"
    - "ApplicationCard shows property thumbnail, status badge, date"
  artifacts:
    - path: "src/lib/types/tenant-application.ts"
      description: "TenantApplication, ApplicationEvent types, status labels/colors"
      min_lines: 60
    - path: "src/lib/data/mock-tenant-applications.ts"
      description: "5+ mock applications with event histories"
      min_lines: 80
    - path: "src/components/tenant/ApplicationCard.tsx"
      description: "Card with property thumbnail, status, date"
      min_lines: 80
    - path: "src/components/tenant/ApplicationStatusBadge.tsx"
      description: "Status badge with correct colors"
      min_lines: 30
  key_links:
    - from: "mock-tenant-applications.ts"
      to: "MOCK_PROPERTIES"
      via: "propertyId reference"
    - from: "ApplicationCard"
      to: "ApplicationStatusBadge"
      via: "direct import"
---

# Plan 01: Types, Mock Data & Application Card

## Objective

Create the type system, mock data, and card component for tenant application tracking.

## Context

Phase 6 enables tenants to track their applications. This plan establishes:
- Type definitions for tenant-facing application data
- Mock applications in various states for testing
- The card component that summarizes each application

### Existing Patterns to Follow
- Phase 5 `landlord.ts` - status types with labels and colors
- Phase 3 `application.ts` - base Application type
- Phase 5 `PropertyDashboardCard` - card layout pattern

### Status Mapping (Tenant View → Landlord View)
| Tenant Status | Spanish Label | Maps From |
|---------------|---------------|-----------|
| submitted | Enviada | Application submitted |
| under_review | En revision | Landlord reviewing |
| pre_approved | Pre-aprobada | Landlord pre-approved |
| approved | Aprobada | Landlord approved |
| rejected | Rechazada | Landlord rejected |
| withdrawn | Retirada | Tenant withdrew |

## Tasks

### Task 1: Create TenantApplication Types
**File**: `src/lib/types/tenant-application.ts`

Create types for tenant-facing application tracking:

```typescript
// TenantApplicationStatus - tenant-facing status names
export type TenantApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'pre_approved'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

// Spanish labels
export const APPLICATION_STATUS_LABELS: Record<TenantApplicationStatus, string>;

// Status colors (using Phase 5 color pattern)
export const APPLICATION_STATUS_COLORS: Record<TenantApplicationStatus, string>;

// ApplicationEvent - timeline events
export interface ApplicationEvent {
  id: string;
  type: TenantApplicationStatus | 'created' | 'documents_verified';
  timestamp: string;
  description: string;
}

// TenantApplication - full application from tenant perspective
export interface TenantApplication {
  id: string;
  propertyId: string;
  trackingCode: string;
  status: TenantApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  events: ApplicationEvent[];
}

// Helper: getStatusProgress() - returns 0-100 for progress bar
```

**Verification**: Types compile without errors, status labels in Spanish.

### Task 2: Create Mock Tenant Applications
**File**: `src/lib/data/mock-tenant-applications.ts`

Create 5+ mock applications referencing real properties:

```typescript
import { MOCK_PROPERTIES } from './mock-properties';
import type { TenantApplication } from '../types/tenant-application';

// Helper to create events based on status
function createEventsForStatus(status, submittedAt): ApplicationEvent[]

// MOCK_TENANT_APPLICATIONS - 5+ applications in various states
export const MOCK_TENANT_APPLICATIONS: TenantApplication[] = [
  // 1. Submitted - just applied (prop-001)
  // 2. Under review - documents being checked (prop-003)
  // 3. Pre-approved - landlord interested (prop-005)
  // 4. Approved - accepted! (prop-007)
  // 5. Rejected - declined (prop-002)
  // 6. Withdrawn - tenant cancelled (prop-004)
];

// Helper functions
export function getTenantApplicationById(id: string): TenantApplication | undefined;
export function getApplicationsByStatus(status: TenantApplicationStatus): TenantApplication[];
```

**Verification**: Applications reference valid property IDs, events are chronological.

### Task 3: Create ApplicationStatusBadge
**File**: `src/components/tenant/ApplicationStatusBadge.tsx`

Create status badge component following Phase 5 pattern:

```typescript
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from '@/lib/types/tenant-application';

interface ApplicationStatusBadgeProps {
  status: TenantApplicationStatus;
  size?: 'sm' | 'md';
}

// Badge with appropriate color and Spanish label
// sm: text-xs px-2 py-0.5
// md: text-sm px-2.5 py-1
```

**Verification**: All 6 statuses render with correct colors and labels.

### Task 4: Create ApplicationCard
**File**: `src/components/tenant/ApplicationCard.tsx`

Create card component for application list:

```typescript
import Link from 'next/link';
import Image from 'next/image';
import { formatDate } from '@/lib/format';
import { MOCK_PROPERTIES } from '@/lib/data/mock-properties';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

interface ApplicationCardProps {
  application: TenantApplication;
  onWithdraw?: (id: string) => void;
}

// Card layout:
// [Property Image] | [Title, Location] | [Status Badge]
//                  | [Submitted date]  | [Tracking code]
// Clickable to expand/navigate to detail
```

**Verification**: Card renders property thumbnail, status badge, tracking code, date.

## Verification Checklist

- [ ] Types compile: `npx tsc --noEmit`
- [ ] 6 status types with Spanish labels
- [ ] Mock data has 5+ applications in various states
- [ ] ApplicationCard renders property info from MOCK_PROPERTIES
- [ ] Status badges show correct colors per status

## Output

After completion:
1. Types ready for page implementation
2. Mock data provides testing scenarios
3. Card component ready for list display
4. Barrel export at `src/components/tenant/index.ts`
