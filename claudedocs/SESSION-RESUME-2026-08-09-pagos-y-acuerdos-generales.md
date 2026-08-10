# Pagos, el panel que adelgazó, y acuerdos generales que la agencia escribe

**Sesión 2026-08-09 (tarde)** · ramas `fix/habeas-data-arco` (mvp, **63 commits**)
y `fix/arco-triage-status-constraint` (agent-develop, **14**) · **nada pusheado**.

Continúa `SESSION-RESUME-2026-08-09-acuerdos-disputas-y-ds.md`.

---

## La frase que resume la sesión

> **Una palabra que significa dos cosas es un defecto, no un detalle.**

«Pendiente» tapaba una deuda y un pago en vuelo. «Negociación» tapaba el
acuerdo, la facturación y el CRM. «Acuerdo general» era el techo de la política
y también los 7 tiers del agente. Cada vez que separamos los dos significados
apareció un defecto real debajo.

---

## 1 · Pagos: la pantalla no mostraba pagos

Las 45 filas son `payment_method = 'cartera_import'` — **deuda importada, que
nadie intentó pagar**. En los tres tenants: 0 aprobados, 0 con `paid_at`, 0 con
id de pasarela.

El endpoint ahora deriva `kind` en SQL (`obligacion | pago`) para que el front
no conozca el string `'cartera_import'`, los KPI las cuentan aparte
(`enProcesoCount` vs `porCobrarCount`/`porCobrarCop`) y el filtro acepta
`por_cobrar` / `en_proceso` (`pending` sigue valiendo por las dos).

En pantalla: «Por cobrar» en neutro en vez de «Pendiente» en ámbar, proveedor y
desembolso dicen «No aplica», y el titular pasó a **POR COBRAR $144.965.000 ·
45 obligaciones**.

### Lo que el corte destapó

- **`fee_amount` es la 4.ª columna muerta** (tras `cost_usd`,
  `compliance_flags`, `state_log`): la leían la columna «Comisión» y un KPI, y
  **no la escribe ningún writer**. El webhook de la pasarela ni siquiera extrae
  la comisión del payload. Se quitó el camino de lectura entero.
- **Una alerta imposible**: el pill «⚠ demora en desembolso» salta a los 3 días
  hábiles. En un par de días TODA la cartera importada se habría llenado de
  alertas sobre un giro que no puede existir.
- **Un KPI que se muerde la cola**: filtrabas «En proceso» y «Por cobrar» caía
  a $0. Los KPI ya no aplican `statusClause`; período, proveedor y desembolso
  sí, porque **acotan, no son la cosa que se cuenta**.
- **`paymentPlanId` es un alias de `payment_promise_id`** y apunta a otra tabla.
  Hoy no se alcanza; queda anotado en la ruta.

Commits `57bcb00b` (agente) · `ca7e8a92` (mvp).

---

## 2 · `pnpm api:gen` borraba 17 rutas del contrato, en silencio

El `/openapi.json` del agente **corriendo** no es el contrato completo: hay
rutas registradas sólo para documentación en `manifest-docs-only.ts`, que
importa `scripts/dump-openapi.ts` y **nunca el servidor**.

```
servidor vivo   → 181 rutas · 359 esquemas
openapi:dump    → 198 rutas · 395 esquemas   ← el canónico
```

Las 17 que faltan son ARCO y cotizador-admin. Lo detecté porque el diff movió
**8.000 líneas** por tocar una sola ruta. `scripts/api-gen.sh` ahora se planta y
las lista por nombre (`d3e634b3`). Importa porque CLAUDE.md manda correrlo antes
de cada PR.

---

## 3 · El panel adelgazó: 19 → 12 pestañas

| qué | por qué |
|---|---|
| **Inbox de conversaciones** oculto | ⚠️ NO era Llamadas con otro nombre (voz vs WhatsApp: 7 hilos `whatsapp`, 0 de voz) |
| **Pendientes** fusionado en el Resumen | `CobranzaAtencionPreview` lee de `usePendientes()`, la MISMA fuente |
| **Cadencia de contacto** fuera | Cuándo y por qué canal habla el agente lo define Leasefy — igual que Playbooks |

### ⚠️ El hueco que deja el Inbox

Es la **única** superficie que muestra los hilos que el agente se negó a
contestar. En la demo: **5 hilos con `requires_action = true`, 0 con fila en
`agent.escalations`**, y `use-pendientes.ts` no lee `conversation_threads`. Un
«requiere humano» de WhatsApp no aparece en ningún lado.

**Para que ocultarlo salga gratis hay que engancharlos a Pendientes.**

De la cadencia se quitó TODA la maquinaria, no sólo el JSX: dejar el hook habría
seguido pidiendo `GET /cobranza/cadence` en cada carga para una UI que no
existe.

Commits `2186cb80`, `a22d035f`, `9abab724`.

---

## 4 · Configuración: «Negociación» eran cuatro cosas apiladas

Bajo el subtítulo «Límites que el agente puede ofrecer al negociar» convivían el
descuento, **el CRM, el ERP, el modelo de facturación y un switch del reporte
diario**. Once campos planos y un botón que guardaba todo eso.

Ahora: **«Acuerdo general»** (mudado, ver §5), **«Facturación e integraciones»**
aparte con su propio botón, y el switch del reporte en §Reporte diario. De 1.300
a **872 líneas**.

Los porcentajes se escriben en %: el descuento pedía la fracción con la etiqueta
`(0 a 0.5)`, y «% éxito» mostraba `0,08` — que se lee como 0,08 %, cien veces
menos.

---

## 5 · El acuerdo general se mudó a Acuerdos de pago

Para armarlo había que salir de Acuerdos, ir a Configuración y buscar una
sección llamada «Negociación». `AcuerdosGeneralesCard` pasó de sólo lectura a
**editable en el lugar**: el acuerdo dicho en una frase siempre visible,
«Ajustar» despliega el formulario.

> El agente puede cerrar solo: hasta 20% de descuento, en 3, 6 o 12 cuotas, con
> un pago mínimo de $200.000, y hasta 6 intentos.

**Y avisa cuando se contradice.** `maxPlanMonths` y `allowedPaymentPlans` NO son
el mismo campo —el primero es el tope con el que se arma el cronograma, el
segundo la lista blanca que decide si cierra o escala— y **hoy en TODOS los
tenants se contradicen**: `max_plan_months = 0` con 3, 6 y 12 marcados. El
schema del agente declara `min(1)`, pero `checkAgencyPolicy` arma el objeto
campo por campo sin parsearlo, así que el 0 pasa sin ruido.

En Configuración no quedó ni el puntero (`fcc3ec92`): una tarjeta titulada
«Acuerdo general» seguía diciendo que ese era su lugar.

---

## 6 · El test intermitente, cazado

Fallaba ~1 de cada 6 corridas de la suite completa y nunca en aislado:
`expected 0 to be greater than 0` en `DebtorPicker`.

**La causa**: el helper drenaba SEIS microtareas, pero la ruta numérica llama a
`crypto.subtle.digest`, que es una operación **real de la plataforma**. Bajo
carga, seis turnos no alcanzaban.

Ahora se espera la **condición**, no una cantidad de turnos — y los timers se
falsean sólo para `setTimeout`/`clearTimeout`, porque falsear todo se lleva
puesto `setImmediate`. **Verificado con 8 corridas seguidas, 0 fallos**
(`5d577ba4`).

---

## 7 · 🚧 EN CURSO — acuerdos generales que escribe la agencia

**Descubrimiento**: los acuerdos generales ya existen y son **7**,
`DEFAULT_DISCOUNT_TIERS`, uno por etapa, cada uno con su condición en español
(«Pago total en 48 horas», «Firma acuerdo de pago en 7 días»). Constantes del
agente, **invisibles en el panel**, sin endpoint que las exponga. Lo que la
agencia edita hoy no es un acuerdo: es el **techo** que las recorta.

Nico eligió la opción **B**: que la inmobiliaria escriba los suyos.

### Hecho (`78c3583d`)

`agent.agency_agreement_templates` — copia la forma de `Tier` a propósito (así
entra en el motor sin casos especiales) y agrega cuándo aplica (etapas, rango de
días de mora, rango de monto) y `priority`.

`agency-agreements.ts` con **22 tests**, tres reglas:

1. Aplica si cumple TODAS las condiciones. **`stages: []` es «cualquier etapa»**,
   no «ninguna» — al revés, todo acuerdo nuevo quedaría sin efecto en silencio.
2. Gana el de **mayor prioridad**, que ordena la inmobiliaria. Empate → el más
   nuevo, para que guardar dos veces no cambie el resultado.
3. **El techo manda siempre** (`Math.min`, D-09). Hay un test llamado «crear un
   acuerdo NO es una forma de saltarse el propio techo».

Más dos recortes: sin descuento efectivo el tipo pasa a `none`; sin plazos
habilitados, un solo pago con inicial 100%.

Sin acuerdos activos sigue mandando `DEFAULT_DISCOUNT_TIERS`: una agencia que no
escriba ninguno no cambia en nada.

### Falta

1. **CRUD** `GET/POST/PATCH/DELETE /api/agency/:id/cobranza/acuerdos-generales`
2. **Engancharlo en `checkAgencyPolicy`**, que hoy sólo lee los tiers internos
   (`resolvePaymentPlanCeilings`)
3. **Front**: regenerar tipos (⚠️ merge quirúrgico, ver §2), tabla en Acuerdos +
   «Crear acuerdo general» con nivel interno de navegación

---

## Estado

`tsc` limpio en ambos · front **1.684 tests** (216 archivos) · agente **1.595**
en rutas + **742** en cartera · lint 0 errores · verificado en pantalla en claro
y oscuro. **Nada pusheado.**

⚠️ **Node 20 obligatorio**: con Node 25 fallan ~108 tests.
