# Backend Integration Analysis

**Analysis Date:** 2026-01-28

## 1. Backend Overview

### Tech Stack

**Language/Runtime:**
- TypeScript with strict mode
- Node.js (via NestJS)

**Framework:**
- NestJS 11.x - Progressive Node.js framework
- Modular architecture with dependency injection

**Database:**
- PostgreSQL via Supabase
- Prisma ORM 7.3.x with pg adapter
- Connection pooling via Supabase Pooler

**Key Dependencies:**
- `@nestjs/swagger` - API documentation
- `@nestjs/terminus` - Health checks
- `class-validator` / `class-transformer` - Request validation
- `pg` - PostgreSQL client

### API Structure

**Base Configuration:**
- Port: 3000 (configurable via `PORT` env)
- CORS: Enabled for development, restricted in production
- Swagger: Available at `/api`
- Health: Available at `/health`

**Global Middleware:**
- `ValidationPipe` - Request validation with whitelist and transform
- `AllExceptionsFilter` - Standardized error responses

**Error Response Format:**
```typescript
interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
}
```

### Authentication Mechanism

**Planned (Phase 2):**
- Supabase Auth with JWT tokens
- Bearer token authentication
- Role-based access control (TENANT / LANDLORD / BOTH)
- Auth guard for protected routes

**Current Status:** Not implemented (Phase 1 complete, Phase 2 pending)

### Database Schema

**Current Status:** Empty schema (Phase 1 foundation only)

**Planned Models (from ROADMAP):**
- User - Auth-synced user profiles
- Property - Rental property listings
- Application - Tenant applications with wizard steps
- Document - Uploaded application documents
- RiskScoreResult - Scoring engine results
- ApplicationEvent - State transition logs

---

## 2. Available API Endpoints

### Implemented Endpoints

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `GET` | `/` | Root - returns hello message | None |
| `GET` | `/health` | Health check with DB status | None |

**Health Check Response:**
```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } },
  "error": {},
  "details": { "database": { "status": "up" } }
}
```

### Planned Endpoints (from Backend ROADMAP)

**Authentication (Phase 2):**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/auth/register` | Register with email via Supabase |
| `POST` | `/auth/login` | Login and receive JWT |
| `POST` | `/auth/logout` | Invalidate session |

**Users (Phase 2):**
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/users/me` | Get current user profile |
| `PATCH` | `/users/me` | Update profile (name, phone) |
| `PATCH` | `/users/me/role` | Switch role (if BOTH) |

**Properties (Phase 3):**
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/properties` | List/filter properties (public) |
| `GET` | `/properties/:id` | Property detail (public) |
| `POST` | `/properties` | Create property (landlord) |
| `PATCH` | `/properties/:id` | Update property (owner) |
| `DELETE` | `/properties/:id` | Delete property (owner) |
| `GET` | `/properties/mine` | Landlord's properties |
| `POST` | `/properties/:id/images` | Upload images |

**Applications (Phase 4):**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/applications` | Start application (tenant) |
| `GET` | `/applications/:id` | Get application details |
| `PATCH` | `/applications/:id/step/:step` | Save wizard step |
| `POST` | `/applications/:id/submit` | Submit application |
| `POST` | `/applications/:id/withdraw` | Withdraw application |
| `GET` | `/applications/mine` | Tenant's applications |
| `GET` | `/applications/:id/timeline` | Application events |

**Documents (Phase 4):**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/applications/:id/documents` | Upload document |
| `GET` | `/documents/:id/url` | Get signed URL |

**Scoring (Phases 5-7):**
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/applications/:id/score` | Get risk score |
| `POST` | `/scoring/calculate` | Trigger async scoring |

**Candidates/Landlord (Phase 8):**
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/properties/:id/candidates` | List candidates |
| `GET` | `/candidates/:id` | Candidate detail with score |
| `POST` | `/candidates/:id/decision` | Pre-approve/approve/reject |
| `POST` | `/candidates/:id/request-info` | Request additional info |
| `POST` | `/candidates/:id/notes` | Add private note |

---

## 3. Frontend Integration Opportunities

### Features with Backend Endpoints Ready

**None currently** - Backend is at Phase 1 (foundation only). All frontend features currently use mock data.

### Features Needing Backend Endpoints

| Frontend Feature | Mock Data Location | Backend Phase | Priority |
|-----------------|-------------------|---------------|----------|
| User Authentication | `src/lib/auth/use-auth.ts` | Phase 2 | **Critical** |
| User Profiles | `src/lib/data/mock-users.ts` | Phase 2 | **Critical** |
| Property Listings | `src/lib/data/mock-properties.ts` | Phase 3 | **High** |
| Property Filtering | `src/lib/hooks/usePropertyFilters.ts` | Phase 3 | High |
| Application Wizard | `src/lib/types/application.ts` | Phase 4 | **High** |
| Document Upload | N/A (File type only) | Phase 4 | High |
| Risk Score Display | `src/lib/data/mock-candidates.ts` | Phases 5-7 | **High** |
| Candidate Management | `src/lib/data/mock-candidates.ts` | Phase 8 | High |
| Application Tracking | `src/lib/data/mock-tenant-applications.ts` | Phase 4 | Medium |
| Contracts/Signing | `src/lib/data/mock-contracts.ts` | Out of scope | Low |
| Leases/Payments | `src/lib/data/mock-leases.ts` | Out of scope | Low |
| Subscriptions | `src/lib/data/mock-subscriptions.ts` | Out of scope | Low |
| Insurance | `src/lib/data/mock-insurance.ts` | Out of scope | Low |

### Backend Endpoints Without Frontend Usage

**N/A** - No endpoints exist beyond health check.

---

## 4. Data Model Alignment

### Property Types

**Frontend (`src/lib/types/property.ts`):**
```typescript
interface Property {
  id: string;
  title: string;
  description: string;
  type: PropertyType;           // 'apartment' | 'house' | 'studio' | 'room'
  status: PropertyStatus;       // 'available' | 'rented' | 'pending'
  city: string;
  neighborhood: string;
  address: string;
  latitude: number;
  longitude: number;
  monthlyRent: number;          // COP
  adminFee: number;
  deposit: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  floor?: number;
  amenities: PropertyAmenity[];
  images: string[];
  thumbnailUrl: string;
  landlordId: string;
  createdAt: string;
  updatedAt: string;
}
```

**Backend Expected (from ROADMAP):**
```typescript
{
  id, ownerId, title, description, address, city, neighborhood,
  priceMonthly, adminFee, bedrooms, bathrooms, area,
  furnished, petFriendly, parking, availableFrom,
  images: [{ id, url, order }]
}
```

**Mismatches:**
| Frontend Field | Backend Field | Resolution |
|---------------|---------------|------------|
| `monthlyRent` | `priceMonthly` | Backend use `monthlyRent` for consistency |
| `landlordId` | `ownerId` | Backend use `landlordId` |
| `type` | Not specified | Backend should add `propertyType` field |
| `status` | Not specified | Backend should add `status` field |
| `deposit` | Not specified | Backend should add `deposit` field |
| `latitude/longitude` | Not specified | Backend should add for map features |
| `thumbnailUrl` | `images[0].url` | Derive from first image |
| `amenities` | Flat booleans | Consider amenities array or JSON |
| `floor` | Not specified | Backend should add optional `floor` |

### User/Auth Types

**Frontend (`src/lib/auth/types.ts`):**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'tenant' | 'landlord';
}
```

**Backend Expected:**
```typescript
interface User {
  id: string;           // Supabase Auth UID
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: 'TENANT' | 'LANDLORD' | 'BOTH';
}
```

**Mismatches:**
| Issue | Resolution |
|-------|------------|
| Role values differ (lowercase vs uppercase) | Frontend should accept uppercase from API |
| Missing `BOTH` role | Frontend needs `'both'` type and role switcher UI |
| Missing `phone` field | Frontend should add phone to user display |

### Application Types

**Frontend (`src/lib/types/application.ts`):**
- Full 6-step wizard structure
- PersonalInfo, EmploymentInfo, IncomeInfo, ReferenceInfo, DocumentInfo
- ApplicationStatus: `'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'`

**Backend Expected:**
- Same wizard steps (APPL-02 through APPL-07)
- Additional states: `NEEDS_INFO` | `PREAPPROVED` | `WITHDRAWN`
- State machine with transition validation

**Mismatches:**
| Issue | Resolution |
|-------|------------|
| Missing `needs_info` status | Frontend should add status |
| Missing `preapproved` status | Frontend should add status (exists in tenant-application.ts) |
| Missing `withdrawn` status | Already exists in tenant-application.ts |
| Case differences | Normalize to snake_case for API |

### Risk Score Types

**Frontend (`src/lib/types/risk-score.ts`):**
```typescript
interface RiskScore {
  level: RiskLevel;           // 'A' | 'B' | 'C' | 'D'
  numericScore: number;       // 0-100
  categories: ScoreCategory[];
  drivers: string[];
  flags: RiskFlag[];
  suggestedConditions: SuggestedCondition[];
  aiExplanation: string;
}
```

**Backend Expected (from ROADMAP):**
```typescript
{
  totalScore: number,
  level: 'A' | 'B' | 'C' | 'D',
  recommendation: string,
  subscores: { integrity, financial, stability, history, documents },
  drivers: string[],
  flags: RiskFlag[],
  suggestedConditions: Condition[],
  aiExplanation: string
}
```

**Mismatches:**
| Frontend Field | Backend Field | Resolution |
|---------------|---------------|------------|
| `numericScore` | `totalScore` | Frontend rename to `totalScore` |
| `categories` array | `subscores` object | Backend use array format or frontend adapt |
| Missing `recommendation` | - | Frontend should add recommendation display |
| Category names differ | - | Align: `financial`, `employment`->`stability`, `history`, `documents` |
| Missing `integrity` | - | Frontend should add integrity category |

### Candidate Types

**Frontend (`src/lib/types/candidate.ts`):**
- Full candidate profile with personal/employment/income
- CandidateStatus: `'pending' | 'reviewing' | 'approved' | 'rejected' | 'withdrawn'`

**Backend Expected:**
- Same structure but derived from Application + RiskScoreResult
- Additional status: `PRE_APPROVED`

**Good Alignment:** Candidate types largely match backend intent.

---

## 5. Integration Priority Recommendations

### Phase 2: Authentication (CRITICAL - Start Here)

**Impact:** Unlocks all authenticated features
**Complexity:** Medium (Supabase Auth well-documented)
**Dependencies:** None

**Frontend Changes Required:**
1. Update `src/lib/auth/use-auth.ts` to call real API
2. Add role type `'both'`
3. Store JWT in secure storage
4. Add auth headers to all API calls

**Backend Endpoints:**
- `POST /auth/register`
- `POST /auth/login`
- `GET /users/me`

### Phase 3: Properties (HIGH - Core Feature)

**Impact:** Enables property browsing (primary user flow)
**Complexity:** Low (standard CRUD)
**Dependencies:** Phase 2 (for landlord CRUD)

**Frontend Changes Required:**
1. Replace `mockProperties` with API calls
2. Update property list/detail pages to fetch
3. Add loading states
4. Field mapping: `monthlyRent`, `landlordId`

**Backend Endpoints:**
- `GET /properties` (public)
- `GET /properties/:id` (public)
- `POST/PATCH/DELETE /properties/:id` (landlord)

### Phase 4: Applications (HIGH - Core Feature)

**Impact:** Enables tenant application flow
**Complexity:** Medium (wizard state management)
**Dependencies:** Phase 3 (properties must exist)

**Frontend Changes Required:**
1. Create API service for applications
2. Persist wizard progress to backend
3. Add document upload integration
4. Update status types to match backend

**Backend Endpoints:**
- `POST /applications`
- `PATCH /applications/:id/step/:step`
- `POST /applications/:id/documents`
- `POST /applications/:id/submit`

### Phases 5-7: Scoring (HIGH - Differentiator)

**Impact:** Core value proposition - AI risk scoring
**Complexity:** High (async processing, AI integration)
**Dependencies:** Phase 4 (applications must exist)

**Frontend Changes Required:**
1. Poll or WebSocket for async score results
2. Update score display for new structure
3. Add integrity category display
4. Map `totalScore` <-> `numericScore`

**Backend Endpoints:**
- `GET /applications/:id/score`

### Phase 8: Landlord Dashboard (MEDIUM)

**Impact:** Landlord decision workflow
**Complexity:** Medium
**Dependencies:** Phases 5-7 (scores needed)

**Frontend Changes Required:**
1. Replace `mockCandidates` with API calls
2. Implement decision actions
3. Add notes functionality

**Backend Endpoints:**
- `GET /properties/:id/candidates`
- `POST /candidates/:id/decision`

### Deferred: Contracts, Leases, Payments, Subscriptions

**Impact:** Post-approval flows
**Reason:** Backend marks as "Out of Scope" for MVP
**Recommendation:** Keep using mock data for demos

---

## 6. Technical Integration Notes

### API Client Setup

**Recommended:** Create centralized API client

```typescript
// src/lib/api/client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}
```

### Environment Variables

**Frontend `.env.local`:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Backend `.env`:**
```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=...
PORT=3000
NODE_ENV=development
```

### Data Fetching Strategy

**Recommended:** Use React Query or SWR for:
- Automatic caching
- Background refetching
- Loading/error states
- Optimistic updates

```typescript
// Example with SWR
import useSWR from 'swr';

export function useProperties(filters?: PropertyFilters) {
  const params = new URLSearchParams(filters);
  return useSWR(`/properties?${params}`, apiClient);
}
```

### Mock Data Fallback

During transition, keep mock data as fallback:

```typescript
export async function getProperties(): Promise<Property[]> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') {
    return mockProperties;
  }
  return apiClient('/properties');
}
```

---

*Backend integration analysis: 2026-01-28*
