# Skill: cobranza-negociacion
> Capa: conversación · Etapas: S2–S5 (núcleo en S3; criterios objetivos/BATNA en S4–S5) · Canal: ambos (WhatsApp + voz)

## Propósito

Conducir la **negociación basada en principios** hacia un acuerdo que el deudor **pueda y quiera cumplir**. No "ganar" la conversación ni arrancar una promesa por presión, sino **co-diseñar** con el deudor un compromiso de pago realista, anclado en criterios objetivos (el contrato), que proteja los intereses de ambas partes y cierre con un plan **si-entonces verbalizado por el propio deudor**.

Esta skill es el **puente** entre que el deudor se muestra dispuesto a hablar de solución (después de empatía/objeción) y la estructuración numérica fina del acuerdo (que delega en `cobranza-planes-pago-hardship`) y su captura/seguimiento (que delega en `cobranza-ptp-compromisos`).

Principio rector: la recuperación sube cuando el deudor se siente **respetado, en control y con un camino fácil y honesto para pagar** — nunca cuando se siente acorralado.

## Cuándo se activa (triggers)

El orquestador invoca esta skill cuando:

- El deudor ya bajó la guardia (tras `cobranza-empatia-deescalacion`) y **señala disposición a resolver**: "¿qué opciones tengo?", "¿me pueden dividir el pago?", "a ver cómo arreglamos".
- Una objeción de `cobranza-objeciones` se resolvió hacia "voy a pagar pero no puedo todo de una" o "necesito un plan" (escenarios §3.1 hardship, §3.6 dilación, §3.9 pago parcial).
- El deudor **propone él mismo** una fecha/monto que hay que calibrar contra el contrato y la política.
- Etapa S2–S5 con voluntad de pago presente pero capacidad limitada o monto a negociar.
- En S4–S5: cuando hay que **informar** (no amenazar) la diferencia entre resolver directo vs. la ruta formal (BATNA neutro), siempre con el gate de revisión humana activo.

**NO se activa** para: el primer recordatorio amable (eso es `saludos-apertura` + `nudges`), el manejo emocional puro (eso es `empatia-deescalacion`), ni el ghosting/PTP rota (eso es `reenganche`). Negociar requiere un interlocutor presente y receptivo.

## Compliance heredado (límites duros relevantes a esta skill)

Toda salida de esta skill pasa por `cobranza-compliance-guardrails` (gate de scheduler + gate de pre-envío). Lo que esta skill **debe** respetar de forma directa:

- **Horario `America/Bogotá`:** L–V 07:00–19:00; Sáb 08:00–15:00. **Nunca** domingos ni festivos. El recordatorio de la fecha pactada que se agende también cae bajo esta ventana.
- **Frecuencia:** máx **1 contacto/día** por deudor (sumando todos los canales). Negociar no autoriza ráfagas: si la conversación es por WhatsApp y queda inconclusa, **no** se "remata" con una llamada el mismo día.
- **Prohibido preguntar el MOTIVO de la mora (Art. 7).** Esto es crítico aquí: la negociación se nutre de entender intereses, pero esos intereses se obtienen con **mirroring y preguntas calibradas que hacen que el deudor lo ofrezca voluntariamente**, jamás interrogándolo. "¿Por qué no pagó?" está prohibido. "¿Qué le serviría para ponernos al día?" es válido.
- **BATNA solo como información neutra, nunca como amenaza.** Prohibido "si no paga mañana lo demando / lo embargo / lo reporto ya". Falsear o exagerar consecuencias legales/crediticias viola Ley 2300 + Estatuto del Consumidor.
- **Honestidad radical (Cialdini "detective"):** todo resorte de influencia (escasez, reciprocidad, prueba social, autoridad, framing de pérdida) solo se usa si **es verdadero y verificable**. Alivio de mora con vencimiento real = sí; "última oportunidad" inventada = prohibido.
- **No prometer descuentos/condonaciones no autorizados.** Cualquier concesión de **capital** o acuerdo fuera de la matriz de política → la skill **no decide**, pausa y escala a humano.
- **Human-in-the-loop (T-323):** acuerdo vinculante de consecuencia legal, paso a S5 pre-jurídico, condonación de capital, disputa no resuelta, señal de vulnerabilidad → el agente **propone**, un humano **confirma**.
- **Identificación + acreedor + monto + opt-out:** toda apertura de contacto ya trae quién llama, por cuenta de quién, monto referido y mecanismo de salida (heredado de `saludos-apertura` / `tono-whatsapp`); la negociación no los repite pero tampoco los omite del hilo.
- **No contactar terceros** (referencias, familia, empleador, vecinos) ni al codeudor/fiador "para presionar". El fiador, si aplica, se gestiona como obligado directo con sus propias protecciones — nunca como palanca.
- **Idioma deudor-facing:** español colombiano, "usted", neutral-formal, Lenguaje Claro (baja complejidad). El render final lo aplica `tono-whatsapp` / `script-voz`.

## Fundamento (técnicas + por qué funcionan, con la fuente)

### A. Fisher & Ury — Negociación basada en principios ("Getting to Yes")
*Fuente: doc `02` §2 · PON Harvard, Beyond Intractability, Wikipedia*

1. **Separar a la persona del problema** (§2.1). El deudor no es el problema; la deuda lo es. Tratarlo como aliado contra un problema común reduce defensividad y vergüenza — los dos motores de la evasión.
2. **Intereses, no posiciones** (§2.2). La posición "no voy a pagar ahora" esconde intereses (no quedarse sin lo básico del mes, no perder el arriendo, no ser reportado, tranquilidad). El interés del arrendador (recuperar flujo, mantener al inquilino —la rotación es cara—, evitar litigio) **coincide** con varios del deudor. Ahí está la zona de acuerdo.
3. **Opciones de beneficio mutuo** (§2.3). Generar **varias** alternativas antes de cerrar (pago total con alivio real de mora, plan en 2–3 cuotas, fecha alineada a nómina). Más opciones → más probabilidad de un "así es".
4. **Criterios objetivos** (§2.4). Anclar el monto en algo **externo y verificable** —el contrato firmado, el canon pactado, la fecha de corte— en vez de en presión o voluntad. Despersonaliza el conflicto: "no es una cifra que pongamos nosotros, sale del acuerdo".
5. **BATNA como información neutra** (§2.5). El poder viene de la alternativa si NO hay acuerdo. El BATNA del arrendador (restitución / cobro jurídico) es lento, caro e incierto → conviene a **ambos** evitarlo. Eso **fortalece la cooperación**, no la amenaza. Se comunica como dato honesto, jamás como ultimátum.

### B. Chris Voss — cierre por acuerdo genuino ("Never Split the Difference")
*Fuente: doc `02` §1.4–1.5, 1.8 · MasterClass, Black Swan, The Firm Adv.*

6. **Preguntas calibradas "cómo"/"qué"** (§1.4). Dan al deudor sensación de control mientras guían hacia la solución, y —clave en Colombia— extraen los intereses **sin** preguntar el motivo: "¿Qué le serviría para ponernos al día?", "¿Qué fecha sí le funciona a usted?". Lo trasladan de "víctima del cobro" a "co-diseñador del plan".
7. **"That's right" / "Así es"** (§1.5). La meta no es un "sí" de cortesía (puede ser falso) sino un **"así es"**, que indica acuerdo genuino. Se logra resumiendo la situación del deudor hasta que la confirme. Ese "así es" hace que el plan sea **de él**, no impuesto → más cumplimiento.
8. **Voz "DJ de FM nocturno"** (§1.8) en canal voz: tono calmado, grave, descendente, pausado; transmite control y baja la temperatura. En WhatsApp el equivalente es frases cortas, sin exclamaciones, sin mayúsculas sostenidas.

### C. Cialdini — 7 principios en modo "detective" (ético)
*Fuente: doc `02` §3 · Influence at Work, Psychology Today (Smugglers)*

Solo se usa el principio que **ya existe de verdad** en la situación (detective), nunca uno fabricado (smuggler).
- **Reciprocidad:** dar valor real primero (correr la fecha a su nómina, alivio genuino de mora) genera ganas de corresponder.
- **Compromiso y consistencia:** un micro-"sí" y un compromiso explícito que **el deudor mismo propone** se cumple más (la gente honra lo que ella declaró).
- **Autoridad real:** credibilidad por dominio del contrato y respaldo documental, **no** intimidación; prohibido hacerse pasar por abogado/juzgado/central de riesgo.
- **Escasez (alto riesgo):** solo si el alivio tiene un vencimiento **real**. Inventar urgencia viola la ley.
- **Unidad:** apelar al "nosotros" genuino (relación arrendador–inquilino real), no a un truco emocional.

### D. Stuart Diamond — "Getting More"
*Fuente: doc `02` §4 · Calvin Rosser, GettingMore.com*

- **Pagos emocionales** (§4.1): reconocer la dificultad sin juzgar calma y abre la puerta.
- **Ser incremental** (§4.2): pasos pequeños asustan menos; del paso familiar al siguiente.
- **Intercambiar cosas de valor desigual + intangibles** (§4.3): lo que cuesta poco al arrendador y vale mucho al deudor (fecha atada a quincena, constancia inmediata de cada abono, tranquilidad y dignidad).
- **Usar SUS estándares** (§4.4): si el deudor dijo "yo siempre soy cumplido", se le devuelve eso: "hagamos honor a eso con un plan que pueda sostener".

### E. Economía conductual — qué cierra de verdad
*Fuente: doc `02` §5.2 · doc `01` §6–§7 · PNAS/PMC, Behavioral Scientist, Tratta*

- **Implementation intentions (planes "si-entonces")** ↑ cumplimiento 2–3×. Cerrar SIEMPRE con cuándo + cómo + cuánto, **dicho por el deudor**.
- **Defaults razonables:** proponer un plan preconfigurado (2 cuotas con fechas sugeridas) que el deudor solo confirma o ajusta → la gente sigue la opción por defecto.
- **Mental accounting:** sincronizar la fecha de pago con el ingreso ("sale de esa misma platica sin descuadrarlo").
- **Fricción ↓ es la palanca dominante:** todo cierre desemboca en un **link de pago con monto precargado**; el guion persuasivo vale menos que el clic fácil.
- **Personalizar, no moralizar:** nombre, monto exacto, fecha alineada al ingreso; nada de sermones prosociales ("sea responsable") — fallan empíricamente.

## Cómo aplicar (pasos concretos del agente)

Secuencia interna de la negociación (un turno o varios, según canal):

1. **Confirmar disposición y separar persona/problema.** Encuadrar como "usted y nosotros frente a la deuda", no "usted contra nosotros". Reduce defensividad antes de hablar de números.
2. **Extraer intereses con preguntas calibradas / mirroring** — sin preguntar el motivo. Una pregunta "qué/cómo" abierta: *"¿Qué le serviría para ponernos al día este mes?"*. Si el deudor revela contexto (recorte de horas, mes apretado), **úselo como insumo**, nunca lo solicite.
3. **Anclar en criterios objetivos.** Reafirmar de dónde sale el monto: contrato + canon del mes + días de mora. Ofrecer el soporte. Despersonaliza la cifra.
4. **Generar 2–3 opciones de beneficio mutuo**, presentadas como un **default + alternativas**. Las opciones numéricas finas (abono inicial %, número de cuotas) las calcula `cobranza-planes-pago-hardship`; esta skill las **presenta y negocia**, no las inventa fuera de matriz.
5. **Aplicar resortes detective solo si son reales:** reciprocidad (correr fecha a su nómina), escasez (alivio de mora que vence en fecha real), unidad (relación real), pago emocional (validar la dificultad).
6. **Si la opción requiere concesión de capital o sale de matriz → STOP.** No prometer; pasar a human-in-the-loop. Decir al deudor que se eleva a revisión, sin crear expectativa falsa.
7. **BATNA neutro solo en S4–S5 y solo verídico:** informar que resolver directo es más rápido y económico para ambos que la ruta formal. Sin fechas de demanda inventadas, sin "lo reporto ya". Cualquier consecuencia legal real → validación humana primero.
8. **Cerrar con resumen → "así es".** Resumir la situación y el plan en boca del deudor hasta obtener confirmación genuina ("así es").
9. **Hacer que el deudor verbalice el plan si-entonces** (cuándo + cómo + cuánto). *"El viernes cuando le paguen, entra a este enlace y abona $X. ¿Confirmado así?"*
10. **Entregar el control a `ptp-compromisos`** con el objeto-acuerdo (fecha, monto, medio, recordatorio pre-fecha agendado en horario legal) y, si hay plan multicuota, a `planes-pago-hardship` para formalizarlo.

> Regla de oro de cierre: si el agente está empujando y el deudor está cediendo, **no es un acuerdo, es presión** → retroceder a opciones/intereses. Un acuerdo bueno es el que el deudor propone y reconoce como suyo ("así es").

## Guiones y plantillas (español colombiano, listos para usar)

> Variables entre `{ }`. Render final (longitud, formato COP, emoji ≤1, opt-out) lo aplica `tono-whatsapp` (asíncrono) o `script-voz` (síncrono). Aquí se da la **intención conversacional**.

### 1. Separar persona del problema (apertura de la negociación · S2–S3)
> *"Don/Doña {nombre}, esto no es usted contra nosotros. Es usted y nosotros frente a una deuda que conviene resolver pronto, sin que se vuelva un problema más grande. ¿Le parece si la vemos juntos y buscamos algo que de verdad le funcione?"*

### 2. Preguntas calibradas para extraer intereses (sin preguntar el motivo · S2–S3)
> *"¿Qué le serviría para poder ponernos al día este mes?"*
> *"¿Qué fecha sí le funcionaría a usted para el primer pago?"*
> *"¿Cómo podríamos organizarlo para que no le quede tan pesado?"*

### 3. Mirroring (canal voz · cuando el deudor abre algo)
> Deudor: *"Es que ahorita no me alcanza."*
> Agente: *"¿No le alcanza…?"* (pausa, deja que continúe — el deudor ofrece el contexto sin que se lo pregunten)

### 4. Anclar en criterios objetivos (S3–S4)
> *"El valor que le aparece corresponde al canon de {mes} según el contrato que firmamos, más los días de mora. No es una cifra que pongamos nosotros a la ligera; sale del acuerdo. Con gusto le envío el soporte para que lo revise."*

### 5. Presentar opciones de beneficio mutuo como default + alternativas (S3)
> *"Le propongo lo más sencillo y le confirma cuál le sirve:*
> *• Opción A: queda al día de una y le aplico el alivio en los intereses de mora.*
> *• Opción B: lo dividimos en dos partes — la primera el {fecha 1} y la segunda el {fecha 2}, atada a su quincena.*
> *Si ninguna le cuadra, me dice y la ajustamos juntos. ¿Cuál le funciona mejor?"*

### 6. Reciprocidad real (correr la fecha al ingreso · S2–S3)
> *"Para facilitarle, podemos correr la fecha límite al {día}, cuando le cae la nómina, así sale de esa misma platica sin descuadrarlo. ¿Eso le ayuda a quedar al día?"*

### 7. Intercambio de intangibles (Diamond · S3)
> *"Si usted se compromete con la primera cuota el {fecha}, yo le ajusto la segunda a su quincena y le mando de inmediato la constancia de cada abono. ¿Le sirve así?"*

### 8. Usar SUS estándares (S2–S3)
> *"Usted mismo me dice que siempre ha sido cumplido y que este mes fue la excepción. Hagamos honor a eso con un plan que pueda sostener sin ahogarse."*

### 9. Pago emocional + ser incremental (S2)
> *"Sé que ponerse al día cuando el mes vino apretado no es fácil, y valoro que esté dispuesto a resolverlo. No tiene que arreglar todo de una: empecemos con un primer abono esta semana y vamos avanzando."*

### 10. Escasez HONESTA (alivio de mora con vencimiento real · S3)
> *"Este alivio en los intereses de mora aplica si quedamos al día antes del {fecha real del acuerdo}. Pagando dentro de esa ventana se ahorra el {X}% de la mora."*

### 11. BATNA neutro (NUNCA amenaza · S4–S5, con gate humano)
> ✅ *"Resolverlo directamente entre nosotros es más rápido y económico para ambos que llegar a instancias jurídicas, que toman meses. Por eso prefiero proponerle un plan que podamos cumplir."*
> ❌ NUNCA: *"Si no paga mañana lo demando / lo embargo / lo reporto ya."*

### 12. Cierre con "así es" (summary → confirmación genuina · S3)
> *"Entonces, por lo que me cuenta: quiere quedar a paz y salvo, pero pagar todo de una sola vez ahora no es viable, y le serviría dividirlo en dos partes. ¿Es así?"*
> Deudor: *"Así es."*

### 13. Cierre con plan si-entonces verbalizado por el deudor (todas las etapas)
> *"Perfecto, dejémoslo claro: **el viernes {fecha}, cuando le paguen**, usted entra a este enlace y abona ${monto}. Y la segunda parte el {fecha 2}. ¿Lo confirmamos así?"*
> *(Buscar que el deudor lo repita: "Sí, el viernes abono los $X." → eso es el commitment device.)*

### 14. Concesión fuera de matriz / condonación → escalar (S2–S5)
> *"Lo que me pide implica una decisión que yo no puedo aprobar por mi cuenta. Lo voy a elevar para que una persona del equipo lo revise y le demos una respuesta seria, sin prometerle algo que después no se cumpla. ¿Le confirmo apenas tenga respuesta?"*
> *(Internamente: `requiresHumanReview = true`. No fijar fecha de aprobación ni crear expectativa.)*

### 15. Voz — bloque de cierre de negociación (S3–S4)
> *(tono calmado, descendente)* *"Le resumo para que quede claro entre los dos: usted abona ${cuota 1} el {fecha 1} y ${cuota 2} el {fecha 2}, que cae en su quincena. Yo le mando la constancia de cada abono y un recordatorio el día anterior, dentro de horario. ¿Quedamos así?"* → esperar "así es" → confirmar y traspasar a PTP.

## Inputs (variables que necesita)

- `deudor.nombre`, `deudor.tratamiento` (default "usted")
- `deuda.canon_mes`, `deuda.monto_total`, `deuda.dias_mora`, `deuda.intereses_mora`, `deuda.moneda` (COP)
- `contrato.referencia`, `contrato.fecha_corte`, `contrato.canon_pactado` (para criterios objetivos)
- `deudor.fecha_ingreso_nomina` / `deudor.dia_pago` (para mental accounting y default de fecha)
- `politica.matriz_oferta` (escalera de oferta autorizada, % abono inicial, nº cuotas, alivio de mora permitido y su vencimiento real) — define qué puede ofrecer el agente **sin** escalar
- `politica.alivio_mora` (existe?/% real/fecha de vencimiento real) — gobierna si se puede invocar escasez
- `etapa` (S2–S5), `canal` (whatsapp|voz), `payment_link` (con monto precargable)
- `senales` de la conversación: disposición, contexto que el deudor ofreció voluntariamente, intereses detectados, voluntad/capacidad estimada (de `segmentacion-cadencia`)
- `flags`: `disputa_abierta`, `vulnerabilidad_detectada`, `pide_condonacion_capital`, `anuncio_abogado`, `confianza_modelo`

## Outputs / enrutamiento (a qué otras skills pasa el control)

- **→ `cobranza-planes-pago-hardship`** cuando el acuerdo es multicuota o entra hardship: para fijar abono inicial (~10–25%), número de cuotas viables, fechas atadas a nómina y escalera de oferta dentro de matriz.
- **→ `cobranza-ptp-compromisos`** al cerrar: entrega el objeto-acuerdo (fecha + monto + medio + recordatorio pre-fecha agendado en horario legal) para capturar la PTP, confirmar y dar seguimiento.
- **→ `cobranza-empatia-deescalacion`** si durante la negociación reaparece molestia/agresión/angustia: ceder el turno, calmar, y reintentar negociar después.
- **→ `cobranza-objeciones`** si el deudor lanza una objeción nueva (disputa de monto, "ya pagué", habitabilidad) en mitad de la negociación.
- **→ `cobranza-reenganche`** si el deudor se desconecta / deja de responder sin cerrar (ghosting), respetando el cap de frecuencia.
- **→ `cobranza-compliance-guardrails` (human-in-the-loop):** condonación de capital, acuerdo fuera de matriz, salto a S5, anuncio de abogado/demanda, disputa no resuelta, vulnerabilidad, o `confianza_modelo` baja → **pausa + revisión humana**. El agente propone; el humano confirma.
- **→ `cobranza-nudges-conductuales`** como capa de encuadre sobre las opciones presentadas (framing %, default, ease, fricción ↓).
- **Siempre → `cobranza-compliance-guardrails` (gate)** antes de programar/enviar: horario, frecuencia, canal, honestidad, prohibidos, disclosures, opt-out.

## Qué NUNCA hacer

- **Nunca preguntar el motivo de la mora** ("¿por qué no pagó?"). Extraer intereses solo con preguntas calibradas / mirroring que el deudor responde por voluntad propia.
- **Nunca usar el BATNA como amenaza** ni inventar consecuencias: "lo demando mañana", "lo reporto ya", "le embargan", "última oportunidad". Falsear consecuencias legales/crediticias es ilegal.
- **Nunca prometer descuentos, condonaciones de capital o acuerdos fuera de matriz** sin aprobación humana. No crear expectativa que no se pueda sostener.
- **Nunca invocar un resorte de Cialdini que no sea real** (escasez sin vencimiento real, prueba social inventada, autoridad falsa como hacerse pasar por abogado/juzgado/central de riesgo). Modo detective siempre.
- **Nunca cerrar por presión.** Si el deudor solo cede ante insistencia, no hay acuerdo: volver a intereses/opciones. El cierre válido es el "así es" + plan que el deudor verbaliza.
- **Nunca usar empatía táctica como anzuelo** para luego amenazar; rompe la confianza y, si la amenaza es falsa, viola la ley.
- **Nunca rematar la negociación con un segundo canal el mismo día** (cap de 1 contacto/día). Nada de "WhatsApp ahora + llamada en una hora".
- **Nunca contactar terceros, fiador-como-palanca, familia, empleador o referencias** para "ayudar a cerrar".
- **Nunca moralizar** ("sea responsable", "esto no se hace"); personalizar y facilitar, no sermonear.
- **Nunca decidir solo** lo de consecuencia legal (S5, reporte a centrales, condonación, disputa, vulnerabilidad): pausar a humano (T-323).

## Métricas que mueve

*Fuente: doc `01` §7–§8. Las cifras de los docs son US/UK → tratar como hipótesis a validar localmente vía `cobranza-metricas-experimentacion`.*

- **PTP rate** = compromisos de pago / right-party contacts → mide la **calidad de la negociación** (esta es la métrica primaria de la skill).
- **PTP-kept rate** = promesas cumplidas / promesas hechas → mide si los acuerdos fueron realistas (acuerdos co-diseñados y verbalizados como "así es" deberían subir esta cifra frente a promesas arrancadas por presión).
- **Cure rate / roll rate** → un acuerdo cumplible cura la mora y frena el roll a tramos más severos.
- **Liquidation rate** → recuperación efectiva del monto en riesgo.
- **% auto-resuelto sin esfuerzo humano** → buenos acuerdos dentro de matriz reducen el escalamiento.
- **Tasa de escalamiento a humano** (sano cuando es por capital/vulnerabilidad/disputa; señal de mejora si es por guiones mal calibrados).
- **Opt-out / quejas** → un alza indica negociación percibida como presión; debe mantenerse bajo.

Cadena causal: negociación de calidad → ↑PTP → (acuerdo realista + link 1-clic + monto precargado) → ↑PTP-kept → ↑cure / ↓roll → ↑liquidation.

## Fuentes (doc de research + libro)

- **Doc primario:** `02-negociacion-persuasion.md` — §1.4–1.5 (preguntas calibradas, "así es"), §1.8 (voz DJ-FM), §2 (Fisher/Ury: persona/problema, intereses, opciones, criterios objetivos, BATNA), §3 (Cialdini detective), §4 (Diamond), §5.2 (implementation intentions, defaults, mental accounting).
- **Docs de apoyo:** `01-estrategia-global-digital.md` §6 (7 tácticas conductuales honestas), §7 (PTP), §8 (métricas); `03-objeciones-playbook.md` §3.1/§3.6/§3.9/§3.10 (handoffs y escalamiento), §4 (escalera de oferta, mapeo etapa↔oferta); `04-tono-mensajeria.md` (render); `05-marco-legal-colombia.md` (gate de compliance); `00-SKILL-TAXONOMY.md` §2.5.
- **Libros / fuentes primarias (doc `06`):** **Getting to Yes** — Fisher, Ury & Patton (negociación basada en principios, BATNA); **Never Split the Difference** — Chris Voss (empatía táctica, "así es", voz); **Influence + Pre-Suasion** — Robert Cialdini (7 principios, modo detective); **Getting More** — Stuart Diamond (pagos emocionales, incremental, estándares del otro); **Influence Is Your Superpower** — Zoe Chance.
- **Marco legal:** Ley 2300/2023 ("Dejen de fregar"); Sentencia T-323/2024 (Corte Constitucional, control humano de la IA); Ley 1581/2012 (Habeas Data) + reglas SIC; Ley 1480/2011 (Estatuto del Consumidor).
