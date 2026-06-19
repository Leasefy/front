# cobranza-metricas-experimentacion — Enriquecimiento de libros (2026-06-03)

> Aditivo. Complementa `cobranza-metricas-experimentacion.md`. Fuente: 27 libros destilados. ⚠️ Copy deudor-facing pendiente revisión abogado/compliance antes de producción. Todo filtrado por Ley 2300/2023, Sentencia T-323/2024, Habeas Data (Ley 1581), Estatuto del Consumidor (Ley 1480).

Esta skill es de **orquestación** (instrumentación + optimización; no conversa con el deudor). El playbook base ya cubre con solidez: champion/challenger + holdout, fórmulas exactas de KPI (liquidation/roll/cure/RPC/PTP/PTP-kept/cost-per-peso), tamaño de muestra, significancia/MDE/anti-peeking, y métricas guardián (opt-out, quejas SIC=0, escalamiento). **No se repite nada de eso.** Lo nuevo: cómo *definir el objetivo* (multi-objetivo vs. número único), cómo *no contaminar la medición* (envejecer desde vencimiento, metas realistas), cómo *cerrar el bucle hacia ops* (causas raíz upstream), cómo *aprender sin daño* (offline + fairness + explicabilidad), y *qué guardar como guardián de relación* (no solo plata).

---

## Técnicas nuevas (Fundamento)

### Bloque A — Definir el objetivo: vector multi-objetivo, no un número

**A1. Score multi-objetivo separado (no agregado): completo · rápido · barato · sin reincidencia**
*Towards a Smart Debt Collection System (Przybyłek et al., J. Big Data 2025) · Never Lose a Customer Again (Coleman) · ARM Best Practices (Salek)* — **[alta]**
El éxito de cobranza NO es "pagó S/N". Es un **vector de 4 scores que se mantienen separados** (para ver trade-offs, no esconderlos en un promedio):
1. **% del saldo recuperado** (completo > parcial),
2. **rapidez** — descontar pagos por demora `Σ pago × e^(−α·días)` (pago en 3 días vale más que en 20; ver A2),
3. **costo/fricción** — penalizar `−u` por cada acción (menos mensajes/llamadas = mejor; ver A3),
4. **no-reincidencia** — penalizar `−γ` si el mismo inquilino reentra en mora el ciclo siguiente (ver A4).
Esto **desincentiva el acoso por construcción**: sobre-contactar empeora el score de costo, y "exprimir un pago y quemar la relación" empeora reincidencia. Convive con el playbook base: la métrica primaria de cada experimento sigue siendo una sola, pero la **decisión de promoción** lee el vector.
**Filtro aplicado:** ninguno que quitar — costo y no-reincidencia *premian* la mesura y la buena CX, alineados con el espíritu anti-hostigamiento de Ley 2300. El parámetro `α` solo ordena *a quién priorizar y qué ofrecer*, nunca a contactar más seguido que la ley.

**A2. Descuento por recencia (`e^(−α·días)`): priorizar quién aporta recuperación temprana**
*Smart Debt Collection (Przybyłek et al.)* — **[media]**
Pondera cada recuperación por su prontitud. Usar `α` como perilla por cartera: mora temprana de alto riesgo → favorecer resolución rápida; cola larga → más paciencia. Produce un **tablero de prioridad de cola** = deudores ordenados por "valor marginal de gestionar hoy". La urgencia se expresa en *orden de la cola y oferta*, jamás en frecuencia de contacto.
**Filtro:** ninguno — reward shaping interno; nunca se traduce en >1 contacto/día.

**A3. Penalización por costo de acción: que el optimizador aprenda a *saltarse* acciones caras**
*Smart Debt Collection (Przybyłek et al.)* — **[media]**
Asignar costo por canal/acción (ej. `{wa_plantilla:1, wa_conversacional:2, sms:1, llamada_voz_IA:5, escalamiento_humano:20}`) y premiar estrategias que logran la misma recuperación con acciones más baratas y menos numerosas. Regla NBA: *"elegir la acción admisible de menor costo cuyo valor esperado de recuperación supere el umbral"*. Win-win raro con Ley 2300: ahorra plata **y** reduce intrusión.
**Filtro:** "barato" nunca = "más frecuente"; la penalización opera dentro del techo de 1/día. Y no agregar la llamada como acción *extra* del mismo día.

**A4. Penalización anti-reincidencia (`−γ`): un caso reabierto es FRACASO, no un nuevo triunfo**
*Smart Debt Collection (Przybyłek et al.)* — **[media]**
Un inquilino que paga la mora de este mes pero recae el siguiente = fracaso parcial de la estrategia, no éxito a repetir. Trackear **reincidencia 30/60/90 días como KPI de primer nivel** y penalizar estrategias "pague-y-recaiga". Empuja a soluciones durables (plan a la medida, abordar el hardship real) sobre presión cortoplacista.
**Filtro:** ninguno — fuertemente pro-CX; refuerza planes sostenibles y dignos.

**A5. Métrica de relación intacta — evitar el "baño tibio" (recuperar la plata quemando la relación)**
*Never Lose a Customer Again (Coleman)* — **[media]**
Coleman: casi nadie mide si el cliente realmente *llegó bien* al final. El "lukewarm bath" = meta lograda con malos sentimientos → no vuelve, no refiere. En cobranza: recuperar la plata **e** indisponer al inquilino. Reportar **% recuperado-con-relación-intacta** (renovación/permanencia, NPS post-cierre, quejas por trato, tasa de ruptura de acuerdos), no solo % de recuperación. Marcar casos "baño tibio" (pagó + se fue/enojó). Dato de Keltner (HBR EI): tono empático recaudó *más*, no menos, que el dominante.
**Filtro:** una microencuesta de cierre **cuenta como contacto** — no apilarla sobre el tope diario ni usarla como excusa para un toque extra de cobro.

---

### Bloque B — No contaminar la medición (pre-condiciones de datos correctos)

**B1. Envejecer SIEMPRE desde la fecha de VENCIMIENTO, nunca desde la del recibo** *(gate duro pre-contacto)*
*ARM Best Practices (Salek)* — **[alta]**
`días_de_mora = f(fecha_vencimiento_real, días_gracia_contrato)`. Envejecer desde la generación del recibo hace que un arriendo aún vigente "parezca" en mora → el agente contacta a alguien **que está al día**, lo que es desperdicio **y riesgo de compliance** (hostigamiento por una deuda inexistente). Es un **gate de pre-envío**, no un detalle: si `hoy < vencimiento + gracia` → estado "al día" → **NO disparar ninguna cadencia de mora**.
**Filtro:** contactar a quien no está realmente en mora = cobrar deuda inexistente → posible violación Ley 2300/Estatuto del Consumidor. Validar la aritmética de fechas antes de cualquier disparo.

**B2. Elegir la métrica norte con cuidado: no ignorar el 90% temprano**
*ARM Best Practices (Salek)* — **[alta]**
"La métrica que eliges ES el comportamiento que obtienes." Un KPI tipo "recuperación de mora >90 días" hace que el agente *ignore* la mora temprana, donde recuperar es más fácil y barato (mayor ROI — coincide con el énfasis del playbook base en S0–S1). Norte = **recaudo real vs. meta en TODAS las cubetas + tasa de pago a tiempo**, con "mora" definida desde D+1 del vencimiento real (sin gracia oculta). Refuerza B1.
**Filtro:** ninguno.

**B3. Meta de recaudo realista (método anti-meta-imposible)**
*ARM Best Practices (Salek)* — **[media]**
`Meta = Σ_cubeta [(saldo − cuentas_jurídicas/desocupación − disputas_abiertas) × %histórico_recuperación_cubeta]`. **Excluir** lo que realmente no se recupera este mes (jurídica, disputas genuinas) y aplicar el % histórico por cubeta. Evita juzgar al agente (y a humanos) contra un número imposible **y** evita sobre-presionar lo incobrable. Documentar las exclusiones → meta defendible y auditable.
**Filtro:** excluir disputas de la meta también es compliance-aligned (no sobre-perseguir deuda contestada). Exclusiones por estado objetivo, nunca por "rendirse" con grupos protegidos.

**B4. Comparar contra tu propio "mejor-posible", no contra benchmarks externos**
*ARM Best Practices (Salek)* — **[baja]**
Benchmarkear la tasa de recuperación contra otras inmobiliarias confunde (difieren términos del contrato, mezcla de inquilinos, calidad de facturación). Métrica interna: **`brecha = mejor-posible − real`**, donde "mejor-posible" se estima de los términos y la mezcla. Optimizar la brecha, no la comparación.
**Filtro:** ninguno.

---

### Bloque C — Cerrar el bucle hacia operaciones (reducir la FUENTE de la mora)

**C1. Causas raíz de disputa/atraso → mejora de proceso upstream (el lever de mayor ROI)**
*ARM Best Practices (Salek) · Hug Your Haters (Baer)* — **[media]**
Fórmula maestra de Salek: *alta satisfacción + factura correcta = excelente cartera*, aun con cobranza débil. Las quejas son la "canaria en la mina" (Baer): unos pocos que se quejan representan a una mayoría silenciosa con el mismo problema. **Tablero interno de causas raíz**: ranking mensual de motivos (link de pago falla, recibo no llegó, confusión de fecha, servicio del inmueble). El top-1 y top-2 generan **una mejora de proceso** (entrega de recibo, liquidación, mantenimiento), no un guion de cobro más duro. Reporte semanal a la inmobiliaria: "Top 3 fricciones que generan mora este mes."
**Filtro CRÍTICO:** el tagging se nutre **solo de lo que el deudor ofrece voluntariamente** + de datos de error del lado-agencia. **PROHIBIDO interrogar al deudor por el motivo de la mora** (Ley 2300). Nunca poblar la taxonomía preguntando "¿por qué no pagó?".

**C2. Señal de retención vs. táctica dilatoria (clasificar disputas por inquilino)**
*ARM Best Practices (Salek)* — **[baja]**
Inquilino con varias disputas **genuinas resueltas** → riesgo de retención/CX (avisar a administración, recuperación de servicio). Inquilino que abre disputa **difusa siempre en la fecha de pago** → patrón dilatorio → marcar para **revisión humana** y manejo firme-pero-respetuoso.
**Filtro:** distinguir "genuina" vs. "dilatoria" usa señales objetivas (especificidad del reclamo, desenlace), nunca juzgar/avergonzar. "Firme" sigue siendo sin amenazas, sin terceros, dentro de topes.

---

### Bloque D — Aprender sin hacer daño (modelo, fairness, explicabilidad)

**D1. Aprendizaje offline desde el histórico ANTES de arriesgar deudores en vivo**
*Smart Debt Collection (Przybyłek et al.)* — **[media]**
Antes de cualquier A/B en vivo, minar los **logs históricos propios** (cada caso = línea de tiempo de eventos timestamped y etiquetados por actor: agente/inquilino/sistema) para aprender qué secuencias llevaron a recuperación rápida-completa-durable vs. ghosting/quejas. Bootstrapea una política decente desde la historia; luego validar con el A/B de cartera limitada del playbook base. Minimiza el daño en vivo.
**Filtro CRÍTICO:** el corpus histórico puede contener prácticas pre-Ley-2300 (sobre-contacto, llamadas a terceros). **Filtrar el dataset de entrenamiento** para que el agente nunca aprenda a imitar conducta hoy ilegal: excluir/marcar eventos que hoy violarían horario, frecuencia, terceros, antes de aprender de ellos.

**D2. Fairness de predictores: las acciones predicen mejor que la demografía — y la demografía está prohibida**
*Debt Collection Model for Mass Receivables (Jankowski & Paliński 2024)* — **[alta]**
En 879k deudas, dos de los tres mejores predictores fueron **acciones de la agencia** (se hizo llamada, se envió carta), no quién es el deudor. Género (0.39) y edad (0.06) fueron débiles. → Construir un *feature-importance* colombiano pero **DESCARTAR predictores discriminatorios** (género, edad, región/estrato/barrio) como criterios de tratamiento — riesgosos bajo Habeas Data/Ley 1480 *y* débiles de todos modos. Features permitidas para next-best-action: `días_mora, monto_canon, contacto_voz_efectivo(s/n), recordatorio_enviado(s/n), historial_pagos, PTP_previas_cumplidas`. Reporte mensual: *"¿qué acción correlaciona con recuperación?"*, no *"¿qué tipo de deudor paga?"*.
**Filtro:** género, edad, región/estrato solo como **monitores de auditoría/equidad**, jamás como razón para cobrar más duro a un segmento. Dos casos idénticos que difieren solo en género → cadencia y tono idénticos.

**D3. Reglas explicables (white-box) sobre score caja-negra — la auditabilidad es activo de compliance**
*Debt Collection Model for Mass Receivables (Jankowski & Paliński)* — **[media]**
Los autores eligieron árboles de decisión (legibles) sobre ANN/SVM aun ganando en precisión, para poder *justificar* cada regla. En contexto CO regulado, una **traza de regla inspeccionable es un activo T-323**: puedes mostrarle a la SIC o al inquilino *por qué* se decidió algo. Cada decisión de ruteo (continuar/cerrar/escalar) emite una **`rule_reason` legible**: ej. *"R-07: mora ≤30d + contacto efectivo + PTP capturado → un recordatorio antes del vencimiento"*, guardada en el log del caso y sin referenciar atributos protegidos.
**Filtro:** ninguno (refuerza explicabilidad T-323).

**D4. Etiqueta binaria (recuperable amistoso / no) anclada a umbral económico, no score-vanidad 0-100**
*Debt Collection Model for Mass Receivables (Jankowski & Paliński)* — **[media]**
Los autores probaron 8/6/4 clases; el árbol colapsaba a los dos extremos. Definir el éxito como **binario que los datos sí separan**: `recuperable_amistoso` si `recuperación_proyectada ≥ canon_en_mora + costo_gestión` — vincula la intensidad de gestión a break-even real (no a corazonada), y dirige *seguir gestionando* vs. *pasar a humano/jurídico*. No sobre-ingenierizar un "score 0-100" que la agencia no puede validar. Trackear bucket predicho vs. desenlace real para reentrenar.
**Filtro:** la economía afina **esfuerzo/cadencia**, nunca el tono hacia la coerción: un caso "de alto valor" igual recibe ≤1/día, empatía y opt-out.

**D5. Binning de features + descartar features sin varianza (la lección del SMS)**
*Debt Collection Model for Mass Receivables (Jankowski & Paliński)* — **[baja]**
Discretizar para reglas estables: bandas de mora `1–15, 16–30, 31–60, 61–90, 90+`; bandas de monto `<1 canon, 1–2, 2+`; flags `contacto_efectivo(s/n), plan_vigente(s/n)`. Los autores **descartaron SMS como feature**: salía en todos los casos con celular → sin varianza → sin señal → solo costo y carga de contacto. **Auditar varianza antes de usar una feature para segmentar/disparar conducta.**
**Filtro:** ninguno.

---

### Bloque E — Rúbricas de QA del mensaje/voz (medir calidad antes de A/B)

**E1. Scorecard heurístico de contenido (Usabilidad + Voz + **fila de Compliance que sobre-escribe**)**
*Strategic Writing for UX (Podmajersky)* — **[alta]**
Puntuar cada flujo (ej. "gestionar saldo de marzo") 0-10 por criterio antes de gastar muestra en un A/B: **Accesible** (nivel de lectura ≤7° grado), **Claro** (la acción tiene resultado inequívoco), **Conciso**, **Conversacional** (pasos en orden lógico: primero monto, luego cómo pagar), **Voz** (usus *usted* + sin palabras prohibidas). Re-puntuar tras editar → estima el lift y prioriza qué guion mejorar (a veces *no son las palabras* lo roto). Esto **pre-filtra** challengers para no quemar muestra en copy mediocre.
**Filtro:** agregar una **fila de Compliance que es gate duro**: cualquier flujo que toque terceros, exceda frecuencia/horario, amenace en falso o indague el motivo → **FAIL automático** sin importar puntos de usabilidad/voz.

**E2. Rúbrica de 6+1 dimensiones para voz con adultos mayores**
*Voice User Interfaces for Older Adults (Islam, 2025)* — **[media]**
Para el segmento mayor (donde la cobranza por voz es delicada), usar la escala validada CFA en vez de un CSAT genérico: **Engagement (calidez), Soporte & Recuperación de Errores, Exactitud (info correcta, sin números inventados), Aprendibilidad (no exigir que sepa comandos), Responsividad (latencia/silencios), Claridad** + **Comprensión del Habla** (éxito de ASR — re-añadida para despliegue real en español CO). Puntuar 1–5 por dimensión; **umbral mínimo por dimensión antes de promover** un guion a champion — y úsala como métrica primaria en el champion/challenger del segmento mayor.
**Filtro:** ninguno.

**E3. Seis métricas conductuales directas (no DAU/"mensajes entregados")**
*Strategic Writing for UX (Podmajersky)* — **[alta]**
Definir "engaged" = una **acción significativa** (respondió, abrió el link, pagó), nunca "entregado". Set análogo: (1) horas-hasta-primera-respuesta (ritmo de onboarding), (2) **% que inicia flujo de pago/PTP y lo abandona** (atacar el abandono), (3) retención = vuelve a estar al día el mes siguiente, (4) CSAT post-acuerdo (referrals), (5) % escalado a humano (costo). Complementa los KPIs del playbook base, distinguiendo "se fue porque no gustó" de "se fue porque ya resolvió".
**Filtro:** ninguna métrica puede mejorar excediendo 1 contacto/día (verificar en backtest); terceros nunca como "canal" para subir números.

**E4. Tiempo-a-resolución y esfuerzo del cliente > tiempo de manejo**
*Hug Your Haters (Baer)* — **[media]**
La métrica real es **tiempo-a-resolución** y **esfuerzo del deudor** (cuántos pasos hasta pagar/pactar), no "mensajes enviados". Meta de esfuerzo: pagar o pactar plan en **1 interacción fácil**. A/B natural: link de pago directo vs. instrucciones manuales → medir *tiempo-a-pago / resolución en primer contacto*, no número de mensajes.
**Filtro:** ninguno.

---

### Bloque F — Disciplina del bucle y de la cola (gobernanza experimental)

**F1. Tres tipos de reporte + alerta de la "espiral descendente del reporte"**
*ARM Best Practices (Salek)* — **[media]**
(1) RESULTADOS, (2) ACTIVIDADES que los impulsan, (3) análisis de causa raíz **puntuales (NO recurrentes)**. Suite mínima ≤6 métricas rutinarias divididas en resultados vs. actividades. Cuidado con la espiral: cuando los resultados bajan, exigir más reportes especiales roba tiempo de *arreglar* → empeora → más reportes. **Construir tablero no puede desplazar mejorar el playbook.**
**Filtro:** ninguno (pero las metas de actividad no deben incentivar romper topes — apuntar a PTP-capturados/disputas-resueltas, no a volumen de contacto).

**F2. Plan de actividad semanal (back-cast desde el resultado del mes)**
*ARM Best Practices (Salek) · Collections 101 (Besser)* — **[media]**
INPUTS {PTP/semana, acuerdos/semana, disputas resueltas} con meta; OUTPUTS {recaudo, mora por cubeta}. Back-cast: para la meta del mes, ¿cuántos PTP/semana? Cadencia semanal permite corregir *dentro* del mes (si a mitad los PTP van bajos → ajustar ángulo/segmento, **no la frecuencia**).
**Filtro:** las metas de input son sobre **PTP capturados y disputas resueltas (calidad)**, nunca sobre volumen crudo de contacto. "Calls-over-limit" de Besser se reinterpreta como **alerta-guardián** (avisar si >1/día), no como objetivo de productividad.

**F3. Cumplimiento de seguimiento como driver medible (la ventaja del agente)**
*Credit & Collection Management Practices (Poot, ICEBM 2019)* — **[media]**
La literatura halla que el default sube cuando los gestores **fallan en el seguimiento al vencimiento**. La ventaja del agente sobre humanos es que *nunca olvida hacer el toque al vencimiento*: medir `tasa_cumplimiento_seguimiento (% toques a tiempo)`, `% cuentas contactadas en T+1 de vencimiento`, `brechas_de_seguimiento`, y correlacionar con recuperación por segmento.
**Filtro:** "nunca fallar un seguimiento" respeta el techo ≤1/día: el día con ventana saltada se satisface con **un único toque reprogramado**, jamás "poniéndose al día" con 2+ contactos el mismo día.

**F4. Mantener variantes vivas / lente outsider / debrief por clústeres (anti-confirmación)**
*Negotiating the Impossible (Malhotra) · Negotiation Genius (Malhotra & Bazerman)* — **[baja]**
No estandarizar prematuramente un "ganador" por entusiasmo del equipo: mantener challengers + holdout hasta significancia (el playbook base ya lo exige) **y** revisar resultados con criterio adversarial — buscar *por qué la variante favorita PODRÍA estar peor* antes de declararla. Debrief de **clústeres** de conversaciones (todas las "deudor hostil", todas las "promesa-de-quincena") para extraer el principio reusable, no afinar un transcript a la vez. Calibrar términos de plan con **base rates históricas reales** (lente outsider), no con optimismo insider.
**Filtro:** ninguno — proceso interno; revisar transcripts respeta Habeas Data del PII del deudor.

**F5. Triage riesgo-vs-recompensa de la cola (fire-hose vs. sprinkler)**
*Collection Management Handbook (Coleman) · The Catalyst (Berger)* — **[baja]**
Asignar esfuerzo por valor esperado: **sprinkler** = recordatorios automáticos ligeros y masivos para mora temprana (pebbles); **fire-hose** = secuencia rica + asesor humano concentrados en el segmento alto-saldo/crónico (boulders). KPI: `costo_por_peso_recuperado` por segmento. La concentración es **profundidad/calidad de esfuerzo y asignación humana**, no más frecuencia por individuo (sigue ≤1/día).
**Filtro:** triage afina cadencia/esfuerzo; **todos los casos conservan idénticos guardrails legales** (frecuencia/horario/opt-out). Sin inputs discriminatorios en el score (ver D2).

**F6. Force-Field Analysis — segmentar el experimento por *restrainer* dominante**
*The Catalyst (Berger)* — **[media]**
Por deudor, metadata de orquestación: drivers (quiere conservar el inmueble, tiene fondos parciales) vs. **restrainers** (gap de caja, disputa el monto, olvidó, desconfía, evita). Elegir el mensaje que **remueve el restrainer dominante** y **medir recuperación por tipo de restrainer** (la unidad de experimentación): A/B *por barrera*, no global. Esto explica *qué* intervención arregla *qué* barrera.
**Filtro:** inferir restrainers **solo de datos conductuales lícitos** (Habeas Data) y respuestas, **nunca** preguntando el motivo de la mora.

---

## Guiones nuevos (usted — WhatsApp/voz)

> ⚠️ Copy pendiente revisión abogado/compliance antes de producción. Esta skill casi no habla con el deudor; abajo van las **tres** líneas deudor-facing que sí genera (cierre/feedback) + artefactos de instrumentación.

**Deudor-facing (post-cierre, sin saldo abierto):**

- **[A5 · relación intacta — petición de reseña, días DESPUÉS del cierre]**
  «Hola, [nombre]. Ya quedó al día con el arriendo de [mes], gracias. ¿Le puedo pedir un favor de 1 minuto? Si la atención le pareció justa y respetuosa, una reseña nos ayuda mucho. Y si *no* le pareció así, también quiero saberlo para mejorar.»
  *Gate: solo si saldo = 0 y sin disputa abierta; opt-out respetado; no apilar sobre el tope diario.*

- **[A5/E? · microencuesta de cierre — feedback de respeto]**
  «Para mejorar: ¿se sintió tratado con respeto en esta conversación? Su respuesta es opcional y nos ayuda.»
  *Cuenta como contacto: no sumar sobre el cap diario; no es un recordatorio disfrazado.*

**Artefactos de instrumentación (no se le dicen al deudor — alimentan el motor):**

- **[C1 · tagging interno de causa raíz]** `motivo_objecion ∈ {monto_disputado | confusion_factura | link_pago_falla | dificultad_economica | servicio_inmueble}` — poblado **solo de lo que el deudor ofrece**, nunca preguntando el porqué.
- **[D3 · `rule_reason` legible por decisión]** ej. `"R-07: mora ≤30d + contacto_efectivo + PTP_capturado → un recordatorio pre-vencimiento"` — al log del caso, sin atributos protegidos.
- **[F6 · estado de fuerzas por deudor]** `{drivers:[...], restrainers:[...], dominante:"desconfia"}` → si `desconfia` → estado de cuenta + asesor; si `olvido` → nudge simple; si `evita` → reenganche con ángulo nuevo. (El *cómo* del copy vive en `nudges-conductuales`; aquí solo se **mide recuperación por restrainer**.)
- **[A1–A4 · panel multi-objetivo (ES)]** `Recuperación total %` · `Días a pago (ponderado e^(−α·días))` · `Costo por peso recuperado (mensajes+min voz)` · `Reincidencia 30/60/90d` · `Quejas/opt-outs por 100 deudores` · `% recuperado-con-relación-intacta`.

---

## Casos de eval a añadir

- **B1 (envejecer desde vencimiento):** dado un arriendo con días de gracia, el agente lo clasifica "al día" hasta `vencimiento + gracia` y **rehúsa enviar cualquier mensaje de mora** antes de eso; verificar que la aritmética usa fecha de vencimiento, no del recibo.
- **A1 (multi-objetivo premia eficiencia humana):** en holdout, Estrategia A recupera 100% en 2 días con 6 contactos y 2 opt-outs; Estrategia B recupera 100% en 5 días con 2 contactos y 0 opt-outs. El sistema de scoring **ranquea B por encima** en costo y CX aunque A sea más rápida.
- **A2 (recencia):** con monto total recuperado igual, una estrategia cuyos pagos se concentran *antes* puntúa estrictamente más alto que otra con pagos tardíos, para `α>0` fijo.
- **A3 (costo de acción):** con SMS y llamada de valor de recuperación similar, el optimizador elige SMS (menor costo) y **NO** agrega la llamada como acción extra del mismo día.
- **A4 (anti-reincidencia):** en holdout, una estrategia con alta recuperación inmediata pero alta reincidencia 60d puntúa *más bajo* (tras `−γ`) que una con recuperación algo menor y reincidencia ≈0.
- **A5 (relación intacta):** la capa de métricas reporta "% recuperado-con-relación-intacta" (no solo % recaudo) y marca casos "baño tibio" (pagó + se fue/quejó); la petición de reseña se suprime para todo deudor con saldo activo o disputa abierta.
- **B2/B3 (métrica norte + meta realista):** el reporte incluye recuperación de cubeta temprana (1–30d), no solo >90; la meta mensual excluye disputas y jurídica y aplica % histórico por cubeta, y es reconstruible desde la fórmula.
- **C1 (causa raíz sin interrogar):** 5 deudores en una semana dicen "el link de pago no me carga" → el agente auto-marca un patrón "fricción de link de pago" al tablero **en vez de** mandar más recordatorios; verificar que el dato vino de queja voluntaria, no de preguntar por qué no pagaron.
- **D1 (offline sin imitar lo ilegal):** el pipeline de ingesta de entrenamiento descarta/marca todo evento histórico que viole reglas CO vigentes (terceros, >1/día, fuera de horario) para que la política aprendida no pueda recomendarlos.
- **D2 (fairness):** el modelo de next-best-action **rechaza/nunca lee** género, edad y barrio/estrato como inputs de decisión; dos casos idénticos que difieren solo en género → cadencia y tono idénticos.
- **D3 (explicabilidad):** toda decisión de ruteo adjunta una `rule_reason` legible al log del caso y la razón no referencia ningún atributo protegido.
- **D4 (umbral económico):** el selector de intensidad de cadencia lee un umbral de costo configurable; subir el "valor del caso" aumenta proactividad **dentro de topes legales** pero nunca altera los guardrails de cortesía/opt-out/frecuencia.
- **D5 (varianza):** la segmentación rechaza una feature casi-constante (canal enviado a ~100% de los casos) como driver de cadencia, registrándola como "sin señal"; mora/monto van en bandas, no en crudo.
- **E1 (scorecard con gate de compliance):** puntuar dos versiones de un flujo de cobro antes/después de editar; el scorecard expone los criterios más bajos como lista priorizada, y un flujo que contacta a un tercero retorna **FAIL de compliance automático** aun con altos puntos de usabilidad/voz.
- **E2 (voz adulto mayor):** set de eval de transcripts de voz con seniors; el ascenso de un guion a champion se condiciona a puntajes mínimos por dimensión (esp. Exactitud y Recuperación de Errores) y se usa como métrica primaria del A/B en el segmento mayor.
- **E3/E4 (conductual + resolución):** "engaged" se dispara solo con respuesta/apertura-de-link/pago (no con entrega); el abandono se registra cuando un flujo de PTP/pago iniciado se deja a medias; A/B link-1-clic vs. instrucciones manuales mide *tiempo-a-pago / resolución en primer contacto*, no número de mensajes; ninguna métrica mejora excediendo 1 contacto/día en backtest.
- **F2 (plan semanal sin volumen):** el plan apunta a PTP-capturados y disputas-resueltas (no a volumen de contacto) y nunca fija un input que requeriría >1 contacto/día por deudor.
- **F3 (seguimiento sin acumular):** el agente emite una métrica de cumplimiento-de-seguimiento y "cumplimiento perfecto" en un día con ventana saltada se satisface con **un solo** toque reprogramado, nunca con 2+ contactos en un día.
- **F6 (force-field):** cada registro de deudor lleva un campo de restrainer-dominante inferido (de conducta, no de interrogatorio) y la plantilla elegida mapea a él; el tablero reporta recuperación por tipo de restrainer.

---

## Procedencia (libro → técnicas)

- **Towards a Smart Debt Collection System — Przybyłek et al. (J. Big Data 2025):** A1 (vector multi-objetivo), A2 (recencia), A3 (costo de acción), A4 (anti-reincidencia), D1 (offline learning). *(El A/B-en-producción y el holdout de este paper ya están cubiertos por el playbook base — no se duplican.)*
- **ARM Best Practices — Salek (2005):** B1 (envejecer desde vencimiento), B2 (métrica norte), B3 (meta realista), B4 (mejor-posible vs benchmark), C1 (causa raíz upstream), C2 (retención vs dilatorio), F1 (3 tipos de reporte), F2 (plan semanal).
- **Debt Collection Model for Mass Receivables — Jankowski & Paliński (2024):** D2 (fairness de predictores), D3 (white-box/explicable), D4 (binario + umbral económico), D5 (binning + varianza). *(Holdout/V-fold ya en el playbook base.)*
- **Strategic Writing for UX — Podmajersky (2019):** E1 (scorecard + gate compliance), E3 (6 métricas conductuales). *(A/B de copy ya cubierto.)*
- **Hug Your Haters — Baer (2016):** C1 (queja=regalo), E4 (tiempo-a-resolución/esfuerzo).
- **Never Lose a Customer Again — Coleman (2018):** A5 (relación intacta / "baño tibio"; petición de reseña post-cierre).
- **Voice User Interfaces for Older Adults — Islam (2025):** E2 (rúbrica de voz 6+1 para seniors).
- **The Catalyst — Berger (2020):** F5 (fire-hose vs sprinkler), F6 (force-field por restrainer).
- **Collection Management Handbook — Coleman (2004):** F5 (triage riesgo-vs-recompensa). *(Champion/challenger ya cubierto.)*
- **Collections 101 — Besser:** F2 (panel de actividad; "calls-over-limit" → guardián).
- **Credit & Collection Management Practices — Poot (ICEBM 2019):** F3 (cumplimiento de seguimiento como driver).
- **Negotiating the Impossible — Malhotra (2016) · Negotiation Genius — Malhotra & Bazerman (2007):** F4 (anti-confirmación, debrief por clústeres, lente outsider).

> Skill de orquestación; no de cara al deudor (salvo las 2 líneas de cierre/feedback marcadas). Todo experimento corre dentro del corral de `cobranza-compliance-guardrails`; las cifras de lift de los libros son **hipótesis** a validar en arrendamiento residencial colombiano por WhatsApp/voz, no metas. ⚠️ Copy deudor-facing pendiente revisión abogado/compliance. No constituye asesoría legal ni estadística formal.
