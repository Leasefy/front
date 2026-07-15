# Skill: cobranza-metricas-experimentacion

> Capa: **orquestación** (instrumentación + optimización, lógica interna — no conversa con el deudor) · Etapas: **S0–S5** (todas, en segundo plano) · Canal: **N/A** de cara al deudor (mide WhatsApp + voz)

---

## Propósito

Instrumentar y optimizar la cobranza con **evidencia local**, no con fe. Dos responsabilidades:

1. **Medir lo que mueve la aguja.** Definir, calcular y trackear los KPIs maestros (liquidation/recovery, roll, cure, RPC, PTP, PTP-kept, cost-per-peso, % auto-resuelto, opt-out/quejas SIC, escalamiento a humano) con fórmulas exactas y un **event log por contacto** que los alimenta.
2. **Validar el lift real con champion/challenger + holdout.** Las cifras de los docs de research vienen de US/UK y de crédito de consumo → **son hipótesis, no hechos**. Cada guion, cadencia, hora de envío y nudge se prueba contra un control antes de desplegarse a toda la cartera. El ganador se promueve; el perdedor se descarta.

El norte estratégico no es actividad (mensajes enviados) sino **recuperación neta por peso gastado, dentro de la ley**. Esta skill cierra el bucle: registra → atribuye → experimenta → realimenta a `segmentacion-cadencia` y `nudges-conductuales`.

> **Regla de honestidad de la medición (T-323 + Estatuto del Consumidor).** Esta skill solo puede *medir y optimizar* lo que las otras skills ya tienen permitido *hacer*. Nunca puede "descubrir" que una táctica prohibida (más frecuencia, multicanal, prueba social inventada) "convierte mejor" y promoverla: el espacio de experimentación está **acotado por `cobranza-compliance-guardrails`**. Un challenger que viola el gate es inválido por construcción, sin importar su lift.

---

## Cuándo se activa (triggers)

En segundo plano, **continuamente**, en cuatro momentos:

1. **Por cada contacto saliente y entrante** → escribe un evento en el `contact_event_log` (quién, cuándo, canal, etapa, variante/arm, plantilla, resultado de `canContact`/`validateMessage`).
2. **Por cada señal de resultado** (apertura, respuesta, PTP capturada, PTP cumplida/rota, pago total/parcial, opt-out, queja, escalamiento) → escribe un evento de outcome y lo **atribuye** al contacto/variante que lo precedió.
3. **Al asignar un deudor a un experimento** → el orquestador llama a `assignArm(deudor, experimentoId)` antes de elegir plantilla/cadencia; respeta el **holdout** y el sticky-assignment (un deudor no cambia de brazo a mitad de experimento).
4. **En el cron de evaluación** (diario para frescura operativa, semanal para decisiones de promoción) → recalcula KPIs por segmento/etapa/variante, evalúa significancia y **emite recomendaciones de promoción/parada** a `segmentacion-cadencia` y `nudges-conductuales`.

---

## Compliance heredado

Esta skill **hereda íntegro** `cobranza-compliance-guardrails`. No emite mensajes (no toca `validateMessage` para enviar), pero su salida — qué variante se promueve — **modifica el comportamiento de cara al deudor**, así que está sujeta a estos límites duros:

- **El espacio de experimentación está acotado por la ley.** Ningún brazo (arm) puede proponer: contacto fuera de **L–V 07:00–19:00 / Sáb 08:00–15:00**, ni domingos/festivos (`America/Bogota`); más de **1 contacto/día**; **multicanal en la misma semana** tras contacto directo; contactar **terceros**; preguntar el **motivo de la mora**; amenazas/urgencia/escasez/prueba social **inventadas**; mención de **centrales** sin el gate G cumplido + aprobación humana. Un challenger así se **rechaza en diseño**.
- **Human-in-the-loop (T-323).** La skill **recomienda**, no ejecuta. Promover una variante que cambie tratamiento en S4–S5, o cualquier brazo que toque reporte/pre-jurídico/condonación, requiere **confirmación humana** antes de salir del holdout. La métrica "tasa de escalamiento a humano" se mide, pero **bajarla nunca es un objetivo de optimización por sí mismo** (no se optimiza contra el control humano).
- **Honestidad radical (Ley 1480).** No se puede A/B-testear una afirmación falsa "a ver si convierte". Toda variante de copy ya pasó `validateMessage`; aquí solo se comparan variantes **legales y verídicas** entre sí.
- **Habeas Data (Ley 1581).** El `contact_event_log` es tratamiento de datos: finalidad limitada al cobro/mejora del cobro, acceso restringido, retención definida, y los eventos de **opt-out se respetan de inmediato** (un deudor en opt-out sale de todo experimento; no se le "guarda en un brazo").
- **Métrica-guardián #1: quejas/sanciones SIC = objetivo 0.** Ninguna ganancia de liquidation justifica subir opt-out o quejas. Si un challenger sube recuperación pero **también** sube opt-out/quejas por encima del umbral, **pierde**.

---

## Fundamento (técnicas + por qué funcionan, con fuente)

- **Champion/Challenger con muestra y holdout.** Probar la estrategia vigente (champion) contra una variante (challenger) en una muestra antes de desplegar a toda la cartera; permite optimizar timing, tono, frecuencia, canal y next-best-action de forma data-driven, mejorando cure/roll/liquidation/cost-to-collect. (doc `01` §8.1 — Experian, indebted, FICO) → **por eso cada guion/secuencia debe ser versionable y A/B-testeable con holdout**.
- **Las cifras globales son hipótesis a validar localmente.** Toda estadística de lift en los docs viene de US/UK y crédito de consumo; deben validarse en **arrendamiento residencial colombiano por WhatsApp/voz** antes de tratarse como metas (doc `00` §6; doc `01` confianza "media" marcada en cifras de proveedor). El experimento es el mecanismo que las convierte en hechos locales — o las refuta.
- **Cadena causal de KPIs** (qué mover para mover el resultado): *canal+momento correcto → ↑RPC/engagement → ↑PTP → (link 1-clic + PTP asequible) → ↑PTP-kept → ↑cure / ↓roll → ↑liquidation, y con automatización → ↓cost-per-peso* (doc `01` §8). Esto define **qué medir en cada eslabón** para saber *dónde* se rompe el embudo, no solo el resultado final.
- **Prevención temprana = mayor ROI medible.** Un experimento de campo de 13M de personas (PNAS 2025) mostró que nudges bien diseñados redujeron moras a 60 días en **0.42 p.p.**, y que describir el ahorro **en % en vez de pesos** restó **0.14 p.p.** adicionales (doc `01` §3.1). → es la prueba viva de que micro-cambios de copy producen lift medible; el motor de experimentación de esta skill replica ese método en S0–S1.
- **PTP-kept bajo = señal diagnóstica.** Un PTP-kept bajo suele indicar guiones/handling ineficientes, disputas o promesas mal calibradas (doc `01` §7.2 — Tratta) → no es solo un número, es un **trigger de re-tratamiento** que esta skill emite hacia `ptp-compromisos` y `planes-pago-hardship`.
- **% auto-resuelto como proxy de éxito digital; opt-out/quejas como proxy de fricción/cumplimiento** (doc `01` §8 métricas secundarias). El éxito de la estrategia digital-first no se mide solo en pesos, sino en cuánta carta se resuelve **sin humano y sin queja**.

---

## Cómo aplicar (pasos concretos del agente)

### Paso 0 — Definir el grano de medición

- **Unidad de asignación del experimento:** el **deudor** (no el mensaje). Evita contaminación: un deudor vive en un solo brazo durante un experimento (sticky assignment por `hash(deudorId + experimentoId)`).
- **Unidad de outcome:** el **caso de mora** (un canon vencido y su resolución). Permite calcular cure/roll/liquidation a nivel cartera.
- **Ventana de atribución:** un outcome (pago, PTP, opt-out) se atribuye al **último contacto válido en los N días previos** (default 7, configurable por etapa). Pagos por link/portal sin contacto previo → atribuir a "self-cure" (canal = `self`).

### Paso 1 — Registrar cada contacto y outcome (event log)

Escribir **un evento por cada** intento de contacto y por cada señal de resultado. Sin este log, ningún KPI ni experimento es confiable. (Esquema completo en *Inputs → contact_event_log*.)

### Paso 2 — Calcular los KPIs (fórmulas exactas)

Recalcular por **cartera × segmento (capacidad×voluntad) × etapa (S0–S5) × variante (arm) × canal × hora-de-envío**. Periodicidad: snapshot diario, decisiones semanales.

| KPI | Fórmula exacta | Numerador / denominador | Por qué importa | Fuente |
|---|---|---|---|---|
| **Liquidation / recovery rate** | `recaudado_periodo / saldo_asignado_inicio × 100` | $ recaudado ÷ $ colocado/asignado al inicio | KPI maestro de resultado | doc `01` §8 (OpsDog) |
| **Roll rate (roll-forward)** | `$_que_pasó_al_bucket_siguiente / $_del_bucket_origen × 100` | p.ej. $ que pasó de 30→60 días ÷ $ que estaba en 30 | mide si la intervención temprana frena el deterioro | doc `01` §8 (Tratta) |
| **Cure rate** | `casos_que_volvieron_al_día / casos_en_mora_inicio × 100` | cuentas curadas ÷ cuentas en mora del bucket | efectividad de etapa temprana (S0–S2) | doc `01` §8 (bridgeforce) |
| **RPC (Right-Party Contact) rate** | `contactos_con_deudor_correcto / intentos × 100` | contacto con el titular ÷ intentos salientes | precisión de datos + estrategia de contacto | doc `01` §8 (Tratta) |
| **PTP rate** | `PTP_capturadas / RPC × 100` | promesas hechas ÷ contactos con parte correcta | calidad de negociación | doc `01` §7.1, §8 (Tratta) |
| **PTP-kept rate** | `PTP_cumplidas / PTP_hechas × 100` (y en $: `$_recibidos_a_tiempo / $_prometidos`) | promesas cumplidas ÷ hechas | fiabilidad del compromiso y del cash-flow | doc `01` §7.1 (OpsDog) |
| **Cost per peso collected** | `gasto_total_cobranza / total_recaudado` | COP gastado ÷ COP recaudado | ROI; crítico al pasar de humano a tech | doc `01` §8 (OpsDog) |
| **% auto-resuelto sin humano** | `casos_resueltos_sin_agente_humano / casos_resueltos × 100` | self-cure + IA ÷ total resueltos | proxy de éxito digital-first | doc `01` §8 |
| **Tasa de opt-out** | `optouts_periodo / contactos_periodo × 100` | "PARE" / supresiones ÷ contactos | proxy de fricción/tono agresivo (**guardián**) | doc `01` §8; compliance §Métricas |
| **Tasa de quejas SIC** | `quejas_SIC / casos_gestionados × 100` | quejas/sanciones ÷ casos | **objetivo 0** — métrica que el compliance existe para proteger | compliance §Métricas |
| **Tasa de escalamiento a humano** | `escalamientos / casos_gestionados × 100` (desglosar por motivo) | casos a cola humana ÷ casos | cumplimiento del human-in-the-loop (ni 0 ni excesivo) | compliance §Métricas; doc `01` §4.3 |

**Métricas operativas/diagnósticas de embudo** (para saber *dónde* se rompe): open rate y CTR por canal; tiempo a primera resolución; tasa de respuesta por canal/hora; "% mensajes bloqueados en pre-envío" y "% contactos bloqueados por `canContact`" (salud del prompt + del scheduler, heredadas del compliance).

### Paso 3 — Diseñar el experimento (champion/challenger)

```
1. HIPÓTESIS explícita y local, derivada de un doc pero tratada como apuesta:
     "Framing en % (vs pesos) en el recordatorio S0 sube cure_rate S0 ≥ 2 p.p."
     (origen: PNAS 0.14 p.p. en crédito US → HIPÓTESIS para arriendo CO)
2. UNA variable por experimento (copy | hora | canal-primario | orden de cadencia | oferta de plan).
     Nunca cambiar dos cosas a la vez: no sabrías cuál movió la aguja.
3. BRAZOS:
     - champion  = la versión vigente (control activo)
     - challenger= la variante (1, máx 2 challengers para no diluir potencia)
     - holdout   = grupo de control que recibe el tratamiento MÍNIMO legal (no "nada":
                   nunca se deja a un deudor sin la gestión básica conforme; el holdout
                   recibe el champion histórico o el toque mínimo, según la pregunta).
4. MÉTRICA PRIMARIA (1 sola: p.ej. cure_rate S0) + MÉTRICAS GUARDIÁN obligatorias:
     opt-out, quejas SIC, escalamiento. Un challenger que gana en primaria pero
     EMPEORA una guardián por encima del umbral → PIERDE.
5. TAMAÑO DE MUESTRA: calcular n por brazo para el MDE buscado (ver Paso 5). Si la
     cartera es chica, subir el MDE o alargar la ventana; nunca declarar ganador con n insuficiente.
6. ASIGNACIÓN: sticky por hash(deudorId+experimentoId). % a holdout configurable
     (típico 10–20%). Registrar el arm en cada evento (Paso 1).
7. DURACIÓN: fija de antemano (≥ 1 ciclo de mora completo para outcomes lentos como
     PTP-kept/cure; mínimo 2–4 semanas). PROHIBIDO "peeking" y parar al ver un pico.
```

### Paso 4 — Validar resultados (no engañarse)

- **Significancia antes de promover.** No promover por una diferencia visual. Aplicar prueba de proporciones (z-test de dos proporciones para tasas; o intervalo de confianza de la diferencia) y reportar el **p-valor y el IC 95% del lift**, no solo el delta puntual.
- **Corrección por múltiples comparaciones** si se corren varios challengers/segmentos (Bonferroni o similar) para no "encontrar" ganadores por azar.
- **Lift mínimo accionable (MDE).** Definir antes el efecto mínimo que vale la pena (p.ej. +2 p.p. de cure). Un lift estadísticamente significativo pero trivial no se promueve.
- **Chequear las guardián SIEMPRE.** Promoción requiere: primaria gana (significativa ≥ MDE) **Y** opt-out/quejas/escalamiento no empeoran fuera de umbral.
- **Validez externa.** Confirmar que el resultado se sostiene en al menos 2 segmentos antes de generalizar a toda la cartera; un lift que solo aparece en "alta capacidad/alta voluntad" no se aplica a hardship.

### Paso 5 — Tamaño de muestra (regla práctica)

Para detectar un cambio en una **tasa** (cure, PTP-kept, conversión a pago):

```
n_por_brazo ≈ 16 × p̄(1−p̄) / (MDE)²      // aproximación rápida, α=0.05, potencia 80%
  donde p̄ = tasa base esperada (proporción, no %),  MDE = lift absoluto buscado (proporción)

Ejemplo: tasa base de cure S0 = 0.40, quiero detectar +0.03 (3 p.p.):
  n ≈ 16 × 0.40 × 0.60 / 0.03²  = 16 × 0.24 / 0.0009 ≈ 4.267 deudores por brazo.
```

→ Si no hay volumen para eso: **subir el MDE** (buscar efectos más grandes), **alargar la ventana**, o **acumular varios ciclos** antes de decidir. Nunca declarar ganador con n por debajo del cálculo. (Cartera chica = experimentos más lentos y más conservadores, no inexistentes.)

### Paso 6 — Promover, descartar, realimentar

- **Champion gana / no hay diferencia** → mantener champion; archivar la hipótesis con su evidencia (para no re-probar lo mismo).
- **Challenger gana (primaria + guardián OK + significativo + ≥ MDE)** → **promover a champion**. Si toca tratamiento de alto impacto (S4–S5, oferta fuera de matriz) → **revisión humana antes de promover** (T-323).
- **Realimentación** (el bucle se cierra aquí):
  - a `cobranza-segmentacion-cadencia`: nueva hora óptima de envío por segmento, canal primario ganador, cadencia ganadora, y **señales de re-tratamiento** (PTP-kept bajo en un segmento → cambiar oferta de plan).
  - a `cobranza-nudges-conductuales`: copy/framing ganador (p.ej. "% > pesos confirmado/refutado en CO"), defaults de plan ganadores, segundo-toque óptimo.
- **Registrar todo experimento** (hipótesis, n, resultado, decisión) en un **registro de experimentos** versionado → memoria institucional, evita repetir, y es evidencia auditable de mejora continua (insumo de explicabilidad T-323).

---

## Guiones y plantillas (listos para usar)

> Esta skill no habla con el deudor; sus "plantillas" son **artefactos de instrumentación** (schemas y fichas) listos para que un ingeniero los cablee en Mastra. Se incluyen 6.

### G1 — Esquema del evento de contacto (`contact_event_log`)
```json
{
  "event_id": "evt_2026-06-03T09:14:02-05:00_a1b2",
  "deudor_id": "deu_001",
  "caso_mora_id": "mora_2026-05_inmueble-077",
  "timestamp": "2026-06-03T09:14:02-05:00",   // America/Bogota, ISO8601 con offset
  "tipo": "contacto_saliente",                // contacto_saliente|inbound|outcome
  "canal": "whatsapp",                        // whatsapp|voz|self
  "etapa": "S1",                              // S0..S5
  "segmento": { "capacidad": "alta", "voluntad": "alta" },
  "experimento_id": "exp_framing_pct_S0",
  "arm": "challenger_A",                       // champion|challenger_A|challenger_B|holdout
  "plantilla_id": "S1_recordatorio_pct_v3",
  "plantilla_version": 3,
  "compliance": {                              // resultado de los gates (heredado)
    "canContact": "ok",
    "validateMessage": "pass",
    "requiresHumanReview": false
  },
  "monto_caso_cop": 1450000,
  "resultado_entrega": "enviado"              // enviado|timbrado_sin_responder|fallido
}
```

### G2 — Esquema del evento de outcome (atribuible)
```json
{
  "event_id": "evt_2026-06-03T15:40:11-05:00_z9",
  "deudor_id": "deu_001",
  "caso_mora_id": "mora_2026-05_inmueble-077",
  "timestamp": "2026-06-03T15:40:11-05:00",
  "tipo": "outcome",
  "outcome": "pago_total",                    // apertura|respuesta|ptp_capturada|ptp_cumplida|
                                              // ptp_rota|pago_total|pago_parcial|opt_out|
                                              // queja_sic|escalamiento_humano|self_cure
  "monto_pagado_cop": 1450000,
  "atribucion": {
    "contacto_event_id": "evt_2026-06-03T09:14:02-05:00_a1b2",
    "canal": "whatsapp",
    "experimento_id": "exp_framing_pct_S0",
    "arm": "challenger_A",
    "ventana_dias": 7
  },
  "motivo_escalamiento": null                 // si outcome=escalamiento_humano: reporte|prejuridico|
                                              // condonacion|fraude|vulnerabilidad|abogado|agresion
}
```

### G3 — Ficha de experimento (champion/challenger)
```yaml
experimento_id: exp_framing_pct_S0
fecha_inicio: 2026-06-09
fecha_fin: 2026-07-07            # fija de antemano; sin peeking
hipotesis: >
  "Recordatorio S0 con el saldo enmarcado en % del canon (vs pesos) sube cure_rate S0
   en >= 2 p.p." (origen: PNAS 2025 0.14 p.p. en crédito US -> HIPOTESIS para arriendo CO)
variable_unica: copy_framing      # NO cambiar nada más
segmento_objetivo: { capacidad: alta, voluntad: alta }   # olvido/friccion
etapa: S0
brazos:
  champion:     { plantilla: S0_recordatorio_pesos_v2,  share: 0.45 }
  challenger_A: { plantilla: S0_recordatorio_pct_v3,    share: 0.45 }
  holdout:      { plantilla: S0_toque_minimo_legal,     share: 0.10 }
metrica_primaria: cure_rate_S0
metricas_guardian: [opt_out_rate, quejas_sic_rate, escalamiento_humano_rate]
mde_absoluto: 0.02               # 2 p.p.
n_por_brazo_objetivo: 4267       # calculado con base p̄=0.40 (ver Paso 5)
asignacion: sticky_hash(deudor_id + experimento_id)
revision_humana_requerida: false # true si tocara S4-S5 / oferta fuera de matriz
estado: corriendo                # propuesto|corriendo|concluido|promovido|descartado
```

### G4 — Plantilla de decisión (al cierre del experimento)
```
EXPERIMENTO: exp_framing_pct_S0   (n champion=4310, challenger_A=4288, holdout=970)
PRIMARIA  cure_rate_S0:  champion 39.8%  |  challenger_A 42.6%  |  holdout 31.2%
  lift challenger vs champion: +2.8 p.p.  (IC95%: +0.9 a +4.7 p.p.;  p = 0.012)  ✅ ≥ MDE 2 p.p.
GUARDIÁN:
  opt_out:        champion 1.1%  challenger 1.2%   Δ +0.1 p.p.  ✅ dentro de umbral (≤ +0.5)
  quejas SIC:     0 en ambos                       ✅ objetivo 0
  escalamiento:   4.0% vs 3.8%                      ✅ sin deterioro
DECISIÓN: PROMOVER challenger_A a champion para segmento alta/alta en S0.
REALIMENTAR: nudges-conductuales (confirmar "% > pesos" en CO, alta/alta, S0);
             segmentacion-cadencia (plantilla por defecto S0 = pct_v3).
REGISTRAR en registro_experimentos. Próxima hipótesis sugerida: probar % también en S1.
```

### G5 — Alerta de re-tratamiento (señal de KPI → otra skill)
```
ALERTA  ptp_kept_bajo
DETECCIÓN: PTP-kept del segmento {baja_capacidad, alta_voluntad} en S2 = 51%
           (benchmark interno rodante = 72%; caída sostenida 2 semanas)
INTERPRETACIÓN (doc 01 §7.2): promesas mal calibradas o plan insostenible, no mala voluntad.
ENRUTAR A: cobranza-planes-pago-hardship -> revisar asequibilidad (cuota atada a quincena,
           abono inicial más bajo);  cobranza-ptp-compromisos -> activar recordatorio pre-fecha + link.
NO HACER: subir frecuencia de contacto (ilegal y contraproducente).
```

### G6 — Tablero semanal mínimo (lo que un humano revisa)
```
SEMANA 2026-06-01 a 2026-06-07           (cartera: 1.240 casos en mora)
RESULTADO        liquidation 18.4% ▲0.7   cost_per_peso $0.071 ▼$0.004
EMBUDO           RPC 61%  ·  PTP 34%  ·  PTP-kept 70%  ·  cure 22%  ·  roll 30→60 12% ▼
DIGITAL          % auto-resuelto 88%  ·  open WA 81%  ·  open voz N/A
GUARDIÁN         opt-out 1.0%  ·  quejas SIC 0  ·  escalamiento humano 4.1% (reporte 0, hardship 2.9%, abogado 0.4%)
SALUD GATES      bloqueos pre-envío 2.1% (mayor: DISCLOSURE_FALTANTE)  ·  bloqueos canContact 6% (mayor: FUERA_DE_HORARIO -> reprogramado)
EXPERIMENTOS     2 corriendo (exp_framing_pct_S0, exp_hora_envio_S1)  ·  1 concluido (promovido)
```

---

## Inputs

```yaml
contact_event_log:                 # fuente de verdad; G1 + G2
  eventos: [Evento]                # un registro por contacto y por outcome
deudor_segmento:
  deudor_id: string
  capacidad: alta|baja             # de cobranza-segmentacion-cadencia
  voluntad: alta|baja
  etapa: S0|S1|S2|S3|S4|S5
caso_mora:
  caso_mora_id: string
  monto_cop: COP
  bucket_dias: int                 # para roll/cure por bucket
  saldo_asignado_inicio_cop: COP
experimento:
  experimento_id: string
  hipotesis: string                # apuesta local, derivada de doc pero NO asumida
  variable_unica: copy|hora|canal|cadencia|oferta
  brazos: { champion, challenger_A, challenger_B?, holdout } # con share %
  metrica_primaria: string
  metricas_guardian: [opt_out_rate, quejas_sic_rate, escalamiento_humano_rate]  # obligatorias
  mde_absoluto: float
  n_por_brazo_objetivo: int
  fecha_inicio: date
  fecha_fin: date                  # fija; sin peeking
ventana_atribucion_dias: int       # default 7, override por etapa
costos:
  gasto_periodo_cop: COP           # infra + API + minutos voz + humano, para cost-per-peso
config_significancia:
  alpha: 0.05
  potencia: 0.80
  correccion_multiples: bonferroni|none
  umbral_deterioro_optout_pp: 0.5  # guardián
  umbral_quejas_sic: 0             # objetivo duro
```

---

## Outputs / enrutamiento

- **KPIs calculados** (por cartera × segmento × etapa × variante × canal × hora) → **tablero humano** (G6) + almacén de métricas.
- **Decisión de experimento** (G4) →
  - **promover/descartar** la variante; si toca S4–S5 u oferta fuera de matriz → primero `cobranza-compliance-guardrails.requiresHumanReview` → cola humana **antes** de promover (T-323).
  - **realimentar `cobranza-segmentacion-cadencia`**: hora óptima de envío, canal primario, cadencia y next-best-action ganadora por segmento/etapa.
  - **realimentar `cobranza-nudges-conductuales`**: copy/framing ganador, defaults de plan, timing del segundo toque.
- **Alertas de re-tratamiento** (G5) → `cobranza-ptp-compromisos` (recordatorio pre-fecha + link) y `cobranza-planes-pago-hardship` (recalibrar asequibilidad) cuando PTP-kept/cure caen.
- **Señales de fricción/cumplimiento** → si opt-out o quejas suben en un brazo, **alerta a `cobranza-compliance-guardrails`** y al humano; el brazo se marca para parada inmediata.
- **Registro de experimentos** (memoria institucional + evidencia auditable de mejora continua) → insumo de explicabilidad para auditorías SIC y para no re-probar hipótesis ya resueltas.

---

## Qué NUNCA hacer

- ❌ **Optimizar fuera del corral legal.** Nunca proponer/promover un brazo que viole horario, frecuencia, multicanal-semana, terceros, honestidad o el gate de centrales — **aunque "convierta mejor"**. El compliance acota el espacio de búsqueda.
- ❌ **Tratar las cifras US/UK de los docs como metas.** Son hipótesis; entran como hipótesis al experimento, no como targets impuestos.
- ❌ **"Peeking":** mirar resultados a mitad y parar el experimento al ver un pico favorable. La duración y el n se fijan de antemano.
- ❌ **Declarar ganador sin significancia ni MDE**, o por una diferencia puntual sin IC/p-valor.
- ❌ **Cambiar dos variables a la vez** en un experimento (no sabrías cuál movió la aguja).
- ❌ **Ignorar las métricas guardián.** Un lift en liquidation que sube opt-out/quejas SIC **es una pérdida**, no una victoria.
- ❌ **Optimizar contra el control humano:** bajar "tasa de escalamiento" como objetivo en sí (eso erosiona el human-in-the-loop T-323).
- ❌ **Dejar deudores sin la gestión mínima legal "para tener control puro":** el holdout recibe el toque mínimo conforme, nunca abandono.
- ❌ **Promover una variante de alto impacto (S4–S5/centrales/condonación) sin revisión humana previa.**
- ❌ **Retener o explotar datos del event log más allá de la finalidad de cobro/mejora**, ni mantener en un brazo a quien hizo opt-out (Ley 1581).
- ❌ **Medir actividad como si fuera resultado** (mensajes enviados ≠ pesos recuperados). El norte es recuperación neta por peso, no volumen.

---

## Métricas que mueve

Esta skill no "mueve" KPIs directamente; **los hace medibles y mejora los de las demás** vía experimentación:

- **Liquidation/recovery rate** — sube al promover cadencias/copys/horas ganadoras validadas.
- **Roll rate ↓ / cure rate ↑** — el motor de S0–S1 (prevención, mayor ROI; PNAS) optimiza aquí.
- **PTP rate ↑ / PTP-kept rate ↑** — al detectar PTP-kept bajo y enrutar re-tratamiento (planes asequibles, recordatorio + link).
- **Cost per peso collected ↓** — al subir % auto-resuelto y reservar el esfuerzo humano para lo que de verdad lo requiere.
- **% auto-resuelto sin humano ↑** — proxy de éxito digital-first, optimizable vía self-cure/link.
- **Guardián (las protege, no las "mueve"): opt-out ↓, quejas SIC = 0, escalamiento humano en rango sano** — cualquier optimización que las deteriore se revierte.
- **Velocidad de aprendizaje** (meta-métrica): nº de experimentos concluidos/mes y % que produjo una decisión accionable — mide la salud del propio bucle de mejora.

---

## Fuentes

**Doc de research primario:**
- `01-estrategia-global-digital.md` — §8 (tabla de KPIs maestros + fórmulas + cadena causal), §8.1 (champion/challenger con holdout y versionado de guiones), §7.1 (fórmulas PTP / PTP-kept), §7.2 (PTP-kept bajo como señal diagnóstica), §3.1 (PNAS 13M: −0.42 p.p. moras; % vs pesos −0.14 p.p.), §4.3 (segmentación → menos derivación a humano), §10 recomendación 8 (medir lo que importa + champion/challenger).
- `00-SKILL-TAXONOMY.md` §2.12 (alcance de esta skill), §6 ("toda cifra de lift es hipótesis a validar localmente"), §0 principio 6 (medible y versionable).
- `cobranza-compliance-guardrails.md` (capa heredada) — §Métricas que mueve (quejas SIC = 0, opt-out, % bloqueos, escalamiento, trazabilidad), §H human-in-the-loop, gate de honestidad y de centrales que acotan el espacio de experimentación.
- Referencia cruzada doc `04` §9 (timing óptimo dentro de ventana legal) y §14 (métricas de tono/mensaje a A/B-testear honestamente).

**Fuentes primarias citadas en los docs:**
- McKinsey — *The seven pillars of collections wisdom* (VAR segmentation, next-best-action): https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/the-seven-pillars-of-collections-wisdom
- Experian — *Champion/Challenger collections strategy testing*: https://www.experian.com/blogs/insights/championchallenger-collections-strategy-testing/
- InDebted — *Champion/challenger model*: https://www.indebted.co/blog/guides/putting-your-collections-strategy-to-the-test-with-a-champion-challenger-model/
- FICO — *Benefits of champion/challenger testing*: https://www.fico.com/blogs/benefits-championchallenger-testing-decision-management
- PNAS (2025) — *Behavioral nudges prevent loan delinquencies at scale (13M field experiment)*: https://www.pnas.org/doi/10.1073/pnas.2416708122
- Tratta — *KPIs to measure debt collection success* (RPC, PTP, PTP-kept, roll): https://www.tratta.io/blog/kpi-collection-debt-metrics
- OpsDog — *Collections KPIs (liquidation rate, % PTP kept, cost per collected)*: https://opsdog.com/categories/kpis-and-metrics/collections
- bridgeforce — *Collections KPIs 2026* (cure rate): https://bridgeforce.com/insights/credit-union-collections-kpis-2026/

**Marco legal (acota el espacio de experimentación):**
- Ley 2300 de 2023 (horario/frecuencia/canal/terceros); Sentencia T-323/2024 (human-in-the-loop, explicabilidad); Ley 1581/2012 + Circular SIC 001/2025 (Habeas Data, finalidad/retención del event log, opt-out); Ley 1480/2011 (no A/B-testear afirmaciones engañosas). Detalle completo en `cobranza-compliance-guardrails.md`.

---

> *Skill de orquestación (instrumentación + optimización). No es de cara al deudor. Todo experimento corre dentro del corral de `cobranza-compliance-guardrails`; las cifras de lift de los docs son hipótesis a validar en arrendamiento residencial colombiano por WhatsApp/voz, no metas. Revisar junto con la skill de compliance cada 6 meses. No constituye asesoría legal ni estadística formal; validar diseño experimental con un analista antes de decisiones de alto impacto.*
