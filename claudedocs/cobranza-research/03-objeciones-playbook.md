# Playbook de Manejo de Objeciones — Agente Autónomo de Cobranza (Arrendamiento, Colombia)

> **Propósito.** Catálogo exhaustivo de objeciones y situaciones de deudores de arrendamiento residencial, con un marco de respuesta cumplidor + guion en español colombiano (usted, neutral-formal, baja exigencia lectora) para cada caso. Cada objeción se mapea a la etapa de cadencia (S0–S5) y se marcan las respuestas que violarían la Ley 2300.
>
> **Alcance.** Cobranza legítima de cánones de arrendamiento de vivienda urbana realmente adeudados. La inmobiliaria es la acreedora legítima (o mandataria del arrendador). El objetivo es subir la tasa de recuperación mediante **claridad, empatía, contacto en el momento/canal correcto, nudges honestos y rutas de pago fáciles** — nunca presión, engaño, vergüenza ni hostigamiento.
>
> **Fecha:** 2026-06-02 · **Mercado:** Colombia · **Moneda:** COP · **Canales:** WhatsApp + voz.

---

## 0. Cómo usar este documento

Cada objeción sigue la misma estructura:

1. **Qué dice / qué pasa** — el disparador.
2. **Qué hay detrás** — lectura del subtexto (no para manipular, sino para responder a la necesidad real).
3. **Marco de respuesta cumplidor** — pasos del agente, mapeados a etapa.
4. **Guion (CO-ES)** — texto listo, "usted", bajo grado de lectura.
5. **Qué NO hacer (banderas Ley 2300 / T-323)** — frases o conductas prohibidas.
6. **Disparador de escalamiento humano** — cuándo el agente debe pausar y pasar a un humano.

Las etiquetas `[VIOLA L2300 Art. X]` señalan respuestas ilegales que quedan **excluidas** de todo guion del agente.

---

## 1. Marco legal que gobierna toda respuesta (resumen operativo)

Todo guion de este playbook está restringido por las siguientes reglas. Si una respuesta "efectiva" choca con una de estas, **gana la regla**.

### 1.1 Ley 2300 de 2023 ("Dejen de Fregar") — conducta de cobranza
Aplica a entidades de cobranza de servicios y financieras; el estándar de conducta es el referente de mercado para cobranza de arrendamiento. Vigente desde el 10 de octubre de 2023. ([Función Pública — Ley 2300 de 2023](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990), [tusdatos.co](https://www.tusdatos.co/blog/ley-2300-dejen-de-fregar))

- **Horario permitido (Art. 3):** lunes a viernes 7:00 a.m.–7:00 p.m.; sábados 8:00 a.m.–3:00 p.m. **Prohibido** domingos y festivos. Horarios distintos solo con consentimiento expreso del consumidor en instrumento separado del contrato.
- **Frecuencia (Art. 3):** tras un contacto directo, **no** se puede contactar por varios canales en la misma semana **ni más de una vez el mismo día**.
- **Canales (Art. 2):** solo los canales que el consumidor **autorice**; debe poder elegir cuáles.
- **Terceros (Art. 4):** **prohibido** contactar referencias personales o de cualquier índole. Codeudor / avalista / deudor solidario reciben la misma protección que el deudor principal (no son "terceros" pero tampoco se les hostiga).
- **Visitas (Art. 6):** **prohibidas** las visitas de cobranza al domicilio o lugar de trabajo (salvo excepciones de microcrédito/agro con autorización expresa — no aplican a arrendamiento estándar).
- **Motivo del incumplimiento (Art. 7):** el cobrador **no puede preguntar** al deudor por qué no pagó. Sí puede ofrecer y discutir alternativas de pago. → **Implicación clave:** ante "no tengo dinero", el agente NO interroga sobre las causas; recibe lo que el deudor voluntariamente cuente y pivotea a soluciones.
- **Opt-out (Art. 2 y 5):** mecanismo ágil para cancelar mensajes en cualquier momento; debe respetarse de inmediato.
- **Sanciones (Art. 9):** SIC y Superintendencia Financiera, en el marco de la Ley 1266 de 2008.

### 1.2 Sentencia T-323 de 2024 — supervisión humana de la IA
Aunque el caso es judicial, fija principios vinculantes para uso de IA aplicables por analogía al diseño del agente: **control humano** efectivo, **no sustitución** del razonamiento humano, **transparencia** y **responsabilidad**. ([Corte Constitucional — T-323/24](https://www.corteconstitucional.gov.co/relatoria/2024/t-323-24.htm))

- El agente **no decide** unilateralmente sobre fraude, acciones legales, condonaciones ni terminación del contrato: esos puntos pausan para revisión humana.
- Transparencia: el deudor debe poder entender que interactúa con un sistema asistido y cómo escalar a una persona.

### 1.3 Ley 1581 de 2012 (Habeas Data general) y Ley 1266 de 2008 (Habeas Data financiero)
- Reporte negativo a centrales de riesgo **solo** procede con **comunicación previa** al titular y **20 días calendario** después de enviada esa comunicación, para que pueda pagar o controvertir. ([Función Pública — Ley 1266 de 2008](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=34488))
- Permanencia del reporte: máximo 4 años desde el pago; si la mora fue < 2 años, el doble del tiempo en mora.
- → **Implicación clave:** el agente **nunca** amenaza con "lo reporto hoy" ni inventa que "ya está reportado". Solo puede informar de forma neutral el procedimiento legal y los plazos reales, y solo si efectivamente aplica.

### 1.4 Ley 820 de 2003 (Arrendamiento de vivienda urbana) y Estatuto del Consumidor (Ley 1480 de 2011)
- Obligación del arrendatario: pagar el canon en el plazo y lugar pactados (Art. 9). ([Función Pública — Ley 820 de 2003](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=8738))
- Reparaciones **necesarias no locativas**: el arrendatario puede descontar hasta el 30% del canon (Art. 27) — base legal del contraataque de habitabilidad. ([Función Pública — Ley 820 de 2003](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=8738))
- Pago por consignación (Art. 10): si el arrendador se niega a recibir, el arrendatario consigna en Banco Agrario dentro de los 5 días hábiles siguientes al vencimiento. → relevante para la objeción "ya pagué / intenté pagar y no me recibieron". ([LITESCO — consignación extrajudicial](https://litesco.com.co/blog/consignacion-extrajudicial-canon-arrendamiento), [Gerencie.com](https://www.gerencie.com/el-arrendador-no-me-recibe-el-arriendo.html))
- Interés de mora del canon de vivienda: tasa civil del 6% anual (Art. 1617 C.C.); los cargos de cobranza deben ser proporcionales a la gestión y no automáticos por el solo hecho de la mora. ([Minvivienda — concepto interés por mora](https://www.minvivienda.gov.co/sites/default/files/conceptos_juridicos/interes-por-mora.pdf))

---

## 2. Cadencia S0–S5 (referencia rápida)

| Etapa | Momento típico | Tono | Canal sugerido | Objetivo |
|------|----------------|------|----------------|----------|
| **S0** | Día 0 a +2 (recordatorio temprano/amable) | Cordial, "se le pasó" | WhatsApp | Pago inmediato sin fricción |
| **S1** | +3 a +7 | Cordial-firme, ofrece ayuda | WhatsApp / voz | Pago o intención clara |
| **S2** | +8 a +15 | Firme-empático, propone plan | WhatsApp + voz | Acuerdo de pago |
| **S3** | +16 a +30 | Serio, formaliza acuerdo | Voz + WhatsApp | Compromiso documentado |
| **S4** | +31 a +45 | Formal, informa consecuencias reales | Voz | Última oportunidad pre-legal |
| **S5** | +46+ | Pre-legal / traspaso | Voz + comunicación formal | Aviso de proceso, revisión humana |

> **Regla transversal:** a mayor etapa, **más firmeza informativa**, **nunca más hostigamiento**. La frecuencia y horarios de la Ley 2300 aplican igual en S5 que en S0. La firmeza viene de la **claridad sobre consecuencias reales y verificables**, no del volumen de contactos ni del tono amenazante.

---

## 3. Catálogo de objeciones

### 3.1 "No tengo dinero / estoy sin trabajo" (dificultad real — hardship)

**Qué hay detrás:** estrés financiero genuino, vergüenza, miedo a perder la vivienda. Suele ser el caso de mayor valor: si se maneja bien, recupera; si se maneja mal, gatilla evasión total.

**Marco de respuesta (S1–S4):**
1. **Validar sin juzgar.** Reconocer la situación humana.
2. **No interrogar las causas** `[Ley 2300 Art. 7]` — si el deudor cuenta su situación, se escucha; el agente **no** pregunta "¿por qué no pagó?".
3. **Pivotar a soluciones concretas:** abono parcial hoy + plan de pagos (ver §4).
4. **Dar opciones, no ultimátums.** Dos o tres rutas (abono pequeño hoy, fecha de pago realista, plan en cuotas).
5. **Documentar el compromiso** y confirmar por escrito.

**Guion (WhatsApp, S1–S2):**
> Buen día, Sr./Sra. {nombre}. Entiendo que pueden presentarse meses difíciles y queremos ayudarle a ponerse al día sin que esto se le complique más. ¿Le sirve si buscamos juntos una fecha realista para el pago, o un plan en cuotas que se ajuste a su situación? Cuénteme qué le funciona y lo organizamos.

**Guion (voz, S3, si responde):**
> Sr./Sra. {nombre}, gracias por contestar. Mi objetivo no es presionarlo sino encontrar una salida que usted pueda cumplir. Tenemos dos caminos: un abono parcial ahora y el resto en una fecha que acordemos, o dividir el saldo en cuotas. ¿Cuál se acomoda mejor a lo que usted puede hoy?

**Qué NO hacer:**
- `[VIOLA Ley 2300 Art. 7]` "¿Por qué no pagó? ¿En qué se gastó la plata?"
- "Si no tiene plata, ¿para qué arrendó?" (humillación / shaming).
- Amenazar con desalojo inmediato o "sacar sus cosas" (falso y coercitivo).
- Sugerir que pida prestado a un familiar nombrado por el agente.

**Escalamiento humano:** dificultad estructural (desempleo prolongado, situación de vulnerabilidad declarada, víctima, salud grave) → pausar y pasar a humano para evaluar condonación/quita o ruta social. (T-323: decisiones sobre condonación no las toma la IA sola.)

---

### 3.2 "Ya pagué" (prueba / disputa de pago)

**Qué hay detrás:** puede ser cierto (pago no conciliado, consignación, transferencia a cuenta vieja) o una táctica de demora. Tratar como **verdadero hasta verificar**.

**Marco de respuesta (cualquier etapa):**
1. **Pausar la cobranza activa** sobre ese período mientras se verifica.
2. Pedir el **soporte** (comprobante, fecha, valor, canal/cuenta).
3. Verificar contra el sistema. Si el deudor consignó en Banco Agrario por negativa a recibir (Art. 10 Ley 820), eso es pago válido.
4. Si pagó: **disculparse**, cerrar el ciclo, registrar.
5. Si no aparece: explicar de forma neutral y pedir el soporte para conciliar; nunca acusar de mentir.

**Guion (WhatsApp):**
> Gracias por avisarme, Sr./Sra. {nombre}. Con gusto lo verifico de una vez. ¿Me puede compartir el comprobante (fecha, valor y a qué cuenta o medio pagó)? Mientras reviso, dejo en pausa cualquier recordatorio para no molestarlo de más. Si el pago ya está aplicado, le confirmo y queda resuelto.

**Guion (cuando el pago no aparece, sin acusar):**
> Revisé y por ahora no veo el pago reflejado en el sistema, pero eso puede pasar por tiempos del banco o por una cuenta distinta. Para no perjudicarlo, ¿me ayuda con el soporte y lo conciliamos? Si efectivamente pagó, lo dejamos claro de inmediato.

**Qué NO hacer:**
- "Eso me lo dicen todos / no le creo." (acusación).
- Seguir cobrando el período disputado sin verificar.
- `[VIOLA Habeas Data]` Reportar a centrales mientras hay una disputa de pago de buena fe sin resolver.

**Escalamiento humano:** comprobante presentado que no concilia con registros (posible error contable o, raramente, soporte adulterado) → revisión humana antes de cualquier conclusión.

---

### 3.3 "No reconozco la deuda / el monto no es correcto" (disputa de monto)

**Qué hay detrás:** desacuerdo sobre intereses, cargos de cobranza, servicios, administración, o un canon que cree distinto. A veces táctica; a veces error real de liquidación.

**Marco de respuesta (S1–S4):**
1. **Reconocer el derecho a aclarar.** El consumidor puede controvertir (Estatuto del Consumidor, Habeas Data).
2. **Desglosar el monto** con transparencia: canon, mora, intereses (6% anual civil), cargos de cobranza proporcionales (no automáticos), servicios/administración si aplica.
3. Validar que los cargos sean legítimos; los cargos de cobranza deben ser proporcionales a la gestión.
4. Si hay error → corregir. Si está correcto → explicar con soporte, sin discutir.

**Guion (WhatsApp):**
> Con gusto le aclaro el detalle, Sr./Sra. {nombre}. El saldo se compone así: canon de {mes} por ${X}, más intereses de mora calculados a la tasa legal, y ${Y} de gestión. Si algo no le cuadra, dígame qué punto y lo revisamos con el soporte. Mi interés es que el monto sea justo y claro para usted.

**Qué NO hacer:**
- Inflar el monto con cargos no pactados o no proporcionales (`[contrario a Estatuto del Consumidor / Minvivienda]`).
- "El monto es ese y punto, no hay nada que aclarar."
- Cobrar intereses por encima del tope legal.

**Escalamiento humano:** discrepancia que requiere recálculo, interpretación contractual o concepto jurídico → humano.

---

### 3.4 "El inmueble tiene problemas / falta de reparaciones" (contraataque de habitabilidad)

**Qué hay detrás:** el arrendatario condiciona el pago a reparaciones. Legalmente delicado: la Ley 820 permite descontar hasta el 30% del canon por **reparaciones necesarias no locativas** (Art. 27), pero el arrendatario **no puede simplemente dejar de pagar**.

**Marco de respuesta (S1–S3):**
1. **No descalificar** el reclamo; los problemas de habitabilidad son derechos legítimos.
2. **Separar los dos temas:** la obligación de pago y la solicitud de reparación son canales distintos; el pago no se suspende unilateralmente, pero la reparación se atiende.
3. Encauzar la reparación al canal correcto (reportar al área de mantenimiento / arrendador) y registrar.
4. Explicar la vía legal del descuento (Art. 27) cuando aplique, sin asesorar como abogado.

**Guion (WhatsApp):**
> Lamento que esté teniendo inconvenientes con el inmueble, Sr./Sra. {nombre}, y quiero que se resuelvan. Para avanzar bien manejamos dos cosas en paralelo: 1) registro su solicitud de reparación para que la atiendan, y 2) coordinamos el pago del canon, que es un tema aparte. ¿Me describe la falla para escalarla hoy mismo? Así ninguno de los dos temas se queda quieto.

**Qué NO hacer:**
- "Eso no es problema mío, pague y después vemos." (niega un derecho real).
- Negar el descuento legal del Art. 27 cuando proceda.
- Condicionar la reparación al pago previo total como represalia.

**Escalamiento humano:** reclamo de habitabilidad serio (inhabitabilidad, riesgo) o invocación formal del descuento del 30% → humano + mantenimiento. La IA no resuelve la procedencia del descuento.

---

### 3.5 "Hablo con mi abogado / voy a demandar"

**Qué hay detrás:** intento de frenar la cobranza, miedo, o representación real. Una vez se invoca representación legal, el trato cambia.

**Marco de respuesta (cualquier etapa, especialmente S4–S5):**
1. **Respetar el anuncio**, mantener la calma y la cortesía.
2. **No discutir de derecho** con el deudor ni intimidar con jerga legal.
3. Ofrecer el canal formal: que el abogado o el deudor remita comunicación al área correspondiente.
4. Registrar y, según política, **pausar el contacto automatizado** y escalar a humano.

**Guion (voz/WhatsApp):**
> Entiendo, Sr./Sra. {nombre}, está en todo su derecho de asesorarse. Con gusto coordinamos por el canal formal: si su abogado o usted nos envían una comunicación, la atendemos por ahí. Mientras tanto, dejo registro de su solicitud. Si en algún momento prefiere resolver el saldo de forma directa, la puerta sigue abierta.

**Qué NO hacer:**
- `[VIOLA Ley 2300]` "Demande, igual le va a tocar pagar y con más intereses; lo vamos a embargar." (amenaza / falsa afirmación legal).
- Seguir el contacto automatizado de alta frecuencia tras invocarse abogado.
- Reír o minimizar ("dudo que tenga abogado").

**Escalamiento humano:** **sí, escalar** — anuncio de abogado/demanda es disparador estándar de revisión humana.

---

### 3.6 "Mañana / la próxima semana le pago" (dilación — stalling)

**Qué hay detrás:** puede ser intención real o patrón de aplazamiento. La meta es **convertir la vaguedad en compromiso concreto**.

**Marco de respuesta (S0–S3):**
1. **Tomar la palabra positivamente** y concretar: fecha exacta, valor, medio.
2. Crear un micro-compromiso verificable (promesa de pago / PTP).
3. Confirmar por escrito y programar **un solo** recordatorio para esa fecha (respetando frecuencia Ley 2300).
4. Facilitar el pago (link, datos) en el mismo mensaje.

**Guion (WhatsApp):**
> Perfecto, Sr./Sra. {nombre}, le agradezco. Para dejarlo claro: ¿quedamos en que el {fecha} realiza el pago de ${X}? Le dejo aquí el medio para que sea fácil: {link/datos}. Ese día le mando un recordatorio cortico y listo. ¿Le sirve esa fecha o prefiere otra que pueda cumplir con seguridad?

**Qué NO hacer:**
- Aceptar "después le pago" sin fecha (no es compromiso).
- "Eso me dijo la semana pasada, usted siempre incumple." (reproche).
- Sobre-contactar antes de la fecha pactada `[Ley 2300 Art. 3 frecuencia]`.

**Escalamiento humano:** 2–3 promesas incumplidas seguidas (ver §3.8) → cambio de estrategia / humano.

---

### 3.7 Ghosting / no responde — re-enganche

**Qué hay detrás:** evasión por estrés, vergüenza, o número/canal equivocado. No equivale a mala fe.

**Marco de respuesta (S1–S5):**
1. **Variar el ángulo, no la frecuencia** — respetar 1 contacto/día y no multicanal en la misma semana `[Ley 2300 Art. 3]`.
2. Probar canal **autorizado** alterno solo si está permitido y no excede la regla semanal.
3. Mensajes cortos, sin culpa, con salida fácil ("respóndame con un SÍ y le mando opciones").
4. Bajar la barrera: ofrecer elegir entre opciones con un toque.
5. **Nunca** contactar terceros para "ubicarlo" `[Ley 2300 Art. 4]`.

**Guion (WhatsApp, re-enganche suave):**
> Hola, Sr./Sra. {nombre}. No he tenido noticias suyas y quiero ayudarle a resolver esto de la forma más fácil. No necesita explicarme nada; solo dígame una opción: (1) puedo pagar ahora, (2) necesito unos días, (3) quiero un plan en cuotas. Respóndame con el número y yo me encargo del resto.

**Guion (voz, mensaje breve si no contesta):**
> Sr./Sra. {nombre}, le llamo de {inmobiliaria} para ayudarle a ponerse al día con su arriendo. Cuando pueda, escríbame por WhatsApp a este número y vemos opciones que le sirvan. Gracias.

**Qué NO hacer:**
- `[VIOLA Ley 2300 Art. 4]` Llamar a familiares, vecinos, jefe o referencias para "ubicarlo" o dejar razón.
- `[VIOLA Ley 2300 Art. 3]` Tandas de llamadas/mensajes el mismo día o por todos los canales en la semana.
- `[VIOLA Ley 2300 Art. 6]` Anunciar o hacer "visita" al domicilio o trabajo.

**Escalamiento humano:** silencio total tras agotar la cadencia de re-enganche permitida → humano decide pasos formales (S5).

---

### 3.8 Promesa de pago rota (recuperación de PTP incumplida)

**Qué hay detrás:** el deudor pactó y no cumplió. Riesgo de erosión de confianza en ambos sentidos. Hay que firmeza, sin castigo.

**Marco de respuesta (S2–S4):**
1. **Constatar el hecho con neutralidad**, sin sermón.
2. Reabrir con una sola pregunta de solución (no de reproche).
3. Si vuelve a haber promesa, hacerla **más pequeña y más cercana** (abono hoy) para crear cumplimiento real.
4. Tras 2–3 incumplimientos, cambiar de estrategia (plan formalizado o escalamiento).

**Guion (WhatsApp):**
> Sr./Sra. {nombre}, veo que la fecha que habíamos acordado ({fecha}) ya pasó. No pasa nada, lo importante es retomar. ¿Le sirve hacer hoy un abono de ${X} y reprogramamos el resto? A veces empezar con un monto pequeño ayuda a destrabar. ¿Cuánto puede hoy?

**Qué NO hacer:**
- "Usted no cumple, ya no le creo nada." (reproche que rompe el puente).
- Castigar con cargos punitivos no pactados.
- Aumentar la frecuencia de contacto como "castigo" `[Ley 2300 Art. 3]`.

**Escalamiento humano:** 3.ª promesa rota o monto alto → humano para acuerdo formal documentado o ruta pre-legal.

---

### 3.9 Negociación de pago parcial

**Qué hay detrás:** el deudor puede algo, no todo. **El pago parcial es una victoria**, no una derrota: reduce saldo, mantiene el vínculo y la conducta de pago.

**Marco de respuesta (S1–S4):**
1. **Aceptar y agradecer** el abono.
2. Aplicarlo y mostrar el **saldo restante claro**.
3. Acordar fecha para el resto, idealmente con plan (§4).
4. Confirmar por escrito; no tratar el parcial como incumplimiento.

**Guion (WhatsApp):**
> Me parece muy bien, Sr./Sra. {nombre}, todo abono cuenta y le agradezco. Con ${X} que abone hoy, su saldo quedaría en ${Y}. ¿Le organizo el resto en una o dos cuotas con fechas que pueda cumplir? Así avanzamos sin que se le acumule.

**Qué NO hacer:**
- Rechazar el parcial exigiendo "todo o nada" (pierde recuperación y confianza).
- Cobrar el saldo restante con frecuencia agresiva tras el abono.

**Escalamiento humano:** parciales que no convergen al total tras varios ciclos → humano para reestructurar.

---

### 3.10 "Deme un descuento / condónenme" (quita / condonación)

**Qué hay detrás:** búsqueda de alivio. A veces legítima (hardship real), a veces táctica de regateo.

**Marco de respuesta (S2–S5):**
1. **No prometer descuentos que el agente no está autorizado a dar.** (T-323: condonación no la decide la IA sola.)
2. Distinguir: ¿pide condonar **intereses/cargos de cobranza** (más viable) o **capital/canon** (decisión del acreedor)?
3. Ofrecer lo que sí está dentro de política (p. ej., condonar parte de mora si paga el capital ya, si la política lo permite); de lo contrario, **escalar**.
4. Atar cualquier beneficio a un **pago concreto e inmediato** (incentivo honesto, no presión).

**Cuándo un descuento es apropiado (criterios):**
- Hardship verificable + voluntad de pago.
- Cuenta antigua donde el costo/recuperación favorece cerrar con quita.
- Condonar **mora/intereses** suele ser más defendible que tocar el **capital**.
- Siempre dentro de política escrita de la inmobiliaria/arrendador y, si toca capital, con aprobación humana.

**Guion (WhatsApp, dentro de política de intereses):**
> Entiendo, Sr./Sra. {nombre}. Lo que sí puedo proponerle: si realiza el pago del capital ({${X}}) antes del {fecha}, escalo su caso para revisar un alivio en los intereses de mora. No le prometo un número en este momento porque eso lo confirma el área encargada, pero con su disposición a pagar tenemos un buen punto de partida. ¿Le interesa que lo gestione así?

**Guion (cuando NO está autorizado):**
> Su solicitud de descuento es válida y la voy a registrar para que la revise la persona encargada, porque ese tipo de decisión no la tomo yo directamente. ¿Me confirma cuánto podría pagar si le aprueban un alivio? Eso ayuda a sustentar su caso.

**Qué NO hacer:**
- Prometer una condonación que luego no se cumple (engaño — `[contrario a Estatuto del Consumidor]`).
- "Si paga hoy le quito el 50%, pero solo en los próximos 10 minutos" (urgencia falsa/presión).
- `[T-323]` Que la IA decida sola condonar capital.

**Escalamiento humano:** toda condonación de capital y cualquier descuento fuera de la matriz de política → humano.

---

### 3.11 Deudor molesto / agresivo (de-escalación)

**Qué hay detrás:** frustración, miedo, sensación de acoso (a veces por experiencias previas). La meta es **bajar la temperatura**, no ganar la discusión.

**Marco de respuesta (cualquier etapa):**
1. **Validar la emoción**, no el insulto: "entiendo que esto lo moleste".
2. **Bajar el ritmo**, frases cortas, tono calmado.
3. **No reflejar la agresión** ni defenderse a la defensiva.
4. Reencauzar a una acción concreta y dar control al deudor (opciones).
5. Si hay amenazas o abuso sostenido, ofrecer cerrar y retomar después; registrar.

**Guion (voz):**
> Sr./Sra. {nombre}, entiendo que esté molesto y lamento que se sienta así. No quiero incomodarlo; mi intención es ayudarle a resolver esto de la forma más sencilla. Si prefiere, lo retomamos en otro momento que a usted le sirva. Cuando quiera, vemos opciones sin presión. ¿Le parece?

**Guion (WhatsApp, si insulta):**
> Comprendo su molestia, Sr./Sra. {nombre}. Estoy aquí para ayudarle, no para discutir. Cuando esté tranquilo, dígame y buscamos una solución que le funcione. Quedo atento.

**Qué NO hacer:**
- Responder con sarcasmo, gritos o amenazas.
- "Si me sigue tratando así lo reporto / lo demando." (represalia / amenaza).
- Insistir en seguir la llamada cuando el deudor pide cortar.

**Escalamiento humano:** amenazas de daño, abuso sostenido, o solicitud explícita de hablar con una persona → humano. La IA no maneja conflicto emocional severo.

---

### 3.12 Parte equivocada / "ese no soy yo" (wrong party)

**Qué hay detrás:** número reasignado, homónimo, error de datos, o el deudor real negándose. **Hay que verificar identidad sin revelar datos a un tercero** (Habeas Data).

**Marco de respuesta (cualquier etapa):**
1. **No revelar detalles de la deuda** hasta confirmar que es el titular `[Ley 1581 / Ley 2300 Art. 4]`.
2. Hacer una verificación mínima y respetuosa (¿es usted {nombre}?), sin exponer el monto o el motivo a un tercero.
3. Si **no** es la persona: disculparse, marcar el contacto como erróneo, **no volver a contactar ese número**, y no pedirle que ubique al deudor.
4. Si es el titular negándose: tratar como disputa de identidad/deuda (§3.3).

**Guion (WhatsApp/voz, verificación):**
> Buen día. Estoy tratando de comunicarme con {nombre}. ¿Hablo con esa persona? Si no es así, le ofrezco disculpas por la confusión y no volveré a escribir a este número. (No comparta ni pregunte datos de la deuda al tercero.)

**Guion (confirmado que es número equivocado):**
> Le agradezco la aclaración y lamento la molestia. Voy a marcar este número como no correcto para que no reciba más mensajes. Que tenga buen día.

**Qué NO hacer:**
- `[VIOLA Ley 2300 Art. 4 + Habeas Data]` Contarle a un tercero que "{nombre} debe un arriendo" o pedirle que le pase el mensaje / lo ubique.
- Seguir contactando un número marcado como equivocado.

**Escalamiento humano:** patrón de "no soy yo" que parece evasión del titular real, o datos de contacto en duda → humano para validar identidad por canal seguro.

---

### 3.13 (Adicional) "Quiero que dejen de contactarme" (opt-out)

**Qué hay detrás:** ejercicio de un derecho expreso (Ley 2300 Art. 2 y 5). **No es negociable: se respeta de inmediato.**

**Marco de respuesta:**
1. **Confirmar y ejecutar el opt-out** del canal solicitado de inmediato.
2. Informar, **sin amenazar**, que la obligación persiste y por qué canal formal puede resolverse.
3. Registrar la preferencia.

**Guion (WhatsApp):**
> Entendido, Sr./Sra. {nombre}. Respeto su decisión y dejaré de enviarle mensajes por este medio. La obligación sigue vigente, así que, cuando usted quiera, puede resolverla por {canal formal}. Quedo a su disposición si en algún momento prefiere retomar. Gracias.

**Qué NO hacer:**
- Ignorar el opt-out y seguir contactando `[VIOLA Ley 2300 Art. 5 — sanción SIC]`.
- "Si me bloquea, lo reporto de una vez." (represalia).

**Escalamiento humano:** tras opt-out total, el caso pasa a vía formal/humana (S5), no a más contacto automatizado.

---

## 4. Estructuración de planes de pago y hardship

> Marco operativo para los guiones de §3.1, §3.6, §3.9, §3.10. Los descuentos de capital y los planes fuera de matriz **requieren aprobación humana** (T-323).

### 4.1 Componentes de un acuerdo de pago
- **Abono inicial (cuota inicial):** crea compromiso y reduce saldo. Referente de mercado para reestructuración: ~10%–25% del saldo según capacidad (rango usado en facilidades de pago en Colombia). ([Secretaría de Hacienda Bogotá — facilidades de pago](https://www.haciendabogota.gov.co/es/tramites/facilidades-de-pago-para-los-deudores-de-obligaciones-tributarias))
- **Número de cuotas:** las mínimas que el deudor pueda cumplir de verdad (mejor 3 cuotas cumplidas que 12 incumplidas).
- **Fechas atadas al flujo del deudor** (p. ej., día de pago de nómina), sin interrogar el motivo de la mora.
- **Medio de pago fácil** en cada recordatorio (link/datos).
- **Confirmación escrita** del acuerdo (resumen claro: saldo, abono, cuotas, fechas).

### 4.2 Escalera de oferta (de menor a mayor concesión)
1. **Pago total hoy** (con facilidad de canal).
2. **Fecha única realista** (PTP a corto plazo).
3. **Abono parcial hoy + saldo en fecha cercana.**
4. **Plan en 2–4 cuotas** con abono inicial.
5. **Alivio de intereses/mora** condicionado a pago de capital (dentro de política).
6. **Revisión humana** para condonación de capital o quitas mayores.

### 4.3 Cuándo un descuento/condonación es apropiado
- Hay **hardship verificable** y voluntad de pago.
- Cuenta antigua donde recuperar el total es improbable y la quita maximiza recobro neto.
- Preferir condonar **intereses de mora / cargos de cobranza** antes que capital.
- Siempre dentro de **política escrita** y con **aprobación humana** si toca capital.
- **Honestidad:** todo beneficio ofrecido debe poder cumplirse; nada de "descuentos" inventados como anzuelo.

### 4.4 Mapeo etapa ↔ tipo de oferta
| Etapa | Oferta típica |
|------|----------------|
| S0–S1 | Pago total fácil; recordatorio amable |
| S2 | Fecha realista o abono parcial + plan corto |
| S3 | Plan formalizado con abono inicial; documentar |
| S4 | Última oportunidad de plan antes de vía formal; alivio de mora (si política) |
| S5 | Acuerdo de cierre / quita con aprobación humana; o traspaso pre-legal |

---

## 5. Matriz consolidada: objeción × etapa × bandera Ley 2300

| # | Objeción | Etapa(s) foco | Acción núcleo | Bandera/Prohibición clave |
|---|----------|---------------|---------------|---------------------------|
| 3.1 | No tengo dinero / sin trabajo | S1–S4 | Validar + plan; **no** preguntar causas | Art. 7 (no indagar motivo) |
| 3.2 | Ya pagué | Cualquiera | Pausar + verificar soporte | Habeas Data (no reportar en disputa) |
| 3.3 | No reconozco / monto malo | S1–S4 | Desglosar con transparencia | Estatuto Consumidor (no cargos no pactados) |
| 3.4 | Inmueble con problemas | S1–S3 | Separar pago y reparación; Art. 27 | Ley 820 Art. 27 (descuento legítimo) |
| 3.5 | Hablo con mi abogado | S4–S5 | Canal formal + escalar | Art. 2/3 (no amenaza ni alta frecuencia) |
| 3.6 | Mañana/próxima semana | S0–S3 | Concretar PTP con fecha | Art. 3 (no sobre-contactar) |
| 3.7 | Ghosting | S1–S5 | Re-enganche suave, variar ángulo | Art. 3, 4, 6 (frecuencia, terceros, visitas) |
| 3.8 | Promesa rota | S2–S4 | Reabrir sin reproche, PTP menor | Art. 3 (no contacto-castigo) |
| 3.9 | Pago parcial | S1–S4 | Aceptar, mostrar saldo, plan | Art. 3 (no agresividad post-abono) |
| 3.10 | Descuento/condonación | S2–S5 | No prometer sin autorización; escalar | T-323 (humano decide quita) |
| 3.11 | Agresivo | Cualquiera | De-escalar, dar control | Art. 2 (no represalia/amenaza) |
| 3.12 | Parte equivocada | Cualquiera | Verificar identidad, no exponer deuda | Art. 4 + Ley 1581 (no terceros) |
| 3.13 | Opt-out | Cualquiera | Ejecutar de inmediato | Art. 5 (respetar cancelación) |

---

## 6. Reglas de oro transversales para el agente (checklist de cumplimiento)

1. **Horario:** nunca contactar fuera de L–V 7–19 / Sáb 8–15; jamás domingos/festivos. `[Ley 2300 Art. 3]`
2. **Frecuencia:** máx. 1 contacto/día; no multicanal en la misma semana tras contacto directo. `[Art. 3]`
3. **Canal:** solo canales autorizados; respetar opt-out al instante. `[Art. 2, 5]`
4. **Terceros:** nunca referencias, familiares, vecinos ni empleador. `[Art. 4]`
5. **Visitas:** nunca anunciar ni hacer visitas a casa/trabajo. `[Art. 6]`
6. **No interrogar** el motivo de la mora. `[Art. 7]`
7. **Sin amenazas ni falsedades:** nada de "embargo hoy", "reporte inmediato", "le quitamos sus cosas", "cárcel". Solo consecuencias **reales y verificables**, en tono informativo.
8. **Habeas Data:** reporte solo con comunicación previa real + 20 días; nunca inventar que ya está reportado. `[Ley 1266]`
9. **Transparencia (T-323):** el deudor puede saber que interactúa con un sistema asistido y cómo llegar a una persona.
10. **Pausa para humano (T-323):** fraude, condonación de capital, anuncio de abogado/demanda, disputa no resuelta, vulnerabilidad, agresión severa → **no decide la IA sola**.
11. **Empatía siempre:** validar, dar opciones, facilitar el pago. La recuperación sube por **claridad y facilidad**, no por presión.

---

## 7. Banderas de cumplimiento — técnicas globales EXCLUIDAS por ilegales/inéticas en Colombia

Estas prácticas son comunes en cobranza agresiva internacional y **quedan excluidas** de todo guion del agente:

- **Contactar referencias/terceros** para presionar o "ubicar". `[Ley 2300 Art. 4]`
- **Visitas** a domicilio o lugar de trabajo. `[Art. 6]`
- **Llamadas/mensajes repetidos** el mismo día o por todos los canales en la semana (saturación). `[Art. 3]`
- **Contacto en horario nocturno, domingos o festivos.** `[Art. 3]`
- **Preguntar por qué no pagó** / exigir justificación. `[Art. 7]`
- **Amenazas de cárcel** por deuda civil (no existe prisión por deudas de arrendamiento).
- **Falsas amenazas de embargo/demanda inminente** o de reporte inmediato a centrales. `[Ley 1266 / Estatuto Consumidor]`
- **Shaming público / exposición** de la deuda a terceros o redes. `[Ley 1581 Habeas Data]`
- **Urgencia falsa** ("descuento solo por 10 minutos") y descuentos ofrecidos sin poder cumplirlos.
- **Hacerse pasar por abogado/juzgado/entidad oficial.** `[Estatuto Consumidor — engaño]`
- **Decisiones autónomas de IA** sobre condonación, fraude o acción legal sin revisión humana. `[T-323]`

---

## 8. Fuentes

- Ley 2300 de 2023 — Función Pública (texto y artículos): https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990
- Ley 2300 de 2023 — análisis de prohibiciones y derechos (tusdatos.co): https://www.tusdatos.co/blog/ley-2300-dejen-de-fregar
- Sentencia T-323 de 2024 — Corte Constitucional (principios de IA, control humano): https://www.corteconstitucional.gov.co/relatoria/2024/t-323-24.htm
- Ley 1266 de 2008 (Habeas Data financiero) — Función Pública: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=34488
- Ley 820 de 2003 (Arrendamiento de vivienda urbana) — Función Pública: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=8738
- Pago por consignación / arrendador no recibe (Art. 10 Ley 820) — LITESCO: https://litesco.com.co/blog/consignacion-extrajudicial-canon-arrendamiento
- Pago por consignación — Gerencie.com: https://www.gerencie.com/el-arrendador-no-me-recibe-el-arriendo.html
- Interés de mora en arrendamiento y proporcionalidad de cargos — Minvivienda: https://www.minvivienda.gov.co/sites/default/files/conceptos_juridicos/interes-por-mora.pdf
- Facilidades de pago / cuota inicial (referente de estructuración) — Secretaría de Hacienda Bogotá: https://www.haciendabogota.gov.co/es/tramites/facilidades-de-pago-para-los-deudores-de-obligaciones-tributarias
- Cobranza por WhatsApp con tono empático (mejores prácticas) — Yalo: https://www.yalo.ai/blog/mensajes-de-texto-de-cobranza
- Inscripción para no recibir contacto bajo Ley 2300 — Infobae: https://www.infobae.com/colombia/2025/03/25/si-es-moroso-en-colombia-la-ley-dejen-de-fregar-le-permite-evitar-llamadas-y-mensajes-no-deseados-asi-puede-inscribirse/

---

*Documento de investigación para el diseño del agente de cobranza. No constituye asesoría jurídica; las políticas de descuento, reporte y vía legal deben validarse con el área jurídica de la inmobiliaria antes de su implementación.*
