# Cobranza: de columnas muertas a datos reales, y la anatomía de las tablas

**Sesión 2026-08-08 → 09** · ramas `fix/habeas-data-arco` (mvp) y
`fix/arco-triage-status-constraint` (agent-develop) · **nada pusheado**.

Continuación de `SESSION-RESUME-2026-08-09-llamadas-y-cableado.md`.

---

## La frase que resume la sesión

> **Una pantalla vacía puede ser una columna que nadie escribe.**

Tres paneles del detalle de llamada leían columnas que **ningún código del
agente escribe**. Estaban en NULL en las **129 llamadas** de la base, reales
incluidas — no era falta de siembra en el demo: no se llenan nunca, tampoco en
producción. Y como el estado vacío se ve igual que «todavía no hay datos»,
sobrevivieron a `tsc`, lint, 7.700 tests y `next build`.

El grep que las caza está en
[[reference-columnas-que-nadie-escribe]].

---

## 1 · Grabación: preguntar en vez de suponer

`hasRecording` salía de `calls.recording_url`, un **caché que se llena por
webhook**. El audio en cambio vive en Vapi y el proxy se lo pide en vivo.

| | |
|---|---|
| llamadas reales | 96 |
| con `recording_url` | 34 |
| **sin URL pero con turnos** | **50** |
| muestreadas contra la API de Vapi | 12 |
| **que Vapi SÍ tenía** | **12 de 12** |

La pantalla decía «no tiene grabación» sobre audio que estaba a un request de
distancia, y **ni lo intentaba**. Ahora el reproductor pregunta siempre y
distingue tres respuestas: `404` → no hay · otro error → «no pudimos cargarla»
· bytes → reproductor. Commit `8309ce0b`.

**Causa raíz**: en las 50, `agent_summary` está vacío → `persistCallArtifacts`
nunca corrió. Vapi no alcanza `localhost` sin túnel. ⚠️ Que en producción sí
llegue **no está verificado**.

## 2 · Audio de demostración sintetizado

Las 24 llamadas del demo no existen en Vapi, pero tenían transcripción: un
imposible para una llamada de voz. Se sintetiza el guion con el `say` de macOS
(`scripts/seed-demo-recordings.mjs`), 9 audios, 277 s.

**Rotulado en tres lugares** para que no pase por evidencia: esquema
`demo-local:`, cabecera `X-Recording-Kind: demo`, y aviso visible en la
pantalla. El script **reescribe** las marcas de los turnos y la duración con lo
que de verdad dura el audio — sin eso, saltar a un turno cae en cualquier lado.
Commits `3c2484b5` (agente) + `7d04ce34` (front).

## 3 · Costo y cumplimiento: las columnas muertas

| columna | quién la escribía | dónde estaba el dato |
|---|---|---|
| `calls.cost_usd` | **nadie** | Vapi lo manda en el `end-of-call-report` y se tiraba |
| `calls.compliance_flags` | **nadie** | `agent.compliance_events`, 195 filas, vocabulario propio |
| `calls.state_log` | **nadie** | Redis, TTL 1 h |

**Costo**: el webhook ahora persiste total + desglose;
`scripts/backfill-call-costs.mjs` recuperó **86 llamadas con costo real (USD
8.55)** preguntándole a Vapi. No estima: si Vapi no la conoce, queda NULL.
Se agregó `platformUsd` — la tarifa de Vapi era el **58 %** del costo y no se
mostraba; sin ella las partes no sumaban el total.

**Cumplimiento**: el detalle devuelve los eventos reales y la lista los cuenta.
**33 llamadas reales con 74 eventos.** Se enlazan por deudor + ventana (la tabla
no tiene `call_id`). `compliance-vocab.ts` traduce y distingue lo que nadie
distinguía:

> `schedule_violation` → se contactó fuera de horario. **Pasó.**
> `sms_schedule_blocked` → el sistema lo **impidió**. No pasó.

Commits `90c86c62` + `b4b553fe`.

**`stateTrace` NO estaba roto**: lee `cartera_stage_transitions`, tabla real con
5 escritores. Está vacía porque ninguno corrió acá.

## 4 · Bugs de UI que no se veían rotos

- **Listeners que nunca se engancharon** (`fbf4bbf7`). Al agregar el estado
  «buscando», el `<audio>` pasó a aparecer DESPUÉS del primer render y el
  efecto —que depende de un ref— ya no volvía a correr. La barra no avanzaba y
  play no cambiaba a pausa, **con el audio sonando**.
  → [[reference-ref-efecto-no-reengancha]]
- **La transcripción se cortaba** (`f34b8d7b`). `ScrollArea` con `max-h` en la
  raíz no scrollea: **recorta**. → [[reference-scrollarea-max-h-no-scrollea]]
- **El reproductor tapaba las pestañas** (`357f4890`). `WorkspaceNav` ahora
  publica su altura en `--workspace-nav-h`.
- **Marcas de cumplimiento inventadas** (`6d0c652b`). Yo había sembrado
  `tono_elevado` y `mencion_de_reporte_sin_advertencia`: vocabulario que no
  existe, y **acusaciones sin rótulo** sobre una gestión de cobro. Borradas.

## 5 · Pagos y la anatomía de las tablas

`inmobiliaria.ai.cobranza.pagos.filter.null` salía en las 45 filas: `provider`
es NULL para un pago pendiente y el contrato lo declaraba enum **no nullable**
(`99792862`). Faltaba la columna **Desembolso** —en la pantalla llamada «funnel
de pagos y desembolsos»— y la cédula. `Mask` **no enmascara**: envolver el
nombre con `field="cedula"` hacía que el lector de pantalla dijera «cédula
enmascarada» sobre un nombre.

**Anatomía canónica**, ahora en las 4 pantallas con tabla filtrable:

```
Card
 ├─ barra de filtros    (border-b)   ← 2 filas: excluyente arriba, acumulable abajo
 ├─ banda de error      (border-b)
 ├─ tabla               (overflow-x-auto)
 └─ paginación          (border-t, sólo si hay más de una página)
```

Commits `6672d7ed`, `2cc55577`, `ccc0f1a2`, `384e49b5`, `385d9ab6`.
Detalle en [[reference-tablas-del-panel-paginacion]].

---

## Estado

`tsc` limpio en ambos · front **1.650 tests** · agente **7.748** (2 fallos
previos, verificados aparte) · lint sin avisos · rutas 200.
**Nada pusheado.**

⚠️ **El agente corre `tsx` SIN watch**: hay que reiniciarlo para que tome los
cambios de contrato.

---

## Lo que sigue

1. **Disputas** — la pantalla quedó en un spinner en la captura del usuario.
   La tabla `agent.disputes` está **vacía en los tres tenants**; los 3 endpoints
   existen y están en el OpenAPI. El hook cierra `isLoading` en un `finally`,
   así que o era carga en curso o la petición se cuelga. **Sin confirmar.**
2. **El demo no tiene una sola llamada real.** Las 24 son sembradas y no existen
   en Vapi, así que costo y cumplimiento seguirán vacíos ahí por más cableado
   que se haga. Lo único que lo cierra: **una llamada real** — número
   `+17195636764`, asistente «Cobranza Outbound (dev)», ngrok instalado,
   `scripts/vapi-place-test-call.mjs`. Cuesta centavos y suena un teléfono, por
   eso no se hizo.
3. **`calls.outcome` sin CHECK constraint** — el esquema dice que la tiene y no
   es cierto. Migración = decisión de Víctor.
4. **`bg-card` en 191 archivos** del panel fuera de cobranza. El token está
   definido y es sensible al tema, así que **no es un bug**; es vocabulario
   viejo. No tocar sin decisión.
5. Las tres pantallas de Cumplimiento mantienen «Cargar más» a propósito: son
   logs append-only sin un total que mostrar.
