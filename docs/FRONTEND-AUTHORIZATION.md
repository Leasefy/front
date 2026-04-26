# Leasefy — Autorización en el Frontend

> Guía operativa del sistema de gates y permisos del frontend.
> Complementa a [`BACKEND-ROLES-PERMISSIONS.md`](./BACKEND-ROLES-PERMISSIONS.md) (que describe los roles/permisos desde la óptica del backend).
> Última revisión: 2026-04-19 (contratos ya es módulo del backend; mensajes sigue sin módulo)

---

## Tabla de contenido

1. [Visión general](#1-vision-general)
2. [Niveles de gating disponibles](#2-niveles-de-gating-disponibles)
3. [Gate por módulo (canonical path)](#3-gate-por-modulo-canonical-path)
4. [Gate por rol de agencia (fallback temporal)](#4-gate-por-rol-de-agencia-fallback-temporal)
5. [Matriz actual: qué pantalla usa qué](#5-matriz-actual-que-pantalla-usa-que)
6. [Matriz de acciones por rol (inmobiliaria)](#6-matriz-de-acciones-por-rol-inmobiliaria)
7. [Manejo de errores 403](#7-manejo-de-errores-403)
8. [Cómo agregar un gate nuevo](#8-como-agregar-un-gate-nuevo)
9. [Plan de migración — cuando backend agregue `mensajes`](#9-plan-de-migracion-cuando-backend-agregue-mensajes)
10. [Gotchas](#10-gotchas)

---

## 1. Visión general

El frontend tiene **tres capas** de control de acceso, de más granular a menos:

```
Capa 1: Tipo de usuario (tenant / landlord / agency)
  → Rutas segmentadas en el app router
  → /inquilino/* vs /panel/inmobiliaria/* vs /panel/(landlord)/*

Capa 2: Permisos por módulo de agencia
  → Solo aplica a usuarios tipo `agency` (inmobiliaria)
  → PermissionsContext lee `GET /inmobiliaria/agency/my-permissions`
  → Patrón: canAccess(module, action) → boolean

Capa 3: Rol de miembro de agencia (ADMIN | AGENTE | CONTADOR | VIEWER)
  → Fallback cuando el módulo no existe en AGENCY_MODULES del backend
  → Hoy solo `mensajes` lo usa (se migrará cuando backend lo agregue)
```

---

## 2. Niveles de gating disponibles

| Herramienta | Cuándo usarla | Archivo |
|---|---|---|
| `<PageGuard module="..." action="...">` | Página completa de inmobiliaria, backend expone el módulo en `AGENCY_MODULES` | `src/components/auth/PageGuard.tsx` |
| `<PermissionGate module="..." action="...">` | Sección o botón dentro de una página, backend expone el módulo | `src/components/auth/PermissionGate.tsx` |
| `usePermissions().canAccess(m, a)` | Condicionales en JSX / lógica | `src/lib/hooks/usePermissions.ts` (re-exporta `PermissionsContext`) |
| `<AgencyRoleGuard allowed="managers\|members">` | Fallback: página de agencia cuando el módulo **NO** existe aún en backend | `src/components/auth/AgencyRoleGuard.tsx` |
| `useAgencyAccess()` → `{ isManager, isMember }` | Fallback: botones/secciones gateados por rol sin módulo backend | `src/lib/auth/useAgencyAccess.ts` |
| `<ProtectedRoute blockedAgencyRoles={[...]}>` | Legado — rutas globales que bloquean roles específicos | `src/components/auth/ProtectedRoute.tsx` |

**Regla:** preferir siempre el gate por módulo (`PageGuard` / `PermissionGate`). El gate por rol (`AgencyRoleGuard` / `useAgencyAccess`) es un **fallback temporal** para dominios que el backend todavía no modela como módulo — **hoy solo aplica a `mensajes`**.

---

## 3. Gate por módulo (canonical path)

### Módulos válidos hoy

Vienen de `src/lib/types/inmobiliaria.ts` y espejan `AGENCY_MODULES` del backend:

```
dashboard, propietarios, portafolio, pipeline, agentes, cobros,
dispersiones, operaciones, reportes, configuracion, documentos, analytics,
contratos
```

### Acciones válidas

```
view | create | edit | delete | export
```

### Ejemplos de uso

**Página completa:**
```tsx
export default function NuevoContratoPage() {
  return (
    <PageGuard module="contratos" action="create">
      <NuevoContratoContent />
    </PageGuard>
  );
}
```

**Botón dentro de una página:**
```tsx
<PermissionGate module="cobros" action="edit" fallback={null}>
  <EditarCobroButton />
</PermissionGate>
```

**Lógica condicional:**
```tsx
const { canAccess } = usePermissions();
{canAccess('contratos', 'edit') && <EditButton />}
```

### Comportamiento interno de `canAccess`

De `src/lib/context/PermissionsContext.tsx`:
1. Si el contexto aún carga → `false`
2. Si `permissions.isAdmin === true` → `true` (bypass)
3. Si `effectivePermissions === 'FULL_ACCESS'` → `true`
4. Si el `module` **NO existe** en `effectivePermissions` → `false` ⚠
5. Si existe pero no incluye el `action` → `false`
6. Caso contrario → `true`

> ⚠ **El paso 4 es la trampa.** Si chequeás un módulo que el backend no conoce, devuelve `false` para todos excepto admin/FULL_ACCESS. **Siempre verificá** que el módulo esté en `AGENCY_MODULES` antes de usar `canAccess`.

---

## 4. Gate por rol de agencia (fallback temporal)

Cuando un dominio **todavía no está en `AGENCY_MODULES`** del backend pero el producto requiere restringir acciones por rol, gateamos directamente por `agencyRole`.

**Dominios que usan este fallback hoy:**
- `mensajes` (chat con inquilinos/propietarios)

### Archivos

- `src/lib/auth/agency-roles.ts` — constantes y helpers puros
- `src/lib/auth/useAgencyAccess.ts` — hook que envuelve `PermissionsContext`
- `src/components/auth/AgencyRoleGuard.tsx` — wrapper de página

### Semántica de roles

```ts
AGENCY_ROLES = {
  ADMIN:    'ADMIN',     // Dueño o admin designado — puede todo
  AGENTE:   'AGENTE',    // Rol operativo comercial — puede todo lo del día a día
  CONTADOR: 'CONTADOR',  // Mira finanzas — NO edita entidades operativas
  VIEWER:   'VIEWER',    // Solo lectura
}
```

### Buckets de acceso

```
isManager = ADMIN || AGENTE
isMember  = ADMIN || AGENTE || CONTADOR || VIEWER
```

### API de `AgencyRoleGuard`

```tsx
<AgencyRoleGuard allowed="managers">  // solo admin + agente
  <Content />
</AgencyRoleGuard>

<AgencyRoleGuard allowed="members">   // cualquier miembro de agencia
  <Content />
</AgencyRoleGuard>
```

Comportamiento:
- Loading → spinner
- Sin acceso → redirige a `/panel/inmobiliaria` (configurable con `fallbackPath`)
- Fuera del `PermissionsProvider` (ej. rutas de inquilino) → se desactiva y deja pasar

### API de `useAgencyAccess`

```tsx
const { isManager, isMember, isLoading, isOutsideAgencyLayout } = useAgencyAccess();

{isManager && <ChatButton />}
```

Mismo fallback: fuera del provider devuelve `isManager: false`, `isMember: false` (no se activa accidentalmente en rutas de tenant).

---

## 5. Matriz actual: qué pantalla usa qué

### Inmobiliaria (`/panel/inmobiliaria/*`)

| Pantalla | Guard | Módulo/rol |
|---|---|---|
| `dashboard` (`page.tsx`) | — | (layout filtra widgets con `canAccess`) |
| `agentes/*` | `PageGuard` | `agentes` |
| `cobros/*` | `PageGuard` | `cobros` |
| `dispersiones/*` | `PageGuard` | `dispersiones` |
| `operaciones/*` | `PageGuard` | `operaciones` |
| `portafolio/*` | `PageGuard` | `portafolio` |
| `propietarios/*` | `PageGuard` | `propietarios` |
| `pipeline/*` | `PageGuard` | `pipeline` |
| `reportes/*` | `PageGuard` | `reportes` |
| `configuracion/*` | `PageGuard` | `configuracion` |
| `analytics/*` | `PageGuard` | `analytics` |
| `documentos/*` | `PageGuard` | `documentos` |
| `contratos/nuevo` | `PageGuard` | `contratos` + action `create` |
| `contratos/[id]` | `PageGuard` | `contratos` + action `view` (botones gate `canAccess('contratos', 'edit')`) |
| `contratos/[id]/editar` | `PageGuard` | `contratos` + action `edit` |
| `contratos/[id]/firmar` | `PageGuard` | `contratos` + action `edit` |
| **`mensajes`** | **`AgencyRoleGuard`** | **`allowed="managers"`** (hasta que backend agregue módulo) |

### Inquilino (`/inquilino/*`)

No usa `PermissionsProvider`. El layout autentica por rol de usuario global (`tenant`). Los guards de agencia se desactivan automáticamente si se usan por error.

### Landlord tradicional (`/panel/(landlord)/*`)

No usa `PermissionsProvider`. Flujo legacy pausado. Todo gate futuro pasa por rediseño completo (ver `memory/project_contracts_gaps.md`).

---

## 6. Matriz de acciones por rol (inmobiliaria)

Refleja el gate implementado hoy en el frontend. Los permisos reales que aplica el backend pueden ser distintos — esta tabla es lo que **ve el usuario**.

### Módulos con permisos granulares del backend

Los defaults por rol los define el backend en `agency-permissions.ts`. El front solo los refleja.

#### `contratos` (backend default)

| Acción | ADMIN | AGENTE | CONTADOR | VIEWER |
|---|:---:|:---:|:---:|:---:|
| `view` | ✅ | ✅ | ✅ | ✅ |
| `create` | ✅ | ✅ | ❌ | ❌ |
| `edit` | ✅ | ✅ | ❌ | ❌ |

#### Mapeo acción → endpoints del backend

| Acción UI | Endpoints backend |
|---|---|
| `create` | `POST /contracts`, `POST /contracts/upload-pdf` |
| `edit` | `PATCH /contracts/:id`, `POST /contracts/:id/send`, `.../sign/landlord`, `.../cancel` (cuando actúa agency member), `.../activate`, `.../remind` |
| `view` | `GET /contracts/...` |

#### Mapeo acción → botón UI

| Botón UI | Gate |
|---|---|
| "Crear contrato" (desde candidato) | `canAccess('contratos', 'create')` |
| "Editar" | `canAccess('contratos', 'edit')` |
| "Enviar para firma" | `canAccess('contratos', 'edit')` |
| "Firmar como propietario" | `canAccess('contratos', 'edit')` |
| "Cancelar contrato" | `canAccess('contratos', 'edit')` |
| "Recordar firma" | `canAccess('contratos', 'edit')` |
| "Activar contrato" | `canAccess('contratos', 'edit')` |

> El backend NO requiere permisos de `contratos` para que un **tenant** llame a `POST /contracts/:id/sign/tenant`, `/reject`, o `/cancel`. Ese flujo está en `/inquilino/contratos/*` y se gate por tipo de usuario global, no por módulo de agencia.

### Dominios con fallback por rol (pendiente de módulo backend)

#### `mensajes` de agencia

| Acción | ADMIN | AGENTE | CONTADOR | VIEWER |
|---|:---:|:---:|:---:|:---:|
| Abrir `/panel/inmobiliaria/mensajes` | ✅ | ✅ | ❌ | ❌ |
| "Abrir chat" desde detalle de contrato | ✅ | ✅ | ❌ | ❌ |
| Enviar mensaje | ✅ | ✅ | ❌ | ❌ |

---

## 7. Manejo de errores 403

El backend devuelve `403` con mensaje localizado cuando un usuario intenta una acción sin permiso:

```json
{ "statusCode": 403, "message": "No tienes permiso para edit en contratos" }
```

**Primera línea de defensa:** el gate de UI debería evitar que el usuario llegue a hacer la llamada. Si el botón está oculto, no hay 403.

**Segunda línea:** el hook `useContractActions` expone `lastError` y el helper `isPermissionError(err)`. Uso recomendado:

```tsx
const actions = useContractActions();
// ...
const updated = await actions.cancel(contractId, { reason });
if (!updated) {
  toast.error(
    isPermissionError(actions.lastError)
      ? 'No tenés permisos para esta acción.'
      : 'No se pudo cancelar el contrato.'
  );
}
```

El helper detecta mensajes que contengan `"no tienes permiso"`, `"forbidden"` o `"403"`.

---

## 8. Cómo agregar un gate nuevo

### Caso A — El backend expone el módulo en `AGENCY_MODULES`

1. **Confirmá** con el backend que el módulo está en `src/inmobiliaria/agency/permissions/agency-permissions.ts` del repo backend.
2. **Actualizá** el tipo `PermissionModule` + `ALL_PERMISSION_MODULES` + `getModuleLabel` en `src/lib/types/inmobiliaria.ts`.
3. **Envolvé** la página:
   ```tsx
   export default function Page() {
     return (
       <PageGuard module="miModulo" action="view">
         <Content />
       </PageGuard>
     );
   }
   ```
4. **Gate botones** dentro del content con `PermissionGate` o `canAccess`.
5. **Testeá** con al menos 2 roles distintos (admin + un rol restringido) antes de mergear.

### Caso B — El backend no tiene el módulo aún

1. **Decidí** la semántica de acceso (¿quién puede ver? ¿quién puede gestionar?).
2. **Usá `AgencyRoleGuard`** para páginas y `useAgencyAccess` para botones.
3. **Documentá** el gap en `memory/project_contracts_gaps.md` (o archivo equivalente) con el plan de migración.
4. **Dejá `TODO(permisos-granulares)`** en el archivo principal como recordatorio.
5. Cuando backend agregue el módulo → migrar a Caso A.

### Caso C — Gate cross-segmento (tenant/landlord/agency)

Usar el tipo de usuario global vía `useAuth()` o `ProtectedRoute`. No mezclar con el sistema de permisos de agencia.

---

## 9. Plan de migración — cuando backend agregue `mensajes`

Coordinación backend necesaria:

1. Backend agrega `'mensajes'` a `AGENCY_MODULES` en `agency-permissions.ts`.
2. Backend define defaults por rol:
   - `ADMIN`/`AGENTE` → `[view, create]` (ver y enviar)
   - `CONTADOR`/`VIEWER` → `[]` (sin acceso)
3. Backend actualiza `GET /inmobiliaria/agency/my-permissions` para incluir `mensajes`.

Cambios en frontend:

1. Agregar `'mensajes'` al tipo `PermissionModule` en `src/lib/types/inmobiliaria.ts` (+ labels + array).
2. Reemplazar en `src/app/panel/inmobiliaria/mensajes/page.tsx`:
   ```diff
   - <AgencyRoleGuard allowed="managers">
   + <PageGuard module="mensajes" action="view">
   ```
3. Reemplazar en `src/app/panel/inmobiliaria/contratos/[id]/page.tsx` el chat button gate:
   ```diff
   - const { isManager } = useAgencyAccess();
   - const chatHref = isManager && contract.applicationId ? ... : null;
   + const chatHref = canAccess('mensajes', 'view') && contract.applicationId ? ... : null;
   ```
4. Si `mensajes` es el último uso del fallback, borrar `src/lib/auth/agency-roles.ts`, `src/lib/auth/useAgencyAccess.ts` y `src/components/auth/AgencyRoleGuard.tsx` (verificar con grep antes).
5. Actualizar este documento (sección 5, 6 y eliminar sección 4).

---

## 10. Gotchas

### `canAccess('modulo-inexistente', 'x')` devuelve `false`
No es bug, es diseño. El backend no conoce el módulo → se asume sin permiso. Siempre verificá que el módulo esté en `AGENCY_MODULES`.

### El bypass de `isAdmin` oculta el bug en dev
Si solo testeás con el usuario admin, los guards rotos pasan. Regla: testeá con al menos un rol restringido al agregar un gate nuevo. Especialmente `CONTADOR` o `VIEWER`.

### `usePermissionsContextSafe()` vs `usePermissionsContext()`
- `usePermissionsContext()` **throws** si no hay provider — úsalo dentro del layout de inmobiliaria.
- `usePermissionsContextSafe()` devuelve `null` — úsalo en componentes compartidos (ej. el widget de mensajes se usa en tenant y en agencia).

### Redirect en `AgencyRoleGuard` / `PageGuard`
Van a `/panel/inmobiliaria` por defecto. Si el usuario no tiene acceso a esa ruta tampoco, podés caer en loop. Override con `fallbackPath` si hace falta.

### Tenant routes no tienen `PermissionsContext`
`useAgencyAccess()` devuelve `{ isManager: false, isMember: false, isOutsideAgencyLayout: true }` — los guards de agencia se desactivan solos. Si tu componente necesita comportamiento distinto ahí, chequeá `isOutsideAgencyLayout`.

### Landlord tradicional (pausado)
`/panel/(landlord)/*` no usa ni `PermissionsProvider` ni `AgencyRoleGuard`. Si se reactiva la vertical, definir su propio esquema antes (ver `BACKEND-ROLES-PERMISSIONS.md` sección 4 para los roles landlord planteados).

### `cancel` de contrato — doble validación en backend
`POST /contracts/:id/cancel` lo pueden llamar tanto tenant como agency member. El backend distingue solo: si es tenant del contrato, deja pasar. Si es agency member, exige `contratos:edit`. En el front no hace falta distinguir — el gate `canAccess('contratos', 'edit')` cubre el lado agency y el tenant accede desde `/inquilino/*` con otro gate.

---

## Referencias cruzadas

- `docs/BACKEND-ROLES-PERMISSIONS.md` — contrato con backend, roles globales, matriz de permisos
- `memory/project_contracts_gaps.md` — gaps conocidos + TODO(landlord-tradicional) + TODO(mensajes-modulo)
- `src/lib/context/PermissionsContext.tsx` — fuente de verdad de `canAccess`
- `src/lib/auth/agency-roles.ts` — constantes y helpers de rol (fallback)
- `src/lib/hooks/useContracts.ts` — helper `isPermissionError` para toasts friendly
