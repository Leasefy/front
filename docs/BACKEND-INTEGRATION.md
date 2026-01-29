# Backend Integration Guide

**Last Updated:** 2026-01-29
**Frontend Status:** Complete (MVP Ready)
**Backend Status:** Pending Development

This document provides the complete API contract and data models needed to integrate the backend with the existing frontend.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Business Logic](#business-logic)
6. [Frontend Flows](#frontend-flows)
7. [Mock Data Reference](#mock-data-reference)

---

## Overview

### Tech Stack (Frontend)
- **Framework:** Next.js 14 (App Router)
- **UI:** React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **State:** React Context + localStorage (mock persistence)
- **Maps:** Mapbox GL + react-map-gl
- **Animations:** Framer Motion

### What Backend Needs to Provide
1. **REST API** or **GraphQL** endpoints matching the contracts below
2. **Authentication** (email magic link/OTP recommended)
3. **Database** (PostgreSQL recommended, Prisma schema provided)
4. **File Storage** (S3 or similar for property images, documents)
5. **Risk Score Engine** (scoring algorithm as defined in PROJECT.md)

### API Base URL
Frontend expects API at: `/api/v1/` (configurable via environment variable)

---

## Authentication

### Recommended: Email Magic Link (OTP)

**Flow:**
1. User enters email → `POST /api/v1/auth/send-otp`
2. User receives OTP via email
3. User enters OTP → `POST /api/v1/auth/verify-otp`
4. Backend returns JWT token + user data
5. Frontend stores token in httpOnly cookie or localStorage

### Endpoints

```
POST /api/v1/auth/send-otp
Body: { email: string }
Response: { success: true, message: string }

POST /api/v1/auth/verify-otp
Body: { email: string, code: string }
Response: {
  token: string,
  user: User,
  expiresAt: string
}

POST /api/v1/auth/logout
Headers: Authorization: Bearer <token>
Response: { success: true }

GET /api/v1/auth/me
Headers: Authorization: Bearer <token>
Response: User
```

### User Roles
- `tenant` - Can apply to properties, view applications, manage leases
- `landlord` - Can publish properties, review candidates, manage contracts

---

## API Endpoints

### Properties

```
GET /api/v1/properties
Query params:
  - city?: string
  - neighborhood?: string
  - minPrice?: number
  - maxPrice?: number
  - bedrooms?: number
  - type?: 'apartment' | 'house' | 'studio' | 'room'
  - amenities?: string[] (comma-separated)
  - limit?: number (default 20)
  - offset?: number (default 0)
Response: {
  properties: Property[],
  total: number,
  hasMore: boolean
}

GET /api/v1/properties/:id
Response: Property

POST /api/v1/properties (landlord only)
Body: CreatePropertyDTO
Response: Property

PUT /api/v1/properties/:id (owner only)
Body: UpdatePropertyDTO
Response: Property

DELETE /api/v1/properties/:id (owner only)
Response: { success: true }

POST /api/v1/properties/:id/images
Body: FormData with images
Response: { urls: string[] }
```

### Property Publishing (New - Phase 11)

```
POST /api/v1/properties/publish
Body: {
  type: 'apartment' | 'house' | 'studio' | 'room',
  city: string,
  neighborhood: string,  // Free text input
  address: string,
  bedrooms: number,
  bathrooms: number,
  area: number,
  parkingSpaces: number,
  floor?: number,
  stratum: number,
  yearBuilt: number,
  amenities: string[],
  photos: string[],  // URLs from image upload
  monthlyRent: number,
  adminFee: number,
  deposit: number,
  title: string,
  description: string,
  selectedPlan: 'free' | 'pro' | 'business'  // Plan selection
}
Response: {
  property: Property,
  redirectUrl: string  // e.g., /panel/propiedades
}
```

### Landlord Properties

```
GET /api/v1/landlord/properties
Headers: Authorization: Bearer <token>
Response: {
  properties: LandlordProperty[],
  summary: DashboardSummary
}

GET /api/v1/landlord/properties/:id
Headers: Authorization: Bearer <token>
Response: {
  property: LandlordProperty,
  candidates: LandlordCandidate[]
}
```

### Applications (Tenant)

```
POST /api/v1/applications
Body: ApplicationData (from wizard)
Response: {
  application: TenantApplication,
  trackingCode: string
}

GET /api/v1/applications
Headers: Authorization: Bearer <token>
Response: TenantApplication[]

GET /api/v1/applications/:id
Headers: Authorization: Bearer <token>
Response: TenantApplication

POST /api/v1/applications/:id/withdraw
Headers: Authorization: Bearer <token>
Response: { success: true }
```

### Candidates (Landlord)

```
GET /api/v1/candidates
Headers: Authorization: Bearer <token>
Query: propertyId?: string
Response: LandlordCandidate[]

GET /api/v1/candidates/:id
Headers: Authorization: Bearer <token>
Response: LandlordCandidate

POST /api/v1/candidates/:id/decision
Headers: Authorization: Bearer <token>
Body: {
  decision: 'pre-approved' | 'approved' | 'rejected' | 'more-info',
  notes?: string
}
Response: LandlordCandidate

POST /api/v1/candidates/:id/notes
Headers: Authorization: Bearer <token>
Body: { note: string }
Response: { success: true }
```

### Contracts

```
GET /api/v1/contracts/templates
Response: ContractTemplate[]

POST /api/v1/contracts
Body: {
  candidateId: string,
  templateId: string,
  customClauses?: ContractClause[],
  insuranceId?: string
}
Response: Contract

GET /api/v1/contracts/:id
Response: Contract

POST /api/v1/contracts/:id/sign
Body: {
  signature: string,  // Base64 or text
  acceptedClauses: string[],
  ipAddress: string,
  userAgent: string
}
Response: Contract
```

### Leases

```
GET /api/v1/leases
Headers: Authorization: Bearer <token>
Query: view?: 'landlord' | 'tenant'
Response: {
  leases: Lease[],
  stats: LeaseSummaryStats
}

GET /api/v1/leases/:id
Headers: Authorization: Bearer <token>
Response: Lease

GET /api/v1/leases/:id/payments
Headers: Authorization: Bearer <token>
Response: Payment[]

POST /api/v1/leases/:id/payments
Body: {
  amount: number,
  method: PaymentMethod,
  reference?: string
}
Response: Payment
```

### Subscriptions & Plans

```
GET /api/v1/plans
Response: Plan[]

GET /api/v1/subscriptions/current
Headers: Authorization: Bearer <token>
Response: Subscription | null

POST /api/v1/subscriptions
Body: {
  planId: 'free' | 'pro' | 'business',
  billingCycle: 'monthly' | 'yearly',
  couponCode?: string
}
Response: Subscription

POST /api/v1/coupons/validate
Body: { code: string, planId: string }
Response: CouponValidationResult
```

---

## Data Models

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: 'tenant' | 'landlord';
  createdAt: string;
  updatedAt: string;
}
```

### Property
```typescript
interface Property {
  id: string;
  title: string;
  description: string;
  type: 'apartment' | 'house' | 'studio' | 'room';
  status: 'available' | 'rented' | 'pending';

  // Location
  city: string;
  neighborhood: string;
  address: string;
  latitude: number;
  longitude: number;

  // Pricing (COP integers)
  monthlyRent: number;
  adminFee: number;
  deposit: number;

  // Features
  bedrooms: number;
  bathrooms: number;
  area: number;
  floor?: number;
  parkingSpaces?: number;
  stratum?: number;
  yearBuilt?: number;

  // Amenities
  amenities: PropertyAmenity[];

  // Images
  images: string[];
  thumbnailUrl: string;

  // Metadata
  landlordId: string;
  createdAt: string;
  updatedAt: string;
}
```

### LandlordCandidate
```typescript
interface LandlordCandidate {
  id: string;
  applicationId: string;
  propertyId: string;

  // Applicant info
  name: string;
  email: string;
  phone: string;
  avatar?: string;

  // Application details
  status: 'pending' | 'pre-approved' | 'approved' | 'rejected' | 'more-info';
  appliedAt: string;

  // Risk Score (from scoring engine)
  score: RiskScore;

  // Quick metrics
  monthlyIncome: number;
  yearsEmployed: number;

  // Documents
  documents: {
    type: string;
    url: string;
    verified: boolean;
  }[];

  // References
  references: {
    type: 'landlord' | 'employer' | 'personal';
    name: string;
    phone: string;
    verified: boolean;
  }[];

  // Landlord notes
  notes?: string;
}
```

### RiskScore
```typescript
interface RiskScore {
  total: number;  // 0-100
  level: 'A' | 'B' | 'C' | 'D';

  categories: {
    integrity: number;      // 0-25
    financial: number;      // 0-35
    stability: number;      // 0-25
    history: number;        // 0-15
  };

  // AI-generated explanation
  explanation: string;

  // Key positive factors
  drivers: {
    text: string;
    positive: boolean;
  }[];

  // Risk warnings
  flags: {
    code: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
  }[];

  // Suggested conditions
  conditions: {
    type: 'codeudor' | 'deposito_extra' | 'poliza' | 'documentos';
    message: string;
    required: boolean;
  }[];
}
```

### TenantApplication
```typescript
interface TenantApplication {
  id: string;
  trackingCode: string;  // Format: AF-XXXXXX
  propertyId: string;
  tenantId: string;

  status: 'submitted' | 'under_review' | 'pre_approved' | 'approved' | 'rejected' | 'withdrawn';

  // Property snapshot (at time of application)
  propertySnapshot: {
    title: string;
    address: string;
    monthlyRent: number;
    thumbnailUrl: string;
  };

  // Timeline events
  events: ApplicationEvent[];

  // Timestamps
  submittedAt: string;
  updatedAt: string;
}

interface ApplicationEvent {
  id: string;
  type: 'submitted' | 'viewed' | 'info_requested' | 'pre_approved' | 'approved' | 'rejected' | 'withdrawn';
  message: string;
  actorType: 'system' | 'landlord' | 'tenant';
  createdAt: string;
}
```

### Contract
```typescript
interface Contract {
  id: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  templateId: string;

  status: 'draft' | 'pending_signature' | 'signed' | 'active' | 'terminated';

  // Terms
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  paymentDueDay: number;

  // Clauses
  clauses: ContractClause[];

  // Insurance
  insurance?: {
    tier: 'none' | 'basic' | 'premium';
    monthlyPremium: number;
    coverage: string[];
  };

  // Signatures
  landlordSignature?: Signature;
  tenantSignature?: Signature;

  // Generated document
  documentUrl?: string;

  createdAt: string;
  updatedAt: string;
}
```

### Lease
```typescript
interface Lease {
  id: string;
  contractId: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  status: 'active' | 'ending_soon' | 'ended' | 'terminated';

  // Terms
  monthlyRent: number;
  adminFee: number;
  guaranteeType: 'poliza' | 'codeudor';
  startDate: string;
  endDate: string;
  paymentDueDay: number;

  // Denormalized property info
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertyThumbnail: string;

  // Denormalized tenant info
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;

  // Denormalized landlord info
  landlordName: string;
  landlordEmail: string;
  landlordPhone: string;

  // Documents
  contractUrl?: string;
  insuranceUrl?: string;

  createdAt: string;
  updatedAt: string;
}
```

### Subscription & Plans
```typescript
interface Plan {
  id: 'free' | 'pro' | 'business';
  name: string;
  description: string;
  monthlyPrice: number;  // COP
  yearlyPrice: number;   // COP (with discount)
  features: string[];
  limits: {
    properties: number;  // -1 for unlimited
    contracts: number;
    aiScoring: boolean;
    apiAccess: boolean;
  };
}

interface Subscription {
  id: string;
  userId: string;
  planId: 'free' | 'pro' | 'business';
  status: 'active' | 'cancelled' | 'past_due';
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  appliedCoupon?: AppliedCoupon;
}

interface Coupon {
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_months' | 'full_access';
  value: number;
  validUntil?: string;
  minPlanId?: 'pro' | 'business';
  maxUses?: number;
  usedCount: number;
}
```

---

## Business Logic

### Risk Score Algorithm

**Categories & Weights:**
| Category | Weight | Description |
|----------|--------|-------------|
| Integrity | 25 | Document verification, fraud detection |
| Financial | 35 | Rent-to-income ratio, debt analysis |
| Stability | 25 | Employment tenure, address history |
| History | 15 | Payment history, references |

**Levels:**
| Level | Score Range | Recommendation |
|-------|-------------|----------------|
| A | 85-100 | Recommended |
| B | 70-84 | Recommended |
| C | 50-69 | Conditional (with guarantees) |
| D | 0-49 | Not recommended |

**Risk Flags:**
- `HIGH_RENT_TO_INCOME` - Rent > 30% of income
- `LOW_TENURE` - < 1 year at current job
- `LATE_PAYMENTS` - History of late payments
- `MISSING_DOCS` - Required documents missing
- `INCOME_MISMATCH` - Declared vs verified income differs
- `FRAUD_SUSPECTED` - Inconsistencies detected

### Subscription Plan Limits

| Plan | Properties | Contracts | AI Scoring | API |
|------|------------|-----------|------------|-----|
| Free | 1 | 1 | No | No |
| Pro | 10 | Unlimited | Yes | No |
| Business | Unlimited | Unlimited | Yes | Yes |

**Pricing (COP):**
- Free: $0
- Pro: $149,900/month or $1,438,800/year (20% discount)
- Business: $499,900/month or $4,799,040/year (20% discount)

---

## Frontend Flows

### 1. Property Publishing Flow (9 steps)

1. **Type Selection** - apartment/house/studio/room
2. **Location** - City (visual cards), Neighborhood (free text), Address
3. **Details** - Bedrooms, bathrooms, area, parking, floor, stratum
4. **Amenities** - Multi-select from predefined list
5. **Photos** - Upload multiple images (min 1, first is thumbnail)
6. **Pricing** - Monthly rent, admin fee, deposit
7. **Description** - Title and description text
8. **Plan Selection** - Choose subscription plan (free/pro/business)
9. **Review** - Summary of all fields before publishing

**After Submit:**
- Show success screen with confetti
- Auto-redirect to `/panel/propiedades` after 5 seconds

### 2. Application Flow (6 steps)

1. **Personal Info** - Name, ID, DOB, phone, email
2. **Employment** - Status, company, position, tenure
3. **Income** - Salary, other income, debts
4. **References** - Landlord, employer, personal
5. **Documents** - ID, income proof, employment letter
6. **Review** - Summary with terms acceptance

**After Submit:**
- Generate tracking code (AF-XXXXXX)
- Show confirmation screen
- Run risk scoring engine

### 3. Candidate Approval Flow

1. Landlord reviews candidates in `/panel/[propertyId]`
2. Can: Pre-approve, Request info, Reject
3. After approval → Generate contract at `/panel/[propertyId]/contract/[candidateId]`
4. Contract signing with:
   - Insurance selection (none/basic/premium)
   - Clause review with checkboxes
   - Digital signature (Ley 527/1999 compliance)

### 4. Tenant Portal Flow

- `/inquilino` - Dashboard with stats
- `/inquilino/aplicaciones` - Application list with status
- `/inquilino/arriendo` - Active lease details
- `/inquilino/pagos` - Payment history
- `/inquilino/documentos` - Document management

### 5. Landlord Portal Flow

- `/panel` - Dashboard with property stats
- `/panel/propiedades` - Property list management
- `/panel/candidatos` - All candidates across properties
- `/panel/contratos` - Contract management
- `/panel/leases` - Active lease management

---

## Mock Data Reference

All mock data files are in `src/lib/data/`:

| File | Description |
|------|-------------|
| `mock-properties.ts` | 16 Colombian properties with coordinates |
| `mock-candidates.ts` | 12 candidates with risk scores |
| `mock-landlord-data.ts` | 3 properties with candidate distribution |
| `mock-tenant-applications.ts` | 6 applications in various states |
| `mock-contracts.ts` | 3 contract templates |
| `mock-leases.ts` | 4 active leases with payments |
| `mock-subscriptions.ts` | 3 plans (free/pro/business) |
| `mock-coupons.ts` | 11 test coupons |
| `mock-insurance.ts` | 3 insurance tiers |

---

## Environment Variables

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Mapbox (for interactive map)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxx

# Authentication
NEXT_PUBLIC_AUTH_COOKIE_NAME=arriendo-auth-token

# Feature Flags
NEXT_PUBLIC_ENABLE_MOCK_AUTH=true  # Disable in production
```

---

## Notes for Backend Team

1. **Currency:** All monetary values are in COP (Colombian Pesos) as integers
2. **Dates:** Use ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
3. **IDs:** UUIDs recommended
4. **Images:** Return CDN URLs, accept multipart form uploads
5. **Pagination:** Use limit/offset pattern, return total count
6. **Errors:** Return consistent error format:
   ```json
   {
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Campo requerido",
       "field": "email"
     }
   }
   ```

---

*Document generated: 2026-01-29*
