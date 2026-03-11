# Plan P1-01: Registro e Onboarding de Inmobiliarias

## Goal

Agregar la opción "Soy una inmobiliaria" al flujo de registro/onboarding existente, implementar el wizard de creación de agencia post-registro, y actualizar el contexto de autenticación para incluir la información de agencia del usuario.

---

## Tasks

### Task 1: Actualizar el selector de tipo de cuenta en registro

**Ubicar el componente actual:** Buscar donde está implementado el selector INQUILINO / PROPIETARIO / AMBOS en el flujo de registro/onboarding.

Agregar nueva opción:
```tsx
// Nueva card para inmobiliarias
<AccountTypeCard
  value="INMOBILIARIA"
  icon={<Building2 />}
  title="Soy una inmobiliaria"
  description="Gestiona propiedades de múltiples propietarios con tu equipo"
  selected={accountType === 'INMOBILIARIA'}
  onClick={() => setAccountType('INMOBILIARIA')}
/>
```

Cuando se selecciona INMOBILIARIA, mostrar campos adicionales en el mismo formulario:
```tsx
{accountType === 'INMOBILIARIA' && (
  <div className="mt-4 space-y-3">
    <Input
      label="Nombre de la agencia"
      placeholder="Ej: Inmobiliaria Rodríguez & Asociados"
      required
      {...register('agencyName')}
    />
    <Input
      label="NIT (opcional)"
      placeholder="900.123.456-7"
      {...register('agencyNit')}
    />
    <CitySelector
      label="Ciudad principal"
      {...register('agencyCity')}
    />
  </div>
)}
```

### Task 2: Actualizar la llamada al endpoint de onboarding

**Archivo:** Donde se llama `POST /users/me/onboarding` actualmente.

Para tipo INMOBILIARIA, incluir el objeto `agency`:
```typescript
const onboardingPayload = {
  userType: accountType,  // 'INMOBILIARIA'
  firstName,
  lastName,
  phone,
  ...(accountType === 'INMOBILIARIA' && {
    agency: {
      name: agencyName,
      nit: agencyNit || undefined,
      city: agencyCity,
    }
  })
};

const response = await fetch('/users/me/onboarding', {
  method: 'POST',
  body: JSON.stringify(onboardingPayload),
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
});

// Si es INMOBILIARIA, la respuesta incluye { user, agency }
// Guardar agencyId en el contexto de auth
```

### Task 3: Actualizar el contexto de autenticación

**Buscar:** El store de Zustand o Context donde se guarda el usuario actual.

Agregar campos de agencia:
```typescript
interface UserStore {
  user: User | null;
  // NUEVO:
  agency: Agency | null;
  agencyRole: 'ADMIN' | 'AGENTE' | 'CONTADOR' | 'VIEWER' | null;
  setAgency: (agency: Agency | null, role: string | null) => void;
}
```

Al cargar el usuario (`GET /users/me`), también verificar si es miembro de una agencia y cargar esa info.

### Task 4: Wizard de Setup de Agencia (modal o página dedicada)

Crear componente `AgencySetupWizard` — puede ser un modal o página `/panel/inmobiliaria/setup`.

**Paso 1 — Información básica** (pre-llenado con datos del registro):
```tsx
<form>
  <Input label="Nombre de la agencia" required />
  <Input label="NIT / RUT" />
  <Input label="Dirección" />
  <CitySelector label="Ciudad" />
  <Input label="Teléfono" />
  <Input label="Email de la agencia" type="email" />
</form>
```
Al enviar: `PUT /inmobiliaria/agency` para completar el perfil.

**Paso 2 — Configuración de operaciones** (opcional, con valores por defecto):
```tsx
<form>
  <NumberInput label="Comisión por defecto (%)" defaultValue={10} min={0} max={100} />
  <NumberInput label="Día de cobro" defaultValue={5} min={1} max={28} />
  <NumberInput label="Día de dispersión" defaultValue={15} min={1} max={28} />
</form>
```

**Paso 3 — Invitar primer miembro** (completamente opcional):
```tsx
<form>
  <Input label="Email del miembro" type="email" />
  <Select label="Rol">
    <Option value="AGENTE">Agente</Option>
    <Option value="CONTADOR">Contador</Option>
    <Option value="ADMIN">Administrador</Option>
    <Option value="VIEWER">Solo lectura</Option>
  </Select>
  <Button variant="outline" onClick={skipStep}>Omitir por ahora</Button>
  <Button type="submit">Enviar invitación</Button>
</form>
```
Al enviar: `POST /inmobiliaria/agency/members`

### Task 5: Redirección post-registro

Cuando el onboarding de INMOBILIARIA es exitoso:
```typescript
if (accountType === 'INMOBILIARIA') {
  // Guardar agency en store
  setAgency(response.agency, 'ADMIN');
  // Mostrar el wizard de setup (modal o redirect)
  router.push('/panel/inmobiliaria?setup=true');
  // El parámetro setup=true activa el AgencySetupWizard
}
```

### Task 6: Validación del formulario

Usando Zod + React Hook Form:
```typescript
const inmobiliariaSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().optional(),
  agencyName: z.string().min(2, 'El nombre de la agencia es requerido'),
  agencyNit: z.string().optional(),
  agencyCity: z.string().min(1, 'Selecciona una ciudad'),
});
```

---

## Acceptance Criteria

- [ ] El selector de tipo de cuenta muestra la opción "Soy una inmobiliaria" como cuarta opción
- [ ] Al seleccionar INMOBILIARIA, aparecen campos de nombre de agencia y NIT
- [ ] El formulario no permite enviar si `agencyName` está vacío cuando tipo = INMOBILIARIA
- [ ] El submit llama al endpoint con `{ userType: 'INMOBILIARIA', agency: { name, nit, city } }`
- [ ] El usuario INMOBILIARIA es redirigido a `/panel/inmobiliaria` tras el registro
- [ ] El wizard de setup aparece automáticamente en la primera visita al panel
- [ ] El wizard tiene 3 pasos navegables con "Anterior" / "Siguiente"
- [ ] El paso 3 (invitar miembro) puede omitirse
- [ ] El contexto de auth incluye `agency` y `agencyRole` tras el registro

---

## Files to Modify/Create

| Archivo | Tipo de cambio |
|---------|---------------|
| Componente de tipo de cuenta en registro | Agregar opción INMOBILIARIA + campos |
| Función/hook de onboarding | Incluir campo `agency` condicionalmente |
| Store de auth (Zustand/Context) | Agregar `agency`, `agencyRole`, `setAgency` |
| `components/inmobiliaria/AgencySetupWizard.tsx` | Nuevo componente |
| `components/inmobiliaria/wizard/AgencyBasicForm.tsx` | Nuevo |
| `components/inmobiliaria/wizard/AgencyOperationsForm.tsx` | Nuevo |
| `components/inmobiliaria/wizard/InviteFirstMemberForm.tsx` | Nuevo |
| `app/panel/inmobiliaria/page.tsx` | Detectar `?setup=true` y mostrar wizard |

---

## Dependencies

- Backend Phase 23-01 debe estar deployado (soporte para `userType: INMOBILIARIA`)
- P1-02 (página de invitación) puede desarrollarse en paralelo
