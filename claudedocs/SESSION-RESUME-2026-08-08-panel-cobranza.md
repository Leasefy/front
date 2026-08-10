# Panel de Cobranza — barrida de pantallas · 2026-08-08

**Ramas:** `fix/habeas-data-arco` (mvp) · `fix/arco-triage-status-constraint` (agent-develop).
**Nada pusheado.** 13 commits en mvp, 3 en el agente (encima de los de Habeas Data).

---

## La idea que ordenó todo

Nico fue recorriendo el menú de Cobranza pantalla por pantalla y preguntando lo
mismo cada vez: *«esto qué es, y qué muestra cuando tiene información»*. De ahí
salieron dos decisiones de producto suyas, y el resto es consecuencia:

> **«El agente lo mejoramos nosotros y colocamos qué dice y qué no dice. Lo único
> que puede editar los usuarios son los acuerdos que puede usar el agente.»**

> **«Que resumen tenga todo, y quitamos esta sección.»**

**El menú pasó de 19 pestañas a 14.** Ninguna pantalla se borró: las cuatro rutas
siguen existiendo y cada una tiene su nota al pie en `agentWorkspaceNav.ts`
explicando qué pasó y cómo revertirlo.

| Salió | Por qué | A dónde fue |
|---|---|---|
| Playbooks | qué dice el agente no es perilla de la inmobiliaria | — (los acuerdos ya estaban en Configuración §Negociación) |
| Resultados | hacía el mismo trabajo que el Resumen | «Cómo va el agente» |
| Analítica | ídem; 3 de sus 5 widgets servían | «Cómo lo está logrando» |
| Reporte diario | ídem | «Qué mirar hoy» + Configuración §Reporte diario |

El Resumen quedó con esta lectura de arriba abajo:
**qué atender hoy → cómo va → cómo lo está logrando → la cartera por etapa.**

---

## Lo que se rompió, y el patrón

Cinco defectos de la misma familia: **un contrato transcrito a mano teniendo los
tipos generados al lado** (`src/lib/api/generated/agent.ts`, `pnpm api:gen`).

### 1. Playbooks reventaba con un 200 OK

El hook declaraba `{ templates: [...] }` en camelCase; el agente manda un **array
pelado en snake_case**. `data.templates` → `undefined` → `.length` → toda la
sección al error boundary. Las **cuatro** llamadas de la pantalla estaban en
contratos distintos:

| llamada | el front | el agente |
|---|---|---|
| GET lista | `{templates}`, camelCase, `status` | array, snake_case, sin `status` |
| PUT draft | `{ bodyDraft }` | valida `{ body }` → **400 siempre** |
| POST publish | `{ status }` | la plantilla completa |
| GET wa-status | `{ waSubmissionStatus, … }` | `{ status, rejection_reason }` |

Los tests mockeaban el hook con la forma deseada → verdes sobre una pantalla
rota. Ahora los fixtures se arman con la forma del agente y pasan por
`normalizeTemplate`, así el fixture deja de compilar si el contrato cambia.

### 2. El banner del reporte decía `: undefined (umbral 12)`

Tipo escrito a mano como `{kpi, threshold, actual, severity}`; el real es
`{level, code, message_es, current, threshold}`. De cuatro campos acertaba uno.
Y **el agente ya mandaba `message_es` redactado** —«Índice de morosidad en 62.22%
— por encima del umbral 12%»— que la pantalla tiraba para armar la suya. Encima
`severity` nunca casaba con `level`: una alerta CRITICAL se pintaba de amarillo.

### 3. La mora que subía se anunciaba como caída

`moraReducedPct` positivo = la mora BAJÓ. Con **−62,2** la tarjeta decía
«Mora reducida · Caída del índice de morosidad» con flecha hacia abajo. O sea
que anunciaba como buena noticia una subida de 62 puntos.

### 4. Grilla de KPI con el guión quemado

`CobranzaExecKpiGrid`: 8 tarjetas, **5 con `value: DASH` literal**. No eran
métricas sin datos — eran métricas sin fuente posible. Borrado.

### 5. Siniestros: error y «no hay» al mismo tiempo

401 en rojo Y debajo «Sin siniestros con el filtro seleccionado». Con la carga
fallida no se sabe cuántos hay; afirmarlo tranquiliza justo cuando no se debe.

---

## Tablas que obligaban a adivinar

Cartas y Siniestros mostraban tipo/aseguradora, estado y fechas — **nada sobre a
quién**. Y las dos pantallas existen para *revisar antes de aprobar*: aprobar es
lo que manda la carta o radica el reclamo.

Se agregó al agente (dos consultas, no `include`: ninguno de los dos modelos
declara relación con `Debtor`; corren dentro del mismo `withTenantScope`):

- **Cartas** → `debtorName`, `debtorDocument`.
- **Siniestros** → `debtorName`, `debtorDocument`, `outstandingCop`,
  `delinquencyDays` (de `v_debtor_delinquency`, **la misma fuente que el reporte
  diario** para que el panel no muestre dos cifras de lo mismo) y
  `approvedByEmail` (contra `agency_members`, en vez del UUID recortado).

Enums crudos que se veían en pantalla: `servicio_472` / `email_only` →
«Correo certificado (4-72)» / «Solo correo electrónico». En una prejurídica el
método de envío no es un detalle técnico: es la prueba de notificación.

---

## Garantías que sí están, escritas en el esquema

Vale reconocerlas porque son reales, no promesas de UI:

- `insurance_claims_filed_requires_approval_check` — no se puede radicar un
  siniestro sin `approved_by_human_user_id`. La IA arma el paquete; no lo
  presenta sola.
- `legal_artifacts_approved_requires_approver_check` — lo mismo para las cartas.

Ambas rebotaron mis primeras siembras. Es la mejor señal posible.

---

## Pendientes (ninguno es refactor)

1. **El 401 es una carrera y es sistémica.** `agent-auth.ts:18` hace
   `Bearer ${getAccessToken() ?? ''}`: un hook que dispara antes de que el token
   esté en memoria manda un bearer vacío. Le pasa a **toda** pantalla que llame
   al agente, y explica por qué a veces Cobranza desaparece del sidebar. El
   arreglo (que los hooks esperen la sesión) toca muchas pantallas.
2. **El inmueble no se puede mostrar en Cartas.** `agent.debtors.property_id`
   apunta a una tabla que no vive en el esquema `agent` (está en el monolito) y
   es NULL en las 45 filas demo. La única columna de dirección del esquema es
   `sent_to_address`, que es a dónde se despachó la carta. Traerlo exige que el
   agente le pregunte al monolito.
3. **`top-scripts` responde 500**, y su SQL hace `JOIN agent.script_templates`,
   tabla vacía que nada llena. Ya no se ve (Analítica salió del nav) pero sigue.
4. **Saldo con 0 días de mora.** `v_debtor_delinquency` devuelve
   `delinquency_days = 0` con `outstanding_cop = 2.450.000`. O mide desde otra
   fecha, o esos deudores no están vencidos. Es matemática del agente.
5. **PKR 100% junto a morosidad 62,2%** con cero pagos hoy. Ventanas distintas
   (7 días vs hoy), pero no se sostiene solo.
6. **`6/45 promesas cumplidas` con `$0 recuperado` y `0 gestionados`** — del
   agregado `/cobranza/recovery`.
7. **Números de fase interna filtrados a la UI**: «Fase 37» en el vacío de
   Analítica, `phase={36}` en Playbooks.
8. **`restitution_filing_packet`** es un tercer `kind` que la base admite y el
   front no conoce: mostraría el slug crudo.

---

## Siembras de demo en la base de dev

Se sembró para poder VER las pantallas. Todo en la agencia
`f1849975-2cdc-49a4-8983-ee5de56127f5`:

| tabla | qué | rollback |
|---|---|---|
| `calls` | 24 llamadas (abren la compuerta de analítica) | `DELETE FROM agent.calls WHERE tenant_id='f18…'` |
| `debtor_memos` | 9 con objeciones | `DELETE FROM agent.debtor_memos WHERE tenant_id='f18…'` |
| `insurance_claims` | 6, los cinco estados | `DELETE FROM agent.insurance_claims WHERE tenant_id='f18…'` |
| `legal_artifacts` | 7, dos tipos × cuatro estados | `DELETE FROM agent.legal_artifacts WHERE tenant_id='f18…'` |

`script_templates` y `script_objection_handlers` quedaron **vacías a propósito**
(Playbooks salió del panel). El script está versionado en
`claudedocs/seed-playbooks-demo.mjs` por si hace falta.

---

## Commits

**mvp** (`fix/habeas-data-arco`), 13 encima de `da0359b1`:

```
c165fa6c feat(siniestros): la tabla ya no obliga a adivinar de quién es el reclamo
f1b58289 feat(cartas): la tabla muestra el deudor — antes había que adivinar
ad37dbfe fix(cartas): el método de envío se mostraba con el valor crudo de la base
4650a4a5 feat(cobranza): los siniestros por aprobar avisan en el Resumen
e51edbe8 feat(cobranza): Reporte diario sale del menú; su config va a Configuración
7bec6508 fix(siniestros): con la carga fallida no se puede decir «no hay siniestros»
d1f7777b feat(cobranza): el reporte diario sube al Resumen — y dejó de decir «undefined»
b6c30a65 feat(cobranza): Analítica se fusiona en el Resumen; 2 de sus 5 widgets no suben
c722802f feat(cobranza): Resultados se fusiona en el Resumen y muere la grilla falsa
125abb43 fix(resultados): la mora que subía se anunciaba como una caída
b3e72626 feat(cobranza): saca Playbooks del panel
ea4502ce chore(playbooks): la siembra de demo cubre también los manejadores de objeción
4fe60c3a fix(playbooks): la pantalla reventaba con un 200 perfectamente válido
```

**agent-develop** (`fix/arco-triage-status-constraint`), 3 encima de `4f307a26`:

```
e01b7fe0 feat(siniestros): la lista dice de quién, por cuánto y quién aprobó
fdd42296 feat(cartas): la lista de artefactos legales dice a quién va dirigida
b924f15d fix(templates): expone `body` y deja de tumbar wa-status con un 500
```

**Verde al cierre:** `tsc` limpio en los dos repos · 1.609 tests del front ·
1.556 del agente · `pnpm lint` sin errores nuevos · `next build` verde (worktree
aislado). Los 2 fallos preexistentes del agente (`full-call-path`,
`cotizador-cost-aggregator`) siguen igual.
