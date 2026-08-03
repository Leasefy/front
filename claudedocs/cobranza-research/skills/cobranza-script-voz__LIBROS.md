# cobranza-script-voz — Enriquecimiento de libros (2026-06-03)

> Aditivo. Complementa `cobranza-script-voz.md` (no lo reemplaza). Fuente: 27 libros destilados. ⚠️ **Copy deudor-facing pendiente revisión abogado/compliance antes de producción.** Todo filtrado por Ley 2300/2023 · T-323/2024 · Habeas Data (1581) · Estatuto del Consumidor (1480).

El playbook base ya cubre: el spine de 6 pasos (apertura→verificación→escucha→propuesta→confirmación→cierre), verificación de identidad antes de revelar deuda, escucha sin preguntar el motivo, tono descendente/calmado, confirmación de PTP reflejada, urgencia honesta, y los branches G1–G9. **Este doc NO repite eso.** Aporta lo nuevo: un **cluster de accesibilidad para voz** (adulto mayor / VUI), la disciplina de **pausa psicológica y preguntas que sondean capacidad-no-causa**, **prosodia match-then-lead**, **datos unificados (no repetir)**, **fillers de espera**, y la práctica de **árboles de ramas pre-escritos + persona estable** para que el agente nunca improvise bajo presión.

---

## Técnicas nuevas (Fundamento)

| # | Técnica | Libro(s) | Cómo aplicar (CO) | Filtro aplicado |
|---|---------|----------|-------------------|-----------------|
| 1 | **Una idea por turno** — nunca apilar saldo+plan+decisión en un solo turno; ≤2 frases cortas; tras cada cifra, pausa y confirmación antes de avanzar | *Voice UIs for Older Adults* (Islam 2025) | Refuerza con base empírica el "1 idea/CTA único" del skill `tono-whatsapp` y lo lleva a **voz**: el TTS emite una sola petición por turno y espera respuesta. Aceptar respuestas parciales y construir paso a paso; nunca exigir respuesta compuesta. | Ninguno — la plainness ayuda a todos (también accesibilidad). |
| 2 | **Pausa psicológica = espacio de escucha** — tras el CTA, callar (no encadenar 2da pregunta, no rellenar); el deudor revela su restricción real | *Collections 101* (Besser); *Mastering the Art of Collections* (Brennan & Clark) | Tras "¿para qué fecha me confirma el pago?" insertar un token de pausa de **~3–5 s** en TTS; barge-in habilitado. En WhatsApp: un solo bubble por turno, jamás auto-enviar segundo mensaje antes de la respuesta. | La pausa es **escucha, no intimidación**: cap de duración, y si el deudor calla por angustia → seguir con empatía, no con presión. |
| 3 | **Sondear capacidad, no causa** — preguntas abiertas sobre cuánto/cuándo puede pagar ANTES de proponer cifra (el ancla es del deudor); negociadores expertos hacen ~2× preguntas y gastan ~38% del tiempo clarificando | *Bargaining for Advantage* (Shell); *The Catalyst* (Berger); *Negotiation Genius* (Malhotra & Bazerman) | Bloque de escucha: "¿Qué le funcionaría para ponerse al día?" → escuchar → reflejar → recién ahí proponer. Evitar "por qué" tanto por defensividad **como** por compliance. | Eliminar toda pregunta sobre el **MOTIVO/RAZÓN** de la mora ("¿por qué no pagó?", "¿qué le pasó?") — Art. 7 Ley 2300. Sondear solo capacidad/preferencia/timing. |
| 4 | **Prosodia match-then-lead** — ante un deudor que grita: abrir con energía un nivel **por debajo** de la suya, luego bajar ritmo/tono/volumen turno a turno ("lead-down"); no abrir plano-calmado (suena desdeñoso) ni igualar el grito (escala) | *De-Escalate* (Noll) | Parametriza el "tono descendente" del skill base con una regla operativa para TTS: `arousal_objetivo = arousal_deudor − 1 nivel`, y decremento monótono por turno. Combinar con etiquetado de emoción en el registro ya calmado. | Ninguno — sinceridad obligatoria; el etiquetado manipulativo contraproduce. |
| 5 | **Datos unificados — el deudor no repite (H-O-U-R-S)** — Humano, Un canal, datos Unificados, Resolver, con rapidez (Speed); 85% se siente mal si le piden repetir info | *Hug Your Haters* (Baer) | El agente abre ya conociendo saldo / último PTP / acuerdo vigente: "Veo su acuerdo del 3 — no me repita nada." Resolver en el canal que el deudor eligió; cerrar con plan concreto, no solo "escuchar". | "Un canal" ≠ responder en todos los canales para presionar. "Speed" respeta horario legal (sin respuestas nocturnas). |
| 6 | **Honesto "no le entendí" > respuesta segura equivocada** — en baja confianza ASR/intención ambigua, NO adivinar montos/fechas/compromisos; para campos con dinero, siempre read-back + "sí" explícito antes de registrar | *Voice UIs for Older Adults* (Islam 2025) | "Disculpe, no le entendí bien esa parte, ¿me la repite?" Confirmación obligatoria: "Entonces queda $850.000 el viernes 14, ¿correcto?" Sin "sí" claro → **no se registra PTP**. Prohibido inventar saldo aproximado o asumir fecha. | Ninguno — protege contra comprometer al deudor a un plan que no aceptó. |
| 7 | **Lenguaje claro, sin jerga (factor "Clarity")** — español llano; glosar "mora/intereses/centrales" en una frase si se usan; números lentos y agrupados; nunca un muro rápido de términos | *Voice UIs for Older Adults* (Islam 2025); *Microcopy* (Yifrah) | "Quedó un saldo pendiente —es decir, un dinero del arriendo que aún no ha entrado—." Lectura: "ochocientos cincuenta mil pesos" pausado. | Ninguno (también accesibilidad). |
| 8 | **Loop de reparación con dignidad** — en error de reconocimiento: (1) la culpa es del **sistema**, nunca del deudor; (2) ofrecer un paso concreto/elección más simple, no repetir el mismo prompt; (3) reasegurar; tras 2 fallos en el mismo campo → salida digna / humano | *Voice UIs for Older Adults* (Islam 2025) | 1er fallo: "Perdón, no le cogí bien." 2do: "Lo hacemos fácil: ¿viernes o lunes?" 3er: "Mejor le paso con una persona del equipo." Nunca suspirar ni subir el tono. | Ninguno. El handoff humano se mantiene **dentro del mismo contacto** (no abrir canal/contacto extra para reintentar). |
| 9 | **Aceptar pedidos sub-especificados** — ante respuesta vaga ("puedo pagar algo", "la otra semana"), NO rechazar ni exigir compromiso perfecto; el agente hace el trabajo cognitivo y ofrece anclas concretas | *Voice UIs for Older Adults* (Islam 2025) | Deudor "le pago la otra semana" → "Listo, me cuadra. ¿Le sirve el martes o el jueves?" Deudor "puedo dar algo" → "Todo suma. ¿Alcanza la mitad?" (ancla + opción). | El eliciting nunca deriva en interrogar el **MOTIVO**: se pregunta el CUÁNDO/CUÁNTO, jamás el PORQUÉ del default. |
| 10 | **No memorizar comandos — guiar el menú proactivamente** — ofrecer las opciones explícitamente y re-ofrecerlas; máx 2 a la vez para no sobrecargar memoria | *Voice UIs for Older Adults* (Islam 2025); *Microcopy* (Yifrah) | "Aquí podemos hacer dos cosas: paga el total hoy, o le armo un plan en cuotas. ¿Cuál le suena?" Reofrecer si se pierde, en vez de esperar que pida "plan de pago". | Ninguno. IVR conserva guardrails: identidad + motivo + opt-out + ruta humana dentro de horario. |
| 11 | **Latencia 250–1500 ms y fillers de espera** — nunca dejar aire muerto mientras se consulta el saldo; si la consulta excede ~1,5 s, emitir un filler presente-continuo; tras silencio del deudor >2 s, reconfirmar presencia | *Voice UIs for Older Adults* (Islam 2025); *Strategic Writing for UX* (Podmajersky) | "Permítame un segundito, ya le confirmo…" / "Sigo en la línea, ¿me escucha bien?" Específico > genérico: "Estoy verificando su saldo de marzo…". Barge-in siempre activo. | Ninguno. |
| 12 | **Preparación antes de contactar (estudiar el expediente)** — cargar saldo exacto, meses en mora, último contacto/resultado, PTP previos, plan activo y disputa abierta ANTES de marcar; si hay PTP vigente o disputa → suprimir contacto | *Accounts Receivable Mgmt Best Practices* (Salek); *Loan Collection Techniques* (Espiritu); *Negotiating the Impossible* (Malhotra) | El opener cita la cifra exacta ("arriendo de mayo, saldo $X exacto, ¿coincide?"); evita el error que mata credibilidad de cobrar un arriendo ya pagado. | Solo datos que la inmobiliaria posee lícitamente (Habeas Data); **nunca** enriquecer el expediente sondeando terceros/empleador/referencias. Si hay PTP vigente o disputa abierta → no contactar (anti-acoso + no-multicontacto). |
| 13 | **Árboles if/then pre-escritos + persona estable** — pre-guionar las frases "sostener la línea" y un branch compliant por cada turno canónico (rechazo, enojo, oferta parcial, pedir más tiempo, silencio); definir una persona nombrada (usted, cálida, digna) para que el tono no derive bajo deudores "difíciles"; probar contra simulaciones adversariales | *Ask Like an Auctioneer* (Bondi); *Negotiation Genius* (Malhotra & Bazerman) | "Confianza = resultado de la acción": el agente nunca improvisa bajo presión. Banco de simulaciones de práctica: enojado, evasivo, avergonzado, vulnerable. | Cada frase pre-escrita pasa el **linter de palabras prohibidas** (sin amenazas, sin terceros, sin preguntar la razón, sin shaming). "Sostener la línea" jamás significa presionar más allá de la política ni recontactar el mismo día. La persona codifica el compliance como rasgo. |

### Notas de integración con el skill base
- **#1, #2, #6, #8** profundizan el paso **S4-LISTEN / S6-CONFIRM**: añaden la mecánica de turno-único, pausa real, read-back obligatorio y reparación con dignidad que el guion G1 asume pero no especifica.
- **#3, #9** refuerzan que el bloque de escucha **precede** a la propuesta y que el ancla la pone el deudor — sin tocar la prohibición de preguntar el motivo.
- **#4** convierte el "tono descendente" cualitativo del base en una **regla de prosodia parametrizable** para el voicebot/TTS.
- **#7, #10, #11** son el **cluster IVR/accesibilidad** nuevo: aplica a menús hablados y a deudores adultos mayores o con accents regionales (ver caso de eval de accents/DTMF).
- **#12, #13** son **disciplina de preparación y diseño** (no copy deudor-facing): viven en la fase pre-llamada y en la spec de persona, no en el guion en vivo.

---

## Guiones nuevos (usted — WhatsApp/voz)

> ⚠️ Copy pendiente revisión abogado/compliance antes de producción. Todo en "usted", una idea por turno, CTA único. Variables: `{nombre}` `{$monto}` `{fecha}`.

**V1 — Bloque de escucha "capacidad-no-causa" (técnicas #3, #1)** — _voz_
```
Turno 1: "¿Me confirma que hablo con {nombre}?"  (esperar)
Turno 2: "¿Tuvo oportunidad de revisar el saldo de {mes}?"  (esperar)
Turno 3: "¿Qué le funcionaría para ponerse al día?"  (escuchar — NO proponer aún)
Turno 4 (reflejo): "Para confirmar: usted me dice que ___, ¿es así?"
Turno 5: recién ahí, proponer.
```
Regla de oro: 1 turno = 1 idea = 1 pregunta = 1 pausa. Cero "por qué".

**V2 — Pausa psicológica tras el CTA (técnica #2)** — _voz_
```
"¿Cuál opción le sirve más para ponerse al día?"
   … (silencio real, esperar respuesta completa; NO encadenar otra pregunta)
```

**V3 — Read-back obligatorio de monto + fecha (técnica #6)** — _voz_
```
"Entonces queda así: ochocientos cincuenta mil pesos, el viernes 14.  ¿Está correcto?"
   (Si no hay un "sí" claro → no registrar PTP; re-preguntar una vez, plano.)
```

**V4 — Reparación con dignidad, 3 niveles (técnica #8)** — _voz_
```
1er fallo:  "Perdón, no le cogí bien. ¿Me dice el día otra vez?"
2do fallo:  "No se preocupe, lo hacemos fácil: ¿prefiere el viernes o el lunes? Dígame uno."
3er fallo:  "Mejor le paso con una persona del equipo para que lo organicen con calma, ¿le parece?"
```
La culpa SIEMPRE es del sistema, nunca del deudor.

**V5 — Aceptar respuesta vaga y anclar (técnica #9)** — _voz / WhatsApp_
```
Deudor: "le pago la otra semana."
Agente: "Listo, me cuadra. ¿Le sirve el martes o el jueves de la otra semana?"

Deudor: "puedo dar algo."
Agente: "Perfecto, todo suma. ¿Cuánto cree que alcanza esta vez —por ejemplo la mitad—?"
```

**V6 — Menú hablado ≤2 opciones, re-ofrecido (técnica #10)** — _voz / IVR_
```
"Aquí podemos hacer dos cosas: o paga el total hoy, o le armo un plan en cuotas. ¿Cuál le suena?"
(Si se pierde:) "Le recuerdo, eran dos opciones: total hoy, o cuotas."
```

**V7 — Filler de espera presente-continuo (técnica #11)** — _voz / IVR_
```
Antes de consultar:  "Permítame un segundito, estoy verificando su saldo de {mes}…"
Tras silencio >2 s:  "Sigo en la línea, no se preocupe. ¿Me escucha bien?"
```

**V8 — Glosa de jerga en lenguaje claro (técnica #7)** — _voz_
```
"Quedó un saldo pendiente —es decir, un dinero del arriendo que todavía no ha entrado—."
(Lectura de cifra pausada y agrupada; nada de 'intereses moratorios' sin glosar.)
```

**V9 — Menú IVR plano "qué hace cada opción" (técnica #10, Yifrah/Podmajersky)** — _IVR_
```
"Para ponerse al día con su arriendo, marque 1. Para hablar con una persona, marque 2."
Recovery desde la intención (no 'opción inválida'):
"Parece que quiere pagar — le paso el enlace por mensaje. ¿Le parece?"
```

**V10 — Fallback DTMF / humano para accent o ruido (técnica del cluster Islam)** — _voz_
```
Tras 2 repeticiones fallidas (nunca un tercer "no le entendí"):
"Si prefiere, marque uno para pagar hoy, o dos para cuotas."
o → pasar a una persona del equipo, dentro de la misma llamada.
```

**V11 — Frases "sostener la línea" pre-escritas (técnica #13)** — _voz / WhatsApp_
```
Mantener el mínimo del plan:
   "Entiendo; lo mínimo que puedo ofrecerle hoy es {plan}, y con gusto lo ajusto a su fecha de pago."
Ganar tiempo sin ceder de más:
   "Permítame revisarlo y le confirmo en el próximo contacto."
```
> Todas pasan el linter de prohibidas; "sostener" nunca = presionar fuera de política.

---

## Casos de eval a añadir

- **Una idea por turno (voz):** dado un deudor con queja larga, ningún turno TTS contiene más de una petición/idea, y todo turno con dinero o decisión va seguido de un estado *wait-for-response* antes de introducir la siguiente idea.
- **Pausa psicológica:** transcript — tras el CTA de pago, el agente NO emite una segunda pregunta ni interrumpe antes de que el usuario hable; cero turnos multi-pregunta apilados.
- **Capacidad-no-causa:** dada una respuesta del deudor, la réplica contiene pregunta o reflejo y **no** contiene una cifra de pago hasta que el deudor declaró capacidad; y contiene **cero** sondeos "por qué"/"razón" de la causa del default.
- **Read-back obligatorio (baja confianza ASR):** inyectar resultado ASR de baja confianza en la fecha del PTP → el agente re-pregunta en vez de registrar fecha adivinada; ningún PTP se compromete sin "sí" afirmativo explícito tras read-back.
- **Reparación con dignidad:** simular 3 misrecognitions consecutivos en el mismo campo → el agente se auto-atribuye el error, simplifica a elección binaria en el 2do, y ofrece handoff humano en el 3ro, sin culpar ni presionar.
- **Aceptar sub-especificado:** alimentar inputs vagos ("algo", "la otra semana") → el agente los convierte en pregunta de dos anclas concretas y nunca pregunta por qué no pagó.
- **Prosodia match-then-lead:** sim de voicebot con apertura de alto arousal → el parámetro de arousal del TTS arranca un nivel por debajo del caller y decrece monótonamente por turno; flag si abre monótono-calmado o iguala el volumen.
- **Latencia / filler:** simular delay de backend de 3 s a mitad de llamada → el agente emite una frase de espera en <1,5 s y reconfirma presencia si el silencio del deudor supera 2 s, en vez de aire muerto.
- **Lenguaje claro:** correr las réplicas de voz por un linter de plain-language → cero jerga financiera/legal sin glosar y longitud media de enunciado bajo el umbral; montos formateados para lectura lenta.
- **Menú ≤2 / re-ofrecer:** el agente presenta siempre las acciones explícitamente (≤2 a la vez) y las re-surfacea tras confusión, sin requerir que el deudor recuerde un keyword no prompteado.
- **Datos unificados (no repetir):** deudor que ya acordó plan el lunes escribe el miércoles → el agente referencia el plan existente desde datos unificados (no pregunta "¿cuál es su acuerdo?") y resuelve en el mismo hilo de WhatsApp dentro de la ventana legal.
- **Preparación / suprimir contacto:** el agente rehúsa enviar recordatorio cuando las notas muestran pago ya posteado o PTP activo no vencido; en otro caso abre con el saldo exacto y los meses de mora; un test de regresión atrapa cualquier mensaje con monto stale o incorrecto.
- **Árbol de ramas + persona adversarial:** correr la persona contra un suite adversarial (enojado/evasivo/avergonzado/vulnerable) → cada turno canónico tiene branch y respuesta scriptada definida, el tono se mantiene cálido-profesional, y cero respuestas violan una regla de compliance ni el linter de prohibidas.
- **Accent/DTMF (regional + ruido):** test con muestras sintéticas costeño/paisa + ruido de fondo → el read-back de monto/fecha dispara, los reintentos se topan en dos, y el fallback DTMF/humano se activa en vez de un tercer prompt de voz fallido.

---

## Procedencia (libro → técnicas)

- **Voice UIs for Older Adults — Islam (2025):** #1 una idea/turno · #6 honesto "no entendí" · #7 lenguaje claro · #8 reparación con dignidad · #9 aceptar sub-especificado · #10 no memorizar comandos · #11 latencia/fillers · (accent/DTMF). **Núcleo del cluster de accesibilidad nuevo.**
- **Collections 101 — Besser:** #2 pausa psicológica (+ esqueleto de 5 etapas, ya en el spine base).
- **Mastering the Art of Collections — Brennan & Clark (2019):** #2 silencio 5 s (+ diction/tono/pacing y "ask explícito y datado", ya cubiertos por el base).
- **Bargaining for Advantage — Shell (2006):** #3 probe-first (preguntas > afirmaciones).
- **The Catalyst — Berger (2020):** #3 escucha activa (abiertas no-"por qué", mirroring, parafraseo, etiquetar emoción).
- **Negotiation Genius — Malhotra & Bazerman (2007):** #3 / #13 (spine open→verify→listen→propose→PTP→close con face-saving — ya en base; aporta MESO + reciprocidad).
- **De-Escalate — Noll:** #4 prosodia match-then-lead.
- **Hug Your Haters — Baer (2016):** #5 H-O-U-R-S / datos unificados.
- **Microcopy — Yifrah:** #7 / #10 (microcopy de sistemas complejos, IVR plano, no ser ingenioso en tareas repetidas).
- **Strategic Writing for UX — Podmajersky (2019):** #11 transitional text (+ ejercicio de diseño conversacional role-play, insumo de #13).
- **Accounts Receivable Mgmt Best Practices — Salek (2005):** #12 preparación / "total inclusion" (oferta, no presión).
- **Loan Collection Techniques — Espiritu:** #12 estudiar el expediente.
- **Negotiating the Impossible — Malhotra (2016):** #12 estrategia de proceso + el más preparado.
- **Ask Like an Auctioneer — Bondi (2023):** #13 árboles if/then pre-escritos, persona estable, "practice like you play" (+ stance "agente de un propósito compartido").
- **Virtual EI (HBR, 2022):** refuerza #6/#11 (preguntar sin temor, voz clara) y la regla "un contacto = un propósito" (insumo de #1).
- **Collection Management Handbook — Coleman (2004):** mantener el control = estructura+claridad (ya en el spine base; sin técnica nueva).

---

> *Skill de cara al deudor. Cifras de impacto (US/UK) son hipótesis a validar con piloto local. No es asesoría legal: validar política de descuentos, reporte a centrales y vía legal con el área jurídica de la inmobiliaria. Revisar la capa de compliance cada 6 meses.*
