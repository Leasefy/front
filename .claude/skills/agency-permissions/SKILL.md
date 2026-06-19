---
name: agency-permissions
description: permisos agencia roles ADMIN AGENTE CONTADOR VIEWER canAccess PermissionsContext PageGuard AgencyRoleGuard PermissionGate ProtectedRoute guards client-side auth
license: MIT
metadata:
  author: leasify-front
  version: 1.0.0
---

# Agency Permissions Skill

## Activation Contract

Invoke when touching: agency role checks, `canAccess(module, action)`, `PageGuard`, `AgencyRoleGuard`, `PermissionGate`, `ProtectedRoute`, `isAgencyManager`, `isAgencyMember`, or any `src/components/auth/` file.

## Hard Rules

- ALL auth guards are client-side React components. `src/middleware.ts` is an explicit pass-through — there is NO server-side auth enforcement. Never assume middleware protection.
- `PermissionsProvider` is scoped to the `/panel/inmobiliaria` layout subtree ONLY (`layout.tsx:43`). Do not use `usePermissionsContext` outside that subtree — use `usePermissionsContextSafe()` which returns `null` when outside the provider.
- `useAgencyAccess` is NOT exported from `src/lib/auth/index.ts` — import directly from `src/lib/auth/useAgencyAccess`.
- `PageGuard`, `PermissionGate`, and `AgencyRoleGuard` are NOT in the `src/components/auth/index.ts` barrel — import them directly from their files.
- `canAccess` for `module === 'cobranza'` or `'cotizador'` delegates to the **agent** permissions endpoint (`NEXT_PUBLIC_AGENT_URL/api/agency/{agencyId}/my-permissions`), not the backend. `PermissionsProvider` fetches both in parallel on mount.
- `isAgencyManager` returns `true` for roles `ADMIN` or `AGENTE`. `isAgencyMember` returns `true` for any non-null role. These are defined in `agency-roles.ts:25–35`.
- `PermissionGate` exists as a component but has no current consumers in `src/`. In practice, pages use `PageGuard` or call `canAccess()` directly.

## Roles

| Constant | Value | Included in `isAgencyManager` |
|----------|-------|-------------------------------|
| `AGENCY_ROLES.ADMIN` | `'ADMIN'` | yes |
| `AGENCY_ROLES.AGENTE` | `'AGENTE'` | yes |
| `AGENCY_ROLES.CONTADOR` | `'CONTADOR'` | no |
| `AGENCY_ROLES.VIEWER` | `'VIEWER'` | no |

`AGENCY_MANAGER_ROLES = ['ADMIN', 'AGENTE']` (agency-roles.ts:18)

## Key Paths

| What | Path | Key symbol / line |
|------|------|-------------------|
| Role constants | `src/lib/auth/agency-roles.ts:5` | `AGENCY_ROLES`, `AgencyRole` |
| Manager check | `src/lib/auth/agency-roles.ts:25` | `isAgencyManager({ isAdmin, agencyRole })` |
| Member check | `src/lib/auth/agency-roles.ts:33` | `isAgencyMember({ isAdmin, agencyRole })` |
| Auth context | `src/lib/auth/auth-context.tsx:18` | `AuthContext`, `AuthProvider` |
| Storage key | `src/lib/auth/auth-context.tsx:123` | `AUTH_STORAGE_KEY = 'arriendo-facil-auth'` |
| Agency access hook | `src/lib/auth/useAgencyAccess.ts:14` | `useAgencyAccess()` → `{ isManager, isMember, isLoading, isOutsideAgencyLayout }` |
| Permissions context | `src/lib/context/PermissionsContext.tsx:74` | `PermissionsProvider`, `canAccess(module, action)` |
| canAccess signature | `src/lib/context/PermissionsContext.tsx:21` | `(module: string, action: string) => boolean` |
| Safe hook | `src/lib/context/PermissionsContext.tsx:172` | `usePermissionsContextSafe()` |
| Permissions hook alias | `src/lib/hooks/usePermissions.ts:5` | `usePermissions` = re-export of `usePermissionsContext` |
| ProtectedRoute | `src/components/auth/ProtectedRoute.tsx` | `allowedRoles?`, `blockedAgencyRoles?` |
| PageGuard | `src/components/auth/PageGuard.tsx` | `module?`, `action? (default 'view')`, `adminOnly?` |
| AgencyRoleGuard | `src/components/auth/AgencyRoleGuard.tsx` | `allowed: 'managers' \| 'members'`, `fallbackPath?` |
| PermissionGate | `src/components/auth/PermissionGate.tsx` | `module`, `action`, `fallback?` |
| Provider mount point | `src/app/panel/inmobiliaria/layout.tsx:43` | `<PermissionsProvider>` wraps all inmobiliaria pages |
| Middleware (pass-through) | `src/middleware.ts:25` | `return NextResponse.next()` — no auth |

## canAccess Module Values (production)

`contratos`, `portafolio`, `cobros`, `dispersiones`, `reportes`, `analytics`, `pipeline`, `operaciones`, `documentos`, `agentes`, `propietarios`, `cobranza`, `cotizador`, `ap`, `configuracion`. Admin-only modules: `upgrade`, `tesoreria`, `facturacion`, `conciliacion`, `pqrs`, `agenda`, `checkout`.

## Decision Gates

- New inmobiliaria page that needs permission? Use `<PageGuard module="X">` — it is the canonical pattern (40+ pages use it).
- Need manager-only access? Use `<AgencyRoleGuard allowed="managers">` OR check `useAgencyAccess().isManager`. Do NOT manually compare role strings.
- Need to guard a UI element (button, section)? Use `PermissionGate` or `canAccess()` inline — but note `PermissionGate` has no existing consumers: check if `PageGuard`'s page-level guard is sufficient first.
- Outside `/panel/inmobiliaria` layout? Use `usePermissionsContextSafe()`, not `usePermissionsContext()`.
- `cobranza`/`cotizador` permissions? They come from the agent service (`NEXT_PUBLIC_AGENT_URL`), not the backend — `PermissionsProvider` fetches both in parallel.
- Adding a new role? Update `AGENCY_ROLES`, `AGENCY_MANAGER_ROLES` (if manager-level), and `AgencyRole` type — all in `agency-roles.ts`.

## Execution Steps

1. Determine scope: entire page (`PageGuard`) vs. UI element (`PermissionGate`/`canAccess`) vs. role gate (`AgencyRoleGuard`).
2. For new pages under `/panel/inmobiliaria`, wrap with `<PageGuard module="X">` in the page component.
3. For manager-only flows, use `isAgencyManager({ isAdmin, agencyRole })` from `agency-roles.ts` — never compare strings directly.
4. Test with VIEWER and CONTADOR roles (non-manager) to confirm fallback behavior.
5. If the feature touches `cobranza` or `cotizador`, confirm `NEXT_PUBLIC_AGENT_URL` is set in the environment.

## References

Cross-links: [[agent-api-contract]] (agent permissions endpoint at `NEXT_PUBLIC_AGENT_URL`), [[scoring-domain]] (CandidateDrawer behind `pipeline` module gate).
