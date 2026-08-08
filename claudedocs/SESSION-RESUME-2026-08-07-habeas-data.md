# RESUME — Habeas Data (ARCO): la pantalla que se veía igual llena que vacía

**Fecha:** 2026-08-07 · **Repo:** `rent/mvp` rama **`develop`**
**Continúa:** `SESSION-RESUME-2026-08-07-cobranza-local.md` (levantar el stack local)

> ⚠️ Nada commiteado, nada pusheado. El corte/PR lo decide Victor.

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

**`DESIGN.md` documenta tokens que NO existen** en el config resuelto de este
repo: `bg-error-bg`, `text-warning-fg`, `bg-surface-raised`, `bg-surface-sunken`.
El vocabulario real es `-soft` (`bg-danger-soft` + `text-danger`). Seguí el doc y
generé clases muertas. Ver [[reference-cadence-token-vocab]].

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
flag de la respuesta 503 del gate de asesor, no un estado — el front lo tipa mal
como estado y nunca puede llegarle.

---

## Pendientes

1. **Confirmar los plazos con asesor jurídico** (§4) — el único con consecuencia legal.
2. **Commitear**: 15 modificados + 4 nuevos, nada en git.
3. Corregir `DESIGN.md` §2: documenta tokens inexistentes (§5).
4. `pending_counsel_review`: estado fantasma en el tipo del front.
5. Heredados de la sesión anterior: 11 migraciones dev, `buildDailyReport` con
   `$transaction` sin `timeout`, `toAmount()` que pierde `1.850.000`.

## Archivos

**Nuevos:** `lib/api/agent-fetch.ts` · `lib/hooks/cobranza/use-arco-alerts.ts` ·
`components/inmobiliaria/cobranza/ArcoDeadlineAlert.tsx` ·
`lib/hooks/cobranza/__tests__/use-arco-requests.test.ts` (20 tests)

**Tocados:** las 2 páginas de `ai/cobranza/arco/` · `use-arco-requests.ts` ·
`use-arco-detail.ts` · `ArcoStatusBadge` · `SlaCountdownBadge` · `PlanHeader` ·
`agentWorkspaceNav.ts` · `es.json`/`en.json`

`tsc` limpio · **1.599 tests verdes** · lint sin errores nuevos · `next build` verde.
