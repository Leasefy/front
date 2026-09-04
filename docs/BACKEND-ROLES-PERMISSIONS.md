# Leasefy — Requerimientos de Roles, Permisos y Acceso por Usuario

> Documento de referencia para el equipo de backend.
> Generado a partir del análisis completo del frontend (Next.js App Router).
> Fecha: 2026-03-23

---

## Tabla de Contenido

1. [Arquitectura de Roles](#1-arquitectura-de-roles)
2. [Tipo de Usuario: Inquilino (tenant)](#2-inquilino-tenant)
3. [Tipo de Usuario: Propietario (landlord)](#3-propietario-landlord)
4. [Roles de Equipo del Propietario](#4-roles-de-equipo-del-propietario)
5. [Tipo de Usuario: Inmobiliaria (agency)](#5-inmobiliaria-agency)
6. [Roles de Equipo de la Inmobiliaria](#6-roles-de-equipo-de-la-inmobiliaria)
7. [Matriz de Permisos Granulares (Inmobiliaria)](#7-matriz-de-permisos-granulares-inmobiliaria)
8. [Rutas Públicas (sin autenticación)](#8-rutas-publicas)
9. [Sistema de Invitaciones](#9-sistema-de-invitaciones)
10. [Autenticación y Guards](#10-autenticacion-y-guards)
11. [Entidades de Datos por Rol](#11-entidades-de-datos-por-rol)
12. [Endpoints API Requeridos](#12-endpoints-api-requeridos)

---

## 1. Arquitectura de Roles

El sistema tiene **3 niveles** de control de acceso:

```
Nivel 1: Tipo de Usuario (global)
├── tenant    → Inquilino
├── landlord  → Propietario
└── agency    → Inmobiliaria

Nivel 2: Roles de Equipo (colaboración interna)
├── Propietario: admin | manager | accountant | viewer
└── Inmobiliaria: admin | agente | contador | viewer

Nivel 3: Permisos Granulares (solo Inmobiliaria)
└── Matriz: módulo × acción (12 módulos × 5 acciones)
```

**Mapeo backend esperado:**
| Frontend     | Backend Role | Notas                      |
|-------------|-------------|----------------------------|
| `tenant`    | `TENANT`    | Inquilino                  |
| `landlord`  | `LANDLORD`  | Propietario                |
| `agency`    | `AGENT`     | Inmobiliaria               |
| —           | `BOTH`      | Landlord + Tenant          |
| —           | `ADMIN`     | Super administrador global |

---

## 2. Inquilino (tenant)

### Rutas y Acciones

| Ruta | Página | Acciones (CRUD) |
|------|--------|-----------------|
| `/inquilino` | Dashboard | **R**: Ver propiedades destacadas, score de evaluación, aplicaciones recientes, recomendaciones |
| `/inquilino/explorar` | Explorar propiedades | **R**: Buscar, filtrar propiedades. **C**: Guardar en favoritos, aplicar a propiedad |
| `/inquilino/aplicaciones` | Mis aplicaciones | **R**: Ver estado de aplicaciones. **U**: Retirar aplicación |
| `/inquilino/aplicaciones/[id]` | Detalle aplicación | **R**: Ver estado detallado. **U**: Responder solicitudes del propietario |
| `/inquilino/arriendo` | Mi arriendo actual | **R**: Ver detalles del arriendo, términos, contacto propietario |
| `/inquilino/arriendo/[leaseId]` | Detalle arriendo | **R**: Ver términos. **C**: Realizar pago |
| `/inquilino/contratos` | Contratos | **R**: Ver contratos, descargar PDF |
| `/inquilino/contratos/[id]/firmar` | Firmar contrato | **R**: Revisar contrato. **U**: Firmar digitalmente |
| `/inquilino/pagos` | Pagos | **R**: Historial de pagos. **C**: Realizar pago de arriendo. **U**: Configurar pago automático |
| `/inquilino/documentos` | Documentos | **R**: Ver documentos. **C**: Subir documentos. **D**: Eliminar propios |
| `/inquilino/mensajes` | Mensajes | **R**: Ver conversaciones. **C**: Enviar mensaje, adjuntar archivos |
| `/inquilino/notificaciones` | Notificaciones | **R**: Ver notificaciones. **U**: Marcar como leída |
| `/inquilino/guardados` | Favoritos | **R**: Ver propiedades guardadas. **D**: Quitar de guardados. **C**: Aplicar desde guardados |
| `/inquilino/para-ti` | Recomendaciones | **R**: Ver recomendaciones IA |
| `/inquilino/configuracion` | Configuración | **R**: Ver config. **U**: Actualizar perfil, preferencias, notificaciones. **D**: Eliminar cuenta |
| `/inquilino/perfil` | Perfil | **R**: Ver perfil. **U**: Editar info personal, foto |

### Datos que el Inquilino puede ver/gestionar:
- **Propios**: perfil, documentos, aplicaciones, pagos, favoritos, mensajes
- **De terceros (solo lectura)**: propiedades publicadas, detalles del propietario/agencia (limitado)
- **Nunca**: datos de otros inquilinos, información financiera del propietario, datos de la agencia

---

## 3. Propietario (landlord)

### Rutas y Acciones

| Ruta | Página | Acciones (CRUD) |
|------|--------|-----------------|
| `/panel` | Dashboard | **R**: KPIs, acciones urgentes, eventos próximos, resumen de propiedades y candidatos |
| `/panel/propiedades` | Propiedades | **R**: Listar/filtrar propiedades. **C**: Crear propiedad. **U**: Editar propiedad. **D**: Eliminar propiedad |
| `/panel/[propertyId]` | Detalle propiedad | **R**: Ver detalles, candidatos, analytics |
| `/panel/candidatos` | Candidatos | **R**: Ver perfiles, scores de riesgo. **U**: Aceptar/rechazar candidato |
| `/panel/[propertyId]/contract/[candidateId]` | Crear contrato | **C**: Generar contrato. **U**: Personalizar términos, enviar a firmar |
| `/panel/contratos` | Contratos | **R**: Ver estado contratos. **U**: Enviar a firma, descargar |
| `/panel/leases` | Arriendos activos | **R**: Ver arriendos. **U**: Renovar, terminar anticipadamente |
| `/panel/visitas` | Visitas | **R**: Ver agenda. **C**: Crear horario de visitas. **U**: Confirmar, reprogramar |
| `/panel/mensajes` | Mensajes | **R**: Ver conversaciones. **C**: Enviar mensajes con adjuntos |
| `/panel/notificaciones` | Notificaciones | **R**: Ver alertas urgentes. **U**: Marcar leídas, configurar preferencias |
| `/panel/configuracion` | Configuración | **R**: Ver config. **U**: Perfil, datos bancarios, preferencias, **gestionar equipo** |
| `/panel/perfil` | Perfil | **R/U**: Info personal, info empresa, foto |
| `/panel/checkout` | Checkout | **C**: Procesar pago. **U**: Gestionar suscripción |
| `/panel/upgrade` | Upgrade | **R**: Ver planes. **U**: Cambiar plan |

### Datos que el Propietario (owner) gestiona:
- **CRUD completo**: propiedades propias, contratos, visitas, mensajes
- **Lectura + acciones**: candidatos (aceptar/rechazar), arriendos (renovar/terminar)
- **Administración**: equipo (invitar, revocar, cambiar roles)
- **Nunca**: datos de otros propietarios, propiedades de otros

---

## 4. Roles de Equipo del Propietario

Cuando un propietario invita miembros a su equipo, estos tienen acceso **dentro del contexto de las propiedades del propietario que los invitó**.

### 4.1 Administrador (`admin`)
> "Acceso completo a todas las funciones"

| Recurso | Ver | Crear | Editar | Eliminar | Notas |
|---------|-----|-------|--------|----------|-------|
| Equipo y roles | ✅ | ✅ | ✅ | ✅ | Invitar, revocar, cambiar roles |
| Facturación/suscripción | ✅ | ✅ | ✅ | — | Cambiar plan, ver facturas |
| Propiedades | ✅ | ✅ | ✅ | ✅ | Todas las del propietario |
| Candidatos | ✅ | — | ✅ | — | Aceptar/rechazar |
| Contratos | ✅ | ✅ | ✅ | — | Crear, enviar a firma |
| Reportes financieros | ✅ | — | — | — | Todos los reportes |
| Arriendos | ✅ | — | ✅ | — | Renovar, terminar |
| Visitas | ✅ | ✅ | ✅ | ✅ | Gestión completa |
| Mensajes | ✅ | ✅ | — | — | Comunicación completa |
| Configuración | ✅ | — | ✅ | — | Toda la configuración |

### 4.2 Gerente (`manager`)
> "Gestiona propiedades y candidatos"

| Recurso | Ver | Crear | Editar | Eliminar | Notas |
|---------|-----|-------|--------|----------|-------|
| Equipo y roles | ❌ | ❌ | ❌ | ❌ | Sin acceso |
| Facturación | ❌ | ❌ | ❌ | ❌ | Sin acceso |
| Propiedades | ✅ | ✅ | ✅ | ❌ | Ver y editar, no eliminar |
| Candidatos | ✅ | — | ✅ | — | Gestionar candidatos |
| Contratos | ✅ | ✅ | ✅ | — | Crear y firmar |
| Reportes financieros | ❌ | — | — | — | Sin acceso |
| Arriendos | ✅ | — | ❌ | — | Solo lectura |
| Visitas | ✅ | ✅ | ✅ | ❌ | Gestionar visitas |
| Mensajes | ✅ | ✅ | — | — | Comunicación con inquilinos |
| Configuración | ❌ | — | ❌ | — | Sin acceso |

### 4.3 Contador (`accountant`)
> "Acceso a finanzas y reportes"

| Recurso | Ver | Crear | Editar | Eliminar | Notas |
|---------|-----|-------|--------|----------|-------|
| Equipo y roles | ❌ | ❌ | ❌ | ❌ | Sin acceso |
| Facturación | ✅ | ❌ | ❌ | ❌ | Solo lectura |
| Propiedades | ❌ | ❌ | ❌ | ❌ | Sin acceso |
| Candidatos | ❌ | ❌ | ❌ | ❌ | Sin acceso |
| Contratos | ❌ | ❌ | ❌ | ❌ | Sin acceso |
| Reportes financieros | ✅ | — | — | — | Ver todos + exportar |
| Arriendos activos | ✅ | — | — | — | Solo lectura |
| Historial de pagos | ✅ | — | — | — | Ver + exportar |
| Mensajes | ❌ | ❌ | — | — | Sin acceso |
| Configuración | ❌ | — | ❌ | — | Sin acceso |

### 4.4 Visualizador (`viewer`)
> "Solo lectura en todo"

| Recurso | Ver | Crear | Editar | Eliminar | Notas |
|---------|-----|-------|--------|----------|-------|
| Propiedades | ✅ | ❌ | ❌ | ❌ | Solo lectura |
| Candidatos | ✅ | ❌ | ❌ | ❌ | Solo lectura |
| Contratos | ✅ | ❌ | ❌ | ❌ | Solo lectura |
| Reportes | ✅ | ❌ | ❌ | ❌ | Solo lectura, sin exportar |
| Todo lo demás | ❌ | ❌ | ❌ | ❌ | Sin acceso |

---

## 5. Inmobiliaria (agency)

### Rutas y Acciones

| Ruta | Página | Acciones (CRUD) |
|------|--------|-----------------|
| `/panel/inmobiliaria` | Dashboard | **R**: KPIs portafolio, pipeline, cobros, agentes, propietarios |
| `/panel/inmobiliaria/propietarios` | Propietarios | **R**: Listar dueños. **C**: Agregar propietario. **U**: Editar. **D**: Eliminar |
| `/panel/inmobiliaria/propietarios/[id]` | Detalle propietario | **R**: Ver info, propiedades, rendimiento |
| `/panel/inmobiliaria/inmuebles` | Portafolio | **R**: Ver propiedades. **C**: Agregar consignación. **U**: Editar propiedad |
| `/panel/inmobiliaria/inmuebles/nuevo` | Nueva propiedad | **C**: Crear listing, subir fotos, definir términos |
| `/panel/inmobiliaria/inmuebles/[id]` | Detalle propiedad | **R/U**: Editar detalles, gestionar candidatos, ver historial |
| `/panel/inmobiliaria/pipeline` | Pipeline (Kanban) | **R**: Ver aplicaciones por etapa. **U**: Mover entre etapas, asignar agente |
| `/panel/inmobiliaria/configuracion/equipo` | Agentes | **R**: Listar agentes. **C**: Agregar agente. **U**: Editar, asignar propiedades |
| `/panel/inmobiliaria/configuracion/equipo/[id]` | Detalle agente | **R**: Perfil, métricas, comisiones. **U**: Asignar propiedades |
| `/panel/inmobiliaria/cobros` | Cobros | **R**: Ver pagos cobrados. **C**: Registrar pago. **U**: Actualizar estado |
| `/panel/inmobiliaria/pagos/dispersiones` | Dispersiones | **R**: Ver pendientes. **C**: Programar dispersión. **U**: Aprobar |
| `/panel/inmobiliaria/pagos/dispersiones/generar` | Generar dispersión | **C**: Crear lote de dispersión, seleccionar pagos |
| `/panel/inmobiliaria/mantenimientos` | Operaciones | **R**: Ver solicitudes mantenimiento. **C**: Crear solicitud. **U**: Actualizar estado, aprobar cotización |
| `/panel/inmobiliaria/documentos` | Documentos | **R**: Ver docs. **C**: Subir. **U**: Organizar. **D**: Eliminar |
| `/panel/inmobiliaria/reportes` | Reportes | **R**: Generar reportes. Exportar datos |
| `/panel/inmobiliaria/reportes/ia` | Analytics | **R**: KPIs, tendencias, ocupación, revenue, rendimiento agentes |
| `/panel/inmobiliaria/mensajes` | Mensajes | **R/C**: Comunicación interna y externa |
| `/panel/inmobiliaria/configuracion` | Configuración | **R/U**: Info agencia, cuentas bancarias, usuarios, permisos |
| `/panel/inmobiliaria/perfil` | Perfil | **R/U**: Info agencia, logo, datos empresa |

---

## 6. Roles de Equipo de la Inmobiliaria

### 6.1 Administrador (`admin`)
> Acceso completo a todos los módulos y todas las acciones

- **Gestión de usuarios**: Invitar, desactivar, cambiar roles y permisos
- **Configuración**: Toda la configuración de la agencia
- **Financiero**: Cobros, dispersiones, reportes, analytics, exportar
- **Operativo**: Portafolio, pipeline, propietarios, agentes, operaciones, documentos
- **Comunicación**: Mensajes internos y externos

### 6.2 Agente (`agente`)
> Agente inmobiliario que gestiona propiedades y pipeline

| Módulo | view | create | edit | delete | export |
|--------|------|--------|------|--------|--------|
| dashboard | ✅ | — | — | — | — |
| propietarios | ✅ | ❌ | ❌ | ❌ | ❌ |
| portafolio | ✅ | ❌ | ✅ | ❌ | ❌ |
| pipeline | ✅ | ✅ | ✅ | ❌ | ❌ |
| agentes | ✅ | ❌ | ❌ | ❌ | ❌ |
| cobros | ✅ | ❌ | ❌ | ❌ | ❌ |
| dispersiones | ❌ | ❌ | ❌ | ❌ | ❌ |
| operaciones | ✅ | ❌ | ✅ | ❌ | ❌ |
| reportes | ❌ | ❌ | ❌ | ❌ | ❌ |
| configuracion | ❌ | ❌ | ❌ | ❌ | ❌ |
| documentos | ✅ | ❌ | ❌ | ❌ | ❌ |
| analytics | ❌ | ❌ | ❌ | ❌ | ❌ |

### 6.3 Contador (`contador`)
> Acceso financiero y contable

| Módulo | view | create | edit | delete | export |
|--------|------|--------|------|--------|--------|
| dashboard | ✅ | — | — | — | — |
| propietarios | ✅ | ❌ | ❌ | ❌ | ❌ |
| portafolio | ❌ | ❌ | ❌ | ❌ | ❌ |
| pipeline | ❌ | ❌ | ❌ | ❌ | ❌ |
| agentes | ❌ | ❌ | ❌ | ❌ | ❌ |
| cobros | ✅ | ✅ | ✅ | ❌ | ✅ |
| dispersiones | ✅ | ✅ | ✅ | ❌ | ✅ |
| operaciones | ❌ | ❌ | ❌ | ❌ | ❌ |
| reportes | ✅ | ❌ | ❌ | ❌ | ✅ |
| configuracion | ❌ | ❌ | ❌ | ❌ | ❌ |
| documentos | ❌ | ❌ | ❌ | ❌ | ❌ |
| analytics | ✅ | ❌ | ❌ | ❌ | ✅ |

### 6.4 Visualizador (`viewer`)
> Solo lectura en módulos permitidos

| Módulo | view | create | edit | delete | export |
|--------|------|--------|------|--------|--------|
| dashboard | ✅ | — | — | — | — |
| propietarios | ✅ | ❌ | ❌ | ❌ | ❌ |
| portafolio | ✅ | ❌ | ❌ | ❌ | ❌ |
| pipeline | ❌ | ❌ | ❌ | ❌ | ❌ |
| agentes | ❌ | ❌ | ❌ | ❌ | ❌ |
| cobros | ✅ | ❌ | ❌ | ❌ | ❌ |
| dispersiones | ❌ | ❌ | ❌ | ❌ | ❌ |
| operaciones | ❌ | ❌ | ❌ | ❌ | ❌ |
| reportes | ✅ | ❌ | ❌ | ❌ | ❌ |
| configuracion | ❌ | ❌ | ❌ | ❌ | ❌ |
| documentos | ❌ | ❌ | ❌ | ❌ | ❌ |
| analytics | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 7. Matriz de Permisos Granulares (Inmobiliaria)

El frontend soporta **permisos personalizables** por usuario. Los defaults de arriba son editables por el admin.

### Módulos disponibles (12):
```
dashboard | propietarios | portafolio | pipeline | agentes |
cobros | dispersiones | operaciones | reportes | configuracion |
documentos | analytics
```

### Acciones disponibles (5):
```
view | create | edit | delete | export
```

### API requerida para permisos:

```
GET    /api/agency/users/:userId/permissions    → RolePermissions
PUT    /api/agency/users/:userId/permissions    → actualizar permisos
```

**Estructura RolePermissions:**
```typescript
type RolePermissions = {
  [module in PermissionModule]?: PermissionAction[]
}

// Ejemplo:
{
  "dashboard": ["view"],
  "cobros": ["view", "create", "edit", "export"],
  "dispersiones": ["view", "create", "edit", "export"],
  "reportes": ["view", "export"]
}
```

### Lógica de validación:
```typescript
function hasPermission(
  permissions: RolePermissions,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  return permissions[module]?.includes(action) ?? false;
}
```

> **Importante para backend**: Cada request a un recurso de inmobiliaria debe validar:
> 1. El usuario pertenece a la agencia
> 2. Su rol tiene permiso sobre el módulo
> 3. Su rol tiene permiso sobre la acción específica

---

## 8. Rutas Públicas

Sin autenticación requerida:

| Ruta | Descripción |
|------|-------------|
| `/` | Landing page |
| `/auth` | Login / Registro |
| `/auth/callback` | OAuth callback |
| `/auth/mfa-verify` | Verificación MFA |
| `/pricing` | Planes y precios |
| `/pricing/empresas` | Precios enterprise |
| `/propiedades` | Listado público de propiedades |
| `/propiedades/[id]` | Detalle público de propiedad |
| `/para/propietarios` | Marketing para propietarios |
| `/para/inmobiliarias` | Marketing para inmobiliarias |
| `/para/inquilinos` | Marketing para inquilinos |
| `/para/agentes` | Marketing para agentes |
| `/productos/*` | Páginas de producto (6 rutas) |
| `/ayuda` | Centro de ayuda |
| `/ayuda/propietarios` | Ayuda para propietarios |
| `/blog` | Blog |
| `/blog/[slug]` | Post del blog |
| `/terminos` | Términos de servicio |
| `/privacidad` | Política de privacidad |
| `/demo/score` | Demo de evaluación |
| `/verificar/[code]` | Verificación de email |
| `/aplicar/[propertyId]` | Formulario de aplicación |
| `/onboarding/seleccionar-rol` | Selección de rol |
| `/onboarding/inquilino` | Onboarding inquilino |
| `/onboarding/propietario` | Onboarding propietario |
| `/onboarding/inmobiliaria` | Onboarding inmobiliaria |

---

## 9. Sistema de Invitaciones

### 9.1 Invitación de Equipo (Propietario)

**Flujo:**
1. Admin/propietario envía invitación por email
2. Se crea registro con status `pending`
3. Invitado recibe email con enlace
4. Al aceptar → status cambia a `accepted`
5. Expira automáticamente → status `expired`
6. Admin puede revocar → status `revoked`

**Modelo TeamMember:**
```typescript
{
  id: string;
  userId?: string;        // Se llena al aceptar
  email: string;
  name?: string;
  role: 'admin' | 'manager' | 'accountant' | 'viewer';
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitedAt: string;      // ISO date
  acceptedAt?: string;    // ISO date
  invitedBy: string;      // userId del que invitó
}
```

**Endpoints requeridos:**
```
POST   /api/team/invite          → Enviar invitación
GET    /api/team/members         → Listar miembros
PUT    /api/team/members/:id     → Cambiar rol
DELETE /api/team/members/:id     → Revocar acceso
POST   /api/team/accept/:token   → Aceptar invitación
```

### 9.2 Invitación de Usuario (Inmobiliaria)

**Modelo AgencyUser:**
```typescript
{
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agente' | 'contador' | 'viewer';
  avatar?: string;
  phone?: string;
  status: 'active' | 'invited' | 'inactive';
  invitedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
}
```

**Endpoints requeridos:**
```
POST   /api/agency/users/invite      → Invitar usuario
GET    /api/agency/users             → Listar usuarios
PUT    /api/agency/users/:id         → Editar usuario/rol
PUT    /api/agency/users/:id/status  → Activar/desactivar
DELETE /api/agency/users/:id         → Eliminar usuario
```

---

## 10. Autenticación y Guards

### Flujo de autenticación:
```
1. Login (email/password o OAuth) → Supabase session
2. GET /users/me → perfil del usuario (rol, onboarding status, MFA)
3. ProtectedRoute valida:
   a. ¿Está autenticado? → Si no, redirect a /auth
   b. ¿Completó onboarding? → Si no, redirect a /onboarding/seleccionar-rol
   c. ¿Requiere MFA? → Si sí, redirect a /auth/mfa-verify
   d. ¿Tiene el rol correcto? → Si no, redirect al dashboard de su rol
```

### Redirecciones por rol:
| Rol | Dashboard |
|-----|-----------|
| `agency` | `/panel/inmobiliaria` |
| `landlord` | `/panel` |
| `tenant` | `/inquilino` |

### Reglas de aislamiento:
- Un **inquilino** NUNCA puede acceder a rutas `/panel/*`
- Un **propietario** NUNCA puede acceder a rutas `/panel/inmobiliaria/*`
- Una **inmobiliaria** NUNCA puede acceder a rutas `/panel/(landlord)/*`
- Los **miembros de equipo** solo ven datos del propietario/agencia que los invitó

---

## 11. Entidades de Datos por Rol

### 11.1 Entidades del Propietario

| Entidad | Tipo | Archivo de tipos |
|---------|------|-----------------|
| Property | Propiedad inmueble | `src/lib/types/property.ts` |
| Candidate | Candidato a inquilino | `src/lib/types/candidate.ts` |
| Contract | Contrato digital | `src/lib/types/contract.ts` |
| Lease | Arriendo activo | `src/lib/types/lease.ts` |
| Visit | Visita programada | `src/lib/types/visit.ts` |
| PaymentAccount | Cuenta bancaria | `src/lib/types/payment-accounts.ts` |
| TeamMember | Miembro de equipo | `src/lib/types/team.ts` |
| Notification | Notificación | `src/lib/types/notification.ts` |
| Subscription | Suscripción/plan | `src/lib/types/subscription.ts` |

### 11.2 Entidades del Inquilino

| Entidad | Tipo | Archivo de tipos |
|---------|------|-----------------|
| TenantApplication | Aplicación de arriendo | `src/lib/types/tenant-application.ts` |
| Lease | Arriendo activo | `src/lib/types/lease.ts` |
| Contract | Contrato (firma) | `src/lib/types/contract.ts` |
| Payment | Pago de arriendo | — (inline en componentes) |
| Evaluation | Evaluación de riesgo | `src/lib/types/evaluation.ts` |
| RiskScore | Puntaje de riesgo | `src/lib/types/risk-score.ts` |
| Wishlist | Propiedades guardadas | — (inline) |

### 11.3 Entidades de la Inmobiliaria

| Entidad | Tipo | Archivo de tipos |
|---------|------|-----------------|
| Propietario | Dueño de propiedad | `src/lib/types/inmobiliaria.ts` |
| Agente | Agente inmobiliario | `src/lib/types/inmobiliaria.ts` |
| Consignacion | Consignación de propiedad | `src/lib/types/inmobiliaria.ts` |
| PipelineItem | Item del pipeline | `src/lib/types/inmobiliaria.ts` |
| Cobro | Cobro mensual | `src/lib/types/inmobiliaria.ts` |
| Dispersion | Dispersión a propietario | `src/lib/types/inmobiliaria.ts` |
| SolicitudMantenimiento | Solicitud de mantenimiento | `src/lib/types/inmobiliaria.ts` |
| AgencyUser | Usuario de la agencia | `src/lib/types/inmobiliaria.ts` |
| InmobiliariaConfig | Config de la agencia | `src/lib/types/inmobiliaria.ts` |

### 11.4 Reportes de la Inmobiliaria

| Reporte | Descripción | Roles con acceso |
|---------|-------------|-----------------|
| ExtractoPropietario | Estado de cuenta por propietario/mes | admin, contador |
| CarteraReport | Cartera morosa (buckets 0-30, 31-60, 61-90, 90+) | admin, contador |
| OcupacionReport | Tasa de ocupación por zona | admin, contador, viewer |
| ComisionesAgenteReport | Comisiones por agente/período | admin |
| VencimientosReport | Contratos por vencer (buckets) | admin, agente |
| FlujoCajaReport | Flujo de caja mensual | admin, contador |

---

## 12. Endpoints API Requeridos

### 12.1 Autenticación
```
POST   /auth/login                    → Login
POST   /auth/register                 → Registro
POST   /auth/logout                   → Logout
GET    /users/me                      → Perfil del usuario actual
PUT    /users/me                      → Actualizar perfil
POST   /auth/mfa/verify               → Verificar MFA
POST   /auth/mfa/setup                → Configurar MFA
GET    /auth/callback                  → OAuth callback
```

### 12.2 Onboarding
```
POST   /onboarding/select-role         → Seleccionar rol
POST   /onboarding/tenant              → Completar onboarding inquilino
POST   /onboarding/landlord            → Completar onboarding propietario
POST   /onboarding/agency              → Completar onboarding inmobiliaria
```

### 12.3 Propietario (Landlord)
```
# Propiedades
GET    /properties                     → Listar propiedades (filtros, paginación)
GET    /properties/:id                 → Detalle propiedad
POST   /properties                     → Crear propiedad
PUT    /properties/:id                 → Actualizar propiedad
DELETE /properties/:id                 → Eliminar propiedad

# Candidatos
GET    /properties/:id/candidates      → Candidatos por propiedad
GET    /candidates                     → Todos los candidatos
PUT    /candidates/:id/accept          → Aceptar candidato
PUT    /candidates/:id/reject          → Rechazar candidato

# Contratos
GET    /contracts                      → Listar contratos
GET    /contracts/:id                  → Detalle contrato
POST   /contracts                      → Crear contrato
PUT    /contracts/:id                  → Actualizar contrato
POST   /contracts/:id/send-signature   → Enviar a firma

# Arriendos
GET    /leases                         → Listar arriendos
GET    /leases/:id                     → Detalle arriendo
PUT    /leases/:id/renew               → Renovar
PUT    /leases/:id/terminate           → Terminar

# Visitas
GET    /visits                         → Listar visitas
POST   /visits                         → Crear visita
PUT    /visits/:id                     → Actualizar visita
DELETE /visits/:id                     → Cancelar visita

# Equipo
GET    /team/members                   → Listar miembros
POST   /team/invite                    → Invitar miembro
PUT    /team/members/:id               → Cambiar rol
DELETE /team/members/:id               → Revocar acceso

# Dashboard
GET    /dashboard/landlord             → KPIs del dashboard

# Pagos / Suscripción
GET    /subscription                   → Plan actual
POST   /subscription/checkout          → Procesar upgrade
GET    /subscription/plans             → Planes disponibles
```

### 12.4 Inquilino (Tenant)
```
# Explorar
GET    /properties/public              → Propiedades públicas (filtros, paginación)
GET    /properties/public/:id          → Detalle propiedad pública

# Aplicaciones
GET    /applications                   → Mis aplicaciones
GET    /applications/:id               → Detalle aplicación
POST   /applications                   → Crear aplicación
PUT    /applications/:id/withdraw      → Retirar aplicación

# Arriendos
GET    /tenant/leases                  → Mis arriendos
GET    /tenant/leases/:id              → Detalle arriendo

# Contratos
GET    /tenant/contracts               → Mis contratos
POST   /tenant/contracts/:id/sign      → Firmar contrato

# Pagos
GET    /tenant/payments                → Historial de pagos
POST   /tenant/payments                → Realizar pago
PUT    /tenant/payments/auto-setup     → Configurar pago automático

# Documentos
GET    /tenant/documents               → Mis documentos
POST   /tenant/documents               → Subir documento
DELETE /tenant/documents/:id           → Eliminar documento

# Favoritos
GET    /tenant/wishlist                → Propiedades guardadas
POST   /tenant/wishlist/:propertyId    → Guardar propiedad
DELETE /tenant/wishlist/:propertyId    → Quitar de guardados

# Recomendaciones
GET    /tenant/recommendations         → Recomendaciones personalizadas

# Evaluación
GET    /tenant/evaluation              → Mi score de evaluación
POST   /evaluation/purchase            → Comprar evaluación
GET    /evaluation/:id                 → Ver evaluación

# Dashboard
GET    /dashboard/tenant               → KPIs del dashboard inquilino
```

### 12.5 Inmobiliaria (Agency)
```
# Propietarios
GET    /agency/propietarios            → Listar propietarios
GET    /agency/propietarios/:id        → Detalle propietario
POST   /agency/propietarios            → Crear propietario
PUT    /agency/propietarios/:id        → Actualizar propietario
DELETE /agency/propietarios/:id        → Eliminar propietario

# Portafolio (Consignaciones)
GET    /agency/consignaciones          → Listar consignaciones
GET    /agency/consignaciones/:id      → Detalle consignación
POST   /agency/consignaciones          → Crear consignación
PUT    /agency/consignaciones/:id      → Actualizar consignación

# Pipeline
GET    /agency/pipeline                → Items del pipeline (filtros por stage)
GET    /agency/pipeline/:id            → Detalle item
POST   /agency/pipeline                → Crear item
PUT    /agency/pipeline/:id            → Actualizar (mover de stage)
PUT    /agency/pipeline/:id/stage      → Cambiar etapa

# Agentes
GET    /agency/agentes                 → Listar agentes
GET    /agency/agentes/:id             → Detalle agente + métricas
POST   /agency/agentes                 → Crear agente
PUT    /agency/agentes/:id             → Actualizar agente
PUT    /agency/agentes/:id/assign      → Asignar propiedades

# Cobros
GET    /agency/cobros                  → Listar cobros (filtros mes, status)
GET    /agency/cobros/summary          → Resumen del mes
PUT    /agency/cobros/:id              → Actualizar cobro (registrar pago)
POST   /agency/cobros/:id/reminder     → Enviar recordatorio

# Dispersiones
GET    /agency/dispersiones            → Listar dispersiones
GET    /agency/dispersiones/summary    → Resumen
POST   /agency/dispersiones/generate   → Generar lote de dispersión
PUT    /agency/dispersiones/:id/approve → Aprobar dispersión
PUT    /agency/dispersiones/:id/process → Procesar dispersión

# Operaciones (Mantenimiento)
GET    /agency/mantenimiento           → Listar solicitudes
GET    /agency/mantenimiento/:id       → Detalle solicitud
POST   /agency/mantenimiento           → Crear solicitud
PUT    /agency/mantenimiento/:id       → Actualizar solicitud
PUT    /agency/mantenimiento/:id/quote → Aprobar cotización

# Documentos
GET    /agency/documentos              → Listar documentos
POST   /agency/documentos              → Subir documento
DELETE /agency/documentos/:id          → Eliminar documento

# Reportes
GET    /agency/reportes/extracto/:propietarioId/:month → Extracto propietario
GET    /agency/reportes/cartera        → Reporte de cartera
GET    /agency/reportes/ocupacion      → Reporte de ocupación
GET    /agency/reportes/comisiones     → Reporte de comisiones
GET    /agency/reportes/vencimientos   → Reporte de vencimientos
GET    /agency/reportes/flujo-caja     → Reporte flujo de caja

# Analytics
GET    /agency/analytics/kpis          → KPIs del dashboard
GET    /agency/analytics/trends        → Tendencias mensuales

# Usuarios de la agencia
GET    /agency/users                   → Listar usuarios
POST   /agency/users/invite            → Invitar usuario
PUT    /agency/users/:id               → Editar usuario/rol
PUT    /agency/users/:id/status        → Activar/desactivar
DELETE /agency/users/:id               → Eliminar usuario
GET    /agency/users/:id/permissions   → Obtener permisos
PUT    /agency/users/:id/permissions   → Actualizar permisos

# Configuración
GET    /agency/config                  → Configuración de la agencia
PUT    /agency/config                  → Actualizar configuración

# Dashboard
GET    /agency/dashboard               → KPIs completos
```

### 12.6 Compartidos
```
# Mensajes
GET    /messages/conversations         → Listar conversaciones
GET    /messages/conversations/:id     → Mensajes de una conversación
POST   /messages                       → Enviar mensaje
POST   /messages/:id/attachments       → Adjuntar archivo

# Notificaciones
GET    /notifications                  → Listar notificaciones
PUT    /notifications/:id/read         → Marcar como leída
PUT    /notifications/read-all         → Marcar todas como leídas
PUT    /notifications/preferences      → Actualizar preferencias

# Perfil
GET    /profile                        → Mi perfil
PUT    /profile                        → Actualizar perfil
POST   /profile/avatar                 → Subir foto de perfil
```

---

## Notas para Implementación Backend

### Middleware de autorización sugerido:
```
1. authMiddleware       → Valida JWT/session (Supabase)
2. roleMiddleware       → Valida tipo de usuario (tenant/landlord/agency)
3. teamMiddleware       → Valida pertenencia al equipo
4. permissionMiddleware → Valida módulo + acción (solo agency)
```

### Reglas de negocio clave:
- Los **miembros de equipo** heredan el contexto del propietario/agencia que los invitó
- Los **permisos de inmobiliaria** son personalizables por admin (override de defaults)
- Las **dispersiones** requieren aprobación (campo `approvedBy`)
- Los **contratos** tienen firma digital con verificación OTP, IP y userAgent
- Los **cobros** generan `lateFee` automáticamente según `daysLate`
- Las **evaluaciones de riesgo** producen un score A-E con categorías
- El **pipeline** tiene 10 etapas con tracking de días en cada etapa

### Estados y máquinas de estado:
```
Invitación:  pending → accepted | expired | revoked
Cobro:       pending → paid | partial | late → defaulted
Dispersión:  pending → processing → completed | failed
Mantenimiento: reported → quoted → approved → in_progress → completed | cancelled
Pipeline:    lead → visit_scheduled → visit_done → application → evaluation → approved → contract → handover → completed | lost
Contrato:    draft → pending_signature → signed | expired | cancelled
Propiedad:   available | rented | in_process | maintenance
```
