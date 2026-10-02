# Leasify — Frontend (front/)

Frontend único de Leasify, plataforma de arriendos inmobiliarios en Colombia.
Next.js 15 App Router (React 19). Corre en :3001 (el :3000 es del back).

> Conocimiento profundo del micro. Para contratos con otros servicios ver `../SYSTEM-MAP.md`.
> Para historial y decisiones: `mem_search(project: "front")`.

## ⚠️ Trabajo de UI — Leé esto PRIMERO

**Antes de construir, modificar o revisar CUALQUIER UI, DEBÉS leer [`docs/DESIGN.md`](./docs/DESIGN.md).**

Es la fuente de verdad para:
- Principios de diseño + anti-patrones (sin glass morphism, sin gradientes en bubbles,
  botones primarios en mayúsculas, etc.)
- Patrones canónicos de componentes (drawers, buttons, inputs, cards, banners) con refs file:line
- Tokens (colores, radius, sombras, motion, tipografía)
- Integración Lenis smooth scroll (`data-lenis-prevent` + `useLenis().stop()` obligatorio en modales)
- Reglas de accesibilidad

No inventes patrones cuando ya existe uno canónico. Si falta algo en DESIGN.md, PREGUNTÁ o extendelo.
Color específico: [`docs/COLOR_SYSTEM.md`](./docs/COLOR_SYSTEM.md).

## Qué es

Frontend completo: landing pública, catálogo de propiedades, paneles de tenant, landlord e
inmobiliaria (agencia). El código de los agentes IA NO vive acá — se migró a `Leasefy/agent`
el 2026-04-07. Este repo consume el agent vía HTTP y mantiene solo la UI de agentes (cards,
activity feed, execution panel).

## Stack

- Next.js 15.5 App Router + React 19 + TypeScript 5. Package manager: **pnpm**. (Subido desde
  14.2 el 23-09 por seguridad: `params`/`searchParams`/`cookies()` son promesas; en páginas
  cliente se leen con `use()`.)
- Tailwind 3.4 + tokens via CSS vars `hsl(var(--...))` + Radix UI/shadcn + Framer Motion.
- Formularios: react-hook-form + zod. Toasts: sonner. Iconos: Phosphor + Lucide.
- Estado: React Context + hooks custom (`src/lib/context/`, `src/lib/hooks/`). SIN Zustand/Redux.
- Mapas: maplibre 6 (react-map-gl 8) + supercluster. El worker de MapLibre se sirve desde
  `public/maplibre/<versión>/` (lo copia el `postinstall`); todo `<Map>` importa
  `src/components/map/trabajador-de-maplibre.ts` o el mapa sale gris. Gráficas: recharts. Scroll: lenis.
- Auth: Supabase (`@supabase/ssr`) + MFA TOTP. Push: Firebase FCM.

## Estructura

- Rutas: `/panel/inmobiliaria/*` (panel agencia; los agentes de IA tienen su propia sección del menú, «Agentes IA», arriba de todo, pero conservan la URL del módulo cuyo proceso automatizan, p.ej. `/pagos/cobranza` y `/postulaciones/asegurabilidad` — ver `src/lib/nav/arquitectura-del-panel.ts`),
  `/panel/(landlord)`, `/inquilino`, `/propiedades`, `/onboarding`, `/aplicar`, `/auth`, `/avaluo`.
- **Backoffice admin** (`/admin/*`, `src/app/admin/`): panel interno de Leasefy/Portofino
  (operación cross-tenant). Auth propia (`/admin/login`, allowlist `ADMIN_EMAILS`), sidebar
  en `src/components/admin/Nav.tsx`. ⚠️ NO usa el design system de shadcn/`DESIGN.md`: tiene
  el suyo propio (clases `card`/`btn`/`pill`, tokens `fg/bg/brand`, mono) en `admin.css`.
  Cliente HTTP: `adminApi` (`src/lib/admin/api.ts`, base `NEXT_PUBLIC_ADMIN_API_URL`).
  Referencia canónica de patrón de pantalla: `/admin/approvals`.
- Componentes por feature folders en `src/components/` (no atomic design).
- Patrón páginas de panel: `page.tsx` (Server Component) + `XxxView.tsx` (presentación) +
  `XxxClient.tsx` (interacción).
- Lógica en `src/lib/`: `api/` (servicios `dominio.service.ts`), `auth/`, `hooks/`, `types/`,
  `cobranza/`, `cotizador/`, `search/`.

## Contratos consumidos

- **Back** (`NEXT_PUBLIC_BACKEND_URL`): cliente `src/lib/api/client.ts`, Bearer JWT de Supabase
  en memoria. Servicios por dominio en `src/lib/api/*.service.ts`.
- **Agent** (`NEXT_PUBLIC_AGENT_URL`): tipos generados en `src/lib/api/generated/agent.ts`.
  NUNCA editar a mano — regenerar con `pnpm api:gen`. Validá frescura con `pnpm api:check`
  **a mano antes de PR**: el CI NO lo corre (ver §Gates manuales).
- Mock mode: **apagado por defecto y NUNCA en producción**. Sólo lo tienen 3 servicios
  (`funnel`, `funnel-applications`, `aprobacion`), los tres con la misma guarda:
  `NODE_ENV === 'production'` → false; si no, `NEXT_PUBLIC_USE_MOCK_API === 'true'` (opt-in
  explícito) o falta `NEXT_PUBLIC_AGENT_URL`. **Cobranza y cotizador no tienen mock: siempre
  pegan al agente.** (Acá decía «activo salvo `!== 'false'`»; ese patrón no existe en el código
  y hacía pensar que el panel servía datos inventados.)
- ⚠️ `ANTHROPIC_API_KEY`, `INNGEST_*`, las keys de proveedores → viven en el `.env` del agent, NO acá.

## Auth y permisos

- `AuthProvider` escucha `supabase.auth.onAuthStateChange` y llama **una sola vez**
  `GET /users/me/bootstrap` (T-0082), que compone perfil + rol + agencia (+ permisos
  efectivos) + suscripción + estado de onboarding en una sola respuesta
  (`src/lib/api/bootstrap.service.ts`). Los cinco endpoints que compone
  (`GET /users/me`, `GET /inmobiliaria/agency`, `GET /inmobiliaria/agency/my-permissions`,
  `GET /inmobiliaria/subscription` / `GET /subscriptions/me`, `GET /users/me/onboarding/status`)
  siguen vivos, sin cambios, como **fallback por sección**: si el bootstrap reporta esa
  sección como fallida (`errors[]`) o no logueada (`agency: null`), el llamador original
  vuelve a pegarle directo a su endpoint. `refreshUser()` usa el mismo bootstrap.
- `src/lib/auth/bootstrap-seed.ts` — singleton de módulo (no React state) que entrega, UNA
  sola vez por campo, lo que el bootstrap ya resolvió a `PermissionsContext`,
  `useAgencySubscription` y `useMySubscription`, para que esos hooks no vuelvan a pedir en
  el primer mount lo que el login ya trajo. Un segundo mount (revisita de ruta) siempre cae
  al fetch en vivo — no es una caché, es dato inicial de un solo uso. Se limpia en
  `SIGNED_OUT`/`signOut()` — el seed de una sesión NUNCA debe llegar al próximo login en la
  misma pestaña.
- El agent-side `GET {agentUrl}/api/agency/{id}/my-permissions` (cobranza/cotizador) NO se
  plegó en el bootstrap a propósito (pondría una llamada S2S back→agent en el camino
  crítico del login) — sigue siempre disparándose desde `PermissionsContext.tsx`.
- Guards client-side (no middleware): `ProtectedRoute`, `AgencyRoleGuard`, `PermissionGate`.
- `PermissionsContext.canAccess(module, action)` — gate granular; carga permisos de back Y agent.
- Roles front: `tenant | landlord | agency`. Roles de agencia en `src/lib/auth/agency-roles.ts`
  (`ADMIN | AGENTE | CONTADOR | VIEWER`).

## Comandos

```bash
pnpm dev          # next dev -p 3001
pnpm test         # vitest run (happy-dom)
pnpm lint         # next lint
pnpm api:gen      # regenera tipos del agent desde OpenAPI (fallback: scripts/openapi-snapshot.json)
pnpm api:check    # falla si los tipos del agent están desactualizados
pnpm build        # next build (validar build de prod antes de PR)
npx playwright test   # E2E (tests/e2e/, requiere dev server en :3001)
```

Runtime: Node 20 (CI lo pina; no hay `.nvmrc`/`engines`). `postinstall` corre `prisma generate`.

## Gates manuales (NO los corre el CI)

El CI (`.github/workflows/ci.yml`) solo corre: `install --frozen-lockfile` → `tsc --noEmit` →
`pnpm test`. El job `e2e` es `workflow_dispatch` + `continue-on-error` (nunca bloquea merge).
**Antes de abrir PR corré a mano:** `pnpm lint`, `pnpm api:check` (si tocaste el contrato del
agent), `pnpm build`. Detalle en la skill `engineering-standards`.

**Después de `pnpm build`:** `node scripts/variables-libres-del-build.mjs` (lee
`.next/static/chunks`; sale 1 si encuentra algo, 2 si no hay build). Busca identificadores que
un chunk usa sin declarar y que no son globales del navegador: la huella del
`ReferenceError: propietarios is not defined` del 22-09 (commit `64a4a4aa`), que el
minificador de SWC produjo al inlinear un cierre — el fuente estaba bien, `next dev`, `tsc` y
las pruebas no lo veían. Un nombre de librería legítimo se agrega a `PERMITIDOS_DE_LIBRERIAS`
con su motivo; un chunk que no se puede parsear también hace fallar (no se da por limpio).

## Migración contable reanudable (T-0125)

La migración la maneja el navegador (los importadores recorren los endpoints `aplicar` en un
bucle), así que cerrar la pestaña o perder la red a mitad NO pierde el trabajo: lo escrito queda
en el back y la pantalla dice cómo seguir. Contrato congelado en
`.orchestration/tasks/T-0125-migracion-reanudable-sin-duplicados/contract.md`; el back es WU-1.

- **Apertura** (`AsientoDeApertura.tsx`): manda `esApertura: true`; el back identifica la
  apertura por agencia + fecha de corte y la llave del formulario deja de ser la garantía. Un 409
  `APERTURA_YA_REGISTRADA` (otra apertura con otros saldos) se traduce en `contabilidad-errores.ts`
  con el número y la fecha de `details`. `AsientoManual` NO manda la bandera.
- **Rutas nuevas del back**: `GET .../contabilidad/migracion/cargas` y
  `POST .../cargas/descartar` (`contabilidadApi.migracion.cargas` / `.descartarCarga`).
  `rutas-del-back.json` se regeneró con `node scripts/rutas-del-back.mjs <back>` para que el
  guardián las conozca.
- **Libro diario por tandas** (`asientosPorTandas.ts`): UN lote para todas las tandas del archivo, y
  CADA llamada a `aplicar` manda `totalDelArchivo` (el archivo entero) y `desde` (índice de la
  primera fila de la tanda; las vueltas por reloj de una misma tanda reenvían el mismo `desde`).
  El back guarda un prefijo contiguo del archivo; el informe trae `carga` sólo si el back la
  mandó — ausente es «no sé», nunca «0» ni «terminó».
- **Continuar una carga cortada** (paso `contables`): `CargasDeAsientosAbiertas` lista las cargas
  ABIERTAS (`GET .../cargas`) con su avance y dos salidas — «Continuar» y «Descartar» (no borra
  asientos). Vive en `RegistrosContables`, ARRIBA de las pestañas, porque quien está detrás del
  muro cae en «Saldos iniciales», no en «Subir el libro diario». Continuar = subir el MISMO
  archivo con el MISMO lote: `MigrarAsientos` recibe `continuar` y usa el lote de la carga (campo
  bloqueado) en vez del nombre del reloj (`nombreDeLoteDeAsientos`); con otro nombre el back abre
  una carga nueva y la vieja queda abierta. Lo ya escrito vuelve como `yaMigrados` y se lee como
  «ya estaba cargado», nunca como error; la identidad de un asiento con número es número + día +
  líneas (cuenta, débito, crédito): lo idéntico se omite; un asiento CORREGIDO entra como NUEVO y
  hay que reversar el original (`REGLA_DE_CORRECCION`).
- **Nunca atascado detrás del muro**: `propietarios`/`inquilinos` quedan `pendiente` mientras haya
  filas `LISTO` sin aplicar y `contables` mientras haya una carga ABIERTA. Invariante probada en
  `muro-reglas.test.ts` (729 combinaciones): el primer paso exigible sin terminar SIEMPRE está
  habilitado (`pasoHabilitado`), así que la persona llega al paso que bloquea. La salida: terceros
  → «Retomar» / «No la voy a seguir» de `MigrarTerceros`; contables → `CargasDeAsientosAbiertas`.
  El `detalle` del back se pinta en «Queda por hacer» (`muro-paso-falta`). Botar una carga o una
  fila de terceros pide `configuracion:delete` (sólo ADMIN): un 403 dice «pídele a un
  administrador», NO se tocan permisos.
- **Aviso al cerrar la pestaña** (`useAvisoAlSalir`, `src/lib/hooks/use-aviso-al-salir.ts`):
  registra `beforeunload` SÓLO mientras haya algo que perder — una operación en vuelo o un archivo
  leído en el navegador y todavía sin aplicar/preparar (preparado, el lote vive en el back y se
  retoma). Cableado en `MigrarAsientos`, `MigrarTerceros`, `ImportarCuentas`,
  `DocumentosContables`, `MigrarContratos` e `ImportWizard` (inmuebles). El texto del aviso lo
  pone el navegador. Un importador nuevo con bucle en el cliente debe usarlo.
- **Orden de despliegue**: el back primero. `totalDelArchivo`, `desde` y `esApertura` pasan por
  `forbidNonWhitelisted`; contra un back anterior a T-0125 un `aplicar` con esas claves es un 400.

## Terceros incompletos y acciones masivas (T-0128)

La migración de terceros (propietarios/inquilinos) ya no obliga a descartar lo que le falta el
documento: se crea la ficha **incompleta** y la inmobiliaria la completa después. Contrato congelado
en `.orchestration/tasks/T-0128-migracion-terceros-incompletos-y-masivo/contract.md`; el back es WU-1.

- **Seleccionar todo** (`MigrarTerceros.tsx`): además de «las 25 de esta página», «Seleccionar las N de la
  carga» y «a las N que les falta X» (conteos de `GET filas/motivos`, frases en
  `src/lib/migracion/motivos-de-fila.ts`). El estado `alcance` (`ids` | `todas` | `motivo`) decide el
  camino: `ids` = `PATCH filas` en tandas de 200 (de siempre); `todas`/`motivo` =
  `migracionTercerosApi.resolverPorFiltro` → `PATCH filas/masivo`, que da vueltas por cursor
  (`siguiente`) hasta `null`, muestra avance y, si se corta, devuelve lo acumulado con `interrumpida`.
  Vincular en masa sólo existe con filas marcadas a mano; descartar por filtro pide confirmación.
- **Valor por defecto** (`ResolucionMasiva`): cualquier campo menos `CAMPOS_NO_MASIVOS` (documento, DV,
  nombre, correo, externalId — el back responde 400 `CAMPO_NO_MASIVO`, mapeado en `mensaje()`). Siempre
  manda `sobrescribir` explícito: `false` llena sólo lo vacío (default), `true` con la casilla.
- **Crear con datos por completar**: acción masiva y por fila (`crearIncompleta: true`) cuando todos los
  errores de la fila están en `CODIGOS_COMPLETABLES`. Deja la fila `LISTO`; la ficha nace con el botón
  «Crear N» de arriba. Descartar es la salida discreta, nunca el default.
- `VARIAS_PERSONAS_EN_LA_FILA`: la fila muestra el texto crudo y sólo ofrece editar o descartar.
- **Documento nulo**: `Propietario.documentType/documentNumber` son `string | null`; se muestra «Sin
  registrar» (`documentoParaMostrar`) y la marca «Datos por completar: …» (`DatosPorCompletar`, desde
  `datosPendientes`) sale en la lista, tarjeta y ficha del propietario y en la lista/cajón de inquilinos.
  El formulario de propietario no inventa «CC» al editar una ficha sin tipo. Los 409
  `PROPIETARIO_SIN_DOCUMENTO` y `PAGARE_DATOS_INCOMPLETOS` se explican en
  `src/lib/errores/documento-del-propietario.ts` (enchufado en `mensajeDelFallo` y `errorEnCristiano`).

## Carga de inmuebles reanudable (T-0130)

La carga de inmuebles (`ImportWizard`, paso 3 del muro) ya no vive y muere con la pestaña. Contrato
congelado en `.orchestration/tasks/T-0130-migracion-inmuebles-reanudable/contract.md`; el back es WU-1.

- **Etapas** (`fase` del lote): `RECIBIENDO` (sube) -> `UBICANDO` (el NAVEGADOR busca las direcciones) ->
  `REVISANDO` (job del servidor) -> `LISTA`. `etapaDeLaCarga` (`lib/describirCargaAbierta.ts`) las lee.
- **Subir** (`lib/subirPorTandas.ts`): tandas de 500 con la MISMA `idempotencyKey`, `totalDelArchivo` (SIEMPRE,
  también con una sola tanda: sin él el back guarda las filas sin coordenadas como ya «no ubicadas») y
  `desde`. Se retoma en `siguienteDesde`. La clave se guarda por lote en `localStorage`
  (`leasefy-carga-inmuebles-clave:<lote>`, `lib/claveDeCarga.ts`) porque el back no la devuelve; sin ella
  (otro navegador) sólo se puede descartar. El servidor guarda las filas, NO el archivo: seguir subiendo exige
  volver a elegir el mismo archivo (`ImportWizardState.subidaRetomada`).
- **Ubicar** (`lib/ubicarPorTandas.ts`): mismo `ubicarDireccion`, misma pausa de siempre, pero las direcciones
  salen de `GET lotes/:lote/por-ubicar` de a 50 y cada tanda se guarda con `PATCH lotes/:lote/ubicaciones`.
  Un corte pierde a lo sumo 50; reanuda sola sin el archivo. «Continuar sin ubicar en el mapa» =
  `reintentar { omitirUbicacion: true }`. La página debe quedar abierta mientras se ubica.
- **Aviso al cerrar** (`useAvisoAlSalir`): sólo mientras se sube o se ubica (`StepConfirmImport`) y con un archivo
  leído sin subir (`ImportWizard`). Activar y la revisión son reanudables y ya no lo piden.
- **Tarjeta «Tienes una carga a medias»** (`CargasAMedias.tsx` + `use-cargas-abiertas-de-inmuebles.ts`): en
  CUALQUIER paso del asistente, con o sin archivo leído; Continuar / Reintentar / Descartar (con confirmación).
- **Activar de a 50** (`activarLoteCompleto`, `maximo: 50`): «X de Y creadas» sale de `progreso`; las filas
  `fallidas` no frenan el resto, se listan con su motivo y «Reintentar las fallidas» las libera (todas juntas:
  el back no libera una por una). Con fallidas NO se muestra «Importación completada».
- **Sesión** (`asegurarSesionVigente`, `client.ts`): antes de cada tanda/llamada/sondeo se renueva el token si le
  queda < 90 s. Con la sesión muerta se corta y se dice que lo subido está guardado; al volver a entrar la
  tarjeta lo ofrece. No se guarda nada sensible en el navegador (sólo la clave de idempotencia, un UUID).
- **409** `LOTE_INCOMPLETO` / `LOTE_EN_PROCESO` / `LOTE_FALLIDO` / `LOTE_NO_REINTENTABLE` / `LOTE_YA_CERRADO` /
  `TOTAL_DEL_ARCHIVO_DISTINTO` se traducen en `lib/mensajeDeCarga.ts`.

## Agente de proyecto y skills

`.claude/agents/leasify-front-agent.md` delega trabajo pesado; `.claude/skills/` tiene el
conocimiento de dominio/ingeniería (cobranza, cotizador, scoring, permisos, contrato del agent,
TDD, testing, estándares, living-docs). Cargá la skill que aplique antes de tocar su dominio.

## Convenciones

- Componentes `PascalCase.tsx`; hooks nuevos en `use-kebab-case.ts`.
- UI copy en español (Colombia). Código en inglés; dominio colombiano en español.
- A11y: proyecto `panel-a11y` de Playwright con axe-core — los paneles nuevos deben pasarlo.
- E2E de cobranza mockean red con `route.fulfill` (no requieren agente corriendo).
- localStorage legacy con prefijo `arriendo-facil-` (nombre pre-rebrand): NO renombrar.

## Decisiones tomadas

| Decisión | Elección | Por qué |
|----------|----------|---------|
| Ubicación de agentes IA | repo separado `Leasefy/agent` | Microservicio dueño de los agentes; el front llama por HTTP. 2026-04-07 (commit `60e773c`) |
| Plan gating de IA | solo planes Flex | Los agentes IA son el diferenciador del plan Flex |
| Colores UI agentes | neutro/sobrio | Sin colores estridentes |
| Login bootstrap (T-0082) | un solo `GET /users/me/bootstrap` compone 5 llamadas; los 5 endpoints originales quedan como fallback por sección, nunca se retiran | Cortar el fan-out de requests post-login sin introducir una caché ni romper la degradación fina que ya existía por endpoint |
