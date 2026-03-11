---
phase: inmobiliaria-10-configuracion-docs-analytics
plan: 02
subsystem: configuracion
tags: [users, permissions, roles, team-management, access-control]

dependency_graph:
  requires: ["10-01"]
  provides: ["ConfigUsuarios", "ConfigPermisos", "AgencyUser types", "RolePermissions types"]
  affects: ["10-08"]

tech_stack:
  added: []
  patterns: ["permission-matrix", "role-based-access", "user-management-table", "invite-modal"]

key_files:
  created:
    - src/components/inmobiliaria/ConfigUsuarios.tsx
    - src/components/inmobiliaria/ConfigPermisos.tsx
  modified:
    - src/lib/types/inmobiliaria.ts
    - src/lib/data/mock-inmobiliaria.ts
    - src/components/inmobiliaria/index.ts

decisions:
  - id: role-types
    description: "Four agency roles: admin, agente, contador, viewer"
    rationale: "Covers typical Colombian real estate agency structure"
  - id: permission-modules
    description: "12 permission modules covering all platform areas"
    rationale: "Granular control over each functional area"
  - id: permission-actions
    description: "5 actions: view, create, edit, delete, export"
    rationale: "Standard CRUD + export covers all needed operations"

metrics:
  duration: 7min
  completed: 2026-02-08
---

# Phase 10 Plan 02: ConfigUsuarios + ConfigPermisos Summary

User management and permissions configuration components for real estate agency team management.

## One-liner

Team management UI with user table, invite modal, role editor, and permission matrix for granular access control.

## What Was Built

### ConfigUsuarios Component (~620 lines)

Full-featured user management interface:

1. **Header Row**
   - Title "Equipo" with user counts (total, active, invited)
   - "Invitar Usuario" button

2. **Filter Bar**
   - Search by name/email (debounced)
   - Role dropdown (all, admin, agente, contador, viewer)
   - Status dropdown (all, active, invited, inactive)

3. **Users Table**
   - Avatar with initials fallback
   - Name + email + phone
   - Role badge (color-coded: purple=admin, blue=agente, emerald=contador, slate=viewer)
   - Status badge (emerald=active, amber=invited, slate=inactive)
   - Last login with relative time ("hace 2 horas")
   - Actions dropdown menu

4. **Actions Menu**
   - Editar rol (opens role edit modal)
   - Reenviar invitacion (for invited users)
   - Desactivar/Reactivar toggle
   - Eliminar (opens delete confirmation)

5. **Invite Modal**
   - Email input (required, validated)
   - Name input (required)
   - Role select (admin/agente/contador/viewer)
   - Custom message textarea (optional)
   - Send button with loading state

### ConfigPermisos Component (~580 lines)

Permission matrix editor for role-based access:

1. **Header**
   - Title with shield icon
   - "Restablecer" button (reset to defaults)
   - "Guardar cambios" button (with unsaved indicator)

2. **Role Tabs**
   - Tab for each role: Admin, Agente, Contador, Viewer
   - Permission count badge per role
   - Admin tab shows locked message

3. **Permission Matrix Table**
   - **Rows**: 12 modules (dashboard, propietarios, portafolio, pipeline, agentes, cobros, dispersiones, operaciones, reportes, configuracion, documentos, analytics)
   - **Columns**: 5 actions (Ver, Crear, Editar, Eliminar, Exportar)
   - Module icons from Phosphor
   - Select all checkbox per row and column
   - Color-coded checkboxes (emerald=enabled, amber=sensitive, neutral=disabled)
   - Warning indicator for delete and config edit permissions

4. **Visual Indicators**
   - Admin permissions locked (greyed out)
   - Sensitive permissions highlighted in amber
   - Unsaved changes banner
   - Legend explaining colors

5. **Dialogs**
   - Save confirmation dialog
   - Reset to defaults confirmation

### Types Added

```typescript
type AgencyRole = 'admin' | 'agente' | 'contador' | 'viewer';

type PermissionModule =
  | 'dashboard' | 'propietarios' | 'portafolio' | 'pipeline'
  | 'agentes' | 'cobros' | 'dispersiones' | 'operaciones'
  | 'reportes' | 'configuracion' | 'documentos' | 'analytics';

type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

interface AgencyUser {
  id: string;
  email: string;
  name: string;
  role: AgencyRole;
  avatar?: string;
  phone?: string;
  status: 'active' | 'invited' | 'inactive';
  invitedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
}

interface RolePermissions {
  role: AgencyRole;
  permissions: RolePermission[];
}
```

### Helper Functions Added

- `getRoleLabel(role)` - Returns Spanish label for role
- `getRoleColor(role)` - Returns Tailwind classes for role badge
- `getUserStatusLabel(status)` - Returns Spanish label for user status
- `getUserStatusColor(status)` - Returns Tailwind classes for status badge
- `getModuleLabel(module)` - Returns Spanish label for permission module
- `getActionLabel(action)` - Returns Spanish label for permission action
- `hasPermission(perms, module, action)` - Checks if role has specific permission
- `updateRolePermission(perms, module, action, enabled)` - Immutable permission update

### Mock Data Added

```typescript
MOCK_AGENCY_USERS: AgencyUser[] // 10 sample users
DEFAULT_ROLE_PERMISSIONS: Record<AgencyRole, RolePermissions> // Default permissions per role
```

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `src/components/inmobiliaria/ConfigUsuarios.tsx` | Created | 620 |
| `src/components/inmobiliaria/ConfigPermisos.tsx` | Created | 580 |
| `src/lib/types/inmobiliaria.ts` | Modified | +251 |
| `src/lib/data/mock-inmobiliaria.ts` | Modified | +90 |
| `src/components/inmobiliaria/index.ts` | Modified | +3 |

## Commits

| Hash | Message |
|------|---------|
| b773bc4 | feat(10-02): add ConfigUsuarios and ConfigPermisos components |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] pnpm tsc --noEmit passes
- [x] User and permission types defined
- [x] Mock agency users exported
- [x] ConfigUsuarios shows user table with actions
- [x] ConfigUsuarios invite modal works
- [x] ConfigPermisos shows permission matrix
- [x] Role tabs switch correctly
- [x] Components exported from barrel

## Next Phase Readiness

Plan 10-02 complete. Ready for:
- Plan 10-03: ConfigIntegraciones + ConfigFacturacion (already complete)
- Plan 10-08: Route pages and navigation integration
