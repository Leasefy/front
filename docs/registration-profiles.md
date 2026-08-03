# Registration Profiles — global signup on/off

Admin-managed switch for the profiles a user can pick when registering
(Inquilino / Propietario / Inmobiliaria). Global to the whole platform.
Disabling a profile hides it from every signup surface; existing accounts are
never touched.

## Front pieces (this repo — shipped)

| Concern | File |
|---------|------|
| Identity + copy (source of truth) | `src/lib/constants/registration-profiles.ts` |
| Public read (enabled keys) | `src/lib/api/registration-profiles.service.ts` |
| Fail-open hook for signup | `src/lib/hooks/use-enabled-profiles.ts` |
| Admin method (list + toggle) | `src/lib/admin/registration-profiles.ts` |
| Admin screen | `src/app/admin/(panel)/registration-profiles/page.tsx` (Nav §29) |
| Consumer — register step | `src/components/auth/AuthForm.tsx` (`visibleRoleCards`) |
| Consumer — post-auth picker | `src/app/onboarding/seleccionar-rol/page.tsx` |

**Canonical keys:** `tenant | landlord | agency`. The role picker's internal
`inmobiliaria` label maps to `agency`.

**Fail-open invariant:** the signup read NEVER locks users out. If the config
backend errors, is unreachable, or returns an empty set, all profiles stay
visible. Only a valid non-empty response narrows the set.

## Backend handoff — endpoints to build

Two services are involved, mirroring how the app already splits admin vs. public
traffic.

### 1. Admin backend (`NEXT_PUBLIC_ADMIN_API_URL` + `/api/v1/admin`)

Bearer = admin Supabase JWT (allowlist), same as every other admin route.

```
GET /api/v1/admin/registration-profiles
  200 → [
    { "key": "tenant",   "enabled": true,  "updated_at": null,                 "updated_by": null },
    { "key": "landlord", "enabled": true,  "updated_at": "2026-08-01T00:00:00Z","updated_by": "admin@leasefy.co" },
    { "key": "agency",   "enabled": false, "updated_at": "2026-08-02T10:00:00Z","updated_by": "admin@leasefy.co" }
  ]

PATCH /api/v1/admin/registration-profiles/:key
  body { "enabled": boolean }
  200 → updated row (same shape as above)
  409 → when disabling the LAST enabled profile (guard) — message shown verbatim
```

Requirements:
- **Guard:** refuse (409) any PATCH that would leave zero enabled profiles.
- **Audit:** write an `audit_log` row on every PATCH (`action="registration_profile.toggle"`, key, from→to, admin email).
- **Re-check admin** on write (same pattern as other admin mutations).

### 2. Public config (main backend, `NEXT_PUBLIC_BACKEND_URL`)

No auth — the register step runs before login.

```
GET /config/registration-profiles
  200 → [ { "key": "tenant", "enabled": true }, ... ]
```

Cheap and cacheable. Until it exists this GET 404s and the front fails open
(all profiles visible), so shipping order is flexible.

### Suggested storage

A tiny table keyed by profile, seeded with all three enabled:

```sql
CREATE TABLE registration_profiles (
  key         TEXT PRIMARY KEY,              -- 'tenant' | 'landlord' | 'agency'
  enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ,
  updated_by  TEXT
);
INSERT INTO registration_profiles (key, enabled) VALUES
  ('tenant', TRUE), ('landlord', TRUE), ('agency', TRUE);
```

The public `GET /config/registration-profiles` is a `SELECT key, enabled FROM registration_profiles`.
