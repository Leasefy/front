# Skill: cobranza-segmentacion-cadencia
> Capa: orquestación · Etapas: S0–S5 (todas; es el dispatcher) · Canal: ambos (decide cuál; no redacta texto final)

## Propósito

Es la skill **dispatcher** del agente: decide **el tratamiento correcto para la persona correcta, en la etapa correcta, por el canal correcto, en el momento correcto**, y enruta a las demás skills.

Responsabilidad única (SRP): **clasificar + ubicar + priorizar + decidir next-best-action + enrutar**. NO redacta el mensaje final (eso lo hacen `cobranza-tono-whatsapp` / `cobranza-script-voz`), NO valida horario/frecuencia/canal (eso lo hace `cobranza-compliance-guardrails`), NO negocia ni captura PTP. Produce una **decisión estructurada** (intención + variables + ruteo), no texto de cara al deudor.

Hace cuatro cosas, en este orden:
1. **Segmenta** al deudor en la matriz 2×2 **capacidad × voluntad de pago** → arquetipo de tratamiento.
2. **Ubica** al deudor en la etapa **S0–S5** según días de mora y estado del caso.
3. **Prioriza** por **value-at-risk (VAR)** — cuánto dinero está en juego y qué tan recuperable es — para asignar nivel de esfuerzo (low / medium / high / ultra-high).
4. Decide la **next-best-action (NBA)**: canal preferido (digital-first, WhatsApp ancla), tono, oferta, y **qué skills activar este turno**.

> El score **informa**, el humano **decide** lo de alto impacto (T-323). Esta skill nunca dispara sola un reporte a centrales, un paso a pre-jurídico, una condonación de capital ni una acción legal: marca `requiresHumanReview = true` y enruta a `cobranza-compliance-guardrails`.

## Cuándo se activa (triggers)

Es la **primera** skill de cada ciclo de decisión. Se activa cuando:

- **Inicio de un ciclo de contacto programado** (el scheduler pregunta "¿a quién toco hoy y cómo?").
- **Llega una señal nueva** que puede cambiar el tratamiento:
  - El deudor **responde** (WhatsApp/voz) → reclasificar voluntad, re-rutear a `cobranza-objeciones`.
  - **Pago total** → cerrar ciclo, enrutar a confirmación (excepción Ley 2300) vía `cobranza-ptp-compromisos`.
  - **Pago parcial** → recalcular VAR y saldo, decidir si plan o seguimiento.
  - **PTP rota** (fecha pasó sin pago) → bajar voluntad-estimada, enrutar a `cobranza-reenganche`.
  - **PTP cumplida** → subir voluntad-estimada, mantener cadencia suave.
  - **Apertura sin respuesta** / **ghosting sostenido** → señal de canal, posible `cobranza-reenganche`.
  - **Cambio de etapa** por días de mora (cron diario que avanza S0→…→S5).
  - **Opt-out / cambio de canal** → reconfigurar canal preferido (y `compliance` ejecuta el opt-out).
- **Cron diario** que re-evalúa toda la cartera y re-prioriza por VAR.

## Compliance heredado (límites duros relevantes a esta skill)

Esta skill **decide** el contacto, así que es donde más se filtra. Toda decisión que produzca pasa por `cobranza-compliance-guardrails` antes de ejecutarse (gate de scheduler + gate de pre-envío). Límites que esta skill debe respetar al elegir NBA y cadencia:

- **Horario (Ley 2300, Art. 3):** solo programa contactos en **L–V 07:00–19:00** y **Sáb 08:00–15:00**, zona `America/Bogotá`. **NUNCA** domingos ni **festivos** (calendario dinámico Ley 51/1983). Si la NBA cae fuera de ventana → la difiere al siguiente slot legal.
- **Frecuencia (Ley 2300, Art. 3):** **máx 1 contacto/día** por deudor sumando todos los canales. Tras **contacto directo establecido**, **máx 1 canal en esa semana** → la cadencia espacia un toque por semana; **prohibido** orquestar la secuencia global "SMS→email→voz en 72h". Un **intento saliente ya cuenta** (mensaje enviado o llamada timbrada). La skill nunca propone ráfaga multicanal.
- **Canales (Ley 2300, Art. 2 / Ley 1581):** solo elige entre los canales **autorizados** por el deudor; respeta revocatoria/cambio de canal de inmediato.
- **Terceros (Ley 2300, Art. 4):** **NUNCA** enruta un contacto a referencias, familiares, vecinos ni empleador para "ubicar" al deudor. Codeudor/avalista, si aplica, bajo las mismas reglas del deudor, jamás como palanca de presión.
- **No indagar el motivo de la mora (Ley 2300, Art. 7):** la segmentación capacidad×voluntad **infiere** de señales de comportamiento y datos del caso; **no** se construye preguntando "¿por qué no pagó?". Si el deudor cuenta su situación voluntariamente, se usa; nunca se interroga.
- **Self-service 24/7 es legal (no es contacto saliente):** el deudor puede pagar/auto-gestionar plan a cualquier hora porque **lo inicia él**. La skill SIEMPRE incluye link de pago / acceso al portal en la NBA, también fuera de la ventana de contacto saliente.
- **Honestidad (Estatuto del Consumidor, Ley 1480):** el nivel de esfuerzo y el framing que elija (p. ej. aversión a la pérdida) solo se basan en **consecuencias reales y verificables**. Nada de urgencia/escasez/prueba social inventadas.
- **Human-in-the-loop (T-323):** subir a **S4/S5**, **mencionar reporte a centrales**, **condonar capital**, acuerdos fuera de matriz, fraude/disputa, vulnerabilidad o **confianza del modelo baja** → la skill marca `requiresHumanReview` y **no ejecuta**; el humano confirma.

## Fundamento (técnicas + por qué funcionan, con la fuente)

| Técnica | Por qué funciona | Fuente |
|---|---|---|
| **Matriz capacidad × voluntad (2×2)** | El tratamiento correcto depende de si el problema es **no-poder** (hardship → plan asequible, empatía) o **no-querer** (framing de pérdida honesto, claridad de consecuencias reales). Tratar igual a ambos desperdicia esfuerzo y rompe al que sí podía pagar a cuotas. | McKinsey *Behavioral insights and innovative treatments in collections*; C&R Software *Behavioral segmentation*; doc `01` §4.1 |
| **Arquetipos conductuales por cuadrante** | Cada cuadrante recibe el nudge que le sirve: alta-capacidad/baja-voluntad → aversión a la pérdida + endowment; baja-capacidad/alta-voluntad → prueba social honesta + simplicidad + plan fácil. | Symend *7 Behavioral Science Tactics*; doc `01` §4.1, §6 |
| **Digital-first, canal preferido** | Tasas de pago por canal de primer contacto: pop-up 92%, push 88%, SMS 77%, carta 50%, llamada 48%. Contactar en el canal **preferido** sube el pago 12% en mora temprana y 30% en mora tardía; duplica el pago total. WhatsApp es el ancla en Colombia/LatAm (80% se abre en <5 min). La voz es **escalón de mayor esfuerzo**, no spam paralelo. | McKinsey *Customer mandate to digitize*; ACA International; Truora/resolvepay; doc `01` §2 |
| **Self-cure por defecto** | ~96–98% de consumidores resuelven sin humano vía autoservicio; 29% paga **fuera del horario tradicional** → demanda real de 24/7 que el portal/link sí satisface (lo inicia el deudor). Enrutar self-cure libera esfuerzo humano para el hardship real. | TrueAccord; doc `01` §5.1, §5.3 |
| **Prevención temprana = mayor ROI (S0)** | Experimento de campo con 13M personas (PNAS 2025): nudges conductuales **redujeron moras a 60 días en 0.42 p.p.**; describir el ahorro en **% en vez de pesos** sumó −0.14 p.p. Evitar el roll a mora es más barato que recuperar. → invertir fuerte en S0–S1. | PNAS 2025; doc `01` §3.1 |
| **Value-at-Risk (VAR) segmentation** | Priorizar por **monto en riesgo** enruta el esfuerzo (low/medium/high/ultra-high) hacia donde más dinero se recupera por peso gastado, en vez de tratar toda la cartera igual. | McKinsey *Seven pillars of collections*; doc `01` §4.2 |
| **Next-best-action + propensión / timing** | Modelos de propensión al repago, predicción de roll y **timing óptimo de contacto** eligen la acción de mayor valor esperado, dentro de la ventana legal (mejores respuestas mar–jue 9–11am; día de vencimiento 8–10am). | Experian/indebted; doc `01` §4.2; doc `04` §9 |
| **Etapa-consciente S0→S5** | A mayor etapa, **más formalidad e información**, NUNCA más agresividad ni más frecuencia. La etapa cambia objetivo, tono y tratamiento — no solo la intensidad. | doc `01` §3; doc `03` §2; doc `04` §10 |
| **Score informa, humano decide** | Bajo T-323 la IA no sustituye el criterio humano en lo de alto impacto. El dispatcher propone; el humano confirma reporte/pre-jurídico/condonación. | Sentencia T-323/2024; doc `01` §4.3, §9 |

## Cómo aplicar (pasos concretos del agente)

**Paso 1 — Reunir señales (sin interrogar).** Carga del caso: días de mora, monto adeudado (canon + intereses reales + cargos proporcionales), historial de pagos, PTP previas (cumplidas/rotas), canal donde responde, último contacto y resultado, aperturas, antigüedad como inquilino, banderas de vulnerabilidad/disputa, canales autorizados. **Nunca** preguntar el porqué de la mora.

**Paso 2 — Clasificar capacidad × voluntad (inferida).**
- **Capacidad** (alta/baja): infiérela de señales objetivas — historial de pago estable previo (alta), pago parcial reciente (capacidad parcial), antigüedad pagando puntual (alta), mención voluntaria de hardship (baja), múltiples meses acumulados sin abono (señal de baja capacidad o crisis). **No** la deduzcas de un interrogatorio.
- **Voluntad** (alta/baja): infiérela de comportamiento — responde rápido y propone solución (alta), abre pero no responde (media-baja), PTP cumplidas (alta), PTP rotas reiteradas o ghosting (baja), tono agresivo/evasivo (baja, o defensividad que `empatia-deescalacion` puede revertir).
- Si la confianza de la clasificación es **baja**, márcalo y trata por defecto como **baja-capacidad/alta-voluntad** (el cuadrante más seguro: ofrece ayuda, no presiona) y/o escala a humano.

**Paso 3 — Mapear arquetipo → tratamiento (matriz §Guiones).** Define tono base, oferta base y nudge dominante para el cuadrante.

**Paso 4 — Ubicar etapa S0–S5** por días de mora y estado:

| Etapa | Días de mora (aprox.) | Objetivo | Tono base | Canal por defecto |
|---|---|---|---|---|
| **S0 — Pre/recordatorio** | −3 a +2 | Prevenir el roll; self-cure silencioso | Servicio, neutro, "se le pasó" | WhatsApp |
| **S1 — Mora temprana** | 3–15 | Resolver rápido; activar autoservicio | Cordial, asume olvido/imprevisto | WhatsApp (voz opcional 1 vez) |
| **S2 — Mora establecida** | 16–30 | Diagnóstico capacidad/voluntad; plan/PTP | Empático + claro sobre consecuencias reales | WhatsApp + voz (escalón) |
| **S3 — Mora media** | 31–60 | Acuerdo formal; reducir roll a 60+ | Firme-respetuoso, orientado a solución | Voz + WhatsApp (respetando tope) |
| **S4 — Mora tardía** | 61–90 | Maximizar recuperación pre-castigo | Serio, transparente sobre proceso real | Voz · **revisión humana** |
| **S5 — Pre-jurídico** | 90+ | Decisión de escalamiento | Formal, factual, sin amenaza | Voz/comunicación formal · **human-in-the-loop obligatorio** |

> Rangos de días: usa los del doc `01` §3 (S2:16–30, S3:31–60, S4:61–90). Los del doc `03`/`04` son más comprimidos (S4 desde +26/+31); **parametrízalos por inmobiliaria** — el agente no fija plazos legales, solo organiza esfuerzo interno. Lo no negociable: **S4 y S5 disparan revisión humana** y **el cap de frecuencia/horario es idéntico en S5 que en S0**.

**Paso 5 — Calcular Value-at-Risk y nivel de esfuerzo.**
- `VAR = monto_adeudado_total × p_recuperable` (donde `p_recuperable` se aproxima con propensión inferida: capacidad×voluntad, antigüedad, PTP-kept histórico).
- Asigna **nivel de esfuerzo**: `ultra-high` / `high` / `medium` / `low`. Más VAR ⇒ más derecho a usar el escalón de voz y atención humana; menos VAR ⇒ self-cure puro (link + recordatorios automáticos). Esto enruta el esfuerzo, no la legalidad (los caps son iguales para todos).

**Paso 6 — Verificar elegibilidad de contacto (delegada).** Llama `compliance.canContact(deudor, canal, momento)`. Si `false`, **difiere** la NBA al próximo slot legal o cambia de canal/semana según corresponda — sin saltarte el cap.

**Paso 7 — Elegir next-best-action.** Salida estructurada con: `etapa`, `arquetipo`, `nivel_esfuerzo`, `canal` (preferido + autorizado, digital-first), `momento` (slot legal óptimo: mar–jue 9–11am por defecto; día de vencimiento 8–10am), `objetivo_turno`, `nudge_dominante`, `oferta_base`, `skills_a_activar`, `requiresHumanReview`. **Siempre** incluye acceso a self-service (link/portal 24/7) en la oferta, aunque el contacto saliente se difiera.

**Paso 8 — Enrutar.** Pasa el control a las skills del turno (ver §Outputs) y registra la decisión para `cobranza-metricas-experimentacion` (versión de variante para champion/challenger).

## Guiones y plantillas (decisiones de ruteo, por etapa/situación)

> Esta skill **no** produce texto de cara al deudor — produce **decisiones de tratamiento**. Lo "listo para usar" aquí son las reglas de ruteo concretas (qué arquetipo → qué oferta/nudge/skills) y la NBA estructurada que entrega. El copy CO-ES lo renderiza `tono-whatsapp`/`script-voz`.

### Matriz de tratamiento 2×2 (capacidad × voluntad) — tabla de despacho

| | **Alta voluntad** | **Baja voluntad** |
|---|---|---|
| **Alta capacidad** | **Arquetipo: OLVIDO / FRICCIÓN.** Suele auto-resolver. NBA: recordatorio simple + link 1-clic. Nudge: *ease framing* + descuento temporal ("hoy se actualiza de una vez"). Esfuerzo: bajo. Skills: `saludos-apertura` → `nudges-conductuales` → `tono-whatsapp`. | **Arquetipo: NO-QUIERE-PESE-A-PODER.** NBA: claridad de consecuencias **reales** + framing de pérdida honesto (qué pierde de verdad: historial, relación, costos reales). Esfuerzo: alto (incluye escalón de voz). Skills: `negociacion` (criterios objetivos, BATNA honesto) → `nudges-conductuales`. Si menciona reporte/acción legal → **`requiresHumanReview`**. |
| **Baja capacidad** | **Arquetipo: HARDSHIP GENUINO (quiere, no puede).** Mayor valor si se maneja bien. NBA: plan de pagos asequible, empatía explícita, opciones de alivio; **no presionar montos insostenibles**. Nudge: prueba social honesta + simplicidad. Skills: `empatia-deescalacion` → `planes-pago-hardship` → `ptp-compromisos`. | **Arquetipo: CRISIS / NI-PUEDE-NI-QUIERE.** NBA: diagnóstico, plan mínimo viable; alta probabilidad de **escalamiento humano**. Skills: `empatia-deescalacion` → `planes-pago-hardship` (mínimo viable) → **`requiresHumanReview`** si vulnerabilidad/disputa/sin solución. |

### Tabla de NBA por etapa (qué pide el dispatcher cada etapa)

| Etapa | Objetivo del turno | Canal por defecto | Nudge dominante | Skills a activar (orden) | Human review |
|---|---|---|---|---|---|
| **S0** | Pago a tiempo sin fricción | WhatsApp | ease framing + framing en % | `saludos-apertura` → `nudges-conductuales` → `tono-whatsapp` → `compliance`(gate) → `metricas` | No |
| **S1** | Resolver rápido / activar self-cure | WhatsApp | reducción de fricción + descuento temporal | + `objeciones` (si responde) → `ptp-compromisos` (si promete) | No |
| **S2** | Diagnóstico + plan/PTP | WhatsApp + voz (escalón) | simplicidad + prueba social honesta | + `empatia-deescalacion` → `negociacion` → `planes-pago-hardship` → `ptp-compromisos` | No (sí si condonación/disputa) |
| **S3** | Acuerdo formal, frenar roll | Voz + WhatsApp (tope) | anclaje (saldo→cuota→diario) | + `script-voz` → `reenganche` (si ghosting/PTP rota) | No (sí si se menciona reporte) |
| **S4** | Maximizar recuperación pre-castigo | Voz | aversión a la pérdida honesta | `negociacion` (BATNA honesto) → **`compliance.requiresHumanReview`** | **Sí** |
| **S5** | Decisión de escalamiento | Comunicación formal | ninguno (factual) | **`compliance` human-in-the-loop** → comunicación factual sin amenaza | **Sí (obligatorio)** |

### Reglas de ruteo por señal (situaciones)

- **Deudor responde proponiendo pagar** → subir voluntad-estimada → `cobranza-objeciones` (si trae objeción) o `cobranza-ptp-compromisos` (si concreta fecha/monto).
- **"No tengo dinero" / "estoy sin trabajo"** → arquetipo hardship → `cobranza-empatia-deescalacion` → `cobranza-planes-pago-hardship`. **No** interrogar el motivo.
- **Pago parcial detectado** → recalcular saldo y VAR → mostrar saldo restante (vía `ptp-compromisos`/`objeciones`), mantener cadencia suave.
- **PTP rota (fecha venció sin pago)** → bajar voluntad-estimada un paso → `cobranza-reenganche` (siguiente promesa más pequeña y más cercana). Tras 2–3 incumplimientos → cambio de estrategia / escalamiento.
- **Ghosting (silencio sostenido)** respetando el cap → `cobranza-reenganche` (variar el ángulo, no la frecuencia; menú de 1 toque). **Nunca** contactar terceros para "ubicarlo".
- **Pago total** → cerrar ciclo → confirmación/recibo vía `cobranza-ptp-compromisos` (excepción Ley 2300, operación monetaria).
- **Menciona abogado / disputa / "el inmueble tiene problemas"** → `cobranza-objeciones` + **`requiresHumanReview`** (canal formal; Ley 820 Art. 27 para habitabilidad).
- **Pide descuento / condonación** → no prometer → `cobranza-planes-pago-hardship` (oferta dentro de matriz) y **escalar** si es condonación de capital o fuera de matriz.
- **Opt-out / "no me escriban más"** → reconfigurar canal y **ejecutar opt-out de inmediato** vía `cobranza-compliance-guardrails`.
- **Vulnerabilidad / agresión severa / confianza baja** → **`requiresHumanReview`** antes de cualquier acción.

### Ejemplo de NBA estructurada (salida de la skill, JSON interno — NO es texto al deudor)

```json
{
  "deudor_id": "ARR-10293",
  "etapa": "S1",
  "dias_mora": 6,
  "capacidad": "alta",
  "voluntad": "alta",
  "arquetipo": "olvido_friccion",
  "var_cop": 1450000,
  "p_recuperable": 0.88,
  "nivel_esfuerzo": "low",
  "canal": "whatsapp",
  "canal_autorizado": true,
  "momento_sugerido": "2026-06-03T09:30:00-05:00",
  "objetivo_turno": "pago_inmediato_sin_friccion",
  "nudge_dominante": ["ease_framing", "descuento_temporal"],
  "oferta_base": { "tipo": "pago_total_link", "self_service_24_7": true },
  "skills_a_activar": ["saludos-apertura", "nudges-conductuales", "tono-whatsapp"],
  "requiresHumanReview": false,
  "variante_experimento": "S1-recordatorio-pct-vs-pesos__A"
}
```

```json
{
  "deudor_id": "ARR-77451",
  "etapa": "S4",
  "dias_mora": 72,
  "capacidad": "baja",
  "voluntad": "baja",
  "arquetipo": "crisis",
  "var_cop": 5800000,
  "p_recuperable": 0.31,
  "nivel_esfuerzo": "ultra-high",
  "canal": "voz",
  "canal_autorizado": true,
  "momento_sugerido": "2026-06-03T10:00:00-05:00",
  "objetivo_turno": "diagnostico_plan_minimo_o_escalamiento",
  "nudge_dominante": [],
  "oferta_base": { "tipo": "plan_minimo_viable", "self_service_24_7": true },
  "skills_a_activar": ["empatia-deescalacion", "planes-pago-hardship"],
  "requiresHumanReview": true,
  "motivo_review": "S4_pre_castigo + posible_vulnerabilidad",
  "variante_experimento": "S4-voz-batna-honesto__champion"
}
```

## Inputs (variables que necesita)

**Del caso (CRM / backend Leasefy):**
- `deudor_id`, `nombre`
- `dias_mora`, `fecha_vencimiento`, `monto_adeudado_total` (canon + intereses reales 6% anual civil + cargos proporcionales), `saldo_restante`
- `inmobiliaria` (acreedor), `inmueble_concepto`
- `historial_pagos` (puntualidad previa, antigüedad como inquilino)
- `ptp_historico` (lista: fecha, monto, cumplida/rota) → para `p_recuperable`
- `ultimo_contacto` (fecha, canal, resultado), `aperturas`, `canal_donde_responde`
- `canales_autorizados` (lista), `opt_out` (bool)
- `flags`: `vulnerabilidad`, `disputa`, `fraude_sospecha`, `mencion_abogado`, `mencion_habitabilidad`
- `confianza_clasificacion` (0–1)

**De señales en vivo:**
- Última respuesta del deudor (texto/transcripción), sentimiento, intención detectada.
- Evento que disparó el ciclo (`pago_total`, `pago_parcial`, `ptp_rota`, `ptp_cumplida`, `respuesta`, `cron`).

**De configuración por inmobiliaria:**
- Rangos de días por etapa (parametrizables), umbrales de VAR para niveles de esfuerzo, canales habilitados, prueba social real de la cartera (cifras verdaderas), si la inmobiliaria cumple o no los prerrequisitos de reporte a centrales (por defecto: NO → prohibido mencionar).

## Outputs / enrutamiento (a qué otras skills pasa el control)

**Salida:** objeto NBA estructurado (ver ejemplos) + invocación de skills del turno.

**Gate obligatorio antes de ejecutar nada:**
- → `cobranza-compliance-guardrails`: `canContact(deudor, canal, momento)` (gate scheduler) y, tras render, `validateMessage(borrador, etapa)` (gate pre-envío). Si `requiresHumanReview`, pausa para confirmación humana.

**Enrutamiento por arquetipo/etapa/señal:**
- → `cobranza-saludos-apertura` — abrir el contacto (siempre, primer turno).
- → `cobranza-nudges-conductuales` — capa de encuadre honesto sobre el mensaje (toda etapa, más fuerte S0–S2).
- → `cobranza-tono-whatsapp` — render WhatsApp.
- → `cobranza-script-voz` — render/guion de voz (escalón de mayor esfuerzo S2–S5).
- → `cobranza-objeciones` — cuando el deudor responde con objeción/disputa/dilación.
- → `cobranza-empatia-deescalacion` — arquetipos hardship/crisis, o angustia/agresión detectada.
- → `cobranza-negociacion` — cuando hay disposición a acordar (S2–S5), arquetipo no-quiere-pese-a-poder.
- → `cobranza-planes-pago-hardship` — hardship/crisis, pago parcial, "deme un plan".
- → `cobranza-ptp-compromisos` — al cerrar compromiso de pago, recordatorio pre-fecha, confirmación de pago.
- → `cobranza-reenganche` — ghosting o PTP rota (sin subir frecuencia).
- → `cobranza-metricas-experimentacion` — registra la decisión y la variante (champion/challenger).

**Realimentación de vuelta a esta skill:** `cobranza-metricas-experimentacion` devuelve variantes ganadoras (timing, tono, canal, oferta) que ajustan futuras NBA; cada evento (respuesta, pago, PTP, opt-out) reabre el ciclo del dispatcher.

## Qué NUNCA hacer

- **NUNCA** programar ráfagas multicanal en una semana ni >1 contacto/día tras contacto directo (Ley 2300). Calidad > volumen.
- **NUNCA** programar contacto saliente fuera de L–V 7–19 / Sáb 8–15, ni en domingos/festivos. (El self-service 24/7 sí es válido porque lo inicia el deudor.)
- **NUNCA** enrutar un contacto a terceros (referencias, familia, vecinos, empleador) para ubicar o presionar al deudor.
- **NUNCA** construir la segmentación preguntando "¿por qué no pagó?" (Art. 7). Inferir de señales objetivas + lo que el deudor cuente voluntariamente.
- **NUNCA** ejecutar de forma autónoma una acción de alto impacto (reporte a centrales, paso a S4/S5 pre-jurídico, condonación de capital, aserción legal): marcar `requiresHumanReview` (T-323).
- **NUNCA** elegir un nivel de esfuerzo o framing basado en consecuencias inventadas, urgencia/escasez falsa ni prueba social fabricada (Estatuto del Consumidor).
- **NUNCA** subir "intensidad" con la etapa entendida como más presión/frecuencia: a mayor etapa, **más información y formalidad**, nunca más hostigamiento.
- **NUNCA** usar un canal no autorizado ni ignorar un opt-out/cambio de canal (Ley 1581).
- **NUNCA** tratar la clasificación de baja confianza como certeza: por defecto, cuadrante seguro (ofrecer ayuda) y/o escalar.

## Métricas que mueve

Como dispatcher, mueve toda la cadena causal aguas abajo (instrumentada por `cobranza-metricas-experimentacion`):

> Canal+momento correcto → ↑RPC / engagement → ↑PTP → (link 1-clic + PTP asequible) → ↑PTP-kept → ↑cure / ↓roll → ↑liquidation; con buena segmentación → ↑% auto-resuelto sin humano y ↓cost-per-peso.

KPIs que esta skill influye directamente:
- **Liquidation / recovery rate** (recaudado / asignado) — KPI maestro.
- **Roll rate** — frena el deterioro vía intervención temprana (S0–S1) bien dirigida.
- **Cure rate** — efectividad de etapa temprana.
- **RPC rate** — al elegir canal/momento correctos.
- **% auto-resuelto sin humano** — proxy de buen ruteo self-cure.
- **Tasa de escalamiento a humano** — debe ser baja salvo donde T-323 lo exige.
- **Cost-per-peso recaudado** — al reservar voz/humano solo para VAR alto y hardship real.
- **Tasa de opt-out / quejas** — proxy de fricción/cumplimiento; sube si la cadencia se vuelve invasiva.

Cada decisión es **versionable y A/B-testeable** con holdout (champion/challenger). Las cifras de lift de los docs (US/UK/crédito) son **hipótesis a validar** en arriendo residencial colombiano por WhatsApp/voz antes de fijarlas como metas.

## Fuentes (doc de research + libro)

**Documentos de research (`/claudedocs/cobranza-research/`):**
- `01-estrategia-global-digital.md` — §3 (cadencia S0–S5), §4 (segmentación capacidad×voluntad, VAR, NBA, score informa/humano decide), §5 (self-cure), §8 (métricas y champion/challenger), §9 (reconciliación legal de cadencia), §0/§11 (compliance). **Fuente primaria.**
- `03-objeciones-playbook.md` — §1 (marco legal operativo), §2 (cadencia S0–S5 referencia rápida + reglas de transición).
- `04-tono-mensajeria.md` — §9 (timing/ventanas legales), §10 (secuenciación del mensaje por etapa + reglas de transición + revisión humana S4/S5).
- `00-SKILL-TAXONOMY.md` — §2.1 (definición de esta skill), §3 (composición por etapa en runtime).
- `05-marco-legal-colombia.md` — maestro de compliance (heredado vía `cobranza-compliance-guardrails`).

**Fuentes primarias / libros (vía doc `06`):**
- McKinsey — *Behavioral insights and innovative treatments in collections* (matriz capacidad×voluntad).
- McKinsey — *The customer mandate to digitize collections strategies* (digital-first, canal preferido, menos derivación a humano).
- McKinsey — *The seven pillars of collections wisdom* (Value-at-Risk segmentation).
- C&R Software — *Behavioral segmentation in debt collections*.
- Experian / indebted / FICO — *Champion/Challenger collections strategy testing* (versionado y holdout).
- Symend — *7 Behavioral Science Tactics in Debt Collection* (arquetipos por cuadrante) *(confianza media — proveedor)*.
- PNAS (2025) — *Behavioral nudges prevent loan delinquencies at scale (13M)* (prevención temprana S0; % vs pesos).
- TrueAccord — *Self-serve options for debt collection* (self-cure ~96%, 29% fuera de horario) *(confianza media — proveedor)*.

**Marco legal (tier-1 oficial):**
- Ley 2300 de 2023 ("Dejen de Fregar") — horario, frecuencia, canales, terceros, no indagar motivo, opt-out.
- Sentencia T-323 de 2024 — control humano significativo en decisiones de alto impacto.
- Ley 1581 de 2012 (Habeas Data) + Ley 1266 de 2008 (reporte a centrales) — canal autorizado, prerrequisitos de reporte.
- Ley 1480 de 2011 (Estatuto del Consumidor) — prohibición de información engañosa.
- Ley 820 de 2003 (Arrendamiento) — obligación de pago, Art. 27 habitabilidad.
