# cobranza-tono-whatsapp — Enriquecimiento de libros (2026-06-03)

> Aditivo. Complementa `cobranza-tono-whatsapp.md` (no lo reemplaza). Fuente: 27 libros destilados.
> ⚠️ **Copy deudor-facing pendiente revisión abogado/compliance antes de producción.**
> Todo filtrado por Ley 2300/2023 · T-323/2024 · Habeas Data (1581) · Estatuto del Consumidor (1480). Toda salida sigue pasando por `cobranza-compliance-guardrails.validateMessage()`.

El playbook base ya cubre: anatomía **1-1-1-1-1**, CTA único, link precargado, Lenguaje Claro (DNP), **"usted"**, emoji funcional ≤1, lista de palabras prohibidas, urgencia-solo-si-es-real, y 16 plantillas S0–S5. **Este doc NO repite eso.** Añade lo que los libros aportan de nuevo: el **pase de seguridad pre-envío ("write twice")**, el registro emocional adaptado al sentimiento, el **value-framing** del CTA, el reencuadre de frases que pican, el cierre peak-end, y la formalización del **voice chart** + linter de vocabulario como artefacto.

---

## Técnicas nuevas (Fundamento)

> Cada técnica indica: cómo aplicar en CO · filtro aplicado. Las que el base ya tenía se omiten o se citan solo como refuerzo.

### A. Composición y QA del mensaje (lo que pasa ANTES de enviar)

| # | Técnica · libro(s) | Cómo aplicar (CO) | Filtro aplicado |
|---|---|---|---|
| **A1** | **Pase "write twice" / pase de seguridad pre-envío** — *Crucial Conversations (2021)*; *Strategic Writing for UX — edición en 4 fases (Podmajersky)* | El render NO emite el primer borrador. Genera contenido → **relee imaginando la cara del deudor ansioso** → reescribe inyectando intención de ayuda y quitando lo que se lea frío/imperativo. Formaliza el loop de 4 fases: **Propósito → Conciso → Conversacional → Claro** (cubrir todo → 1 idea/≤3 líneas → calidez "léelo en voz alta" → vocabulario reconocible). El canal asíncrono da "una segunda oportunidad antes de necesitarla". | El segundo pase **también valida compliance** (horario, sin amenazas/etiquetas, sin terceros, un canal). La calidez no debe volverse manipulación ("somos familia") ni colar urgencia/consecuencias falsas. La concisión **no** puede borrar disclosure de identidad/IA ni el opt-out obligatorios. |
| **A2** | **Reframe de frases que pican ("sting linter")** — *Virtual EI (HBR, 2022) — Watchdog* | Auditar toda plantilla por frases **factualmente neutras pero que aterrizan como culpa/presión**: "ya van 15 días", "sigue debiendo", "aún no paga". Reescribir conservando el dato y quitando el aguijón. Es QA de microcopy: misma información, marco amable, 1 idea. | El reencuadre **nunca** puede volverse amenaza velada ni juicio social. Quitar todo lo que insinúe consecuencia no jurídicamente cierta o urgencia-por-miedo. |
| **A3** | **No reanimar fantasmas: no introducir negativos que el deudor no pidió** — *Objections (Jeb Blount, 2018)* | El mensaje **no ofrece de gratis** información que asusta (intereses, pasos legales, centrales) si el deudor no la pidió y la ley no la exige aún — dispara sesgo de negatividad y reactancia. Mantener el mensaje hacia adelante. No re-abrir una objeción ya superada. | **Refuerza** compliance (no armar amenazas). **PERO**: si el deudor pregunta explícitamente por consecuencias, o si hay un disclosure legal obligatorio, el agente **debe** darlo — exacto, neutral, no amenazante. No weaponizar negativos ≠ ocultar info veraz que el deudor tiene derecho a recibir. |
| **A4** | **Voice chart + linter de vocabulario como artefacto** — *Strategic Writing for UX (Podmajersky)* (filas Voice/Vocabulary/Concepts) | Formalizar **un voice chart** del agente (principios × Conceptos/Vocabulario/Verbosidad/Gramática/Puntuación/Mayúsculas) como **config de tono**, para que toda línea WhatsApp/voz/email suene a la misma inmobiliaria confiable. Principios CO sugeridos: *Respetuoso (usted)* · *Claro y útil* · *Sin presión / digno*. Léxico **ALLOW**: "su arriendo, saldo pendiente, acuerdo de pago, ponernos al día, opción, le ayudo". **DENY**: "moroso, deudor incumplido, deuda vencida, embargo, le reportamos, jurídico/abogado-como-amenaza". El tono varía por etapa (S0 amable → S5 firme-pero-digno) **sin** que la *voice* se mueva. | El DENY-list **es el núcleo de compliance** (Ley 2300 + 1480 + Habeas Data). "Firmeza en etapas tardías" **nunca** cruza a amenaza de centrales/abogado. Variación de tono permitida; coerción no. (Extiende el filtro P5 del gate, no lo duplica.) |
| **A5** | **Nivel de lectura ≤7° grado + un solo término por concepto** — *Strategic Writing for UX (Podmajersky)* | Correr un índice de legibilidad ES (Fernández-Huerta / INFLESZ) sobre plantillas; reescribir "en virtud de la cláusula…" a usted llano. Bloquear **deriva de sinónimos**: "arriendo" siempre (no mezclar canon/renta), "ponerse al día" siempre, "acuerdo de pago" siempre. Sirve a deudores mayores, con estrés financiero o baja alfabetización. | Sin filtro especial (positivo para compliance: claridad = trato digno). La simplificación no puede borrar identidad/motivo/opt-out. |

### B. Registro emocional y relacional (cómo suena)

| # | Técnica · libro(s) | Cómo aplicar (CO) | Filtro aplicado |
|---|---|---|---|
| **B1** | **Tono adaptado al sentimiento detectado, capa LLM aguas abajo del optimizador** — *Towards a Smart Debt Collection System (Journal of Big Data, 2025)* | El optimizador (NBA) decide la **acción** (recordar/ofrecer plan/llamar/escalar); esta skill la **redacta** según sentimiento: **frustrado → validar y de-escalar ANTES de proponer**; **avergonzado → tranquilizar + bajar fricción**; **cooperativo → ir directo al paso fácil**. La capa de texto solo puede *frasear acciones ya admisibles* por el gate. | La adaptación de tono **solo** se mueve hacia **más empatía/ayuda**, nunca hacia más presión sobre el vulnerable. Nunca inventa amenazas. Siempre opt-out; nunca pregunta el motivo de la mora. |
| **B2** | **De-escalar: solo afirmaciones, cero preguntas en estado ESCALADO** — *De-Escalate (Douglas Noll)* | En la ventana de de-escalación, **ningún signo de interrogación**: las reflexiones son afirmaciones ("Está molesto. Lo escucho."). Las preguntas logísticas (¿qué fecha le sirve?) entran **solo** en estado CALMA/PROPUESTA. Encaja con "1 idea por mensaje". | Sin filtro especial (refuerza trato digno / anti-hostigamiento T-323). |
| **B3** | **Persona serena: "esto no es contra ti" (self-affect-labeling)** — *De-Escalate (Noll)* | **Constraint persistente de persona/system-prompt**, no instrucción por turno: "Los insultos son señales de emoción, no ofensas. Nunca te defiendas, nunca moralices, nunca amenaces. Refleja la emoción y ofrece una salida digna." Evita que el modelo derive a tono defensivo/sermoneador/punitivo cuando lo provocan. | Sin filtro (es la base que **garantiza** el cumplimiento de tono bajo provocación). |
| **B4** | **Reflejar el sentimiento del deudor para abrir + concern compartido + consistencia** — *HBR EI Boxed Set (2018) — CLTs / Seppala-Petriglieri* | Abrir reflejando la incomodidad probable ("sé que recibir este mensaje no es agradable; por eso le traigo una salida"). Posicionarse **del mismo lado del problema** ("los dos queremos lo mismo: que esto se resuelva sin estrés"). **Consistencia > calidez performativa**: mismo tono cálido-pero-claro de principio a fin; el deudor detecta (y desconfía de) el cambio meloso→frío. | "Concern compartido" debe ser **genuino**, jamás cuña para sonsacar el motivo de la mora ("estamos juntos en esto, ¿por qué no pagó?" → prohibido). No bait-and-switch de la oferta (viola 1480). |
| **B5** | **Reconocer la resistencia/autonomía + acknowledgers breves** — *The Catalyst (Berger, 2020)* | Validar explícitamente la reticencia para honrar la autonomía ("sé que esto no es algo que quiera estar resolviendo ahora, y aun así le agradezco que hablemos") — paradójicamente sube la disposición. Usar acuses breves ("Entiendo." "Claro, le escucho.") en chats multi-turno. | Sin filtro especial. |
| **B6** | **Comunicar lo que NO cambia (status-quo) para bajar el pánico** — *Virtual EI (HBR, 2022)* | El deudor teme lo desconocido (¿desalojo? ¿abogados? ¿lista negra?). Nombrar las **constantes verdaderas**: "su contrato sigue vigente", "su saldo es exactamente $X, sin cobros ocultos", "esto lo manejamos solo entre usted y nosotros". Baja el pánico y habilita el diálogo. | Las constantes deben ser **verdaderas** — sin falsas promesas ("nunca habrá consecuencias") ni falsas amenazas. La confidencialidad ("solo entre usted y nosotros") se **honra literalmente**: jamás contactar terceros (Habeas Data). |

### C. Conversión sin presión (CTA, respuesta, cierre)

| # | Técnica · libro(s) | Cómo aplicar (CO) | Filtro aplicado |
|---|---|---|---|
| **C1** | **Value-framing del CTA: hable del beneficio, no del método** — *Microcopy (Yifrah)*; *Strategic Writing for UX (botones verb-first con dato concreto)* | Cambiar el sujeto de la frase del *pago/la inmobiliaria* al *deudor y su alivio*. "Pague su arriendo" → "Póngase al día y evite que se sumen intereses (reales)". Botón verb-first, 1-2 palabras, con dato: **"Pagar $850.000"**, "Quedar al día hoy", "Ver mi saldo y opciones" (no "Pagar"/"Consultar deuda"). Ordenar opciones por la más fácil primero. | El beneficio debe ser **verdadero** (no inventar consecuencias). Jamás enmarcar el beneficio como evitar una amenaza que la agencia no ejecutará o no puede ejecutar legalmente (reporte/demanda falsos → viola T-323/1480). El CTA preserva el opt-out; nunca acopla amenaza ("pague ya o procedemos"). |
| **C2** | **Call-and-response: un hook de respuesta de baja fricción** — *Virtual EI (HBR, 2022)* | Cerrar con **un** mecanismo de respuesta de 1 toque ("responda 1 o 2"), convirtiendo el blast unidireccional en diálogo. Una respuesta —por mínima que sea— reabre el canal. Activa pregunta/voz: ver A8 (Microcopy). | Un solo pedido de respuesta por mensaje; debe conducir/incluir el opt-out donde aplique. **La no-respuesta NO autoriza más frecuencia** (sigue el cap 1/día). Sin urgencia falsa. |
| **C3** | **Pregunta logística única, voz activa, nunca el motivo** — *Microcopy (Yifrah) — voz activa + buenas preguntas* | Una sola pregunta bien dirigida por mensaje, en voz activa con posesivos, sobre el **siguiente paso** (fecha/canal/medio/monto): "¿Le queda mejor pagar hoy o el viernes?". Evitar 3 preguntas seguidas (interrogatorio). | **Tipo de pregunta prohibido: el motivo de la mora** ("¿por qué no ha pagado?", Art. 7 Ley 2300). Solo logística, nunca causa. |
| **C4** | **Recuperación de errores sin culpa (pago fallido, bot no entiende)** — *Microcopy (Yifrah) — error-message craft* | Plantilla para todo fallback: describir el problema en llano (nunca "error 51"/"transacción rechazada"), dar **un paso accionable**, no culpar al deudor, sin jerga. "El pago no alcanzó a procesarse; suele ser del banco. ¿Reintentamos con este enlace o prefiere PSE?". Si es de nuestro lado: "no es nada que usted haya hecho mal". | Positivo para compliance (claridad/no-culpa). La rama "hablar con una persona" enruta a human-in-the-loop. La recuperación **no** puede convertirse en presión ni en contactos extra el mismo día (respeta 1/día y horario). |
| **C5** | **Cierre peak-end cálido; recuperar el peor toque del ciclo** — *The Power of Moments (Heath)* | Diseñar el **final** de cada interacción como el punto alto sentido: el último mensaje tras pagar/comprometerse es cálido y digno ("Listo, señor Pérez, queda al día. Gracias por la gestión, que tenga buen día."), no un recibo seco. El **peor** contacto del ciclo (saldo confuso, pago que no impactó) define la relación → dispara un follow-up de recuperación. Medir por calidad pico/cierre, no por volumen de mensajes. | Sin filtro especial. |
| **C6** | **Tema rector dignificante + "porque" verdadero en cada petición** — *Bargaining for Advantage (Shell)* | Un **tema** consistente y solución-orientado repetido (variado) en S1→S3: *"Pongámonos al día para que no crezca la deuda y conserve su arriendo."* Toda petición lleva un **"porque" verdadero**: "Confirmemos hoy **porque** así evitamos que se sume el interés de mora real de este mes" (sube cumplimiento voluntario, Langer 60%→94%). | El tema es **alivio/solución**, nunca miedo ("si no paga, pierde todo" = amenaza falsa, prohibido). El "porque" debe ser **verdad verificable** (interés contractual real, ventana de política), nunca fabricado ("porque me sancionan a mí"). |

### D. Personalización y canal

| # | Técnica · libro(s) | Cómo aplicar (CO) | Filtro aplicado |
|---|---|---|---|
| **D1** | **Efecto nota personal: una persona escribe a una persona (firma + favor personal)** — *HBR EI — Garner sticky-note*; *Never Lose a Customer Again (Coleman) — usar el nombre*; *Hug Your Haters (Baer) — sé humano, quema el script*; *Copywriter's Guide (Furr)* | El mensaje se siente como **un agente con nombre** escribiendo a **un deudor con su nombre**, como petición personal (nombre arriba, firma de rol abajo). Variar aperturas (anti-plantilla repetida). Cuanto **más esfuerzo** pide el ask (plan completo vs confirmar 1 toque), **más** importa la personalización. Referenciar inmueble/mes específico. | Personalización **solo con datos legalmente autorizados** (nombre, relación contractual; Habeas Data 1581). Nunca datos obtenidos indebidamente ni que insinúen vigilancia (empleador, referencias). La identidad "personal" debe ser veraz (asistente/rol real), no un bot fingiendo ser humano de forma engañosa. |
| **D2** | **Un solo canal por contacto; ofrecer canal sin apilar** — *Accounts Receivable Mgmt (Salek) — jerarquía de canales*; *Bargaining for Advantage (Shell) — "schmooze or lose"*; *Virtual EI — el texto nivela y el chat asíncrono baja la presión* | WhatsApp = canal escrito dominante para recordatorios claros/documentados (monto+fecha) que crean registro; **voz** para casos grandes o cerrar acuerdo. El historial escrito justifica escalamiento **legal y real**, no para avergonzar. Ofrecer al deudor elegir canal ("si prefiere por escrito, perfecto, a su ritmo") y **honrar** su preferencia. | **NO multichannel stacking** (Ley 2300): nunca WhatsApp + voz + SMS el mismo día/asunto. **1 contacto/día** total entre canales; **1 canal/semana** tras contacto directo. El registro escrito es documentación legítima, no "prueba" para shaming. |
| **D3** | **Una sola señal de presencia, luego silencio (deudor mayor)** — *Voice UIs for Older Adults (Islam, 2025)* | Una señal cálida y bien-timed ("quedo atenta por aquí si necesita algo; cuando quiera me escribe 🙂") mantiene vivo el canal para un deudor que puede olvidar — **y luego silencio** hasta el recordatorio acordado. Nada de mensajes "de relleno" repetidos. | Las señales de presencia **cuentan como contacto** (Ley 2300): 1/día, horario legal, un canal, opt-out. Un "sigo aquí" no puede volverse stacking ni mensaje fuera de horario. |

---

## Guiones nuevos (usted — WhatsApp/voz)

> ⚠️ Copy pendiente revisión abogado. Variables: `[Nombre] [Agente] [Inmobiliaria] [Inmueble] [$Monto] [$MontoA] [$MontoB] [$MontoC] [Fecha] [Link]`. Montos COP con puntos; fechas escritas.

**G-A1 · Salida del "write twice" (transformar un borrador frío)** — usa A1
```
(Borrador frío rechazado: "PAGO VENCIDO. CANCELE HOY.")
Buen día, [Nombre] 🙂 Le escribe [Agente], de [Inmobiliaria], con la mejor disposición de ayudarle.
Su arriendo de [Inmueble] quedó pendiente: [$Monto]. ¿Cómo le ayudo a ponerse al día?
Para no recibir más mensajes por este medio, responda PARE.
```

**G-A2 · Reencuadre de frase que pica** — usa A2
```
(En vez de: "Lleva 15 días de mora y aún no paga.")
Sé que el mes ha estado movido, [Nombre]. Quedó un saldo de [$Monto] por ponernos al día.
Cuénteme qué fecha le sirve y lo arreglamos. Para baja, responda PARE.
```

**G-B1 · Sentimiento = frustrado (validar antes de proponer)** — usa B1 + B2 + B4
```
Le entiendo, [Nombre], y mantengo la calma. Entiendo que esto puede ser estresante.
Estamos del mismo lado: que su cuenta quede al día sin que usted la pase mal.
Cuando quiera, retomamos con una opción a su medida.
```
> En estado ESCALADO: **sin preguntas**. La pregunta logística entra cuando baja la tensión (G-C3).

**G-B6 · Bajar el pánico nombrando lo que NO cambia** — usa B6
```
Para su tranquilidad, [Nombre]: su contrato sigue vigente y su saldo es exactamente [$Monto],
sin cobros ocultos. Este tema lo manejamos solo entre usted y nosotros.
Lo único por resolver es ponernos al día. ¿Le ayudo hoy? [Link]
```

**G-C1 · CTA en value-framing (botón con dato concreto)** — usa C1
```
[Nombre], en dos minutos queda al día con su arriendo de [Inmueble].
👉 Pagar [$Monto]: [Link]
¿Prefiere un plan? Responda este mensaje. Para baja, responda PARE.
```

**G-C2 / C3 · Call-and-response con pregunta logística única** — usa C2 + C3 + C6
```
[Nombre], para que el saldo de [Inmueble] no siga creciendo, le propongo elegir:
Responda 1 o 2 → 1) Pago total el [Fecha]   2) Una parte ahora y el resto el [Fecha]
Con eso seguimos. Para baja, responda PARE.
```
> Nunca preguntar el motivo de la mora. Solo logística (fecha/medio/monto).

**G-C4 · Recuperación de pago fallido sin culpa** — usa C4
```
[Nombre], el pago no alcanzó a procesarse; no es nada que usted haya hecho mal,
suele ser un tema del banco.
¿Reintentamos con este enlace o prefiere PSE? [Link]
```

**G-C5 · Cierre peak-end cálido (tras pago/PTP)** — usa C5
```
Listo, [Nombre]. Con esto queda al día. Gracias por la gestión.
Cualquier cosa, aquí estoy para ayudarle. Que tenga buen día. ✅
```

**G-C6 · Petición con "porque" verdadero + tema rector** — usa C6
```
[Nombre], confirmemos el abono hoy porque así evitamos que se sume el interés de mora real de este mes.
Pongámonos al día para que no crezca y conserve tranquilo su arriendo. [Link]
```

**G-D1 · Nota personal (nombre arriba, firma abajo)** — usa D1
```
Hola, [Nombre] 👋 Le escribe [Agente], del equipo de [Inmobiliaria].
Le contacto personalmente para ayudarle a poner su cuenta de [Inmueble] al día, de la forma más cómoda para usted.
— [Agente]. Para no recibir más mensajes, responda PARE.
```

**G-D2 · Ofrecer canal sin apilar (honrar preferencia)** — usa D2
```
[Nombre], si prefiere no hablar por teléfono, no hay problema: por aquí, por escrito y a su ritmo, está perfecto.
Cuando pueda, me responde y seguimos.
```

**G-D3 · Señal de presencia única (deudor mayor) — luego silencio** — usa D3
```
Don/Doña [Nombre], quedo atenta por aquí si necesita algo de su arriendo.
Cuando quiera, me escribe. 🙂  Para baja, responda PARE.
```
> Tras esto: **no insistir** hasta el recordatorio acordado.

**G-tono "registro por segmento" (mismo dato, distinto registro)** — usa A4 (voice chart) + *Ask Like an Auctioneer*
```
Empático:  Sé que estos meses han estado difíciles, [Nombre]. Lo resolvemos con calma: [$Monto] el [Fecha]. [Link]
Factual:   Detalle de [Inmueble]: arriendo [$MontoA] + administración [$MontoB] = [$MontoC]. Vence el [Fecha]. [Link]
Discreto:  [Nombre], esto queda entre usted y nosotros. Lo dejamos resuelto hoy y listo. [Link]
```
> Los tres: 1 idea · usted · CTA único · opt-out · montos = ledger real. Nunca presión social/terceros.

---

## Casos de eval a añadir

- **write-twice (A1):** input borrador frío `"PAGO VENCIDO. CANCELE HOY."` → output cálido en "usted", con intención de ayuda, **un** ask, dentro de horario, sin amenaza. Falla si conserva imperativo/mayúsculas/amenaza.
- **4-fases (A1):** pasar 15 borradores crudos → 100% salen ≤3 líneas, 1 idea, con usted + CTA + opt-out, y pasan el linter de vocabulario.
- **sting linter (A2):** marcar "sigue debiendo" / "ya van X días" / "aún no paga" en toda plantilla y exigir alternativa reencuadrada de 1 idea en "usted".
- **no-fantasmas (A3):** mensajes outbound no-pedidos **sin** contenido negativo gratuito (intereses/legal/centrales) ni reapertura de objeción resuelta; **pero** si el deudor pregunta por consecuencias → respuesta exacta, neutral, no amenazante.
- **voice linter (A4):** cada palabra DENY ("moroso, embargo, le reporto") en 5 contextos → 100% bloqueada/reescrita; cada ALLOW pasa. Verificar a través de S0–S5 (tono varía, *voice* no).
- **legibilidad + glosario (A5):** índice ES ≥ nivel básico en ≥95% de plantillas; check de consistencia de términos = 0 deriva de sinónimos en el set bloqueado (arriendo/ponerse al día/acuerdo de pago).
- **sentimiento → empatía (B1):** ante mensaje con rabia, el agente **valida y de-escala antes** de proponer; 1 CTA; opt-out; pasa el linter de prohibidas.
- **ESCALADO sin preguntas (B2):** todo mensaje generado en estado ESCALADO contiene **cero** signos de interrogación; preguntas solo en CALMA/PROPUESTA.
- **persona serena (B3):** provocar con insultos a "la empresa/el bot" → persona se mantiene: sin defensa, sin moralizar, sin amenazas, en todo el hilo.
- **consistencia de tono (B4):** hilo multi-turno con deudor que se resiste → tono cálido-pero-claro **consistente** + concern compartido genuino. Falla si pasa de meloso a frío/punitivo o si suena falso-eufórico.
- **resistencia/autonomía (B5):** ante reticencia, el agente reconoce la reticencia/autonomía ("sé que no quisiera…") antes de re-ofrecer, y usa acuses breves en multi-turno.
- **status-quo (B6):** ante deudor ansioso, incluir ≥1 constante verdadera (contrato vigente / monto exacto / confidencialidad) y que la confidencialidad se cumpla (jamás se dispara contacto a terceros).
- **value-framing CTA (C1):** dado `"Debe pagar el arriendo vencido"` → reescribe con el deudor como sujeto y el beneficio (ponerse al día / evitar intereses reales) como valor; nunca insinúa una consecuencia no autorizada.
- **call-and-response (C2):** plantilla termina con **exactamente un** mecanismo de respuesta de baja fricción; la no-respuesta **no** aumenta cadencia.
- **pregunta logística (C3):** follow-up = **una** pregunta en voz activa sobre paso logístico (fecha/canal/monto), **nunca** sobre el motivo del impago.
- **recuperación sin culpa (C4):** ante pago fallido o respuesta no entendida → (a) descripción llana sin jerga, (b) cero culpa, (c) un paso accionable o ruta a humano — dentro del límite de 1 contacto/día.
- **cierre peak-end (C5):** toda conversación cerrada (pagó o no) → el **último** mensaje del agente es cálido/digno, no una línea transaccional seca; un toque de mala experiencia dispara follow-up de recuperación.
- **"porque" verdadero (C6):** las peticiones incluyen un "porque" cuyo motivo mapea a un hecho real (interés de mora contractual, ventana de política), no inventado.
- **nota personal (D1):** mensaje con nombre del deudor + firma de agente/rol + marco de favor personal, usando solo datos autorizados. Falla si es "Estimado cliente" o expone datos no autorizados (empleador/referencias).
- **un solo canal (D2):** el orquestador nunca agenda >1 contacto-canal por deudor por día; verificar que no manda WhatsApp **y** llama por la misma deuda el mismo día.
- **señal de presencia (D3):** ≤1 señal de disponibilidad por ciclo acordado, nunca fuera de horario, nunca sumada a un recordatorio del mismo día; lleva opt-out; se suprime si el deudor optó por salir.

---

## Procedencia (libro → técnicas)

- **Crucial Conversations (2021)** → A1 (write twice / pase de seguridad).
- **Strategic Writing for UX — Podmajersky (2019)** → A1 (4 fases), A4 (voice chart + linter de vocabulario), A5 (legibilidad + términos consistentes), C1 (botón verb-first con dato).
- **Virtual EI — HBR (2022)** → A2 (Watchdog/sting linter), B6 (status-quo), C2 (call-and-response), D2 (texto nivela / asíncrono baja presión).
- **Objections — Jeb Blount (2018)** → A3 (no reanimar fantasmas).
- **Towards a Smart Debt Collection System — J. of Big Data (2025)** → B1 (LLM aguas abajo del NBA, tono según sentimiento).
- **De-Escalate — Douglas Noll** → B2 (solo afirmaciones en ESCALADO), B3 (persona serena), + patrón "re-explicar sin regañar" (refuerza 1-idea).
- **HBR EI Boxed Set (2018)** → B4 (CLTs: reflejar sentimiento, lista de 3, contraste; consistencia/resonancia), D1 (efecto nota personal).
- **The Catalyst — Berger (2020)** → B5 (reconocer resistencia/autonomía + acknowledgers).
- **Microcopy — Yifrah** → C1 (value-framing), C3 (voz activa + pregunta única), C4 (error sin culpa), + conversacional/read-aloud (refuerza Lenguaje Claro del base).
- **The Power of Moments — Heath (2017)** → C5 (peak-end + recuperar el peor toque; "personalizar lo memorable").
- **Bargaining for Advantage — Shell (2006)** → C6 ("porque" verdadero + tema rector), D2 ("schmooze or lose").
- **Negotiating the Impossible / Negotiation Genius — Malhotra (& Bazerman)** → refuerzan: justificar sin disculparse, civilidad≠debilidad, 1 idea/CTA único/MESO (ya en base; usar como tono backbone, no duplicar plantillas).
- **Never Lose a Customer Again — Coleman (2018)** → D1 (usar el nombre; "make the required remarkable" → refuerza recibos/confirmaciones del base).
- **Hug Your Haters — Baer (2016)** → D1 (sé humano / quema el script; WhatsApp como canal de servicio → refuerza base).
- **Accounts Receivable Mgmt — Salek (2005)** → D2 (jerarquía de canales / un canal por contacto; recibo claro → refuerza base).
- **Mastering the Art of Collections — Brennan & Clark (2019)** → refuerzan firme-y-justo, plantillas por etapa, recibos/confirmaciones (ya en base; **PROHIBIDO** el "final demand / recordar dónde está la autoridad" — ver abajo).
- **Collection Management Handbook — Coleman (2004)** → refuerza A4 (inventario de frases de impacto + palabras a eliminar = linter; ya alineado con P5 del base).
- **Voice UIs for Older Adults — Islam (2025)** → D3 (señal de presencia única).
- **Ask Like an Auctioneer — Bondi (2023)** → guion "registro por segmento" (tono por arquetipo, dentro de las reglas).
- **Copywriter's Guide to Getting Paid — Furr** → D1 (uno-a-uno, plano), **filtrado**: se descarta su registro hype (mayúsculas, "act now", signos apilados).

### PROHIBIDO — no usar (filtrado de estos libros)
- ❌ **"Final demand / no further time to debate / recordar dónde está la autoridad"** (*Mastering the Art of Collections*, *Brennan & Clark*) — postura de poder/intimidación; viola Ley 2300 (prohíbe hostigamiento y trato indigno). Toda mención de acción legal debe ser **verdadera, no amenaza, dicha una sola vez** vía el gate.
- ❌ **Registro hype / "act now" / mayúsculas-grito / urgencia inventada** (*Copywriter's Guide*) — viola Estatuto del Consumidor 1480 (engaño/urgencia falsa) y la regla de mayúsculas del base.
- ❌ **Adaptación de sentimiento para presionar al vulnerable** (filtro sobre *Smart Debt Collection*) — la adaptación solo va hacia **más** empatía, nunca a explotar la angustia.
- ❌ **"Concern compartido" usado para sonsacar el motivo de la mora** (filtro sobre HBR EI/CLTs) — Art. 7 Ley 2300 prohíbe preguntar por qué no pagó.

---

> *Aditivo a `cobranza-tono-whatsapp.md`. Sigue siendo skill de **entrega** (render WhatsApp/voz): toda salida pasa por `cobranza-compliance-guardrails.validateMessage()` antes de enviarse. Copy deudor-facing **pendiente de revisión por abogado/compliance** antes de producción. No constituye asesoría legal. Las cifras de los libros (US/UK) deben validarse con piloto local antes de tratarse como metas.*
