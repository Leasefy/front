# Plan P1-03: API Client, i18n y QA del Flujo

## Goal

Conectar todos los nuevos componentes con el API client tipado del proyecto, agregar las traducciones i18n para los nuevos flujos, y verificar el funcionamiento end-to-end del registro e incorporación de inmobiliarias.

---

## Tasks

### Task 1: Actualizar el API Client con los nuevos endpoints

**Buscar:** El módulo de API client existente (documentado en `docs/API-QUICK-REFERENCE.md`).

Agregar los nuevos métodos:

```typescript
// En el módulo de inmobiliaria API
export const inmobiliariaApi = {
  // ... métodos existentes ...

  // NUEVOS:
  getInvitation: (token: string): Promise<InvitationInfo> =>
    apiClient.get(`/inmobiliaria/agency/invitations/${token}`, { public: true }),

  acceptInvitation: (token: string): Promise<AgencyMember> =>
    apiClient.post(`/inmobiliaria/agency/invitations/${token}/accept`),

  declineInvitation: (token: string): Promise<void> =>
    apiClient.post(`/inmobiliaria/agency/invitations/${token}/decline`, {}, { public: true }),

  resendInvitation: (memberId: string): Promise<AgencyMember> =>
    apiClient.post(`/inmobiliaria/agency/members/${memberId}/resend-invitation`),

  getOnboardingStatus: (): Promise<OnboardingStatus> =>
    apiClient.get('/inmobiliaria/agency/onboarding-status'),
};

// En el módulo de usuarios API
export const usersApi = {
  // ... métodos existentes con actualización del tipo ...
  completeOnboarding: (dto: CompleteOnboardingDto): Promise<OnboardingResponse> =>
    apiClient.post('/users/me/onboarding', dto),
};
```

### Task 2: TypeScript types para los nuevos endpoints

**Archivo:** Donde estén definidos los tipos del proyecto (buscar `types/` o `lib/types.ts`)

```typescript
// Tipos nuevos para invitaciones
export interface InvitationInfo {
  agencyName: string;
  agencyCity: string;
  role: AgencyMemberRole;
  invitedEmail: string;
  expiresAt: string;
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
  completionPercent: number;
  isComplete: boolean;
}

export interface OnboardingStep {
  key: string;
  label: string;
  completed: boolean;
  action?: { label: string; href: string };
}

// Actualizar CompleteOnboardingDto
export interface CompleteOnboardingDto {
  userType: 'TENANT' | 'LANDLORD' | 'AGENT' | 'INMOBILIARIA';  // AGREGAR INMOBILIARIA
  firstName: string;
  lastName: string;
  phone?: string;
  agency?: {                    // NUEVO: opcional, requerido si userType === 'INMOBILIARIA'
    name: string;
    nit?: string;
    city?: string;
    phone?: string;
    email?: string;
  };
}

// Actualizar OnboardingResponse
export interface OnboardingResponse {
  success: boolean;
  user: User;
  agency?: Agency;             // NUEVO: presente si userType === 'INMOBILIARIA'
  nextStep?: string;
}
```

### Task 3: Strings de i18n para los nuevos flujos

**Buscar:** Archivos de traducción existentes (probablemente en `public/locales/` o similar).

Agregar al archivo ES (español):
```json
{
  "registration": {
    "accountType": {
      "inmobiliaria": {
        "title": "Soy una inmobiliaria",
        "description": "Gestiona propiedades de múltiples propietarios con tu equipo"
      }
    },
    "agencyFields": {
      "name": "Nombre de la agencia",
      "namePlaceholder": "Ej: Inmobiliaria Rodríguez & Asociados",
      "nit": "NIT (opcional)",
      "nitPlaceholder": "900.123.456-7",
      "city": "Ciudad principal"
    }
  },
  "invitation": {
    "title": "Invitación a {agencyName}",
    "roleLabel": "Rol asignado: {role}",
    "validUntil": "Válida hasta: {date}",
    "loginToAccept": "Inicia sesión o crea una cuenta para aceptar esta invitación",
    "accept": "Aceptar invitación",
    "decline": "Rechazar",
    "loginBtn": "Iniciar sesión para aceptar",
    "registerBtn": "Crear cuenta nueva",
    "expired": {
      "title": "Invitación expirada",
      "message": "Esta invitación ya no es válida. Pide al administrador que reenvíe tu invitación."
    },
    "invalid": {
      "title": "Invitación no encontrada",
      "message": "Este enlace no es válido o ya fue utilizado."
    },
    "roles": {
      "ADMIN": "Administrador",
      "AGENTE": "Agente inmobiliario",
      "CONTADOR": "Contador",
      "VIEWER": "Solo lectura"
    }
  },
  "onboarding": {
    "checklist": {
      "title": "Configura tu agencia",
      "steps": {
        "agency_created": "Agencia creada",
        "agency_profile": "Perfil completado",
        "first_member": "Primer miembro invitado",
        "logo_uploaded": "Logo subido",
        "first_property": "Primera propiedad gestionada"
      }
    }
  }
}
```

### Task 4: QA — Checklist de verificación manual

#### Flujo A: Admin registra nueva inmobiliaria

- [ ] Ir a `/registro`
- [ ] Seleccionar "Soy una inmobiliaria"
- [ ] Verificar que aparecen campos de agencia
- [ ] Intentar enviar sin nombre de agencia → debe mostrar error
- [ ] Completar todos los campos y enviar
- [ ] Verificar redirección a `/panel/inmobiliaria`
- [ ] Verificar que aparece el widget de onboarding
- [ ] Verificar que la agencia aparece en el panel de configuración

#### Flujo B: Admin invita miembro desde el panel

- [ ] Ir a `/panel/inmobiliaria/configuracion` (o donde esté la gestión de equipo)
- [ ] Invitar a un email
- [ ] Verificar que el miembro aparece como "Invitado"
- [ ] Verificar botón "Reenviar invitación" visible

#### Flujo C: Miembro acepta invitación

- [ ] Visitar `/invitacion/[token]` sin estar logueado
- [ ] Verificar que se muestra el nombre de la agencia y el rol
- [ ] Clic en "Iniciar sesión para aceptar"
- [ ] Después del login, verificar redirección de vuelta a `/invitacion/[token]`
- [ ] Clic en "Aceptar invitación"
- [ ] Verificar redirección a `/panel/inmobiliaria`
- [ ] Verificar que el miembro aparece como "Activo" en la lista del admin

#### Flujo D: Token expirado/inválido

- [ ] Visitar `/invitacion/token-invalido` → mostrar pantalla de "no encontrado"
- [ ] Simular token expirado (mock) → mostrar pantalla de "expirado"

#### Flujo E: Widget de onboarding

- [ ] Admin recién registrado → widget visible con 1/5 pasos
- [ ] Completar cada paso → verificar que el widget se actualiza
- [ ] Todos los pasos completados → widget desaparece
- [ ] AGENTE logueado → widget NO visible

---

### Task 5: Dark mode para los nuevos componentes

Verificar que todos los nuevos componentes funcionan en dark mode:

- `AgencySetupWizard` — fondos, bordes, textos
- `InvitationPage` — cards, botones, estados de error
- `OnboardingChecklist` — progress bar, iconos de check

Usar las mismas clases Tailwind del resto del proyecto (`dark:` prefix).

---

### Task 6: Responsive / Mobile

Verificar comportamiento en mobile (< 768px):

- El wizard de setup debe ser full-width en mobile
- La página de invitación debe verse bien en pantallas pequeñas
- El widget de onboarding debe ser legible en mobile

---

## Acceptance Criteria

- [ ] El API client tiene tipos TypeScript para todos los nuevos endpoints
- [ ] Las funciones del API client son tipadas (no `any`)
- [ ] Los strings de i18n están en ES y EN
- [ ] Los flujos A, B, C, D, E del QA pasan sin errores
- [ ] Dark mode funciona en todos los componentes nuevos
- [ ] Mobile responsive en página de invitación y wizard
- [ ] `npm run build` pasa sin errores TypeScript

---

## Files to Create/Modify

| Archivo | Tipo de cambio |
|---------|---------------|
| `lib/api/inmobiliaria.ts` (o equivalente) | Agregar 5 métodos nuevos |
| `lib/api/users.ts` (o equivalente) | Actualizar tipo de `completeOnboarding` |
| `types/inmobiliaria.ts` (o equivalente) | Agregar InvitationInfo, OnboardingStatus, etc. |
| `public/locales/es/*.json` | Agregar strings ES |
| `public/locales/en/*.json` | Agregar strings EN |

---

## Dependencies

- P1-01 completado (wizard de registro)
- P1-02 completado (página de invitación + checklist)
- Backend Phase 23 completamente deployado
