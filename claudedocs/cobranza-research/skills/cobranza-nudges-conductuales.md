# Skill: cobranza-nudges-conductuales
> Capa: orquestación (estilo/encuadre que otras skills consumen) · Etapas: S0–S5 (más fuerte en S0–S2) · Canal: ambos (optimiza el mensaje; el render final lo hacen `cobranza-tono-whatsapp` / `cobranza-script-voz`)

## Propósito

Es la **capa de optimización conductual honesta** del agente: toma cualquier mensaje de pago, recordatorio o plan que produzca otra skill y lo hace **más probable de convertir en pago** aplicando economía del comportamiento de campo — sin presión, sin engaño, sin vergüenza.

Responsabilidad única (SRP): **decidir QUÉ palancas conductuales aplicar y CÓMO encuadrar el mensaje/oferta**. NO redacta el texto final (eso lo hace `cobranza-tono-whatsapp` / `cobranza-script-voz`), NO valida horario/frecuencia/canal ni honestidad de cifras (eso lo hace `cobranza-compliance-guardrails`), NO segmenta al deudor (eso lo hace `cobranza-segmentacion-cadencia`), NO negocia ni captura PTP. Produce una **decisión de encuadre estructurada** (qué nudges, con qué variables verificadas), que se inyecta en la intención del mensaje.

La tesis de campo, contraintuitiva: **lo que mueve la aguja NO es recordar más ni moralizar.** Es:
1. **Reducir fricción de pago** (la palanca #1, evidencia más fuerte).
2. **Personalizar, no moralizar** (nombre, monto exacto, fecha atada al ingreso).
3. **Encuadrar bien** (porcentaje > pesos; pérdida verídica > ganancia; default razonable; ease framing).
4. **Segundo toque bien temporizado** (casi tan potente como el primero — respetando el cap de 1 contacto/día).

> **Regla de oro de esta skill:** **ningún nudge sobre un dato inventado.** La escasez debe tener un vencimiento real, la prueba social debe ser una cifra real de la cartera, la aversión a la pérdida debe describir una consecuencia que realmente procede. Si el factor no existe de verdad, el nudge NO se usa (modo "detective" de Cialdini; Estatuto del Consumidor, Ley 1480). Todo borrador que esta skill encuadra pasa igual por `validateMessage()` antes de enviarse.

## Cuándo se activa (triggers)

Como **capa de estilo/encuadre sobre casi todo mensaje de cara al deudor**, especialmente cuando hay una acción de pago que pedir. Se invoca cuando:

- `cobranza-segmentacion-cadencia` decide una next-best-action que incluye **pedir/recordar un pago o proponer un plan** (S0–S5).
- Se va a redactar un **recordatorio S0/S1** (preaviso, mora temprana) → aquí el ROI del encuadre es máximo (prevención).
- `cobranza-negociacion` o `cobranza-planes-pago-hardship` arman una **oferta de plan** → necesita default razonable, anclaje y ease framing.
- `cobranza-ptp-compromisos` va a **cerrar o recordar una PTP** → necesita implementation intention y ease framing del link.
- `cobranza-reenganche` va a **reabrir** tras ghosting / PTP rota → necesita fresh-start y menú de baja barrera.
- El **segundo toque** está programado (día siguiente o día del compromiso) → encuadrarlo distinto al primero, sin repetir literal.

No se activa para: confirmaciones de pago recibido (excepción Ley 2300, sin nudge — es servicio), mensajes puramente de compliance (opt-out, disclosures), o cuando `requiresHumanReview = true` (la acción se pausa, no se "optimiza").

## Compliance heredado (límites duros relevantes a esta skill)

Esta skill diseña **persuasión**, así que es la que más fácilmente puede cruzar la línea. Toda salida que encuadre pasa por `cobranza-compliance-guardrails` (`validateMessage()`); aquí los límites que esta skill debe respetar **al elegir el nudge**, no después:

- **Honestidad radical (Estatuto del Consumidor, Ley 1480/2011):** cada palanca solo se usa si el factor que invoca **existe y es verificable** contra datos reales del caso.
  - Aversión a la pérdida → solo consecuencias **reales y procedentes** (intereses de mora que sí corren; jamás "embargo mañana" ni reporte a centrales sin el gate G cumplido y aprobado por humano).
  - Escasez → solo si el alivio/condición tiene un **vencimiento real** (un descuento de mora que de verdad expira). **Prohibido** "última oportunidad", "solo hoy", plazos inventados.
  - Prueba social → solo con **cifras reales de la cartera** ("la mayoría resuelve en pocos días" solo si es cierto). **Prohibido** "el 95% ya pagó" si no lo verificaste.
  - Anclaje → sobre cifras reales del contrato/canon, no infladas para "anclar alto".
- **Sin urgencia/escasez fabricada ni prueba social inventada** (Ley 1480 + `compliance` §E). Aunque "funcionen", están excluidas (doc `05` §9.10 — "guilt nudges").
- **No moralizar / no shaming.** Los llamados prosociales/morales genéricos ("sea responsable", "no sea irresponsable") **fallan empíricamente** y además rozan el lenguaje denigrante. Esta skill los excluye por inútiles **y** por riesgo legal.
- **No preguntar el motivo de la mora (Ley 2300, Art. 7).** El framing de pérdida o el mental accounting **no se construyen interrogando** ("¿por qué no pagó?"); se construyen sobre datos del caso y lo que el deudor comparta voluntariamente.
- **Cap de frecuencia (Ley 2300, Art. 3):** el "segundo toque" potente que ordena la evidencia **no autoriza** más de **1 contacto/día** ni **multicanal en la semana** tras contacto directo. El segundo toque cae **al día siguiente o el día del compromiso**, por el mismo canal, dentro de horario L–V 07:00–19:00 / Sáb 08:00–15:00, nunca domingos/festivos.
- **Self-service 24/7 es legal:** incluir el **link de pago con monto precargado** en todo mensaje es la palanca #1 y NO es contacto saliente (lo inicia el deudor) — siempre va, incluso fuera de la ventana de contacto.
- **Human-in-the-loop (T-323):** un nudge **nunca** sustituye la revisión humana en lo de alto impacto. No se "encuadra" un reporte a centrales, una condonación o un paso a S5 para hacerlo más persuasivo: eso se **escala**.
- **Idioma deudor-facing:** español colombiano, **"usted"**, neutral-formal, Lenguaje Claro (oraciones ≤20 palabras). Lo aplica el render; aquí se respeta al elegir el encuadre.

## Fundamento (técnicas + por qué funcionan, con la fuente)

| Palanca | Por qué funciona (evidencia) | Cómo se usa HONESTAMENTE | Fuente |
|---|---|---|---|
| **Reducir fricción de pago (palanca #1)** | Quitar pasos sube conversión ~5–10% (one-click); pagar activa la ínsula → "dolor de pagar" que cada paso extra amplifica. ~96–98% de consumidores resuelven solos vía autoservicio; 29% paga fuera de horario. | **Link de pago con monto precargado en cada mensaje**, sin login, múltiples medios (PSE, Nequi, tarjeta), confirmación automática. Es más potente que cualquier guion. | PNAS 2025; TrueAccord; PayNearMe/REPAY; doc `01` §5, `02` §5.2 |
| **Framing en porcentaje > pesos** | En el experimento PNAS (13M personas), describir el ahorro **en % en vez de pesos** redujo moras −0.14 p.p. adicionales. | Encuadrar alivios y costos de mora en **porcentaje**: "se ahorra el X% de los intereses de mora". | PNAS 2025; doc `01` §3.1, `02` §5.2 |
| **Aversión a la pérdida (verídica)** | Perder duele ~2× más que ganar lo mismo; framing como pérdida puede ser ~2× más efectivo que como recompensa. | Enmarcar como **proteger lo que ya tiene** (estabilidad, historial, tranquilidad) y mostrar que la mora **crece** si se espera — solo consecuencias reales. | Kahneman; McKinsey *Behavioral insights*; Symend; doc `01` §6, `02` §5.2 |
| **Defaults (opción por defecto)** | La gente sigue la opción preconfigurada; bajo estrés financiero baja el ancho de banda cognitivo → un menú abierto paraliza. | Proponer **un plan por defecto razonable** (2 cuotas, fechas sugeridas) que el deudor solo **confirma o ajusta** ("[Confirmar] o [Cambiar]"). | Thaler & Sunstein *Nudge*; Symend (sesgo de simplicidad); doc `01` §6, `02` §5.2 |
| **Anclaje** | El primer número fija la referencia; mostrar el saldo total y luego la cuota hace que la cuota se sienta manejable. | Mostrar **saldo total → cuota del plan → desglose semanal/diario**, todo sobre cifras reales del contrato. | Kahneman; PNAS (%); doc `01` §6 |
| **Ease framing (acción = fácil/rápida)** | Enmarcar la acción como sencilla baja la barrera percibida; opt-out > opt-in; una sola pulsación convierte más. | "Con un clic queda al día"; pre-llenar; "le dejamos listo el plan, solo confirma". | Symend; doc `01` §6 |
| **Prueba social (honesta)** | Normalizar el resolver baja la vergüenza, principal motor de la evasión — **solo si es cierto**. Los morales genéricos fallan; la norma descriptiva real funciona. | "La mayoría de inquilinos en su situación resuelve con un plan corto de dos cuotas" — **solo con cifra real**. | Cialdini *Influence* (modo detective); Symend; doc `01` §6, `02` §3 |
| **Mental accounting** | La gente asigna dinero a "cuentas" mentales; el arriendo es "el techo", la quincena es "esa platica". | Sincronizar la fecha de pago con el **día del ingreso/quincena**; vincular el pago a la cuenta mental "su casa". | Thaler; doc `02` §5.2 |
| **Implementation intentions (si-entonces)** | Planes "cuándo + cómo" ↑ cumplimiento 2–3×, sobre todo si los verbaliza el propio deudor. | Cerrar con plan concreto: "**el viernes cuando le paguen**, entra a este enlace y abona $X". | Gollwitzer; Behavioral Scientist; doc `02` §5.2 |
| **Fresh start** | Hitos temporales (inicio de mes/semana, "borrón y cuenta nueva") motivan a actuar. | Anclar el acuerdo a un **nuevo comienzo real**: "arranquemos el mes al día". Útil en reenganche. | doc `02` §5.2 (Heath *Switch*) |
| **Sesgo del presente / acción inmediata** | Sobrevaloramos el ahora → se posterga el pago; un micro-paso hoy vence la postergación. | Pedir **un primer abono hoy mismo**, pequeño, con el link en el mismo mensaje. | FPA *Present bias*; doc `02` §5.2 |
| **Segundo toque bien temporizado** | En PNAS, un recordatorio de seguimiento (~3 días) fue **casi tan potente como el mensaje inicial** (+0.57 p.p.). Repetir las **mismas 2 acciones** superó a separar 1 por mensaje. Pero "solo recordar más" tiene efecto pequeño/decreciente. | Programar el segundo toque al **día siguiente o el día del compromiso** (respetando 1/día), variando el ángulo, repitiendo el mismo CTA y link. | PNAS 2025; ScienceDirect (NPL); doc `02` §5.1, §5.3 |
| **Personalizar, no moralizar** | Mensajes personalizados mejoran el pago; llamados prosociales/morales genéricos **fallan**. Email personalizado: +20% engagement, +29% open. | Nombre propio, monto exacto, inmueble, fecha atada al ingreso. **Cero sermón.** | Saulitis 2024; resolvepay; doc `02` §5.1, §5.3 |

> **Validación "detective" antes de cualquier nudge:** *¿este factor existe de verdad en este caso?* Si no → no se usa. (Sin descuento real → no hay escasez. Sin cifra real → no hay prueba social. Sin consecuencia procedente → no hay framing de pérdida.)

## Cómo aplicar (pasos concretos del agente)

Función conceptual que esta skill expone a las demás:

```ts
applyNudges(intencionMensaje, etapa, contexto): {
  nudgesAplicados: string[],          // p.ej. ["fricción","framing%","default","si-entonces"]
  variablesEncuadre: {...},           // valores verificados a inyectar en el render
  segundoToque?: { cuando, angulo, mismoCTA: true }
}
```

Pasos (en orden):

1. **Siempre inyectar fricción cero.** Adjuntar `linkPago` con **monto precargado** y medios (PSE/Nequi/tarjeta). Si no hay link disponible, marcarlo como gap (la palanca #1 no debe faltar). Esto va incluso fuera de la ventana de contacto saliente (self-service legal 24/7).
2. **Personalizar, nunca moralizar.** Inyectar `nombre`, `monto` exacto, `inmueble`, y `fecha` atada al ingreso si se conoce. Eliminar cualquier frase moral/prosocial genérica.
3. **Elegir 1–2 nudges de encuadre por etapa** (no apilar 6 — sobrecarga y suena manipulador). Guía:
   - **S0–S1:** ease framing + framing % + default de fecha. (Tono servicio; sin consecuencias.)
   - **S2:** + aversión a la pérdida **verídica** (la mora crece) + mental accounting (atar a quincena).
   - **S3:** + default de plan (2–3 cuotas) + anclaje (saldo→cuota→semanal) + si-entonces verbalizado.
   - **S4–S5:** encuadre **factual y sobrio**, sin nudges de presión; consecuencias solo reales y previamente validadas por humano. El nudge dominante sigue siendo **fricción cero**.
4. **Validar cada palanca contra datos reales** (gate "detective"). Si el factor no es verificable → descartar ese nudge y dejar registro de por qué.
5. **Encuadrar en porcentaje** los alivios/ahorros (PNAS), sobre cifras del contrato.
6. **Cerrar con implementation intention** cuando haya compromiso: "cuándo + cómo + cuánto", idealmente verbalizado por el deudor (se lo pasa a `cobranza-ptp-compromisos`).
7. **Programar el segundo toque** (si aplica) al **día siguiente** o **el día del compromiso**, mismo canal, mismo CTA y link, **ángulo distinto** (no repetir literal), respetando 1/día y horario. Devolverlo en `segundoToque`.
8. **Entregar la decisión de encuadre** a la skill que renderiza (`tono-whatsapp` / `script-voz`); el resultado pasa por `validateMessage()` antes de salir.

> **Tope de densidad:** máx **2 nudges de encuadre** por mensaje, además de los dos siempre-presentes (fricción cero + personalización). Más palancas no suman; restan claridad y disparan la sensación de manipulación.

## Guiones y plantillas (español colombiano, listos para usar — varios)

> Son **fragmentos de encuadre** para inyectar en el render de `tono-whatsapp`. Cada uno marca qué palanca usa. Todos asumen disclosures + opt-out que añade `tono-whatsapp`/`compliance`; aquí se muestra el **núcleo conductual**.

### N1 — Fricción cero + ease framing (S0/S1, base universal)
```
Sr./Sra. {nombre}, le dejo listo el pago del arriendo de {inmueble} ({mes}): {monto}.
Con un clic queda al día 👉 {linkPago}
```
*(Palancas: fricción cero, ease framing, personalización. Sin consecuencias — es S0/S1.)*

### N2 — Default de fecha atada al ingreso (S1, mental accounting)
```
Sr./Sra. {nombre}, para que salga de la misma quincena sin descuadrarlo, le propongo
dejar el pago de {monto} el {fechaQuincena}. Si le sirve, me confirma; si no, lo ajustamos.
{linkPago}
```
*(Palancas: default, mental accounting, "getting to no" suave. El deudor solo confirma o ajusta.)*

### N3 — Aversión a la pérdida verídica + framing % (S2, solo con dato real)
```
Sr./Sra. {nombre}, ponerse al día esta semana le evita que se sigan sumando los
intereses de mora, que crecen cada día. Pagando ahora se ahorra el {X}% de esos intereses.
Le dejo el valor cargado: {linkPago}
```
*(Palancas: aversión a la pérdida, framing %. **Requiere** que `X%` y "crecen cada día" sean verificables. Si no hay alivio real → quitar la frase del %.)*

### N4 — Default de plan + anclaje (S3, plan en 2 cuotas)
```
Sr./Sra. {nombre}, su saldo de {inmueble} es {saldoTotal}. Le dejo propuesto un plan
sencillo:
• {cuota1} el {fecha1}
• {cuota2} el {fecha2}
Son unos {desgloseSemanal} por semana. ¿Lo confirmamos así o lo ajustamos a su fecha?
{linkPago}
```
*(Palancas: default, anclaje (total→cuota→semanal), ease framing. Sobre cifras reales del contrato.)*

### N5 — Implementation intention "si-entonces" (cierre de compromiso, cualquier etapa)
```
Perfecto, Sr./Sra. {nombre}. Entonces el plan queda así: el {fechaPago}, cuando le
paguen, entra a este enlace y abona {monto}. {linkPago}
Le mando un recordatorio ese día en la mañana, ¿le parece?
```
*(Palancas: implementation intention, commitment device. Pasa el objeto-compromiso a `cobranza-ptp-compromisos`.)*

### N6 — Prueba social honesta (solo con cifra real de la cartera)
```
Sr./Sra. {nombre}, la mayoría de inquilinos en su misma situación lo resuelve con un
plan corto de dos cuotas; es lo más común y rápido. ¿Quiere que se lo deje listo?
{linkPago}
```
*(Palanca: prueba social. **Solo** si "la mayoría… dos cuotas" es verdad y verificable. Si no hay dato → usar N4 sin la frase social.)*

### N7 — Fresh start (reenganche / inicio de mes/semana)
```
Sr./Sra. {nombre}, arranquemos {mes} al día. Si dejamos esto resuelto hoy, empieza
el mes tranquilo y sin que la cuenta siga corriendo. Le dejo el enlace listo: {linkPago}
```
*(Palancas: fresh start, sesgo del presente, fricción cero. Útil tras silencio o PTP rota.)*

### N8 — Sesgo del presente: micro-abono hoy (postergación)
```
Sr./Sra. {nombre}, no tiene que resolver todo de una. Empecemos con un primer abono
pequeño hoy mismo y vamos avanzando. ¿Le parece {abonoMin} para arrancar? {linkPago}
```
*(Palancas: incremental (Diamond), acción inmediata, fricción cero. Enruta a `planes-pago-hardship`.)*

### N9 — Segundo toque (día siguiente o día del compromiso, ángulo distinto)
```
Sr./Sra. {nombre}, le recuerdo el pago del arriendo de {inmueble}: {monto}. Hoy es el
día que habíamos hablado. Queda al día con un clic 👉 {linkPago}
```
*(Mismo CTA y link que el primer toque, **ángulo distinto** (recordatorio del compromiso, no repetición literal). Respeta 1/día, mismo canal, dentro de horario.)*

### N10 — Encuadre sobrio y factual (S4, sin nudges de presión)
```
Sr./Sra. {nombre}, según el contrato firmado, el canon de {mes} de {inmueble} es {monto},
más los días de mora. Resolverlo directamente es más rápido y económico para ambos.
Le dejo el valor cargado para ponerse al día hoy: {linkPago}
```
*(Palancas: criterios objetivos (contrato), BATNA como información neutra, fricción cero. **Sin** escasez/urgencia. Cualquier mención de pasos legales/centrales se escala a humano, no se "encuadra".)*

### N11 — Voz: encuadre conductual en llamada (S2–S3)
```
"Sr./Sra. {nombre}, para que le quede fácil: le puedo dejar el plan en dos cuotas, la
primera el día que le cae la quincena. Apenas colguemos le envío el enlace con el valor
ya cargado, así lo hace de una. ¿Le sirve que lo dejemos así?"
```
*(Palancas: default, mental accounting, fricción cero (link tras la llamada), si-entonces. Pasa a `cobranza-script-voz` para entonación calmada.)*

## Inputs

```yaml
intencionMensaje:                  # producida por la skill conversacional/dispatcher
  proposito: recordatorio|plan|ptp|reenganche|preaviso
  etapa: S0|S1|S2|S3|S4|S5
deudor:
  nombre: string
  arquetipo: olvido|no-quiere|hardship|crisis   # de segmentacion-cadencia
  fechaIngreso: date|null         # quincena/nómina, para mental accounting
deuda:
  monto: COP
  saldoTotal: COP
  inmueble: string
  mes/periodo: string
  interesMoraCorre: bool          # ¿la mora realmente crece? (para aversión a la pérdida)
oferta:                           # si aplica (de negociacion/planes-pago-hardship)
  cuotas: [{ valor, fecha }]
  abonoMin: COP
  alivioMoraPct: number|null      # SOLO si hay alivio real con vencimiento real
  vencimientoAlivio: date|null
pago:
  linkPago: url                   # con monto precargado (obligatorio para palanca #1)
  mediosDisponibles: [PSE|Nequi|tarjeta|...]
pruebaSocial:
  cifraRealCartera: string|null   # SOLO si verificable; si null → no usar nudge social
contexto:
  primerToque: bool
  fechaCompromiso: date|null      # para segundo toque y si-entonces
  canal: whatsapp|voz
politica:
  matrizAcuerdosEstandar: {...}   # qué oferta es "dentro de matriz"
```

## Outputs / enrutamiento

Esta skill **no emite de cara al deudor**; entrega una **decisión de encuadre** que se inyecta en el render.

- **Decisión de encuadre** → `cobranza-tono-whatsapp` o `cobranza-script-voz` (renderizan a español colombiano con los nudges aplicados).
- **Todo borrador encuadrado** → `cobranza-compliance-guardrails.validateMessage()` antes de enviar. Si `block` (p.ej. afirmación no verificable, prueba social no sustentada) → **regenerar** quitando el nudge ofensor.
- **Si una palanca requiere un factor no verificable** (alivio sin vencimiento real, cifra social inexistente, consecuencia que no procede) → **descartar ese nudge**, registrar el motivo, y encuadrar sin él.
- **Segundo toque** → `cobranza-segmentacion-cadencia` / scheduler para programarlo (día siguiente o día del compromiso), pasando por `canContact()` (1/día, horario, canal).
- **Cierre con si-entonces / compromiso** → `cobranza-ptp-compromisos` (captura PTP estructurada + recordatorio pre-fecha).
- **Micro-abono / plan** → `cobranza-planes-pago-hardship` (si el deudor pide o califica para hardship).
- **Acción de alto impacto detectada** (reporte, S5, condonación) → **no se encuadra**: `requiresHumanReview()` → cola humana.
- **Todos los nudges aplicados** → `cobranza-metricas-experimentacion` para A/B testear el lift real (champion/challenger con holdout) y atribuir conversión por palanca/plantilla/etapa.

## Qué NUNCA hacer

- ❌ Aplicar un nudge sobre un **dato inventado**: escasez sin vencimiento real, prueba social fabricada ("el 95% ya pagó"), aversión a la pérdida sobre una consecuencia que no procede.
- ❌ Usar **urgencia/escasez fabricada**: "última oportunidad", "solo hoy", "antes de que sea tarde", plazos inventados. (Ley 1480 + Ley 2300.)
- ❌ Inventar o exagerar **consecuencias legales/crediticias** para "framing de pérdida": amenaza de embargo, demanda inminente, o reporte a centrales sin el gate G cumplido y aprobado por humano.
- ❌ **Moralizar / sermonear / shaming**: "sea responsable", "no sea irresponsable", "todos pagan menos usted". Falla empíricamente **y** roza el lenguaje denigrante.
- ❌ Construir framing/mental accounting **preguntando el motivo** de la mora ("¿por qué no pagó?"). (Ley 2300, Art. 7.)
- ❌ Usar el "segundo toque potente" como excusa para **más de 1 contacto/día** o **multicanal en la semana** tras contacto directo.
- ❌ **Apilar muchos nudges** en un solo mensaje (>2 de encuadre): sobrecarga al deudor estresado y se siente manipulador. La simplicidad ES la palanca.
- ❌ Omitir el **link de pago con monto precargado**: es la palanca #1; un mensaje persuasivo sin pago fácil desperdicia el encuadre.
- ❌ Encuadrar para hacer **más persuasiva** una acción de alto impacto (reporte, S5, condonación): eso se **escala** a humano, no se optimiza.
- ❌ "Guilt nudges" o cualquier táctica del catálogo excluido (doc `05` §9), aunque suban la conversión.

## Métricas que mueve

(instrumentadas por `cobranza-metricas-experimentacion`)

- **Cure rate / liquidation rate** — efecto directo del encuadre + fricción cero en mora temprana (palanca de mayor ROI en S0–S1).
- **Roll rate** ↓ — prevención temprana bien encuadrada evita el paso de bucket (PNAS: −0.42 p.p. moras a 60 días).
- **CTR del link de pago** — proxy directo de la palanca #1 (fricción) y del ease framing.
- **% auto-resuelto sin humano** — sube cuando el self-cure es fácil y el encuadre claro.
- **PTP-kept rate** — sube con implementation intentions ("si-entonces") y commitment devices.
- **Lift por palanca (A/B con holdout)** — qué nudge convierte de verdad en arriendo residencial colombiano (las cifras US/UK son **hipótesis a validar localmente**).
- **Tasa de opt-out/quejas** — debe **bajar** o mantenerse: si sube, el encuadre se está sintiendo agresivo/manipulador → revisar densidad de nudges y honestidad.

## Fuentes

**Docs de research primarios:**
- `02-negociacion-persuasion.md` — §5 (economía conductual del repago: evidencia macro PNAS, sesgos y palancas, implicaciones de diseño), §1.4–1.5, §3 (Cialdini detective), §4 (Diamond incremental/intangibles).
- `01-estrategia-global-digital.md` — §6 (las 7 tácticas conductuales honestas + filtro ético), §5 (self-cure / fricción / pay-by-link), §3.1 (prevención S0 = mayor ROI), §9 (reconciliación legal), §11 (excluidas).
- Refuerzo de tono/encuadre: `04-tono-mensajeria.md` §8 (loss-aversion/urgencia/prueba social solo si verdaderas), §3.3 (link precargado).

**Evidencia citada en los docs (tier-1 priorizada):**
- **PNAS 2025** — *Behavioral nudges prevent loan delinquencies at scale* (experimento de 12.77M–13M personas): segundo toque ~tan potente como el inicial; **% > pesos** (−0.14 p.p.); repetir las mismas 2 acciones gana. https://www.pnas.org/doi/10.1073/pnas.2416708122
- **ScienceDirect** — *Nudging debtors with non-performing loans* (3 experimentos, 32.000 deudores): "solo recordar" tiene efecto pequeño → el volumen no es la palanca.
- **Saulitis 2024 (PMC)** — cobranza hospitalaria: personalizado mejora pago; prosocial/moral genérico falla.
- **TrueAccord / PayNearMe / REPAY** — self-cure ~96–98% sin humano; pay-by-link de 1 clic mejora cure rates (confianza media — proveedores).
- **Symend** — 7 tácticas conductuales + sesgo de simplicidad (54% quiere soluciones a su medida) (confianza media).
- **McKinsey** — *Behavioral insights and innovative treatments in collections* (framing de pérdida ~2× efectivo).

**Libros / referencia (doc `06`):**
- **Nudge (Final Edition)** — Thaler & Sunstein (defaults, simplificación, arquitectura de decisión honesta).
- **Thinking, Fast and Slow** — Kahneman (aversión a la pérdida, anclaje).
- **Influence + Pre-Suasion** — Cialdini (prueba social/escasez en modo "detective").
- **Switch** — Heath (fresh start). **Predictably Irrational** — Ariely. Gollwitzer — implementation intentions (if-then).
- **OECD — Behavioural Economics & Financial Consumer Protection** — distingue el nudge legítimo de la manipulación (ancla la regla de honestidad radical de esta skill).

**Marco legal (heredado de `cobranza-compliance-guardrails`):**
- Ley 2300/2023 (horario, frecuencia, terceros, motivo, conducta); Ley 1480/2011 Estatuto del Consumidor (info veraz/no engañosa — base del filtro "detective"); Ley 1581/2012 Habeas Data; T-323/2024 (human-in-the-loop).

---

> *Skill de capa de encuadre. Optimiza, no decide lo de alto impacto. Toda palanca pasa el gate "detective" (¿el factor existe de verdad?) y luego `validateMessage()`. Las cifras de lift son hipótesis a validar localmente vía champion/challenger. No es asesoría legal; validar con counsel antes de producción. Revisar junto a `cobranza-compliance-guardrails` cada 6 meses.*
