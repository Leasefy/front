# 04 — Tono, Mensajería y Diseño de Mensajes para Cobranza (Colombia)

> **Alcance de este documento:** diseño de TONO, COMUNICACIÓN y MENSAJES para un agente autónomo de cobranza de arriendo residencial en Colombia, que contacta al arrendatario por WhatsApp y llamadas de voz a lo largo de una cadencia escalonada (S0 amistoso temprano → S5 pre-jurídico). La inmobiliaria es el acreedor legítimo de una deuda real de arrendamiento.
>
> **Marco no negociable:** todo lo aquí recomendado cumple Ley 2300/2024 (conducta de cobranza), Sentencia T-323/2024 (revisión humana de IA), Ley 1581/2012 Habeas Data, reglas de la SIC y el Estatuto del Consumidor. Las técnicas globales que serían ilegales o no éticas en Colombia están **marcadas y excluidas** (ver sección 12).
>
> **Fecha:** 2026-06-02 · **Nivel de confianza global:** Alto en marco legal colombiano y principios de comunicación; Medio-alto en cifras de impacto (provienen de mercados US/UK y deben validarse con piloto local).

---

## 0. Resumen ejecutivo (lo más accionable)

1. **La empatía cobra más que la presión.** Los datos de la industria muestran que los deudores que se sienten escuchados y validados avanzan más fácil al pago y escalan menos. La cobranza amable es más efectiva que la agresiva — y en Colombia, además, la agresiva es ilegal (Ley 2300).
2. **El tono colombiano por defecto es "usted", neutral-formal, cálido pero respetuoso.** El "usted" es la forma estándar y segura en todas las regiones del país (incluido entre amigos en zona paisa y bogotana). Nunca tutear a un deudor desconocido.
3. **Estructura de mensaje = 1 idea, 1 monto, 1 fecha, 1 acción, 1 botón.** Mensaje corto, en lenguaje claro (nivel de lectura bajo), con CTA único ("Pagar ahora") y enlace directo de pago.
4. **WhatsApp ≠ voz.** WhatsApp: microcopy asíncrono, breve, link-to-pay. Voz: guion con apertura → verificación de identidad → escucha → propuesta → confirmación → cierre.
5. **El tono debe endurecerse en *formalidad e información*, nunca en *agresividad*, a lo largo de la cadena S0→S5.** Subimos claridad sobre consecuencias reales y verificables; jamás amenazas, vergüenza ni urgencia falsa.
6. **Horario y frecuencia son LEY, no cortesía:** L–V 7am–7pm, sábados 8am–3pm, NUNCA domingos/festivos; máximo **una vez al día** y **no múltiples canales en la misma semana** una vez hecho contacto directo. ([Ley 2300, Art. 3](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990))
7. **Prohibido por ley contactar terceros/referencias, hacer visitas, amenazar, mentir sobre acciones legales o reporte a centrales, o preguntar el motivo del no pago.** Todo eso queda fuera del diseño de mensajes.
8. **Honestidad radical en "prueba social" y urgencia.** Solo afirmaciones verdaderas y verificables. Nada de "última oportunidad" falsa, ni cifras inventadas.

---

## 1. Principios de tono para cobranza (fundamentos)

### 1.1 Por qué la empatía recauda (evidencia)

La investigación de experiencia de cliente en cobranza es consistente: un porcentaje relevante de consumidores responde positivamente cuando el gestor se acerca con empatía y disposición a ayudar, y quienes se sienten validados están más dispuestos a negociar el pago y menos a escalar el conflicto ([FusionCX](https://www.fusioncx.com/blog/bfsi/debt-collection/the-importance-of-empathy-and-customer-service-in-debt-recovery/); [PDCflow](https://www.pdcflow.com/debt-collection/how-listening-to-customers-improves-debt-collection-recovery-rates/)). Cuando la cobranza prioriza empatía y transparencia, los resultados muestran mayor recaudo, menos conflictos y mayor lealtad de largo plazo ([Commercial Collectors](https://commercialcollectors.com/collections/customer-experience-in-debt-collection/)).

> **Aplicación al agente:** el arrendatario no es un "moroso", es un cliente con un saldo pendiente y, casi siempre, una razón. El tono parte de "estamos para resolver juntos", no de "usted nos debe".

### 1.2 Los cinco atributos del tono Leasefy

| Atributo | Qué significa | Cómo suena |
|---|---|---|
| **Respetuoso** | "usted", sin diminutivos condescendientes, sin sarcasmo | "Le escribimos para…" |
| **Claro** | un solo asunto, monto y fecha explícitos, sin jerga | "$1.450.000, vencía el 5 de junio" |
| **Empático** | reconoce que pueden existir circunstancias | "Entendemos que pueden surgir imprevistos" |
| **Resolutivo** | siempre ofrece la siguiente acción fácil | "Puede pagar aquí en 1 minuto: [link]" |
| **Honesto** | nada de amenazas vacías ni datos falsos | nunca decir "lo reportaremos hoy" si no es cierto |

### 1.3 Firmeza sin agresión

El balance correcto es **cordial pero firme**: se puede ser claro con la urgencia y las consecuencias reales **sin amenazar** ([Kleva](https://www.kleva.co/post/50-frases-cobrar-dinero-amablemente-2025/); [Colektia](https://colektia.com/blog/frases-cobrar-para-dinero-amablemente)). La firmeza se expresa con **hechos verificables y fechas concretas**, no con tono intimidante.

- ✅ Firme y legal: *"El saldo de $1.450.000 está vencido desde el 5 de junio. Si no es posible pagarlo hoy, podemos acordar un plan."*
- ❌ Agresivo / ilegal: *"Si no paga hoy mismo lo vamos a reportar y a demandar."* (urgencia falsa + amenaza — prohibido)

---

## 2. Marco legal colombiano que CONDICIONA cada mensaje

Todo el diseño de tono y mensajería opera dentro de estas restricciones. (Detalle de cumplimiento completo vive en otros documentos del set; aquí se resume lo que afecta directamente la redacción y el envío.)

### 2.1 Ley 2300 de 2023 ("Dejen de Fregar") — texto y conducta
Fuentes primarias: [Función Pública (Gestor Normativo)](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990) · [Alcaldía de Bogotá](https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=143903). Análisis: [tusdatos.co](https://www.tusdatos.co/blog/ley-2300-dejen-de-fregar) · [Data Law](https://datalawsas.com/ley-2300-colombia-derechos-consumidores) · [Colcob](https://colcob.com/lo-que-debe-saber-sobre-la-ley-2300-derecho-a-la-intimidad/).

| Regla (artículo) | Impacto en el diseño de mensajes |
|---|---|
| **Horario (Art. 3):** L–V 7:00am–7:00pm; sábados 8:00am–3:00pm; **NUNCA** domingos ni festivos | El scheduler bloquea envíos y llamadas fuera de ventana. Aplica también a mensajes comerciales (Art. 5 §3). |
| **Frecuencia (Art. 3):** una vez hecho contacto directo, **no** contactar por varios canales en la misma semana **ni** más de una vez el mismo día | El motor de cadencia respeta tope diario/semanal. WhatsApp + llamada + email el mismo día = violación. |
| **Terceros (Art. 4):** prohibido contactar referencias personales; solo deudor, codeudor, avalista o deudor solidario | El agente jamás escribe a familiares, vecinos, empleador, contactos. |
| **Visitas (Art. 6):** prohibidas a domicilio y lugar de trabajo (salvo microcrédito con autorización) | No aplica a un agente digital, pero refuerza: no presionar con presencia física. |
| **Motivo del no pago (Art. 7):** prohibido preguntar *por qué* incumplió | El agente **no interroga** la causa; puede *ofrecer* ayuda, pero el deudor decide si la comparte. |
| **Canales autorizados (Art. 2):** solo canales que el consumidor autorice; debe poder elegir | Respetar consentimiento de canal; ofrecer opt-out ágil. |
| **Mensajes comerciales (Art. 5 §2):** aceptación expresa de la base + mecanismo de baja "ágil, sencillo y eficiente" | Todo mensaje debe permitir "PARE"/baja fácil. |

> Vigencia: la Ley 2300 entró en vigor el 10 de octubre de 2023; entidades vigiladas tuvieron plazo de implementación. ([tusdatos.co](https://www.tusdatos.co/blog/ley-2300-dejen-de-fregar))

### 2.2 Sentencia T-323/2024 — revisión humana de la IA
La Corte Constitucional estableció que el uso de IA exige **"control humano significativo"**: supervisión humana real (no meramente formal) de las decisiones, transparencia, y que la responsabilidad recae siempre en el humano que adopta la decisión — no es excusa decir "lo recomendó el sistema". ([Corte Constitucional, T-323/2024](https://www.corteconstitucional.gov.co/relatoria/2024/T-323-24.htm); [análisis U. Externado](https://propintel.uexternado.edu.co/resumen-de-la-sentencia-t-323-de-2024-de-la-corte-constitucional-de-colombia-sobre-el-uso-de-ia-por-jueces-de-la-republica/); [Escuela Judicial](https://escuelajudicial.ramajudicial.gov.co/noticia/decision-innovadora-sentencia-t-323-de-2024-la-inteligencia-artificial-ia-no-puede)).

> **Impacto en el agente de mensajería:** antes de escalar de etapa (especialmente hacia tono más firme / pre-jurídico S4–S5), debe existir una **pausa de revisión humana**. El agente puede redactar y proponer, pero un humano valida antes de mensajes de alto impacto. Esto debe estar visible en el diseño de cadencia, no solo en la infraestructura.

### 2.3 Habeas Data (Ley 1581/2012) + SIC + Estatuto del Consumidor
- No revelar datos de la deuda a terceros (refuerza Art. 4 de Ley 2300).
- Tratamiento de datos con finalidad informada y consentida.
- Prohibición de prácticas engañosas (Estatuto del Consumidor) → coincide con la regla de **honestidad** del tono.

---

## 3. Anatomía de un mensaje de cobranza efectivo

### 3.1 La estructura "1-1-1-1-1"
Un mensaje efectivo lleva **una sola idea**:

1. **Saludo + identificación** (quién escribe, por qué) → construye confianza
2. **El dato duro:** monto exacto + concepto + fecha de vencimiento
3. **El reconocimiento/empatía** (si aplica a la etapa)
4. **La acción única (CTA):** qué hacer, en un clic
5. **La salida fácil:** link de pago / "responda este mensaje si necesita un plan" / baja

> Best practice de microcopy: mensaje corto y al punto, lenguaje simple, **un CTA claro** ("Pagar ahora", "Ver resumen") ([Chaser](https://www.chaserhq.com/blog/5-sms-payment-reminder-text-message-samples-to-chase-invoices); [Messente](https://messente.com/blog/payment-reminder-message)). El CTA debe decir exactamente qué hacer ([Text Request](https://www.textrequest.com/templates/payment-reminders)).

### 3.2 CTA único: por qué uno solo
Dos o tres llamados a la acción diluyen la conversión. El patrón ganador es **un botón / un enlace** que lleve directo a pagar, con la alternativa "responder para un plan" como salida secundaria (texto, no botón competidor).

### 3.3 Enlace de pago seguro y personalizado
Generar URLs de pago dinámicas y seguras, atadas a la cuenta específica, para simplificar el pago sin exponer datos sensibles ([Tratta](https://www.tratta.io/blog/debt-collection-sms-strategies-templates)). El deudor no debería tener que buscar referencia, valor ni cuenta: el link los precarga.

### 3.4 Nivel de lectura / lenguaje claro (Colombia)
Seguir la **Guía de Lenguaje Claro** del Estado colombiano: dirigirse a *una* persona (no a "los usuarios"), frases cortas, párrafos breves, evitar tecnicismos ([DNP — Lenguaje Claro](https://2022.dnp.gov.co/programa-nacional-del-servicio-al-ciudadano/Programas-Especiales/Paginas/Lenguaje-claro.aspx); [Guía DNP servidores públicos PDF](https://colaboracion.dnp.gov.co/CDT/Programa%20Nacional%20del%20Servicio%20al%20Ciudadano/GUIA%20DEL%20LENGUAJE%20CLARO.pdf)).

Reglas prácticas para el agente:
- Oraciones de máximo ~20 palabras.
- Cifras en números, no en letras: "$1.450.000" (formato COP con puntos de miles).
- Fechas escritas, no códigos: "vence el 5 de junio", no "venc. 05/06".
- Una sola pregunta o petición por mensaje.
- Evitar voz pasiva y condicionales rebuscados.

---

## 4. Tono colombiano: "usted", neutralidad y sensibilidad regional

### 4.1 "Usted" como estándar nacional
En Colombia, **"usted" es la forma respetuosa y segura por defecto** en contextos formales, con desconocidos y en comunicaciones oficiales. En la región paisa (Antioquia, Caldas, Risaralda, Quindío) se usa "usted" incluso con amigos y familia, dándole un tono cordial y respetuoso; en Bogotá ("rolo") el "usted" es marca de formalidad y se usa en medios y comunicaciones oficiales ([TruFluency](https://trufluency.com/your-guide-to-colombian-spanish-regional-accents-of-colombia/); [Bunpo](https://bunpo.app/blog/spanish/colombian-slang-by-region-greetings-jokes-and-terms-of-love/); [Cultural Atlas](https://culturalatlas.sbs.com.au/colombian-culture/colombian-culture-communication)).

> **Regla del agente:** SIEMPRE "usted". Nunca "tú" ni "vos" con un deudor (aunque "vos" sea común en lo coloquial paisa/caleño, en cobranza suena demasiado informal y de confianza no concedida). El "usted" funciona en toda Colombia.

### 4.2 Español colombiano neutro
El acento/dialecto bogotano es considerado el más neutral y claro, base del español usado en medios nacionales y comunicaciones formales ([SpanishStep](https://spanishstep.com/archives/6255)). Para un agente nacional, el **registro neutro-formal bogotano** es la mejor base: se entiende en costa, interior y eje cafetero sin sonar regional.

### 4.3 Sensibilidad regional (matices, no cambios de fondo)
- **Interior (Bogotá, Boyacá, Cundinamarca):** más formales y tradicionales; la formalidad se recibe bien. Cuidar no sonar *frío/brusco* (reputación rolo) → compensar con una línea de calidez. ([Two.travel](https://two.travel/colombia/colombian-spanish-accents-slang-language-guide/))
- **Paisa (Medellín y eje cafetero):** cálidos y amables; "usted" cordial. El tono puede llevar un poco más de calidez sin perder formalidad. ([Bunpo](https://bunpo.app/blog/spanish/colombian-slang-by-region-greetings-jokes-and-terms-of-love/))
- **Costa Caribe:** actitud más relajada e informal; un saludo cálido ("Buenos días, ¿cómo está?") cae bien, pero **mantener "usted"** para no faltar al respeto en tema de dinero. ([Cultural Atlas](https://culturalatlas.sbs.com.au/colombian-culture/colombian-culture-communication))

> **Decisión de producto:** usar UN registro neutro-formal "usted" para todo el país. La personalización regional es opcional y de bajo riesgo (variar solo el saludo/calidez), nunca la forma de tratamiento ni la estructura.

### 4.4 Diminutivos y muletillas: con cuidado
El diminutivo colombiano ("un momentico", "ya mismo") suena natural y suaviza, PERO en cobranza puede leerse como condescendiente o como minimizar la deuda. Recomendación: **evitar diminutivos sobre el dinero o el plazo** ("una platica", "un atrasito") y reservarlos, si acaso, para suavizar la cortesía ("un momento, por favor" > "un momentico").

---

## 5. Mensajería por WhatsApp (microcopy asíncrono)

### 5.1 Características del canal
WhatsApp es asíncrono, de lectura altísima e inmediata (los SMS/mensajería tienen tasas de apertura cercanas al 98% y se leen en minutos — referencia de mercado a validar localmente) ([Sender](https://www.sender.net/blog/sms-open-rates/); [Messente](https://messente.com/blog/payment-reminder-message)). El usuario lee en el bolsillo, entre tareas → **el mensaje debe entenderse en 3 segundos**.

### 5.2 Reglas de microcopy WhatsApp
- 2 a 4 líneas máximo en los primeros toques.
- Nombre + saludo humano.
- Monto, concepto y fecha en una línea.
- Link de pago como cierre.
- Emoji: máximo 1, funcional (👋 saludo, ✅ confirmación). Nunca emojis de presión (⚠️🚨 en etapas tempranas, ❌ sobre el deudor).
- Salida/baja siempre disponible ("Responda PARE para no recibir más mensajes" — exigido por Art. 5 Ley 2300).
- Nunca pegar la deuda completa con lenguaje jurídico en mensajes tempranos ([Kleva](https://www.kleva.co/post/mensajes-de-cobranza-amable-para-enviar-por-whatsapp/)).

### 5.3 Palabras a EVITAR en WhatsApp (y en todo canal)
| Evitar | Por qué | Usar en su lugar |
|---|---|---|
| "moroso" / "deudor moroso" | estigmatiza ([Kleva](https://www.kleva.co/post/mensajes-de-cobranza-amable-para-enviar-por-whatsapp/)) | "su saldo pendiente", "su pago" |
| "última oportunidad" | urgencia falsa / presión | "fecha límite: [real]" |
| "deuda vencida e impagable" | dramatiza | "saldo vencido" |
| "lo vamos a reportar/demandar" (si no es cierto/inmediato) | amenaza, ilegal | describir el siguiente paso real, con su plazo real |
| "¿por qué no ha pagado?" | prohibido (Art. 7 Ley 2300) | "¿le gustaría que veamos opciones de pago?" |
| MAYÚSCULAS SOSTENIDAS | se lee como grito | normal, negrita selectiva |

---

## 6. Guion de llamada de voz (síncrono)

### 6.1 Estructura: Apertura → Verificación → Escucha → Propuesta → Confirmación → Cierre
Marco estándar de la industria, adaptado a Colombia ([Tratta](https://www.tratta.io/blog/effective-debt-collection-scripts); [Prodigal](https://www.prodigaltech.com/ltblogs/11-effective-debt-collection-call-scripts-with-real-examples); [CloudTalk](https://www.cloudtalk.io/blog/phone-call-scripts-for-collections/); [Yonyx](https://corp.yonyx.com/customer-service/best-practices-for-writing-debt-collection-call-sample-scripts-12-samples/)).

**1) Apertura (cálida, no acusatoria).** Nombre del agente/inmobiliaria + motivo en tono colaborativo. Abrir positivo: "le llamo para resolver juntos un tema de su cuenta", no "usted está en mora".

**2) Verificación de identidad (antes de hablar de la deuda).** Confirmar que se habla con la persona correcta SIN revelar la deuda a terceros (obligación Habeas Data + Art. 4). Pedir confirmación de nombre; nunca dar detalles del saldo hasta verificar.

**3) Escucha activa.** Si el deudor objeta ("estoy sin trabajo", "tuve un imprevisto"), **no interrumpir ni rebatir**; reconocer y guiar hacia solución ([FasterCapital](https://fastercapital.com/content/Collection-call-scripts--Handling-Objections--Tips-for-Collection-Call-Script-Design.html)). Recordatorio legal: **no preguntar el motivo** (Art. 7); si el deudor lo ofrece, escuchar y usarlo para proponer ayuda.

**4) Propuesta.** Ofrecer ruta concreta: pago hoy o plan en cuotas. "Según lo que me comenta, un plan en cuotas podría ayudar. ¿Cuánto podría manejar este mes?"

**5) Confirmación (PTP).** Reflejar el compromiso con sus palabras: "Entonces, ¿usted enviaría $X el viernes?". Esto fija un compromiso moral y reduce ambigüedad ([Tratta](https://www.tratta.io/blog/effective-debt-collection-scripts); [LeanPay](https://www.leanpay.io/en/blog/promise-to-pay)).

**6) Cierre.** Próximo paso explícito + agradecer: "Le envío el link de pago hoy y confirmamos el viernes. Gracias por su tiempo." Un cierre fuerte sube probabilidad de pago ([Tratta](https://www.tratta.io/blog/effective-debt-collection-scripts)).

### 6.2 Diferencias clave WhatsApp vs Voz

| Dimensión | WhatsApp | Voz |
|---|---|---|
| Temporalidad | asíncrono | síncrono |
| Verificación de identidad | implícita (es su número) | **obligatoria y explícita** antes de dar datos |
| Longitud | 2–4 líneas | guion conversacional flexible |
| Empatía | breve, escrita | escucha activa real, silencios |
| CTA | botón/link | acuerdo verbal + envío de link |
| Riesgo de terceros | bajo (chat privado) | alto (puede contestar otra persona) → verificar |
| Registro de PTP | el chat queda | hay que documentar manualmente |

### 6.3 Voz: lo que NUNCA debe decir el agente de voz
- No revelar la deuda a quien no se ha verificado como el deudor.
- No preguntar por qué no ha pagado.
- No amenazar con acciones que no se van a tomar o que no son inmediatas/ciertas.
- No subir el tono, no interrumpir, no usar "cálmese".
- No llamar más de una vez al día ni fuera de horario.

---

## 7. Empatía, de-escalamiento y manejo de objeciones

### 7.1 El framework de de-escalamiento: reconocer → apropiar → resolver
"Reconocer la emoción primero, actuar después." El reconocimiento debe ir antes de la solución ([Myra Golden](https://www.myragolden.com/blog/57-phrases-to-de-escalate-any-angry-customer); [Talaera](https://www.talaera.com/industry-specific-english/customer-de-escalation-phrases/)).

**Frases de validación (adaptadas a "usted", Colombia):**
- "Entiendo que esta situación puede ser difícil."
- "Lo escucho, y queremos ayudarle a resolverlo."
- "Tiene razón en querer claridad sobre su cuenta; se la doy."

**Enmarcar en positivo (qué SÍ se puede):**
- En vez de "no podemos hacer eso" → "esto es lo que sí puedo ofrecerle".
- En vez de "es la política" → "la mejor opción para usted sería…".

### 7.2 Palabras/frases prohibidas en de-escalamiento
Evitar: "cálmese", "es la política", "no hay nada que pueda hacer", "usted entendió mal", "así son las cosas". Son percibidas como desdeñosas ([Myra Golden](https://www.myragolden.com/blog/57-phrases-to-de-escalate-any-angry-customer); [Indeed](https://www.indeed.com/career-advice/career-development/de-escalation-techniques-customer-service)).

### 7.3 Manejo de objeciones frecuentes (cobranza arriendo Colombia)

| Objeción del deudor | Respuesta empática + resolutiva (NO interroga el motivo) |
|---|---|
| "No tengo cómo pagar ahora" | "Entiendo. Podemos acordar un plan en cuotas que le funcione. ¿Le comparto las opciones?" |
| "Ya pagué / no me han registrado" | "Gracias por avisar. Lo verifico de inmediato. ¿Me confirma fecha y medio de pago para cruzarlo?" |
| "Esa no es la cantidad que debo" | "Con gusto revisamos el detalle juntos. Le envío el desglose para que lo verifique." |
| "Tuve un problema personal/de salud" | (no preguntó usted) "Lamento la situación. Lo importante es darle opciones que se ajusten a usted." |
| "Dejen de molestarme" | "Respeto su solicitud. Puedo darle de baja de los mensajes; ¿prefiere que coordinemos un único canal y una fecha?" |

> Nota de hardship: la disposición a ofrecer un plan razonable convierte una conversación tensa en un acuerdo. Es a la vez más ético, más legal y más efectivo.

---

## 8. Urgencia honesta y "prueba social" ética

### 8.1 Urgencia sin amenaza
La urgencia legítima se construye con **fechas y consecuencias reales y verificables**, no con presión emocional. Un CTA con sentido de urgencia ("pague antes del [fecha]") es efectivo cuando el plazo existe de verdad ([Esendex](https://www.esendex.co.uk/blog/post/sms-payment-reminder-templates/)).

- ✅ Honesta: "Para evitar el cobro de intereses de mora a partir del [fecha], puede pagar aquí: [link]." (si los intereses son reales y contractuales)
- ❌ Falsa: "¡ÚLTIMA OPORTUNIDAD! Si no paga hoy perderá todo." (no verdadero → engañoso → ilegal)

### 8.2 Loss aversion: úsalo solo si es verdad
La aversión a la pérdida es real y potente — enmarcar algo como pérdida puede ser más efectivo que como ganancia ([Renascence](https://www.renascence.io/journal/behavioral-economics-statistics-data-that-drives-insight)). PERO en cobranza solo puede usarse con hechos verdaderos:
- ✅ "Pagando hoy mantiene su contrato al día y evita intereses de mora." (verdadero)
- ❌ inventar una penalidad o un beneficio que se "pierde" si no existe.

### 8.3 Prueba social honesta
La prueba social funciona ("personas como usted han resuelto su saldo a tiempo"), pero **solo si es verídica y no estigmatiza** ([Renascence](https://www.renascence.io/journal/behavioral-economics-statistics-data-that-drives-insight)). En cobranza de arriendo:
- ✅ Si es cierto: "La mayoría de nuestros arrendatarios pone su pago al día con un plan en cuotas." (solo si los datos lo respaldan)
- ❌ Cifras inventadas ("el 95% ya pagó") → prohibido bajo Estatuto del Consumidor y FDCPA-equivalente.

> **Regla de oro:** ninguna afirmación cuantitativa o comparativa sin dato que la sustente. La honestidad no es solo ética: las afirmaciones falsas o engañosas son sancionables (Estatuto del Consumidor / SIC; análogo a FDCPA en US — [FTC](https://www.ftc.gov/legal-library/browse/rules/fair-debt-collection-practices-act-text); [CFPB](https://www.consumerfinance.gov/ask-cfpb/what-is-an-unfair-deceptive-or-abusive-practice-by-a-debt-collector-en-1401/)).

### 8.4 Simplificación como nudge
El obstáculo más común no es la voluntad, es la fricción. Reducir pasos (link precargado, monto exacto, sin login) es el nudge de mayor retorno y 100% ético. Mensajes simples y accionables superan a los complejos.

---

## 9. Timing: hora del día y día de la semana

### 9.1 Restricción legal primero
La ventana legal (Ley 2300) acota TODO: L–V 7am–7pm, sábados 8am–3pm, nunca domingos/festivos. Cualquier "mejor hora" debe caer dentro de esto.

### 9.2 Mejores ventanas (dentro de lo legal)
Referencia de mercado (US/UK, validar localmente):
- **Martes a jueves, 9–11am** son las de mejor respuesta ([Hoist](https://hoist.digital/content/blog/the-best-time-to-send-text-message-reminders); [Omnisend](https://www.omnisend.com/blog/best-time-to-send-sms/)).
- Para recordatorio del día de vencimiento: **temprano (8–10am)** para que puedan pagar antes de cerrar el día.
- Evitar viernes en la tarde y, por ley, fines de semana/festivos.
- Horario hábil general 10am–8pm para mensajería; tardes (después de 4pm) compiten con hora pico de tráfico.

### 9.3 Recomendación de calendario para el agente
| Toque | Día/hora sugerida (dentro de Ley 2300) |
|---|---|
| Recordatorio pre-vencimiento (S0) | Martes–jueves 9–10am |
| Aviso día de vencimiento | El día, 8–9am |
| Primer seguimiento (vencido) | Martes–jueves 9–11am |
| Confirmación de PTP | Día anterior a la fecha pactada, mañana |
| Recibo/agradecimiento | Inmediato al detectar el pago (cualquier hora hábil) |

> Nota: el "recibo de pago" inmediato es informativo/positivo; aun así, respetar horario por prudencia y consistencia.

---

## 10. Secuenciación del mensaje a lo largo de la cadencia (S0 → S5)

El **contenido emocional/informativo** evoluciona; el **respeto y la legalidad** son constantes. La intensidad sube en *claridad sobre consecuencias reales*, NUNCA en agresividad.

| Etapa | Momento | Tono | Objetivo del mensaje | Canal sugerido |
|---|---|---|---|---|
| **S0 — Pre/recordatorio amable** | antes y el día de vencimiento | cálido, neutro, "favor recordarle" | facilitar pago a tiempo | WhatsApp |
| **S1 — Primer aviso de vencido** | 1–5 días | cordial, sin alarma | recordar saldo + link | WhatsApp |
| **S2 — Seguimiento + oferta de plan** | 6–12 días | empático, resolutivo | ofrecer cuotas / ayuda | WhatsApp + (1) llamada opcional |
| **S3 — Aviso formal con datos** | 13–25 días | formal, claro, factual | dejar claro el saldo, plazos e intereses reales | Llamada + WhatsApp (respetando tope) |
| **S4 — Pre-jurídico (revisión humana)** | 26–40 días | formal, sobrio, informativo de consecuencias reales | informar siguiente paso real del proceso | Llamada, con **validación humana previa** (T-323) |
| **S5 — Antesala legal (revisión humana)** | 40+ días | formal, neutro, sin amenaza | comunicar formalmente la decisión real ya tomada | Carta/llamada formal, **humano en el loop** |

**Reglas de transición:**
- Subir de etapa = más **información y formalidad**, no más presión.
- S4 y S5 **requieren pausa de revisión humana** antes de enviar (Sentencia T-323/2024) — el agente propone, el humano aprueba.
- Nunca acumular canales en una misma semana ni dos toques el mismo día (Art. 3).
- Si el deudor pide baja o un solo canal, respetar y reconfigurar.

---

## 11. Plantillas listas para usar (español colombiano, "usted")

> Variables: `[Nombre]` `[Inmobiliaria]` `[Inmueble/Concepto]` `[$Monto]` `[Fecha]` `[Link]`. Montos en formato COP ($1.450.000).
> Todas incluyen salida/baja según Art. 5 Ley 2300 cuando es primer contacto del periodo.

### 11.1 WhatsApp — Recordatorio pre-vencimiento (S0)
```
Hola [Nombre] 👋 Le saluda [Inmobiliaria].
Le recordamos que su arriendo de [Inmueble] por [$Monto] vence el [Fecha].
Puede pagarlo en un minuto aquí: [Link]
Si ya realizó el pago, ignore este mensaje. ¡Gracias!
```

### 11.2 WhatsApp — Aviso del día de vencimiento (S0/S1)
```
Buenos días, [Nombre]. Hoy [Fecha] vence el pago de su arriendo de [Inmueble] por [$Monto].
Para evitar contratiempos, puede pagar aquí: [Link]
Cualquier duda, responda este mensaje y con gusto le ayudamos.
```

### 11.3 WhatsApp — Primer seguimiento de saldo vencido (S1)
```
Hola [Nombre], esperamos que se encuentre bien.
Notamos que el pago de su arriendo de [Inmueble] por [$Monto], con vencimiento el [Fecha], aún está pendiente.
Si ya pagó, por favor avísenos para registrarlo. Si no, puede hacerlo aquí: [Link]
```

### 11.4 WhatsApp — Seguimiento con oferta de plan (S2)
```
Hola [Nombre]. Le escribimos de nuevo por el saldo pendiente de su arriendo ([$Monto], vencido el [Fecha]).
Entendemos que pueden surgir imprevistos. Si lo prefiere, podemos acordar un plan en cuotas que se ajuste a usted.
¿Le comparto las opciones? También puede pagar el total aquí: [Link]
```

### 11.5 WhatsApp — Aviso formal con datos reales (S3)
```
Estimado(a) [Nombre], le escribimos de [Inmobiliaria] respecto al pago de su arriendo de [Inmueble].
Saldo pendiente: [$Monto]. Vencimiento: [Fecha].
Le invitamos a regularizarlo antes del [Fecha límite real] para evitar [intereses de mora según su contrato].
Pague aquí: [Link] · O escríbanos para acordar un plan.
```

### 11.6 Confirmación de acuerdo de pago (PTP)
```
Gracias, [Nombre]. Confirmamos su acuerdo:
• Valor: [$Monto]
• Fecha de pago: [Fecha]
• Medio: [Link de pago / cuenta]
Le escribiremos un recordatorio el [Fecha-1]. Cualquier cambio, avísenos con tiempo. ¡Gracias por su gestión!
```

### 11.7 Recordatorio de PTP (un día antes)
```
Hola [Nombre], le recordamos su acuerdo de pago de [$Monto] para mañana [Fecha].
Para facilitarlo, aquí tiene el enlace: [Link]
Si necesita ajustar la fecha, respóndanos y vemos opciones.
```

### 11.8 Agradecimiento / recibo de pago
```
Hola [Nombre] ✅ Confirmamos su pago de [$Monto] correspondiente a [Inmueble].
Su cuenta de arriendo queda al día. Gracias por su pago y su confianza en [Inmobiliaria].
```

### 11.9 Respuesta a opt-out / "no me escriban más"
```
Entendido, [Nombre]. Respetamos su solicitud.
Si lo prefiere, podemos coordinar un único canal y una fecha para resolver su saldo.
Quedamos atentos cuando usted lo disponga.
```

### 11.10 Guion de voz — apertura + verificación + propuesta
```
[Apertura]
"Buenos días, hablo con [Nombre]? Le llama [Agente] de [Inmobiliaria].
Le contacto para ayudarle a resolver un tema de su cuenta de arriendo. ¿Tiene un minuto?"

[Verificación — antes de dar detalles]
"Para proteger su información, ¿me confirma su nombre completo, por favor?"
(Solo tras verificar, mencionar el saldo.)

[Motivo + dato]
"Gracias. El motivo es el saldo de su arriendo de [Inmueble], por [$Monto], con vencimiento el [Fecha]."

[Escucha — si objeta]
(Escuchar sin interrumpir. No preguntar el motivo del no pago.)
"Lo escucho. Lo importante es encontrar una opción que le funcione."

[Propuesta]
"Podemos hacerlo de dos formas: el pago total hoy con un enlace que le envío,
o un plan en cuotas. ¿Cuál se ajusta mejor a usted?"

[Confirmación]
"Entonces quedamos en [$Monto] el [Fecha], ¿correcto?
Le envío el enlace ahora y le escribo un recordatorio el día anterior."

[Cierre]
"Gracias por su tiempo, [Nombre]. Quedo atento. Que tenga un buen día."
```

---

## 12. Técnicas globales EXCLUIDAS por ser ilegales o no éticas en Colombia

> Banderas de cumplimiento. Estas son prácticas que aparecen en literatura de cobranza internacional pero **NO se usan** en este agente.

| Técnica excluida | Por qué se excluye | Norma |
|---|---|---|
| Contactar referencias personales / familiares / vecinos / empleador | Prohibido contactar terceros | Ley 2300, Art. 4 |
| Llamar/escribir en domingos, festivos o fuera de 7am–7pm (sáb 8am–3pm) | Fuera de ventana legal | Ley 2300, Art. 3 |
| Múltiples canales o múltiples toques el mismo día/semana | Excede tope de frecuencia | Ley 2300, Art. 3 |
| Visitas a domicilio o lugar de trabajo | Prohibidas (salvo microcrédito) | Ley 2300, Art. 6 |
| Preguntar "¿por qué no ha pagado?" | Prohibido indagar el motivo | Ley 2300, Art. 7 |
| Amenazas de demanda/reporte que no son ciertas o inmediatas | Engaño / amenaza | Estatuto del Consumidor / análogo FDCPA |
| Decir falsamente que ya está reportado a centrales de riesgo | Falsa representación | Habeas Data / Estatuto del Consumidor |
| "Última oportunidad", urgencia falsa, conteos regresivos inventados | Presión engañosa | Estatuto del Consumidor |
| Prueba social/estadísticas inventadas ("el 98% ya pagó") | Afirmación falsa | Estatuto del Consumidor |
| Lenguaje vergonzante, insultos, mayúsculas como grito, "moroso" | Hostigamiento / afectación de la intimidad | Ley 2300 + dignidad |
| Hacerse pasar por abogado/autoridad/juzgado | Suplantación / engaño | Estatuto del Consumidor / Código Penal |
| Decisiones de escalamiento de alto impacto 100% automáticas sin humano | Falta de control humano significativo | Sentencia T-323/2024 |

---

## 13. Checklist de control de calidad por mensaje (pre-envío)

Antes de que el agente envíe CUALQUIER mensaje, debe pasar:

- [ ] **Horario legal:** ¿dentro de L–V 7–19h / sáb 8–15h, no festivo?
- [ ] **Frecuencia:** ¿respeta 1/día y no apila canales en la semana?
- [ ] **Destinatario:** ¿es el deudor/codeudor/avalista (nunca tercero)?
- [ ] **Tratamiento:** ¿usa "usted", neutral-formal?
- [ ] **Estructura:** ¿1 idea, monto, fecha, 1 CTA, link?
- [ ] **Honestidad:** ¿toda afirmación (intereses, consecuencias, prueba social) es verdadera y verificable?
- [ ] **Sin prohibidos:** ¿sin amenazas, sin "moroso", sin preguntar el motivo, sin urgencia falsa?
- [ ] **Salida fácil:** ¿incluye opción de baja / canal preferido?
- [ ] **Etapa S4/S5:** ¿pasó revisión humana antes de enviar? (T-323)
- [ ] **Lenguaje claro:** ¿frases cortas, sin jerga, legible de un vistazo?

---

## 14. Métricas de tono/mensaje a instrumentar (para mejora continua)

Para validar localmente las cifras de mercado citadas (provienen de US/UK):
- **Tasa de respuesta** por plantilla y por hora/día.
- **Tasa de clic** en el link de pago.
- **Conversión a pago** por etapa S0–S5.
- **Tasa de cumplimiento de PTP** vs. promesas rotas.
- **Tasa de opt-out / quejas** (señal de tono percibido como agresivo).
- **Tasa de escalamiento a humano** (objetivo: bajo, como en agentes 01/02).
- **Sentimiento de respuesta** (positivo/neutral/negativo) por plantilla.

> A/B testear honestamente: variar saludo, longitud, presencia de oferta de plan, framing de urgencia legítima. Nunca testear técnicas excluidas (sección 12).

---

## 15. Fuentes

**Marco legal colombiano (primario y análisis):**
- Ley 2300 de 2023 — Función Pública (Gestor Normativo): https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990
- Ley 2300 de 2023 — Alcaldía de Bogotá: https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=143903
- Sentencia T-323 de 2024 — Corte Constitucional: https://www.corteconstitucional.gov.co/relatoria/2024/T-323-24.htm
- Análisis T-323/2024 — U. Externado: https://propintel.uexternado.edu.co/resumen-de-la-sentencia-t-323-de-2024-de-la-corte-constitucional-de-colombia-sobre-el-uso-de-ia-por-jueces-de-la-republica/
- Escuela Judicial Rodrigo Lara Bonilla — T-323/2024: https://escuelajudicial.ramajudicial.gov.co/noticia/decision-innovadora-sentencia-t-323-de-2024-la-inteligencia-artificial-ia-no-puede
- tusdatos.co — Ley 2300 "Dejen de Fregar": https://www.tusdatos.co/blog/ley-2300-dejen-de-fregar
- Data Law — 10 preguntas Ley 2300: https://datalawsas.com/ley-2300-colombia-derechos-consumidores
- Colcob — Ley 2300 "Derecho a la Intimidad": https://colcob.com/lo-que-debe-saber-sobre-la-ley-2300-derecho-a-la-intimidad/
- DNP — Lenguaje Claro: https://2022.dnp.gov.co/programa-nacional-del-servicio-al-ciudadano/Programas-Especiales/Paginas/Lenguaje-claro.aspx
- Guía de Lenguaje Claro (DNP, PDF): https://colaboracion.dnp.gov.co/CDT/Programa%20Nacional%20del%20Servicio%20al%20Ciudadano/GUIA%20DEL%20LENGUAJE%20CLARO.pdf

**Empatía, experiencia de cliente y recuperación:**
- FusionCX — Empathy in Debt Recovery: https://www.fusioncx.com/blog/bfsi/debt-collection/the-importance-of-empathy-and-customer-service-in-debt-recovery/
- PDCflow — Listening Improves Recovery: https://www.pdcflow.com/debt-collection/how-listening-to-customers-improves-debt-collection-recovery-rates/
- Commercial Collectors — CX in Debt Collection: https://commercialcollectors.com/collections/customer-experience-in-debt-collection/

**Microcopy WhatsApp/SMS y plantillas:**
- Kleva — Mensajes de cobranza amable por WhatsApp: https://www.kleva.co/post/mensajes-de-cobranza-amable-para-enviar-por-whatsapp/
- Kleva — 50 frases para cobrar amablemente: https://www.kleva.co/post/50-frases-cobrar-dinero-amablemente-2025/
- Colektia — Frases para cobrar amablemente: https://colektia.com/blog/frases-cobrar-para-dinero-amablemente
- Tratta — Debt Collection SMS strategies/templates: https://www.tratta.io/blog/debt-collection-sms-strategies-templates
- Chaser — SMS payment reminder samples: https://www.chaserhq.com/blog/5-sms-payment-reminder-text-message-samples-to-chase-invoices
- Messente — Payment reminder messages: https://messente.com/blog/payment-reminder-message
- Text Request — Payment reminder templates: https://www.textrequest.com/templates/payment-reminders
- Esendex — SMS payment reminder templates: https://www.esendex.co.uk/blog/post/sms-payment-reminder-templates/

**Guiones de voz y manejo de objeciones:**
- Tratta — Effective debt collection scripts: https://www.tratta.io/blog/effective-debt-collection-scripts
- Prodigal — 11 call script samples: https://www.prodigaltech.com/ltblogs/11-effective-debt-collection-call-scripts-with-real-examples
- CloudTalk — 21 phone call scripts: https://www.cloudtalk.io/blog/phone-call-scripts-for-collections/
- Yonyx — Best practices for collection call scripts: https://corp.yonyx.com/customer-service/best-practices-for-writing-debt-collection-call-sample-scripts-12-samples/
- FasterCapital — Handling objections in call scripts: https://fastercapital.com/content/Collection-call-scripts--Handling-Objections--Tips-for-Collection-Call-Script-Design.html

**De-escalamiento:**
- Myra Golden — 57 phrases to de-escalate: https://www.myragolden.com/blog/57-phrases-to-de-escalate-any-angry-customer
- Indeed — De-escalation techniques: https://www.indeed.com/career-advice/career-development/de-escalation-techniques-customer-service
- Talaera — Customer de-escalation phrases: https://www.talaera.com/industry-specific-english/customer-de-escalation-phrases/

**Promise to pay (PTP):**
- LeanPay — Promise to pay in collections: https://www.leanpay.io/en/blog/promise-to-pay
- insideARM — Promise to pay follow-up policies: https://www.insidearm.com/news/00005797-promise-to-pay-follow-up-policies/

**Economía conductual / nudges / timing:**
- McKinsey — Behavioral insights in collections: https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/behavioral-insights-and-innovative-treatments-in-collections
- Renascence — Behavioral economics statistics: https://www.renascence.io/journal/behavioral-economics-statistics-data-that-drives-insight
- Behavioral nudges prevent loan delinquencies (NIH/PMC): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11789030/
- Hoist — Best time to send text reminders: https://hoist.digital/content/blog/the-best-time-to-send-text-message-reminders
- Omnisend — Best time to send SMS 2026: https://www.omnisend.com/blog/best-time-to-send-sms/
- Sender — SMS open rate statistics: https://www.sender.net/blog/sms-open-rates/

**Cultura/idioma colombiano (registro "usted", regiones):**
- TruFluency — Colombian Spanish regional accents: https://trufluency.com/your-guide-to-colombian-spanish-regional-accents-of-colombia/
- Bunpo — Colombian slang by region: https://bunpo.app/blog/spanish/colombian-slang-by-region-greetings-jokes-and-terms-of-love/
- Cultural Atlas — Colombian communication: https://culturalatlas.sbs.com.au/colombian-culture/colombian-culture-communication
- SpanishStep — Colombian accent clarity: https://spanishstep.com/archives/6255
- Two.travel — Colombian Spanish accents guide: https://two.travel/colombia/colombian-spanish-accents-slang-language-guide/

**Cumplimiento (referencia comparada US, para principio de honestidad):**
- FTC — Fair Debt Collection Practices Act (text): https://www.ftc.gov/legal-library/browse/rules/fair-debt-collection-practices-act-text
- CFPB — Unfair/deceptive/abusive practices: https://www.consumerfinance.gov/ask-cfpb/what-is-an-unfair-deceptive-or-abusive-practice-by-a-debt-collector-en-1401/

---

*Documento de investigación de dominio. Las cifras de impacto provenientes de mercados US/UK están señaladas como "validar localmente"; deben confirmarse con un piloto en Colombia antes de tratarlas como metas. Todo lo legal está anclado en fuente primaria colombiana.*
