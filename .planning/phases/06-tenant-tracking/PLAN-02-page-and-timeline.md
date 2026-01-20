---
phase: "06-tenant-tracking"
plan: "02"
title: "Mis Aplicaciones Page & Timeline"
wave: 1
autonomous: true
must_haves:
  truths:
    - "/mis-aplicaciones page renders list of applications"
    - "Timeline view shows application events chronologically"
    - "Detail view explains current status"
    - "Withdraw action changes status to 'withdrawn'"
  artifacts:
    - path: "src/app/mis-aplicaciones/page.tsx"
      description: "Tenant applications page with list and detail"
      min_lines: 100
    - path: "src/components/tenant/ApplicationTimeline.tsx"
      description: "Timeline visualization of application events"
      min_lines: 60
    - path: "src/components/tenant/ApplicationDetail.tsx"
      description: "Expanded view with timeline and actions"
      min_lines: 80
    - path: "src/lib/context/TenantApplicationContext.tsx"
      description: "State management with localStorage persistence"
      min_lines: 80
  key_links:
    - from: "/mis-aplicaciones page"
      to: "TenantApplicationContext"
      via: "useTenantApplications hook"
    - from: "ApplicationDetail"
      to: "ApplicationTimeline"
      via: "direct import"
    - from: "page layout"
      to: "TenantApplicationProvider"
      via: "context wrapper"
---

# Plan 02: Mis Aplicaciones Page & Timeline

## Objective

Create the tenant applications page with timeline view and withdraw capability.

## Context

This plan builds the user-facing page for tracking applications. Tenants see:
- List of all their applications (from mock data)
- Expandable detail with event timeline
- Ability to withdraw pending applications

### Existing Patterns to Follow
- Phase 5 `/panel` page - dashboard layout pattern
- Phase 5 `CandidateDetail` - Sheet drawer for details
- Phase 3 `ConfirmationScreen` - Timeline item component

### Timeline Events
Each application has events like:
1. Aplicacion enviada (submitted)
2. Documentos verificados (documents_verified)
3. En revision por propietario (under_review)
4. Pre-aprobado / Aprobado / Rechazado (status change)

## Tasks

### Task 1: Create TenantApplicationContext
**File**: `src/lib/context/TenantApplicationContext.tsx`

Create context for managing application state:

```typescript
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_TENANT_APPLICATIONS } from '@/lib/data/mock-tenant-applications';
import type { TenantApplication } from '@/lib/types/tenant-application';

interface TenantApplicationContextValue {
  applications: TenantApplication[];
  withdrawApplication: (id: string) => void;
  getApplicationById: (id: string) => TenantApplication | undefined;
}

// localStorage key: 'arriendo-facil-tenant-apps'
// SSR-safe hydration pattern (like DecisionContext)

// Provider wraps app or mis-aplicaciones layout
// Withdrawing sets status to 'withdrawn' and adds event
```

**Verification**: Context provides applications, withdraw updates state and persists.

### Task 2: Create ApplicationTimeline
**File**: `src/components/tenant/ApplicationTimeline.tsx`

Create timeline visualization component:

```typescript
import { CheckCircle2, Clock, Search, AlertCircle, XCircle, LogOut } from 'lucide-react';
import type { ApplicationEvent } from '@/lib/types/tenant-application';

interface ApplicationTimelineProps {
  events: ApplicationEvent[];
}

// Timeline layout following ConfirmationScreen pattern:
// [Icon] | [Title]
// [Line] | [Description, timestamp]
// [Icon] | [Title]
// ...

// Icons by event type:
// created → FileText
// submitted → Send
// documents_verified → CheckCircle2
// under_review → Search
// pre_approved → Clock
// approved → CheckCircle2 (green)
// rejected → XCircle (red)
// withdrawn → LogOut (gray)
```

**Verification**: Timeline renders chronologically, icons match event types.

### Task 3: Create ApplicationDetail
**File**: `src/components/tenant/ApplicationDetail.tsx`

Create detail drawer component:

```typescript
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ApplicationTimeline } from './ApplicationTimeline';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

interface ApplicationDetailProps {
  application: TenantApplication | null;
  property: Property | null;
  open: boolean;
  onClose: () => void;
  onWithdraw: (id: string) => void;
}

// Layout:
// [Sheet Header: Property title, status badge]
// [Property image, address, rent]
// [Tracking code display]
// [Timeline of events]
// [Status explanation text]
// [Withdraw button - only if status allows]

// Status explanations (Spanish):
// submitted: "Tu aplicacion ha sido recibida y esta en cola para revision."
// under_review: "El propietario esta revisando tu aplicacion."
// pre_approved: "El propietario esta interesado! Te contactaran pronto."
// approved: "Felicitaciones! Tu aplicacion ha sido aprobada."
// rejected: "Lo sentimos, tu aplicacion no fue aprobada esta vez."
// withdrawn: "Has retirado esta aplicacion."
```

**Verification**: Detail shows property, timeline, status explanation, withdraw button.

### Task 4: Create Mis Aplicaciones Page
**File**: `src/app/mis-aplicaciones/page.tsx`

Create the tenant applications page:

```typescript
'use client';

import { useState } from 'react';
import { ApplicationCard } from '@/components/tenant/ApplicationCard';
import { ApplicationDetail } from '@/components/tenant/ApplicationDetail';
import { TenantApplicationProvider, useTenantApplications } from '@/lib/context/TenantApplicationContext';
import { MOCK_PROPERTIES } from '@/lib/data/mock-properties';

// Page layout:
// [Header: "Mis Aplicaciones"]
// [Summary: X aplicaciones, X pendientes, X aprobadas]
// [Application cards grid/list]
// [Detail drawer when card clicked]

// Empty state:
// "No tienes aplicaciones aun"
// [Button: "Explorar propiedades" → /propiedades]

// Wrap page content with TenantApplicationProvider
```

**Also create layout**: `src/app/mis-aplicaciones/layout.tsx`
```typescript
import { TenantApplicationProvider } from '@/lib/context/TenantApplicationContext';

export default function MisAplicacionesLayout({ children }) {
  return <TenantApplicationProvider>{children}</TenantApplicationProvider>;
}
```

**Verification**: Page loads at /mis-aplicaciones, shows applications, detail drawer works.

## Verification Checklist

- [ ] `/mis-aplicaciones` route responds (not 404)
- [ ] Application cards render from mock data
- [ ] Clicking card opens detail drawer
- [ ] Timeline shows events chronologically
- [ ] Withdraw button appears for pending applications
- [ ] Withdraw changes status and adds event
- [ ] Status persists after page refresh (localStorage)

## Output

After completion:
1. Tenant tracking page fully functional
2. Timeline visualization complete
3. Withdraw capability working
4. Phase 6 success criteria satisfied
