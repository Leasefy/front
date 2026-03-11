# Phase 26 Research: Flujo de Registro e Incorporación de Inmobiliarias

## Problema

El frontend tiene el panel completo de inmobiliaria (21 páginas, v3.0 completado) pero **no tiene ningún flujo de registro o incorporación para inmobiliarias**. Actualmente:

1. No existe una opción "Soy inmobiliaria" en la pantalla de registro/onboarding
2. No hay wizard de creación de agencia
3. No hay pantalla para aceptar invitaciones de equipo
4. No hay flujo de onboarding guiado para nuevas inmobiliarias

Sin este flujo, una inmobiliaria nueva no tiene forma de empezar a usar la plataforma.

---

## Estado Actual del Frontend

### Lo que YA existe

| Módulo | Estado |
|--------|--------|
| Panel inmobiliaria completo (`/panel/inmobiliaria/*`) | ✅ 21 páginas implementadas |
| Auth con Supabase (Google OAuth + email) | ✅ Funcional |
| Onboarding inquilino/propietario | ✅ Funcional |
| Selección de tipo de cuenta en registro | ✅ Solo INQUILINO / PROPIETARIO / AMBOS |

### Lo que FALTA

| Gap | Descripción |
|-----|-------------|
| Opción INMOBILIARIA en registro | El selector de tipo de cuenta no tiene opción para inmobiliarias |
| Wizard de creación de agencia | Formulario multi-paso: nombre, NIT, ciudad, etc. |
| Pantalla de aceptar invitación | `/invitacion/[token]` — para miembros invitados |
| Checklist de onboarding en panel | Widget que guía al admin recién registrado |
| Redirección post-registro | Tras crear agencia, redirigir a panel inmobiliaria |

---

## Nuevos Endpoints del Backend (Phase 23)

El backend (Phase 23) agrega:

| Endpoint | Propósito |
|----------|-----------|
| `POST /users/me/onboarding { userType: 'INMOBILIARIA', agency: {...} }` | Registro + creación de agencia en un paso |
| `GET /inmobiliaria/agency/invitations/:token` | Info pública de invitación |
| `POST /inmobiliaria/agency/invitations/:token/accept` | Aceptar invitación (requiere auth) |
| `POST /inmobiliaria/agency/invitations/:token/decline` | Rechazar invitación |
| `POST /inmobiliaria/agency/members/:id/resend-invitation` | Reenviar invitación |
| `GET /inmobiliaria/agency/onboarding-status` | Checklist de setup completado |

---

## Páginas a Implementar

### 1. Actualización del flujo de registro (`/registro` o pantalla de onboarding)

Agregar opción "Soy una inmobiliaria / agencia inmobiliaria" al tipo de cuenta. Cuando se selecciona:
- Mostrar campos adicionales de la agencia (nombre, NIT)
- El submit llama al endpoint unificado de onboarding INMOBILIARIA

### 2. Wizard de Setup de Agencia (post-registro)

Si el registro básico se hace primero y la agencia después, wizard de 3 pasos:

**Paso 1 — Información básica**
- Nombre de la agencia (requerido)
- NIT / RUT (opcional)
- Ciudad principal
- Teléfono de contacto
- Email de la agencia

**Paso 2 — Configuración de operaciones** (opcional, se puede omitir)
- Porcentaje de comisión por defecto (default: 10%)
- Día de vencimiento de cobros (default: 5)
- Día de dispersión a propietarios (default: 15)

**Paso 3 — Invitar primer miembro** (opcional)
- Campo de email
- Selector de rol: Agente / Contador / Administrador
- Botón "Enviar invitación" o "Omitir"

### 3. Página de Aceptar Invitación (`/invitacion/[token]`)

**Estado 1 — Cargando:** Validar el token con el backend
**Estado 2 — Token válido (no logueado):**
- Mostrar nombre de la agencia y rol asignado
- Botones: "Aceptar (crear cuenta)" → va al registro, "Rechazar"

**Estado 3 — Token válido (logueado):**
- Mostrar: "Te invitaron a [Agencia] como [Rol]"
- Botón "Aceptar invitación" → llama `POST .../accept`
- Botón "Rechazar"

**Estado 4 — Token expirado:**
- Mensaje: "Esta invitación expiró. Pide al administrador que reenvíe la invitación."

**Estado 5 — Token inválido:**
- Mensaje: "Invitación no encontrada."

### 4. Widget de Onboarding en Panel Inmobiliaria

En la página principal del panel (`/panel/inmobiliaria`), mostrar un widget de checklist si el setup no está completo:

```
┌─────────────────────────────────────┐
│ 🏢 Configura tu agencia (2/5 pasos) │
│ ████░░░░░░ 40%                      │
│                                     │
│ ✅ Agencia creada                   │
│ ✅ Perfil básico completado         │
│ ⬜ Logo subido                      │
│ ⬜ Primer miembro invitado          │
│ ⬜ Primera propiedad gestionada     │
│                                     │
│ [Continuar setup]                   │
└─────────────────────────────────────┘
```

---

## Flujos de Usuario

### Flujo A: Nueva inmobiliaria (admin)

```
1. Visita /registro
2. Selecciona "Soy una inmobiliaria"
3. Completa: nombre, apellido, agencia (nombre, NIT), ciudad
4. OAuth con Google → callback
5. Frontend llama POST /users/me/onboarding { userType: 'INMOBILIARIA', agency: {...} }
6. Redirige a /panel/inmobiliaria con widget de onboarding
7. Widget guía para completar: logo, invitar miembro, agregar propiedad
```

### Flujo B: Miembro invitado (empleado)

```
1. Recibe email con link: https://app.leasify.co/invitacion/[token]
2. Visita el link → GET /inmobiliaria/agency/invitations/:token
3. Ve info: "Te invitó Inmobiliaria XYZ como Agente"
4a. Si tiene cuenta: Login → POST /invitations/:token/accept → redirige panel
4b. Si no tiene cuenta: Registro → onboarding simple → POST /invitations/:token/accept
5. Accede a /panel/inmobiliaria con rol de Agente
```

---

## Componentes Nuevos

| Componente | Descripción |
|-----------|-------------|
| `InmobiliariaTypeSelector` | Card clickeable para seleccionar "Inmobiliaria" en registro |
| `AgencySetupWizard` | Wizard de 3 pasos post-registro |
| `AgencyBasicForm` | Paso 1 del wizard (nombre, NIT, ciudad) |
| `AgencyOperationsForm` | Paso 2 del wizard (comisiones, días) |
| `InviteFirstMemberForm` | Paso 3 del wizard (email + rol) |
| `InvitationAcceptPage` | Página `/invitacion/[token]` con todos los estados |
| `OnboardingChecklist` | Widget de checklist en dashboard |
| `OnboardingProgress` | Barra de progreso del setup |

---

## Rutas Nuevas

| Ruta | Descripción |
|------|-------------|
| `/invitacion/[token]` | Aceptar/rechazar invitación de agencia |
| `/registro/inmobiliaria` | (Alternativa) Registro específico para inmobiliarias |
| `/panel/inmobiliaria/setup` | Wizard de setup de agencia (si no está en modal) |

---

## Consideraciones Técnicas

### Auth Context
- Necesita saber si el usuario completó el onboarding como INMOBILIARIA
- El `userContext` de Zustand/Context debe incluir `agencyId` y `agencyRole`

### Token de Invitación
- La ruta `/invitacion/[token]` debe funcionar sin auth (para ver info)
- Tras aceptar, redirigir al panel inmobiliaria con el rol correcto

### Middleware
- El middleware de Next.js debe manejar la ruta `/invitacion/[token]` como pública
- `/panel/inmobiliaria/*` requiere que el usuario sea miembro activo de una agencia

### API Client
- Agregar los nuevos endpoints de invitación al cliente de API existente
- Agregar hook `useInvitation(token)` para la página de aceptación
- Agregar hook `useOnboardingStatus()` para el widget del dashboard

---

## Estimado de Complejidad

- **Planes:** 3
- **Páginas nuevas:** 2-3
- **Componentes nuevos:** 8
- **Hooks nuevos:** 2-3
- **Cambios en auth/context:** 1 (agregar agencyId al contexto)
