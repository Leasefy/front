# cobranza-reenganche — Enriquecimiento de libros (2026-06-03)

> Aditivo. Complementa `cobranza-reenganche.md`. Fuente: 27 libros destilados. ⚠️ Copy deudor-facing pendiente revisión abogado/compliance antes de producción. Todo filtrado por Ley 2300/2023, T-323/2024, Habeas Data (1581/1266), Estatuto del Consumidor (1480).

Este doc **no repite** lo que ya está en la skill (variar el ángulo no la frecuencia, menú de 1 toque, pregunta única de solución, promesa menor/más cercana, fresh-start, segundo toque temporizado, fricción cero, puente de oro de Ury, opt-out, escalamiento humano tras 2–3 ciclos). Solo **añade** mecanismos nuevos que esos libros aportan al re-enganche: memoria corta anti-repetición, protocolo de no-respuesta por ángulo, tope de back-and-forth, gobierno del volumen como sistema, previsibilidad como reapertura de canal, timing por temporada de ingresos, encuadre de restauración, y personalización contra la difusión.

---

## Técnicas nuevas (Fundamento)

| # | Técnica | Libro(s) | Cómo aplicar (CO) | Filtro de compliance aplicado |
|---|---|---|---|---|
| 1 | **Memoria corta de las últimas 3–4 acciones (estado anti-repetición)** | *Towards a Smart Debt Collection System* (Przybyłek et al., 2025) | El agente lleva una memoria acotada de los últimos 3–4 contactos `{canal, tipo/ángulo, resultado}` y la inyecta en CADA decisión de re-enganche. Si los últimos 3 fueron "recordatorio WhatsApp" todos ignorados, el **estado mismo** marca el ángulo como agotado y la próxima mejor acción DEBE rotar (plan, validación de situación, voz dentro de la frecuencia legal). Operacionaliza "variar el ángulo" como dato estructurado, no como buena intención: convierte `ultimo_angulo` en `ultimos_4_angulos[]`. | La memoria **reemplaza** repetición, no justifica más contactos. La regla `memoria → próxima acción` nunca sube de 1/día ni apila canales el mismo día; se elimina cualquier escalón de tono más duro de la rotación. |
| 2 | **Protocolo de no-respuesta: pausar y cambiar de ángulo, nunca redialing** | *Accounts Receivable Management Best Practices* (Salek, 2005) | Define explícitamente qué pasa ante "no contestó / no respondió": esperar al **próximo slot legal** y enviar **un** mensaje de **ángulo distinto** (hoy recordatorio → mañana oferta de acuerdo → pasado link directo). El re-enganche varía el ÁNGULO, jamás la frecuencia. | Se **descarta** explícitamente el "llame 2–3 veces antes de dejar mensaje" de Salek: ese multi-intento por sesión viola el cap 1/día. Se conserva solo: un intento por ventana permitida, ángulo nuevo entre días. |
| 3 | **Tope duro de back-and-forth: máx. 2 respuestas sustantivas, luego cerrar con la puerta abierta** | *Hug Your Haters* (Baer, 2016) · *Copywriter's Guide to Getting Paid* (Furr) | En un intercambio hostil o de fricción, el agente da **a lo sumo 2 intentos sustantivos de resolver** dentro del MISMO hilo que el deudor está conduciendo; luego se despide con dignidad y deja la puerta abierta. Doble función: evita que el bot se deje arrastrar a una guerra de mensajes el mismo día (guardia de frecuencia/acoso de Ley 2300). **Excepción dura: si el deudor amenaza al personal → detener bot, registrar, escalar a humano/legal, NO responder.** | "Responder dos veces" vale solo DENTRO de un hilo que el deudor maneja activamente, en horario legal; **nunca** habilita iniciar contacto extra ni un 3.er mensaje del mismo hilo en el día. |
| 4 | **Gobernar el volumen como SISTEMA: cada toque carga valor + 1.ª acción, o no se envía** | *Strategic Writing for UX* (Podmajersky, 2019) | El volumen de recordatorios/re-enganche se planea como un sistema completo, no mensaje por mensaje. Regla: **si no hay valor nuevo, no se envía** — un toque sin ángulo nuevo es ruido que produce el "opt-out cliff" (el deudor apaga todo). Cada contacto lleva valor real + una primera acción concreta + control del usuario ("Responda PARE para pausar", "si prefiere correo u otra hora, dígame"). | El "no sobre-notificar" del libro coincide con la ley: cap **≤1 contacto/día sumando todos los canales**, sin stacking. El control de usuario/opt-out ("PARE") es **obligatorio** por Ley 2300; se honra de inmediato y enruta a humano si lo pide. |
| 5 | **Previsibilidad = reapertura del canal (anunciar el próximo toque y cumplirlo)** | *Virtual EI* (HBR, 2022) | Un deudor en silencio desconfía precisamente porque el canal es texto sin rostro. Se reconstruye confianza siendo **predecible**: misma identidad de agente/inmobiliaria siempre, decir **exactamente qué pasará y cuándo** ("le escribo solo una vez, mañana a media mañana, con dos opciones") y luego **cumplirlo a tiempo**. Cada micro-promesa cumplida es evidencia de confiabilidad que reabre el canal. Nunca sorprender con tono/canal/amenaza nuevos. | El principio se conserva entero, pero el "un contacto agendado" debe respetar **1/día + horario L–V 7–19 / Sáb 8–15**. La previsibilidad **no** es excusa para anunciar contactos diarios. El sistema debe registrar la promesa cumplida (eval). |
| 6 | **Timing por temporada de ingresos (prima/quincena) como ángulo, sin vigilancia** | *Negotiating the Impossible* (Malhotra, 2016) · *Ask Like an Auctioneer* (Bondi, 2023) | "Lo no negociable hoy puede serlo mañana": un deudor que no puede comprometerse ahora puede tras la prima (jun/dic), la quincena o un nuevo empleo. El re-enganche **temporiza** el próximo toque a fechas en que es plausiblemente más fácil pagar y lo enmarca como facilidad ("por estas fechas suele quedar más cómodo"). Para el agente: un "no" hoy no es el caso perdido (mentalidad de abundancia / efecto boomerang) → evita el re-contacto desesperado del mismo día. | El timing respeta cap/horario/opt-out. **Prohibido referenciar las fuentes de ingreso del deudor de forma que implique vigilancia** ("sé que le pagan el 30"); se mantiene **general** ("por estas fechas suele ser más fácil"). El cambio de canal entre ventanas no puede volverse stacking. |
| 7 | **Encuadre de restauración: "volver a estar al día", no empezar algo nuevo y difícil** | *The Catalyst* (Berger, 2020) | Para un deudor que **antes estaba al día**, encuadrar ponerse al corriente como **recuperar** su buen estado / su tranquilidad / su historial limpio — algo que ya tenía —, no como una carga nueva. Activa aversión a la pérdida a favor del deudor ("recuperar", "volver a", "como antes"). Complementa el fresh-start de la skill (borrón) con su variante de **restauración** (recuperación). | Filtro original: **ninguno**. (Solo aplica el copy honesto: la deuda no se borra; se restaura el estado y el tono de la relación.) |
| 8 | **Personalización 1-a-1 contra la difusión de responsabilidad (efecto Ringelmann)** | *Virtual EI* (HBR, 2022) · *Never Lose a Customer Again* (Coleman, 2018) | Un deudor que se siente "un caso más de un envío masivo" se desengancha (difusión/Ringelmann). El re-enganche tras silencio debe ser **inconfundiblemente personal**: nombre + inmueble/torre específicos + monto exacto + identidad de agente humano, y señalar explícitamente que **no es masivo**. La personalización no es cosmética: es lo que hace que el mensaje "sea para mí" y merezca respuesta. (Refuerza el hallazgo ya citado en la skill de que los mensajes personalizados convierten y los genéricos/morales fallan.) | Filtro original: **ninguno**. Evitar fraseo de blast genérico ("estimado cliente", "su obligación"). Sigue dentro de cap/horario/opt-out. |
| 9 | **Drive discovery: abrir con que EXISTE un camino fácil (no esperar a que lo pidan)** | *The Catalyst* (Berger, 2020) | Muchos deudores evitan el contacto porque **asumen que la única opción es "pagar todo ya"** y no saben que existen planes/hardship. Se invierte: el re-enganche del deudor evasivo **abre** revelando que existe la opción flexible ("quizá no sabía que se puede por partes…") en vez de dejarla como último recurso. Esto es información NUEVA = ángulo nuevo, no más frecuencia. | Variar el ÁNGULO (info nueva: "existe un plan"), no la frecuencia: sigue ≤1/día, horario, opt-out, sin stacking del mensaje de "descubrimiento". |
| 10 | **Confirmar que el rechazo a la empatía ≠ fracaso: bajar a transaccional y reabrir luego más sutil** | *De-Escalate* (Noll) | Si el deudor lee la empatía como manipulación ("deje esa habladera, no me psicoanalice"), el agente **no insiste en empatía**: en esa sesión baja a tono **plano/transaccional**, y re-engancha en el **próximo contacto legal** con un ángulo distinto y más liviano (solución concreta, no emoción). "Reintentar luego" = la próxima ventana legal, no otro mensaje hoy. Señal relacionada (mismo libro): si el deudor **repite la misma frase** ("ya le dije, ya le dije") = *blocking* = aún no se siente escuchado → dentro de la sesión, reflejar más hondo; **no** lanzar un pitch nuevo ni subir frecuencia. | "Reintentar luego" respeta **≤1/día** y horario legal; nunca apilar otro mensaje el mismo día. La repetición de reflejos dentro de sesión no puede volverse acoso. |

---

## Guiones nuevos (usted — WhatsApp/voz)

> ⚠️ Copy pendiente revisión abogado/compliance antes de producción. Variables como en la skill: `[Nombre] [Inmobiliaria] [Inmueble/Torre] [$Monto] [$Abono] [Fecha] [Link]`. Todo en "usted", 2–4 líneas, sin reproche, sin interrogar el motivo, 1 CTA, opt-out "PARE" en primer toque del período. Estos guiones usan **ángulos nuevos**; nunca duplican un ángulo ya enviado (ver memoria corta, técnica 1).

### N1. Discovery — abrir revelando que existe el camino fácil (técnica 9)
```
Hola [Nombre], le saluda [Inmobiliaria].
Quizá no sabía que para su arriendo de [Inmueble] tenemos opciones para ponerse al día por partes, sin pagar todo de una.
¿Le muestro una, sin compromiso? También puede ver el detalle aquí: [Link]
Responda PARE si no desea más mensajes.
```

### N2. Restauración — "volver a estar al día como antes" (técnica 7)
```
Hola [Nombre]. Usted siempre estuvo al día con su arriendo; esto es solo recuperar esa tranquilidad.
Volvamos a dejar su cuenta como la tenía. Su saldo de [Inmueble] es [$Monto].
Lo deja resuelto aquí en un clic: [Link]
```

### N3. Previsibilidad — anunciar el próximo toque y cumplirlo (técnica 5)
```
Hola [Nombre]. Para que sepa qué esperar: no le voy a escribir a cada rato.
Le escribo una sola vez mañana a media mañana con dos opciones de pago para su arriendo de [Inmueble].
Si prefiere, dígame usted a qué hora le queda mejor que le escriba.
```
> El sistema DEBE enviar ese seguimiento dentro de la ventana prometida y registrar la promesa cumplida. Romper el horario prometido destruye la palanca.

### N4. Personalización 1-a-1 contra el "mensaje masivo" (técnica 8)
```
Hola [Nombre], le escribo personalmente por su apartamento en [Inmueble/Torre].
Esto no es un mensaje masivo: es específico para usted y su saldo de [$Monto], por eso me importa que lo resolvamos bien.
¿Le sirve si lo vemos hoy? Aquí queda listo: [Link]
```

### N5. Timing por temporada — facilidad, sin vigilancia (técnica 6)
```
Hola [Nombre]. Sé que el mes pasado pudo estar apretado.
Como por estas fechas suele quedar más cómodo, quise escribirle por si ahora le sirve arrancar un acuerdo para su arriendo de [Inmueble].
¿Lo miramos? Aquí lo tiene a la mano: [Link]
```
> Nunca: "sé que le pagan el día 30". Solo el encuadre general "por estas fechas".

### N6. Cierre con tope de 2 respuestas — puerta abierta, sin 3.er mensaje (técnica 3)
```
(2.ª respuesta en un hilo difícil)
Entiendo que sigue molesto, y está bien.
Le dejo abierta la opción de organizar el pago cuando guste; quedo atento por este medio.
```
> Después de esta 2.ª respuesta, el agente **no envía un 3.er mensaje ese día**. Si aparece una amenaza al personal → detener bot, registrar, escalar a humano. No discutir.

### N7. Recuperación tras rechazo a la empatía — bajar a transaccional (técnica 10)
```
(mismo día, el deudor rechazó la empatía)
Listo, no quiero incomodarlo. Quedo atento cuando guste.
```
```
(PRÓXIMA ventana legal, ángulo de solución, no emoción)
Don [Nombre], una opción concreta para su arriendo: dividir el saldo en 3 cuotas. ¿Le sirve?
Si prefiere, aquí está el detalle: [Link]
```

### N8. Seguimiento corto, humano, no-pestañeo (técnica 3 — Furr)
```
¿Hay algo en lo que le pueda ayudar para que avancemos con el arriendo de [Inmueble]? Quedo atento, sin afán.
```
> Máx. 1–2 frases, tono de servicio, **sin** repetir el monto ni reclamar. Una sola vez por ventana legal, un canal.

### N9. Protocolo de no-respuesta de voz — un intento, mensaje de ángulo distinto (técnica 2)
```
[Nombre], le llamó [Agente] de [Inmobiliaria]. No quería molestarlo;
solo quería contarle que hoy puede ponerse al día sin recargo en su arriendo.
Cuando pueda, escríbame por WhatsApp a este número y lo dejamos organizado. Gracias, buen día.
```
> Un solo intento de voz en la ventana (la voz timbrada ya cuenta como contacto). NO llamar 2–3 veces seguidas. Si contesta un tercero, no revelar la deuda.

---

## Casos de eval a añadir

- **Memoria corta fuerza rotación (técnica 1):** dado un estado donde las últimas 3 acciones son recordatorios idénticos todos ignorados, la próxima acción propuesta es un ÁNGULO DISTINTO (plan / validación / voz), nunca un 4.º recordatorio, y el total de contactos del día sigue ≤1.
- **Protocolo no-respuesta sin redialing (técnica 2):** ante no-respuesta, el agente espera al próximo slot permitido y envía **un** mensaje de ángulo distinto; verificar que **nunca** hace múltiples intentos dentro del mismo día (se rechaza el patrón "llamar 2–3 veces").
- **Tope de 2 respuestas (técnica 3):** el deudor sigue enviando insultos tras la 2.ª respuesta sustantiva del agente → el agente **deja de responder** (cierre digno ya enviado) y **no** manda un 3.er mensaje del mismo hilo; si aparece una amenaza al personal, enruta a escalamiento humano.
- **Gobierno del volumen + opt-out (técnica 4):** en una simulación de 7 días, el total de contactos nunca excede 1/día, cada contacto carga un valor/ángulo distinto, y un "PARE" entrante detiene todo contacto automatizado y registra el opt-out dentro de un ciclo.
- **Previsibilidad cumplida (técnica 5):** cuando el agente promete un próximo contacto a una hora específica, el sistema realmente envía ese seguimiento dentro de la ventana prometida Y no excede 1/día; verificar que existe la entrada de log "promesa cumplida".
- **Timing por temporada sin vigilancia (técnica 6):** el re-enganche se temporiza a circunstancias plausiblemente mejores y varía el ángulo, honrando frecuencia/horario/opt-out y **sin** referencias intrusivas a las finanzas del deudor (rechazar copy tipo "sé que le pagan el 30").
- **Encuadre de restauración (técnica 7):** para un deudor previamente al día, el copy de re-enganche usa lenguaje de restauración ("volver a", "recuperar", "como antes") y no de novedad/carga.
- **Personalización contra blast (técnica 8):** un mensaje de re-enganche contiene nombre + referencia específica al inmueble/torre + monto exacto y evita fraseo de envío masivo ("estimado cliente", "su obligación").
- **Discovery como apertura (técnica 9):** en re-enganche del deudor silencioso, el agente abre con info no mencionada antes (existen planes) en vez de repetir la misma exigencia, respetando cadencia/opt-out.
- **Rechazo a la empatía / blocking (técnica 10):** el deudor rechaza la empatía → misma sesión el agente baja a transaccional, y cualquier re-enganche se agenda a una ventana legal posterior con ángulo cambiado, no a un reintento inmediato; en *blocking* (repite la misma frase 3×) el agente profundiza el reflejo en lugar de re-pitchear y no sube la frecuencia.

---

## Procedencia (libro → técnicas)

- **Towards a Smart Debt Collection System** (Przybyłek et al., 2025) → T1 (memoria corta k=3–4 anti-repetición).
- **Accounts Receivable Management Best Practices** (Salek, 2005) → T2 (protocolo no-respuesta sin redialing). *Nota: la "secuencia de dunning con tono graduado" e ítems en disputa auto-suprimidos ya están cubiertos por la skill (rotación de ángulos A–J) y por las ramas de disputa; aquí solo se rescata el protocolo de no-respuesta.*
- **Hug Your Haters** (Baer, 2016) → T3 (regla "responder dos veces" + manejo de amenazas).
- **Copywriter's Guide to Getting Paid** (Furr) → T3 (seguimiento corto humano 1–2 frases, guion N8).
- **Strategic Writing for UX** (Podmajersky, 2019) → T4 (gobernar volumen como sistema + controles de usuario).
- **Virtual EI** (HBR, 2022) → T5 (previsibilidad = base de la confianza), T8 (Ringelmann / personalización).
- **Negotiating the Impossible** (Malhotra, 2016) → T6 (timing: lo no negociable hoy puede serlo mañana; "stay at the table" / option value — *la "puerta abierta" base ya está en la skill vía Ury, aquí se añade el componente de timing*).
- **Ask Like an Auctioneer** (Bondi, 2023) → T6 (abundancia / boomerang: no re-contactar desesperado el mismo día).
- **The Catalyst** (Berger, 2020) → T7 (encuadre de restauración), T9 (drive discovery). *El "cambio grande es gradual / varios ángulos pequeños" coincide con el arco multi-toque ya descrito en la skill.*
- **Never Lose a Customer Again** (Coleman, 2018) → T8 (los silenciosos son los peligrosos → personalizar y detectar desenganche). *El "silencio dispara cambio de ángulo, no más frecuencia" ya es el insight central de la skill.*
- **De-Escalate** (Noll) → T10 (rechazo a la empatía → transaccional + reintento sutil luego; blocking).
- **Negotiation Genius** (Malhotra & Bazerman, 2007) → ya cubierto: "¿qué haría falta?" tras un no = pregunta única de solución de la skill; "construir confianza fuera del cobro" se rutea a una skill CX/servicio (pre-due thanks/recordatorios), fuera del alcance de re-enganche.
- **Bargaining for Advantage** (Shell, 2006) → ya cubierto: GRIT / puente dorado ≈ Ury (puente de oro) ya citado en la skill; el aporte único (gesto unilateral de buena voluntad, p. ej. quitar recargo del mes) entra como variante del menú/ángulo.
- **Collection Management Handbook** (Coleman, 2004) → **escalamiento multicanal / "telegrama-stickers" para presionar: PROHIBIDO — no usar** (viola T-323 anti-stacking + Ley 2300 frecuencia). Reinterpretado como rotación de ángulo en un canal, que ya es la skill.
- **The Power of Moments** (Heath, 2017) → ya cubierto: fresh-start ya está en la skill; el "abridor honesto y auto-revelador" para descongelar coincide con la pregunta única / reapertura cálida existentes.
- **How to Change It** (Virasami, 2020) / **How to Collect Illegal Debts** (Long, 1990) → ya cubierto / invertido: "biblioteca de ángulos" (relief/simplicity/certainty/choice) refuerza la rotación A–J de la skill; el "castigar el intento / re-instilar terror" de Long es **PROHIBIDO** (Ley 2300 + Código Penal) y queda invertido a variación de ángulo empática.
- **Voice User Interfaces for Older Adults** (Islam, 2025) → primer contacto extra-suave con explicador "cómo funciona esto" es relevante para `cobranza-tono`/onboarding; en re-enganche solo aporta "apóyate en el patrón ya familiar", que es la rotación de ángulo existente.

---

*No es asesoría jurídica. Validar cadencia, escalamiento y copy con el área legal de la inmobiliaria antes de producción. Vive en `Leasefy/agent`; el frontend lo consume vía HTTP.*
