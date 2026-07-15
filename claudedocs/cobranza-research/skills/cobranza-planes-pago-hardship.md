# Skill: cobranza-planes-pago-hardship

> Capa: conversación · Etapas: S1–S5 (núcleo S2–S4) · Canal: ambos (WhatsApp ancla, voz como escalón)

---

## Propósito

Diseñar **planes de pago que el deudor SÍ puede cumplir** y manejar la **dificultad económica (hardship) con dignidad**, para que el inquilino se ponga al día y —sobre todo— **se mantenga al día hacia adelante**. En arriendo, recuperar el atraso no basta: una cuota insostenible rompe al inquilino y se pierde el atraso *y* el canon futuro. Esta skill convierte un "no tengo dinero" o un "deme un plan" en un **acuerdo concreto y asequible** (abono inicial + cuotas mínimas viables + fechas atadas al ingreso + medio de pago fácil), aplicando una **escalera de oferta** de menor a mayor concesión y escalando a humano lo de alto impacto (condonación de capital, vulnerabilidad).

Esta skill **produce el objeto-acuerdo** (saldo, abono, número de cuotas, fechas, medio); **no lo cierra ni le hace seguimiento** — eso lo hace `cobranza-ptp-compromisos`. El render final a español colombiano lo aplican `cobranza-tono-whatsapp` / `cobranza-script-voz`.

---

## Cuándo se activa (triggers)

- El deudor declara **incapacidad de pago total**: "no tengo dinero", "estoy sin trabajo", "se me complicó el mes" (objeción §3.1).
- El deudor **pide un plan / facilidad**: "¿me pueden dar un plan?", "¿lo puedo pagar en cuotas?", "deme plazo".
- El deudor **ofrece o realiza un pago parcial** y queda saldo (objeción §3.9): hay que estructurar el resto.
- El deudor **pide descuento/condonación** (objeción §3.10): distinguir intereses/mora (a veces dentro de política) de capital (siempre humano).
- `cobranza-segmentacion-cadencia` clasifica al deudor como **capacidad-limitada / voluntad-alta** (hardship genuino) o como caso de **fricción que necesita una ruta más fácil**.
- Tras `cobranza-negociacion`, cuando el deudor ya está dispuesto a hablar de solución y hay que aterrizar el acuerdo en números.
- Una **PTP rota** que requiere reestructurar a un compromiso más pequeño y cercano (`cobranza-reenganche` deriva aquí).

---

## Compliance heredado (límites duros relevantes a esta skill)

Todo guion pasa por `cobranza-compliance-guardrails` antes de enviarse. Lo relevante a planes/hardship:

- **No interrogar el motivo de la mora** `[Ley 2300 Art. 7]`. NUNCA preguntar "¿por qué no pagó?", "¿en qué se gastó la plata?", "¿qué le pasó?". Si el deudor cuenta su situación, se **escucha y se valida**; el agente no exige explicación. Para diseñar el plan se pregunta por **capacidad y fechas hacia adelante** ("¿cuánto puede hoy?", "¿qué día le sirve?"), nunca por causas pasadas.
- **Condonación de capital y planes fuera de matriz = revisión humana** `[T-323]`. El agente **no decide** quitas de capital, descuentos no estandarizados, ni alivios que no estén en política escrita. Propone; el humano confirma.
- **Hardship estructural / vulnerabilidad = escalar a humano** `[T-323]`: desempleo prolongado, enfermedad grave, víctima de violencia, situación de vulnerabilidad declarada. La IA no evalúa procedencia de ruta social ni condonación.
- **Honestidad radical** `[Estatuto del Consumidor — Ley 1480]`. Todo beneficio ofrecido debe poder cumplirse. Prohibido: "descuento solo por 10 minutos", "le quito el 50% si paga ya" sin autorización, urgencia/escasez inventada como anzuelo.
- **Sin amenazas ni falsedades legales/centrales** `[Ley 2300 / Ley 1266]`. No condicionar el plan con "si no acepta lo reporto hoy" ni "le embargo". Solo consecuencias reales, verificables y, si tocan reporte a centrales o vía legal, previa revisión humana.
- **Horario y frecuencia** `[Ley 2300 Art. 3]`: el recordatorio del plan/abono respeta L–V 7:00–19:00, Sáb 8:00–15:00 (jamás domingos/festivos), **máx 1 contacto/día** y **1 canal/semana** tras contacto directo. (La **confirmación de un pago recibido** es excepción —operación monetaria— y no consume el cap; el recordatorio de la cuota sí.)
- **Cargos proporcionales** `[Estatuto del Consumidor / Minvivienda]`: el plan no infla el saldo con cargos de cobranza no pactados ni intereses por encima del tope legal (6% anual civil del canon de vivienda, Art. 1617 C.C.).
- **Identificación + acreedor + monto** en todo contacto: quién llama, por cuenta de quién (la inmobiliaria/arrendador), saldo y desglose claros, y opt-out disponible.

---

## Fundamento (técnicas + por qué funcionan, con la fuente)

**1. La asequibilidad es la variable que decide si el plan se cumple.**
Los defaults ocurren cuando la cuota se fija demasiado agresiva; el monto debe ser sostenible **incluso en un "mes apretado"** (doc `01` §5.3). Mejor **3 cuotas cumplidas que 12 incumplidas**. En arriendo el objetivo es doble: recuperar el atraso **y** mantener al inquilino al día hacia adelante; un plan insostenible rompe ambos (doc `01` §5.3, doc `03` §4.1).

**2. La escasez deforma la decisión — por eso simplificar y dar dignidad funciona, no la presión.**
*Scarcity* (Mullainathan & Shafir): la estrechez de dinero crea "tunneling" y carga cognitiva; el deudor evade o no decide **no por mal carácter sino por la presión** (doc `06` Bloque D §5). Implicación: bajar el número de pasos, ofrecer **2–3 opciones máximo con una pre-seleccionada** (sesgo de simplicidad; el 54% quiere soluciones a su medida, no menús indiferenciados — doc `01` §6.3), y validar la emoción antes de proponer.

**3. Abono inicial (cuota inicial) → crea compromiso y reduce saldo.**
Referente de estructuración en Colombia: **~10%–25% del saldo** según capacidad (facilidades de pago, Secretaría de Hacienda Bogotá; doc `03` §4.1). Un primer abono hoy ancla la conducta de pago y vence el **sesgo del presente / descuento hiperbólico**: acción inmediata y micro pesa más que una promesa futura grande (doc `02` §5.2).

**4. Fechas atadas al ingreso = mental accounting + sincronía de quincena.**
La gente asigna el dinero a "cuentas" mentales; vincular la cuota a "el arriendo es su techo" y a **el día que cae la quincena/nómina** hace que salga de esa misma platica sin descuadrar el resto (doc `02` §5.2). Esto se hace preguntando fechas hacia adelante, **nunca** el motivo de la mora.

**5. Default razonable + ease framing.**
La gente sigue la opción preconfigurada: proponer un **plan por defecto** (p. ej., 2 cuotas con fechas sugeridas) que el deudor solo confirma o ajusta, y enmarcarlo como fácil/rápido con link de pago precargado (doc `02` §5.2; doc `01` §6.7). El **self-cure** importa: mucha gente prefiere resolver sola, en su horario; el plan autogestionado + pay-by-link 1-clic es la palanca de mejor ROI (doc `01` §5.1–5.2).

**6. Implementation intentions ("si-entonces") verbalizadas por el deudor.**
Planes si-entonces suben el cumplimiento 2–3× (doc `02` §5.2). Cerrar SIEMPRE con un plan concreto **cuándo + cómo + cuánto**, idealmente dicho por el propio deudor ("el viernes cuando me paguen, abono $X por el enlace"). Esto se pasa a `cobranza-ptp-compromisos` para agendar el recordatorio.

**7. Pago parcial = victoria, no derrota.**
Reduce saldo, mantiene el vínculo y la conducta de pago. Rechazar el parcial exigiendo "todo o nada" pierde recuperación y confianza (doc `03` §3.9). Se acepta, se muestra el **saldo restante claro** y se organiza el resto.

**8. Escalera de oferta (de menor a mayor concesión).**
Conceder en orden evita regalar terreno: total hoy → fecha única → abono parcial + saldo cercano → plan en 2–4 cuotas con abono inicial → alivio de intereses/mora condicionado a pago de capital (dentro de política) → revisión humana para condonación de capital (doc `03` §4.2, §4.4).

**9. Condonación: intereses/mora más defendible que capital; capital = humano.**
Distinguir qué pide el deudor. Condonar **mora/intereses** suele ser viable dentro de política; tocar **capital/canon** es decisión del acreedor y, por T-323, no la toma la IA sola (doc `03` §3.10, §4.3). Un descuento es apropiado cuando hay **hardship verificable + voluntad de pago**, o en cuenta antigua donde la quita maximiza el recobro neto — siempre dentro de política escrita y con aprobación humana si toca capital.

---

## Cómo aplicar (pasos concretos del agente)

1. **Validar sin juzgar y sin interrogar.** Reconocer la situación humana en una frase. Si el deudor cuenta su caso, se escucha; **no** se pregunta el porqué (`[Art. 7]`). Si detecta angustia, baja el ritmo y deriva el tono a `cobranza-empatia-deescalacion`.
2. **Diagnosticar capacidad mirando hacia adelante.** Pregunta única y concreta: *"¿Cuánto puede abonar hoy y qué día le queda cómodo el resto?"* — nada de causas.
3. **Calcular el abono inicial sugerido:** ~10–25% del saldo (o lo que el deudor diga que puede hoy, si es menor). Anclar la conversación al primer abono inmediato.
4. **Proponer un plan por defecto, no un menú abierto.** Máx 2–3 opciones, **una pre-seleccionada**, con fechas atadas a la quincena/nómina del deudor y el **mínimo número de cuotas** que pueda cumplir de verdad.
5. **Mostrar el saldo y el desglose con claridad** (canon, mora a tasa legal, gestión proporcional). En formato COP legible y fechas escritas (lo refina `cobranza-tono-whatsapp`).
6. **Subir la escalera de oferta solo lo necesario.** Empezar por la concesión menor; conceder al siguiente escalón únicamente si el deudor no puede el anterior.
7. **Si pide descuento:** distinguir intereses/mora (puede proponer "escalo para revisar alivio si paga el capital", sin prometer número) vs capital (registrar + **escalar a humano**, no decidir).
8. **Atar todo beneficio a un pago concreto e inmediato**, como incentivo honesto (no presión, no urgencia falsa).
9. **Verbalizar el si-entonces** y pedir que el deudor lo confirme con sus palabras ("entonces el viernes…").
10. **Construir el objeto-acuerdo** (saldo, abono, cuotas, fechas, medio) y **pasarlo a `cobranza-ptp-compromisos`** para confirmación escrita + recordatorio agendado + link.
11. **Escalar a humano** ante: condonación de capital, plan fuera de matriz, hardship estructural/vulnerabilidad, o disputa no resuelta. Marcar el caso y dejar registro; no decidir solo.

---

## Guiones y plantillas (español colombiano, listos para usar)

> "Usted", neutral-formal, baja complejidad. `{nombre}` = deudor; `{X}/{Y}` = montos COP; `{fecha}` = fecha escrita; `{link}` = link de pago precargado. Antes de enviar, `cobranza-tono-whatsapp` aplica formato COP, fechas escritas y filtro de palabras prohibidas.

### A. Hardship — "no tengo dinero / sin trabajo" (S1–S2, WhatsApp)
> Buen día, Sr./Sra. {nombre}. Entiendo que pueden presentarse meses difíciles y queremos ayudarle a ponerse al día sin que esto se le complique más. No necesito que me explique nada. Solo dígame: ¿cuánto puede abonar hoy y qué día le queda cómodo el resto? Con eso le armo un plan a su medida.

### B. Hardship (voz, S3, si responde)
> Sr./Sra. {nombre}, gracias por contestar. Mi objetivo no es presionarlo, sino encontrar una salida que usted pueda cumplir. Tenemos dos caminos: un abono parcial ahora y el resto en una fecha que acordemos, o dividir el saldo en cuotas pequeñas. ¿Cuál se acomoda mejor a lo que usted puede hoy?

### C. Plan por defecto con abono inicial (WhatsApp, S2–S3)
> Sr./Sra. {nombre}, su saldo hoy es de ${X}. Le dejo propuesta una opción sencilla: un primer abono de ${A} hoy y el resto en 2 cuotas, ${B} el {fecha 1} y ${B} el {fecha 2}, atadas a su quincena para que salga de esa misma platica. Si le sirve, me confirma y se lo dejo listo; si prefiere otras fechas o montos, lo ajustamos. Acá el enlace para el primer abono: {link}

### D. Abono inicial pequeño para destrabar (WhatsApp)
> Para arrancar y que no se le siga acumulando, ¿le sirve hacer hoy un abono de ${A}? A veces empezar con un monto pequeño ayuda a destrabar, y enseguida organizamos el resto con fechas que usted pueda cumplir. Acá lo deja en un clic: {link}

### E. Pago parcial recibido → estructurar el saldo (WhatsApp, S1–S4)
> Me parece muy bien, Sr./Sra. {nombre}, todo abono cuenta y le agradezco. Con los ${A} que abonó, su saldo queda en ${Y}. ¿Le organizo el resto en una o dos cuotas con fechas que pueda cumplir? Así avanzamos sin que se le acumule. ¿Qué día le queda cómodo?

### F. Sincronizar con la quincena (mental accounting)
> Para que sea más fácil de sostener, dejemos la cuota el día que le cae la quincena. ¿Le sirve el {fecha} o prefiere el {fecha alterna}? Así sale de esa misma platica sin descuadrarle el mes.

### G. Cierre con si-entonces (verbalizado por el deudor)
> Perfecto. Entonces quedamos así: **el {fecha}, cuando le paguen, entra a este enlace y abona ${B}**: {link}. ¿Me lo confirma con sus palabras para dejarlo claro? Le mando un recordatorio cortico ese día y listo.

### H. Descuento de intereses/mora dentro de política (no promete número)
> Entiendo, Sr./Sra. {nombre}. Lo que sí puedo proponerle: si realiza el pago del capital (${X}) antes del {fecha}, escalo su caso para revisar un alivio en los intereses de mora. No le prometo un número en este momento porque eso lo confirma el área encargada, pero con su disposición a pagar tenemos un buen punto de partida. ¿Le interesa que lo gestione así?

### I. Descuento que el agente NO está autorizado a dar (capital) → escalar
> Su solicitud de descuento es válida y la voy a registrar para que la revise la persona encargada, porque ese tipo de decisión no la tomo yo directamente. ¿Me confirma cuánto podría pagar si le aprueban un alivio? Eso ayuda a sustentar su caso. En cuanto tenga respuesta, le aviso.

### J. Reestructurar tras PTP rota (plan más pequeño y cercano)
> Sr./Sra. {nombre}, veo que la fecha que habíamos acordado ({fecha}) ya pasó. No pasa nada, lo importante es retomar. ¿Le sirve hacer hoy un abono de ${A} y reprogramamos el resto en cuotas más pequeñas? A veces empezar con un monto bajo ayuda a destrabar. ¿Cuánto puede hoy?

### K. Confirmación escrita del acuerdo (resumen claro, se pasa a ptp-compromisos)
> Listo, Sr./Sra. {nombre}, le resumo lo acordado para que quede claro:
> • Saldo total: ${X}
> • Abono hoy: ${A} → {link}
> • Cuota 1: ${B} el {fecha 1}
> • Cuota 2: ${B} el {fecha 2}
> Le mando un recordatorio cortico antes de cada fecha. Gracias por organizarlo conmigo.

### L. Escalamiento por vulnerabilidad/hardship estructural (mensaje puente al deudor)
> Sr./Sra. {nombre}, gracias por contarme. Para darle la mejor opción a su situación, voy a pasar su caso a la persona encargada, que puede revisar alternativas que yo no manejo directamente. Le contactarán pronto. Mientras tanto, no le voy a estar insistiendo. Quedo atento si necesita algo.

---

## Inputs (variables que necesita)

| Variable | Descripción |
|---|---|
| `deudor.nombre` | Nombre del titular para tratamiento "usted". |
| `cuenta.saldo_total` | Saldo adeudado (COP), ya desglosado y validado por compliance/contabilidad. |
| `cuenta.desglose` | Canon, mora (tasa legal), gestión proporcional, servicios/admin si aplica. |
| `cuenta.etapa` | S0–S5 (de `cobranza-segmentacion-cadencia`) para calibrar oferta. |
| `deudor.capacidad_hoy` | Monto que el deudor declara poder abonar hoy (si lo dio). |
| `deudor.fecha_ingreso` | Día de quincena/nómina, si el deudor lo comparte (para atar cuotas). |
| `deudor.arquetipo` | Capacidad×voluntad (hardship genuino / fricción / no-quiere) de segmentación. |
| `politica.abono_inicial_pct` | Rango permitido de cuota inicial (~10–25%). |
| `politica.max_cuotas` | Máx cuotas autorizadas sin revisión humana. |
| `politica.alivio_intereses` | Matriz de alivio de mora/intereses autorizable por el agente. |
| `link_pago` | Pay-by-link precargado con el valor (abono/cuota). |
| `compliance.canContact` | Resultado del gate (horario/frecuencia/canal) antes de cualquier recordatorio. |

---

## Outputs / enrutamiento (a qué otras skills pasa el control)

- **→ `cobranza-ptp-compromisos`** (principal): entrega el **objeto-acuerdo** (saldo, abono, cuotas, fechas, medio) para confirmación escrita, recordatorio agendado pre-fecha y captura del pago. Esta skill diseña; ptp cierra y da seguimiento.
- **→ `cobranza-tono-whatsapp` / `cobranza-script-voz`**: render final del mensaje (formato COP, fechas escritas, lenguaje claro, palabras prohibidas, link).
- **→ `cobranza-empatia-deescalacion`**: si emerge angustia, vergüenza o molestia durante el diseño del plan (capa de tono por debajo).
- **→ `cobranza-compliance-guardrails`** (siempre): `requiresHumanReview` para condonación de capital, plan fuera de matriz, vulnerabilidad, disputa no resuelta → **human-in-the-loop**.
- **→ `cobranza-reenganche`**: si el plan acordado se rompe (PTP vencida), recibe el caso para reabrir sin reproche; suele devolver aquí para reestructurar más pequeño.
- **→ `cobranza-metricas-experimentacion`**: registra la oferta presentada, el escalón aceptado y el resultado (acuerdo cerrado / parcial / escalado) para A/B testing.
- **← Llega desde**: `cobranza-objeciones` (§3.1 hardship, §3.9 parcial, §3.10 descuento), `cobranza-negociacion`, `cobranza-segmentacion-cadencia` (arquetipo hardship).

---

## Qué NUNCA hacer

- **Preguntar el motivo de la mora** ("¿por qué no pagó?", "¿en qué gastó la plata?", "¿qué le pasó?"). `[Ley 2300 Art. 7]`
- **Decidir solo una condonación de capital** o un plan fuera de la matriz de política. `[T-323]`
- **Prometer descuentos no autorizados** o un número de alivio que no puede cumplirse. `[Estatuto del Consumidor]`
- **Urgencia/escasez falsa** ("le quito el 50% pero solo en los próximos 10 minutos"). `[Estatuto del Consumidor]`
- **Fijar una cuota agresiva** que el deudor no pueda sostener "solo para cobrar más rápido" — rompe el plan y el canon futuro.
- **Rechazar un pago parcial** exigiendo "todo o nada".
- **Condicionar el plan con amenazas** ("si no acepta lo reporto hoy / lo embargo / lo demando"). `[Ley 2300 / Ley 1266]`
- **Inflar el saldo** con cargos de cobranza no pactados/no proporcionales o intereses sobre el tope legal. `[Estatuto del Consumidor / Minvivienda]`
- **Sermonear/moralizar** ("sea responsable", "usted firmó un contrato") — falla empíricamente y daña el puente.
- **Sugerir a quién pedirle prestado** (familiar, amigo) — invade y roza el contacto a terceros.
- **Programar el recordatorio de la cuota** fuera de horario, en domingo/festivo, o sumando un contacto extra en el día/semana. `[Ley 2300 Art. 3]`
- **Seguir empujando un plan** cuando hay señal de vulnerabilidad sin escalar a humano. `[T-323]`

---

## Métricas que mueve

- **PTP kept rate** (promesas cumplidas / hechas): la asequibilidad del plan es su mayor predictor.
- **Cure rate** (cuentas que vuelven a estar al día): objetivo directo de la skill.
- **Roll rate** (↓): un plan que se sostiene frena el deterioro al siguiente bucket de mora.
- **Liquidation / recovery rate**: el acuerdo cumplido alimenta el KPI maestro de recobro.
- **% recuperado vía abono parcial**: captura el valor de no exigir "todo o nada".
- **Tasa de escalamiento a humano**: proxy de que lo de alto impacto (capital/vulnerabilidad) se enruta bien.
- **% auto-resuelto sin humano** (self-cure vía plan autogestionado + pay-by-link).
- **Sostenibilidad del plan**: % de planes acordados que se cumplen sin reestructurar (señal de calibración de cuota).

---

## Fuentes (doc de research + libro)

- **Doc `03` Objeciones playbook §4** (estructuración de planes de pago y hardship): componentes del acuerdo, escalera de oferta, cuándo procede un descuento, mapeo etapa↔oferta. `/claudedocs/cobranza-research/03-objeciones-playbook.md`
- **Doc `03` §3.1** ("no tengo dinero / sin trabajo" — hardship), **§3.9** (pago parcial), **§3.10** (descuento/condonación).
- **Doc `01` Estrategia global §5** (self-cure / reducción de fricción; §5.3 diseño de plan que se cumple, "sostenible incluso en mes apretado"). `/claudedocs/cobranza-research/01-estrategia-global-digital.md`
- **Doc `01` §6** (7 tácticas conductuales honestas: simplicidad, ease framing, anclaje).
- **Doc `02` Negociación §5.2** (sesgos y palancas: defaults, mental accounting / sincronizar con quincena, implementation intentions si-entonces, sesgo del presente, fricción de pago). `/claudedocs/cobranza-research/02-negociacion-persuasion.md`
- **Doc `06` Fuentes** — libros base: **Scarcity** (Mullainathan & Shafir) — por qué la estrechez deforma la decisión, justifica empatía + simplificación; **Nudge** (Thaler & Sunstein) — defaults y arquitectura de decisión honesta; **The Psychology of Debt Collection** (BehavioralEconomics.com) — elegir ventana de pago sube compromiso; **Professional Debt Collection Skills** (Assey ⚠️, filtrado contra Ley 2300). `/claudedocs/cobranza-research/06-libros-fuentes.md`
- **Marco legal (heredado de doc `05` vía `cobranza-compliance-guardrails`)**: Ley 2300/2023 (Art. 3 horario/frecuencia, Art. 7 no indagar motivo), T-323/2024 (human-in-the-loop), Ley 1581/2012 + Ley 1266/2008 (Habeas Data / reporte), Ley 1480/2011 (Estatuto del Consumidor), Ley 820/2003 + concepto Minvivienda (interés de mora, proporcionalidad de cargos).

> *Documento de diseño del agente de cobranza. No constituye asesoría jurídica; las políticas de descuento, abono inicial, número de cuotas y alivio de mora deben validarse con el área jurídica/financiera de la inmobiliaria antes de su implementación. Condonación de capital y planes fuera de matriz siempre requieren aprobación humana (T-323).*
