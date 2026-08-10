# QA exhaustivo de Cobranza — tres pasadas

**Sesión 2026-08-10** · ramas `fix/habeas-data-arco` (mvp, **90 commits**) y
`fix/arco-triage-status-constraint` (agent-develop, **21**) · **nada pusheado**.

Continúa `SESSION-RESUME-2026-08-09-resumen-casos-y-scroll.md`.

---

## La frase que resume la sesión

> **Un identificador donde va un nombre no es un dato incompleto: es una
> pantalla sobre la que no se puede actuar.**

Ningún defecto de esta sesión daba error. Todos devolvían 200.

---

## Cómo se hizo

Tres pasadas, cada una destapando lo que la anterior no miraba:

1. **Lectura** — las 12 pestañas visibles + las ocultas (18 rutas), 47 endpoints
   probados contra el agente corriendo con token real.
2. **Detalles y escrituras** — las rutas `[id]` que la primera nunca abrió, y
   las acciones que nunca disparó.
3. **Accesibilidad, modo oscuro y lo que quedaba** — el proyecto `panel-a11y`,
   un barrido de color, los exportes CSV.

⚠️ La primera pasada se sintió completa y **no lo era**. Recorrer el camino de
lectura de una sección no es haberla probado.

---

## 1 · Datos que existían y no llegaban (agente)

- **`analytics/top-scripts` devolvía 500 en CADA carga del Resumen**: el SQL
  pedía `st.name` y `script_templates` no tiene esa columna. No era «sin
  datos» — era una consulta que no puede correr nunca. La tabla vacía tapaba
  el síntoma.
- **`totalOwed` era la suma de los pagos APROBADOS** y la ficha lo titulaba
  «Saldo pendiente»: mostraba $0 a un deudor con $1.950.000 sin pagar. La
  definición se extrajo a `cartera/payments-kind.ts` para que Pagos y la ficha
  no vuelvan a divergir; lo recaudado viaja aparte en `totalCollected`.
- **`daily-report.top_debtors`** y **`compliance.habeas_data.open_requests`**
  traían sólo `debtor_id`. El panel pintaba `A9820375` y `ABC17944` bajo el
  encabezado «Deudor» — el segundo junto a «VENCIDO HACE 3D», un plazo de la
  Ley 1581 sobre alguien a quien no se puede identificar.
- Lo mismo en las bitácoras de **Ley 2300** y **«No contactar»** (2.ª pasada).
- **`daily-report/subscription-stats` NO EXISTÍA**: dos 404 por carga y un
  cartel que le decía «endpoint no disponible» al usuario.
- **`thresholds/history` daba 404** aunque el rollback ya existía — o sea, las
  versiones siempre se guardaron; sólo faltaba listarlas.

## 2 · Formularios que mienten

- **Aprobar una carta prejurídica exigía método de envío y dirección de
  destino, y los descartaba.** El body del agente era `.strict()` con sólo
  `confirmation`. Las columnas quedaban NULL y la tabla mostraba «—» en
  «Método de envío» para todas las filas.
- **Pausar la cobranza no se podía deshacer**: `paused_until` era obligatorio
  y el riel decía «Pausar cobranza» estuviera o no pausado el deudor.
- **Un acuerdo general se guardaba con «15% de descuento» y «sobre qué: sin
  descuento».** Los dos campos son la misma decisión.

## 3 · Trabajo invisible

Ocultar el Inbox dejó **5 hilos de WhatsApp `requires_action` sin ninguna
superficie**: no generan fila en `agent.escalations` y `usePendientes` no leía
`conversation_threads`. Uno decía *«Necesito hablar con una persona, esto ya lo
expliqué tres veces y nadie me responde»*. Ahora son la 6.ª fuente de
Pendientes; el contador del Resumen pasó de 6 a 12.

## 4 · La Auditoría vacía con 243 eventos adentro

`AuditLogResponse` estaba escrito a mano como `{ items, next_cursor }` y el
agente responde `{ entries, nextCursor }`. `json.items` era SIEMPRE `undefined`.
La vista forense —con la que se le responde a la SIC— decía «Sin eventos de
auditoría», 200 OK, cero errores en consola.

Tipar desde el contrato generado destapó además un `.slice()` sobre
`entity_id`, que es nullable.

> **Los hooks que NO importan `api/generated/agent` son la lista de
> sospechosos:** `grep -L "generated/agent" src/lib/hooks/cobranza/*.ts`

## 5 · Reportes a propietarios no podía producir el primero

«Generar borrador» sólo existía DENTRO de un reporte ya abierto, así que con la
lista vacía —el estado inicial de toda inmobiliaria— la pantalla no podía crear
jamás su primer reporte; el único CTA mandaba a otra sección.

Y el reporte **inventaba su contenido**: sin narrativa del backend pintaba «se
realizaron 4 gestiones de cobro (2 llamadas y 2 mensajes de WhatsApp). El
inquilino prometió pagar el 12 de junio». Ninguno de esos hechos existía, y el
aviso de «vista previa» dependía de `!reporte.raw`, así que en un reporte REAL
sin narrativa el texto inventado salía **sin aviso**. Es un documento que se le
manda al dueño del inmueble.

## 6 · Accesibilidad y color

Tres botones de icono sin nombre en la cabecera del panel — violación
`button-name` **crítica de axe en TODAS las páginas**, no sólo cobranza. Con
eso `panel-a11y` queda en **24 verdes, 0 fallas**.

Una caja `bg-white` fija (blanca en oscuro) sobre la pantalla de aprobar carta
prejurídica, y seis `dark:bg-[#1a1a1c]` crudos en Analítica.

---

## Lo que se probó de verdad

Escrituras ejecutadas de punta a punta: crear / apagar / borrar un acuerdo
general (el PATCH conserva los campos que no se mandan), generar un reporte a
propietario, revelar PII, guardar umbrales, pausar y reanudar la cobranza de un
deudor. Las dos primeras aparecieron después en la Auditoría con el correo del
operador — el ciclo cierra.

**No se dispararon** aprobar carta ni radicar siniestro: escriben a S3, mandan
correo y son irreversibles en la base compartida.

---

## Estado

`tsc` limpio en ambos · front **1.715 tests** (218 archivos) · agente **7.855** ·
lint 0 errores · `next build` verde · `panel-a11y` verde. **Nada pusheado.**

⚠️ **Node 20 obligatorio.** El build va con
`NEXT_DIST_DIR=.next-build npx next build` para no pisar el `.next` del dev
server — hacerlo lo deja sirviendo HTML **sin JavaScript**, sin un solo error.

---

## Decisiones que quedan para Nico

1. **Chubb y Liberty Seguros no se pueden radicar.** La lista de aseguradoras
   es fija (`sura|mapfre|solidaria|accion`) y son 2 de las 4 que hay en la
   base. `agent.insurer_contacts` está VACÍA: sin correo no hay a dónde
   radicar. La pantalla ahora lo dice en vez de ofrecer cuatro compañías
   equivocadas en silencio.
2. **Tres criterios de PII distintos** en la misma sección: Llamadas enmascara
   el NOMBRE (`Lu•••íos`, la tabla queda ilegible), Cartas muestra la cédula
   COMPLETA (`CC 79854123`), Casos la enmascara. No se tocó: es política.
3. Borrar —o no— el acuerdo de prueba **«Cierre rápido de fin de mes»** de la
   base de dev. Ofrece 40% a cualquiera entre 16 y 45 días de mora, y el
   agente lo usa.

## Abierto, no bloqueante

- Dos tests del agente en rojo, **ajenos a cobranza** y previos a esta sesión:
  `cotizador-cost-aggregator` (espera concurrencia 10, el código dice 5) y
  `full-call-path` (SETNX dedup).
- `usePolicyImpact` es código muerto: ningún componente lo usa.
- El Resumen pide `daily-report/today` ~8 veces por carga.
