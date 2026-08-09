# Llamadas + auditoría de cableado del panel de Cobranza · 2026-08-09

**Ramas:** `fix/habeas-data-arco` (mvp, 23 commits) · `fix/arco-triage-status-constraint`
(agent-develop, 5 commits). **Nada pusheado.**

Continúa `SESSION-RESUME-2026-08-08-panel-cobranza.md` (la barrida que dejó el
menú en 14 pestañas). Esta sesión son cuatro pedidos de Nico, en orden:

1. «falta demasiada información de lo que podemos llevar de las llamadas, y
   todo cobranza está hecho sin nuestro DS Cadence»
2. «revisá que nada esté mockeado, que quede conectado todo, sé muy detallista»
3. «estas tablas deben tener paginación, y revisá que sea la misma forma de
   tabla que tenemos en contratos»
4. «ese rectángulo quedó raro; y que la transcripción y la reproducción
   funcionen, que nada en Llamadas esté mockeado»

---

## 1. Lo que faltaba en Llamadas no era UI: era el endpoint

`agent.calls.summary_json` guarda desde Phase 13 la salida del **CallSummarizer**
después de CADA llamada:

```
outcome (11 buckets) · paymentPromised {amountCop, dueDate, channel} ·
hardshipDetected · fraudFlags[] · nextActionRecommended · keyTopics[] ·
sentimentDeudor · transcriptDigest (≤300 chars, español, sin PII) ·
unresolvedObjection
```

**Ni la lista ni el detalle lo pedían.** La pantalla mostraba canal, duración y
un contador de alertas — nada que respondiera *qué pasó en la llamada*.

Ahora la columna principal de la tabla es el resultado + el digest, con la
promesa (monto y fecha) al lado; y el detalle tiene `CallSummaryPanel` con lo
accionable arriba (promesa, objeción sin resolver, fraude), después el relato,
al final lo descriptivo.

### Hay DOS vocabularios de resultado y no son intercambiables

| | quién escribe | qué significa |
|---|---|---|
| `calls.outcome` | `mapStateToOutcome` | estado terminal de la máquina — 7 buckets |
| `summary.outcome` | CallSummarizer | juicio sobre la conversación — 11 buckets |

Una llamada puede ser `completed` y a la vez `dispute`. `src/lib/cobranza/call-vocab.ts`
traduce ambos y **nunca pinta un slug crudo**.

### ⚠️ `agent.calls.outcome` NO tiene CHECK constraint

El comentario del `schema.prisma` dice que sí. Lo verifiqué contra
`pg_constraint`: **no existe**. Por eso una siembra con `contacted`/`promise`/
`refused` entró sin chistar y esos slugs quedaron visibles en inglés durante
semanas. El mapa de `call-vocab.ts` es la única defensa entre base y pantalla.
Agregar la CHECK es migración → decisión de Víctor.

---

## 2. Siete contratos inventados (van cinco de ayer + dos de hoy)

Todos con `tsc`, `lint` y `next build` en verde: un tipo inventado es
internamente coherente.

| # | pantalla | el front decía | el agente manda |
|---|---|---|---|
| 1-4 | Playbooks (×4 llamadas) | ver resume anterior | |
| 5 | Reporte diario · alertas | `{kpi,threshold,actual,severity}` | `{level,code,message_es,…}` |
| **6** | **Detalle de llamada** | `qa.{overall,tone,recovery,clarity}`, `durationSec`, `cost`, `debtorNameRedacted` | `qaDimensions.{rapport,compliance,resolution,sentiment}`, `durationSeconds`, `costBreakdown`, (no existe) |
| **7** | **Transcripción** | `id`, `startSec/endSec`, `complianceFlagIds`, `operador\|deudor\|bot` | `index`, `startedAt/endedAt`, `complianceFlags`, `operator\|agent\|customer` |

**El #6 crasheaba el 100% de las llamadas** («Algo salió mal en este
workspace»). Traía además dos errores que sobrevivían aunque el contrato
hubiera calzado: las notas de QA vienen **0-100** y el código comparaba contra
`0.8`/`0.6` y multiplicaba ×100 (toda llamada roja con cuatro cifras), y las
dimensiones «tono/recuperación/claridad» **no existen** — se inventaron junto
con el contrato.

**El #7 era invisible** porque `call_turns` estaba VACÍA: el componente nunca
llegaba a recorrer turnos. Apareció el día que sembré datos. Y traía una
consecuencia fea: como ningún token de hablante casaba, TODOS los turnos caían
al default y el panel **rotulaba como «deudor» lo que dijo el agente** — en la
pantalla que sirve de evidencia ante una queja.

---

## 3. El 401: la causa NO era la que estaba anotada

La nota vieja decía «bearer vacío por carrera del token». **Lo medí en el
navegador: el token iba completo y el endpoint respondía 200.**

La causa real: `src/lib/api/agent-fetch.ts` **ya existía** y reintenta una vez
con sesión fresca ante un 401 — y **sólo lo usaban 3 de 42 hooks**. Migrados
los 39 (106 call sites) + **13 archivos más** fuera de la carpeta de hooks: los
cuatro modales de intervención, los dos clientes de aprobación (cartas y
siniestros), el reproductor de audio y cinco pantallas. Ésos son los peores:
hacés clic en «Aprobar carta», falla, y no sabés si salió.

**Segundo bug, independiente:** sin guarda contra respuestas fuera de orden, el
fetch que falla llega último y pisa el `setError(null)` del que funcionó → el
banner rojo queda ARRIBA de datos buenos. Arreglado en `use-calls`;
**los demás hooks siguen sin la guarda.**

---

## 4. Auditoría de cableado — el método que sirvió

**Probar los endpoints contra el agente CORRIENDO, no grepear el código.** El
token vive en **cookies** (`@supabase/ssr`), no en localStorage:

```js
const cookies = document.cookie.split('; ').filter(c => /^sb-.*-auth-token/.test(c))
const dec = decodeURIComponent(cookies.sort().map(c => c.slice(c.indexOf('=')+1)).join(''))
const token = JSON.parse(dec.startsWith('base64-') ? atob(dec.slice(7)) : dec).access_token
```

**32 de 36 endpoints en 200.** Los cuatro restantes: `analytics/top-scripts`
(500, tabla vacía), `daily-report/subscription-stats` (404, manejado bien),
`/policies/impact` (404, y su hook no lo usa nadie), y uno que era falso
positivo del regex.

### El defecto caro: «Próximamente» sobre un endpoint que ya funciona

| Botón | El endpoint que ya existía |
|---|---|
| Inbox › **Responder** | `wa-send` — ya se usaba desde la ficha del deudor |
| Inbox › **Tomar control** | `pause` — ídem |
| Promesas › **Recordar / Hacer seguimiento / Recontactar** | `wa-send` |

Verificado de punta a punta: «Tomar control» escribió `cartera_paused_until` y
dejó su fila en el audit log con actor `user`.

**Quitados** por no tener nada detrás: «Aprobar respuesta sugerida» (el contrato
del inbox no tiene respuesta sugerida) y los cinco de Acuerdos
(`agreements/propose` calcula un borrador y no persiste: no hay qué aprobar).

### Datos inventados presentados como cartera propia

Reportes a propietarios pintaba **«Apartamento Laureles · Para: María González ·
18 días de mora · $2.450.000 · Pendiente aprobación»** cuando el backend
devolvía vacío. Había un aviso de «vista previa» arriba. **Nadie lee el aviso.**
Fixture borrado del archivo — esconderlo tras un flag lo dejaba apareciendo en
el parpadeo de carga.

> Un ejemplo con forma de dato ES un dato para quien lo mira.

**Cero operaciones que fingen éxito** en todo cobranza. Eso estaba limpio.

---

## 5. Tablas: paginación y forma canónica

**Ahora paginan** Llamadas, Cartas y Siniestros, con `TablePagination` del DS
(«Mostrando 1–10 de 24 · Filas 10/25/50 · ‹ 1 2 3 ›»). El pie sólo se monta si
hay más de una página.

**Ya paginaban** Pagos y Deudores (scroll infinito por cursor) y los tres de
Cumplimiento («Cargar más»). No se tocaron: para listas que crecen sin techo
del lado del servidor, el cursor es lo correcto. **Quedan tres mecánicas
conviviendo** — deliberado, no descuido. Unificarlas es decisión de UX.

`useTablePagination` sale de la mecánica que ya tenía a mano `arco/page.tsx`.
**El test agarró un bug mío**: dos efectos que se pisaban (al filtrar desde la
página 4, el reset ponía 1 y el reencuadre —leyendo el `page` viejo— lo mandaba
a 2). Se arregló **derivando** la página efectiva (`min(pedida, última)`) en vez
de corregirla con efectos.

**La forma.** Las tablas se armaban un contenedor propio con `neutral-*`,
`bg-white` y `divide-y` a mano. El `Table` del DS ya trae los hairlines y el
tinte de header adaptativo, así que esas clases duplicaban trabajo **y rompían
el modo oscuro** (barra blanca fija sobre fondo oscuro). Ahora todas usan `Card`
del DS + `overflow-x-auto`, igual que Habeas Data y Contratos; **26 archivos**
pasaron a tokens semánticos.

> ⚠️ `@/components/ui` **YA es Cadence** — son adaptadores finos sobre el DS.
> Contar imports engaña; lo que hay que auditar son los tokens.

---

## 6. Grabación y transcripción

- **Transcripción: funciona de verdad.** 138 turnos sembrados en `call_turns`
  → endpoint → panel → PDF. Verificado abriendo el PDF: 12 turnos con hora,
  nombre enmascarado `Gl•••ona` y pie de confidencialidad.
- **`hasTranscript` va por TURNOS, no por `transcript_url`** — el endpoint lee
  `call_turns`. Una URL sin turnos abría un panel vacío anunciando transcripción.
- **Grabación: no hay, y no la va a haber en demo.** El proxy de audio le pide
  el archivo a **Vapi por id de llamada**; las llamadas sembradas no existen
  ahí. Mi primera siembra les puso `recording_url='demo://…'` → la pantalla
  prometía audio y fallaba. Va **NULL**, y la pantalla dice que no hay
  grabación. Con llamadas reales de Vapi el audio aparece solo: el camino está
  entero.
- **El PDF exportaba «undefined»**: leía `debtorNameRedacted`, que el endpoint
  no manda. Ahora sale del detalle (ya enmascarado) y el minuto se calcula
  contra el primer turno.
- **El rectángulo raro**: el envoltorio sticky llevaba `bg-surface` + padding y
  el reproductor ya es una tarjeta redondeada → marco recto por detrás.

---

## Garantías reales (escritas en el esquema, no prometidas por la UI)

- `agent.audit_log` es **append-only por trigger** (Ley 1581 + SARLAFT): me
  rebotó el DELETE de mi propia fila de prueba.
- `insurance_claims_filed_requires_approval_check` — no se radica un siniestro
  sin firma humana.
- `legal_artifacts_approved_requires_approver_check` — lo mismo para cartas.

---

## Pendientes

1. **La guarda anti-respuestas-fuera-de-orden** sólo está en `use-calls`.
2. **`calls.outcome` sin CHECK constraint** (migración, decisión de Víctor).
3. **Acuerdos**: el siguiente paso real tras el borrador es
   `payment-plans/offer`, que **crea el plan y genera el link de cobro de
   Wompi**. No lo cableé: es decisión de producto, no de cableado.
4. `analytics/top-scripts` responde 500 (`JOIN agent.script_templates`, vacía).
5. `complianceFlags` viaja como slugs sueltos (sin severidad ni segundo del
   audio) y se muestran crudos — falta mapa.
6. **`payment_promises` tiene 45 filas y ninguna con `call_id`**: la promesa que
   extrae el resumen no se cruza con la registrada.
7. El inmueble no se puede mostrar en Cartas (`property_id` apunta al monolito).
8. Números de fase interna filtrados a la UI («Fase 37», `phase={36}`).
9. Cifras del agente que no cuadran: saldo con 0 días de mora, PKR 100% con
   morosidad 62%, 6/45 promesas con $0 recuperado.

---

## Siembras de demo (agencia `f1849975-2cdc-49a4-8983-ee5de56127f5`)

`pg` sólo existe en agent-develop → hay que correrlas DESDE ahí:

```bash
cp ~/rent/mvp/claudedocs/seed-X.mjs ~/rent/agent-develop/.seed.tmp.mjs
cd ~/rent/agent-develop && node .seed.tmp.mjs && rm .seed.tmp.mjs
```

| script | qué siembra | rollback |
|---|---|---|
| `seed-llamadas-demo.mjs` | 24 llamadas + 18 resúmenes + 138 turnos | `DELETE FROM agent.call_turns WHERE tenant_id='f18…'` |
| `seed-inbox-demo.mjs` | 7 hilos + 10 mensajes | `DELETE FROM agent.conversation_threads WHERE tenant_id='f18…'` |
| `seed-playbooks-demo.mjs` | (no corrido — Playbooks salió del panel) | — |

---

## Commits

**mvp** (`fix/habeas-data-arco`), 23 sobre `da0359b1` — los 10 de esta sesión:

```
74848033 fix(llamadas): transcripción, PDF y el marco cuadrado del reproductor
59d4c24b feat(cobranza): paginación y forma canónica de tabla en el panel
50531ea2 fix(cobranza): saca los datos inventados de Reportes a propietarios
99c081c8 feat(cobranza): Responder y Tomar control dejan de decir «Próximamente»
40bf8e6c fix(cobranza): las acciones que escriben también reintentan el 401
b85dbb29 chore(demo): siembra de llamadas con forma real
7b387d24 fix(llamadas): el detalle de una llamada estaba muerto — crasheaba siempre
db3e7175 feat(llamadas): la tabla dice qué pasó en la llamada, no sólo que hubo una
d5dd23f8 fix(cobranza): los hooks del agente reintentan el 401 en vez de clavarse
23b2e927 docs(cobranza): resume de la barrida del panel
```

**agent-develop** (`fix/arco-triage-status-constraint`), 5 sobre `4f307a26`:

```
b5f9666b fix(llamadas): hasTranscript se mide por turnos, no por transcript_url
779df7f4 feat(llamadas): el resumen de cada llamada sale del microservicio
e01b7fe0 feat(siniestros): la lista dice de quién, por cuánto y quién aprobó
fdd42296 feat(cartas): la lista de artefactos legales dice a quién va dirigida
b924f15d fix(templates): expone `body` y deja de tumbar wa-status con un 500
```

**Verde al cierre:** `tsc` limpio en los dos repos · **1.634 tests** del front ·
**1.567** del agente · `pnpm lint` sin errores nuevos · `next build` verde
(worktree aislado). Verificado en el navegador en claro y oscuro.
