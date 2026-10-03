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

## Centro de procesos — la base común (01-10-2026)

Toda carga, descarga o acción masiva larga corre en el centro de procesos, por una de dos puertas
(`src/lib/procesos/en-el-centro.ts`, con sus pruebas al lado):

- **`lanzarEnElCentro({ titulo, tipoDeProceso, pedir, recursos?, alTerminar? })`** — el trabajo lo
  hace el SERVIDOR (`procesos.lanzar`, 202 `{ procesoId }`). Anuncia, pide, abre el centro con el
  proceso arriba y lo sigue (`procesosApi.ver` cada 2,5 s) hasta TERMINADO/FALLO/CANCELADO; entonces
  invalida `recursos` y llama `alTerminar`. Devuelve `{ procesoId }` de una; un error de `pedir()`
  sube tal cual. `seguirProceso(id, opciones)` sirve si el id ya se tiene.
- **`correrEnElNavegador({ tipo, titulo, total?, trabajo, recursos? })`** — el trabajo lo hace la
  PESTAÑA (`POST /inmobiliaria/procesos` y `:id/avance|terminar|fallar`). `trabajo(ctx)` usa
  `ctx.avanzar(hechos, extra?)` (como mucho 1/s; `false` = parar: «Detener» acá o «Cancelar» desde
  el centro) y `ctx.debeParar()`; devuelve `{ archivo?: { blob, nombre }, mensaje?, titulo? }`. Si el
  back no puede abrir el proceso (503 sin migración) el trabajo corre igual sin el centro y el
  archivo se baja directo: lo que funcionaba no se rompe.
- **`concurrencia(items, n, fn)`** para bucles que hoy disparan todo junto con `Promise.allSettled`.
- Tipos nuevos: `CARGA`, `ENVIO_MASIVO`, `GENERACION`, `APROBACION_MASIVA` (nombre e ícono en
  `estado-del-proceso.ts` / `FilaDeProceso.tsx`).

## Caídas: avisar sin culpar a nadie (01-10-2026)

Nico: «cuando algún servicio se caiga, deberíamos de avisarle al usuario». Dos capas en el front
(`src/lib/conexion/`, con sus pruebas al lado):

- **Capa 1 — Leasefy entero no responde / sin internet** (`estado-de-conexion.ts`): un store
  fuera de React que alimenta `apiClient` con cada respuesta. `fetch` que no sale → `sin-internet`
  (si `navigator.onLine === false`) o `leasefy-no-responde`; un 502/503/504 cuyo cuerpo no trae
  `statusCode` ni `code` (el balanceador) → `leasefy-no-responde`, y el `ApiError` sale con
  `code: 'LEASEFY_NO_RESPONDE'` y un mensaje humano. La base caída (5xx con `servicio: 'base'`)
  también va por acá: sin Postgres no funciona nada. Cualquier otra respuesta del back → `bien`.
  Lo pinta `<AvisoDeConexion>` (UNA vez, en `src/app/layout.tsx` junto al Toaster): franja flotante
  abajo (sube 5rem bajo `lg` por `MobileNavBar`, y con `translateY` por encima del pie de un cajón
  abierto para no tapar sus acciones) que pregunta a `/health` con espera creciente (5/10/20/40 s, tope 60 s) y se va con el
  primer 200. No borra, no cierra sesión, no redirige. Las llamadas directas al micro de agentes
  NO pasan por acá (son capa 2, servicio `asistente`).
- **Capa 2 — se cayó una parte** (`servicio-no-disponible.ts`): 502 o 503
  `{ code: 'SERVICIO_NO_DISPONIBLE', servicio? }` (los proxies de avalúos y del cotizador siguen
  en 502: la página de avalúos mira ese status), o cualquier 5xx con `servicio` (el 502
  `WOMPI_NO_RESPONDIO` cuando Wompi se cayó). Otro 503 sin `servicio` (`FALTA_UNA_MIGRACION`,
  `CENTRO_DE_PROCESOS_SIN_MIGRACION`) no es una caída. `apiClient` no toca `status` ni `code`; le
  pone al error el texto que nombra lo caído; `clasificarFallo` tiene el tipo
  `servicioNoDisponible`; `FalloDeCarga` (y por él
  `EstadoDeDatos`), los banners del registro y `mensajeDelFallo` / `errorEnCristiano` /
  `descripcionDelError` / `motivosDelError` dicen el texto de capa 2. «Nuestro equipo ya está
  avisado» sale SÓLO si `GET /health/servicios` lo confirma para ese servicio
  (`useEstadoDelServicio`, que pregunta sólo con un error de ese servicio en pantalla).
- Mientras la franja esté, un fallo de red en pantalla no repite el rojo: «Esperando a Leasefy…»
  con su reintento.

## Errores: un solo traductor y la regla de oro (02-10-2026)

Nico: «no hay ningún sistema de errores completo». El back y el micro mandan el mismo sobre
(`back/src/common/errores/contrato-de-error.ts`): `{ statusCode, code, message, campos?:
[{ campo, regla, mensaje, valor? }], servicio?, referencia? }`. `ApiError` lo guarda entero en
`detalle`.

- **Fuente de verdad**: `src/lib/errores/traductor-de-errores.ts` (`leerFallo`,
  `camposDelError`, `mensajeParaLaPersona(error, { porDefecto, accion })`). `mensajeDelFallo`,
  `errorEnCristiano`, `descripcionDelError` y `motivosDelError` delegan ahí; no escribas otro.
- 🔴 **Regla de oro**: «conexión» SÓLO cuando no hubo respuesta (status 0 / `fetch` que no
  salió). Un 4xx dice qué está mal. Un 5xx dice que falló de nuestro lado, sin culpar a nadie,
  con la `referencia` del back. Las caídas (503 `SERVICIO_NO_DISPONIBLE`) siguen con
  `src/lib/conexion/`.
- **Formularios**: `aplicarErroresDelServidor(error, form, { mapa, campos })`
  (`src/lib/errores/errores-en-el-formulario.ts`) hace `setError` en cada campo (mapa servidor →
  formulario), enfoca el primero y deja en un toast SÓLO lo que quedó sin campo. Sin RHF:
  `repartirErroresDelServidor`. La validación del cliente usa los MISMOS topes y frases que el
  DTO del back. Referencia: el onboarding del inquilino (`TenantOnboardingContext` +
  `lib/onboarding/preferencias-del-inquilino.ts`, espejo de `back/src/users/dto/limites-del-perfil.ts`).
- **El error bajo el campo entra suave**: `<ErrorDelCampo id mensaje pista? />`
  (`src/components/estado/ErrorDelCampo.tsx`, adaptador fino sobre el `FormError` de Cadence v1.1.1;
  con `pista`, la ayuda y el error se cruzan). `id` = el de `aria-describedby` (`${id}-error` en un `FormField`).
- **402** (códigos en `src/lib/errores/codigos-del-plan.ts`, espejo del back): `PLAN_REQUERIDO` en un GET
  del panel lleva a `/panel/inmobiliaria/upgrade` (`el402LlevaAlPlan`, `client.ts`); `LIMITE_DEL_PLAN`
  (trae `limite`: `LimiteDelPlan` = `agentes|inmuebles|evaluaciones`; el tope de evaluaciones del mes era un 429)
  NUNCA navega, se dice donde pasó con «Ver planes» a la mano (`limiteDelPlanDelError`, `use-agent.ts`); `NOMINA_NO_HABILITADA` lo pinta su cartel; un 402 sin
  `code` (back viejo) sigue la regla de antes. El registro nunca saca al fundador. `clasificarFallo`
  titula cada código (sin código = «sin créditos de IA»).
- **Frase por código** (`FRASES_DE_LOS_CODIGOS` / `fraseDelCodigo`): el `message` del back gana si se
  lee; la frase del código, si no. Un `message` se muestra hasta `LARGO_MAXIMO_DE_UN_MENSAJE` (800: los
  409 de caja pasan de 300) y nunca si trae saltos de línea, HTML, una traza, `node_modules`, un
  `archivo.ts:N`, Prisma o un JSON. `RegistrarPagoModal` ya pasa por el traductor.
- Un `code` estable decide; nunca el texto (P2002 del back viejo → `YA_EXISTE`; «should not
  exist» → `campos[].regla === 'no_permitido'`).
- **El micro (cobranza, piloto, agentes IA, conciliación; 02-10-2026)**: `agentFetch` devuelve la
  `Response` cruda. Una que no salió bien se vuelve `ApiError` con `falloDelMicro(res)`
  (`src/lib/api/fallo-del-micro.ts`): status, `code`, el `message` del sobre y `campos`; el `error`
  en inglés del cuerpo viejo nunca se muestra (queda en `detalle`, y como `code` si parece uno). Los
  hooks que devuelven `{ ok: false, error }` conservan `error` (hay pantallas que deciden con
  `'not_configured'`) y suman `fallo` (ese `ApiError`, o el `TypeError` de red tal cual):
  `lib/hooks/ai/accion-del-micro.ts`. La pantalla pinta `mensajeParaLaPersona(r.fallo, …)`.
- **Acciones que declaran su cuerpo (cola humana, 02-10-2026)**: `WorkItemAction.campos?: CampoDeLaAccion[]`
  (`lib/api/work-item.ts`). Con `campos`, la cola (`ColaHumana`) y el detalle (`AccionSugerida`) pintan
  `FormularioDeLaAccion` (valida con `ai/campos-de-la-accion.ts`, manda esas claves, un 400 con `campos` va a
  cada campo); sin `campos`, el motivo de siempre (`{ reason }`).
- **Acción vs lectura (02-10-2026)**: `clasificarFallo(e, { accion: 'resolver el caso' })` no titula un 4xx
  como «problema nuestro» (tipo `rechazado`, la descripción dice qué está mal); sin `accion`, igual que
  siempre. `mensajeDelFallo(e, porDefecto, accion?)`. `FalloDeCarga` no muestra referencia sin respuesta
  (red, corte por tiempo). El «fetch failed» de Node es red caída: `RED_CAIDA` de `lib/conexion/leer-el-error.ts`
  (la usa `clasificarFallo`) y `leerElError` da `status: 0` a ese `TypeError` (así lo lee el traductor).
- **Configuración**: los topes de `UpdateAgencyDto`/`InviteMemberDto` y de los medios de pago tienen
  su espejo en `src/lib/configuracion/limites-de-la-inmobiliaria.ts` y `limites-de-los-medios-de-pago.ts`
  (sólo se mira lo que cambió: un dato viejo no impide guardar lo demás). `SeccionPerfil` toastea por
  el traductor; con `campos`, los datos de la empresa los pintan en su campo y el toast calla.
- **La plata (pagos, caja, dispersiones, tesorería, cartera, contabilidad, facturación, nómina; 02-10-2026)**:
  la plata en `int4` se topa en **$2.000.000.000** («… no puede pasar de $2.000.000.000. Revisa que no
  sobren ceros.»); espejos en `src/lib/{recaudo,cobros,tesoreria,cartera,dispersiones,facturacion,contabilidad,finanzas}/limites-*.ts`
  y `components/nomina/limites-de-nomina.ts`, cada uno con su archivo del back. Los traductores del módulo
  (`mensajeDeContabilidad`, `motivoLegible`/`motivoDeLaAccion`, `explicarGiro`, `mensajeDelFalloDeEmision`,
  `motivoDeCompartir`, `motivoDelFalloDelRecordatorio`) se quedan SÓLO con sus códigos; lo demás, al traductor.
  🔴 `FalloDeCarga` es para LECTURAS: `clasificarFallo` titula un 400/409 como «problema nuestro». En una
  ACCIÓN, el 4xx va por `mensajeParaLaPersona` (ver `GenerarCobrosDialog`). Los 400 de caja sin `campos`
  que son de un campo (`FECHA_FUTURA`, `FECHA_NO_VALIDA`, el 409 del número de factura repetido) van bajo
  ese campo, no al banner. **Extracto bancario** (Nico, 02-10 tarde): hasta 20.000 líneas y
  ±$1.000.000.000.000 por línea (`lib/cobros/limites-del-extracto.ts`); una línea de más de
  $2.000.000.000 SÍ viaja («columna más grande»): sin la migración del back se descarta allá y vuelve en
  `avisos` + `descartadasPorValor`.

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
- **Crear** (T-0131): ya NO hay bucle de activación en el navegador — ver «Carga de inmuebles en 4 pasos» abajo.
- **Sesión** (`asegurarSesionVigente`, `client.ts`): antes de cada tanda/llamada/sondeo se renueva el token si le
  queda < 90 s. Con la sesión muerta se corta y se dice que lo subido está guardado; al volver a entrar la
  tarjeta lo ofrece. No se guarda nada sensible en el navegador (sólo la clave de idempotencia, un UUID).
- **409** `LOTE_INCOMPLETO` / `LOTE_EN_PROCESO` / `LOTE_FALLIDO` / `LOTE_NO_REINTENTABLE` / `LOTE_YA_CERRADO` /
  `TOTAL_DEL_ARCHIVO_DISTINTO` se traducen en `lib/mensajeDeCarga.ts`.

## Carga de inmuebles en 4 pasos (T-0131)

El asistente (`ImportWizard`) muestra SIEMPRE cuatro pasos: **1 Subir y mapear columnas** (elegir método, subir
archivo, mapear; el análisis local corre al salir del mapeo con `prepararFilas`, sin espera, y pone los títulos
sugeridos) · **2 Ubicar direcciones** (automático tras subir; guarda de a 50) · **3 Revisar lo que falta** (UNA lista de
filas por revisar + herramientas en bloque de T-0129 + «N listas para crear» + aviso del canon por confirmar) ·
**4 Crear todas**. El paso visible sale de `fase` del lote (`pasoVisibleDeLaCarga`); el indicador es sólo informativo.
La «Revisión con IA» (espera inventada de 2 s) se eliminó.

- **«Crear todas»** = UN `POST lotes/:lote/crear` (202) que encola el proceso del servidor; no hay bucle en el navegador.
  La vista de progreso sondea `GET lotes/:lote` cada 4 s mientras `fase === 'CREANDO'` y lee `creacion`
  (`creadas`/`fallidas`/`pendientes`/`total`): «1.850 de 2.000 creadas», «Puedes cerrar esta página: las seguimos creando».
  Las fallidas se piden a `GET filas?estado=LISTO` (traen `errorDeActivacion`) y SÓLO se reintentan con
  `POST lotes/:lote/reintentar` (nunca llamando `crear` otra vez: `crear` con sólo fallidas = 409 `NADA_PARA_CREAR`).
- **Al volver** (tarjeta de cargas / muro): `CREANDO` abre directo la vista de progreso; `TERMINADA` sin fallidas abre el
  resumen; `LISTA` con `creacion.creadas > 0` (una fila corregida después de terminar) abre el paso 4 con «Crear las N que faltan».
  `GET lotes` deja una carga TERMINADA 24 h: `CargasAMedias` la dibuja aparte («Terminada: X creadas, Y fallidas»), no «a medias».
- **409** `LOTE_INCOMPLETO` (aún se sube, ubica o revisa) y `NADA_PARA_CREAR` se traducen en `lib/mensajeDeCarga.ts`.
- **Errores de la carga (02-10-2026)**: `mensajeDeCarga` deja SÓLO los códigos del lote con su frase; lo demás va por
  `mensajeParaLaPersona` con su `accion` (5xx = «de nuestro lado» + referencia; «conexión» sólo sin respuesta). Los topes
  de lo que una persona escribe (corregir una fila, el masivo) son el espejo `lib/limites-de-la-importacion.ts` del
  `ResolverInmuebleDto` del back; una celda del ARCHIVO no se topa en el DTO (C13: una fila rara no tumba la tanda), la
  aparta `valorQueNoCabe` al crear con su cifra y su campo.
- `inmueblesImportacionApi.activar` y `activarLoteCompleto` se retiraron del front (el back conserva `activar` por compatibilidad).
- `useAvisoAlSalir` sigue SÓLO mientras se sube o se ubica (y con un archivo leído sin subir).

## Conciliación, Fase 1: la cuenta, los saldos y la pasarela (02-10-2026)

Nico (P3): «la cuenta es OBLIGATORIA al cargar el extracto; la conciliación, el saldo y el cierre van por
cuenta». (P4): la pasarela sólo se ignora sola con el id de la transacción; si no, se propone. Todo en
`src/components/cobros/extracto-bancario/` (lógica pura en `cuentas-del-extracto.ts`, con sus pruebas).

- **Cargar** (`CargarExtracto`): la cuenta sale de `conciliacionBancariaApi.cuentas()` (los medios de pago de
  la inmobiliaria con número; sin ninguna, el aviso lleva a Configuración → Medios de pago). Con una sola
  activa se preselecciona; sin elegir, «Cargar» no se aprieta. Bloque «Saldos y período»: la columna
  «Saldo» del archivo (nueva en `COLUMNAS_DE_EXTRACTO`, viaja como `filas[].saldoCop`), saldo inicial y
  final escritos (`leerSaldoEscrito`, espejo del tope del back) con el cuadre EN VIVO, y el período (sólo
  viaja si la persona lo cambió). El 409 `EXTRACTO_DE_OTRA_CUENTA` abre una confirmación y reenvía con
  `aceptarIgualesDeOtraCuenta`. `tesoreriaApi.cuentasDeclaradas` se retiró (sin llamadores).
- **Por cuenta** (`PorCuenta`): pastillas Todas / cada cuenta / «Sin cuenta» (lo cargado antes) /
  «Pasarela»; filtran `listar` y `resumen` (`cuenta`). La ficha: % conciliado por número y valor, saldo del
  banco frente al de los movimientos, última carga y días sin extracto. Sin la migración del back
  (`disponible: false`) se dice por qué y no hay filtro; un back sin la ruta, la pantalla queda como antes.
- **Pasarela en la fila** (`PropuestaDeLaPasarela`, ARRIBA de los cruces): «Es este pago en línea» →
  `esDeLaPasarela` (no emite nada); con otro valor no se ofrece. El pago en línea que no calzó con el canon
  se ve en la cola («Pago en línea») con lo que hay que hacer.
- Todo bloque nuevo entra con `useAparecer` (tokens de Cadence; con movimiento reducido, en el lugar).

## Conciliación, ola C2: las salidas del extracto (03-10-2026)

Nico (P5): «se concilian TODAS las salidas: giros a propietarios, egresos/proveedores, 4×1000, comisiones
bancarias y devoluciones». API en `src/lib/api/salidas-del-extracto.ts` (`/inmobiliaria/conciliacion-bancaria/salidas`).

- **La página** (`SalidasDelExtracto.tsx`): `SalidasDeLaPagina` envuelve la tabla y pide UNA vez por lectura de la
  lista las propuestas de las salidas (y de las entradas que hablan de un reverso, `hayQuePreguntarPorLaLinea`);
  `AvisosDeLasSalidas` (arriba de la tabla) muestra el giro que NO salió o salió DOS veces y «Conciliar las salidas
  seguras» (confirmación; sólo lo `alta` + único, regla P7).
- **La fila** (`SalidaDelExtracto.tsx`, dentro de `MovimientoFila`): hasta 3 propuestas con su regla con nombre y
  «Segura»; «Conciliar» manda ESA propuesta (el back re-verifica); sin propuesta, «Es un gasto del banco» (4×1000,
  comisión, IVA o cuota); conciliada, contra qué quedó (y si fue el Piloto) y «Deshacer» con motivo (ADMIN/CONTADOR).
  Un back sin la ruta o sin respuesta: la fila queda como antes («se puede ignorar»). Sin la migración, se ve pero
  «Conciliar» está apagado.

## Conciliación, ola C2: deshacer, cuentas de las diferencias y confianza (03-10-2026)

- **Deshacer** (`DeshacerLaConciliacion.tsx`, columna de acciones de `MovimientoFila`; API
  `src/lib/api/deshacer-la-conciliacion.ts`): Nico (P11) «desvincular con motivo y bitácora, sin anular el recibo. Sólo
  administrador o contador». Sólo ADMIN/CONTADOR (`agencyRole`), sólo entradas CONCILIADAS que no son de la pasarela y
  sin vínculo de salida (ésas tienen el «Deshacer» de `SalidaDelExtracto`). Pide motivo (5–500); el aviso dice qué recibos
  quedaron vivos.
- **Confianza** (Nico, C1-MEDIR Q1): «Confianza alta|media|baja» y, si el back manda `deCadaDiez` (medido por su banco de
  casos), «de cada 10 así, N son la correcta» con la barra hasta ese número. Nunca el porcentaje de la fórmula. La cola del
  agente (`/conciliacion/cola`) muestra sólo el nivel.
- **Configuración → Costos de la plata**: `CuentasDeLasDiferencias.tsx` (API `src/lib/api/cuentas-de-las-diferencias.ts`)
  elige la cuenta del 4×1000, de la comisión y de la retención del inquilino (asiento automático, P1), ofrece la de la
  semilla, avisa sin migración y «Asentarlas» para lo aprobado sin asiento. La retención configurada lleva su clase
  (en la fuente / ICA / IVA) para el certificado del propietario.

## Conciliación, ola 3: cierre del mes, alerta, efectivo y aseguradoras (03-10-2026)

API en `src/lib/api/cierre-de-conciliacion.ts`; lo puro (exportar, leer la relación) en
`components/cobros/extracto-bancario/cierre-del-mes.ts`.

- **Cierre del mes** (`CierreDelMes.tsx`, debajo de «Por cuenta» con una cuenta elegida): Nico (P9) «por cuenta y mes, con la
  firma del contador; el mes queda BLOQUEADO; reabrirlo exige un administrador con motivo». Meses con su estado; el borrador
  (`VistaDeLaFoto`) se ve siempre; «Firmar y cerrar» sólo para CONTADOR y con la casilla de «revisé»; «Reabrir el mes» sólo
  ADMIN con motivo 10–500. Excel y PDF (`xlsx` y `jspdf`, import perezoso) salen de la FOTO guardada con su huella, nunca
  recalculada. Un 409 `MES_CERRADO` de cualquier acción ya llega con su frase (el traductor la muestra).
- **Alerta de partidas** (`AlertaDePartidas.tsx`, arriba del extracto y en la Sala `/conciliacion`): P10, a los 30 días por
  defecto, rangos 0–30/31–60/más de 60; sin nada viejo no se pinta. Sin correos.
- **Planilla de caja** (`PlanillaDeCaja.tsx`): sólo con el efectivo PRENDIDO (apagado por defecto, «sólo transferencia y
  pasarela»); «Conciliar» manda el día y la línea.
- **Pagos de aseguradoras** (`RelacionDeAseguradora.tsx`): el archivo se lee aquí (`parseSpreadsheetFile`), la persona elige qué
  columna es cada campo (sugerido por nombre, recordado por aseguradora), `leerLaRelacion` aparta las filas malas (todo o
  nada) y el cruce trae la línea del banco propuesta; «Conciliar con N recibos» = `conciliarConRecibos`.
- **Configuración → Costos de la plata** (`ConciliacionCierreYEfectivo.tsx`): días de la alerta, el interruptor del efectivo y
  la cuenta contable (grupo 11) de cada cuenta bancaria.

## Conciliación, seguimiento 6 (ola E, E3; 03-10-2026)

- **«Conciliar las salidas seguras» con confirmación** (Nico, C2-SALIDAS Q3; `SalidasDelExtracto.tsx`): el diálogo pide
  `salidasDelExtractoApi.seguras()` y muestra cuántas, cuánto y cuáles; «Conciliar N salidas» manda ESA lista
  (`aplicarSeguras(vista)`). Sin seguras / sin migración / sin respuesta: lo dice y el botón queda apagado.
- **«Asentarlas»** (`CuentasDeLasDiferencias.tsx`): dice cuántas por asentar vienen de las salidas y los gastos del banco del
  extracto que se reconocen solos; con gastos, un diálogo con la lista y la casilla «También conciliar…» (marcada si la
  persona tiene `cobros:create`; si no, el porqué). `reprocesar(gastos | null)`.
- **El cajón del movimiento** (`LoQueProponeElAgente.tsx`, botón «Lo que propone el agente» en cada línea pendiente): lee
  `GET {micro}/…/movimientos/{id}/agente` SÓLO al abrir (`src/lib/api/agente-de-conciliacion.ts`); «Por el alias» con
  cuántas veces se confirmó, las salidas que propone (el gasto del banco se concilia por la ruta del back; un giro o egreso,
  en la fila), «No es esta» / «No es esta persona». 409 = agente apagado; 404 = micro sin la ruta.
- **Egresos elige la salida del extracto** (`ElegirLaSalidaDelExtracto.tsx`, API `src/lib/api/salidas-del-egreso.ts`): radios
  con búsqueda (pausa de 300 ms), primero lo que calza con el neto. Ya no se teclea el id.
- **Configuración → cuenta contable de cada cuenta bancaria**: ahí se asientan los recibos conciliados desde su extracto; si la
  cuenta es mayor o está inactiva, lo dice (`porQueNoAsientaLosRecibos`).
- ⚠ Las rutas nuevas del back (`salidas/seguras`, `egresos/:id/salidas-del-extracto`) no están en `rutas-del-back.json`
  todavía: las llaman archivos que el guardián no barre (no son `*.service.ts`); regenerarlo con el back de esta ola.

## Conciliación, pruebas en el navegador (PRUEBAS-CONCILIACION, 03-10-2026)

- **«Cruce sugerido» mide ~300 px aun en escritorio**: sus tarjetas (candidatos, pasarela, giro de Leasefy, salidas) van
  APILADAS, nunca en fila por el breakpoint de la ventana (guardián `cruce-sugerido-apilado.test.ts`).
- **PDF con jsPDF (Helvetica)**: el «−» tipográfico sale como basura y espacia la línea; el cierre pasa todo por
  `textoParaElPdf` (como `documento-de-la-liquidacion.ts`). El Excel y la pantalla conservan el «−».
- Nada de la clase `capitalize` en español (sube cada palabra): `conMayusculaInicial`. Las fechas en pantalla con `diaLegible`
  (planilla, relación, «Asentarlas»), y cada cifra con su número gramatical («Queda 1…», «1 cruzada», «te la propone»).
- La carga del extracto separa `descartadasPorMesCerrado` de las ilegibles; «idéntica a otra del archivo cuenta aparte» (no
  «entró»: en una recarga no entra nada). Huecos: «Falta el extracto del …».

## Conciliación, ARREGLOS-5 (03-10-2026, Nico Q2/Q4/Q6 a)

- **Un solo interruptor de efectivo**: «La inmobiliaria recibe efectivo» (`ConciliacionCierreYEfectivo.tsx`) y «Efectivo» de
  Medios de recibo (`SeccionMediosDeRecibo.tsx`) son el MISMO dato (lo guarda el back en los medios de recibo); los dos lo dicen.
  El de la conciliación se aprieta con `cobros:edit` + `configuracion:edit` y con `efectivoSePuedeGuardar(config)` (un back sin el
  campo: como antes, con `disponible`).
- **Recibo de más**: con recibos YA emitidos que suman exacto la línea (`yaLaRespaldanRecibosEmitidos`, `muchos-a-uno.ts`), la fila no
  ofrece las cuotas del 1:1 ni «Conciliar con un cliente»; dice por qué (`sin-uno-a-uno-<id>`).
- **«Calza exacto» es sólo el del lote** (referencia de recaudo + valor): en muchos a uno y en «Corregir» la suma dice «Suma exacta»;
  en el cajón del agente, «Valor exacto».
- La planilla y la tarjeta del giro de Leasefy dicen qué pasa en libros al conciliar; el aviso de la planilla, el día en palabras.

## /admin/recaudo-en-linea: el reporte de Wompi y las liquidaciones de Leasefy (ola E, E2; 03-10-2026)

Nico (C2-AGREGADOR Q3/Q4): Leasefy recauda en SU cuenta de Wompi y le gira a cada inmobiliaria con una liquidación.
Pantalla `src/app/admin/(panel)/recaudo-en-linea/` (ítem 35 del `Nav`), cliente `src/lib/admin/recaudo-en-linea.ts`
(back `src/admin/resources/recaudo-en-linea/`). Tres pestañas (`MotionIndicator` + `CrossFade`):
- **Liquidaciones**: filtros inmobiliaria / fecha del giro / estado (`generada | girada | conciliada`); cada una se abre
  (`Collapse`) con sus pagos y lo descontado TAL COMO VINO; «Descargar Excel/PDF» (`src/lib/admin/documento-de-la-liquidacion.ts`,
  `xlsx`/`jspdf` perezosos, sale del detalle del back; en el PDF el menos es «-»: Helvetica no trae «−»); «Marcar como
  girada» con confirmación, día (no futuro) y comprobante. **Generar liquidaciones** (`GenerarLiquidaciones.tsx`): rango +
  fecha del giro + «sólo lo que Wompi ya desembolsó» (marcado), vista previa por inmobiliaria con lo que queda FUERA y su
  frase; un descuento de Leasefy (concepto + valor, tal como viene) obliga a actualizar la vista previa antes de generar.
- 🔴 **«Frecuencia del giro: por definir»** se ve siempre arriba (`FRECUENCIA_POR_DEFINIR`); no se inventa una.
- **Reporte de Wompi**: el CSV (tope 10 MB, como el back) va a la vista previa; las frenadas se listan con su frase;
  «Importar N» manda sólo lo legible (idempotente).
- **Cuadre Wompi → Leasefy**: totales, tabla por desembolso y diferencias marcadas.
- Sin la migración del agregador lo dice y no pide nada más; sin la del giro, todo menos «girada».
- **Desmarcar «girada»** (ola E, E6 · Nico E2 Q2 a; `DesmarcarGirada` en `Liquidaciones.tsx`, `desmarcarGirada(id, motivo)`):
  sólo en una girada, con el motivo OBLIGATORIO (10 a 500, contador y botón apagado hasta entonces) y `Presence`; la
  liquidación vuelve a «generada». El detalle muestra la **historia del giro** (`historiaDelGiro`: marcada/desmarcada, quién,
  cuándo, el motivo y la fecha del giro antes → después). Sin la migración de la bitácora (`desmarcarDisponible: false`) lo
  dice; un back anterior (sin el campo) no lo ofrece.

## ARREGLOS-2 (03-10-2026, modo autónomo)

- **PQRS desde el portal del inquilino** (Nico Q4 a): `POST /pqrs` existe. `GET /pqrs/mine` trae
  `contratosParaRadicar`; `pqrsApi.listMineConDisponibilidad` devuelve `{ items, disponible, contratos }` y
  `useTenantPqrs` expone `contratos`. «Nueva solicitud» se prende con un contrato vigente; con más de uno,
  `NuevaSolicitudModal` pregunta sobre cuál (`#solicitud-contrato`, 400 `ELIGE_EL_CONTRATO` bajo ese campo). Las fotos
  siguen sin ruta (la PQRS no tiene adjuntos): el aviso de siempre.
- **El registro sólo se le pregunta a quien lo hizo**: `GET /users/me/onboarding/session` trae `esQuienLaRegistro`; con
  `false`, `preguntarPorElRegistro` no pide el resume del micro (era un 403 en cada pantalla del contador y la asesora).
- **«Mis propiedades» (`/panel/propiedades`) a 390 px**: esqueleto mientras carga (nunca el vacío ni contadores en 0),
  el error con reintento, el «+» solo en pantallas chicas y el filtro de estado se desplaza dentro de su riel.
- **El worker de MapLibre** (`public/maplibre/<versión>/`) lo copia el `postinstall`; un árbol con `node_modules` en
  symlink (worktrees, copias del laboratorio) no lo tiene y responde 404 también con `next build`. Correr
  `node scripts/copiar-trabajador-de-maplibre.mjs` en ese árbol.

## ARREGLOS-4 (03-10-2026, modo autónomo)

- **Al micro, SIEMPRE `agentFetch`** (Nico, PRUEBAS-RESTO Q1 a): con el micro caído y el back sano dice «El asistente
  de Leasefy no está disponible» (503 del servicio `asistente`) y reintenta una vez ante un token vencido. Guardián
  `src/lib/api/micro-por-agent-fetch.guardian.test.ts` (AST: ningún `fetch` crudo en un archivo que habla con el
  micro; excepciones declaradas con su porqué: ARCO y embudo públicos, `/admin`, `senales.ts`, `PermissionsContext`).
  Los hooks del Piloto guardan el error ENTERO (`error: unknown`), no su texto: la pantalla lo dice con
  `FalloDeCarga`/`mensajeParaLaPersona`; `piloto.ts` lanza el `ApiError` de `falloDelMicro`, no `Error('500')`.
- **`aria-invalid` pinta el borde** (Q2 a): `Input`, `Textarea` y `SelectTrigger` del adaptador ponen `data-invalid`
  con `aria-invalid` verdadero (`ui/campo-invalido.ts`). Un requerido VACÍO no lleva `aria-invalid` hasta que haya
  un error dicho; el guardián de `ui/campo-invalido.test.tsx` no deja `aria-invalid={vacio}` ni `{!valor}`.
- **El vacío dentro de una tabla ancha**: `<AlAnchoVisible>` (`ui/al-ancho-visible.tsx`) lo pega a la izquierda con el
  ancho VISIBLE del contenedor que se desplaza (a 390 px se cortaba en Documentos).
- El layout del panel pide `/inmobiliaria/config` sólo con `configuracion:view` y los lotes de migración sólo con
  `contratos:view` (`useInmobiliariaConfig(activo)`, `useMigracionesPendientes(activo)`).
- Un `route.ts` sólo exporta verbos y configuración del segmento (`src/app/rutas-solo-exportan-lo-de-next.test.ts`).
- «Completa tu perfil» de la barra del propietario y la tarjeta del perfil leen `lib/perfil/pasos-del-perfil-del-propietario.ts`.

## ARREGLOS-3 (03-10-2026, modo autónomo; Nico, PRUEBAS-PAGOS Q1–Q8 a)

- **Fotos y firmas del acta** (`FotosYFirmasDelActa.tsx`, montado en Documentos bajo `ActaEntregaViewer sinFirmas`; API
  `lib/api/firma-del-acta.service.ts`): fotos por espacio (subir/borrar, se vuelve a leer el detalle tras cada cambio), «Firmar
  como asesor» con `SignaturePad` y el enlace del inquilino (copiar; el correo sale del back). La página pública
  `/firmar/acta/[token]` (sin sesión) muestra el acta con sus fotos y firma con código al correo; 503
  `FIRMA_DEL_ACTA_NO_DISPONIBLE` = falta la migración del back.
- **Saldo a favor «en revisión»** (`SaldoAFavorAlTerminar.tsx`, `Egresos.tsx`): el egreso frenado no se marca para el lote y la
  devolución ofrece «Revisado» (`saldoAFavorApi.revisado`). La cuota `ANULADA` al terminar no ofrece «Anular recibo».
- **Portal: la inicial del acuerdo es la «Cuota 0 · inicial»** (`CuotaPlanTable`, «Pagar la cuota inicial» en `PagarCuota`; la
  ruta `wompi-session` acepta `cuotaNumber` 0 y firma `acuerdo-<plan>-c0`). El conteo de cuotas del listado no la cuenta.
- **Venta en un mandato de arriendo**: `sinComisionDeVentaPactada(vista)` (`lib/captacion/venta-del-inmueble.ts`) dice que hace
  falta un mandato de VENTA y cómo crearlo (`data-testid="venta-sin-comision"`).

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
