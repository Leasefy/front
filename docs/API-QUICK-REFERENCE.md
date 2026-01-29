# API Quick Reference

Quick reference for all API endpoints the backend needs to implement.

---

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/send-otp` | Send OTP to email |
| POST | `/api/v1/auth/verify-otp` | Verify OTP and get token |
| POST | `/api/v1/auth/logout` | Logout user |
| GET | `/api/v1/auth/me` | Get current user |

---

## Properties (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/properties` | List properties (with filters) |
| GET | `/api/v1/properties/:id` | Get property detail |

**Query Params for listing:**
- `city`, `neighborhood`, `minPrice`, `maxPrice`
- `bedrooms`, `type`, `amenities`
- `limit`, `offset`

---

## Property Publishing (Landlord)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/properties/publish` | Create new property |
| PUT | `/api/v1/properties/:id` | Update property |
| DELETE | `/api/v1/properties/:id` | Delete property |
| POST | `/api/v1/properties/:id/images` | Upload images |

**Publish Body:**
```json
{
  "type": "apartment|house|studio|room",
  "city": "string",
  "neighborhood": "string (free text)",
  "address": "string",
  "bedrooms": "number",
  "bathrooms": "number",
  "area": "number",
  "parkingSpaces": "number",
  "floor": "number (optional)",
  "stratum": "number",
  "yearBuilt": "number",
  "amenities": ["string"],
  "photos": ["url"],
  "monthlyRent": "number (COP)",
  "adminFee": "number (COP)",
  "deposit": "number (COP)",
  "title": "string",
  "description": "string",
  "selectedPlan": "free|pro|business"
}
```

---

## Landlord Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/landlord/properties` | My properties + summary |
| GET | `/api/v1/landlord/properties/:id` | Property + candidates |

---

## Applications (Tenant)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/applications` | Submit application |
| GET | `/api/v1/applications` | My applications |
| GET | `/api/v1/applications/:id` | Application detail |
| POST | `/api/v1/applications/:id/withdraw` | Withdraw application |

---

## Candidates (Landlord)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/candidates` | All candidates |
| GET | `/api/v1/candidates/:id` | Candidate detail |
| POST | `/api/v1/candidates/:id/decision` | Make decision |
| POST | `/api/v1/candidates/:id/notes` | Add note |

**Decision Body:**
```json
{
  "decision": "pre-approved|approved|rejected|more-info",
  "notes": "string (optional)"
}
```

---

## Contracts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/contracts/templates` | Get templates |
| POST | `/api/v1/contracts` | Create contract |
| GET | `/api/v1/contracts/:id` | Get contract |
| POST | `/api/v1/contracts/:id/sign` | Sign contract |

**Sign Body:**
```json
{
  "signature": "string",
  "acceptedClauses": ["string"],
  "ipAddress": "string",
  "userAgent": "string"
}
```

---

## Leases

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/leases` | My leases |
| GET | `/api/v1/leases/:id` | Lease detail |
| GET | `/api/v1/leases/:id/payments` | Payment history |
| POST | `/api/v1/leases/:id/payments` | Make payment |

---

## Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/plans` | Available plans |
| GET | `/api/v1/subscriptions/current` | Current subscription |
| POST | `/api/v1/subscriptions` | Subscribe to plan |
| POST | `/api/v1/coupons/validate` | Validate coupon |

---

## Response Formats

### Success Response
```json
{
  "data": { ... },
  "meta": {
    "total": 100,
    "hasMore": true
  }
}
```

### Error Response
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

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Not allowed |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate or conflict |
| `SERVER_ERROR` | 500 | Internal error |

---

## Currency Format

All monetary values in **COP (Colombian Pesos)** as integers:
- `2500000` = $2,500,000 COP
- `149900` = $149,900 COP

---

## Date Format

ISO 8601: `2026-01-29T14:30:00Z`

---

## Pagination

- `limit`: Items per page (default 20, max 100)
- `offset`: Skip items (default 0)

Response includes:
```json
{
  "meta": {
    "total": 156,
    "hasMore": true
  }
}
```

---

*Quick reference for backend development*
