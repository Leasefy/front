# Skill: cobranza-reenganche

> Capa: orquestación (decide la maniobra) + conversación (emite la intención de mensaje) · Etapas: S1–S5 (foco S2–S4) · Canal: ambos (WhatsApp ancla · voz como escalón de mayor esfuerzo, nunca en paralelo)

---

## Propósito

Re-enganchar a deudores de canon de arrendamiento que han **caído en silencio (ghosting)** o que **rompieron una promesa de pago (PTP incumplida)** — y volver a ponerlos en conversación hacia un compromiso de pago **sin subir la frecuencia de contacto (ilegal en Colombia)** y **sin reproche**.

El insight central de la skill: cuando un deudor deja de responder o incumple, la reacción intuitiva (insistir más, recordarle que falló, "presionar tantito más") es a la vez **ilegal** (viola el cap de frecuencia de la Ley 2300) y **contraproducente** (la evidencia muestra que el volumen de recordatorios no mueve la aguja; la fricción y la vergüenza la mueven en contra). La palanca correcta es **cambiar el ángulo del mensaje, no la cantidad de mensajes**: variar el encuadre, bajar la barrera de respuesta a un toque, reabrir con una sola pregunta de solución, y —cuando el deudor vuelve a comprometerse— hacer la **siguiente promesa más pequeña y más cercana** para que esta vez sí se cumpla.

Esta skill NO inventa contactos nuevos: opera **dentro** del cupo de ≤1 contacto/día y ≤1 canal/semana, y le pide al orquestador "el próximo toque legalmente disponible, con este otro ángulo". Tras 2–3 ciclos fallidos, **no escala la presión: escala a humano**.

Fundamento de fuentes: doc `03` §3.7 (ghosting / re-enganche) y §3.8 (promesa rota), doc `02` §5.2 (fresh-start, implementation intentions, segundo toque), doc `01` §7.2 (qué sube la PTP cumplida) y §5 (reducción de fricción), Switch de Heath ("allanar el camino"), Getting Past No de Ury ("puente de oro" para la contraparte evasiva).

---

## Cuándo se activa (triggers)

La skill `cobranza-segmentacion-cadencia` o el orquestador la invocan cuando se cumple alguna condición:

1. **Ghosting / silencio sostenido.** El deudor no responde a N toques previos (recomendado: ≥2 toques sin respuesta), respetando que cada toque previo consumió cupo de frecuencia. No hay "right-party contact" reciente pese a haber mensaje entregado/leído.
2. **PTP vencida sin pago.** Una promesa de pago estructurada (fecha + monto + medio) pasó su fecha y no se detectó el pago. Se activa al día siguiente de la fecha pactada (no el mismo día, para no atropellar y para no gastar el cupo del día del compromiso).
3. **Apertura sin acción.** El sistema detecta que el deudor **leyó/abrió** el mensaje (doble check azul, apertura de link) pero no respondió ni pagó → señal de evasión activa, candidato a cambio de ángulo.
4. **Patrón mixto.** Respondió una vez ("ya le pago"), luego cayó en silencio → combinación stalling → ghosting; entra re-enganche con ángulo de solución.

**No se activa si:** el deudor pidió opt-out (→ `cobranza-objeciones` §opt-out + `compliance`); anunció abogado/demanda (→ escalamiento humano); está en disputa de pago/monto no resuelta (→ pausar, no re-enganchar). En esos casos el silencio NO es ghosting, es un estado que la ley o la política protege.

---

## Compliance heredado (límites duros relevantes a esta skill)

Toda salida de esta skill pasa por `cobranza-compliance-guardrails`. Estos son los límites que el re-enganche **más fácilmente tienta a romper**, por eso se restatean:

- **Frecuencia (Ley 2300 Art. 3) — el límite que define esta skill.** Máx **1 contacto/día** por deudor (sumando todos los canales). Tras contacto directo establecido, esencialmente **1 canal/semana**. Un **intento saliente ya cuenta** (mensaje enviado o llamada timbrada sin respuesta cuenta como contacto — interpretación Superfinanciera). → El re-enganche **jamás** responde al silencio con más toques. Cambia el contenido del próximo toque legalmente disponible; no añade toques.
- **Horario (Ley 2300 Art. 3).** Solo `America/Bogota` L–V 07:00–19:00 y Sáb 08:00–15:00. **Nunca** domingos ni festivos. El re-enganche no es excepción.
- **Nada de ráfagas multicanal.** Prohibido "no contesta WhatsApp → entonces lo llamo hoy mismo → y le mando SMS". Variar canal solo entre semanas distintas y solo si el canal está autorizado.
- **Terceros prohibidos (Ley 2300 Art. 4).** **Nunca** contactar familiares, vecinos, empleador, referencias ni codeudor "para ubicarlo" o dejar razón. El silencio del deudor **no** habilita buscar a nadie más. Esta es la tentación clásica de cobranza agresiva y queda totalmente excluida.
- **Visitas prohibidas (Ley 2300 Art. 6).** Nunca anunciar ni hacer visita al domicilio o trabajo por no responder.
- **No interrogar el motivo (Ley 2300 Art. 7).** El re-enganche NO pregunta "¿por qué no me ha respondido?" ni "¿por qué no pagó como quedamos?". Constata el hecho con neutralidad y ofrece salida.
- **Sin reproche ni shaming.** "Usted siempre incumple", "ya van X veces", "lo estoy esperando hace días" → prohibido (afecta la intimidad/dignidad, Ley 2300). El reproche rompe el puente y empuja a más evasión.
- **Sin amenazas ni falsedades.** El silencio no autoriza inventar urgencia ("última oportunidad"), reporte inmediato a centrales (gate de Habeas Data: prohibido salvo autorización + comunicación previa + 20 días verificados) ni embargo inminente.
- **Opt-out al instante (Ley 2300 Art. 2/5).** Cada mensaje de re-enganche que sea primer contacto del período debe llevar salida ("PARE"). Si el deudor responde "no me escriban", se ejecuta de inmediato y se sale de la rama de re-enganche.
- **Human-in-the-loop (T-323).** Tras 2–3 ciclos de re-enganche fallidos, monto alto, señal de vulnerabilidad o salto a S5: la skill **pausa y escala a humano**. El agente no decide solo "ya no responde, lo mando a jurídica".

---

## Fundamento (técnicas + por qué funcionan, con la fuente)

### 1. "Variar el ángulo, no la frecuencia" (doc `03` §3.7)
La ley topa la frecuencia; la psicología confirma que el volumen no es la palanca. **Tres experimentos con 32.000 deudores morosos** mostraron que "solo molestar/recordar **no** funciona": cada recordatorio sube el pago, pero el efecto es pequeño (doc `02` §5.1, ScienceDirect). Y la cobranza hospitalaria muestra que los **mensajes personalizados** mejoran el pago mientras los **llamados morales/genéricos fallan** (doc `02` §5.1, Saulitis 2024). → La maniobra correcta ante silencio es **rediseñar el ángulo del próximo toque** (de "recordatorio" a "menú de opciones", de "saldo" a "facilidad", de "consecuencia" a "ayuda"), no repetir el mismo mensaje más veces.

### 2. Menú de respuesta de 1 toque — bajar la barrera (doc `03` §3.7 + doc `01` §5 + Switch)
Quien está en estrechez sufre **tunneling** y carga cognitiva (Scarcity, doc `06` §5): responder a un cobro abierto ("escríbame y vemos") es costoso, así que no responde. La solución es **"allanar el camino"** (Switch, doc `06` §13): convertir la respuesta en **elegir un número**. Un menú "1 / 2 / 3" reduce la barrera al mínimo y le devuelve **control** al deudor (honrar la autonomía aumenta receptividad — Chance, doc `06` §18). Evidencia adicional: pedir al deudor que **elija una ventana de pago** (24/36/48/72h) aumenta el compromiso (BehavioralEconomics.com, doc `06` §22).

### 3. Reabrir con UNA sola pregunta de solución, no de reproche (doc `03` §3.8 + Voss + Ury)
Ante PTP rota, la tentación es el sermón. La técnica correcta: **constatar con neutralidad** y reabrir con **una pregunta calibrada de "qué/cómo"** que ponga al deudor de co-diseñador, no de acusado (Voss, doc `02` §1.4). Ury (Getting Past No, doc `06` §8) llama a esto **construir un "puente de oro"** para la contraparte evasiva: hacerle fácil cruzar de vuelta a la conversación, en vez de empujarla con poder. Una sola pregunta evita el interrogatorio (prohibido por Art. 7) y baja la defensividad.

### 4. Siguiente promesa más pequeña y más cercana (doc `03` §3.8 + doc `01` §7.2 + Diamond)
Una PTP se rompe muchas veces porque fue **demasiado alta o demasiado lejana**. Lo que sube la **PTP-kept rate** es una promesa **asequible, con fecha concreta y cercana, y link adjunto** (doc `01` §7.2). Diamond ("ser incremental", doc `02` §4.2): pasos pequeños asustan menos. → Tras un incumplimiento, el re-enganche **no reabre el mismo compromiso grande**; ofrece un **abono pequeño hoy** que destraba la conducta de pago y recupera la confianza en ambos sentidos.

### 5. Fresh-start framing — "borrón y cuenta nueva" (doc `02` §5.2, Switch/Heath)
Los hitos temporales ("arranquemos el mes al día", "empecemos de nuevo esta semana") motivan a actuar (efecto fresh-start, doc `02` §5.2). En re-enganche desactiva la vergüenza acumulada del incumplimiento: en vez de cargar el pasado, ofrece un punto de partida limpio. Honesto y sin presión.

### 6. Segundo toque potente pero legal (doc `01` §3.1, doc `02` §5.3, PNAS)
El experimento PNAS de 12,77 millones de personas: el **recordatorio de seguimiento a los ~3 días** es casi tan potente como el mensaje inicial (+0,57 p.p.). → El re-enganche programa el siguiente toque para que caiga **al día siguiente o el día del compromiso**, nunca el mismo día (cap de 1/día), aprovechando que el segundo toque sí convierte cuando llega bien temporizado y con ángulo nuevo.

### 7. Reducción de fricción = la palanca #1 (doc `01` §5, doc `02` §5.2)
Cada mensaje de re-enganche lleva **link de pago con monto precargado**. Aunque el deudor calle, el **autoservicio 24/7** (link/portal que el deudor inicia, no es contacto saliente) permite que resuelva solo, en su horario — el 29% paga fuera de horario tradicional (TrueAccord, doc `01` §5.1). El re-enganche siembra el camino fácil; muchas veces el deudor "fantasma" paga por link sin volver a escribir.

---

## Cómo aplicar (pasos concretos del agente)

```
1. CONFIRMAR estado de re-enganche
   ├─ ghosting (≥2 toques sin respuesta) | PTP vencida | apertura sin acción
   └─ descartar: opt-out / abogado / disputa abierta → salir a otra rama

2. VERIFICAR cupo legal con compliance.canContact(deudor, canal, ahora)
   ├─ ¿hoy ya hubo contacto? → NO emitir; pedir próximo slot
   ├─ ¿ya se usó 1 canal esta semana tras contacto directo? → esperar / mismo canal
   └─ ¿horario válido (L-V 7-19, Sáb 8-15, no festivo)? → si no, agendar dentro de ventana

3. SELECCIONAR ángulo NUEVO (distinto al último toque) — rotación, no repetición:
   ├─ A. Menú de 1 toque (1=pago ahora / 2=unos días / 3=plan)
   ├─ B. Pregunta única de solución ("¿qué le serviría para...?")
   ├─ C. Fresh-start ("arranquemos el mes al día")
   ├─ D. Facilidad/fricción cero (link precargado, "1 clic y queda al día")
   └─ E. Reapertura de PTP rota con promesa MENOR y MÁS CERCANA

4. RENDERIZAR la intención → pasa a `cobranza-tono-whatsapp` o `cobranza-script-voz`
   (2-4 líneas, "usted", lenguaje claro, sin reproche, opt-out si aplica, 1 CTA)

5. AJUSTAR la oferta según el ciclo:
   ├─ ciclo 1-2: abono pequeño hoy + reprogramar resto
   └─ baja la barrera cada ciclo; nunca subas el monto ni la presión

6. PROGRAMAR el siguiente toque al DÍA SIGUIENTE o día del nuevo compromiso
   (nunca el mismo día). Adjuntar SIEMPRE link de pago.

7. EVALUAR salida:
   ├─ responde / paga → enrutar (ver Outputs)
   ├─ 2-3 ciclos de re-enganche sin respuesta → compliance.requiresHumanReview = true → HUMANO
   └─ 3.ª PTP rota o monto alto → HUMANO (acuerdo formal o ruta pre-legal)

8. REGISTRAR: ángulo usado, resultado, para que `metricas-experimentacion`
   atribuya lift por ángulo y no se repita el mismo ángulo fallido.
```

**Reglas de oro de la maniobra:**
- **Un ángulo por toque, y siempre distinto al anterior.** Si el toque previo fue "recordatorio de saldo", el de re-enganche es "menú de opciones" o "facilidad", no otro recordatorio.
- **La oferta baja, nunca sube.** Cada ciclo hace el "sí" más fácil (menos monto, fecha más cercana, menos pasos), no más exigente.
- **Cero pasado.** No se menciona cuántas veces escribió, ni que el deudor falló. Solo el presente y la salida.
- **El silencio se respeta como límite legal.** No se "compensa" un toque sin respuesta con otro toque; se espera el cupo y se cambia el ángulo.

---

## Guiones y plantillas (español colombiano, listos para usar)

> Variables: `[Nombre]` `[Inmobiliaria]` `[Inmueble]` `[$Monto]` `[$Abono]` `[Fecha]` `[Link]`. Montos en formato COP ($1.450.000). Todas en "usted", 2–4 líneas, sin reproche, con link de pago. El primer toque del período incluye salida "PARE".

### A. Re-enganche por GHOSTING — menú de 1 toque (S1–S3) · ángulo: bajar barrera
```
Hola [Nombre], le saluda [Inmobiliaria].
No quiero incomodarlo y para hacérselo fácil le dejo 3 opciones; solo respóndame con el número:
1) Puedo pagar ahora
2) Necesito unos días
3) Quiero un plan en cuotas
Yo me encargo del resto. Si prefiere, pague en un clic aquí: [Link]
Responda PARE si no desea más mensajes.
```

### B. Re-enganche por ghosting — pregunta única de solución (S2–S3) · ángulo: co-diseño
```
Hola [Nombre]. No he tenido noticias suyas y quiero ayudarle a resolver esto sin que se complique.
No necesita explicarme nada. Solo dígame: ¿qué le serviría para ponernos al día este mes?
Con eso lo organizamos juntos. También puede pagar aquí: [Link]
```

### C. Re-enganche por ghosting — facilidad / fricción cero (S1–S2) · ángulo: ease framing
```
Hola [Nombre]. Para que sea lo más sencillo posible, le dejo el pago de su arriendo de [Inmueble] listo:
[$Monto] · con un clic queda al día → [Link]
Si necesita otra fecha o dividirlo, respóndame y vemos opciones.
```

### D. Re-enganche por ghosting — fresh-start (S2–S3) · ángulo: borrón y cuenta nueva
```
Hola [Nombre]. Empecemos de cero con esto: hoy lo dejamos resuelto y queda tranquilo.
Su saldo de [Inmueble] es [$Monto]. Puede ponerse al día aquí: [Link]
¿O prefiere que le proponga un plan corto? Dígame y lo armamos.
```

### E. Re-enganche por ghosting — voz (mensaje breve si no contesta) · una sola vez al día, en horario
```
[Nombre], le llama [Agente] de [Inmobiliaria] para ayudarle a ponerse al día con su arriendo,
con la opción que a usted le sirva.
Cuando pueda, escríbame por WhatsApp a este número y vemos cómo. Gracias, que tenga buen día.
```
> Voz solo si el canal está autorizado y no se usó otro canal esa semana tras contacto directo. Tono calmado y descendente (voz "DJ de FM nocturno", doc `02` §1.8). No dejar razón con terceros; si contesta otra persona, no revelar la deuda (→ `cobranza-objeciones` parte equivocada).

### F. PTP rota — reabrir sin reproche, promesa MENOR y MÁS CERCANA (S2–S4) · ángulo: incremental
```
Hola [Nombre]. Veo que la fecha que habíamos acordado ([Fecha]) ya pasó. No pasa nada, lo importante es retomar.
A veces empezar con un monto pequeño ayuda a destrabar: ¿le sirve hacer hoy un abono de [$Abono] y reprogramamos el resto?
Aquí lo deja listo: [Link] · Dígame cuánto puede hoy y lo ajustamos.
```

### G. PTP rota — versión voz (S3–S4) · neutral, orientada a solución
```
[Apertura] "Buenas tardes, ¿hablo con [Nombre]? Le llama [Agente] de [Inmobiliaria]."
[Verificación] "Para proteger su información, ¿me confirma su nombre completo?"
[Neutral, sin reproche] "Gracias. Habíamos quedado en un pago el [Fecha] y aún no lo veo aplicado. Retomemos, sin problema."
[Pregunta única] "¿Qué le funciona mejor hoy: un abono pequeño ahora y reprogramamos el resto, o le ajusto la fecha?"
[Cierre incremental] "Perfecto, dejamos [$Abono] hoy con el enlace que le envío. Le escribo un recordatorio el día anterior del resto."
```

### H. PTP rota repetida (2.ª vez) — micro-abono hoy como puente (S3–S4) · ángulo: el paso más pequeño posible
```
Hola [Nombre]. Sé que organizar el pago no siempre es fácil. Hagámoslo en el paso más pequeño posible:
¿puede hoy un abono de [$Abono]? Con eso avanzamos y reprogramamos el saldo a la fecha que usted me diga.
Aquí queda listo: [Link]
```

### I. Apertura sin acción (leyó / abrió link y no respondió) (S2) · ángulo: ofrecer "no" fácil + salida
```
Hola [Nombre]. Quizá no es el mejor momento para resolver esto, y está bien.
¿Le sirve si le propongo una sola opción para dividir el pago? Si no le funciona, me dice y buscamos otra.
Cuando quiera: [Link]
```
> Técnica "getting to no" (Voss, doc `02` §1.7): ofrecer un "no" seguro reduce la evasión de quien no puede decir que no.

### J. Cierre de re-enganche hacia humano (último toque automatizado antes de escalar) (S4–S5)
```
Hola [Nombre]. Para no insistirle de más, voy a dejar su caso con una persona del equipo de [Inmobiliaria],
para que revisen con usted la mejor forma de resolverlo.
Si antes prefiere adelantarlo, aquí sigue disponible: [Link]. Quedo atento.
```
> Este es el handoff visible: transparente (T-323) y sin amenaza. No anuncia "jurídica" ni consecuencias; anuncia revisión humana.

---

## Inputs (variables que necesita)

| Variable | Descripción | Fuente |
|---|---|---|
| `deudor_id`, `[Nombre]` | Identidad del titular (no de terceros) | CRM |
| `estado_reenganche` | `ghosting` \| `ptp_rota` \| `apertura_sin_accion` \| `mixto` | `segmentacion-cadencia` / señales |
| `toques_previos[]` | Historial: fecha, canal, ángulo usado, resultado | log de contactos |
| `ultimo_angulo` | Ángulo del último toque (para NO repetirlo) | log |
| `ciclo_reenganche` | # de ciclos de re-enganche ya intentados (gate de escalamiento) | estado |
| `ptp_previa` | Si aplica: fecha, monto, medio de la promesa rota | `ptp-compromisos` |
| `[$Monto]` | Saldo real y verificado (canon + mora legal) | contabilidad |
| `[$Abono]` | Abono pequeño sugerido para reabrir (incremental) | `planes-pago-hardship` |
| `canal_autorizado[]` | Canales que el deudor autorizó (WhatsApp/voz/SMS/email) | consentimiento Habeas Data |
| `canal_usado_semana` | Si ya se contactó por un canal esta semana tras contacto directo | `compliance` |
| `ultimo_contacto_ts` | Timestamp del último contacto (cap 1/día) | `compliance` |
| `[Link]` | Link de pago con monto precargado | pasarela (PSE/Nequi/tarjeta) |
| `senal_vulnerabilidad` | Flag de hardship/vulnerabilidad declarada | `empatia-deescalacion` |
| `etapa` | S1–S5 (calibra tono y oferta) | `segmentacion-cadencia` |

---

## Outputs / enrutamiento (a qué otras skills pasa el control)

| Resultado del re-enganche | Enruta a | Por qué |
|---|---|---|
| Deudor elige opción del menú / responde dispuesto | `cobranza-negociacion` → `cobranza-planes-pago-hardship` | Co-diseñar el acuerdo concreto |
| Deudor promete pagar (fecha + monto) | `cobranza-ptp-compromisos` | Capturar PTP estructurada, recordatorio pre-fecha, link |
| Deudor objeta / disputa / pide descuento | `cobranza-objeciones` | Dispatch del escenario específico |
| Deudor molesto / agresivo / avergonzado | `cobranza-empatia-deescalacion` | Validar emoción antes de seguir |
| Deudor dice "no me escriban más" | `cobranza-objeciones` (opt-out) + `cobranza-compliance-guardrails` | Ejecutar opt-out de inmediato |
| Deudor paga (por link o tras responder) | `cobranza-ptp-compromisos` (recibo) | Confirmación de pago = excepción legal, cierra loop positivo |
| 2–3 ciclos sin respuesta / 3.ª PTP rota / monto alto / vulnerabilidad | `cobranza-compliance-guardrails.requiresHumanReview` → **HUMANO** | T-323: no escalar presión, escalar a persona |
| Todo toque, siempre | `cobranza-tono-whatsapp` o `cobranza-script-voz` (render) + `cobranza-compliance-guardrails` (gate) + `cobranza-metricas-experimentacion` (log de ángulo/resultado) | Render de copy, gate de envío, medición de lift por ángulo |

**Realimentación:** `cobranza-metricas-experimentacion` registra qué ángulo (A–J) se usó y si recuperó, y devuelve a `cobranza-segmentacion-cadencia` cuál ángulo funciona mejor por segmento/etapa (champion/challenger con holdout).

---

## Qué NUNCA hacer

- **Subir la frecuencia ante el silencio.** Más toques porque no responde = `[VIOLA Ley 2300 Art. 3]`. El silencio se respeta; se cambia el ángulo del próximo toque legalmente disponible, no se añaden toques.
- **Ráfaga multicanal en la misma semana** ("no contesta WhatsApp → lo llamo hoy → y SMS"). `[VIOLA Ley 2300 Art. 3]`
- **Contactar a terceros para "ubicarlo"** (familiares, vecinos, jefe, referencias, codeudor). El ghosting no habilita buscar a nadie más. `[VIOLA Ley 2300 Art. 4]`
- **Anunciar o hacer visita** por no responder. `[VIOLA Ley 2300 Art. 6]`
- **Reprochar.** "Usted siempre incumple", "ya van 3 veces", "lo llevo esperando días", "no le creo nada". Rompe el puente y aumenta la evasión.
- **Interrogar el silencio o el incumplimiento.** "¿Por qué no me ha respondido?", "¿por qué no pagó como quedamos?". `[VIOLA Ley 2300 Art. 7]`
- **Inventar urgencia o consecuencias** para sacarlo del silencio: "última oportunidad", "hoy o se reporta", "mañana lo demando". `[VIOLA Estatuto del Consumidor + Ley 2300]`
- **Reabrir con la misma promesa grande** que ya se rompió. La siguiente promesa va más pequeña y más cercana, no igual ni mayor.
- **Castigar con cargos punitivos no pactados** tras la PTP rota.
- **Repetir el mismo mensaje/ángulo** que ya no funcionó (recordatorios idénticos no mueven la aguja; doc `02` §5.1).
- **Decidir solo el salto a pre-legal** porque "ya no responde". Tras agotar el re-enganche permitido → **humano** decide. `[T-323]`
- **Contactar fuera de horario** o en domingo/festivo aunque "es el único momento en que lee". `[VIOLA Ley 2300 Art. 3]`

---

## Métricas que mueve

| Métrica | Cómo la mueve esta skill | Fuente |
|---|---|---|
| **Re-contact / win-back rate** | % de deudores en ghosting/PTP-rota que vuelven a responder o pagar tras re-enganche | doc `01` §8 (operativas) |
| **RPC rate (right-party contact)** | Recupera conversación con el titular sin sumar intentos | doc `01` §8 |
| **PTP rate** | Convierte el silencio en un nuevo compromiso (menú / pregunta de solución) | doc `01` §7.1, §8 |
| **PTP-kept rate** | Promesa más pequeña + más cercana + link → se cumple más | doc `01` §7.2 |
| **Cure rate / roll rate** | Reactivar al fantasma evita el roll al siguiente bucket de mora | doc `01` §8 |
| **% auto-resuelto sin humano** | Link precargado en cada toque → el "fantasma" paga solo, 24/7 | doc `01` §5.1 |
| **Tasa de escalamiento a humano** | Sube de forma sana cuando agota re-enganche (señal de cumplimiento T-323, no de fracaso) | doc `00` §2.0 |
| **Tasa de opt-out / quejas** | Debe BAJAR vs. cobranza insistente: variar ángulo sin subir frecuencia reduce la fricción percibida | doc `01` §8, doc `04` §14 |
| **Lift por ángulo (A/B)** | Champion/challenger con holdout sobre cada ángulo de re-enganche | doc `01` §8.1 |

> Recordatorio metodológico (doc `00` §6, doc `04` §0): las cifras de lift de los docs vienen de US/UK/crédito de consumo → son **hipótesis a validar** en arrendamiento residencial colombiano por WhatsApp/voz antes de tratarlas como metas.

---

## Fuentes (doc de research + libro)

**Documentos de research (`/claudedocs/cobranza-research/`):**
- `03-objeciones-playbook.md` §3.7 (ghosting / re-enganche), §3.8 (promesa de pago rota), §3.6 (stalling → PTP), §1 (marco legal), §6 (checklist de cumplimiento). **Fuente primaria de esta skill.**
- `01-estrategia-global-digital.md` §7.2 (qué sube la PTP cumplida), §5 (self-cure / reducción de fricción), §3.1 (segundo toque, framing %), §8 (métricas), §9 (reconciliación legal de cadencia).
- `02-negociacion-persuasion.md` §5.2 (fresh-start, implementation intentions, defaults, present bias), §5.3 (segundo toque legal, personalizar no moralizar), §1.4 (preguntas calibradas), §1.7 ("getting to no"), §4.2 (ser incremental, Diamond).
- `04-tono-mensajeria.md` §11 (plantillas WhatsApp + voz base que esta skill reusa y reangula), §5.2–5.3 (microcopy, palabras prohibidas, opt-out "PARE"), §3 (estructura 1-1-1-1-1).
- `00-SKILL-TAXONOMY.md` §2.8 (definición de la skill), §3 (composición por etapa), §2.0 (compliance transversal).

**Libros / fuentes primarias (vía doc `06-libros-fuentes.md`):**
- **Switch — Chip & Dan Heath** (§13): "allanar el camino" / *shape the path* = reducir fricción de pago; fresh-start framing. Palanca central del re-enganche fácil.
- **Getting Past No — William Ury** (§8): contraparte difícil/evasiva/silenciosa; "construir un puente de oro" para que el deudor cruce de vuelta a la conversación.
- **Never Split the Difference — Chris Voss** (doc `02` §1): preguntas calibradas "qué/cómo", "getting to no", voz "DJ de FM nocturno" para el re-enganche de voz.
- **Scarcity — Mullainathan & Shafir** (§5): el deudor en estrechez hace *tunneling* y no responde → justifica menú de 1 toque y simplificación, no más insistencia.
- **Getting More — Stuart Diamond** (doc `02` §4.2): ser incremental → promesa siguiente más pequeña y más cercana.
- **BehavioralEconomics.com — "The Psychology of Debt Collection"** (§22): pedir al deudor que elija una ventana de pago aumenta el compromiso (base del menú 1/2/3).
- **PNAS (2025) — nudges a escala** (doc `01` §3.1, doc `02` §5.1): el segundo toque bien temporizado convierte casi tanto como el primero; el volumen de recordatorios genéricos no.
- **Marco legal colombiano:** Ley 2300/2023 (Función Pública), Sentencia T-323/2024 (Corte Constitucional), Ley 1581/2012 + Ley 1266/2008 (Habeas Data), Ley 1480/2011 (Estatuto del Consumidor).

---

*Esta skill vive en el microservicio `Leasefy/agent`; el frontend la consume vía HTTP. No es asesoría jurídica: las políticas de cadencia, escalamiento y reporte deben validarse con el área legal de la inmobiliaria antes de producción. Revisar contra `cobranza-compliance-guardrails` cada 6 meses (regulación de IA/datos en Colombia en evolución: Circular SIC 001/2025, CONPES 4144).*
