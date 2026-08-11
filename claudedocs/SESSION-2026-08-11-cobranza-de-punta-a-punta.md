# Cobranza de punta a punta: la cadencia que no llamaba, el CSV sin fecha, y cinco cosas que la pantalla afirmaba en falso

**2026-08-10/11.** Continúa `SESSION-2026-08-11-cobranza-mora-y-a11y.md`.

**Ocho PRs mergeados. Dos abiertos** (agent#89 + front#76, el par de trazabilidad).

| repo | PR | qué |
|---|---|---|
| agent | #88 | la cadencia no llamaba a NADIE + lector de fecha del CSV |
| back | #22 | el cron reporta altas al embudo |
| back | #23 | **primer CI del back** + `.gitignore` de secretos + 12 errores de tipos |
| front | #73 | `.gitignore` de secretos |
| back | #24 | el pipeline de ops era 65% ruido |
| front | #74 | pro-plus/ultra se mostraban como STARTER |
| front | #75 | la ficha de un caso no tenía cómo volver |
| agent | **#89** · front **#76** | trazabilidad: quién hizo cada acción — **abiertos, verdes** |

---

## 1. La cadencia no contactaba a nadie, en ningún tenant

Auditando la ingesta de mora aparecieron **tres cortes encadenados**. Cada uno
bastaba solo, y los tres se veían igual desde afuera: silencio, sin un error.

**El SELECT de candidatos pedía dos columnas inexistentes** —
`dd.first_overdue_at` (nunca existió) y `dd.fiador_cedula` (vive en
`agent.debtors`). Postgres respondía 42703, y el `catch { return [] }` lo leía
como «la vista no está migrada»: cero candidatos, todas las noches, para todos
los tenants.

Ninguna prueba lo vio: **todas inyectan filas por `prismaOverride` y nunca
ejecutan ese SQL contra Postgres**, que es lo único que corre en producción.

**La ingesta no daba de alta en el embudo.** `agent.debtor_states` es el
padrón: cadencia y panel hacen JOIN INTERNO contra esa tabla. Sin fila, el
deudor no se llama Y no se ve. Ningún camino de producción la creaba.

**La etapa de entrada.** `computeStageTransition` avanza de a una etapa por
corrida, así que sembrar todo en S0 daría tres noches de trato equivocado a
alguien con 40 días. Nueva `stageForDelinquencyDays`, con **tope en S3** — S4
exige póliza, S5 dispara restitución, y eso no lo infiere una ingesta.

Verificado: el orquestador pasó de `[]` a 5 candidatos, uno con llamada
planificada real.

## 2. El CSV no tenía dónde poner la fecha

Sin vencimiento no hay mora, y sin mora no arranca nada. `fecha-vencimiento.ts`
detecta la columna venga como venga y lee ISO, `05/07/2026`, `20260705`,
`15 de julio de 2026`, seriales de Excel.

**El problema real es `03/04/2026`.** Colombia escribe DD/MM; un Excel en
inglés exporta MM/DD sin avisar. Adivinar por fila es lo peor: unas salen bien
y otras corridas un mes, sin forma de notarlo. Se mira **la columna entera**:
un 13..31 en primera posición prueba DD/MM. Las dos evidencias juntas ⇒ archivo
mezclado ⇒ **se rechaza entero**. Ninguna ⇒ se asume DD/MM y **se avisa en
pantalla**.

Falla siempre hacia «no sé»: `31/02` no se desborda a marzo, y **años < 2000 se
rechazan** — la red que atrapa el serial de Excel leído como año, que daría
1900 y ~46.000 días de mora.

**De paso: la cadencia iba un día adelantada.** `first_overdue_at` es una
columna `date` y Prisma la devuelve en medianoche UTC; el código la pasaba por
`dayBucketBogota`, que la corre al día anterior. Invisible porque **todos los
fixtures usan `T05:00:00.000Z`** — la única representación con la que el
defecto no aparece.

## 3. El patrón que se repitió cinco veces

Casi todo lo demás de la sesión fue la misma forma: **la pantalla afirmaba algo
falso sobre identidad o ubicación.**

| dónde | qué afirmaba | la verdad |
|---|---|---|
| pipeline de ops | «21 agencias necesitan atención» | 11 estaban sanas |
| tarjetas de plan | «STARTER · 999.000» | era Ultra |
| tres tarjetas | «SELECCIONADO» | las tres tenían `id: 'starter'` |
| breadcrumb | «estás en Casos» | estabas en un caso |
| historial | «user» | era un OWNER con nombre y email |

**El pipeline de ops** marcaba con `invitationSentAt IS NULL`. Buena señal
hasta que REQ-1130 suprimió el correo síncrono: desde entonces ese campo queda
nulo en toda agencia sana. 17 de 18, y 11 de esas perfectas. *Una alerta que se
dispara siempre entrena a ignorarla* — y por eso 6 inmobiliarias pasaron un mes
invisibles.

**Los planes**: `?? AGENCY_PLANS[0]` convertía cualquier tier desconocido en
Starter entero —nombre, features e `id`— dejando solo el precio del back. Las
features del plan gratis a 999.000.

**La ficha sin salida**: el breadcrumb pintaba la pestaña como página actual
(texto plano) y `WorkspaceNav` le ponía `aria-current="page"` por match de
prefijo. El único control que servía se leía como «ya estás acá».

## 4. El back tenía cero CI

Y se notaba: `tsc --noEmit` acumulaba **12 errores** en `.spec.ts` con 1605
pruebas en verde, porque **`ts-jest` transpila sin chequear tipos**. Los 12 se
arreglaron antes de mergear; ninguno era ruido (uno dejaba pasar un permiso mal
escrito). Tres jobs: Typecheck / Build / Unit Tests.

Y los dos `.gitignore` pasaron a denegar por defecto: había un
`.env.bak-claude` con credenciales de Supabase sin ignorar. Revisada la
historia completa de los dos repos: **nada que purgar**.

---

## Estado operativo

**`hola+inmobiliaria3@leasefy.co`** (victor inmobiliaria3, `f1849975`) quedó en
**FLEX, ACTIVE**, postpago, sin cobro inicial. No estaba en un plan chico: **no
tenía ninguna fila de suscripción**, y el candado del back es pago-vs-gratis.

**Las 6 agencias varadas** tienen sesión de onboarding viva **hasta el 18 de
agosto**, creadas por la ruta ancla (`existingTenantId` + `startedByUserId`),
que **suprime el correo** — verificado `emailSent: false` en las seis. Falta un
clic humano por agencia: la membresía nace al completar el wizard, y ese paso
exige aceptar los términos. Eso no se puede firmar por ellos.

---

## Lo que queda, y por qué no lo decidí yo

**El contrato del front está desfasado.** 202 rutas contra 200 del agente:
sobran `habeas-data/confirm` y `presign-url` —que el agente ya no tiene y **el
front todavía llama**— y falta `accept-terms`. Hay llamadas muertas y el
contrato las tapa. Merece su propio PR.

**Pro Plus y Ultra**: ¿son productos reales? Hay **1 agencia suscrita a
`ultra`**, así que apagarlos no es gratis. Se hace con `is_active = false`.

**Reintento de onboarding abandonado**: a los 7 días se borra la sesión y no
queda nada que reintente. Cuánto insistir es decisión de producto.

**`contractNumber` y `ciudad`** siguen sin fuente en el agente: la carta de Ley
1266 muestra «s/d» y «Bogotá D.C.».

**Un deudor ingresado con mora más vieja que el último offset de su etapa**
espera al offset siguiente. Con 60 días entra a S3 (offset 50, ya pasado) y no
recibe contacto hasta los 90, cuando pasa a S5 y el agente se vuelve pasivo.

**El front tiene Pro en 149.000 hardcodeado** y la base dice 349.000. Gana la
base, así que en pantalla se ve bien, pero la constante está vieja.

---

## Entorno

`:3005` front develop · `:3010` back · `:4200` agente develop (worktree
`~/rent/agent-terms`). `:3001` y `:4100` son de Nico.

⚠️ El `.env` del back apunta a **`:4100`**, que no tiene la ruta de mora-sync.
Para probar el cron localmente hay que apuntarlo a `:4200`.

⚠️ `RESEND_API_KEY` está puesto en dev: `resendInvitation` **manda correos de
verdad**. La ruta ancla no.
