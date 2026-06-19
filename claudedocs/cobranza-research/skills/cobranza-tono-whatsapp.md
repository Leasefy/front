# Skill: cobranza-tono-whatsapp
> Capa: **entrega** (render de canal) · Etapas: **S0–S3** (principal), apoyo S4–S5 con revisión humana · Canal: **WhatsApp**

---

## Propósito

Es la skill de **render final para WhatsApp**: toma la **intención + variables** que producen las skills conversacionales (`saludos-apertura`, `objeciones`, `negociacion`, `planes-pago-hardship`, `ptp-compromisos`, `reenganche`, `nudges-conductuales`) y la convierte en **copy listo para enviar** en español colombiano "usted", con la estructura **1-1-1-1-1**, Lenguaje Claro (DNP), un solo CTA con link de pago precargado, opt-out obligatorio y filtro de palabras prohibidas.

No decide *a quién* contactar (eso es `segmentacion-cadencia`), ni *qué* negociar (eso es `negociacion`/`planes-pago-hardship`), ni *si se puede* contactar (eso es `compliance-guardrails`). **Centraliza el control de tono y formato** para que ninguna otra skill escriba copy suelto: todas le pasan intención estructurada y esta skill emite el texto. Así el control de tono es único, auditable y consistente.

> **Regla de arquitectura (doc `00` §6):** las skills de cara al deudor producen *"intención + variables"*, no texto final. El render a CO-ES con Lenguaje Claro y el filtro de palabras prohibidas lo hace esta skill. Antes de entregar, el borrador SIEMPRE pasa por `cobranza-compliance-guardrails.validateMessage()`.

---

## Cuándo se activa (triggers)

- **Siempre que el canal de salida es WhatsApp** — la mayoría de los toques S0–S3 (recordatorios, primer aviso de mora, seguimiento, confirmaciones, recibos).
- Cuando una skill conversacional resuelve un turno y emite un objeto `intent` con `canal: whatsapp`.
- Cuando `ptp-compromisos` necesita confirmar un acuerdo, recordar una fecha o enviar un recibo de pago.
- Cuando `reenganche` necesita reabrir un caso en silencio (ghosting) o tras PTP rota, **sin** subir frecuencia.
- Para mensajes de **opt-out** (ejecutar baja) y de **un-solo-canal** (cuando el deudor lo pide).
- **NO** se activa para voz (esa es `cobranza-script-voz`). **NO** redacta menciones de centrales de riesgo salvo que `reporteCentralesGate == APROBADO_HUMANO` (entonces inserta el bloque P6 de compliance, no improvisa).

---

## Compliance heredado

Esta skill **hereda íntegro** el gate de `cobranza-compliance-guardrails`. El render no es libre: cada borrador debe pasar `validateMessage(texto, etapa, contexto)` antes de salir. Lo relevante a este render:

- **Horario y frecuencia (Ley 2300/2023, Art. 3):** esta skill **no programa**, pero todo texto que genere se envía solo si `canContact()` aprobó: L–V 07:00–19:00, Sáb 08:00–15:00, **nunca** domingos ni festivos; **máx 1 contacto/día** por deudor (todos los canales); tras contacto directo, **máx 1 canal esa semana** (nada de WhatsApp + llamada + email la misma semana). El **recordatorio de PTP cuenta**; la **confirmación de pago recibido no cuenta** (excepción monetaria).
- **Destinatario (Art. 4):** solo deudor / codeudor / avalista. **Jamás** redactar para terceros (familia, vecinos, empleador, referencias). Si el `intent` trae un destinatario tercero, **rechazar** y devolver a `segmentacion-cadencia`.
- **Disclosures obligatorios (sección F del gate):** identidad de la inmobiliaria + por cuenta de quién, que es **gestión de cobranza**, la **obligación referida** (canon/monto/período), que es un **asistente automatizado**, y un **mecanismo de pago/opt-out**. En el **primer contacto del período** el render incluye el disclosure completo (bloque P1) + opt-out (P3). En toques siguientes del mismo hilo, al menos identidad + opt-out.
- **Honestidad radical (Ley 1480 Estatuto del Consumidor):** ninguna afirmación de monto, intereses, consecuencias, reporte o prueba social que no sea **verdadera y verificable** contra datos reales. Intereses de mora solo si son contractuales y reales. **Sin** "última oportunidad", urgencia/escasez inventada, "el 95% ya pagó".
- **Prohibido en el copy:** "moroso"/"deudor moroso", MAYÚSCULAS-grito, amenazas, preguntar el **motivo** de la mora ("¿por qué no ha pagado?"), shaming, suplantar autoridad/abogado, **toda mención de centrales de riesgo** sin gate G cumplido + aprobación humana.
- **Opt-out (Art. 5 §2):** mecanismo "ágil, sencillo y eficiente" — **"Responda PARE"** en todo primer contacto del período y siempre disponible. El opt-out es **inmediato** y no negociable.
- **Habeas Data (Ley 1581/2012):** los datos de la deuda van solo al titular en su canal autorizado. WhatsApp es chat privado (riesgo de tercero bajo), pero no incluir más datos sensibles que monto/concepto/fecha del propio arriendo.
- **Human-in-the-loop (T-323/2024):** S4/S5, cualquier mención de reporte a centrales, condonación, acuerdos fuera de matriz, vulnerabilidad/disputa → **no se envía**; `validateMessage` devuelve `escalate`. Esta skill **no fuerza** ni "lima" un mensaje escalado.
- **Idioma deudor-facing:** español colombiano, **"usted"**, neutral-formal, Lenguaje Claro (oraciones ≤ ~20 palabras, sin jerga, legible de un vistazo).

> Si `validateMessage` devuelve `block`, esta skill **regenera** el borrador con la razón concreta (no lo edita en silencio). Si devuelve `escalate`, **pausa** y encola a humano.

---

## Fundamento (técnicas + por qué funcionan, con fuente)

- **Estructura "1-1-1-1-1" = 1 idea, 1 monto, 1 fecha, 1 CTA, 1 salida.** Un mensaje efectivo lleva una sola idea, con el dato duro (monto + concepto + fecha) explícito y una acción única. (doc `04` §3.1)
- **CTA único.** Dos o tres llamados a la acción diluyen la conversión; el patrón ganador es **un botón/un enlace** que lleve directo a pagar, con "responder para un plan" como salida secundaria en texto, no como botón competidor. ([Chaser](https://www.chaserhq.com/blog/5-sms-payment-reminder-text-message-samples-to-chase-invoices); [Messente](https://messente.com/blog/payment-reminder-message); [Text Request](https://www.textrequest.com/templates/payment-reminders); doc `04` §3.2)
- **Link de pago seguro y precargado.** URL dinámica atada a la cuenta, con monto/referencia ya cargados, sin login: el deudor no busca nada. Reducir fricción es el nudge de mayor retorno y 100% ético. ([Tratta](https://www.tratta.io/blog/debt-collection-sms-strategies-templates); doc `04` §3.3, §8.4)
- **Mensaje legible en 3 segundos.** WhatsApp se lee en el bolsillo, entre tareas; 2–4 líneas en los primeros toques, una sola petición por mensaje. (doc `04` §5.1–5.2)
- **Lenguaje Claro (DNP).** Dirigirse a *una* persona, frases cortas, sin tecnicismos; cifras en números con formato COP (`$1.450.000`), fechas escritas ("vence el 5 de junio", no "venc. 05/06"). ([DNP — Lenguaje Claro](https://2022.dnp.gov.co/programa-nacional-del-servicio-al-ciudadano/Programas-Especiales/Paginas/Lenguaje-claro.aspx); doc `04` §3.4)
- **"Usted" neutral-formal.** Estándar nacional respetuoso y seguro en toda Colombia; nunca tutear ni "vosear" a un deudor. (doc `04` §4.1–4.2)
- **Emoji funcional, máximo 1.** 👋 saludo, ✅ confirmación. **Nunca** emojis de presión (⚠️🚨❌) en etapas tempranas. (doc `04` §5.2)
- **Palabras prohibidas filtradas.** "moroso", "última oportunidad", "lo demando/reporto", "¿por qué no pagó?", MAYÚSCULAS — estigmatizan, presionan o son ilegales; reemplazo por copy neutro y honesto. (doc `04` §5.3; gate P5)
- **Endurecer en formalidad e información, no en agresividad.** De S0 a S3 sube la claridad sobre consecuencias reales y verificables; el respeto y la legalidad son constantes. (doc `04` §10)
- **Urgencia y prueba social solo si son verdaderas.** "Para evitar intereses de mora a partir del [fecha]" solo si los intereses son contractuales y reales. (doc `04` §8.1–8.3)

---

## Cómo aplicar (pasos concretos del agente)

**Entrada:** un objeto `intent` de una skill conversacional + variables del caso. **Salida:** un string de WhatsApp validado, o un `block`/`escalate`.

```
1. RECIBIR intent (tipo, etapa, variables, esPrimerContactoDelPeriodo, regionOpcional).
2. VERIFICAR destinatario = deudor|codeudor|avalista.   tercero → RECHAZAR (devolver a segmentacion-cadencia).
3. SELECCIONAR plantilla por intent.tipo + etapa (ver "Guiones y plantillas").
4. INTERPOLAR variables:
     - Monto → formato COP con puntos de miles: $1.450.000  (nunca en letras).
     - Fecha → escrita: "5 de junio"  (nunca "05/06").
     - Link → URL precargada (monto + referencia + cuenta).  Sin link válido → BLOCK interno, pedir link.
5. APLICAR reglas de render:
     - 2–4 líneas (primeros toques);  1 idea / 1 monto / 1 fecha / 1 CTA / 1 salida.
     - "usted", neutral-formal;  oraciones ≤ ~20 palabras.
     - máx 1 emoji funcional;  sin MAYÚSCULAS-grito.
6. PASAR filtro de palabras prohibidas (regex + lista) → si hay match, sustituir por copy conforme (tabla P5) o regenerar.
7. INSERTAR compliance:
     - esPrimerContactoDelPeriodo → anteponer disclosure completo (P1) y cerrar con opt-out (P3).
     - toques siguientes del hilo → al menos identidad breve + opt-out.
8. LLAMAR compliance.validateMessage(texto, etapa, contexto):
     - pass     → ENTREGAR para envío (cuando canContact ya aprobó).
     - block    → REGENERAR con la razón; reintentar (máx 2); si persiste, escalar a humano.
     - escalate → PAUSAR, encolar a humano (no enviar, no limar).
9. REGISTRAR el texto final + plantilla + variante para metricas-experimentacion (A/B con holdout).
```

**Reglas de oro del render:**
- Una sola pregunta o petición por mensaje.
- El monto, el concepto y la fecha caben en **una** línea.
- El link de pago va al cierre, como CTA único; "responda para un plan" es salida en texto.
- Si la etapa es S4/S5 o el intent toca reporte/condonación → no renderizar para envío directo; marcar para revisión humana.
- Nunca pegar la deuda completa con lenguaje jurídico en mensajes tempranos.

---

## Guiones y plantillas (español colombiano, listos para usar)

> **Variables:** `[Nombre]` `[Inmobiliaria]` `[Inmueble]` `[$Monto]` `[Fecha]` `[FechaLímite]` `[Link]`.
> Montos en COP con puntos de miles (`$1.450.000`). Fechas escritas ("5 de junio").
> Las marcadas **(1er contacto)** llevan disclosure completo + opt-out por Art. 5 Ley 2300.

### 1. Saludo / recordatorio pre-vencimiento (S0) — (1er contacto)
```
Hola [Nombre] 👋 Le escribe el asistente automatizado de [Inmobiliaria], que gestiona su arriendo de [Inmueble].
Le recordamos que su pago de [$Monto] vence el [Fecha].
Puede pagarlo en un minuto aquí: [Link]
Si ya pagó, ignore este mensaje. Para no recibir más recordatorios, responda PARE.
```

### 2. Aviso del día de vencimiento (S0/S1)
```
Buenos días, [Nombre]. Hoy [Fecha] vence el pago de su arriendo de [Inmueble] por [$Monto].
Para evitar contratiempos, puede pagar aquí: [Link]
Cualquier duda, responda este mensaje y con gusto le ayudamos. Para baja, responda PARE.
```

### 3. Primer aviso de mora (S1) — (1er contacto del período de mora)
```
Hola [Nombre], esperamos que se encuentre bien. Le escribe el asistente de [Inmobiliaria].
El pago de su arriendo de [Inmueble] por [$Monto], con vencimiento el [Fecha], aún figura pendiente.
Si ya lo realizó, por favor avísenos para registrarlo. Si no, puede pagar aquí: [Link]
Para no recibir más mensajes por este medio, responda PARE.
```

### 4. Primer aviso de mora — variante cálida/breve (S1)
```
Hola [Nombre] 👋 Le recordamos su saldo de arriendo de [Inmueble]: [$Monto], vencido el [Fecha].
Páguelo fácil aquí: [Link]  ·  ¿Prefiere un plan? Responda este mensaje.
Para baja, responda PARE.
```

### 5. Seguimiento con oferta de plan (S2)
```
Hola [Nombre]. Le escribimos de nuevo por el saldo de su arriendo de [Inmueble] ([$Monto], vencido el [Fecha]).
Entendemos que pueden surgir imprevistos. Si lo prefiere, podemos acordar un plan en cuotas que se ajuste a usted.
¿Le comparto las opciones? También puede pagar el total aquí: [Link]
```

### 6. Aviso formal con datos reales (S3)
```
Estimado(a) [Nombre], le escribe [Inmobiliaria] respecto a su arriendo de [Inmueble].
Saldo pendiente: [$Monto]. Vencimiento: [Fecha].
Le invitamos a regularizarlo antes del [FechaLímite] para evitar los intereses de mora de su contrato.
Pague aquí: [Link]  ·  O escríbanos para acordar un plan. Para baja, responda PARE.
```

### 7. Confirmación de PTP (acuerdo de pago)
```
Gracias, [Nombre]. Confirmamos su acuerdo de pago:
• Valor: [$Monto]
• Fecha: [Fecha]
• Medio: [Link]
Le enviaremos un recordatorio el día anterior. Si necesita ajustarlo, avísenos con tiempo. ¡Gracias!
```

### 8. Recordatorio pre-fecha de PTP (un día antes — cuenta para el cap)
```
Hola [Nombre], le recordamos su acuerdo de pago de [$Monto] para mañana [Fecha].
Para facilitarlo, aquí tiene el enlace: [Link]
Si necesita ajustar la fecha, respóndanos y vemos opciones.
```

### 9. Recibo / gracias por el pago (excepción: no cuenta para el cap)
```
Hola [Nombre] ✅ Confirmamos su pago de [$Monto] de su arriendo de [Inmueble].
Su cuenta queda al día. Gracias por su pago y su confianza en [Inmobiliaria].
```

### 10. Recibo de pago parcial (honesto: muestra el saldo, sin reproche)
```
Hola [Nombre] ✅ Recibimos su pago de [$MontoAbonado] de su arriendo de [Inmueble]. Gracias.
Queda un saldo de [$MontoRestante]. Cuando le quede cómodo, puede completarlo aquí: [Link]
¿Prefiere un plan para lo que falta? Respóndanos y lo coordinamos.
```

### 11. Re-apertura por silencio / ghosting (varía el ángulo, no la frecuencia)
```
Hola [Nombre], queremos ayudarle a cerrar el tema de su arriendo de [Inmueble] ([$Monto]).
Para facilitarle, dígame qué le sirve más:
1) Pagar hoy   2) Un plan en cuotas   3) Que le escriba otro día
Responda 1, 2 o 3 y seguimos por ahí. Para baja, responda PARE.
```

### 12. Re-apertura tras PTP rota (sin sermón, promesa más pequeña y más cercana)
```
Hola [Nombre], no pudimos confirmar el pago que habíamos acordado para el [Fecha]; no hay problema.
¿Le sirve retomarlo con un primer abono y nueva fecha? Dígame qué monto y día le quedan cómodos.
También puede pagar aquí: [Link]
```

### 13. Ejecución de opt-out (cuando el deudor escribe PARE / "no me escriban más")
```
Entendido, [Nombre]. Respetamos su decisión y dejaremos de escribirle por este medio.
La obligación sigue vigente; cuando usted quiera, puede resolverla por el canal que prefiera.
Quedamos a su disposición. Gracias.
```

### 14. Respuesta a "coordinemos un solo canal/una fecha"
```
Con gusto, [Nombre]. Coordinemos un único canal y una fecha que le funcionen.
¿Prefiere WhatsApp o llamada? ¿Y qué día le queda cómodo para revisar su cuenta?
```

### 15. "Ya pagué / no me han registrado" (verificar, sin interrogar)
```
Gracias por avisar, [Nombre]. Lo verificamos de inmediato.
¿Me confirma la fecha y el medio del pago para cruzarlo? Así actualizamos su cuenta hoy mismo.
```

### 16. Aviso previo de reporte a centrales — SOLO si gate G cumplido + aprobación humana
```
Sr./Sra. [Nombre]: conforme a su autorización y a la Ley 1266 de 2008, le informamos que, de no
regularizar el saldo de [$Monto] de [Inmueble], su obligación podría ser reportada a centrales de
información a partir del [FechaLímite = hoy + 20 días]. Si paga o acuerda un plan antes de esa
fecha, no se realizará el reporte. ¿Le ayudo a resolverlo? [Link]
```
> Este texto **solo** pasa `validateMessage` si `contexto.reporteCentralesGate == APROBADO_HUMANO`. El render no lo genera por iniciativa propia.

---

## Inputs

```yaml
intent:                       # producido por la skill conversacional
  tipo: recordatorio_pre | aviso_dia | mora_primera | mora_seguimiento_plan |
        aviso_formal | ptp_confirmacion | ptp_recordatorio | recibo_pago |
        recibo_parcial | reenganche_ghosting | reenganche_ptp_rota |
        optout_ejecucion | un_solo_canal | verificar_pago | aviso_centrales
  etapa: S0|S1|S2|S3|S4|S5
  esPrimerContactoDelPeriodo: bool       # decide disclosure completo + opt-out
  regionOpcional: interior|paisa|costa|null   # solo varía calidez del saludo, nunca el tratamiento
variables:
  nombre: string
  inmobiliaria: string
  inmueble: string
  montoCOP: number              # se formatea a $X.XXX.XXX
  montoAbonadoCOP: number       # para recibo_parcial
  montoRestanteCOP: number      # para recibo_parcial
  fecha: ISO8601                # se formatea a "5 de junio"
  fechaLimite: ISO8601          # solo si es real/contractual
  linkPago: url                 # precargado (monto + referencia + cuenta), sin login
destinatario:
  rol: deudor|codeudor|avalista # NUNCA tercero
contexto:                       # se pasa a compliance.validateMessage()
  deudor: {...}
  deuda: {monto, periodo, inmueble}
  reporteCentralesGate: APROBADO_HUMANO | PENDIENTE | NO_APLICA
  interesesMoraReales: bool     # gate de honestidad para mencionar intereses
```

---

## Outputs / enrutamiento

- **Render `pass`** → string de WhatsApp final → se entrega al transporte (BSP/WhatsApp) **solo si** `canContact()` ya aprobó la programación. Se registra en `cobranza-metricas-experimentacion` (plantilla + variante + hora).
- **Render `block`** (filtro de prohibidos o `validateMessage`) → regenera con la razón concreta (máx 2 reintentos). Si persiste → escala a humano.
- **Render `escalate`** (S4/S5, centrales sin gate, condonación, vulnerabilidad/disputa) → **no envía**; encola a la cola humana correspondiente vía `compliance.requiresHumanReview()`.
- **Destinatario tercero** en el intent → **rechaza** y devuelve a `cobranza-segmentacion-cadencia`.
- **`intent.tipo == optout_ejecucion`** → emite plantilla 13 y notifica a `compliance` (suprimir canal) + `segmentacion-cadencia` (dejar de programar) + `metricas` (señal de tono).
- **`intent.tipo == ptp_confirmacion`** → emite plantilla 7 y pasa el acuerdo de vuelta a `cobranza-ptp-compromisos` para seguimiento.
- **`intent.tipo == recibo_pago`** → emite plantilla 9; esta confirmación **no cuenta** para el cap de frecuencia (excepción monetaria); cierra el loop positivo.
- **Sin `linkPago` válido** → bloqueo interno; solicita el link a la capa de pagos antes de emitir.

---

## Qué NUNCA hacer

- ❌ Escribir copy con **más de un CTA** o sin link de pago precargado.
- ❌ Usar **"moroso"**, MAYÚSCULAS-grito, emojis de presión (⚠️🚨❌) o tono acusatorio.
- ❌ Preguntar **el motivo** de la mora ("¿por qué no ha pagado?") — Art. 7 Ley 2300.
- ❌ Mencionar **centrales de riesgo**, demanda o reporte sin `reporteCentralesGate == APROBADO_HUMANO`.
- ❌ Afirmar intereses de mora si `interesesMoraReales == false`, o inventar "última oportunidad"/urgencia/prueba social.
- ❌ Renderizar para **terceros** (familia, vecinos, empleador, referencias) bajo cualquier excusa.
- ❌ Omitir el **opt-out ("Responda PARE")** en el primer contacto del período.
- ❌ Omitir el **disclosure de IA** (que es un asistente automatizado) cuando corresponde.
- ❌ Poner el monto en letras, fechas en código ("05/06"), o párrafos largos/jurídicos en toques tempranos.
- ❌ "Limar" en silencio un mensaje que `validateMessage` bloqueó o escaló: el control es **explícito y logueado**.
- ❌ Renderizar S4/S5 para envío directo sin la pausa de **revisión humana** (T-323).
- ❌ Tutear o "vosear"; siempre **"usted"**.

---

## Métricas que mueve

(instrumentadas por `cobranza-metricas-experimentacion`)

- **Tasa de respuesta** por plantilla y por hora/día.
- **Tasa de clic** en el link de pago (CTR del CTA único).
- **Conversión a pago** por etapa S0–S3 atribuida a la plantilla.
- **Tasa de cumplimiento de PTP** (efecto del recordatorio pre-fecha con link).
- **Tasa de opt-out / quejas** → proxy de tono percibido como agresivo; sube si el render falla.
- **% de mensajes bloqueados en pre-envío** (por tipo de violación) → salud del render; debe tender a la baja.
- **Cobertura de disclosures y opt-out** (% de primeros contactos con todo lo obligatorio) → objetivo **100%**.
- **Sentimiento de respuesta** (positivo/neutral/negativo) por plantilla.

> A/B testear honestamente con holdout (champion/challenger): variar saludo, longitud, presencia de oferta de plan, framing de urgencia legítima. **Nunca** testear técnicas excluidas (centrales sin gate, urgencia falsa, prueba social inventada).

---

## Fuentes

**Doc de research primario:**
- `04-tono-mensajeria.md` — §3 (anatomía 1-1-1-1-1, CTA único, link precargado, Lenguaje Claro), §4 (registro "usted" + sensibilidad regional), §5 (microcopy WhatsApp, emoji, palabras a evitar, opt-out), §8 (urgencia/prueba social honestas), §9 (timing dentro de ventana legal), §10 (secuenciación S0–S5), §11 (plantillas), §13 (checklist de QA pre-envío), §14 (métricas de tono).
- `00-SKILL-TAXONOMY.md` §2.10 (esta skill renderiza intención, no la origina; §6 nota de construcción).
- `cobranza-compliance-guardrails` (capa heredada — gate `validateMessage`, disclosures P1–P3, opt-out P3–P4, reemplazos seguros P5, aviso de centrales P6).

**Microcopy / plantillas / best practices:**
- Kleva — Mensajes de cobranza amable por WhatsApp: https://www.kleva.co/post/mensajes-de-cobranza-amable-para-enviar-por-whatsapp/
- Kleva — 50 frases para cobrar amablemente: https://www.kleva.co/post/50-frases-cobrar-dinero-amablemente-2025/
- Colektia — Frases para cobrar amablemente: https://colektia.com/blog/frases-cobrar-para-dinero-amablemente
- Chaser — SMS payment reminder samples: https://www.chaserhq.com/blog/5-sms-payment-reminder-text-message-samples-to-chase-invoices
- Messente — Payment reminder messages: https://messente.com/blog/payment-reminder-message
- Text Request — Payment reminder templates: https://www.textrequest.com/templates/payment-reminders
- Esendex — SMS payment reminder templates: https://www.esendex.co.uk/blog/post/sms-payment-reminder-templates/
- Tratta — Debt collection SMS strategies/templates: https://www.tratta.io/blog/debt-collection-sms-strategies-templates

**Lenguaje claro / idioma colombiano:**
- DNP — Lenguaje Claro: https://2022.dnp.gov.co/programa-nacional-del-servicio-al-ciudadano/Programas-Especiales/Paginas/Lenguaje-claro.aspx
- Guía de Lenguaje Claro (DNP, PDF): https://colaboracion.dnp.gov.co/CDT/Programa%20Nacional%20del%20Servicio%20al%20Ciudadano/GUIA%20DEL%20LENGUAJE%20CLARO.pdf
- TruFluency — Colombian Spanish regional accents: https://trufluency.com/your-guide-to-colombian-spanish-regional-accents-of-colombia/

**Marco legal colombiano (heredado vía compliance):**
- Ley 2300 de 2023 — Función Pública: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990
- Sentencia T-323 de 2024 — Corte Constitucional: https://www.corteconstitucional.gov.co/relatoria/2024/T-323-24.htm
- Ley 1581 de 2012 (Habeas Data) + Circular SIC 001 de 2025.
- Ley 1480 de 2011 (Estatuto del Consumidor).
- Ley 1266 de 2008 + Ley 2157 de 2021 (reporte a centrales — gate duro).

---

> *Skill de entrega (render WhatsApp). Emite español colombiano "usted", neutral-formal, Lenguaje Claro. Toda salida pasa por `cobranza-compliance-guardrails.validateMessage()` antes de enviarse. Las cifras de impacto citadas provienen de mercados US/UK y deben validarse con piloto local antes de tratarse como metas. No constituye asesoría legal; validar con counsel antes de producción.*
