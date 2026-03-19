# Plan P1-02: Página de Invitaciones + Widget de Onboarding

## Goal

Implementar la página pública `/invitacion/[token]` que permite a los miembros invitados aceptar o rechazar su invitación a una agencia, y el widget de checklist de onboarding que guía al admin recién registrado a completar el setup de su agencia.

---

## Tasks

### Task 1: Página `/invitacion/[token]`

**Archivo a crear:** `app/invitacion/[token]/page.tsx`

Esta página es pública — no requiere estar logueado para ver la información de la invitación, pero sí para aceptarla.

#### Estado de carga
```tsx
// Skeleton mientras valida el token
<div className="flex items-center justify-center min-h-screen">
  <Card className="w-full max-w-md p-8">
    <Skeleton className="h-8 w-48 mb-4" />
    <Skeleton className="h-4 w-64 mb-2" />
    <Skeleton className="h-10 w-full mt-6" />
  </Card>
</div>
```

#### Estado: token válido (usuario NO logueado)
```tsx
<Card className="w-full max-w-md p-8">
  <div className="flex items-center gap-3 mb-6">
    <Building2 className="h-8 w-8 text-primary" />
    <div>
      <h1 className="text-xl font-bold">{invitation.agencyName}</h1>
      <p className="text-sm text-muted-foreground">Te ha invitado a unirte</p>
    </div>
  </div>

  <div className="bg-muted rounded-lg p-4 mb-6">
    <p className="text-sm">Rol asignado: <strong>{roleLabel[invitation.role]}</strong></p>
    <p className="text-sm text-muted-foreground">
      Invitación válida hasta: {format(invitation.expiresAt, 'dd/MM/yyyy')}
    </p>
  </div>

  <p className="text-sm text-muted-foreground mb-6">
    Para aceptar esta invitación necesitas iniciar sesión o crear una cuenta.
  </p>

  <div className="flex flex-col gap-3">
    <Button onClick={() => router.push(`/login?redirect=/invitacion/${token}`)}>
      Iniciar sesión para aceptar
    </Button>
    <Button variant="outline" onClick={() => router.push(`/registro?redirect=/invitacion/${token}`)}>
      Crear cuenta nueva
    </Button>
    <Button variant="ghost" onClick={handleDecline} className="text-destructive">
      Rechazar invitación
    </Button>
  </div>
</Card>
```

#### Estado: token válido (usuario YA logueado)
```tsx
<Card className="w-full max-w-md p-8">
  {/* Mismo header con nombre de agencia */}

  <div className="bg-muted rounded-lg p-4 mb-6">
    <p>Hola, <strong>{user.firstName}</strong></p>
    <p className="text-sm">Te unirás a <strong>{invitation.agencyName}</strong> como <strong>{roleLabel[invitation.role]}</strong></p>
  </div>

  <div className="flex gap-3">
    <Button onClick={handleAccept} disabled={isLoading}>
      {isLoading ? <Loader2 className="animate-spin" /> : 'Aceptar invitación'}
    </Button>
    <Button variant="outline" onClick={handleDecline}>
      Rechazar
    </Button>
  </div>
</Card>
```

#### Estado: token expirado
```tsx
<Card className="w-full max-w-md p-8 text-center">
  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
  <h2 className="text-xl font-bold mb-2">Invitación expirada</h2>
  <p className="text-muted-foreground">
    Esta invitación ya no es válida. Pide al administrador de la agencia que reenvíe tu invitación.
  </p>
</Card>
```

#### Estado: token inválido
```tsx
<Card className="w-full max-w-md p-8 text-center">
  <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
  <h2 className="text-xl font-bold mb-2">Invitación no encontrada</h2>
  <p className="text-muted-foreground">
    Este enlace de invitación no es válido o ya fue utilizado.
  </p>
  <Button variant="outline" className="mt-6" onClick={() => router.push('/')}>
    Ir al inicio
  </Button>
</Card>
```

---

### Task 2: Lógica de la página de invitación

```typescript
// app/invitacion/[token]/page.tsx
'use client';

export default function InvitationPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const { user } = useAuth();
  const router = useRouter();

  // 1. Obtener info del token (endpoint público)
  const { data: invitation, error, isLoading } = useInvitation(token);

  // 2. Redirigir post-login si hay redirect param
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const redirect = searchParams.get('redirect');
    if (user && redirect === `/invitacion/${token}`) {
      // El usuario acaba de loguearse para aceptar
      // Mostrar el estado de "logueado"
    }
  }, [user]);

  // 3. Manejar aceptar
  const handleAccept = async () => {
    await fetch(`/inmobiliaria/agency/invitations/${token}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await getToken()}` }
    });
    // Actualizar contexto con nueva agencia
    await refreshUser();
    router.push('/panel/inmobiliaria');
  };

  // 4. Manejar rechazar
  const handleDecline = async () => {
    await fetch(`/inmobiliaria/agency/invitations/${token}/decline`, { method: 'POST' });
    router.push('/');
  };

  // Renderizar según estado
  if (isLoading) return <LoadingSkeleton />;
  if (error?.status === 404) return <InvalidTokenState />;
  if (error?.status === 400) return <ExpiredTokenState />;
  if (!user) return <LoggedOutState invitation={invitation} token={token} onDecline={handleDecline} />;
  return <LoggedInState invitation={invitation} onAccept={handleAccept} onDecline={handleDecline} />;
}
```

---

### Task 3: Hook `useInvitation(token)`

**Archivo:** `hooks/useInvitation.ts`

```typescript
export function useInvitation(token: string) {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      const response = await fetch(`/inmobiliaria/agency/invitations/${token}`);
      if (!response.ok) {
        const error = new Error('Invitation error');
        error.status = response.status;
        throw error;
      }
      return response.json() as Promise<InvitationInfo>;
    },
    retry: false,  // No reintentar en 404/400
  });
}

interface InvitationInfo {
  agencyName: string;
  agencyCity: string;
  role: 'ADMIN' | 'AGENTE' | 'CONTADOR' | 'VIEWER';
  invitedEmail: string;
  expiresAt: string;
}
```

---

### Task 4: Widget de Onboarding en Dashboard de Inmobiliaria

**Archivo:** `components/inmobiliaria/OnboardingChecklist.tsx`

```tsx
interface OnboardingStep {
  key: string;
  label: string;
  completed: boolean;
  action?: { label: string; href: string };
}

export function OnboardingChecklist() {
  const { data: status } = useOnboardingStatus();

  if (!status || status.isComplete) return null;

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            🏢 Configura tu agencia
          </CardTitle>
          <Badge variant="outline">{status.completionPercent}% completado</Badge>
        </div>
        <Progress value={status.completionPercent} className="h-2" />
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {status.steps.map((step) => (
            <li key={step.key} className="flex items-center gap-2 text-sm">
              {step.completed
                ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                : <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              }
              <span className={step.completed ? 'text-muted-foreground line-through' : ''}>
                {step.label}
              </span>
              {!step.completed && step.action && (
                <Link href={step.action.href} className="ml-auto text-xs text-primary hover:underline">
                  {step.action.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
```

**Integrar en:** `app/panel/inmobiliaria/page.tsx` — al principio del contenido del dashboard.

---

### Task 5: Hook `useOnboardingStatus()`

```typescript
// hooks/useOnboardingStatus.ts
export function useOnboardingStatus() {
  const { agencyRole } = useAuth();

  return useQuery({
    queryKey: ['agency-onboarding-status'],
    queryFn: () => apiClient.get('/inmobiliaria/agency/onboarding-status'),
    enabled: agencyRole === 'ADMIN',  // Solo el admin ve el checklist
    staleTime: 5 * 60 * 1000,         // Cache 5 minutos
  });
}
```

---

### Task 6: Middleware — ruta pública `/invitacion/[token]`

**Archivo:** `middleware.ts`

Verificar que la ruta `/invitacion/[token]` está en la lista de rutas públicas (no requiere auth para acceder):

```typescript
const publicRoutes = [
  '/',
  '/login',
  '/registro',
  '/propiedades',
  '/invitacion',   // AGREGAR ESTA LÍNEA
  // ...
];

// O si usa matcher pattern:
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|invitacion).*)']
  //                                                               ^^^
  //                                                    Excluir /invitacion del auth
};
```

---

## Acceptance Criteria

- [ ] `GET /invitacion/[token]` muestra info de la agencia sin requerir login
- [ ] `GET /invitacion/[token-expirado]` muestra pantalla de "Invitación expirada"
- [ ] `GET /invitacion/[token-invalido]` muestra pantalla de "Invitación no encontrada"
- [ ] Usuario no logueado ve botones "Iniciar sesión" y "Crear cuenta"
- [ ] Usuario logueado ve botones "Aceptar" y "Rechazar"
- [ ] Al aceptar, el usuario es redirigido a `/panel/inmobiliaria`
- [ ] Al rechazar, el usuario es redirigido a `/`
- [ ] El widget de onboarding aparece en el dashboard cuando el setup no está completo
- [ ] El widget no aparece cuando `status.isComplete === true`
- [ ] Solo el ADMIN ve el widget (no los agentes)
- [ ] Cada paso del checklist tiene un link de acción cuando no está completado

---

## Files to Create/Modify

| Archivo | Tipo de cambio |
|---------|---------------|
| `app/invitacion/[token]/page.tsx` | Nuevo — página pública de invitación |
| `app/invitacion/[token]/loading.tsx` | Nuevo — skeleton de carga |
| `hooks/useInvitation.ts` | Nuevo hook |
| `hooks/useOnboardingStatus.ts` | Nuevo hook |
| `components/inmobiliaria/OnboardingChecklist.tsx` | Nuevo componente |
| `app/panel/inmobiliaria/page.tsx` | Integrar OnboardingChecklist |
| `middleware.ts` | Agregar `/invitacion` como ruta pública |

---

## Dependencies

- Backend Phase 23-02 (endpoints de tokens de invitación)
- P1-01 puede estar en desarrollo en paralelo
