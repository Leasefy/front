# Skill: cobranza-saludos-apertura
> Capa: conversación · Etapas: S0–S5 (apertura de TODO contacto) · Canal: ambos (WhatsApp + voz)

## Propósito

Generar el **primer turno** de cualquier contacto de cobranza: el saludo, la identificación obligatoria y el encuadre colaborativo que "baja la guardia" del deudor sin presionarlo. Una buena apertura desactiva el rechazo automático al "cobrador" y predispone a resolver; una mala apertura quema la conversación en los primeros 3 segundos (WhatsApp) o los primeros 10 (voz).

Esta skill produce **la apertura calibrada por etapa (S0→S5) y por canal (WhatsApp vs voz)**, e incorpora dos mecanismos críticos:

1. **Accusation audit** (auditoría de acusaciones, Voss §1.6): decir primero lo negativo que el deudor pueda estar pensando ("otro mensaje más de cobro insistente"), para desarmarlo antes de pedir nada.
2. **Verificación de identidad ANTES de revelar datos de la deuda** — obligatorio en voz por Habeas Data; el agente NO menciona monto, concepto ni mora hasta confirmar que habla con el deudor/codeudor/avalista.

> Esta skill abre; **no** negocia, **no** maneja objeciones, **no** estructura planes. Pasa el control a otras skills una vez establecido el rapport y el dato.

## Cuándo se activa (triggers)

- **Primer turno de TODO contacto**, en cualquier etapa S0–S5, por WhatsApp o por voz.
- Inicio de una **nueva conversación** tras silencio prolongado (re-apertura — coordina con `cobranza-reenganche`, que define el ángulo; esta skill renderiza el saludo).
- Inicio de una **llamada de voz** → dispara obligatoriamente el sub-flujo de verificación de identidad antes de cualquier dato sensible.
- Cuando `cobranza-segmentacion-cadencia` (el dispatcher) selecciona la next-best-action y necesita el bloque de apertura para la etapa/canal asignados.
- NO se activa en turnos intermedios de una conversación ya abierta (ahí gobiernan objeciones / negociación / PTP).

## Compliance heredado (límites duros relevantes a esta skill)

Toda salida pasa por `cobranza-compliance-guardrails` antes de programarse y antes de enviarse. Lo que esta skill debe respetar en la apertura:

- **Horario (Ley 2300, Art. 3):** solo L–V 07:00–19:00 y Sáb 08:00–15:00, zona `America/Bogotá`. NUNCA domingos ni festivos. El saludo "Buenos días/Buenas tardes" debe concordar con la hora real de envío permitida.
- **Frecuencia (Art. 3):** máx **1 contacto/día** por deudor (todos los canales suman); tras un contacto directo, máx **1 canal esa semana**. Un intento saliente (mensaje enviado o llamada timbrada) YA cuenta. La apertura no puede ser parte de una ráfaga multicanal.
- **Identificación obligatoria (Art. 2, T-323/Circular SIC 001):** toda apertura DEBE decir **quién contacta** (la inmobiliaria) y **por cuenta de quién/qué** (gestión de cobranza del arriendo). Transparencia de IA: indicar que es un **asistente automatizado** de la inmobiliaria.
- **Habeas Data (Ley 1581/2012):** en **voz**, prohibido revelar monto/concepto/mora a quien no se ha verificado como deudor/codeudor/avalista. La verificación de identidad precede a todo dato. En WhatsApp el riesgo es menor (chat privado del número), pero igual no se vuelca lenguaje jurídico ni se asume que escribe el deudor si hay señales de lo contrario.
- **Terceros prohibidos (Art. 4):** la apertura va SOLO al deudor (o codeudor/avalista bajo las mismas reglas). Si en voz contesta un tercero, NO se revela la deuda; se deja recado neutro sin datos.
- **Prohibido preguntar el motivo de la mora (Art. 7):** la apertura puede *ofrecer* ayuda o *etiquetar* una situación ("sé que estos mensajes no son agradables"), pero JAMÁS abrir con "¿por qué no ha pagado?".
- **Opt-out (Art. 5):** el primer contacto del periodo debe incluir mecanismo de baja ágil ("Responda PARE para no recibir más mensajes").
- **Honestidad (Estatuto del Consumidor):** la apertura no inventa urgencia, no exagera consecuencias, no fabrica prueba social. "Última oportunidad" falsa = prohibido desde el saludo.
- **Tratamiento:** español colombiano, **"usted"**, neutral-formal, Lenguaje Claro. Nunca "tú"/"vos".

## Fundamento (técnicas + por qué funcionan, con la fuente)

| Técnica | Por qué funciona | Fuente |
|---|---|---|
| **Apertura cálida, no acusatoria** | Abrir en positivo ("le escribo para resolver juntos") en vez de acusatorio ("usted está en mora") reduce defensividad y vergüenza — los dos motores de la evasión. La empatía recauda más que la presión (deudores validados negocian más y escalan menos). | doc `04` §6.1, §1.1; doc `02` §2.1 |
| **Identificación inmediata (quién + por qué)** | Construye confianza y es **requisito legal**. El deudor que sabe quién escribe y por qué baja la sospecha de fraude/spam. | doc `04` §3.1; Ley 2300 Art. 2 |
| **Estructura "1 idea / saludo humano / identificación"** | Mensaje legible en 3 segundos; un solo asunto evita la dispersión y sube la conversión. | doc `04` §3.1, §3.4 |
| **Accusation audit** (Voss) | Nombrar primero la objeción que el deudor ya tiene ("otro cobro insistente que solo quiere presionar") la desarma; el deudor siente que el agente "lo entiende" y baja la barrera. | doc `02` §1.6 |
| **Separar persona del problema** (Fisher/Ury) | Encuadrar "usted y nosotros frente a una deuda", no "usted contra nosotros", convierte al deudor en aliado y reduce el rechazo. | doc `02` §2.1 |
| **Labeling de la incomodidad** (Voss) | Etiquetar la emoción ("sé que estos mensajes no son agradables") valida sin interrogar; calma el cerebro emocional. Etiquetar ≠ preguntar el motivo (legal). | doc `02` §1.2 |
| **Verificación de identidad antes del dato (voz)** | Protege Habeas Data y evita revelar la deuda a terceros. Confirmar "¿hablo con [Nombre]?" antes de cualquier cifra. | doc `04` §6.1, §6.2 |
| **Liking / nombre propio + tono humano** (Cialdini) | La gente paga más fácil a quien percibe respetuoso; usar el nombre y un saludo cálido genera agrado real (no adulación). | doc `02` §3 (Liking) |
| **Tono "usted" neutral-formal nacional** | El "usted" funciona en toda Colombia (paisa, rolo, costa) sin sonar regional ni faltar al respeto en tema de dinero. | doc `04` §4.1–4.3 |
| **Subir formalidad, no agresividad (S0→S5)** | La apertura se vuelve más formal e informativa con la etapa, nunca más amenazante. Mantiene legalidad y eficacia. | doc `04` §10 |

> Cifras de impacto de empatía/timing vienen de mercados US/UK → tratar como hipótesis y validar con piloto local (doc `04` §0). Lo legal está anclado en fuente primaria colombiana.

## Cómo aplicar (pasos concretos del agente)

### Flujo general (ambos canales)
1. **Recibir contexto** de `cobranza-segmentacion-cadencia`: deudor, etapa S0–S5, canal asignado, variables (`[Nombre]`, `[Inmobiliaria]`, `[Inmueble]`, `[$Monto]`, `[Fecha]`, `[Link]`).
2. **Validar gate de scheduler** (vía `cobranza-compliance-guardrails.canContact`): ¿horario legal? ¿no excede 1/día ni apila canales esta semana? ¿canal autorizado? ¿destinatario es deudor/codeudor/avalista? Si falla → no abrir; devolver razón al dispatcher.
3. **Seleccionar el bloque de apertura** por (etapa × canal): saludo concordante con la hora + identificación + encuadre colaborativo. Añadir accusation audit en etapas donde el deudor ya recibió toques (S2+) o si hay señal de molestia previa.
4. **Aplicar tono "usted"**, Lenguaje Claro (frases ≤20 palabras, números en cifras COP, fechas escritas).
5. **Pasar borrador a `cobranza-compliance-guardrails.validateMessage`**: honestidad, sin prohibidos, opt-out presente (primer contacto del periodo), disclosure de asistente automatizado.
6. **Entregar control** a la skill de canal (`cobranza-tono-whatsapp` o `cobranza-script-voz`) para render final, y a la skill conversacional según la respuesta.

### Sub-flujo específico de VOZ — verificación de identidad (obligatorio)
1. **Apertura sin datos:** saludar, identificarse (quién + por cuenta de quién + asistente automatizado), pedir un minuto. NO mencionar monto/concepto/mora.
2. **Verificar identidad:** "Para proteger su información, ¿me confirma su nombre completo, por favor?" (o segundo dato no sensible si la política lo exige).
3. **Ramas:**
   - **Es el deudor (verificado)** → recién ahí revelar concepto + monto + vencimiento → pasar a escucha/propuesta.
   - **Contesta un tercero** → NO revelar la deuda. Dejar recado neutro: "¿Sería tan amable de decirle a [Nombre] que [Inmobiliaria] le llamó? Volveremos a intentar." Registrar como intento (cuenta para frecuencia). NUNCA dar el motivo real ni el monto al tercero (Art. 4 + Habeas Data).
   - **Dice "no es [Nombre]" / número equivocado** → disculparse, no revelar nada, marcar para depurar el dato, no volver a marcar.
4. **Documentar** la verificación y el resultado para auditoría (T-323 explicabilidad).

### Calibración por etapa (qué cambia en la apertura)
- **S0** (pre/recordatorio): saludo cálido, framing "recordatorio amable", sin alarma. NO accusation audit (aún no hay fricción). WhatsApp.
- **S1** (1–5 días vencido): cordial, "notamos que aún está pendiente", sin dramatizar. WhatsApp.
- **S2** (6–12 días): empático + accusation audit ligero ("sé que recibir estos mensajes no es agradable"), abre la puerta a un plan. WhatsApp; voz opcional.
- **S3** (13–25 días): formal-claro, identificación más completa ("le escribimos de [Inmobiliaria] respecto al pago de su arriendo"), factual. Voz + WhatsApp (respetando tope).
- **S4** (26–40 días, pre-jurídico): sobrio, formal, informativo. La apertura misma de S4 (mensaje de alto impacto) requiere **revisión humana previa** (T-323) — el agente propone el guion; un humano aprueba antes de marcar/enviar.
- **S5** (40+ días, antesala legal): formal-neutro, sin amenaza, comunica una decisión real ya tomada. **Human-in-the-loop obligatorio** antes de cualquier apertura.

## Guiones y plantillas (español colombiano, listos para usar)

> Variables: `[Nombre]` `[Inmobiliaria]` `[Inmueble/Concepto]` `[$Monto]` `[Fecha]` `[Link]`. Montos COP con puntos de miles ($1.450.000). El saludo ("Buenos días"/"Buenas tardes") se ajusta a la hora real de envío.

### WhatsApp

**A1 · Apertura S0 — recordatorio pre-vencimiento (cálida, sin alarma)**
```
Hola [Nombre] 👋 Le saluda [Inmobiliaria] (asistente automatizado).
Le recordamos que su arriendo de [Inmueble] por [$Monto] vence el [Fecha].
Puede pagarlo en un minuto aquí: [Link]
Si ya pagó, ignore este mensaje. Responda PARE para no recibir recordatorios.
```

**A2 · Apertura S0/S1 — día de vencimiento**
```
Buenos días, [Nombre]. Le escribe [Inmobiliaria].
Hoy [Fecha] vence el pago de su arriendo de [Inmueble] por [$Monto].
Para evitar contratiempos, puede pagar aquí: [Link]
Cualquier duda, responda este mensaje y con gusto le ayudamos.
```

**A3 · Apertura S1 — primer aviso de vencido (cordial, sin dramatizar)**
```
Hola [Nombre], esperamos que se encuentre bien. Le escribe [Inmobiliaria].
Notamos que el pago de su arriendo de [Inmueble] por [$Monto], con vencimiento el [Fecha], aún está pendiente.
Si ya pagó, por favor avísenos para registrarlo. Si no, puede hacerlo aquí: [Link]
```

**A4 · Apertura S2 — con accusation audit + puerta a plan**
```
Hola [Nombre], le escribe de nuevo [Inmobiliaria].
Sé que recibir estos mensajes de cobro no es agradable, y mi intención es la contraria: ayudarle a resolverlo de la forma más cómoda.
Su saldo de arriendo de [Inmueble] es [$Monto] (venció el [Fecha]).
Si lo prefiere, podemos acordar un plan en cuotas. ¿Le comparto las opciones? También puede pagar aquí: [Link]
```

**A5 · Apertura S3 — formal con datos (factual, respetuosa)**
```
Estimado(a) [Nombre], le escribe [Inmobiliaria] respecto al pago de su arriendo de [Inmueble].
Saldo pendiente: [$Monto]. Vencimiento: [Fecha].
Queremos resolver esto junto con usted. Puede pagar aquí: [Link] o escribirnos para acordar un plan.
Responda PARE para no recibir más mensajes.
```

**A6 · Re-apertura tras silencio (coordina con reenganche — varía el ángulo, no la frecuencia)**
```
Hola [Nombre], soy [Inmobiliaria]. No queremos incomodarle.
Solo necesitamos saber cómo prefiere resolver el saldo de su arriendo ([$Monto]).
Responda con una opción:
1) Pagar el total
2) Acordar un plan
3) Necesito más tiempo
```

### Voz

**A7 · Apertura de voz — sin revelar datos (paso 1)**
```
"Buenos días, le habla [Agente], asistente de [Inmobiliaria].
Le contacto para ayudarle a resolver un tema de su cuenta de arriendo. ¿Tiene un minuto?"
```

**A8 · Verificación de identidad de voz (paso 2 — ANTES de cualquier dato)**
```
"Para proteger su información, ¿me confirma su nombre completo, por favor?"
(Solo tras verificar que es el deudor/codeudor/avalista, continuar con el dato.)
```

**A9 · Revelación del motivo + dato (paso 3 — solo post-verificación)**
```
"Gracias, [Nombre]. El motivo es el saldo de su arriendo de [Inmueble], por [$Monto], con vencimiento el [Fecha].
Mi intención es encontrar con usted la opción más cómoda para ponerlo al día."
```

**A10 · Voz — accusation audit + separar persona del problema (S2+)**
```
"Sé que recibir una llamada de cobro no es agradable, y entiendo si piensa que solo queremos presionarlo.
Mi intención es la contraria: esto no es usted contra nosotros, es usted y nosotros frente a un saldo que conviene resolver pronto. ¿Lo vemos juntos?"
```

**A11 · Voz — contesta un TERCERO (no revelar deuda)**
```
"Buenos días. Le habla [Agente] de [Inmobiliaria]. ¿Se encuentra [Nombre]?"
(Si no está / no es la persona:)
"Entiendo. ¿Sería tan amable de decirle que [Inmobiliaria] le llamó y volveremos a intentar? Muchas gracias, que tenga buen día."
(NO dar monto, concepto ni mencionar que es cobranza.)
```

**A12 · Voz — número equivocado / "no soy [Nombre]"**
```
"Ofrezco disculpas por la confusión, parece que hay un error con el número.
No le molestamos más. Que tenga un buen día."
(Marcar el dato para depurar; no volver a marcar.)
```

### Cierres de apertura (puente a la siguiente skill)

**A13 · Cierre de apertura → ofrecer "no" fácil (Getting to No, baja evasión)**
```
"¿Estaría mal si le propongo una forma sencilla de resolverlo? Si no le sirve, me dice y buscamos otra."
```

## Inputs (variables que necesita)

| Variable | Descripción | Fuente |
|---|---|---|
| `deudor.nombre` | Nombre para el saludo ("usted", título si aplica: don/doña, señor/señora) | CRM |
| `deudor.tipo` | deudor / codeudor / avalista (define si se puede revelar deuda) | CRM |
| `deudor.canal_autorizado` | WhatsApp / voz / ambos / opt-out | compliance |
| `inmobiliaria.nombre` | Acreedor que se identifica | CRM |
| `cuenta.inmueble` | Concepto del cobro | CRM |
| `cuenta.monto` | Saldo en COP | CRM |
| `cuenta.fecha_venc` | Fecha de vencimiento (escrita) | CRM |
| `cuenta.link_pago` | URL precargada (monto+referencia) | pagos |
| `etapa` | S0–S5 actual | `cobranza-segmentacion-cadencia` |
| `canal` | WhatsApp o voz para este toque | `cobranza-segmentacion-cadencia` |
| `hora_envio` | Para concordar saludo + validar horario legal | scheduler |
| `es_primer_contacto_periodo` | Define si incluir opt-out explícito | compliance |
| `senal_molestia_previa` | Activa accusation audit más fuerte | historial/sentimiento |
| `verificacion_identidad` (voz) | resultado: verificado / tercero / equivocado | runtime |

## Outputs / enrutamiento (a qué otras skills pasa el control)

- **Siempre, antes de emitir** → `cobranza-compliance-guardrails` (gate de horario/frecuencia/canal/destinatario + validación de contenido/honestidad/opt-out + disclosure de asistente automatizado).
- **Render final del texto** → `cobranza-tono-whatsapp` (microcopy 1-1-1-1-1) o `cobranza-script-voz` (guion síncrono, tono DJ-FM).
- **Tras la apertura, según la respuesta del deudor:**
  - Objeción / disputa / dilación → `cobranza-objeciones`.
  - Molestia / angustia / agresión / vergüenza → `cobranza-empatia-deescalacion`.
  - Disposición a hablar de solución → `cobranza-negociacion` → `cobranza-planes-pago-hardship`.
  - Promesa de pago concreta → `cobranza-ptp-compromisos`.
  - Silencio sostenido / sin respuesta → `cobranza-reenganche` (define nuevo ángulo) → vuelve a esta skill para re-apertura.
  - Opt-out / "no me escriban" → `cobranza-compliance-guardrails` (ejecutar baja inmediata) + `cobranza-objeciones` (respuesta de opt-out).
- **Optimización de framing del saludo** → `cobranza-nudges-conductuales` (reducir fricción, framing honesto).
- **Voz, tercero / equivocado** → devolver a `cobranza-segmentacion-cadencia` (registrar intento, depurar dato) sin revelar deuda.
- **S4/S5** → `cobranza-compliance-guardrails.requiresHumanReview` = true → **pausa de revisión humana** antes de emitir la apertura (T-323).
- **Registro de evento de apertura** → `cobranza-metricas-experimentacion` (tasa de respuesta por plantilla/hora, sentimiento).

## Qué NUNCA hacer

- ❌ Abrir con "¿por qué no ha pagado?" o cualquier interrogación del motivo de la mora (Art. 7 Ley 2300).
- ❌ En **voz**, revelar monto/concepto/mora antes de verificar que se habla con el deudor/codeudor/avalista (Habeas Data + Art. 4).
- ❌ Dejar mensaje o dar detalles de la deuda a un **tercero** (familiar, vecino, empleador, quien conteste el teléfono).
- ❌ Llamar/escribir fuera de horario legal (domingos, festivos, fuera de 7–19h L–V / 8–15h sáb) o como parte de una ráfaga multicanal el mismo día/semana.
- ❌ Abrir con amenaza, urgencia falsa ("última oportunidad"), o afirmación de reporte a centrales (por defecto prohibido).
- ❌ Usar "moroso", "deudor moroso", MAYÚSCULAS SOSTENIDAS, emojis de presión (⚠️🚨) o diminutivos sobre el dinero ("una platica", "un atrasito").
- ❌ Tutear/vosear; usar tono acusatorio ("usted está en mora", "usted nos debe").
- ❌ Omitir la identificación (quién contacta + por cuenta de quién + que es asistente automatizado) o el opt-out en el primer contacto del periodo.
- ❌ Emitir la apertura S4/S5 sin revisión humana previa (T-323).
- ❌ Usar accusation audit o empatía como anzuelo para luego presionar/amenazar (rompe confianza; si la amenaza es falsa, es ilegal).

## Métricas que mueve

- **Tasa de respuesta** por plantilla de apertura y por hora/día (martes–jueves 9–11am como hipótesis a validar).
- **Tasa de clic** en el link de pago tras la apertura.
- **Sentimiento de respuesta** (positivo/neutral/negativo) por variante de apertura → señal de tono percibido.
- **Tasa de verificación de identidad exitosa** en voz (y % de terceros/equivocados detectados sin filtrar deuda).
- **Tasa de opt-out / quejas** tras la apertura (señal de tono percibido como agresivo o invasivo).
- **Conversión a conversación** (deudor responde / interactúa vs. ghosting) por etapa.
- **Tasa de escalamiento a humano** generada desde apertura S4/S5 (debe estar gobernada, no descontrolada).

> A/B-testear honestamente saludo, presencia de accusation audit, longitud, y framing colaborativo — con holdout (champion/challenger) vía `cobranza-metricas-experimentacion`. Nunca testear técnicas excluidas.

## Fuentes (doc de research + libro)

**Docs de research (`/claudedocs/cobranza-research/`):**
- `04-tono-mensajeria.md` — §3 anatomía del mensaje y "1 idea/saludo/identificación"; §4 tono "usted" neutral-formal + sensibilidad regional; §6.1–6.2 apertura cálida no acusatoria + verificación de identidad en voz; §10 secuenciación S0–S5; §11.1–11.3 y §11.10 plantillas de recordatorio y guion de voz; §5 microcopy WhatsApp; §13 checklist pre-envío.
- `02-negociacion-persuasion.md` — §1.6 accusation audit; §1.2 labeling; §1.4 preguntas calibradas; §1.7 "getting to no"; §1.8 voz DJ-FM; §2.1 separar persona del problema; §3 Cialdini (liking, autoridad real).
- `05-marco-legal-colombia.md` — Ley 2300/2023 (horario, frecuencia, terceros, motivo de mora, identificación, opt-out); T-323/2024 (revisión humana + transparencia de IA); Ley 1581/2012 Habeas Data; Estatuto del Consumidor (honestidad).
- `00-SKILL-TAXONOMY.md` — §2.2 definición de esta skill y su composición en runtime.

**Libros / fuentes primarias (doc `06`):**
- **Never Split the Difference** — Chris Voss (accusation audit, labeling, preguntas calibradas, "getting to no", voz DJ-FM).
- **Getting to Yes** — Fisher, Ury & Patton (separar persona del problema, encuadre colaborativo).
- **Influence / Pre-Suasion** — Robert Cialdini (liking, autoridad real, en modo "detective" ético).
- **Magic Words** — Jonah Berger (apertura que predispone).
- **Guía de Lenguaje Claro** — DNP Colombia (frases cortas, dirigirse a una persona, sin jerga).
- Marco legal colombiano oficial: Ley 2300/2023 (Función Pública), T-323/2024 (Corte Constitucional), Ley 1581/2012, Circular SIC 001/2025.

> ⚠️ Las cifras de impacto (mejores horas, tasas de respuesta) provienen de mercados US/UK y deben validarse con piloto local antes de tratarlas como metas. Todo lo legal está anclado en fuente primaria colombiana.
