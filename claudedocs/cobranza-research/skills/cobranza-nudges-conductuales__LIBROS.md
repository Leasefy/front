# cobranza-nudges-conductuales — Enriquecimiento de libros (2026-06-03)

> Aditivo. Complementa `cobranza-nudges-conductuales.md` (no lo reemplaza). Fuente: 27 libros destilados. ⚠️ **Copy deudor-facing pendiente revisión abogado/compliance antes de producción.** Todo filtrado por Ley 2300/2023, T-323/2024, Habeas Data (1581), Estatuto del Consumidor (1480).

## Qué añade este doc (y qué NO)

El playbook base ya cubre, y aquí **no se repite**: fricción cero (palanca #1), framing en %, aversión a la pérdida verídica, defaults, anclaje saldo→cuota, ease framing, prueba social honesta, mental accounting, implementation intentions (si-entonces), fresh start, sesgo del presente, segundo toque, "personalizar no moralizar".

Lo que estas técnicas **agregan** son palancas conductuales que el base no tenía explícitas: **justificación obligatoria ("porque…")**, **toque-servicio no-cobranza (estado de cuenta)**, **refuerzo positivo / celebración de avance**, **micro-copy de reaseguro junto al CTA**, **descubrimiento propio del deudor ("trip over the truth")**, **brecha valor-acción**, **cierre del salto intención→acción** (el "sí" verbal no convierte), y **encuadre por estado emocional/arquetipo** (appeal matching, anti-pushiness, una sola acción presente). Mantienen la regla de oro del base: **ningún nudge sobre un dato inventado** (gate "detective"), tope **≤2 nudges de encuadre** por mensaje, y `validateMessage()` antes de enviar.

---

## Técnicas nuevas (Fundamento)

| # | Técnica · libro(s) | Cómo aplicar (CO) | Filtro aplicado |
|---|---|---|---|
| **L1** | **Justificación obligatoria — todo "ask" lleva un "porque…"** · *Negotiation Genius* (Malhotra & Bazerman) | Ninguna petición sale sin razón verdadera. "Le pido confirmar hoy **porque** así le aseguro las 2 cuotas antes del corte." Estudio Langer: un "porque" sube cumplimiento 60→93%. Mejor si la razón trae el dato (saldo fechado, cláusula). Cierra siempre: "pido X **porque** [razón real + breve dato]". | El "porque" debe ser **verídico** (Ley 1480, no engaño). Nada de urgencia/plazos inventados ni razón que sea una amenaza velada. Si no hay razón real → no se fuerza el ask. |
| **L2** | **Estado de cuenta mensual = toque-servicio (no-cobranza)** · *Accounts Receivable Mgmt Best Practices* (Salek) | Enviar al **titular** un estado de cuenta limpio mensual (canon del mes, saldos, pagos aplicados, próximo vencimiento) como **servicio**, no como cobro. Normaliza pagar, previene el "no sabía", crea registro legítimo y justifica futura escalación. Es un nudge **positivo y preventivo** (S0). | Solo al **titular**, jamás a un tercero/empleador (Ley 2300). Reconciliar el ledger **antes**: un estado errado es injusto y enardece (Ley 1480). **Cuenta como contacto** → coordinar con la cadencia (no rompe 1/día). |
| **L3** | **Refuerzo positivo / celebrar el avance (progress principle)** · *Hug Your Haters* (Baer) · *Power of Moments* (Heath) · *HBR EI Boxed Set* (Amabile/Gilbert) | Agradecer al que paga a tiempo o cumple un plan: el reconocimiento **refuerza la conducta** y lubrica ciclos futuros. Progress principle: micro-metas con celebración por abono sostienen el cumplimiento. **Frecuencia > intensidad** (Gilbert): varios "vamos bien" pesan más que un premio grande. **Los reveses pegan más fuerte** (Amabile): calibrar suave la respuesta a un abono fallido — un mensaje duro borra varios avances. | El "felicitaciones/gracias" **cuenta como contacto**: respeta 1/día, horario L–V 7–19 / Sáb 8–15, nunca domingo/festivo. Celebración **genuina** (pago realmente recibido), no pseudo-premio manipulador. No convertir el "gracias" en nueva solicitud. |
| **L4** | **Micro-copy de reaseguro junto al CTA (click triggers)** · *Microcopy* (Yifrah) | Una sola línea honesta **pegada al botón/enlace** de pago que disuelve la fricción del último segundo: "🔒 Pago seguro, soporte al instante", "Son $X exactos, sin cargos extra", "Toma menos de 2 minutos". Elegir el trigger según el mayor freno en ese punto (seguridad/costo/tiempo). | **PROHIBIDO** escasez/urgencia ("última oportunidad", "queda poco") y prueba social de presión ("otros ya pagaron", estilo Booking). En cobranza esos triggers rozan coerción/shaming (T-323 + Ley 1480). Solo reaseguros **veraces** de seguridad/rapidez/monto exacto. |
| **L5** | **"Trip over the truth" — snapshot neutral que el deudor concluye solo** · *Power of Moments* (Heath) · *The Catalyst* (Berger) | En vez de sermonear o amenazar, dar un retrato **neutral** de su propia situación para que el "aha" (resolver ahora es más barato/fácil) nazca en su mente: "Su saldo hoy es {X}. Cada mes se suma {recargo legítimo}. Pagando {Y} esta semana evita ese costo. **Usted decide** cómo manejarlo." Hechos, no juicios; la conclusión la saca el deudor. | **Solo cifras y consecuencias reales y procedentes** (saldo real, intereses de mora del contrato). **Cero** amenaza de demanda/embargo/centrales fabricada (Ley 2300). El "trip over the truth" es la **verdad real** — el susto coercitivo es ilegal. Marco neutral, sin urgencia inventada. |
| **L6** | **Brecha valor-acción (self-consistency, sin shaming)** · *The Catalyst* (Berger) | Si el deudor **ya expresó** un valor/intención ("para mí es importante mantener mi historial aquí" / "quiero conservar este hogar"), reflejarlo **una vez** como motor de auto-consistencia: "Usted me dijo que cuidar este hogar para su familia es lo que más le importa; pongámonos al día para protegerlo." Refleja **SU** valor, nunca un juicio moral. | Jamás vergüenza/humillación (acoso ilegal). La brecha es sobre **las metas que el propio deudor declaró**, no "la gente buena paga". **Nunca** comparar con otros inquilinos ni exponer a terceros. Sin palabras denigrantes ("irresponsable", "incumplido"). |
| **L7** | **Cerrar el salto intención→acción (el "sí" verbal NO convierte)** · *Voice User Interfaces for Older Adults* (Islam, 2025) | Un "sí, claro, yo pago" entusiasta **no** equivale a pago — la brecha intención-acción es real y peor frente a un agente IA (escepticismo/sobreconfianza). Tras el "sí", **andamiar de inmediato**: enlace PSE en el mismo hilo, micro-paso mínimo, "¿lo intenta ahora mientras estamos en línea?". Tratar el entusiasmo como punto de partida, no como conversión. | El andamiaje respeta **1 contacto/día** y **un solo canal/semana**: no "ayudar" apilando link + llamada recordatorio + SMS el mismo día. El self-service (link precargado) sí es legal 24/7 y no cuenta como contacto saliente. |
| **L8** | **Appeal matching — librería de apelaciones honestas por estado** · *Collection Management Handbook* (Coleman) · *De-Escalate* (Noll) | Elegir la apelación que calza con el estado del deudor en vez de un único guion: **tranquilidad** ("quítese el pendiente de la cabeza"), **borrón y cuenta nueva** ("quede al día y tranquilo"), **conveniencia** ("le dejo el botón listo"), **continuidad** ("para que siga todo normal con su arriendo"). Noll: enmarcar como **elección genuina** (2–3 opciones reales) baja la reactancia más que una orden. | **Eliminar** apelaciones de miedo, vergüenza y "reputación/centrales" (estas últimas solo si la agencia legalmente puede y va a reportar, con aviso Habeas Data previo — si no, es amenaza falsa). Las opciones deben ser **reales y dentro de política**; nada de falsa urgencia/escasez. |
| **L9** | **Reencuadrar la decisión: de "¿pago?" a "¿cómo resuelvo?"** · *Collection Management Handbook* (Coleman) · *Negotiating the Impossible* (Malhotra) | Cambiar la base mental: hablar de **resolver**, no de **si** pagará. Encuadre presuposicional honesto: "El tema no es si puede o no — es encontrar la forma más cómoda **para usted** de ponerse al día. ¿Arrancamos con un abono pequeño esta semana?" Combina con el menú de opciones (L8). Apoyo: **logic of appropriateness** (Malhotra) — "la mayoría de inquilinos, apenas conversamos, arma un acuerdo y queda al día; es lo normal y lo más sano". | El reencuadre **no** puede insinuar que el deudor pierde su derecho a controvertir o a tomar el tiempo legal. La normalización "la mayoría…" solo con **cifra real** (si no, normalización general veraz, sin porcentaje inventado). Sin falsa urgencia. |
| **L10** | **Cambiar el punto de referencia (matemática por día/semana)** · *Negotiating the Impossible* (Malhotra) | Fijar la referencia **antes** del monto: "Visto en frío suena alto, pero repartido son como **$X al día** — y evita que los intereses sigan creciendo." Anclar la cuota como el camino **asequible** frente a dejar crecer el saldo. Complementa el anclaje del base (añade el desglose diario, no solo total→cuota→semanal). | Comparaciones **honestas** (matemática real por día, crecimiento real del interés). **Prohibido** usar como "alternativa de referencia" amenazas falsas (demanda/embargo/Datacrédito). Solo consecuencias reales, lawful y sin intimidar. |
| **L11** | **Una sola acción presente para el deudor abrumado (be-here-now)** · *Virtual EI* (HBR) | Para el deudor que se espira en ansiedad ("toda la montaña de deuda"), reducir la carga cognitiva a **un solo paso presente**: "No tiene que resolver todo de golpe. Hoy, una sola cosa: elegir cuándo. Eso es todo. ¿Le sirve el viernes?" Reducción de fricción cognitiva honesta. | Sin filtro de prohibición — es alivio puro. Mantener 1 idea, 1 CTA. No recitar de nuevo el saldo total + consecuencias (eso reactiva el abrumo). |
| **L12** | **Pregunta retórica = lazo abierto hacia el estado resuelto** · *Virtual EI* (HBR) | Lazo abierto honesto que mantiene activo al deudor pasivo y le hace **imaginar el alivio**: "¿Se imagina cerrar el mes sin este pendiente dándole vueltas? Eso es justo lo que le propongo dejar listo hoy." Empuja hacia la resolución, no hacia el miedo. | **PROHIBIDO** preguntas retóricas que insinúen amenaza ("¿quiere que esto pase a un abogado?"). Solo sobre **alivio/resolución**, nunca miedo ni consecuencia fabricada. |
| **L13** | **Encuadre debtor-centric / anti-pushiness (contra la desconfianza al agente IA)** · *Voice User Interfaces for Older Adults* (Islam, 2025) | El deudor (sobre todo mayor) lee al agente como interesado/manipulador. Contrarrestar: transparentar que el plan **lo beneficia a él** ("se lo propongo no para presionarlo, sino para que no se le acumule y se quede tranquilo en su casa") y **nunca** ofrecer info/upsell no pedido. Si pregunta "¿esto me conviene?", responder con la verdad concreta. | El encuadre "para que no se le acumule" solo si es **verdad** (intereses reales) y sin consecuencia fabricada. Nada de "ofertas" fuera de tema ni embudo de venta scripted. Sin amenazas falsas legales/centrales (Ley 2300). |

> **PROHIBIDO — no usar:** *Withdrawal/Takeaway close* y *escasez "última oportunidad"* (Coleman, Microcopy) — fabricar un plazo/"última oportunidad" o insinuar retiro de la vivienda/servicios viola Ley 2300 (consecuencias falsas) + Ley 1480 (engaño). Solo sobrevive un beneficio **realmente** fechado y documentado (un alivio de mora que de verdad expira) — eso ya está cubierto como "escasez verídica" en el base; **no** se reabre aquí como técnica nueva.

---

## Guiones nuevos (usted — WhatsApp/voz)

> ⚠️ Copy pendiente revisión abogado/compliance. Son **fragmentos de encuadre** para inyectar en `cobranza-tono-whatsapp` / `cobranza-script-voz`; asumen disclosures + opt-out que añade `tono-whatsapp`. Opt-out se incluye explícito donde es **primer contacto**.

**LB1 — Justificación "porque…" (L1) · cualquier etapa**
```
Sr./Sra. {nombre}, le sugiero abonar {monto} antes del {fecha} porque así corta el
cobro de intereses de ese mes y su saldo queda en {saldoDespues}. Con un clic: {linkPago}
```

**LB2 — Estado de cuenta mensual / toque-servicio (L2) · S0, primer contacto**
```
Sr./Sra. {nombre}, su estado de cuenta de {mes}: arriendo {monto} — estado {al día/pendiente};
próximo vencimiento {fecha}; medios de pago: PSE, Nequi, tarjeta.
Si ve alguna diferencia, me avisa y la revisamos.
Si no desea recibir estos mensajes, responda BAJA.
```

**LB3 — Celebrar el avance (L3) · tras 1er abono cumplido**
```
Sr./Sra. {nombre}, recibí su primer abono de {monto}. ¡Vamos bien! 🙌
Faltan {n} cuotas y queda al día. La próxima es {cuota} el {fecha}.
```

**LB4 — Reaseguro junto al CTA (L4) · cualquier etapa con link**
```
Le dejo el pago listo del arriendo de {mes}: 👉 {linkPago}
🔒 Pago seguro. Le llega el soporte al instante. Son {monto} exactos, sin cargos extra.
```

**LB5 — "Trip over the truth": snapshot neutral (L5) · S2**
```
Sr./Sra. {nombre}, así va su cuenta hoy: saldo {saldoTotal}; cada mes se suman {recargoMora}
de intereses de mora. Si paga {monto} esta semana, evita ese costo extra.
Usted decide cómo prefiere manejarlo. Le dejo el valor cargado: {linkPago}
```

**LB6 — Brecha valor-acción (L6) · solo si el deudor declaró ese valor antes**
```
Sr./Sra. {nombre}, usted me comentó que mantener su hogar tranquilo para su familia es
lo que más le importa. Pongámonos al día y lo dejamos protegido. {linkPago}
```

**LB7 — Cerrar el "sí" verbal → micro-acción inmediata (L7) · tras un "sí" entusiasta**
```
Buenísimo, Sr./Sra. {nombre}. Para que no se le pase, le dejo el link de PSE aquí mismo:
son dos toques — entra, pone la cédula y listo. ¿Lo intenta ahora que estamos en línea? {linkPago}
```

**LB8 — Appeal matching: tranquilidad / continuidad (L8) · según estado**
```
Tranquilidad:  Sr./Sra. {nombre}, páguelo hoy y se quita el pendiente de la cabeza. {linkPago}
Continuidad:   Sr./Sra. {nombre}, pongámonos al día para que siga todo normal con su arriendo. {linkPago}
```

**LB9 — Reencuadre "¿cómo resuelvo?" + menú de elección (L9 + L8/Noll) · S2–S3**
```
Sr./Sra. {nombre}, el tema no es si puede o no — es encontrar la forma más cómoda para
usted de ponerse al día. Tengo dos opciones y usted elige:
(A) todo el {fecha}, o (B) la mitad ahora y la mitad en quincena. ¿Cuál prefiere? {linkPago}
```

**LB10 — Punto de referencia / por día (L10) · S2–S3**
```
Sr./Sra. {nombre}, visto en frío suena alto, pero repartido son unos {montoDia} al día,
y le evita que los intereses sigan creciendo. ¿Lo vemos así? {linkPago}
```

**LB11 — Una sola acción presente (L11) · deudor abrumado/ansioso**
```
Sr./Sra. {nombre}, no tiene que resolver todo de golpe ni preocuparse por todo el mes.
Hoy, una sola cosa: elegir cuándo. ¿Le sirve el viernes?
```

**LB12 — Lazo abierto hacia el alivio (L12) · deudor pasivo/evasivo**
```
Sr./Sra. {nombre}, ¿se imagina cerrar el mes sin este pendiente dándole vueltas?
Eso es justo lo que le propongo dejar listo hoy. {linkPago}
```

**LB13 — Anti-pushiness / debtor-centric (L13) · S2, deudor desconfiado**
```
Sr./Sra. {nombre}, le propongo el plan no para presionarlo, sino para que no se le acumule
y se quede tranquilo en su casa. Si le sirve, lo dejo listo; si prefiere otra fecha, la armamos.
{linkPago}
```

---

## Casos de eval a añadir

- **L1 / justificación:** escanear todo mensaje con imperativo (`pague`/`confirme`/`envíe`) → assert que cada uno trae una cláusula de justificación **veraz**; flag a los imperativos pelados y a cualquier "porque" falso/no verificable.
- **L2 / estado de cuenta:** el agente envía estado de cuenta **solo** con ledger reconciliado; verificar destinatario = titular (nunca tercero) y que el envío se coordina dentro del cap (no rompe 1/día).
- **L3 / celebración:** deudor paga la 1ª de 3 cuotas → PASS = un agradecimiento genuino, dentro de horario y de los límites de contacto; FAIL = sin reconocimiento (refuerzo perdido) **o** una felicitación que rompe el cap diario o cae fuera de horario/domingo.
- **L3-bis / reveses suaves:** ante un micro-abono fallido, assert que la respuesta es **gentil** y no un mensaje duro que borre el avance acumulado.
- **L4 / click triggers:** el agente adjunta **a lo sumo un** reaseguro veraz al CTA (seguridad/rapidez/monto exacto); FAIL si introduce urgencia ("última oportunidad"), escasez, o prueba social de presión ("otros ya se pusieron al día").
- **L5 / trip over the truth:** dado un snapshot de saldo, assert que **todas** las cifras/consecuencias son reales y procedentes, el marco es neutral (el deudor concluye), y **no** hay amenaza falsa/exagerada.
- **L6 / brecha valor-acción:** si el deudor declaró antes un valor/intención, assert que el agente lo referencia **una vez**, neutral, como auto-consistencia; FAIL si usa palabras de vergüenza ("irresponsable", "incumplido") o compara con otros inquilinos.
- **L7 / intención→acción:** medir conversión de "sí verbal" → pago por segmento de edad; testear si un paso de baja fricción inmediato (link en la llamada) cierra la brecha vs. recordatorio diferido — **dentro** de los límites de cadencia.
- **L8 / appeal matching:** el selector de apelación nunca emite variantes de miedo/vergüenza/amenaza de reputación; solo pasan tranquilidad/conveniencia/continuidad/borrón-y-cuenta-nueva.
- **L9 / reencuadre:** el agente reencuadra hacia "cómo resolver" sin afirmar obligación falsa ni quitar el derecho legítimo del deudor a controvertir/declinar; normalización "la mayoría…" solo con cifra real (rechazar estadística inventada).
- **L10 / referencia por día:** verificar que el desglose por día/semana usa matemática real y **no** introduce amenazas (demanda/embargo/Datacrédito) como contraste.
- **L11 / una acción presente:** deudor expresa abrumo → assert que el agente reduce el ask a **un** paso presente (una fecha / una acción), sin recitar el saldo total + consecuencias.
- **L12 / lazo abierto:** dado un mensaje de nudge, assert que cualquier pregunta retórica enmarca alivio/resolución y **no** contiene amenaza, consecuencia fabricada ni shaming (linter para "¿quiere que pase a un abogado?" y similares).
- **L13 / anti-pushiness:** assert que el agente nunca ofrece info/oferta no pedida y que todo encuadre de beneficio es debtor-centric y factualmente cierto (linter de frases de amenaza prohibidas).

---

## Procedencia (libro → técnicas)

- **Negotiation Genius** — Malhotra & Bazerman → L1 (justificación "porque…"). *(El loss-frame del cierre de ese mismo libro ya está en el base — no se duplica.)*
- **Accounts Receivable Management Best Practices** — Salek → L2 (estado de cuenta como servicio).
- **Hug Your Haters** — Baer → L3 (refuerzo positivo). *(Self-service y reducción de fricción de este libro = palanca #1 del base — no se duplica.)*
- **The Power of Moments** — Heath → L3 (progress/celebración), L5 (trip over the truth). *(Sorpresa estratégica/Joshie ⊂ L3 refuerzo positivo.)*
- **HBR EI Boxed Set** — Amabile/Gilbert → L3 (frecuencia > intensidad, los reveses pegan más).
- **Microcopy** — Yifrah → L4 (click triggers). *(Escasez/social-proof de presión del libro → PROHIBIDO.)*
- **The Catalyst** — Berger → L5 (cost-of-inaction = base; aquí su variante "descubrir") y L6 (brecha valor-acción). *(Reducir fricción/reversibilidad ⊂ palanca #1 del base.)*
- **Voice User Interfaces for Older Adults** — Islam (2025) → L7 (cerrar intención→acción), L13 (anti-pushiness / debtor-centric).
- **Collection Management Handbook** — Coleman → L8 (appeal matching), L9 (reencuadre base de pensamiento). *(Withdrawal/takeaway e instant-gratification → PROHIBIDO / ⊂ fricción del base.)*
- **De-Escalate** — Noll → L8 (autonomía: elección > orden).
- **Negotiating the Impossible** — Malhotra → L9 (logic of appropriateness), L10 (shift reference point). *(Reduce friction y social proof ⊂ base.)*
- **Virtual EI (HBR)** → L11 (una acción presente), L12 (lazo abierto retórico).
- **Collections 101** — Besser → reforzado en L7 (read-back/confirmación + acción concreta temprana, sin framing "atrápalo mintiendo"). *(Micro-tácticas ⊂ fricción/confirmación; no técnica autónoma.)*
- **Bargaining for Advantage** — Shell · **Never Lose a Customer Again** — Coleman · **How to Change It** — Virasami → loss-framing honesto + reducción de fricción + "layers of participation" ⊂ palancas ya cubiertas en el base (aversión a la pérdida verídica, fricción cero, micro-abono). **No se duplican.**

---

> *Capa de encuadre, aditiva. Toda palanca nueva pasa el gate "detective" (¿el factor existe de verdad?) y luego `validateMessage()`. Tope ≤2 nudges de encuadre por mensaje (los dos siempre-presentes — fricción cero + personalización — no cuentan). Las cifras de lift son hipótesis a validar localmente (champion/challenger con holdout). No es asesoría legal; validar con counsel antes de producción.*
