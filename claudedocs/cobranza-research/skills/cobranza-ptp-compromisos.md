# Skill: cobranza-ptp-compromisos
> Capa: orquestación (con render conversacional) · Etapas: S0–S5 (núcleo S1–S4) · Canal: ambos (WhatsApp ancla · voz como cierre/escalón)

## Propósito

Capturar, confirmar y dar seguimiento a **promesas de pago (PTP)** estructuradas —**fecha + monto + medio** concretos— y maximizar la **PTP-kept rate** (promesas que efectivamente se cumplen). Esta skill es el "cerrador del compromiso": toma la disposición a pagar que generan otras skills (negociación, planes-hardship, objeciones) y la convierte en un compromiso verificable, agendado y de bajísima fricción.

Mueve la aguja en tres momentos del loop:
1. **Captura/confirmación**: convierte la vaguedad ("le pago luego") en un compromiso anclado a fecha exacta + monto exacto + link de 1 clic, verbalizado por el propio deudor (implementation intention "si-entonces").
2. **Recordatorio pre-fecha**: un único toque el día previo (o el día) del compromiso, con el link de pago adjunto, para reforzar el commitment device sin violar el cap de frecuencia.
3. **Confirmación de pago recibido**: cierra el loop positivo. Es la **única comunicación de cobranza exenta del horario** (excepción Ley 2300 — "operaciones monetarias"), porque confirma un movimiento de dinero, no presiona uno nuevo.

El principio rector (doc `02` §5.3, doc `01` §5): **reducir fricción es la palanca dominante** — un PTP con monto precargado y link en el mismo mensaje vale más que cualquier guion persuasivo. Y **personalizar, no moralizar**: nombre, monto exacto, fecha atada al ingreso; nada de sermones.

## Cuándo se activa (triggers)

El orquestador invoca esta skill cuando:

- **El deudor declara intención de pagar con vaguedad** → "mañana le pago", "la otra semana", "apenas me caiga la nómina", "déjeme miro" (doc `03` §3.6 — dilación/stalling). Triple objetivo: tomar la palabra positivamente y **concretar fecha+monto+medio**.
- **Se cierra una negociación o un plan** (handoff desde `cobranza-negociacion` o `cobranza-planes-pago-hardship`) → hay un acuerdo (monto/cuotas/fechas) que hay que **registrar como PTP(s)** y confirmar por escrito.
- **El deudor propone una fecha/monto él mismo** → micro-"sí" de Cialdini (compromiso/consistencia): el agente lo formaliza textualmente para anclar la consistencia.
- **Llega la víspera de una PTP agendada** (job de scheduler, T-1 o T-0) → disparar el **recordatorio pre-fecha** con link, validado por compliance.
- **Se detecta un pago entrante** (webhook PSE/Nequi/pasarela, o el deudor manda comprobante) → disparar la **confirmación/recibo** y cerrar/avanzar la PTP.
- **Pago parcial** que cubre menos del monto prometido → reconocer lo abonado, mostrar saldo, y **reprogramar el remanente como una nueva PTP más pequeña** (no reproche).

> No se activa para *captar la disposición* (eso es `negociacion`/`empatia`) ni para *diseñar el plan asequible* (eso es `planes-pago-hardship`). Esta skill **registra, confirma, recuerda y cierra** el compromiso ya gestado.

## Compliance heredado (límites duros relevantes a esta skill)

Todo pasa por `cobranza-compliance-guardrails` (gate de scheduler + gate de pre-envío). Lo crítico para PTP:

- **Horario (Ley 2300, Art. 3) — `America/Bogota`:** captura de PTP y **recordatorio pre-fecha** solo L–V 07:00–19:00 y Sáb 08:00–15:00; **nunca** domingos ni festivos. → Si la PTP es para un lunes, el recordatorio T-1 caería en domingo: **adelantarlo al sábado** (en ventana) o enviarlo el **mismo lunes en la mañana**, nunca el domingo.
- **EXCEPCIÓN clave de esta skill:** la **confirmación de pago recibido** (recibo) confirma una **operación monetaria** → **exenta de la restricción de horario** (Ley 2300). Se puede enviar 24/7, también domingos/festivos, porque cierra el loop positivo y no es gestión de cobro. *(Por prudencia/consistencia de marca, el recibo automático puede igual respetar horario; la ley lo permite siempre.)*
- **Frecuencia (Art. 3):** máx **1 contacto/día** y, tras contacto directo, **1 canal/semana**. El **recordatorio de PTP SÍ cuenta** como gestión de cobranza y consume el cap (doc `01` §7, doc `03` §3.6). → **Un solo** recordatorio por PTP; nada de "le recuerdo hoy y mañana". El recibo de pago **NO** consume el cap (excepción).
- **No sobre-contactar antes de la fecha pactada** (doc `03` §3.6 "qué NO hacer"). Pactada una fecha, el agente **no escribe** entre la confirmación y el recordatorio.
- **Canal autorizado (Art. 4 / Ley 1581):** PTP, recordatorio y recibo solo por canal autorizado por el deudor. Adjuntar el link de pago requiere que el canal/dato esté consentido (Habeas Data).
- **Prohibido interrogar el motivo (Art. 7):** al concretar un PTP **no** se pregunta "¿por qué no pagó?" ni "¿por qué necesita esperar?". Se ofrece la fecha, no se exige la causa.
- **Sin reproche / sin shaming (dignidad):** PTP rota → "no pasa nada, retomemos", nunca "usted nunca cumple". Subir la frecuencia "de castigo" tras un incumplimiento es ilegal (Art. 3).
- **Honestidad (Estatuto del Consumidor):** nada de "última oportunidad" falsa, ni urgencia inventada para forzar la promesa, ni amenaza de reporte a centrales (gate duro — por defecto prohibido) atada al PTP.
- **Human-in-the-loop (T-323):** la PTP en sí (acuerdo de fecha/monto **dentro de la matriz/política estándar**) la puede cerrar el agente. **Escalar a humano** si: el compromiso implica **condonación de capital**, alivio fuera de política, **3.ª promesa rota** (doc `03` §3.8), monto alto/no estándar, disputa o vulnerabilidad. El agente propone; el humano confirma lo de consecuencia legal.

## Fundamento (técnicas + por qué funcionan, con la fuente)

**1. PTP estructurada (fecha + monto + medio concretos) > "le pago luego".**
Un PTP rate y un PTP-kept rate decentes nacen de **concreción**: anclar a fecha y monto específicos, no a "pronto". Una promesa vaga no es compromiso (doc `01` §7.2; doc `03` §3.6). *Fórmulas:* `PTP rate = PTP / right-party-contacts`; `PTP-kept rate = promesas cumplidas / promesas hechas × 100` (también medible en dinero: $ recibidos en/antes de la fecha / $ prometidos). (doc `01` §7.1 — Tratta, OpsDog).

**2. Implementation intentions ("si-entonces"), verbalizadas por el deudor.**
Los planes "si-X-entonces-Y" suben el cumplimiento **2–3×** (Gollwitzer, vía doc `02` §5.2). En cobranza: cerrar siempre con un plan concreto *cuándo + cómo + cuánto*, idealmente **dicho por el deudor mismo** ("el viernes cuando me paguen, entro al link y abono $X"). Esto enlaza con **compromiso y consistencia** de Cialdini (doc `02` §3): la gente cumple lo que **ella** declaró libremente, no lo que se le impuso.

**3. Commitment device + segundo toque bien temporizado.**
Comprometer al "yo futuro" mejora el seguimiento (Bryan/Karlan/Nelson, doc `02` §5.2). El **recordatorio agendado** el día/hora del compromiso es ese dispositivo. Y el segundo toque es **casi tan potente como el primero** en la evidencia de campo (PNAS — recordatorio a ~3 días casi igual de efectivo, +0.57 p.p.; doc `02` §5.1) — pero topado a **1 contacto/día** y dentro de horario: por eso el recordatorio se diseña como **un único toque** el día previo o el día del compromiso (doc `02` §5.3).

**4. Reducir fricción = palanca #1: link de pago de 1 clic con monto precargado, adjunto a la promesa.**
Quitar pasos sube conversión ~5–10% (one-click); pagar activa la ínsula ("dolor de pagar") y cada paso extra es una salida (doc `02` §5.2; doc `01` §5.2; doc `04` §8.4). Por eso **cada** PTP y **cada** recordatorio lleva el link con el valor ya cargado: ease framing (doc `01` §6.7).

**5. PTP asequible: una promesa demasiado alta se rompe.**
El monto debe ser sostenible incluso en "mes apretado"; los defaults ocurren cuando la cuota se fija agresiva (doc `01` §5.3, §7.2). Mejor un monto pequeño cumplido que uno grande roto. Tras una PTP rota, hacer la siguiente **más pequeña y más cercana** (abono hoy) crea cumplimiento real y reconstruye confianza (doc `03` §3.8).

**6. Mental accounting / sincronizar con el ingreso.**
La gente asigna el dinero a "cuentas" mentales; atar el pago al día de la quincena/nómina lo hace salir "de esa misma platica sin descuadrar" (doc `02` §5.2). → La fecha del PTP idealmente coincide con el flujo del deudor (sin interrogar el motivo: se ofrece, no se exige).

**7. Confirmación de pago = excepción legal que cierra el loop positivo.**
Confirmar el pago recibido cae en la excepción de "operaciones monetarias" (Ley 2300, doc `01` §2.4, §7; doc `03` §3.6). Refuerza el **efecto dotación** ("su cuenta queda al día, protege su historial") y la **reciprocidad** futura: el deudor que recibe recibo inmediato y trato digno cumple más la próxima vez. Es gratis de enviar y blinda la relación.

**8. Framing en porcentaje y "fresh start" alrededor del compromiso.**
Enmarcar alivios/ahorro en **porcentaje** (no pesos) movió comportamiento en PNAS (+0.14 p.p.; doc `02` §5). Y anclar el PTP a un nuevo comienzo real ("arrancamos el mes al día") usa el efecto fresh-start (doc `02` §5.2). *Solo si la cifra es real* (Estatuto del Consumidor).

## Cómo aplicar (pasos concretos del agente)

### A. Capturar/confirmar un PTP

1. **Tomar la palabra en positivo.** Si el deudor dijo algo vago ("mañana le pago"), reconocerlo sin reproche y pasar a concretar. Nunca aceptar "después le pago" sin fecha (doc `03` §3.6).
2. **Concretar las 3 variables** — `fecha` + `monto` + `medio`:
   - **Fecha:** exacta (día y, si voz, hora). Ofrecer/validar que sea una que el deudor **pueda cumplir con seguridad** ("¿le sirve esa fecha o prefiere otra que cumpla seguro?"). Atarla al ingreso si el deudor lo menciona.
   - **Monto:** exacto, en COP formateado ($1.450.000). Si es plan en cuotas, **el monto de la próxima cuota** es el PTP activo (las demás quedan agendadas).
   - **Medio:** el link de pago con valor precargado (PSE/Nequi/tarjeta) o datos de cuenta. Adjuntar SIEMPRE.
3. **Hacer que el deudor lo verbalice (implementation intention).** En voz: pedir que confirme con sus palabras ("entonces el viernes, ¿cierto?"). En WhatsApp: pedir un "Confirmo" / "Sí, así es". Buscar el **"así es"** (doc `02` §1.5), no un sí de cortesía.
4. **Confirmar por escrito** (plantilla 11.6) con el resumen: valor, fecha, medio, y aviso de que habrá **un** recordatorio el día anterior.
5. **Registrar el objeto PTP** (ver Outputs) y **agendar el recordatorio** (T-1 o T-0, ajustado a horario legal). **No** programar nada más entre confirmación y recordatorio.
6. **Gate de compliance** antes de emitir y antes de agendar (horario/frecuencia/canal/honestidad).

### B. Recordatorio pre-fecha (un solo toque)

7. **Disparo del scheduler** el día previo (T-1) en ventana legal; si T-1 cae domingo/festivo, mover a sábado en ventana o al mismo día T-0 en la mañana.
8. **Validar cap de frecuencia:** este recordatorio **consume** el contacto del día/semana. Si ya hubo otro contacto ese día → no enviar dos; priorizar el recordatorio (es el de mayor valor).
9. **Mensaje corto** (plantilla 11.7): recuerda el monto, la fecha "mañana/hoy", **link adjunto**, y ofrece reprogramar si necesita ("si necesita ajustar la fecha, respóndanos"). Tono sereno, sin presión, sin "última oportunidad".

### C. Confirmar pago recibido (cierre del loop)

10. **Al detectar el pago** (webhook o comprobante del deudor) → enviar **recibo** (plantilla 11.8). **Exento de horario** (operación monetaria), puede ir de inmediato.
11. **Actualizar estado:** PTP `kept`. Si era cuota de un plan → mostrar saldo restante y la **siguiente** cuota como nueva PTP agendada. Si saldó todo → "su cuenta queda al día" + fresh-start.
12. **Registrar métrica** PTP-kept (en tiempo y en dinero) para `cobranza-metricas-experimentacion`.

### D. PTP rota / vencida sin pago

13. **Constatar con neutralidad** (sin sermón, doc `03` §3.8): "veo que la fecha que habíamos acordado ya pasó; no pasa nada, lo importante es retomar".
14. **Reabrir con una sola pregunta de solución**, ofreciendo una promesa **más pequeña y más cercana** (abono hoy). No reproche, no frecuencia-castigo.
15. **Contar el incumplimiento.** 1.ª–2.ª rota → reintentar PTP menor. **3.ª rota (o monto alto)** → `escalateHuman()` para acuerdo formal documentado / ruta pre-legal (doc `03` §3.8). Handoff típico a `cobranza-reenganche` si además hay ghosting.

### E. Pago parcial

16. **Aceptar y reconocer** lo abonado (nunca rechazar un abono por "no completo"). Mostrar el saldo actualizado y **reprogramar el remanente** como una nueva PTP. (doc `03` — pago parcial: aceptar, mostrar saldo).

## Guiones y plantillas (español colombiano, "usted" — listos para usar)

> Variables: `[Nombre]` `[Inmobiliaria]` `[Inmueble/Concepto]` `[$Monto]` `[$Abono]` `[$Saldo]` `[Fecha]` `[Fecha-1]` `[Link]`. Montos COP ($1.450.000), fechas escritas (viernes 6 de junio). Render final aplica `cobranza-tono-whatsapp` / `cobranza-script-voz` (Lenguaje Claro, filtro de palabras prohibidas, emoji funcional máx. 1).

### 1) Concretar PTP desde dilación "mañana le pago" (WhatsApp · S0–S3)
```
Perfecto, [Nombre], le agradezco. Para dejarlo claro:
¿quedamos en que el [Fecha] realiza el pago de [$Monto]?
Le dejo aquí el medio para que sea fácil: [Link]
Ese día le mando un recordatorio cortico y listo.
¿Le sirve esa fecha o prefiere otra que pueda cumplir con seguridad?
```

### 2) Concretar PTP atado al ingreso (WhatsApp · S2–S3)
```
Con gusto lo organizamos, [Nombre].
Para que salga de la misma quincena sin descuadrarlo, ¿dejamos el pago de [$Monto] el [Fecha]?
Aquí tiene el enlace listo con el valor cargado: [Link]
Si esa fecha le aprieta, me dice una que cumpla seguro y la dejamos.
```

### 3) Cierre con "así es" + si-entonces verbalizado (voz · S2–S4)
```
Agente: "Entonces, para confirmar: el [Fecha], cuando le caiga el pago,
         entra al enlace que le envío y abona [$Monto]. ¿Es así?"
Deudor: "Sí, así es."
Agente: "Listo, [Nombre]. Le mando el enlace ahora mismo por WhatsApp
         y un recordatorio cortico el [Fecha-1]. Gracias por organizarlo conmigo."
```

### 4) Confirmación escrita del acuerdo PTP (WhatsApp · cualquier etapa)
```
Gracias, [Nombre]. Confirmamos su acuerdo:
• Valor: [$Monto]
• Fecha de pago: [Fecha]
• Medio: [Link]
Le escribiremos un recordatorio el [Fecha-1]. Cualquier cambio, avísenos con tiempo.
¡Gracias por su gestión!
```

### 5) Confirmación de PTP de plan en cuotas (WhatsApp · S2–S4)
```
Listo, [Nombre]. Así queda su acuerdo:
• Abono ahora: [$Abono]  → [Link]
• Cuota 1: [$Monto] el [Fecha]
• Cuota 2: [$Monto] el [Fecha]
Le recuerdo cada cuota un día antes. Saldo total: [$Saldo].
Empezamos y vamos avanzando. ¡Gracias!
```

### 6) Recordatorio pre-fecha — un día antes (WhatsApp · un solo toque)
```
Hola [Nombre], le recordamos su acuerdo de pago de [$Monto] para mañana [Fecha].
Para facilitarlo, aquí tiene el enlace: [Link]
Si necesita ajustar la fecha, respóndanos y vemos opciones.
```

### 7) Recordatorio pre-fecha — mismo día (cuando T-1 cae domingo/festivo) (WhatsApp)
```
Buenos días, [Nombre]. Hoy [Fecha] es la fecha que acordamos para su pago de [$Monto].
Puede hacerlo en un minuto aquí: [Link]
Si algo cambió, escríbanos y lo reorganizamos.
```

### 8) Confirmación de pago recibido / recibo (WhatsApp · EXENTO de horario)
```
Hola [Nombre] ✅ Confirmamos su pago de [$Monto] correspondiente a [Inmueble].
Su cuenta de arriendo queda al día. Gracias por su pago y su confianza en [Inmobiliaria].
```

### 9) Recibo de cuota con saldo y siguiente PTP (WhatsApp · EXENTO de horario)
```
Recibido, [Nombre] ✅ Abono de [$Abono] aplicado a su arriendo de [Inmueble].
Saldo actual: [$Saldo].
Su próxima cuota: [$Monto] el [Fecha]. Le recuerdo un día antes. ¡Gracias!
```

### 10) Pago parcial — aceptar y reprogramar remanente (WhatsApp · S2–S4)
```
Gracias, [Nombre], registramos su abono de [$Abono] ✅
Queda un saldo de [$Saldo]. ¿Le sirve dejarlo para el [Fecha]?
Le dejo el enlace listo: [Link]. Avíseme y lo confirmamos.
```

### 11) PTP rota — reabrir sin reproche, promesa más pequeña y cercana (WhatsApp · S2–S4)
```
[Nombre], veo que la fecha que habíamos acordado ([Fecha]) ya pasó.
No pasa nada, lo importante es retomar.
¿Le sirve hacer hoy un abono de [$Abono] y reprogramamos el resto?
A veces empezar con un monto pequeño ayuda a destrabar. Aquí el enlace: [Link]
```

### 12) PTP rota (voz · breve, sereno · S3–S4)
```
"[Nombre], buenas tardes. Vi que la fecha que habíamos quedado ya pasó.
Tranquilo, lo importante es retomarlo. ¿Le funciona que hagamos hoy un primer abono
y reorganizamos el resto a una fecha que cumpla seguro? Le envío el enlace por WhatsApp."
```

### 13) Reprogramación a solicitud del deudor (WhatsApp)
```
Claro que sí, [Nombre]. Movemos su pago de [$Monto] al [Fecha].
Le dejo el enlace listo para ese día: [Link]
Le mando el recordatorio el [Fecha-1]. ¡Gracias por avisar!
```

### 14) Aviso de escalamiento a humano (3.ª PTP rota / monto alto) (WhatsApp · neutral)
```
[Nombre], para organizar mejor su caso, lo va a acompañar una persona de nuestro equipo,
que podrá revisar opciones de pago con usted con más detalle.
Le escribirá pronto por este mismo canal. Gracias por su disposición.
```

## Inputs (variables que necesita)

**Del deudor / cuenta:**
- `deudor.nombre`, `deudor.id`
- `deudor.canal_autorizado` (whatsapp | voz | …) y `deudor.opt_out` (bool)
- `inmobiliaria.nombre`
- `obligacion.inmueble`, `obligacion.saldo_total`, `obligacion.canon`, `obligacion.fecha_vencimiento`

**Del compromiso (PTP):**
- `ptp.monto` (COP), `ptp.fecha` (date, zona `America/Bogota`), `ptp.medio` (link | datos_cuenta)
- `ptp.tipo` (pago_total | cuota_de_plan | abono_parcial)
- `ptp.link_pago` (URL con monto precargado), `ptp.es_dicho_por_deudor` (bool — implementation intention)
- `plan.cuotas[]` (si aplica: [{monto, fecha}])

**De contexto/orquestación:**
- `etapa` (S0–S5), `arquetipo` (de `cobranza-segmentacion-cadencia`: olvido | no-quiere | hardship | crisis)
- `historial_ptp` (lista: {fecha, monto, estado: kept|broken|pending}) → `ptp_rotas_consecutivas` (int)
- `ultimo_contacto` (timestamp) y `contactos_semana` (de compliance, para el cap)
- `evento_pago` (de webhook pasarela: {monto, timestamp, referencia}) cuando dispara el recibo

**Gates (de `cobranza-compliance-guardrails`):**
- `canContact(deudor, canal, momento) → {ok, razón}`
- `validateMessage(borrador, etapa) → pass | block | escalateHuman`
- `requiresHumanReview(accion) → bool`

## Outputs / enrutamiento (a qué otras skills pasa el control)

**Objetos que produce:**
- `PTP` registrado: `{deudor_id, monto, fecha, medio, tipo, estado: pending, recordatorio_agendado_at}`
- `scheduled_reminder`: job de recordatorio pre-fecha (T-1/T-0, validado por horario).
- `payment_receipt`: confirmación de pago (exenta de horario).
- Evento de métrica: `ptp_created`, `ptp_kept`, `ptp_broken`, `partial_payment` → `cobranza-metricas-experimentacion`.

**Enrutamiento:**
- ← **Recibe control de** `cobranza-negociacion` (acuerdo cerrado) y `cobranza-planes-pago-hardship` (plan diseñado) para formalizar la(s) PTP.
- ← **Recibe de** `cobranza-objeciones` (caso §3.6 "mañana le pago") para concretar la promesa.
- → **Devuelve a** `cobranza-tono-whatsapp` / `cobranza-script-voz` para render final del mensaje (Lenguaje Claro, filtro de prohibidos).
- → **Pasa a** `cobranza-reenganche` cuando la PTP queda rota/vencida **y** hay ghosting (sin subir frecuencia).
- → **Re-invoca** `cobranza-planes-pago-hardship` si una PTP se rompe por monto inasequible (rediseñar más pequeño).
- → **Escala vía** `cobranza-compliance-guardrails.escalateHuman()` cuando: 3.ª PTP rota, monto alto/no estándar, condonación de capital, disputa o vulnerabilidad (T-323).
- → **Siempre** pasa por el gate de `cobranza-compliance-guardrails` antes de programar el recordatorio y antes de enviar cualquier mensaje (excepto que el **recibo** está exento de horario, no del resto de validaciones).

## Qué NUNCA hacer

- ❌ Aceptar "después le pago" / "pronto" **sin fecha y monto concretos** (no es compromiso; doc `03` §3.6).
- ❌ **Sobre-contactar antes de la fecha pactada** (Ley 2300 Art. 3). Entre confirmación y recordatorio, silencio.
- ❌ Enviar **más de un** recordatorio por PTP, o recordar "hoy y mañana" (excede el cap; consume el contacto del día/semana).
- ❌ Programar recordatorio en **domingo/festivo** o fuera de 07:00–19:00 L–V / 08:00–15:00 Sáb. (Mover a sábado en ventana o T-0 mañana.)
- ❌ **Subir la frecuencia "de castigo"** tras una PTP rota (Art. 3) ni reprochar ("usted nunca cumple", "ya no le creo").
- ❌ Preguntar el **motivo** del no pago o del aplazamiento al concretar la promesa (Art. 7).
- ❌ Usar **urgencia/escasez falsa** ("última oportunidad", "el link vence en 1 hora") para forzar la promesa (Estatuto del Consumidor).
- ❌ Atar el PTP a **amenaza de reporte a centrales** o consecuencias legales no verificadas/no aprobadas por humano (gate duro + T-323).
- ❌ Fijar un monto de promesa **inasequible** que se va a romper (mejor pequeño y cumplido; doc `01` §5.3).
- ❌ Cerrar **autónomamente** acuerdos con condonación de capital, alivios fuera de política, o tras 3.ª promesa rota (→ humano).
- ❌ Adjuntar link/datos por un **canal no autorizado** o a un **tercero** (referencias, fiador "para presionar", familia).
- ❌ Tratar el **recibo de pago** como excusa para colar gestión de cobro nueva (la excepción de horario es solo para confirmar la operación monetaria).

## Métricas que mueve

| Métrica | Cómo la mueve esta skill |
|---|---|
| **PTP rate** (`PTP / RPC`) | Concretar la promesa en cada contacto con disposición sube la captura de compromisos. (doc `01` §7.1) |
| **PTP-kept rate** (`cumplidas / hechas`, en # y en $) | **Métrica núcleo.** La sube el combo fecha+monto concretos + recordatorio pre-fecha + link 1-clic + monto asequible + si-entonces verbalizado. (doc `01` §7.2) |
| **Cure rate** | PTP cumplidas → cuentas vuelven a estar al día. (doc `01` §8) |
| **Roll rate** ↓ | Compromisos cumplidos a tiempo frenan el paso al siguiente bucket de mora. |
| **Liquidation / recovery rate** ↑ | Cash efectivamente recibido en/antes de la fecha prometida. |
| **% auto-resuelto sin humano** ↑ | PTP + link de autopago cierran sin intervención humana. |
| **Cost-per-peso collected** ↓ | Recordatorio + recibo automatizados reemplazan gestión humana repetitiva. |
| **Opt-out / quejas** (proxy de fricción/compliance) | Se mantiene bajo respetando cap de frecuencia y tono no-reproche; sube si se sobre-recuerda. |
| **Tasa de escalamiento a humano** | Se controla escalando solo lo de alto impacto (3.ª rota, capital, vulnerabilidad). |

> Cada plantilla/secuencia debe ser **versionable y A/B-testeable con holdout** (champion/challenger) vía `cobranza-metricas-experimentacion`. Las cifras de lift de los docs son US/UK/crédito de consumo → **hipótesis a validar** en arriendo residencial colombiano por WhatsApp/voz.

## Fuentes (doc de research + libro)

**Documentos de research (`/claudedocs/cobranza-research/`):**
- `01-estrategia-global-digital.md` — §7 (gestión de PTP: definiciones, fórmulas PTP/PTP-kept, qué sube la tasa cumplida), §5 (self-cure / pay-by-link / reducción de fricción), §3.1 (prevención temprana = mayor ROI), §2.4 y §7 (confirmación de pago = excepción Ley 2300), §8 (KPIs y cadena causal).
- `02-negociacion-persuasion.md` — §5.2 (implementation intentions si-entonces, commitment devices, defaults, mental accounting, fresh start, fricción de pago), §5.1/§5.3 (segundo toque potente pero legal; personalizar no moralizar), §1.5 ("así es"), §3 (Cialdini: compromiso/consistencia, reciprocidad — modo "detective").
- `03-objeciones-playbook.md` — §3.6 ("mañana le pago" → concretar PTP), §3.8 (PTP rota → reabrir sin reproche, promesa menor, escalamiento a 3.ª rota), §4.1 (componentes del acuerdo).
- `04-tono-mensajeria.md` — §11.6 (confirmación de acuerdo PTP), §11.7 (recordatorio pre-fecha), §11.8 (recibo de pago), §11.10 (guion de voz con confirmación), §3 (anatomía 1-1-1-1-1, link precargado), §5 (microcopy / palabras prohibidas).
- `05-marco-legal-colombia.md` — Ley 2300/2023 (horario, frecuencia, canal, terceros, motivo, excepción de operaciones monetarias), T-323/2024 (human-in-the-loop), Ley 1581/2012 (Habeas Data, canal autorizado), Ley 1480/2011 (Estatuto del Consumidor, honestidad).
- `00-SKILL-TAXONOMY.md` — §2.7 (definición de esta skill), §3 (composición por etapa).

**Libros / fuentes primarias (doc `06`):**
- **Influence** (Robert Cialdini) — principio de **compromiso y consistencia** (la gente cumple lo que ella declara); modo "detective" (honestidad de toda influencia).
- **Nudge, Final Edition** (Thaler & Sunstein) — defaults razonables, arquitectura de decisión, reducción de fricción.
- **BehavioralEconomics.com — "The Psychology of Debt Collection"** — implementation intentions y commitment devices aplicados al repago.
- Evidencia de campo: **PNAS 2025** (nudges a escala — segundo toque ≈ tan potente como el primero; framing en %; PMC11789030) y **Gollwitzer** (planes if-then suben cumplimiento 2–3×).
