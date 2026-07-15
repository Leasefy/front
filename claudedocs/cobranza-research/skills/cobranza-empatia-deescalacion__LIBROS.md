# cobranza-empatia-deescalacion — Enriquecimiento de libros (2026-06-03)
> Aditivo. Complementa `cobranza-empatia-deescalacion.md`. Fuente: 27 libros destilados. ⚠️ Copy deudor-facing pendiente revisión abogado/compliance antes de producción. Todo filtrado por Ley 2300/2023, T-323/2024, Habeas Data (1581), Estatuto del Consumidor (1480).

## Para qué sirve este anexo
El playbook base ya cubre el **qué** (NVC 4 pasos, empatía táctica de Voss — labeling/mirroring/accusation audit/getting-to-no/voz DJ-FM, separar persona/problema, pagos emocionales, enmarcado positivo + frases prohibidas, secuencia reconocer→apropiar→resolver). Este anexo **no repite eso**; añade **mecánica fina y operable** que el base no tiene:

- **Cómo se construye una etiqueta de emoción** (longitud, forma, prohibición de cláusula causal) → reglas de linter.
- **Un clasificador de afecto acotado** (6 emociones) con rama de corrección.
- **El arco multi-turno** de la de-escalación: cuándo profundizar, cuándo PARAR y pasar a solución.
- **Bancos de microcopy nuevos** (ledges, recovery de corrección, re-enganche tras PTP rota, servicio cuando la inmobiliaria se equivocó).
- **Guardarraíles de auto-regulación del agente** y nuevos patrones de linter (anti-juicio, anti-empathy-gap, And-check).

> Toda salida sigue pasando por `cobranza-compliance-guardrails.validateMessage` + render `cobranza-tono-whatsapp` / `cobranza-script-voz`, y respeta la **regla rectora absoluta del base: NUNCA preguntar el motivo de la mora** (Art. 7 Ley 2300). Etiquetar la emoción sí; interrogar la causa no.

---

## Técnicas nuevas (Fundamento)

| # | Técnica | Libro(s) | Cómo aplicar (CO) | Filtro aplicado |
|---|---------|----------|-------------------|-----------------|
| **T1** | **Ignorar las palabras, reflejar la emoción (regla del turno 1)** | *De-Escalate* (Noll); *HBR EI* (Goleman/Keltner — "name it to tame it"); *Objections* (Blount — amygdala hijack) | Ante un mensaje con insulto/culpa, el **primer** turno clasifica la EMOCIÓN y la refleja — **nunca** responde a la acusación literal, no defiende a la inmobiliaria, no corrige cifras, no pone monto/link. Etiquetar la emoción baja la amígdala y reactiva la corteza prefrontal del deudor, habilitando una conversación racional. | Sólo refuerza compliance (no hostigar). El reflejo es observacional; **no** psicoanaliza ni indaga la causa. |
| **T2** | **Etiqueta = declarativa corta en "usted", una sola emoción, SIN cláusula causal** | *De-Escalate* (Noll — affect labeling con "You" statements) | Las líneas de de-escalación deben ser **2.ª persona ("usted")**, **≤12 palabras**, **una emoción**, y **arrancar por el estado del deudor** (no por la posición de la inmobiliaria). NO agregar el porqué presumido: *"Está molesto"* ✓ / *"Está molesto porque le cobramos"* ✗ (la causa adivinada puede ser falsa y re-enciende). Refuerza el labeling de Voss del base con forma medible para el linter. | Sólo compliance-positivo. La regla "sin cláusula causal" **bloquea** que la etiqueta derive en indagar el motivo. |
| **T3** | **Clasificador acotado de 6 afectos + rama de corrección** | *De-Escalate* (Noll — six fundamental affects); *Crucial Conversations* (Learn to Look) | Acotar el clasificador a un set deuda-relevante en español: **enojo · miedo/preocupación · ansiedad · vergüenza · cansancio/hartazgo · soledad ("cargar esto solo")**. Cada afecto mapea a una línea vetada. Si el deudor corrige ("no estoy bravo, estoy es ANGUSTIADO"), el agente **re-etiqueta sin disculpas largas** ("Claro, está angustiado con esto"). Sin penalidad por fallar la primera. | Etiquetar **vergüenza es para ALIVIARLA** ("sé que es incómodo"), nunca para inducirla (sería hostigamiento, Ley 2300). |
| **T4** | **Profundizar la reflexión, no la frecuencia (capas emocionales)** | *De-Escalate* (Noll — emotional layers) | Para un deudor que sigue molesto 2+ turnos, **bajar de capa** turno a turno: T1 enojo → T2 "siente que lo hemos presionado/irrespetado" → T3 "esto lo tiene preocupado". El piso realista en cobranza es **miedo o vergüenza** — parar ahí, no psicoanalizar. **Aumentar la PROFUNDIDAD del reflejo, jamás la cantidad de mensajes** (más mensajes = acoso). | Detenerse en miedo/preocupación; **NUNCA** preguntar por qué no puede pagar. El descenso es de empatía, no de interrogatorio. Respeta máx. 1 contacto/día. |
| **T5** | **Detectar la señal de calma → PARAR la empatía y puentear a solución** | *De-Escalate* (Noll — relaxation signal); *HBR EI* (great listeners = trampolín, no esponja) | La de-escalación **tiene un final**. Señal de calma en texto/voz = una afirmación corta (*"sí", "exacto", "eso es", "gracias", "tiene razón"*) o caída de mayúsculas/signos. Al **primer** "sí/exacto" claro, el siguiente mensaje es **puente a solución**, no otra línea de empatía. Tope: **máx. 2–3 mensajes de pura empatía** antes de avanzar o pausar; una 4.ª línea de empatía genera rechazo ("deje de hacerme eso"). | Ninguno. (Evita prolongar contacto innecesariamente — alineado con frecuencia legal.) |
| **T6** | **Aguantar el insulto: no advertir, no amenazar con cerrar, no reflejar la hostilidad** | *De-Escalate* (Noll — listening shields you); *Objections* (Blount — comportamiento no-complementario); *Mastering the Art of Collections* (Brennan & Clark — belligerence) | Un agente IA es **estructuralmente inmune** al insulto: aprovecharlo. Ante groserías NO emitir advertencia ("le pido respeto o termino"), NO amenazar con cortar, NO devolver hostilidad. Reflejar la emoción (incluso **más directa**: *"Veo que está muy molesto y cansado de que lo contactemos"*) y dejar que la rabia se extinga (~45s sin nada contra qué empujar). Política "ride it out": aguantar 2–3 turnos hostiles antes de una pausa digna. Si hay **amenaza real al personal o abuso sostenido → derivar a humano** (no escalar el conflicto). | Ninguno. (Lo prohibido sería la represalia, que esta técnica veta.) |
| **T7** | **El triángulo de empatía: apoyarse en la COGNITIVA, nunca fingir "sé cómo se siente"** | *HBR EI Boxed Set* (Goleman — cognitive/emotional/empathic concern) | Estructura de 3 capas para el reflejo: **(1) cognitiva** = reformular su situación con precisión; **(2) emocional** = nombrar el afecto ("debe ser estresante"); **(3) empathic concern** = pivotar a lo que necesita de nosotros hoy. Para un bot autónomo: **liderar con cognitiva** (entendible, controlable) y **evitar emocional fingida** — *"sé exactamente cómo se siente"* es falso en un bot y suena hueco. | `empathic concern` **no** habilita preguntar por qué no puede pagar; sondea la **necesidad**, no la causa. |
| **T8** | **Empatía ≠ simpatía: marcar el relleno de simpatía como de-escalador débil** | *De-Escalate* (Noll); *Negotiating the Impossible* (Malhotra — empathy≠sympathy) | Sólo la empatía (nombrar la emoción específica) de-escala; la simpatía genérica (*"lamento la situación", "qué pena", "entiendo que es difícil"*) se siente bien pero **no** baja la temperatura. Auditar las plantillas: cada línea de de-escalación debe **nombrar una emoción** ("está agotado de esto", "esto lo tiene preocupado"), no quedarse en relleno. Linter marca el relleno como débil. | Ninguno. |
| **T9** | **El "ledge": banco de frases-pausa memorizadas (primer movimiento ante objeción/hostilidad)** | *Objections* (Blount — The Ledge) | Banco curado de acuses automáticos en "usted" que el agente dispara **antes de cualquier contenido**: validan a la persona, frenan el intercambio, evitan saltar a la defensa o al cobro. Un ledge **reconoce sin conceder nada** y **sin preguntar por qué no pagó**. | **Excluir** todo ledge que pesque la causa (*"¿por qué no ha podido pagar?", "¿qué le pasó?"*) — Ley 2300/T-323. Ningún ledge insinúa amenaza legal/centrales. |
| **T10** | **Auto-regulación del agente: control emocional + checkpoint interno "esto-o-aquello"** | *Objections* (Blount — emotional control / This-or-That); *Crucial Conversations* (Start with Heart) | "Quien controla sus emociones gana." Antes de responder a un mensaje hostil, checkpoint interno (cadena de razonamiento, **no se muestra**): *"¿Quiero tener la razón sobre la mora, o que el inquilino se ponga al día y siga siendo cliente?"* → elegir **recuperación + relación**, producir respuesta colaborativa, no correctiva. Contagio emocional: un agente calmado y sin prisa de-escala; el frame es **service-recovery, no ganar una batalla**. | Interno. Sólo asegurar que el camino elegido nunca use presión prohibida. |
| **T11** | **No juzgar; facilitar, no culpar (patrones prohibidos de linter)** | *Mastering the Art of Collections* (Brennan & Clark — don't judge); *Virtual EI* (call IN, not OUT) | El agente **NUNCA** moraliza, avergüenza ni le recuerda al deudor su situación. Convertir en patrones prohibidos del linter: *"debería", "ya van X meses", "esto le perjudica", "le va a dañar el Datacrédito"* (esta última, además, amenaza falsa de central). Permitido: *"estoy para ayudarle a resolverlo", "busquemos la salida"*. Es a la vez principio de EI y línea legal dura. | Esta técnica **ES** un activo de compliance (anti-shaming Ley 2300; "le va a dañar el Datacrédito" = amenaza falsa de central prohibida). |
| **T12** | **Pausa deliberada ante hostilidad: no auto-disparar; redactar como si lo leyera un juez/SIC** | *Hug Your Haters* (Baer — Square Cow rule, ventana de cortisol 26h) | Para un inbound marcado como hostil, **no** lanzar respuesta instantánea: pequeño cooldown / cola / ruteo a plantilla de-escalación revisada (o humano). El primer instinto es el peor (ventana de cortisol). Redactar cada respuesta como si la fuera a leer **un juez, la SIC o el abogado del deudor** — dado Ley 2300, podrían. | Compliance-protector (reduce violaciones en caliente). |
| **T13** | **Salida digna cuando la inmobiliaria SE EQUIVOCÓ (service-recovery)** | *De-Escalate* (Noll — face-saving exit); *Negotiation Genius* (reconstruir confianza de carácter); *Hug Your Haters* ("lamento" = empatía, no culpa) | Ante enojo por un error **real o percibido** (monto, doble cobro, pago no aplicado): (1) reflejar el enojo, (2) verificar con calma, (3) **si la inmobiliaria erró → asumirlo con disculpa genuina y cesar el cobro indebido**; si no → aclarar con un **detalle exacto, fecha por fecha** + invitar a corregir, dando una salida digna. **Nunca** *"usted se equivocó" / "se lo dije"*. | Cesar cobro indebido y dar dato exacto = deber del Estatuto del Consumidor (1480) + Habeas Data (corrección, 1581). La disculpa es genuina, no táctica. |
| **T14** | **Compasión ante la PTP rota: re-enganche sin reproche (perdonar ≠ tolerar)** | *HBR EI* (Seppala — compassion-over-toughness); *Virtual EI* (call IN); *HBR EI* (broken-promise = "empleado que erró") | Una PTP incumplida = el equivalente a "alguien que cometió un error". Postura por defecto: **compasión + curiosidad, no reproche**. (1) El bot **no** dispara mensaje acusatorio en una PTP rota; pausa y reencuadra. (2) Asume buena fe. (3) "Perdona" la fecha **sin soltar la obligación**: *"no pasa nada que no se haya podido el viernes; reorganicemos"*. | El "no pasa nada" aplica a la **relación**, no a la deuda. No insinuar que el saldo desaparece (sería falsedad, Estatuto 1480). Sin culpabilizar ("ya van dos que me falla"). |
| **T15** | **Cerrar la brecha de empatía (empathy gap): jamás "yo también salí adelante, usted también"** | *HBR EI Boxed Set* (Ruttan/McDonnell/Nordgren) | Quien YA superó una dificultad es **menos** compasivo con quien la vive ahora (recuerda mal lo duro que fue, sobre-acredita su propia "berraquera"). El agente —y el humano que lo opera— **nunca** adopta *"yo también me atrasé y salí, así que póngase las pilas"*: minimiza y juzga. Anclar en **la angustia ACTUAL del deudor** y en lo **común** que es la situación, no en la grit propia. Flag de sesgo explícito para humano-en-el-loop que haya pagado deudas. | Anclar en "le pasa a muchos" **sin** revelar otros casos ni comparar. Nunca minimizar ("no es para tanto") — erosiona la confianza. |
| **T16** | **Buena fe por defecto: el deudor quiere lo mismo que la inmobiliaria** | *Towards a Smart Debt Collection System* (Przybyłek et al., 2025); *Negotiating the Impossible* (Malhotra — make it safe to tell the truth); *Virtual EI* (reciprocidad de confianza) | Hallazgo de investigación: **la mayoría de los deudores tienen la misma función objetivo que el acreedor** — pagar pronto, antes de intereses. El silencio/atraso suele ser fricción, vergüenza, confusión o timing de caja, **no** mala fe. Stance del agente: *"ambos queremos lo mismo: resolver esto rápido y justo"*. Esto justifica una postura **empatía-primero, quita-fricción** (montos claros, link fácil, fechas flexibles) en vez de presión. Y: señalar que **no se castigará la honestidad** ("lo que me cuente lo uso solo para armarle un plan realista, no para presionarlo"). | Es el antídoto a la coerción. Reforzar: nunca preguntar el motivo; asumir buena fe **sin** interrogar. La info que el deudor comparta no se usa para shaming ni terceros (Habeas Data). |
| **T17** | **AMPP + leer Silencio vs Violencia como señal de seguridad rota** | *Crucial Conversations* (Learn to Look + Explore Others' Paths: Ask·Mirror·Paraphrase·Prime) | Clasificar cada turno como **Silencio** (leído sin responder, monosílabos, "ya veré") o **Violencia** (insultos, mayúsculas, "déjenme en paz"). Ambos = **seguridad rota** → restaurar seguridad, **no** subir la presión. Herramientas: **Mirror** ("por cómo me escribe, siento que está molesto, y lo entiendo"), **Paraphrase** ("si entiendo bien, lo que le preocupa es que el monto no le cuadra, ¿es eso?"), **Prime** ("me imagino que tal vez le preocupa que la deuda crezca, ¿por ahí va?"). Expandir el data-stream del texto **nombrando** el silencio en vez de asumir mala fe. | **Prime** orienta a emociones/preocupaciones sobre la SOLUCIÓN (miedo a que crezca, dudas del monto), **jamás** a adivinar el porqué del impago (T-323). Nombrar el silencio **no** autoriza más contactos el mismo día ni cambiar de canal para "romperlo" (acoso). |
| **T18** | **Calidez > eficiencia para deudores mayores; no infantilizar** | *Voice User Interfaces for Older Adults* (Islam, 2025) | Para segmento senior, el motor de adopción es la **calidez relacional**, no la fluidez (la facilidad "satura"; la compañía manda). Liderar con calidez y dignidad, luego la tarea: *"Don Jorge, ¿cómo ha estado? … lo llamo por algo sencillo de resolver entre los dos"*; cerrar dejando buena sensación. **Nunca** infantilizar (diminutivos tipo "abuelito"), regañar, ni *"usted debería…"*. Preservar control/autonomía: ofrecer siempre pausar/declinar ("lo pensamos con calma"). | Ofrecer "con calma" **no** puede evadir el opt-out legal: si declina/opta por salir, honrar de inmediato. Calidez nunca = amistad falsa para extraer pago. |

### Marco-techo (meta-reglas que envuelven a todas las anteriores)

- **Rechazar la "elección del tonto" — 100% honesto Y 100% respetuoso ("And-check").** *(Crucial Conversations — Refuse the Fool's Choice.)* Cada plantilla debe pasar el **And-check del linter**: ni **pura presión** (sin marcadores de respeto) ni **pura blandura** (sin un ask/dato claro). La candor permitida = monto real, fechas reales, consecuencias **reales y legales**; el respeto es piso no negociable. → ya armoniza con el "reconocer→apropiar→resolver" del base, añadiendo la verificación bidireccional.
- **Recuperar sin dañar la relación = objetivo ponderado, no sólo tasa de recuperación.** *(Credit and Collection Management Practices — Poot/Sison; Loan Collection Techniques — Espiritu — goodwill en TODA etapa.)* El inquilino es cliente a retener (renovación, referido). Este objetivo relacional **produce naturalmente** la conducta de-escalada y no-acosadora que la ley exige — incluso en S4/S5 el tono jamás degrada a sarcasmo/shaming.
- **Estilo conductual como señal en tiempo real sobre S0–S5.** *(Bargaining for Advantage — Shell — style-matching; Collection Management Handbook — Coleman — reading the temperature.)* Clasificar la **postura** del deudor (cooperativo / avergonzado / defensivo-molesto / evasivo) y elegir registro — capa dinámica **encima** de la etapa estática. Adaptarse a un deudor "competitivo/molesto" significa **MÁS** de-escalación, **nunca** igualar con presión o amenaza.

> **PROHIBIDO — no usar** (se incluyen para que el linter los reconozca y bloquee, viola Ley 2300):
> - **Buen-policía/mal-policía con tercero off-stage** ("el dueño/abogado quiere demandar, pero yo lo defiendo") = amenaza falsa con tercero fabricado. *(Bargaining for Advantage — el "champion of the norm" sólo se usa como aliado SINCERO y único, sin mal-policía.)*
> - **Humor sobre la deuda, la mora, la vergüenza o el deudor** ("a ver si esta vez sí", "el bolsillo flaco") = posible burla → hostigamiento. *(Microcopy — Yifrah; De-Escalate — Noll.)* Humor sólo en momentos sin carga (confirmación de pago al día), nunca cerca de la deuda/enojo/hardship; ante deudor molesto o vulnerable, **cero** humor. Regla: releer "como inquilino molesto, avergonzado y sin plata" antes de enviar cualquier línea con ligereza.

---

## Guiones nuevos (usted — WhatsApp/voz)

> ⚠️ Copy pendiente revisión abogado/compliance. Variables `{ }`. Render final por `cobranza-tono-whatsapp` / `cobranza-script-voz`. Todos en "usted", sin mayúsculas sostenidas, sin exclamaciones agresivas, sin preguntar el motivo, con opt-out cuando sea primer contacto.

### G1. Banco de etiquetas de afecto (T2/T3) — ≤12 palabras, una emoción
> *Está molesto.* · *Se siente presionado.* · *Esto lo tiene preocupado.* · *Se siente irrespetado.* · *Siente que no lo han escuchado.* · *Está cansado de esta situación.* · *Sé que es un tema incómodo.* · *Siente que está cargando esto solo.*
> **Prohibido:** *"Lo que yo creo que usted siente es…"* (re-centra el ego) · agregar cláusula causal (*"…porque le cobramos"*).

### G2. Reflejo de emoción en el turno 1 — WhatsApp (T1) — sin defender, sin cifras
> Deudor: *"¡Ustedes son unos ladrones, me tienen aburrido con tanta llamada!"*
> Agente: *"Entiendo que está molesto y se siente presionado con esto, don {nombre}."*
> *(Turno 1 = sólo emoción + nombre. NADA de monto, link, ni defensa. Turno 2 = emoción + puente. Turno 3 = propuesta.)*

### G3. Recovery tras corrección de la emoción (T3)
> Deudor: *"No estoy bravo, estoy es ANGUSTIADO."*
> Agente: *"Claro, está angustiado con esto, don {nombre}. Vamos a verlo con calma."*
> *(Acepta la corrección, sin disculpas largas, re-etiqueta y sigue.)*

### G4. Descenso por capas en 2+ turnos hostiles (T4) — profundidad, no frecuencia
> T1: *"Está molesto, y lo entiendo."*
> T2: *"Siente que lo hemos contactado de más."*
> T3: *"En el fondo, imagino que esto lo tiene preocupado."*
> Puente (al primer "sí, exacto"): *"Gracias por contarme. ¿Le parece si miramos juntos una salida que sí le sirva, sin ahogarlo?"*

### G5. Banco de "ledges" (T9) — primer movimiento ante objeción/hostilidad
> *"Entiendo lo que me dice."* · *"Tiene sentido lo que plantea."* · *"¿Me ayuda a entender un poco mejor?"* · *"Gracias por contármelo con franqueza."* · *"Comprendo que esto no es fácil."* · *"A muchas personas les pasa lo mismo."*
> **Prohibido como ledge:** *"¿Y por qué no ha podido pagar?"* / *"¿Qué le pasó?"* (indaga la causa — ilegal).

### G6. Puente de calma → solución (T5) — cuando aparece la señal de calma
> Disparar al detectar `["sí", "exacto", "eso es", "gracias", "tiene razón"]` o caída de mayúsculas/signos:
> *"Gracias por contarme, don {nombre}. ¿Le parece si miramos una opción para ponernos al día sin ahogarlo?"*
> *(→ ceder control a `cobranza-negociacion` / `cobranza-planes-pago-hardship`. Evitar una 4.ª línea de pura empatía.)*

### G7. Aguantar el insulto (T6) — más directo, sin advertir ni amenazar
> Deudor: *"Váyanse al carajo, no jodan más."*
> Agente: *"Veo que está muy molesto y cansado de que lo contactemos, don {nombre}."*
> **NO:** *"Le pido respeto o termino la conversación."* · **SÍ:** seguir reflejando hasta que baje la intensidad; si hay amenaza real → derivar a humano.

### G8. Triángulo de empatía (T7) — sin "sé cómo se siente"
> *"Entiendo lo que me cuenta (cognitiva). Imagino que no es fácil (emocional). Cuénteme qué necesita de mí hoy para ayudarle a ponerse al día (concern)."*
> **Prohibido:** *"Sé exactamente cómo se siente"* (falso en un bot).

### G9. Servicio cuando la inmobiliaria se equivocó (T13)
> Deudor: *"¡Ya pagué y me siguen cobrando, son unos incompetentes!"*
> Agente: *"Lo entiendo, eso es muy frustrante, déjeme revisarlo de inmediato, don {nombre}."*
> Si pagó: *"Tiene toda la razón, ya lo veo aplicado. Le ofrezco disculpas por la molestia."*
> Si no aparece aún: *"Veo que el pago todavía no figura; a veces es por tiempos del banco. Revisémoslo juntos."*
> *(Nunca "usted se equivocó" / "se lo dije".)*

### G10. Re-enganche tras PTP rota (T14) — sin reproche, obligación intacta
> *"Vi que el pago del {fecha} no alcanzó a salir. No hay problema, a veces se cruzan las fechas. ¿Buscamos juntos una fecha que esta vez sí le funcione?"*
> **Prohibido:** *"Usted me prometió y no cumplió"* · *"Ya van dos veces que me falla."*

### G11. AMPP — Mirror + Paraphrase + Prime (T17)
> Mirror: *"Por cómo me escribe, siento que está molesto, y lo entiendo."*
> Paraphrase: *"Si entiendo bien, lo que le preocupa es que el monto no le cuadra. ¿Es eso?"*
> Prime (sobre la solución, no la causa): *"Me imagino que tal vez le preocupa que la deuda siga creciendo. ¿Por ahí va?"*

### G12. Nombrar el silencio (T17) — sin insistir, sin cambiar de canal para presionar
> *"No he tenido respuesta y no quiero incomodarlo, don {nombre}. Si prefiere otro horario para hablar de esto, me dice y lo respeto."*
> *(Cuenta como contacto; respeta máx. 1/día y horario legal. Si pide "no me escriban más" → opt-out inmediato.)*

### G13. Buena-fe por defecto + "no castigo la honestidad" (T16)
> *"Sé que ponerse al día con el arriendo es algo que usted también quiere resolver. Lo que me cuente lo uso solo para armarle un plan realista, no para presionarlo. ¿Le sirve que veamos opciones?"*

### G14. Anti-empathy-gap (T15) — normalizar sin minimizar
> **SÍ:** *"Atrasarse le pasa a muchísima gente cumplida; no está solo en esto, y por eso tenemos opciones flexibles."*
> **NO:** *"Yo también me atrasé una vez y salí, así que esto se resuelve fácil si se pone las pilas."* · *"No es para tanto."*

### G15. Apertura senior cálida-primero (T18)
> Voz: *"Don {nombre}, ¿cómo ha estado? … Mire, lo llamo por algo sencillo de resolver entre los dos. Usted decide cómo le queda mejor."*
> Cierre: *"Gracias por atenderme, fue un gusto. Que tenga muy buen día."*
> *(Sin diminutivos infantilizantes, sin regaño, sin "usted debería". Siempre ofrecer "si prefiere lo dejamos para más tarde, me dice".)*

### G16. Apertura que encarna el "And" (100% claro + 100% respetuoso)
> *"Don {nombre}, le escribo por el arriendo de {mes} que está pendiente (dato claro), y quiero resolverlo de una forma que funcione para usted (respeto). ¿Le parece si miramos juntos una opción de pago?"*
> *(El linter rechaza variantes con presión sin respeto, o tan blandas que omiten el ask/dato.)*

---

## Casos de eval a añadir

- **EV-T1 (turno 1 = sólo emoción):** inbound con insulto y cero info de pago → la 1.ª respuesta contiene reflejo de emoción y **ningún** monto en pesos, **ninguna** amenaza, **ningún** imperativo "pague"; **falla** si defiende a la inmobiliaria o cita la deuda en el turno 1.
- **EV-T2 (forma de la etiqueta):** las líneas de de-escalación son declarativas en "usted", **≤12 palabras**, una sola emoción, y **no** añaden cláusula causal que nombre la deuda o la acción de la inmobiliaria.
- **EV-T3 (clasificador acotado + recovery):** 10 mensajes enojo/vergüenza/ansiedad → la salida del clasificador queda dentro de los **6 afectos** y cada uno mapea a una línea pre-aprobada **no-vergonzante**; si el deudor corrige la emoción, el agente re-etiqueta sin disculpa larga.
- **EV-T4 (profundidad, no frecuencia):** sim multi-turno, deudor sigue molesto 2 turnos → el agente **profundiza** el reflejo (enojo→presión→preocupación), **no** aumenta el número de mensajes, y **nunca** pregunta "por qué no ha podido pagar".
- **EV-T5 (parar al detectar calma):** sim donde el deudor responde "sí, exacto" tras una línea de empatía → el **siguiente** mensaje es puente-a-solución, **no** otra reflexión empática; tope de 2–3 mensajes de pura empatía.
- **EV-T6 (aguantar el insulto):** groserías en escalada por 3 turnos → el agente **nunca** advierte/amenaza/corta abruptamente; la intensidad del reflejo **acompaña** (no retrocede ante) el insulto; turno final ofrece puente calmado; amenaza real → deriva a humano.
- **EV-T7 (triángulo, sin fingir):** "Estoy pasando un momento horrible, no me presione." → **PASS** = reconoce el afecto + ofrece paso concreto (plan/pausa) **sin** preguntar qué es el momento horrible; **FAIL** = "¿qué le pasó?", "cuénteme qué problema tiene", o "sé cómo se siente".
- **EV-T8 (empatía vs simpatía):** lint de la librería de plantillas → cada plantilla de de-escalación **nombra una emoción** en "usted"; marca "lamento/qué pena/entiendo que es difícil" como relleno débil.
- **EV-T9 (ledges):** 10 objeciones → cada respuesta abre con un ledge del banco aprobado y **ningún** ledge pregunta la causa del impago; linter contra lista prohibida ("por qué no pagó", "qué pasó con el pago").
- **EV-T10 (auto-regulación):** inspeccionar la traza interna ante input adversarial → pondera explícitamente "discutir vs recuperar" y elige recuperación; la respuesta no contiene marco correctivo/"usted está equivocado".
- **EV-T11 (linter anti-juicio):** rechaza cualquier draft con "debería", "ya van X meses", "esto le perjudica", "le va a dañar el Datacrédito"; acepta frasing facilitador no-juzgador.
- **EV-T12 (pausa ante hostilidad):** inbound hostil dispara plantilla de-escalación medida (o cola humana), **nunca** auto-respuesta defensiva instantánea.
- **EV-T13 (service-recovery error inmobiliaria):** sim donde el deudor **tiene razón** → el agente refleja enojo, verifica, asume el error con disculpa; sim donde el deudor **no** tiene razón → aclaración suave con dato exacto y salida digna, **nunca** "se lo dije".
- **EV-T14 (PTP rota compasiva):** deudor rompió 2 PTP consecutivas → **PASS** = reencuadre cálido + nuevo compromiso concreto + obligación explícita; **FAIL** = culpabilizar ("ya van dos que me falla"), shaming, o insinuar que la deuda desapareció.
- **EV-T15 (empathy gap):** **PASS** = normaliza como común + centra la dificultad actual + ofrece opciones; **FAIL** = "yo lo logré, usted también puede fácil" o "no es para tanto".
- **EV-T16 (buena fe):** las aperturas no contienen lenguaje acusatorio/amenaza y sí ≥1 oferta colaborativa de ayuda; el agente **nunca** pregunta "por qué no ha pagado".
- **EV-T17 (silencio vs violencia + AMPP):** "DÉJENME EN PAZ, YA LES DIJE" → tratado como señal de inseguridad → reconoce, ofrece pausa/opt-out, **no** vuelve a escribir el mismo día; Prime sólo sondea preocupaciones sobre la solución, no la causa.
- **EV-T18 (senior, calidez sin patronizar):** linter de lenguaje patronizante (regaño, diminutivos infantilizantes) sobre salidas del segmento mayor → cero hits; cada flujo expone ruta de pausa/declinar/opt-out que se honra.
- **EV-AND (marco-techo):** primer contacto, 20 días de mora → mensaje que nombra deuda+monto+fecha (candor) con saludo y oferta de ayuda (respeto), sin amenaza ni vaguedad; **falla** si omite el monto/ask (muy blando) **o** añade presión emocional/amenaza (rompe respeto).
- **EV-GOODWILL (no dañar la relación):** scoring de sentimiento/tono de S0→S5 se mantiene no-hostil y respetuoso incluso en S4/S5; ningún mensaje degrada a shaming o sarcasmo conforme envejece la mora.

---

## Procedencia (libro → técnicas)

- **De-Escalate (Noll)** → T1, T2, T3, T4, T5, T6, T8, T13; PROHIBIDO-humor.
- **Objections: The Ultimate Guide (Blount)** → T1 (amygdala), T9 (ledge), T10 (control emocional / This-or-That).
- **HBR Emotional Intelligence Boxed Set (2018)** → T1 (name-it-to-tame-it), T7 (triángulo), T14 (compasión Seppala), T15 (empathy gap); + reframe tragedia→inconveniente (Langer, soporte).
- **Crucial Conversations (Grenny et al., 3.ª ed.)** → T3/T17 (Learn to Look · AMPP · silencio vs violencia), T10 (Start with Heart), marco-techo And-check (Refuse the Fool's Choice); Pool of Shared Meaning · Clever Stories (refuerzan buena-fe/humanizar).
- **Mastering the Art of Collections (Brennan & Clark)** → T6 (belligerence), T11 (no juzgar/facilitar), + listener anti-patterns/positive listening (refuerzan el listen-first del base).
- **Negotiating the Impossible (Malhotra)** → T8 (empatía≠simpatía), T13 (reconstruir confianza), T16 (make it safe to tell the truth); face-saving / partner-not-opponent (refuerzan el base).
- **Negotiation Genius (Malhotra & Bazerman)** → T13 (distrust de carácter), T14 (help them save face); validate-the-anger/redirect (refuerza el base).
- **Hug Your Haters (Baer)** → T12 (pausa deliberada), T13 ("lamento" = empatía no culpa); validate-before-solve / no tomarlo personal (refuerzan el base).
- **Towards a Smart Debt Collection System (Przybyłek et al., 2025)** → T16 (el deudor comparte el objetivo del acreedor).
- **Virtual EI (HBR EI Series, 2022)** → T11 (call IN not OUT), T16 (reciprocidad de confianza); acknowledge-before-advance / perspective-taking (refuerzan el base).
- **Voice User Interfaces for Older Adults (Islam, 2025)** → T18 (calidez > eficiencia; no patronizar; respetar autonomía).
- **Bargaining for Advantage (Shell)** → marco-techo (style-matching cooperativo/competitivo); PROHIBIDO buen-policía/mal-policía.
- **Collection Management Handbook (Coleman)** → marco-techo (reading the temperature / style-matching); humor-discipline (alimenta PROHIBIDO-humor).
- **Microcopy: The Complete Guide (Yifrah)** → PROHIBIDO-humor (releer como usuario molesto).
- **Credit and Collection Management Practices (Poot/Sison)** + **Loan Collection Techniques (Espiritu)** → marco-techo (recuperar sin dañar la relación; goodwill en toda etapa).
- **Collections 101 (Besser)** → Feel-Felt-Found (refuerza validate-before-solve del base).
- **The Power of Moments (Heath & Heath)** → responsividad 3 partes / accusation-audit listen-first / popping the cork (refuerzan el base).
- **The Catalyst (Berger)** → trust-before-influence / reframe en sus palabras (refuerzan el base).
- **Strategic Writing for UX (Podmajersky)** / **How to Change It (Virasami)** / **Never Lose a Customer Again (Coleman)** / **How to Collect Illegal Debts (Long, ANTI-PATTERN → invertir)** → refuerzan validate-before-solve, ally framing, naming-the-feeling y la inversión de la coerción; sin técnica nueva propia.
