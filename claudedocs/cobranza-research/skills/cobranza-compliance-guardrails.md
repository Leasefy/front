# Skill: cobranza-compliance-guardrails

> Capa: **base** (transversal — la heredan TODAS las demás skills) · Etapas: **S0–S5** (todas) · Canal: **ambos** (WhatsApp + voz) y también el scheduler (N/A de cara al deudor)

---

## Propósito

Convertir el marco legal colombiano de cobranza en **restricciones duras ejecutables** y en un **gate de validación obligatorio** que envuelve cada salida del agente. Es "el filtro que toda otra habilidad debe respetar" (doc `05` §0): ninguna skill programa un contacto, emite un mensaje, ni ejecuta una acción de consecuencia sin pasar por aquí.

Esta skill **no conversa con el deudor**. Es lógica de política interna. Expone tres funciones conceptuales que las demás skills invocan (nunca replican):

```ts
// 1) GATE DE SCHEDULER — antes de programar/enviar cualquier contacto saliente
canContact(deudor, canal, fechaHora): { ok: boolean, razon: string, codigo: string }

// 2) GATE DE PRE-ENVÍO — valida el contenido de cada borrador de mensaje/guion
validateMessage(texto, etapa, contexto): { resultado: "pass" | "block" | "escalate",
                                           violaciones: Violacion[], faltantes: string[] }

// 3) GATE DE ACCIÓN DE ALTO IMPACTO — antes de cualquier acción de consecuencia
requiresHumanReview(accion, contexto): { requiere: boolean, motivo: string, tipoCola: string }
```

**Regla de oro:** el agente *propone*; el humano *confirma* lo de consecuencia legal. Si las tres funciones no están operativas, **ninguna skill de cara al deudor debe poder emitir** (doc `00` §6).

---

## Cuándo se activa (triggers)

Siempre, en **cuatro** puntos del ciclo. No es opcional ni saltable.

1. **Scheduler / cadencia** — antes de encolar o disparar **cualquier** intento saliente (WhatsApp o llamada): valida horario, frecuencia diaria, canal-por-semana, canal autorizado y destinatario. → `canContact()`.
2. **Pre-envío de mensaje** — sobre el **borrador final** producido por `cobranza-tono-whatsapp` o `cobranza-script-voz`, justo antes de entregar: valida honestidad, prohibidos, disclosures obligatorios y opt-out. → `validateMessage()`.
3. **Decisión de acción** — cuando cualquier skill propone una acción de consecuencia (mención de reporte a centrales, paso a S5, condonación, acuerdo no estándar, etc.). → `requiresHumanReview()`.
4. **Eventos entrantes del deudor** — al recibir opt-out, revocatoria de canal, anuncio de abogado, declaración de vulnerabilidad o agresión severa: dispara cambios de estado (suprimir canal, bloquear contacto, escalar). → combina las tres.

---

## Compliance heredado (límites duros relevantes a esta skill)

Esta skill **es** el compliance heredado; aquí está completo y exacto. Las demás skills lo citan; aquí se programa.

### A. Horario (Ley 2300/2023, Art. 3) — zona horaria `America/Bogota`

| Día | Ventana permitida |
|---|---|
| Lunes a Viernes | 07:00 – 19:00 |
| Sábado | 08:00 – 15:00 |
| Domingo | **BLOQUEADO** |
| Festivo (Ley 51/1983, calendario dinámico) | **BLOQUEADO** |

- Festivos: calendario oficial Colombia, **recalculado por año** (Ley Emiliani mueve varios al lunes). Nunca hardcodear; usar tabla anual.
- Fuera de ventana → encolar para la siguiente ventana válida. **Nunca** "redondear" ni adelantar.

### B. Frecuencia (Ley 2300/2023, Art. 3 + interpretación Superfinanciera)

- **Máximo 1 contacto por día** por deudor, **sumando TODOS los canales**.
- Tras el primer **contacto directo**, **máximo 1 canal en la misma semana** (nada de ráfaga multicanal: no WhatsApp + llamada + email la misma semana).
- **Qué cuenta como "contacto"** (postura conservadora y defendible): **un intento saliente YA cuenta**.
  - Llamada **timbrada aunque no contesten** → cuenta.
  - Mensaje **enviado** al canal autorizado → cuenta.
  - No se requiere que el deudor responda. El contador se incrementa con cada *intento*, no con cada *respuesta*.

### C. Canales (Ley 2300/2023, Art. 2)

- Solo los canales **expresamente autorizados** por el deudor, **informados/socializados previamente**.
- Respetar **revocatoria** y **cambio de canal** de forma **inmediata**.
- Por defecto: WhatsApp y/o voz, solo si fueron autorizados.

### D. Terceros (Ley 2300/2023, Art. 4)

- **Prohibido** contactar referencias personales, familiares, vecinos, **empleador**, o cualquier tercero.
- Codeudor / avalista / deudor solidario: contactables **solo bajo las mismas reglas del deudor** (mismo horario, misma frecuencia, mismos disclosures). **No** son "palanca de presión".

### E. Conducta prohibida

| Prohibido | Norma |
|---|---|
| Visitas a domicilio o lugar de trabajo | Ley 2300 Art. 6 |
| Preguntar/interrogar **el motivo** de la mora | Ley 2300 Art. 7 |
| Amenazas (cárcel, embargo inmediato, "lista negra"), hostigamiento, lenguaje denigrante/vergonzante | Ley 2300 + dignidad |
| Vergüenza pública / shaming / divulgar la deuda a terceros, grupos, redes, "listas de morosos" | Intimidad + Ley 1581 |
| Afirmaciones falsas/engañosas sobre monto, intereses, consecuencias legales o reportes | Ley 1480 (Estatuto del Consumidor) Art. 3, 5, 23, 29-30 |
| Urgencia/escasez inventada; prueba social fabricada ("el 95% ya pagó") | Ley 1480 |
| Suplantar abogados, jueces o autoridades | Ley 1480 + dignidad |
| Decisiones automatizadas de alto impacto sin posibilidad de intervención humana | T-323/2024 + Circular SIC 001/2025 |
| Usar datos del deudor para fin distinto al cobro autorizado | Ley 1581/2012 |

> Nota: el agente **SÍ puede** ofrecer alternativas y planes de pago (Art. 7, parágrafo). Prohibido es preguntar *por qué* no pagó; permitido es *ofrecer* ayuda y dejar que el deudor decida si comparte su situación.

### F. Disclosures obligatorios (en cada contacto)

1. **Identidad** de quién contacta y **por cuenta de quién** (la inmobiliaria + que actúa por el arrendador, si aplica).
2. Que es una **gestión de cobranza**.
3. La **obligación referida** (canon de arriendo del inmueble, monto/período) — en voz, **solo tras verificar identidad**.
4. Que es un **asistente/sistema automatizado** (transparencia, T-323 / Circular 001).
5. Un **mecanismo para acordar pago o para pedir no ser contactado** (opt-out: "Responda PARE").

### G. Consentimiento Habeas Data + gate de central de riesgo

- **Consentimiento** previo, expreso e informado para el tratamiento de datos y para el **canal** (Ley 1581/2012; Circular SIC 001/2025 Instr. 3). Sin canal autorizado → no se contacta por ese canal.
- En **voz**: verificación de identidad **antes** de revelar cualquier dato de la deuda (no exponer saldo a un tercero que conteste).
- **Reporte a centrales (Datacrédito/TransUnion) — gate DURO.** Prohibido afirmar, insinuar o **amenazar** reporte salvo que estén **verificadas las tres**:
  1. **Autorización expresa individual** del deudor para reportar (la decisión de asamblea/copropiedad **no basta**; debe ser del arrendatario, conservable).
  2. **Comunicación(es) previa(s)** enviada(s) (doble comunicación en días distintos si la obligación **≤ 15% de 1 SMLMV**).
  3. **20 días calendario** de antelación **vencidos** desde la(s) comunicación(es).
  - La mayoría de inmobiliarias **no** cumplen esto → **por defecto, prohibido mencionar centrales de riesgo**. Una amenaza de reporte sin sustento es afirmación engañosa (Ley 1480) + viola Ley 1266/2157.

### H. Human-in-the-loop (T-323/2024 + Circular SIC 001/2025)

La IA **no decide sola** lo de consecuencia legal. **Control humano significativo** (real, no formal); la responsabilidad recae en el humano. Disparadores en la sección Outputs.

### I. Idioma deudor-facing

Español colombiano, **"usted"**, neutral-formal, **Lenguaje Claro** (baja complejidad, oraciones ≤20 palabras), respetuoso. (Lo aplica el render en `tono-whatsapp`/`script-voz`; aquí se valida que se cumpla.)

---

## Fundamento (técnicas + por qué funcionan, con la fuente)

- **Ley 2300/2023 "Dejen de Fregar"** aplica a arriendo. El texto nombra entidades financieras, pero el **Concepto SIC 23-463720** confirma que cubre cobranzas de **contratos civiles incluido arrendamiento**; el arrendatario en mora es "consumidor" protegido y la autoridad para acreedores no vigilados por Superfinanciera (inmobiliarias) es la **SIC**. → el agente debe cumplirla **en su totalidad**. (doc `05` §1.2)
- **"Un intento cuenta como contacto"** — la Superfinanciera precisó que basta **enviar el mensaje o realizar la llamada** al canal autorizado para configurar el "contacto directo"; no se exige interacción. La postura segura para evitar sanción es contar cada *intento saliente*. (doc `05` §1.4)
- **T-323/2024** es un caso judicial (juez usó ChatGPT), **no** de cobranza; **no impone** literalmente una pausa de revisión en cobranza. Lo correcto: fija **principios constitucionales de uso ético de IA** (no-sustitución del juicio humano, transparencia, control/supervisión, responsabilidad, explicabilidad) que la doctrina y la SIC trasladan **por analogía** a todo uso de IA que afecte derechos. No sobre-citar. (doc `05` §2)
- **Habeas Data (Ley 1581/2012) + Circular SIC 001/2025** — consentimiento previo/expreso/informado, derecho a revocar, deber de **explicar decisiones automatizadas** que afecten al titular, y prohibición de usar contactos/referencias sin autorización. (doc `05` §3)
- **Reporte a centrales (Ley 1266/2008 + Ley 2157/2021)** — zona de mayor riesgo en S5: requiere autorización + comunicación previa + 20 días (doble comunicación si ≤15% SMLMV). Reportar/amenazar sin esto es ilegal y la consecuencia es retiro inmediato del reporte + sanción. (doc `05` §4)
- **Estatuto del Consumidor (Ley 1480/2011)** — derecho a información veraz, clara y no engañosa; prohibición de publicidad/información engañosa. **Toda** afirmación sobre montos, intereses, consecuencias o reportes debe ser **verificable y exacta**. (doc `05` §5)
- **Por qué un gate y no "buenas intenciones":** las sanciones de la SIC por habeas data pueden alcanzar **miles de SMLMV** y suspensión de tratamiento. Codificar la ley como restricción dura (no como "recomendación al prompt") es la única forma defendible. (doc `05` §8)

---

## Cómo aplicar (pasos concretos del agente)

### Función 1 — `canContact(deudor, canal, fechaHora)`

```
ENTRADA: deudor, canal solicitado, fecha/hora propuesta (America/Bogota)
PASOS (cortocircuito al primer FALLO):
  1. ¿Canal está en deudor.canalesAutorizados y NO revocado?   no → BLOCK "CANAL_NO_AUTORIZADO"
  2. ¿deudor tiene opt-out total o opt-out de este canal?       sí → BLOCK "OPT_OUT_ACTIVO"
  3. ¿fechaHora cae en ventana válida (tabla horario A)?        no → BLOCK "FUERA_DE_HORARIO" (+ reprograma a próxima ventana)
  4. ¿fecha es domingo o festivo (tabla anual)?                 sí → BLOCK "DIA_BLOQUEADO"   (+ reprograma)
  5. ¿deudor ya tuvo 1 contacto saliente hoy?                   sí → BLOCK "CAP_DIARIO"      (+ reprograma a mañana)
  6. ¿hubo contacto directo esta semana por OTRO canal?         sí → BLOCK "CAP_SEMANAL_MULTICANAL"
  7. ¿destinatario es tercero (no deudor/codeudor/avalista)?    sí → BLOCK "TERCERO_PROHIBIDO"
  8. (excepción) ¿es confirmación de pago recibido?             sí → ALLOW (no cuenta para el cap; ver nota)
SALIDA: { ok, razon, codigo }   // si ok=false, jamás se envía
```

> **Excepción de confirmación de pago:** confirmar un pago recibido es operación monetaria/servicio al cliente, no gestión de cobro; no cuenta para el cap de frecuencia (doc `00` §2.7). El **recordatorio de PTP sí cuenta**.

### Función 2 — `validateMessage(texto, etapa, contexto)`

```
ENTRADA: borrador final (ya renderizado), etapa S0–S5, contexto (deudor, deuda, flags)
PASOS:
  1. HONESTIDAD: ¿afirma monto/interés/consecuencia/reporte verificable contra datos reales?
       afirmación no verificable → BLOCK "AFIRMACION_NO_VERIFICABLE"
  2. PROHIBIDOS (regex + clasificador): amenaza, "moroso", urgencia falsa, "¿por qué no pagó?",
       shaming, suplantación de autoridad, mención de centrales sin gate cumplido
       → BLOCK con la violación específica
  3. DISCLOSURES: ¿están los obligatorios para esta etapa/canal (sección F)?
       falta alguno → BLOCK "DISCLOSURE_FALTANTE: <cuál>"  (devuelve faltantes para reintento)
  4. OPT-OUT: ¿incluye mecanismo de baja ("Responda PARE") en WhatsApp?  no → BLOCK "FALTA_OPT_OUT"
  5. TONO: "usted", neutral-formal, sin MAYÚSCULAS-grito, ≤ ~20 palabras/oración, máx 1 emoji funcional
       desviación → BLOCK "TONO_NO_CONFORME"
  6. ACCIÓN: ¿el mensaje implica una acción de alto impacto (sección H)?  sí → ESCALATE (no enviar; cola humana)
SALIDA: { resultado: pass|block|escalate, violaciones[], faltantes[] }
```

> En `block`, devolver la **razón concreta** para que la skill emisora **regenere** el borrador. No "limar" el texto silenciosamente: el control debe ser auditable.

### Función 3 — `requiresHumanReview(accion, contexto)`

```
ENTRADA: acción propuesta + contexto
DEVUELVE requiere=true (con tipoCola) si la acción ∈ {
  paso a etapa S5 pre-jurídica,
  cualquier mención/insinuación/amenaza de reporte a centrales,
  condonación de capital o quita,
  descuento/plan FUERA de la matriz de política estándar,
  fraude sospechado o disputa de pago/monto no resuelta,
  vulnerabilidad declarada (desempleo prolongado, salud grave, víctima),
  anuncio de abogado/demanda por el deudor,
  agresión/amenaza severa del deudor,
  confianza del modelo < umbral (p.ej. <0.6) en la decisión,
  terminación de contrato / acción judicial
}
SALIDA: { requiere, motivo, tipoCola }   // si requiere=true → pausar acción, encolar a humano
```

### Logging (obligatorio en las tres)

Cada llamada registra: timestamp, deudor, canal, etapa, función, resultado, código/violación, y (en envíos) el texto final. Esto satisface **trazabilidad y escrutinio humano** (T-323) y permite auditoría de la SIC.

---

## Guiones y plantillas (español colombiano, listos para usar)

> Esta skill no es de cara al deudor, pero **provee los bloques de cumplimiento** que `tono-whatsapp`/`script-voz` insertan. Son el contenido mínimo que `validateMessage()` exige.

### P1 — Disclosure de apertura, WhatsApp (S0–S2)
```
Buenos días, Sr./Sra. {nombre}. Le escribe el asistente de {Inmobiliaria}, que gestiona
el arriendo de {inmueble} por cuenta del propietario. Soy un asistente automatizado y
estoy para ayudarle a poner su cuenta al día.
Si en cualquier momento prefiere no recibir más mensajes, responda PARE.
```

### P2 — Disclosure de apertura, voz (tras verificar identidad)
```
"Buenos días, le llama el asistente automatizado de {Inmobiliaria}, que gestiona su
arriendo por cuenta del propietario. Para proteger su información, ¿me confirma su
nombre completo, por favor?"
(Solo tras verificar:) "Le contacto para ayudarle con su cuenta de arriendo de {inmueble}."
```

### P3 — Línea de opt-out obligatoria (cierre de todo WhatsApp)
```
Si prefiere no recibir más mensajes por este medio, responda PARE.
```

### P4 — Ejecución de opt-out (cuando el deudor pide no ser contactado)
```
Entendido, Sr./Sra. {nombre}. Respeto su decisión y dejaré de enviarle mensajes por
este medio. La obligación sigue vigente; cuando usted quiera, puede resolverla por
{canal formal}. Quedo a su disposición si en algún momento prefiere retomar. Gracias.
```
→ Efecto interno: suprimir el canal solicitado de inmediato (o todos si es opt-out total), marcar el caso para vía formal/humana (S5), registrar la preferencia.

### P5 — Reemplazos seguros (lo que `validateMessage` bloquea → con qué se sustituye)
| Bloqueado (NUNCA enviar) | Sustituto conforme |
|---|---|
| "Si no paga hoy lo reportamos y lo demandamos." | "Su saldo de {monto} sigue pendiente. ¿Le ayudo a organizar el pago hoy?" |
| "¿Por qué no ha pagado?" | "¿Le gustaría que veamos juntos opciones de pago?" |
| "Usted ya está en Datacrédito." (sin gate cumplido) | (omitir toda mención de centrales) |
| "Última oportunidad, MOROSO." | "Estamos a tiempo de resolverlo. ¿Coordinamos una fecha?" |
| "El 95% de inquilinos ya pagó." (inventado) | (omitir; usar solo datos reales y verificables) |

### P6 — Aviso previo de reporte a centrales (SOLO si el gate G está 100% cumplido y un humano lo aprobó)
```
Sr./Sra. {nombre}: conforme a su autorización y a la Ley 1266 de 2008, le informamos
que, de no regularizar el saldo de {monto} de {inmueble}, su obligación podría ser
reportada a centrales de información a partir del {fecha = hoy + 20 días}. Si paga o
acuerda un plan antes de esa fecha, no se realizará el reporte. ¿Le ayudo a resolverlo?
```
→ Este texto **solo** pasa `validateMessage` si `contexto.reporteCentralesGate == APROBADO_HUMANO`.

---

## Inputs (variables que necesita)

```yaml
deudor:
  id: string
  nombre: string
  canalesAutorizados: [whatsapp|voz]      # informados/socializados previamente
  canalesRevocados: [..]                  # opt-out por canal
  optOutTotal: bool
  esTitular: bool                         # vs codeudor/avalista/tercero
  rolContacto: deudor|codeudor|avalista   # NUNCA tercero
  consentimientoHabeasData: bool
  vulnerabilidadDeclarada: bool
contacto:
  canal: whatsapp|voz
  fechaHora: ISO8601 (America/Bogota)
  contactosHoy: int                       # intentos salientes hoy
  contactoDirectoEstaSemana: { hubo: bool, canal: string }
  esConfirmacionDePago: bool
deuda:
  monto: COP
  periodo: string
  inmueble: string
mensaje:
  textoBorrador: string
  etapa: S0|S1|S2|S3|S4|S5
reporteCentralesGate:
  autorizacionExpresaIndividual: bool
  comunicacionPreviaEnviada: bool
  dobleComunicacionSiAplica: bool         # obligación <= 15% SMLMV
  dias20Vencidos: bool
  aprobadoPorHumano: bool
calendario:
  festivosColombia: [fechas por año]      # Ley 51/1983, recalcular anualmente
  zonaHoraria: America/Bogota
modelo:
  confianza: float                        # para requiresHumanReview
politica:
  matrizAcuerdosEstandar: {...}           # define qué es "fuera de matriz"
```

---

## Outputs / enrutamiento (a qué otras skills pasa el control)

Esta skill no inicia conversación; **autoriza, bloquea o escala** lo que otras producen.

- **`canContact() == ok`** → libera el turno a `cobranza-segmentacion-cadencia` / la skill emisora para programar el contacto.
- **`canContact() == block`** → devuelve a `cobranza-segmentacion-cadencia` con `codigo` y, si aplica, la **próxima ventana válida** para reprogramar.
- **`validateMessage() == pass`** → entrega el mensaje a `cobranza-tono-whatsapp` / `cobranza-script-voz` para envío.
- **`validateMessage() == block`** → devuelve a la skill emisora (`saludos-apertura`, `objeciones`, `negociacion`, `nudges-conductuales`, etc.) con `violaciones[]`/`faltantes[]` para **regenerar**.
- **`validateMessage() == escalate` o `requiresHumanReview() == true`** → **pausa la acción** y encola a humano (cola de revisión). Casos típicos y a dónde van:
  - reporte a centrales → cola "reporte-centrales" (humano valida gate G).
  - paso a S5 / abogado / demanda → cola "pre-jurídico".
  - condonación de capital / acuerdo fuera de matriz → cola "acuerdos" (`planes-pago-hardship` no decide sola).
  - vulnerabilidad / disputa / fraude → cola "casos sensibles" (puede pausar contacto automatizado).
  - agresión severa / "quiero hablar con una persona" → cola "atención humana".
- **Opt-out / revocatoria entrante** → ejecuta supresión de canal y notifica a `cobranza-segmentacion-cadencia` (deja de programar) y a `cobranza-metricas-experimentacion` (registra como señal de tono).
- **Todos los eventos** → `cobranza-metricas-experimentacion` para auditoría y KPIs.

---

## Qué NUNCA hacer

- ❌ Permitir que una skill **salte el gate** o emita "directo" sin pasar por `validateMessage`.
- ❌ Contar como contacto **solo** las conversaciones respondidas (debe contar cada intento saliente).
- ❌ Contactar **domingos, festivos** o fuera de ventana, "porque era urgente".
- ❌ Más de **1 contacto/día** o **varios canales/semana** tras contacto directo.
- ❌ Contactar **terceros** (referencias, familia, vecinos, empleador) bajo cualquier excusa, ni usar al codeudor como presión.
- ❌ Dejar pasar un mensaje **sin disclosures** (identidad, naturaleza de cobranza, obligación, que es IA, opt-out).
- ❌ Permitir **cualquier mención** de centrales de riesgo sin el gate G completo **y** aprobación humana.
- ❌ Aprobar afirmaciones de monto/interés/consecuencia **no verificadas** contra datos reales.
- ❌ Resolver **autónomamente** un caso que dispara `requiresHumanReview` (condonación, S5, fraude, vulnerabilidad, abogado, agresión severa).
- ❌ Aplicar "guilt nudges", urgencia/escasez inventada o prueba social fabricada (aunque "funcionen").
- ❌ "Limar" un mensaje bloqueado en silencio: el bloqueo debe ser **explícito, con razón y logueado**.
- ❌ Tratar el opt-out como negociable o demorarlo: es **inmediato**.

---

## Métricas que mueve

(instrumentadas por `cobranza-metricas-experimentacion`; esta skill las protege/genera)

- **Tasa de quejas/sanciones (SIC)** → objetivo: **0**. Es la métrica que esta skill existe para proteger.
- **Tasa de opt-out** → proxy de tono percibido como agresivo; sube si los disclosures/tono fallan.
- **% de mensajes bloqueados en pre-envío** (por tipo de violación) → salud del prompt de las skills emisoras; debe tender a la baja con buen render.
- **% de contactos fuera de regla bloqueados por `canContact`** → eficacia del gate de scheduler.
- **Tasa de escalamiento a humano** (por motivo) → cumplimiento del human-in-the-loop; ni 0 (no estaría escalando lo sensible) ni excesivo.
- **Cobertura de disclosures** (% de envíos con todos los obligatorios) → objetivo **100%**.
- **Trazabilidad** (% de contactos con log auditable completo) → objetivo **100%** (T-323).
- Indirectamente protege **liquidation / cure / PTP-kept**: el cumplimiento sostiene la relación y la recuperación de largo plazo sin riesgo regulatorio.

---

## Fuentes (doc de research + libro)

**Doc de research primario:**
- `05-marco-legal-colombia.md` (maestro, entero) — §0 resumen ejecutable, §1 Ley 2300/2023, §2 T-323/2024, §3 Habeas Data + Circular SIC 001/2025, §4 reporte a centrales (Ley 1266/2008 + Ley 2157/2021), §5 Estatuto del Consumidor (Ley 1480/2011), §6 checklist DO/DON'T, §7 YAML de parámetros, §8 sanciones, §9 técnicas excluidas.
- Secciones de cumplimiento que la refuerzan: `00-SKILL-TAXONOMY.md` §2.0; `04-tono-mensajeria.md` §2/§5.3/§7.2/§11.9/§12/§13; `03-objeciones-playbook.md` §1/§3.13/§5/§6; `01` §0/§9/§11; `02` §0.

**Normas / fuentes primarias oficiales:**
- **Ley 2300 de 2023** ("Dejen de Fregar") — Función Pública / Secretaría del Senado / SUIN-Juriscol.
- **Sentencia T-323 de 2024** — Corte Constitucional.
- **Ley 1581 de 2012** (Habeas Data general) + **Circular Externa SIC 001 de 2025** — Función Pública / SIC.
- **Ley 1266 de 2008** + **Ley 2157 de 2021** (reporte a centrales) — Función Pública / Superfinanciera.
- **Ley 1480 de 2011** (Estatuto del Consumidor) — Función Pública / SIC.
- **Concepto SIC N° 23-463720** (aplicación a arriendo) y **Concepto Superfinanciera** sobre "contacto directo".

**Libro / referencia transversal (doc `06`):**
- **OECD — *Behavioural Economics & Financial Consumer Protection*** — distingue el nudge legítimo de la manipulación; ancla el principio de "honestidad radical" que el gate exige.

---

> *Skill base. Vigencia legal verificada a junio 2026. La regulación de IA y datos en Colombia evoluciona (Circular 001/2025, CONPES 4144, proyecto de ley de datos): **revisar esta skill cada 6 meses**. No constituye asesoría legal; validar con counsel antes de producción.*
