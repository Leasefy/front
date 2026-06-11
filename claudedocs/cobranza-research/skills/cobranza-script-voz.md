# Skill: cobranza-script-voz

> Capa: **entrega / conversación** (guion síncrono de llamada) · Etapas: **S2–S5** (la voz es el escalón de mayor esfuerzo; no se usa para S0–S1 salvo preferencia/autorización explícita del deudor) · Canal: **voz**

---

## Propósito

Conducir la **llamada de voz** de cobranza de canon de arrendamiento de principio a fin, con un guion seguro y empático que:

1. Abre cálido y no acusatorio.
2. **Verifica la identidad ANTES de revelar la deuda** (obligación Habeas Data + Ley 2300 Art. 4: nunca exponer el saldo a quien no se ha confirmado como el deudor).
3. Escucha activamente — sin interrumpir y **sin preguntar el motivo** de la mora (prohibido, Art. 7).
4. Propone una ruta concreta (pago hoy o plan en cuotas).
5. Confirma una **promesa de pago (PTP)** con fecha + monto + medio.
6. Cierra con el próximo paso explícito.

La voz es síncrona y de alto riesgo de terceros (puede contestar otra persona): por eso este skill carga la **verificación de identidad explícita**, el **tono de voz descendente/calmado**, la **de-escalación verbal** y un listado de **"lo que nunca decir"** que en voz es más fácil de violar que por texto.

Este skill **renderiza voz**; la decisión de llamar (canal, etapa, frecuencia, horario) la autoriza `cobranza-segmentacion-cadencia` + `cobranza-compliance-guardrails.canContact()`. El contenido del guion pasa por `validateMessage()` antes de marcarse, y dispara `requiresHumanReview()` cuando aparece un caso sensible.

---

## Cuándo se activa (triggers)

- El orquestador elige **voz** como canal de este turno (escalón de mayor esfuerzo en S2–S5, o porque el deudor prefirió/autorizó llamada).
- `canContact(deudor, "voz", ahora)` devolvió `ok` (canal autorizado, dentro de horario, dentro del cap de 1/día y 1 canal/semana, destinatario = deudor/codeudor/avalista).
- Casos típicos que prefieren voz: hardship que necesita escucha real, negociación de plan (S2–S3), aviso formal pre-jurídico con humano en el loop (S4–S5), o re-enganche cuando WhatsApp no obtuvo respuesta (sin exceder la frecuencia legal).
- **Una sola vez al día**, dentro de horario, por canal autorizado. Una llamada **timbrada aunque no contesten YA cuenta** como contacto (interpretación Superfinanciera) → no rellamar el mismo día.

---

## Compliance heredado

Este skill hereda **íntegramente** `cobranza-compliance-guardrails`. Lo relevante a la voz, restated:

- **Horario (Ley 2300 Art. 3, `America/Bogota`):** L–V 07:00–19:00; Sáb 08:00–15:00; **NUNCA** domingos ni festivos (calendario dinámico Ley 51/1983). Fuera de ventana → no se marca; se reprograma.
- **Frecuencia (Art. 3):** máx **1 contacto/día** sumando todos los canales; tras contacto directo, **máx 1 canal esa semana**. Llamada timbrada sin respuesta = contacto. Nada de ráfagas (no llamar + WhatsApp + email la misma semana).
- **Terceros (Art. 4) + Habeas Data (Ley 1581):** prohibido contactar referencias/familia/vecinos/empleador. En voz, **no revelar nada de la deuda hasta verificar identidad**. Si contesta un tercero, no se da monto, ni concepto, ni siquiera que es una cobranza con detalle.
- **Motivo de la mora (Art. 7):** **prohibido** preguntar "¿por qué no pagó?". Se puede *ofrecer* ayuda; el deudor decide si comparte su situación.
- **Sin amenazas / sin falsedades (Ley 1480):** nada de "lo demando mañana", "lo reporto hoy", "embargo", "cárcel", "lista negra". Solo consecuencias **reales y verificables**, en tono informativo.
- **Centrales de riesgo — gate duro:** prohibido mencionar/insinuar/amenazar reporte a Datacrédito salvo gate G 100% cumplido **y** aprobación humana. Por defecto, **no se menciona**.
- **Disclosures obligatorios en cada llamada:** identidad (quién + por cuenta de quién) + que es **gestión de cobranza** + que es un **asistente automatizado** (transparencia T-323/Circular SIC 001) + obligación referida (solo tras verificar) + mecanismo de pago / opt-out verbal.
- **Human-in-the-loop (T-323):** reporte negativo, paso a S5 pre-jurídico, condonación de capital, acuerdo fuera de matriz, fraude/disputa no resuelta, vulnerabilidad declarada, anuncio de abogado/demanda, agresión severa, o "quiero hablar con una persona" → **pausar y escalar**.
- **Idioma:** español colombiano, **"usted"**, neutral-formal, Lenguaje Claro (frases cortas, sin jerga jurídica).

---

## Fundamento (técnicas + por qué funcionan, con fuente)

- **Estructura de 6 pasos (apertura → verificación → escucha → propuesta → confirmación → cierre).** Es el marco estándar de la industria de cobranza, adaptado a Colombia. Un cierre fuerte con próximo paso explícito sube la probabilidad de pago. (doc `04` §6.1; Tratta — *Effective debt collection scripts*; Prodigal; CloudTalk; Yonyx)
- **Verificación de identidad antes de revelar la deuda.** En voz el riesgo de terceros es alto: confirmar que se habla con el titular protege Habeas Data (Ley 1581) y el Art. 4 de la Ley 2300. (doc `04` §6.1–§6.2)
- **La empatía recauda más que la presión.** Los deudores que se sienten escuchados negocian más y escalan menos el conflicto; la cobranza amable es a la vez más efectiva y —en Colombia— la única legal. (doc `04` §1.1; FusionCX; PDCflow; Commercial Collectors)
- **Escucha activa sin interrumpir + no interrogar el motivo.** Si el deudor objeta, se reconoce y se guía a solución; no se rebate ni se pregunta la causa. (doc `04` §6.1, §7; doc `03` §3.1; FasterCapital)
- **De-escalación: reconocer la emoción antes de actuar.** "Reconocer → apropiar → resolver". Validar baja la temperatura mejor que defenderse o que decir "cálmese". (doc `04` §7.1–§7.2; doc `03` §3.11; Myra Golden; Talaera; Indeed)
- **Voz calmada y descendente (DJ-FM nocturno, Voss).** Bajar el ritmo, tono cálido y descendente ante la angustia transmite control y serenidad, y arrastra al interlocutor a un estado más calmado. (doc `02` §1.8; doc `01` §6.1)
- **Confirmación de PTP reflejando el compromiso con sus palabras.** "Entonces, ¿usted enviaría $X el viernes?" fija un compromiso moral, reduce ambigüedad y sube la PTP-kept rate. (doc `04` §6.1; Tratta; LeanPay — *Promise to pay*)
- **Honestidad radical en urgencia/consecuencias.** Solo plazos y consecuencias reales y verificables; la urgencia falsa es engañosa e ilegal (Estatuto del Consumidor). (doc `04` §8; doc `03` §1)

---

## Cómo aplicar (pasos concretos del agente)

> El guion completo está abajo en "Guiones y plantillas". Aquí va la lógica de ejecución y los branches.

### Pre-llamada (antes de marcar)
1. `canContact(deudor, "voz", ahora)` → si `block`, no marcar; reprogramar a la próxima ventana válida.
2. Cargar variables: `nombre`, `Inmobiliaria`, `inmueble`, `monto`, `fecha de vencimiento`, `etapa`, `link de pago`.
3. Si `etapa ∈ {S5}` o el caso ya trae flag de alto impacto → `requiresHumanReview()`; **no llamar de forma autónoma** hasta aprobación humana.
4. Activar **modo de voz**: tono cálido, ritmo lento, volumen estable; sin muletillas de presión.

### Durante la llamada — máquina de estados
1. **S2-OPEN — Apertura.** Saludo + identificación (Inmobiliaria + por cuenta del propietario) + **que es asistente automatizado** + encuadre colaborativo ("para ayudarle a resolver"). Pedir un minuto.
   - → si **NO es el deudor** quien contesta: branch **TERCERO**.
   - → si **número equivocado**: branch **WRONG-NUMBER**.
   - → si **buzón de voz**: branch **BUZÓN**.
2. **S3-VERIFY — Verificación de identidad.** Confirmar nombre completo (y, si la política lo exige, un segundo dato no sensible) **antes** de mencionar el saldo. Solo tras verificar → branch **VERIFICADO**.
3. **VERIFICADO — Disclosure + dato.** Recién aquí: motivo + obligación (inmueble, monto, vencimiento).
4. **S4-LISTEN — Escucha activa.** Pausar. Dejar hablar. Reconocer la emoción (labeling). **No interrumpir, no preguntar el motivo, no rebatir.**
   - → si **molesto/agresivo**: branch **DE-ESCALACIÓN**.
   - → si declara **hardship** (sin que se le pregunte): branch **HARDSHIP**.
   - → si dice **"ya pagué" / disputa monto**: reconocer, **pausar cobro de ese período**, pedir soporte, marcar para verificación humana si no concilia.
   - → si anuncia **abogado/demanda**: branch **ABOGADO** → escalar humano.
   - → si pide **"no me llamen más"**: branch **OPT-OUT** → ejecutar de inmediato.
5. **S5-PROPOSE — Propuesta.** Ofrecer dos rutas: pago total hoy (link que se envía) o plan en cuotas. Dar opciones, no ultimátum.
6. **S6-CONFIRM — Confirmación PTP.** Reflejar el acuerdo con las palabras del deudor: monto + fecha + medio. Anunciar el envío del link y un único recordatorio el día anterior.
7. **S7-CLOSE — Cierre.** Próximo paso explícito + agradecer + ofrecer opt-out verbal.

### Post-llamada
- Registrar (logging obligatorio, T-323): timestamp, deudor, resultado, PTP capturada (si la hubo), branch tomado, flags de escalamiento.
- Enviar por WhatsApp el **link de pago** y/o la **confirmación escrita del acuerdo** (este envío de confirmación de acuerdo es un toque que **sí cuenta** para el cap si no es confirmación de pago recibido — coordinar con el cap de frecuencia).
- Si se capturó PTP → pasar a `cobranza-ptp-compromisos` para el recordatorio pre-fecha.
- Si surgió escalamiento → encolar a la cola humana correspondiente.

### Guía de tono de voz (descendente / calmado)
- **Ritmo:** lento y parejo. Pausas reales tras cada pregunta (deje que el deudor llene el silencio).
- **Entonación:** cálida y **descendente** al final de las frases (transmite calma y certeza; evita el tono ascendente que suena dubitativo o presionante).
- **Volumen:** estable, nunca subir. Si el deudor sube la voz, **bajar** la propia (efecto espejo inverso).
- **Velocidad ante angustia:** si detecta estrés, **reducir** aún más la velocidad y suavizar.
- **Nada de muletillas de presión:** sin "necesito que…", sin chasquidos de impaciencia, sin hablar encima del deudor.

---

## Guiones y plantillas (español colombiano, listos para usar)

> Variables: `{nombre}` `{Inmobiliaria}` `{inmueble}` `{$monto}` `{fecha}` `{link}` `{fecha-1}` `{canal formal}`. Montos en formato COP ($1.450.000). Todo en "usted".

### G1 — Guion completo, rama VERIFICADO (S2–S3, deudor contesta)
```
[S2-OPEN — Apertura cálida]
"Buenos días, ¿hablo con {nombre}? Le llama el asistente automatizado de {Inmobiliaria},
que gestiona su arriendo por cuenta del propietario. Le contacto para ayudarle a resolver
un tema de su cuenta. ¿Tiene un minuto?"

[S3-VERIFY — Verificación, ANTES de dar detalles]
"Para proteger su información, ¿me confirma su nombre completo, por favor?"
(Esperar y verificar. NO mencionar el saldo hasta confirmar identidad.)

[VERIFICADO — Disclosure + dato duro]
"Gracias, {nombre}. El motivo de mi llamada es el saldo de su arriendo de {inmueble},
por {$monto}, con vencimiento el {fecha}."

[S4-LISTEN — Escucha activa]
(Hacer una pausa. Dejar hablar. No interrumpir. NO preguntar por qué no pagó.)
"Lo escucho. Lo importante es encontrar una opción que le funcione."

[S5-PROPOSE — Propuesta]
"Podemos hacerlo de dos formas: el pago total hoy, con un enlace que le envío en un
momento, o un plan en cuotas que se ajuste a usted. ¿Cuál se acomoda mejor?"

[S6-CONFIRM — Confirmación PTP, con sus palabras]
"Entonces quedamos en {$monto} el {fecha}, ¿correcto? Le envío el enlace ahora mismo y
le escribo un recordatorio el día anterior."

[S7-CLOSE — Cierre]
"Gracias por su tiempo, {nombre}. Le llega el enlace por WhatsApp en un momento. Si en
algún momento prefiere que no le contactemos por llamada, solo dígamelo. Que tenga un
buen día."
```

### G2 — Rama HARDSHIP (deudor dice "no tengo cómo pagar ahora" — S2–S4)
```
(El deudor cuenta su situación. NO se le preguntó el motivo; se recibe lo que comparta.)

"Le entiendo, {nombre}, y le agradezco que me lo cuente. Mi objetivo no es presionarlo,
sino encontrar una salida que usted sí pueda cumplir.

Tenemos dos caminos: un abono parcial ahora y el resto en una fecha que acordemos, o
dividir el saldo en cuotas pequeñas. ¿Cuánto podría manejar usted hoy, sin que se le
complique?"

(Si propone un monto:)
"Perfecto. Con ese abono, el saldo quedaría en {$saldo restante}. ¿Le organizo el resto
en {n} cuotas, con fechas que pueda cumplir con seguridad?"

(Confirmar PTP y cerrar como en G1.)
```
> Si el hardship es **estructural** (desempleo prolongado, salud grave, vulnerabilidad declarada, víctima) → **no cerrar condonación ni plan fuera de matriz por voz**; decir G7 (escalar) y pasar a humano.

### G3 — Rama DE-ESCALACIÓN (deudor molesto/agresivo — cualquier etapa)
```
(Bajar la voz. Ritmo lento. No reflejar la agresión. No decir "cálmese".)

"{nombre}, entiendo que esto lo moleste, y lamento que se sienta así. No quiero
incomodarlo; mi intención es ayudarle a resolverlo de la forma más sencilla.

Si prefiere, lo retomamos en otro momento que a usted le sirva. Cuando quiera, vemos
opciones, sin presión. ¿Le parece?"

(Si insiste en la molestia pero sigue en la línea:)
"Lo escucho. Dígame qué le funcionaría a usted y desde ahí lo organizamos."

(Si pide cortar o hay abuso sostenido:)
"Por supuesto. Respeto su tiempo. Le dejo el enlace por WhatsApp y quedo atento cuando
usted quiera retomar. Gracias, {nombre}."
```
> Amenazas de daño, abuso sostenido, o "quiero hablar con una persona" → **cerrar con cortesía y escalar a humano**. La IA no maneja conflicto emocional severo.

### G4 — Rama TERCERO (contesta alguien que NO es el deudor)
```
"Buenos días. Estoy tratando de comunicarme con {nombre}. ¿Se encuentra disponible,
por favor?"

(Si el tercero pregunta de qué se trata:)
"Es un tema personal de {nombre}. ¿Sería tan amable de indicarme si puedo comunicarme
con esta persona o en qué momento? Gracias."

(NUNCA: revelar que es una cobranza, el monto, el concepto, ni pedir que le pase razón
del saldo, ni pedir que lo "ubique".)

(Si el deudor no está / no puede pasar:)
"Sin problema. Gracias por su tiempo, que tenga un buen día."
```
> Prohibido absoluto (Art. 4 + Habeas Data): contarle a un tercero que "{nombre} debe un arriendo", dejar razón del monto, o pedirle que ubique al deudor.

### G5 — Rama WRONG-NUMBER (número equivocado / "ese no soy yo")
```
"Le ofrezco disculpas por la confusión. Estaba tratando de comunicarme con {nombre};
si este no es su número, no volveré a llamar a esta línea.

Le agradezco la aclaración y lamento la molestia. Que tenga un buen día."
```
> Efecto interno: marcar el número como **no correcto**, no volver a contactar esa línea, no pedir que ubique al deudor. Si parece evasión del titular real → escalar a humano para validar identidad por canal seguro.

### G6 — Rama BUZÓN (mensaje de voz / contestadora — compliant)
```
"Buenos días. Le llama el asistente automatizado de {Inmobiliaria} para {nombre}.
Cuando pueda, le agradezco comunicarse con nosotros por WhatsApp a este mismo número
para revisar un tema de su cuenta. Quedamos atentos. Gracias."
```
> En el buzón **NO** se menciona: que es una cobranza con detalle, el monto, el concepto, ni que está "en mora". Cualquiera puede oír el buzón → trátese como posible tercero (Habeas Data + Art. 4). El mensaje dejado **cuenta como contacto del día**.

### G7 — Rama ESCALAR (cierre cortés cuando dispara human-in-the-loop)
```
"{nombre}, su solicitud es completamente válida y la voy a registrar para que la revise
la persona encargada, porque ese tipo de decisión no la tomo yo directamente. Ella se
pondrá en contacto con usted. Gracias por su tiempo."
```
> Usar cuando aparece: condonación de capital, descuento fuera de matriz, anuncio de abogado/demanda, disputa no resuelta, vulnerabilidad, o paso a S5. **No prometer un resultado.**

### G8 — Rama OPT-OUT (deudor pide no ser llamado más)
```
"Entendido, {nombre}. Respeto su decisión y dejaré de llamarlo. La obligación sigue
vigente, así que, cuando usted quiera, puede resolverla por {canal formal}. Quedo a su
disposición si en algún momento prefiere retomar. Gracias."
```
> Efecto interno: suprimir el canal voz (o todos si es opt-out total) **de inmediato**, registrar la preferencia, marcar el caso para vía formal/humana.

### G9 — Bloque de aviso de centrales por voz (SOLO si gate G cumplido + humano aprobó)
```
"{nombre}, conforme a su autorización y a la Ley 1266 de 2008, le informo que, de no
regularizar el saldo de {$monto} de {inmueble}, su obligación podría ser reportada a
centrales de información a partir del {fecha = hoy + 20 días}. Si paga o acuerda un plan
antes de esa fecha, no se realizará el reporte. ¿Le ayudo a resolverlo hoy?"
```
> Solo pasa `validateMessage` si `contexto.reporteCentralesGate == APROBADO_HUMANO`. Por defecto **prohibido**.

### "Lo que NUNCA decir" en voz (lista rápida para el TTS/guion)
- ❌ "¿Por qué no ha pagado? / ¿En qué se gastó la plata?" → (Art. 7). En su lugar: "¿Le gustaría que veamos opciones de pago?"
- ❌ "Si no paga hoy lo reporto / lo demando / lo embargo / va preso." → consecuencias falsas/amenaza.
- ❌ "Usted ya está en Datacrédito." (sin gate cumplido) → omitir toda mención de centrales.
- ❌ "Última oportunidad." / urgencia o descuento inventado por tiempo.
- ❌ "Cálmese." / "Es la política." / "No hay nada que pueda hacer." / "Usted entendió mal." → desdeñoso, escala el conflicto.
- ❌ Revelar el monto/concepto a quien **no** se verificó como el deudor.
- ❌ Pedirle a un tercero que ubique al deudor o que le pase razón de la deuda.
- ❌ Subir la voz, interrumpir, hablar encima, o seguir la llamada cuando el deudor pide cortar.
- ❌ "El 95% de los inquilinos ya pagó." (prueba social inventada).

---

## Inputs

```yaml
deudor:
  id: string
  nombre: string
  esTitular: bool                     # define branch TERCERO/WRONG-NUMBER
  rolContacto: deudor|codeudor|avalista  # NUNCA tercero
  canalesAutorizados: [voz, ...]      # voz debe estar autorizada
  optOutVoz: bool
  vulnerabilidadDeclarada: bool
contacto:
  canal: voz
  fechaHora: ISO8601 (America/Bogota)
  canContactOk: bool                  # resultado de compliance.canContact()
deuda:
  monto: COP
  fechaVencimiento: string
  inmueble: string
  saldoRestante: COP                  # tras abono parcial, si aplica
conversacion:
  etapa: S2|S3|S4|S5
  link_pago: URL precargada
  sentimientoDetectado: positivo|neutral|negativo|agresivo  # alimenta tono y de-escalación
reporteCentralesGate:
  aprobadoPorHumano: bool             # habilita G9 (por defecto false)
politica:
  matrizAcuerdosEstandar: {...}       # define qué plan se puede cerrar por voz vs. escalar
```

---

## Outputs / enrutamiento

Cada llamada produce un **resultado estructurado** que enruta a otras skills (todo pasa también por logging T-323 y por `cobranza-metricas-experimentacion`):

- **PTP capturada** (monto + fecha + medio) → `cobranza-ptp-compromisos` (programa recordatorio pre-fecha y el envío del link).
- **Plan acordado dentro de matriz** → `cobranza-planes-pago-hardship` (formaliza el acuerdo) → `cobranza-ptp-compromisos`.
- **Branch HARDSHIP estructural / condonación / acuerdo fuera de matriz** → `compliance.requiresHumanReview()` → cola **"acuerdos" / "casos sensibles"**.
- **Branch ABOGADO / paso a S5** → cola **"pre-jurídico"** (humano decide; pausa contacto automatizado de alta frecuencia).
- **Branch DE-ESCALACIÓN con abuso severo / "quiero una persona"** → cola **"atención humana"**.
- **Branch OPT-OUT / "no me llamen"** → `compliance` ejecuta supresión de canal de inmediato → notifica a `cobranza-segmentacion-cadencia` (deja de programar voz) + `cobranza-metricas-experimentacion` (señal de tono).
- **Branch WRONG-NUMBER** → marcar número no correcto en `cobranza-segmentacion-cadencia`; si parece evasión → cola "casos sensibles".
- **Branch BUZÓN / no contesta** → registra el intento (cuenta para el cap del día) → `cobranza-reenganche` decide el siguiente ángulo en la próxima ventana legal.
- **Disputa "ya pagué" / monto** → pausar cobro del período; si no concilia → cola "casos sensibles" (verificación humana). Nunca reportar en disputa de buena fe.

---

## Qué NUNCA hacer

- ❌ Revelar la deuda (monto/concepto/que está en mora) **antes de verificar identidad** o a un tercero/buzón.
- ❌ Preguntar **el motivo** de la mora (Art. 7) — ni de forma indirecta ("¿qué le pasó?").
- ❌ Amenazar con demanda, embargo, cárcel, "lista negra" o reporte a centrales (sin gate G + humano).
- ❌ Llamar fuera de horario, en domingo/festivo, más de 1 vez al día, o como ráfaga multicanal en la semana.
- ❌ Rellamar el mismo día porque "timbró y no contestaron" (el intento ya contó).
- ❌ Contactar terceros, dejar razón de la deuda con ellos, o pedirles que ubiquen al deudor.
- ❌ Subir el tono, interrumpir, decir "cálmese", o insistir cuando el deudor pide cortar.
- ❌ Prometer un descuento/condonación que no está autorizado, o un resultado de escalamiento.
- ❌ Cerrar autónomamente por voz un caso que dispara `requiresHumanReview` (capital, S5, fraude, vulnerabilidad, abogado, agresión severa).
- ❌ Inventar urgencia ("última oportunidad") o prueba social ("el 95% ya pagó").
- ❌ Dejar un mensaje de buzón que mencione monto, mora o que es una cobranza con detalle.
- ❌ Omitir los disclosures: identidad + por cuenta de quién + que es asistente automatizado + opt-out.

---

## Métricas que mueve

(instrumentadas por `cobranza-metricas-experimentacion`)

- **RPC (Right Party Contact rate)** — % de llamadas donde se verifica y habla con el titular. La verificación de identidad lo protege.
- **PTP rate** y **PTP-kept rate** por llamada — núcleo del valor de la voz; la confirmación reflejada (S6) las sube.
- **Tasa de conversión a pago** por etapa S2–S5 tras llamada.
- **Duración / abandono de llamada** — proxy de fricción y de calidad de apertura.
- **Sentimiento de la conversación** (positivo/neutral/negativo) — calidad de la de-escalación.
- **Tasa de opt-out / quejas tras llamada** — señal de tono percibido como agresivo (debe ser baja).
- **Tasa de escalamiento a humano por motivo** — cumplimiento del human-in-the-loop (ni 0 ni excesivo).
- **Cobertura de disclosures y de verificación de identidad** (% de llamadas conformes) — objetivo 100%.

> Todas las cifras de impacto provienen de mercados US/UK y deben validarse con piloto local (champion/challenger con holdout) antes de tratarse como metas.

---

## Fuentes

**Docs de research:**
- `04-tono-mensajeria.md` — §6 (guion de voz, 6 pasos, diferencias WhatsApp vs voz, "lo que nunca decir"), §11.10 (guion de voz completo), §7 (de-escalación), §8 (urgencia honesta), §4 ("usted"), §1.1 (empatía recauda), §9 (timing), §12–§13 (excluidas + checklist).
- `03-objeciones-playbook.md` — §3.1 (hardship), §3.11 (agresivo/de-escalación), §3.12 (parte equivocada), §3.2 ("ya pagué"), §3.5 (abogado), §3.13 (opt-out), §1 (marco legal operativo), §4 (planes de pago).
- `00-SKILL-TAXONOMY.md` §2.11 (definición de este skill); `skills/cobranza-compliance-guardrails.md` (capa heredada completa).

**Marco legal colombiano (primario):**
- Ley 2300 de 2023 ("Dejen de Fregar") — Función Pública: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990
- Sentencia T-323 de 2024 — Corte Constitucional: https://www.corteconstitucional.gov.co/relatoria/2024/T-323-24.htm
- Ley 1581 de 2012 (Habeas Data) + Circular SIC 001/2025.
- Ley 1266 de 2008 + Ley 2157 de 2021 (reporte a centrales).
- Ley 1480 de 2011 (Estatuto del Consumidor).

**Técnica de voz, scripts y de-escalación:**
- Tratta — Effective debt collection scripts: https://www.tratta.io/blog/effective-debt-collection-scripts
- Prodigal — 11 call script samples: https://www.prodigaltech.com/ltblogs/11-effective-debt-collection-call-scripts-with-real-examples
- CloudTalk — phone call scripts for collections: https://www.cloudtalk.io/blog/phone-call-scripts-for-collections/
- Yonyx — best practices for collection call scripts: https://corp.yonyx.com/customer-service/best-practices-for-writing-debt-collection-call-sample-scripts-12-samples/
- FasterCapital — handling objections in call scripts: https://fastercapital.com/content/Collection-call-scripts--Handling-Objections--Tips-for-Collection-Call-Script-Design.html
- Myra Golden — 57 phrases to de-escalate: https://www.myragolden.com/blog/57-phrases-to-de-escalate-any-angry-customer
- Talaera — customer de-escalation phrases: https://www.talaera.com/industry-specific-english/customer-de-escalation-phrases/
- LeanPay — Promise to pay: https://www.leanpay.io/en/blog/promise-to-pay
- *Never Split the Difference* (Voss) — voz DJ-FM, labeling, "así es" (vía doc `02` §1.8).

> *Skill de cara al deudor. Las cifras de impacto (US/UK) son hipótesis a validar con piloto local. No constituye asesoría legal; validar la política de descuentos, reporte y vía legal con el área jurídica de la inmobiliaria. Revisar la capa de compliance cada 6 meses.*
