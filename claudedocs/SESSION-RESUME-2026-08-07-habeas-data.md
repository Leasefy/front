# RESUME — Habeas Data (ARCO): la pantalla que se veía igual llena que vacía

**Fecha:** 2026-08-07 · **Repo:** `rent/mvp` rama **`fix/habeas-data-arco`**
**Continúa:** `SESSION-RESUME-2026-08-07-cobranza-local.md` (levantar el stack local)

> ⚠️ Commiteado, **nada pusheado**. El corte/PR lo decide Victor. Y hay un commit
> hermano en `~/rent/agent-develop` sin el cual «Tomar la solicitud» no funciona.
> Detalle al final, en «Estado en git».

---

## La lección de esta sesión

> **Una pantalla puede estar rota sin verse rota.**
>
> El front leía `data.requests`; el agente devuelve las solicitudes **agrupadas
> por tipo**. `undefined` no explota en React, así que la bandeja mostraba cero.
> Se veía **idéntica con 0 solicitudes que con 50**.
>
> Los botones de resolver y rechazar apuntaban a una ruta que no existe, y nadie
> miraba `res.ok`: el operador creía haber rechazado una solicitud mientras el
> plazo legal seguía corriendo.
>
> Y el corolario: **`tsc` y `lint` en verde no dicen nada de la pantalla.**
> Pasaron limpios con las clases muertas, con el 404, con la pantalla en blanco
> por hidratación. Todo lo grave apareció mirando el navegador.

---

## 1. Qué es esta pantalla

Habeas Data (Ley 1581 de 2012): las personas cuyos datos trata la inmobiliaria
piden **A**cceso, **R**ectificación, **C**ancelación u **O**posición. Hay un
formulario público, la persona confirma por correo, y la solicitud cae en esta
bandeja con un término legal en días hábiles. Responder tarde es incumplimiento
sancionable por la SIC.

El circuito ya existía completo en el agente (`arco-public.ts` + `agency-arco-requests.ts`).
Lo que estaba roto era el front.

## 2. Los tres contratos rotos

| Dónde | Esperaba | Devuelve |
|---|---|---|
| Bandeja | `{ requests, kpis }` | `{ acceso, rectificacion, cancelacion, oposicion }`, cada fila con `sla_remaining_days` |
| Detalle | `{ request, timeline }` | objeto **plano**; `timeline` de `{event, at}` (no `{status, timestamp}`) |
| Resolver / rechazar | `/cobranza/arco-requests/:id/…` | `/arco/requests/:id/…` → **404 silencioso** |

Además el payload de resolver no validaba en ningún caso: mandaba `url` donde el
back espera `presigned_url`, `affected_rows` como texto donde espera número, y
nunca mandaba `fields_modified`, que es obligatorio.

**Verificado el arreglo de punta a punta:** rechacé una solicitud desde la UI y
la fila quedó `status: rejected` + `resolved_at` + el motivo en
`resolution_payload`. Antes ese mismo clic no hacía nada.

## 3. i18n: 31 claves que no resolvían

La bandeja pedía `kpi.*`/`tab.*` y el JSON tenía `kpis.*`/`tabs.*`; la tabla
pedía `table.type/requester/status` y el JSON tenía `table.tipo/nombre/estado`.
`common.refresh` y `common.retry` no existían. **El detalle estaba peor: 19 de
28.** El timeline traducía eventos con el vocabulario de *estados*, que es otro.

## 4. El número inventado

`SLA_BUSINESS_DAYS = { acceso: 15, reclamo: 10 }` era una constante del front que
duplicaba una del agente. No era un mock, pero la pantalla presentaba como hecho
legal un número que nadie verificó contra el sistema.

Ahora **se despeja del dato real**: `plazo = días_restantes + hábiles_transcurridos`,
replicando el algoritmo del agente. Se toma la moda entre las filas del grupo
(una fila calculada del otro lado de la medianoche queda corrida en uno). Sin
solicitudes de ese grupo → **no muestra número**.

⚠️ **PENDIENTE JURÍDICO.** El sistema aplica acceso=15, reclamos=10. La Ley 1581
parece repartirlos al revés (Art. 14 consultas = 10, Art. 15 reclamos = 15). No
hay fuente citada en la research de la fase. Si es al revés, el error va hacia
el lado peligroso: la inmobiliaria creería tener 15 días para un acceso cuando
tiene 10, y la pantalla diría «en plazo» ya incumplida.

## 5. El design system — lo que estaba a mano

Nueve piezas replicaban a ojo lo que Cadence ya resuelve:

`StatusBadge` (los dos badges) · `KpiCard` · `Banner` (banda de atención y el
bloque de la campana) · `Callout` (cabecera) · `Eyebrow`/`MonoLabel` ·
`Timeline` (detalle) · `KeyValueList` (ficha) · `Card` (4 contenedores) ·
`BackButton` (era un `<Link>` con una flecha `←` tipeada).

**Trampa que dejó la pantalla en blanco:** `Banner` pinta sus children dentro de
un `<p>`. Meterle un `<div>` es HTML inválido → error de hidratación → no monta.
`tsc` y `lint` limpios. Usar `<span>`.

**`DESIGN.md` documentaba tokens que NO existen** — seguí el doc al pie y
generé clases muertas. El vocabulario real es `-soft` (`bg-danger-soft` +
`text-danger`). **Corregido**, junto con `COLOR_SYSTEM.md`: ver §11.

**Tailwind no puede aplicar opacidad a los tokens de Cadence**: resuelven a
`var(--danger-soft)` con un color literal, así que `bg-danger-soft/70` **no se
genera** — hover muerto. Usar `hover:opacity-*`.

## 6. Lo demás que se hizo

- **Auto-actualización que no muere.** Polling a 60 s ya existía, pero
  `agent-auth` no reintentaba el 401: al vencer el token quedaba clavada hasta
  recargar. Nuevo `agentFetch` refresca la sesión y reintenta una vez.
- **Notificaciones.** Los plazos ARCO van **fijos arriba de la campana**, fuera
  de las pestañas leído/sin leer — un plazo legal no es una notificación que se
  marca como leída; sigue corriendo aunque la hayas visto. El punto de la
  campana se pone rojo con vencidas. Gateado: fuera del panel de inmobiliaria o
  sin permiso de cobranza no dispara ni un fetch.
- **Paginación** (`TablePagination` del DS). La página efectiva se acota al
  renderizar: cubre el cambio de pestaña **y** que el polling achique la lista
  sin que el usuario toque nada.
- **La cédula mostraba el SHA-256 completo** (64 chars). Solo existe hasheada,
  así que se muestra `REF. 12635A`, etiquetada como referencia — no un
  enmascarado que fingiría ser la cédula.
- **«Equipo IA» oculto** en los 4 workspaces (`agentWorkspaceNav.ts`), a pedido
  de Nico. Comentado, no borrado; las páginas siguen existiendo.

## 7. La prueba

Comparé pantalla contra **base de datos** (no contra el endpoint):

- **Bandeja**: KPIs 3/5/2/2 idénticos · total 12 · las 10 filas de la página 1 en
  el mismo orden calculado · cada badge de plazo coincide (`-8 → «Vencida hace
  8 d»`, `0 → «Vence hoy»`, «Sin correr» para las no confirmadas).
- **Detalle**: nombre, referencia, correo, tipo, descripción, fechas y plazo,
  todos idénticos. El timeline muestra sólo los 2 eventos que existen.
- **Plazos derivados**: dieron 15 y 10 — lo que el back aplica.

## 8. Datos de demo

12 solicitudes sembradas en la agencia `f1849975-…`, marcadas con
`@demo.leasefy.co`. No se pudo usar el formulario público: resuelve la
inmobiliaria por el header `Host` y `localhost:4100` no mapea.

Script: `scratchpad/seed-arco-demo.mjs`.
Rollback: `DELETE FROM agent.arco_requests WHERE requester_email LIKE '%@demo.leasefy.co';`

⚠️ La tabla **rechaza `pending_counsel_review`** (constraint). Ese valor es un
flag de la respuesta 503 del gate de asesor, no un estado. El front lo tipaba
como estado; **quitado** del tipo, del mapa de tonos y de los dos JSON de i18n.

## 9. Cierre — el hueco funcional y el bug del agente

**«Tomar la solicitud» no existía.** `POST /arco/requests/:id/triage` estaba en
el agente desde la fase 36 y ninguna pantalla lo llamaba: una solicitud se
quedaba en «por revisar» hasta que alguien la resolvía o la rechazaba, así que
dos personas del equipo no tenían cómo saber si la otra ya la había agarrado.

Al cablearlo apareció que **el endpoint nunca pudo funcionar**: escribía
`status: 'in_review'`, valor que el CHECK de la tabla no admite (sólo
`pending_email_verification`, `pending_admin_triage`, `in_progress`, `resolved`,
`rejected`). Toda llamada real reventaba con violación de constraint.

Sobrevivió porque **los tests mockean Prisma y afirman sobre el row que ellos
mismos arman**, no sobre lo que se le pasa al `UPDATE`. Se agregó un guard que
compara el status escrito contra la lista literal del CHECK; con `in_review`
falla, con `in_progress` pasa. (Comprobado: revertí el fix y el test viejo
siguió en verde, el nuevo se puso rojo.)

**El estado tampoco se veía al abrir una solicitud** — había que deducirlo del
último evento del timeline. Ahora va al lado del título.

## 10. La ficha del solicitante

`KeyValueList` es el primitivo de **resumen financiero** del DS: etiqueta que se
trunca, valor a la derecha en mono con `shrink-0`. Se le habían metido el
nombre, el correo y una descripción de **hasta 2.000 caracteres**
(`arco-public.ts:167`): salían en mono —que en el DS significa «dato técnico»— y
el texto se desbordaba fuera de la tarjeta.

Ahora el texto libre está afuera: identidad en prosa arriba, descripción abajo
en su propio pozo (`bg-surface-muted`, que hace que el recorte se lea como
«hay más» en vez de como una línea partida). En el `KeyValueList` quedan sólo
los cuatro pares que sí son datos cortos.

De paso: **Cadence remapea toda la escala de radios** — acá `rounded-lg` son
22px, no los 8px de Tailwind. Para un pozo va `rounded-sm`.

## 11. Los docs de diseño

`DESIGN.md` y `COLOR_SYSTEM.md` documentaban tokens que **no existen**:
`bg-surface-raised`, `bg-surface-sunken`, `bg-surface-brand`,
`text-fg-secondary`, `border-border-subtle`, `text-on-primary`, `text-link`,
`bg-error-bg`, `.text-eyebrow`, `.text-title`. Los valores hex sí eran
correctos; lo viejo eran los nombres. Corregidos los dos.

Tres cosas que cuestan caro y quedaron anotadas ahí:
- **`text-fg-muted` existe en los dos vocabularios con valores distintos.** Acá
  es el gris más fuerte; el más tenue es `text-fg-subtle`.
- **`bg-surface` no es el fondo de página**, es la superficie elevada (blanca).
  El fondo del panel es `bg-bg`.
- Los hex de los estados también estaban corridos (`#3F8A53` → `#307E57`, etc.).

**Cómo verificar un token** (ni grep ni el navegador sirven — el uso cero no
prueba nada, y Tailwind sólo emite las clases que encuentra en el código, así
que una clase válida sin usar se ve igual que una inexistente): preguntarle al
preset, `require('@leasefy/cadence/tailwind-preset')`. El snippet está en
`DESIGN.md` §2.

---

## Estado en git

**`rent/mvp`** — rama `fix/habeas-data-arco` (de `develop`), 2 commits:
- `15624b5a` novedades: una sola por sección (trabajo previo, va aparte)
- `ef510abb` el arreglo de Habeas Data + los dos docs

**`~/rent/agent-develop`** — rama `fix/arco-triage-status-constraint`, 1 commit:
- `64dca1ef` triage escribía un status que la tabla rechaza

⚠️ Nada pusheado, en ninguno de los dos. **El front necesita el fix del agente**
para que «Tomar la solicitud» funcione.

Sin commitear a propósito: `dump.rdb` (volcado de Redis, ahora en `.gitignore`)
y los resumes de otras sesiones en `claudedocs/`.

---

## Pendientes

1. **Confirmar los plazos con asesor jurídico** (§4) — el único con consecuencia
   legal, y el único que no puedo cerrar yo.
2. **Pushear** las dos ramas (decisión de Victor).
3. `POST /triage` acepta `notes` (`max 1000`) y **los descarta**: el handler no
   los guarda en ninguna columna. Hoy es inocuo porque el front no los manda.
4. Heredados de la sesión anterior: 11 migraciones dev, `buildDailyReport` con
   `$transaction` sin `timeout`, `toAmount()` que pierde `1.850.000`.

## Archivos

**Nuevos:** `lib/api/agent-fetch.ts` · `lib/hooks/cobranza/use-arco-alerts.ts` ·
`components/inmobiliaria/cobranza/ArcoDeadlineAlert.tsx` ·
`lib/hooks/cobranza/__tests__/use-arco-requests.test.ts` (20 tests)

**Tocados:** las 2 páginas de `ai/cobranza/arco/` · `use-arco-requests.ts` ·
`use-arco-detail.ts` · `ArcoStatusBadge` · `SlaCountdownBadge` · `PlanHeader` ·
`agentWorkspaceNav.ts` · `es.json`/`en.json` · `docs/DESIGN.md` ·
`docs/COLOR_SYSTEM.md` · `.gitignore`

**En el agente:** `agency-arco-requests.ts` + su test.

`tsc` limpio · **1.599 tests verdes** (front, Node 20) · 7 verdes en el test del
agente · lint sin errores nuevos · **`next build` verde**, corrido en un worktree
aparte para no tumbar el dev server de :3001.

⚠️ Con Node 25 fallan 103 tests del front (happy-dom/localStorage). Node 20.
