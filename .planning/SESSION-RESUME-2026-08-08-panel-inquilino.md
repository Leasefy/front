# Sesión 2026-08-08 — El panel del inquilino, usándolo de verdad

**Punto de retome. Leé esto primero.** Sucede al de 2026-08-07 (que sigue valiendo para el
detalle del vocabulario y del recorrido público). Todo en `~/rent/mvp-inmobiliaria`, rama
**`feat/experiencia-inmobiliaria`**.

---

## Estado

**24 commits** sobre `develop` (`dcab5284`) · **79 archivos** · árbol limpio ·
**la rama NO existe en `origin`** — el push y el PR los decide Nico.

`tsc` limpio · **219 archivos / 1749 tests** · `next lint` sin errores ·
**`pnpm build` verde** (245 páginas).

⚠️ Correr `next build` **mata los chunks del `next dev`** que comparte `.next`: parar el dev
antes y reiniciarlo después. Ya pasó una vez.

---

## Cómo ver el recorrido funcionando (sin esperar correos)

```bash
SP=/tmp/claude-501/-Users-nicolasgarcia-rent-mvp/<session>/scratchpad
SRK=$(grep -rhoE "SUPABASE_SERVICE_ROLE[A-Z_]*=.+" ~/rent/agent-develop/.env* | head -1 | cut -d= -f2-)
SRK="$SRK" nohup node $SP/abrir.mjs > $SP/abrir.log 2>&1 & disown
```

`abrir.mjs` abre un Chrome **visible**, siembra la aprobación en `localStorage`, entra y aterriza
en el catálogo. Deja la ventana abierta.

- **Cuenta de inquilino ya confirmada:** `maria.inquilina@leasefy-dev.co` · `PRueba123#`
- La **service role key** del Supabase de dev (`jraqurdcjwnifzpdqtnm`) está en
  `~/rent/agent-develop/.env*` y en `~/rent/back/.env`. Sirve para crear cuentas ya confirmadas
  (`POST /auth/v1/admin/users` con `email_confirm: true`) y saltarse el correo.
- El select de ciudad **no abre en modo visible** con automatización (a mano sí). Por eso el
  script siembra la aprobación en vez de llenar el formulario.

---

## Lo que se construyó y arregló hoy

### El catálogo del recorrido no existía en pantalla

`/inquilino/para-ti` se cerraba con `hasVerifiedProfile` —el perfil de scoring A/B/C/D— y le
decía *"necesitamos conocer tu perfil, completa una aplicación o solicita una evaluación"* a
quien acababa de aprobarse. Son dos cosas distintas: el scoring dice *qué tan probable es que te
acepten*; la aprobación dice *hasta cuánto te respaldan*, y con eso alcanza para armar un
catálogo. → **`components/tenant/CatalogoPorAprobacion.tsx`**.

**Solo muestra lo que puede tomar.** La regla "lo que se pasa del tope se ve, marcado" es para el
catálogo **general** (`explorar`, `/propiedades`), donde navegar libre importa. Acá contradecía la
promesa de la pantalla. Sin nada dentro del tope hay estado vacío propio.
Las **arrendadas** también quedan fuera (bajó la cuenta de 14 a 7).

### El link de confirmación no aterrizaba

Tres cosas encadenadas:
1. Apuntaba a `/inquilino/para-ti`, detrás de `ProtectedRoute allowedRoles={['tenant']}` — sin
   registro en el backend el guard rebota. Y un `returnUrl` explícito **salta `/auth/post-login`**,
   que resuelve MFA y onboarding. Ahora va al onboarding, como el registro normal.
2. `TenantOnboardingShell` **descartaba el `returnUrl`**. Ahora lo honra (con `sanitizeReturnUrl`;
   hay test del caso feo: un destino absoluto no secuestra el aterrizaje).
3. La copy prometía "entras directo a tu catálogo" y "tu aprobación quedó guardada" — sin decir
   que está guardada **en ese navegador**.

### La pantalla de la aprobación no veía la aprobación

Era la **única** que llamaba a `fetchAprobacion()` por su cuenta en vez de `useAprobacion`, así
que no veía el respaldo local y decía "Todavía no tienes una aprobación" a quien sí la tenía.
Justo la pantalla que lleva su nombre. También estaba en `max-w-3xl` cuando el estándar del área
es `max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10` (10 de 13 pantallas).

### Crear la cuenta borraba la aprobación

Con sesión, un `sin_estudio` del backend (que es lo que devuelve su 404) pisaba el respaldo local.
Ahora **un vacío del backend no borra lo que la persona ya se ganó**; cualquier otro estado sí
manda. Con test del caso inverso.

### Un patrón que se repitió: andamiaje alrededor de un vacío

`Mi Arriendo` y `Mis postulaciones` montaban KPI en cero, pestañas para filtrar nada y
conmutadores de vista para elegir cómo ver nada. Peor: *"Estado general · Al día · Todos los pagos
al día"* **es falso** sin pagos. Ahora sin datos solo queda el estado vacío, y su CTA lleva a
**su catálogo**, no a Explorar ni al historial.

**Buscar este patrón en el resto del panel** — casi seguro hay más.

### Navegación y marca

- **"Para ti" no estaba en el sidebar ni enlazado** desde el panel: solo se llegaba sabiendo la
  URL. Y el panel ya tenía una sección "Propiedades para ti" cuyo "Ver más" iba a Explorar.
- **El detalle borraba el recorrido**: breadcrumb fijo en "Propiedades" → Explorar. Ahora las
  tarjetas marcan el origen (`?from=para-ti`) y la migaja lo respeta.
- **El logo del sidebar era distinto según el rol**: inquilino y propietario caían a un fallback
  (`LeasefyLogo` 30) mientras inmobiliaria usaba el lockup (`LeasefyLogotype` 26). Unificado.
- **El footer de marketing** colgaba de todas las pantallas del inquilino. Fuera.
- `Sparkle` → **`Target`** en "Para ti": las chispas están reservadas para IA, y esto es un filtro
  por monto.

### Vocabulario

**"Mi aprobación" → "Mi tope de arriendo"** (en: *My rental cap*). El motivo real: en el mismo
sidebar está **"Mis postulaciones", que también se aprueban**. Dos aprobaciones compitiendo por el
mismo nombre. Aplicado en sidebar, pantalla, los dos idiomas y `docs/VOCABULARIO.md`.
La **ruta sigue** siendo `/inquilino/aprobacion` — renombrarla pide otro redirect permanente.

### i18n

`useTf(clave, respaldo)` compartido (`lib/i18n/use-tf.ts`) + claves en `es` y `en`.
Usa **`useOptionalI18n`, no `useI18n`**: el segundo **lanza** sin provider y tumbaba la pantalla
pública de resultado **en blanco**. Test `lib/i18n/claves-aprobacion.test.ts` que lee las claves
que los componentes piden de verdad y falla si falta alguna en cualquier idioma.

---

## 🔴 Lo que falta, y no es del front

**`HANDOFF-VICTOR-RECORRIDO-INQUILINO.md`** (raíz del repo) tiene los 7 puntos con evidencia.
Los tres del mínimo: **pushear el funnel** (vive en 11 ramas locales), **`canonCop` opcional**
(hoy consultar sin propiedad da 422) y **`maxAfianzableCop`** en la respuesta.

**Dos decisiones de Nico, no de código:**
- **Supabase Redirect URLs** no incluye `localhost:3002`, así que el link del correo aterriza en
  el **:3001**. Verificado generando el link real. Sin eso, todo el aterrizaje no se ejecuta.
- **Confirmación de correo** activa: nadie entra directo. El código soporta las dos formas.

---

## Qué sigue

- Barrer el patrón "andamiaje alrededor de un vacío" en el resto del panel del inquilino.
- **Panel de inmobiliaria, pasos 7→11** — sigue siendo el milestone acordado. Ya hay cimientos sin
  usar: `funnel-applications.service.ts` está escrito, con mocks y tests, y **ninguna UI lo consume**.
- La pantalla de pago (paso 3): existe el endpoint, falta el `solicitudId` del backend.
