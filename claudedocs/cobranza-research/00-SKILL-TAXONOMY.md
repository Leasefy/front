# 00 — Taxonomía de Skills para el Agente Autónomo de Cobranza ("cobranza")

> **Qué es este documento.** Es la síntesis de los seis documentos de investigación (`01`–`06`) en un **conjunto de skills discretas, componibles y construibles** que alimentan al agente autónomo de cobranza de Leasefy — recuperación de canon de arrendamiento residencial legítimamente adeudado, en Colombia, vía **WhatsApp + voz**, a lo largo de una cadencia escalonada (**S0** temprano/amable → **S5** pre-jurídico). La inmobiliaria es la **acreedora legítima**.
>
> **Encuadre no negociable.** La meta —subir la tasa de recuperación— se sirve con **claridad, empatía, contacto en el momento/canal correcto, nudges honestos, rutas de pago fáciles y manejo justo de la dificultad económica** — NUNCA con presión, engaño, vergüenza ni acoso. Toda skill hereda el filtro legal colombiano (Ley 2300/2023, Sentencia T-323/2024, Ley 1581/2012 Habeas Data + SIC, Ley 1266/2008 + Ley 2157/2021 reporte a centrales, Ley 1480/2011 Estatuto del Consumidor, Ley 820/2003 arrendamiento). Las técnicas globales ilegales/no éticas en Colombia están **excluidas** (ver doc `05` §9 y la skill `cobranza-compliance-guardrails`).
>
> **Fecha:** 2026-06-02 · **Mercado:** Colombia · **Moneda:** COP · **Tratamiento:** "usted" neutral-formal.

---

## 0. Principios de diseño de la taxonomía

1. **Componibilidad.** Cada skill resuelve **una** responsabilidad (SRP). El orquestador del agente las combina por turno/etapa. Un mensaje real combina típicamente 3–5 skills: segmentación + tono + (saludo|objeción|negociación|plan) + compliance + medición.
2. **Compliance como capa transversal, no como skill opcional.** `cobranza-compliance-guardrails` (de doc `05`) es un **filtro que envuelve toda salida** del agente. Ninguna skill emite un mensaje, programa un contacto, ni ejecuta una acción sin pasar por ella. Es un gate de pre-envío + un gate de scheduler, no un paso que se pueda saltar.
3. **Honestidad radical.** Todo factor de influencia (escasez, prueba social, autoridad, consecuencias, framing de pérdida) solo se usa si **es verdadero y verificable** (modo "detective" de Cialdini; Estatuto del Consumidor). Lo inventado se excluye.
4. **Human-in-the-loop en lo de alto impacto.** Reporte a centrales, paso a S5 pre-jurídico, condonación de capital, fraude, vulnerabilidad, anuncio de abogado/demanda, disputa no resuelta → la skill **pausa y escala a humano** (T-323 + Circular SIC 001/2025). El agente propone; el humano confirma lo de consecuencia legal.
5. **Etapa-consciente (S0→S5).** El tono y el tratamiento cambian por etapa: a mayor etapa, **más formalidad e información**, NUNCA más agresividad ni más frecuencia.
6. **Medible y versionable.** Cada guion/secuencia es A/B-testeable con holdout (champion/challenger). La skill de medición instrumenta el lift real en Colombia (las cifras de los docs vienen de US/UK → tratar como hipótesis a validar).
7. **Bilingüe de propósito.** Skills "de cara al deudor" emiten español colombiano natural; skills "de orquestación/política" son lógica interna.

---

## 1. El mapa de skills de un vistazo

```
                ┌──────────────────────────────────────────────────────────┐
                │  cobranza-compliance-guardrails  (CAPA TRANSVERSAL)        │
                │  horario · frecuencia · canal · terceros · honestidad ·    │
                │  human-in-the-loop · habeas data · reporte-centrales gate  │
                └──────────────────────────────────────────────────────────┘
                        ▲ todas las skills heredan este filtro ▲
   ┌──────────────────────────┬───────────────────────────┬──────────────────────────┐
   │  ORQUESTACIÓN / DECISIÓN  │   CONVERSACIÓN (texto)     │   ENTREGA / CANAL        │
   ├──────────────────────────┼───────────────────────────┼──────────────────────────┤
   │ cobranza-segmentacion-    │ cobranza-saludos-apertura  │ cobranza-tono-whatsapp   │
   │   cadencia                │ cobranza-empatia-          │ cobranza-script-voz      │
   │ cobranza-nudges-          │   deescalacion             │                          │
   │   conductuales            │ cobranza-objeciones        │                          │
   │ cobranza-ptp-             │ cobranza-negociacion       │                          │
   │   compromisos             │ cobranza-planes-pago-      │                          │
   │ cobranza-reenganche       │   hardship                 │                          │
   │ cobranza-metricas-        │                            │                          │
   │   experimentacion         │                            │                          │
   └──────────────────────────┴───────────────────────────┴──────────────────────────┘
```

**Conteo:** 1 skill transversal + 12 skills funcionales = **13 skills**.

---

## 2. Las skills en detalle

### 2.0 `cobranza-compliance-guardrails` — la capa que filtra TODO (transversal)

- **Propósito.** Codificar los límites legales colombianos como restricciones duras y un gate de validación que toda otra skill hereda. Es el "filtro que toda otra habilidad debe respetar" (doc `05` §0). Convierte la ley en parámetros ejecutables y en un checklist de pre-envío.
- **Cuándo la usa el agente.** **Siempre, en dos puntos:** (a) el **scheduler**, antes de programar/enviar cualquier contacto saliente (horario, frecuencia, canal, destinatario); (b) el **pre-envío de cada mensaje/guion**, validando contenido (honestidad, prohibidos, disclosures, opt-out) y disparando el **human-in-the-loop** cuando aplique.
- **Qué encoda (resumen ejecutable, ver doc `05` §7 para el YAML completo):**
  - **Horario** `America/Bogota`: L–V 07:00–19:00; Sáb 08:00–15:00; **bloqueado** domingos y **festivos** (calendario dinámico Ley 51/1983).
  - **Frecuencia:** máx **1 contacto/día** por deudor (sumando todos los canales); **1 canal/semana** tras contacto directo. Un **intento saliente cuenta** (llamada timbrada sin responder o mensaje enviado YA cuenta — interpretación Superfinanciera).
  - **Canales:** solo los **autorizados** por el deudor; respetar revocatoria/cambio de canal de inmediato.
  - **Terceros prohibidos:** nunca referencias, familiares, vecinos, empleador. Codeudor/avalista solo bajo las mismas reglas del deudor (no como "palanca de presión").
  - **Conducta prohibida:** preguntar el motivo de la mora (Art. 7); visitas; amenazas; shaming público; suplantar autoridad; urgencia/escasez falsa; afirmaciones engañosas.
  - **Disclosures obligatorios por contacto:** identidad de la inmobiliaria, que es gestión de cobranza, obligación referida, **que es un asistente automatizado** (transparencia T-323/Circular 001), y mecanismo de pago/opt-out.
  - **Reporte a centrales — gate duro:** prohibido afirmar/insinuar/amenazar reporte a Datacrédito salvo verificadas (a) autorización expresa del deudor, (b) comunicación(es) previa(s), (c) 20 días vencidos (doble comunicación si obligación ≤ 15% SMLMV). La mayoría de inmobiliarias **no** cumplen esto → por defecto, prohibido mencionarlo.
  - **Human-in-the-loop — escalar antes de:** S5 pre-jurídico, cualquier mención de reporte a centrales, condonación de capital, acuerdos no estandarizados, fraude/disputa no resuelta, vulnerabilidad, agresión severa, confianza del modelo baja.
  - **Logging auditable + explicabilidad** de cada contacto y decisión.
- **Fuente:** doc `05` (entero, maestro) + secciones de cumplimiento de `01` §0/§9/§11, `02` §0, `03` §1/§6/§7, `04` §2/§12/§13.

> **Regla de implementación:** esta skill expone (1) `canContact(deudor, canal, momento) → bool + razón`, (2) `validateMessage(borrador, etapa) → pass | block(razón) | escalateHuman(razón)`, (3) `requiresHumanReview(accion) → bool`. Las demás skills la invocan; no la replican.

---

### 2.1 `cobranza-segmentacion-cadencia` — quién, qué tratamiento, en qué etapa

- **Propósito.** Decidir el **tratamiento correcto para la persona correcta**: clasificar al deudor por **capacidad × voluntad de pago** (matriz 2×2), ubicarlo en la etapa S0–S5, y seleccionar la **next-best-action** (canal preferido, tono, oferta). Prioriza por value-at-risk y enruta self-cure vs. esfuerzo humano.
- **Cuándo la usa el agente.** Al inicio de cada ciclo de contacto y cuando llega nueva señal (respuesta, pago parcial, PTP rota, apertura). Es la skill "dispatcher" que decide qué otras skills se activan.
- **Qué encoda:** la matriz capacidad×voluntad (doc `01` §4.1) → arquetipos de tratamiento (olvido/fricción, no-quiere-pese-a-poder, hardship genuino, crisis); tabla de etapas S0–S5 con objetivo/tono/canal (docs `01` §3, `03` §2, `04` §10); selección de canal preferido digital-first (WhatsApp ancla; voz como escalón de mayor esfuerzo, no spam paralelo); priorización por monto en riesgo; "score informa, humano decide lo de alto impacto".
- **Fuente:** doc `01` §3–§4, §9; doc `03` §2; doc `04` §10.

---

### 2.2 `cobranza-saludos-apertura` — abrir bien por etapa y canal

- **Propósito.** Generar la **apertura** del contacto: saludo + identificación + encuadre colaborativo, calibrado por etapa y canal, que baja la guardia sin presionar. Incluye la **auditoría de acusaciones** (desactivar el rechazo al "cobrador") y la verificación de identidad en voz.
- **Cuándo la usa el agente.** Primer turno de todo contacto (WhatsApp o llamada). En voz, antes de revelar cualquier dato de la deuda (verificación de identidad obligatoria, Habeas Data).
- **Qué encoda:** estructura "1 idea / saludo humano / identificación" (doc `04` §3); apertura cálida no acusatoria + verificación de identidad para voz (doc `04` §6.1); accusation audit (doc `02` §1.6); plantillas S0/S1 de recordatorio (doc `04` §11.1–11.3); tono "usted" neutral-formal con sensibilidad regional opcional (doc `04` §4).
- **Fuente:** doc `04` §3, §4, §6.1, §11; doc `02` §1.6.

---

### 2.3 `cobranza-empatia-deescalacion` — validar, calmar, no juzgar

- **Propósito.** Manejar la **carga emocional**: reconocer la emoción antes de la solución, de-escalar al deudor molesto/agresivo, y aplicar empatía táctica (labeling, mirroring) **sin interrogar el motivo de la mora** (prohibido). Convierte defensividad/vergüenza —los motores de la evasión— en disposición a negociar.
- **Cuándo la usa el agente.** Cuando detecta angustia, molestia, agresión, vergüenza o evasión, en cualquier etapa; y como capa de tono por debajo de objeciones y negociación.
- **Qué encoda:** framework reconocer → apropiar → resolver (doc `04` §7.1); frases de validación y **frases prohibidas** ("cálmese", "es la política") (doc `04` §7.2); labeling/mirroring/voz DJ-FM, "getting to no" (doc `02` §1.2–1.3, 1.7–1.8); de-escalación del deudor agresivo y cuándo cerrar/retomar (doc `03` §3.11); pagos emocionales de Diamond (doc `02` §4.1); separar persona del problema (doc `02` §2.1).
- **Riel legal clave:** etiquetar una emoción ("parece que el mes vino pesado") es válido; **preguntar "¿por qué no pagó?" es ilegal** (Art. 7). La skill ofrece espacio, no exige explicación.
- **Fuente:** doc `04` §7; doc `02` §1, §2.1, §4.1; doc `03` §3.11.

---

### 2.4 `cobranza-objeciones` — el playbook de respuestas

- **Propósito.** Catálogo de **objeciones/situaciones de deudor** con marco de respuesta cumplidor + guion CO-ES, mapeado a etapa y con banderas Ley 2300. Cubre los 13 escenarios canónicos (ver lista) y enruta a otras skills según corresponda.
- **Cuándo la usa el agente.** Cuando el deudor responde con una objeción, disputa, dilación o solicitud. Es la skill de "dispatch conversacional reactivo".
- **Qué encoda (los 13 escenarios, doc `03` §3):** "no tengo dinero/sin trabajo" (hardship → enruta a `planes-pago-hardship`); "ya pagué" (pausar + verificar soporte); "el monto no es correcto" (desglosar con transparencia); "el inmueble tiene problemas" (separar pago/reparación, Ley 820 Art. 27); "hablo con mi abogado" (canal formal + **escalar humano**); "mañana le pago" (concretar PTP → enruta a `ptp-compromisos`); ghosting (→ `reenganche`); promesa rota (→ `reenganche`/`ptp`); pago parcial (aceptar, mostrar saldo); "deme un descuento/condónenme" (no prometer sin autorización → **escalar**); deudor agresivo (→ `empatia-deescalacion`); parte equivocada (verificar sin exponer deuda); opt-out (ejecutar de inmediato → `compliance`). Cada caso trae "qué NO hacer" y disparador de escalamiento.
- **Fuente:** doc `03` §3 (entero), §5 (matriz), §6 (checklist); apoyo de `04` §7.3.

---

### 2.5 `cobranza-negociacion` — co-diseñar el acuerdo

- **Propósito.** Conducir la **negociación basada en principios** hacia un acuerdo que el deudor pueda cumplir: intereses no posiciones, opciones de beneficio mutuo, criterios objetivos (el contrato), BATNA como información neutra (no amenaza), y cierre con "así es" + plan si-entonces verbalizado por el deudor.
- **Cuándo la usa el agente.** Una vez el deudor está dispuesto a hablar de solución (S2–S5), tras empatía/objeción, antes de estructurar el plan concreto.
- **Qué encoda:** Fisher/Ury (separar persona, intereses, opciones, criterios objetivos, BATNA honesto, doc `02` §2); Voss "así es"/preguntas calibradas (doc `02` §1.4–1.5); Cialdini en modo detective —reciprocidad, compromiso/consistencia, autoridad real, escasez **solo si real**, unidad— (doc `02` §3); Diamond incremental + intercambio de intangibles + usar sus estándares (doc `02` §4); implementation intentions si-entonces (doc `02` §5.2).
- **Riel legal clave:** BATNA y consecuencias solo como **información verídica**; nada de "lo demando mañana". Toda consecuencia jurídica real requiere validación humana (T-323).
- **Fuente:** doc `02` §1.4–1.5, §2, §3, §4; doc `01` §6 (tácticas conductuales honestas).

---

### 2.6 `cobranza-planes-pago-hardship` — estructurar lo que SÍ se cumple

- **Propósito.** Diseñar **planes de pago asequibles** y manejar el hardship con dignidad: abono inicial, número mínimo de cuotas cumplibles, fechas atadas al ingreso del deudor, escalera de oferta (de menor a mayor concesión), y criterios de cuándo procede un alivio/condonación (con escalamiento humano para capital).
- **Cuándo la usa el agente.** Tras detectar capacidad-limitada-voluntad-alta o ante "no tengo dinero", "deme un plan", pago parcial. Produce el objeto-acuerdo que luego cierra `ptp-compromisos`.
- **Qué encoda:** componentes del acuerdo (abono inicial ~10–25%, cuotas mínimas viables, fecha atada a nómina, medio fácil, confirmación escrita) (doc `03` §4.1); escalera de oferta (doc `03` §4.2) y mapeo etapa↔oferta (doc `03` §4.4); diseño de plan sostenible "incluso en mes apretado" (doc `01` §5.3); self-cure / plan autogestionado 24/7 + pay-by-link (doc `01` §5); mental accounting / sincronizar con quincena (doc `02` §5.2); cuándo un descuento es apropiado y **condonación de capital = humano** (doc `03` §4.3, §3.10).
- **Riel legal clave:** no prometer descuentos no autorizados; condonación de capital y planes fuera de matriz → human-in-the-loop (T-323). Objetivo en arriendo: mantener al inquilino al día hacia adelante, no romperlo.
- **Fuente:** doc `03` §4, §3.1, §3.9, §3.10; doc `01` §5; doc `02` §5.2.

---

### 2.7 `cobranza-ptp-compromisos` — promesas que se cumplen

- **Propósito.** Capturar, confirmar y dar seguimiento a **promesas de pago (PTP)** estructuradas (fecha + monto + medio concretos), maximizar la **PTP-kept rate** con recordatorio pre-fecha y link adjunto, y confirmar el pago recibido (excepción legal que cierra el loop positivo).
- **Cuándo la usa el agente.** Al cerrar cualquier compromiso de pago (tras negociación o ante dilación "mañana le pago"); el día previo a la fecha pactada (recordatorio); y al detectar el pago (recibo/agradecimiento).
- **Qué encoda:** definición y fórmulas PTP / PTP-kept (doc `01` §7.1); qué sube la PTP cumplida —fecha+monto concretos, recordatorio pre-fecha, link 1-clic, monto asequible— (doc `01` §7.2); commitment device + implementation intention verbalizada por el deudor (doc `02` §5.2); plantillas de confirmación de acuerdo, recordatorio de PTP y recibo (doc `04` §11.6–11.8); confirmación de pago = excepción Ley 2300 (operación monetaria), recordatorio de PTP = cuenta para el cap de frecuencia (doc `01` §7, doc `03` §3.6).
- **Fuente:** doc `01` §7; doc `02` §5.2; doc `04` §11.6–11.8; doc `03` §3.6.

---

### 2.8 `cobranza-reenganche` — recuperar ghosting / PTP rota

- **Propósito.** Re-enganchar al deudor que **no responde (ghosting)** o que **rompió una promesa de pago**, sin subir la frecuencia (ilegal) y sin reproche: variar el ángulo del mensaje, bajar la barrera de respuesta (menú de opciones de 1 toque), y reabrir con una sola pregunta de solución.
- **Cuándo la usa el agente.** Tras silencio sostenido respetando el cap de 1 contacto/día y 1 canal/semana; tras una PTP vencida sin pago.
- **Qué encoda:** "variar el ángulo, no la frecuencia" + menú de respuesta de 1 toque (1/2/3) (doc `03` §3.7); reabrir PTP rota sin sermón, hacer la siguiente promesa más pequeña y más cercana (doc `03` §3.8); fresh-start framing (doc `02` §5.2); tras 2–3 incumplimientos → cambio de estrategia/escalamiento (doc `03` §3.6, §3.8); nunca contactar terceros para "ubicarlo" (Art. 4).
- **Fuente:** doc `03` §3.7, §3.8; doc `02` §5.2; doc `01` §7.2.

---

### 2.9 `cobranza-nudges-conductuales` — el "qué mover" honesto

- **Propósito.** Aplicar **economía del comportamiento honesta** al diseño del mensaje y la oferta: reducir fricción (la palanca #1), framing en porcentaje, aversión a la pérdida verídica, defaults razonables, anclaje, ease framing, prueba social honesta, segundo toque bien temporizado. Es una skill de "estilo/encuadre" que otras skills consumen.
- **Cuándo la usa el agente.** Como capa de optimización sobre cualquier mensaje de pago/recordatorio/plan, en todas las etapas (más fuerte en S0–S2 = prevención de mayor ROI).
- **Qué encoda:** las 7 tácticas conductuales honestas (doc `01` §6) con su filtro ético; reducir fricción / pay-by-link / monto precargado como nudge dominante (doc `01` §5, doc `02` §5.2, doc `04` §8.4); framing % > pesos, mostrar que la mora crece (PNAS, doc `01` §3.1, doc `02` §5); defaults de plan + fresh start + mental accounting (doc `02` §5.2); "personalizar, no moralizar" (doc `02` §5.1, §5.3); segundo toque potente pero legal (doc `02` §5.3); urgencia/prueba social/loss-aversion **solo si verdaderas** (doc `04` §8).
- **Riel legal clave:** ningún nudge basado en datos inventados (Estatuto del Consumidor). "Guilt nudges" deshonestos excluidos (doc `05` §9.10).
- **Fuente:** doc `01` §6, §5, §3.1; doc `02` §5; doc `04` §8.

---

### 2.10 `cobranza-tono-whatsapp` — microcopy asíncrono

- **Propósito.** Redactar/renderizar el mensaje para **WhatsApp**: estructura 1-1-1-1-1 (idea, monto, fecha, CTA, salida), 2–4 líneas, lenguaje claro de baja complejidad, "usted", CTA único con link de pago, salida/opt-out, emoji funcional máximo 1, palabras prohibidas filtradas.
- **Cuándo la usa el agente.** Siempre que el canal de salida es WhatsApp (la mayoría de toques S0–S3). Renderiza la intención producida por las skills conversacionales.
- **Qué encoda:** anatomía 1-1-1-1-1 y CTA único (doc `04` §3); reglas de microcopy WhatsApp + emoji + opt-out "PARE" (doc `04` §5.2); palabras a evitar ("moroso", "última oportunidad", MAYÚSCULAS) (doc `04` §5.3); lenguaje claro DNP + formato COP + fechas escritas (doc `04` §3.4); plantillas WhatsApp S0–S3 + opt-out (doc `04` §11.1–11.5, 11.9); diminutivos con cuidado (doc `04` §4.4); link de pago seguro precargado (doc `04` §3.3).
- **Fuente:** doc `04` §3, §5, §11.

---

### 2.11 `cobranza-script-voz` — guion síncrono de llamada

- **Propósito.** Conducir la **llamada de voz**: apertura cálida → verificación de identidad (antes de revelar la deuda) → escucha activa (sin interrumpir, sin preguntar el motivo) → propuesta → confirmación PTP → cierre. Incluye tono de voz (calmado, descendente), de-escalación verbal y "lo que nunca decir".
- **Cuándo la usa el agente.** Cuando el canal es voz (escalón de mayor esfuerzo en S2–S5, o cuando el deudor prefiere/autoriza llamada). Una sola vez al día, dentro de horario, canal autorizado.
- **Qué encoda:** estructura de 6 pasos apertura→cierre (doc `04` §6.1); diferencias WhatsApp vs voz, verificación de identidad obligatoria (doc `04` §6.2); "lo que nunca debe decir el agente de voz" (doc `04` §6.3); voz DJ-FM nocturno / análisis de sentimiento → bajar el ritmo ante angustia (doc `02` §1.8, doc `01` §6.1); guion de voz completo (doc `04` §11.10); guion de voz para hardship y para agresivo (doc `03` §3.1, §3.11).
- **Fuente:** doc `04` §6, §11.10; doc `02` §1.8; doc `01` §6.1; doc `03` §3.1, §3.11.

---

### 2.12 `cobranza-metricas-experimentacion` — medir lo que mueve la aguja

- **Propósito.** Instrumentar y optimizar: definir y trackear los KPIs que importan (liquidation, roll, cure, RPC, PTP, PTP-kept, cost-per-peso, % auto-resuelto, opt-out/quejas, escalamiento a humano), y correr **champion/challenger con holdout** sobre cada guion/secuencia para validar el lift real en Colombia.
- **Cuándo la usa el agente.** En segundo plano, continuamente: registra eventos por contacto, atribuye resultados por plantilla/etapa/hora, y selecciona variantes ganadoras. Alimenta de vuelta a `segmentacion-cadencia` y `nudges-conductuales`.
- **Qué encoda:** tabla de KPIs maestros + fórmulas + cadena causal (doc `01` §8); champion/challenger con holdout y versionado de guiones (doc `01` §8.1); métricas de tono/mensaje a instrumentar + A/B testear honestamente (sin técnicas excluidas) (doc `04` §14); timing óptimo dentro de la ventana legal (doc `04` §9); "las cifras US/UK son hipótesis a validar localmente" (docs `04` §0, `06` advertencia 4).
- **Fuente:** doc `01` §8; doc `04` §9, §14; doc `06` "sentido crítico".

---

## 3. Composición típica por etapa (cómo se combinan en runtime)

| Etapa | Objetivo | Skills que se activan (orden lógico) |
|---|---|---|
| **S0** pre/recordatorio | prevenir el roll, self-cure silencioso | `segmentacion-cadencia` → `saludos-apertura` → `nudges-conductuales` → `tono-whatsapp` → `compliance` (gate) → `metricas` |
| **S1** mora temprana | resolver rápido, activar autoservicio | + `objeciones` (si responde) → `ptp-compromisos` (si promete) |
| **S2** mora establecida | diagnóstico capacidad/voluntad, plan | + `empatia-deescalacion` → `negociacion` → `planes-pago-hardship` → `ptp-compromisos` |
| **S3** mora media | acuerdo formal, reducir roll | + `script-voz` (escalón mayor esfuerzo) → `reenganche` (si ghosting/PTP rota) |
| **S4** mora tardía | maximizar recuperación pre-castigo | `negociacion` (criterios objetivos, BATNA honesto) → `compliance.requiresHumanReview` ✅ |
| **S5** pre-jurídico | decisión de escalamiento | `compliance` **human-in-the-loop obligatorio** → comunicación factual, sin amenazas |

> En **toda** etapa, `cobranza-compliance-guardrails` envuelve la salida: valida horario/frecuencia/canal/destinatario antes de programar, y honestidad/prohibidos/disclosures/opt-out antes de enviar.

---

## 4. Tabla maestra: skill → documentos fuente → libros

| Skill | Docs fuente | Libros / fuentes primarias (doc `06`) |
|---|---|---|
| **cobranza-compliance-guardrails** (transversal) | `05` (maestro), `01` §0/§9/§11, `02` §0, `03` §1/§6/§7, `04` §2/§12/§13 | Ley 2300/2023; T-323/2024; Ley 1581/2012; Ley 1266/2008 + 2157/2021; Ley 1480/2011; Circular SIC 001/2025; **OECD — Behavioural Economics & Financial Consumer Protection** |
| **cobranza-segmentacion-cadencia** | `01` §3–§4/§9, `03` §2, `04` §10 | McKinsey (behavioral insights, customer mandate, seven pillars); C&R Software; Experian (champion/challenger) |
| **cobranza-saludos-apertura** | `04` §3/§4/§6.1/§11, `02` §1.6 | **Never Split the Difference** (Voss); **Magic Words** (Berger); Guía Lenguaje Claro DNP |
| **cobranza-empatia-deescalacion** | `04` §7, `02` §1/§2.1/§4.1, `03` §3.11 | **Nonviolent Communication** (Rosenberg); **Crucial Conversations**; Difficult Conversations; Never Split the Difference (Voss) |
| **cobranza-objeciones** | `03` §3/§5/§6, `04` §7.3 | **Getting Past No** (Ury); **A Complaint Is a Gift**; Professional Debt Collection Skills (Assey) ⚠️; Walsh ⚠️ |
| **cobranza-negociacion** | `02` §1.4-1.5/§2/§3/§4, `01` §6 | **Getting to Yes** (Fisher/Ury/Patton); **Never Split the Difference** (Voss); **Influence + Pre-Suasion** (Cialdini); Getting More (Diamond); Influence Is Your Superpower (Chance) |
| **cobranza-planes-pago-hardship** | `03` §4/§3.1/§3.9/§3.10, `01` §5, `02` §5.2 | **Scarcity** (Mullainathan & Shafir); Asobancaria Guía 2022; Professional Debt Collection Skills (Assey) ⚠️ |
| **cobranza-ptp-compromisos** | `01` §7, `02` §5.2, `04` §11.6-11.8, `03` §3.6 | **Influence** (compromiso/consistencia, Cialdini); BehavioralEconomics.com — Psychology of Debt Collection; **Nudge** (Thaler & Sunstein) |
| **cobranza-reenganche** | `03` §3.7/§3.8, `02` §5.2, `01` §7.2 | **Switch** (Heath); Getting Past No (Ury); Scarcity |
| **cobranza-nudges-conductuales** | `01` §6/§5/§3.1, `02` §5, `04` §8 | **Nudge** (Thaler & Sunstein); **Thinking, Fast and Slow** (Kahneman); BehavioralEconomics.com art.; Switch; Predictably Irrational |
| **cobranza-tono-whatsapp** | `04` §3/§5/§11 | **Magic Words** (Berger); Made to Stick; Words That Work (Luntz) ⚠️; Guía Lenguaje Claro DNP; Kleva/Colektia (microcopy CO) |
| **cobranza-script-voz** | `04` §6/§11.10, `02` §1.8, `01` §6.1, `03` §3.1/§3.11 | **Never Split the Difference** (Voss, voz DJ-FM); Crucial Conversations; Tratta/Prodigal/CloudTalk (scripts voz) |
| **cobranza-metricas-experimentacion** | `01` §8, `04` §9/§14, `06` advertencias | McKinsey (seven pillars); Experian/indebted/FICO (champion/challenger); Tratta/OpsDog (KPIs) |

> ⚠️ = libro internacional con técnicas que deben **filtrarse contra Ley 2300** (terceros, frecuencia, presión) antes de codificar. Negrita = fuente primaria de esa skill.

---

## 5. Top 5–8 libros a descargar PRIMERO

Orden de prioridad para empezar a construir (los 4 primeros son must-have absolutos; el resto, alto valor por costo de lectura).

1. **Marco legal colombiano** (Ley 2300/2023 + T-323/2024 + Ley 1581/2012 + Ley 1266/2008 + Ley 1480/2011 + Circular SIC 001/2025) — **gratis, oficial** (Función Pública / SUIN-Juriscol / Corte Constitucional / SIC). Es la base de `cobranza-compliance-guardrails`, que filtra todo lo demás. **Sin esto no se codifica nada.**
2. **Never Split the Difference** — Chris Voss. Empatía táctica, labeling, mirroring, preguntas calibradas, "así es". Alimenta `saludos-apertura`, `empatia-deescalacion`, `negociacion`, `script-voz`.
3. **Influence + Pre-Suasion** — Robert Cialdini. 7 principios en modo "detective" (uso ético). Núcleo de `negociacion` y `nudges-conductuales`; el guardrail de honestidad nace aquí.
4. **Getting to Yes** — Fisher, Ury & Patton. Negociación basada en principios (intereses, opciones, criterios objetivos, BATNA). Base de `cobranza-negociacion`.
5. **Scarcity** — Mullainathan & Shafir. Por qué el deudor en estrechez evade/no decide → justifica empatía + simplificación. Base de `planes-pago-hardship` y `debtor-psychology`.
6. **Nudge (Final Edition)** — Thaler & Sunstein. Defaults, simplificación, arquitectura de decisión honesta. Base de `nudges-conductuales` y `ptp-compromisos`.
7. **Guía de mejores prácticas en cobranza 2022 — Asobancaria** — **gratis, PDF**. La referencia colombiana del sector; traduce los principios globales al contexto y lenguaje local. Núcleo de la cadencia local.
8. **Nonviolent Communication** — Marshall Rosenberg. Validar antes de proponer, sin juicio. Núcleo del tono de `empatia-deescalacion`.

> Complementos gratuitos de alto retorno inmediato: **BehavioralEconomics.com — "The Psychology of Debt Collection"** (técnicas testeables ya) y **OECD — Behavioural Economics & Financial Consumer Protection** (distinguir nudge legítimo de manipulación, alinea con compliance).

---

## 6. Notas de construcción

- **Empezar por `cobranza-compliance-guardrails`.** Es prerequisito de todo. Hasta que el gate de horario/frecuencia/canal/honestidad/human-in-the-loop esté funcionando, ninguna skill de cara al deudor debe poder emitir.
- **Las skills de cara al deudor producen "intención + variables", no texto final.** El render a español colombiano lo hacen `tono-whatsapp` / `script-voz`, que aplican Lenguaje Claro y el filtro de palabras prohibidas. Esto evita duplicar copy y centraliza el control de tono.
- **Toda cifra de lift es hipótesis.** Las estadísticas de los docs vienen de US/UK/crédito de consumo; `metricas-experimentacion` debe validarlas en arrendamiento residencial colombiano por WhatsApp/voz antes de tratarlas como metas (docs `04` §0, `06` advertencia 4).
- **Reuso entre repos.** Estas skills viven en el microservicio `Leasefy/agent` (no en este frontend); el frontend solo consume vía HTTP. La taxonomía es agnóstica de implementación: cada skill = un prompt/módulo componible + sus parámetros.
- **Revisión legal periódica.** La regulación de IA y datos en Colombia evoluciona (Circular 001/2025, CONPES 4144, proyecto de ley de datos): revisar `cobranza-compliance-guardrails` cada 6 meses (doc `05` cierre). No es asesoría legal; validar con counsel antes de producción.

---

*Síntesis de los documentos 01–06 de `/claudedocs/cobranza-research/`. Toda técnica pasó por el filtro legal colombiano (doc `05`); lo no conforme se excluyó. Las skills de cara al deudor emiten español colombiano "usted", neutral-formal, de baja complejidad lectora.*
