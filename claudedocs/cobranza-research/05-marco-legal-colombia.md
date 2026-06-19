# Marco Legal y de Cumplimiento — Cobranza en Colombia

**Documento maestro de guardarraíles legales para el Agente de Cobranza Autónomo (Leasefy)**
**Mercado:** Colombia · **Caso de uso:** Cobranza de canon de arrendamiento residencial por inmobiliarias, vía WhatsApp y llamadas de voz, en una cadencia escalonada (S0 amistoso → S5 prejudicial).
**Fecha de investigación:** 2 de junio de 2026 · **Estado normativo verificado:** vigente a 2024–2026.

> **Naturaleza de este documento.** Este es **el filtro que toda otra habilidad/skill del agente debe respetar**. Cualquier técnica de cobranza global, nudge conductual, guion o cadencia que viole alguna regla aquí descrita debe ser **excluida**. La meta (subir la tasa de recuperación) se persigue con claridad, empatía, contacto en el momento y canal correctos, nudges honestos y rutas de pago fáciles — **nunca** con presión, engaño, vergüenza pública u hostigamiento.

---

## 0. Resumen ejecutivo — lo que el agente DEBE encodear

| Restricción | Valor exacto a programar | Fuente |
|---|---|---|
| **Días/horas de contacto** | Lun–Vie 7:00–19:00; Sáb 8:00–15:00; **prohibido** domingos y festivos | Ley 2300/2023 art. 3 |
| **Frecuencia diaria** | **Máximo 1 contacto por día** por deudor (sumando todos los canales) | Ley 2300/2023 art. 3 |
| **Frecuencia semanal multicanal** | Una vez establecido contacto, **no** usar **varios canales** en la **misma semana** | Ley 2300/2023 art. 3 |
| **Qué cuenta como "contacto"** | Una **llamada no contestada** o un mensaje **enviado** al canal autorizado **YA cuenta**; no se requiere que el deudor responda | Concepto Superfinanciera s/Ley 2300 (interpretación oficial) |
| **Canales** | Solo los **expresamente autorizados** por el deudor, informados previamente | Ley 2300/2023 art. 2 |
| **Terceros** | **Prohibido** contactar referencias personales, familiares, vecinos, empleador. Codeudor/avalista/deudor solidario: solo bajo **las mismas reglas** del deudor | Ley 2300/2023 art. 4 |
| **Visitas** | **Prohibido** cobrar mediante visita al domicilio o lugar de trabajo | Ley 2300/2023 art. 6 |
| **Motivo de mora** | **Prohibido** preguntar por qué no pagó (sí se pueden ofrecer alternativas de pago) | Ley 2300/2023 art. 7 |
| **Supervisión humana de IA** | El sistema automatizado **no sustituye** el juicio humano; debe haber control y revisión humana, transparencia y explicabilidad | Sentencia T-323/2024 + Circular SIC 001/2025 + Proyecto de Ley de datos |
| **Reporte a centrales de riesgo** | Requiere **autorización expresa** del deudor + **comunicación previa** con **20 días** de antelación (y **doble comunicación** si la obligación ≤ 15% de 1 SMLMV) | Ley 1266/2008 + Ley 2157/2021 |
| **Autoridad sancionadora (arriendo)** | **SIC** (Superintendencia de Industria y Comercio) para creedores no vigilados por Superfinanciera | Ley 2300/2023 art. 9 + Concepto SIC 23-463720 |

---

## 1. Ley 2300 de 2023 — "Ley Dejen de Fregar" (norma central)

### 1.1 Identificación y vigencia (aclaración importante de fechas)

- **Nombre oficial:** Ley 2300 de 2023, *"Por medio de la cual se establecen medidas que protejan el derecho a la intimidad de los consumidores"*.
- **Sancionada:** 10 de julio de 2023.
- **Entrada en vigor:** 10 de **octubre** de 2023 (art. 10: "entrará en vigor en un plazo de tres (3) meses contados a partir de su promulgación").
- **Apodo popular:** "Ley Dejen de Fregar".
- **Estado a 2026:** **Plenamente vigente**. No se hallaron decretos reglamentarios que modifiquen el cuerpo sustantivo ni reformas aprobadas; el dispositivo del Registro de Números Excluidos (RNE) se desarrolla vía MinTIC/CRC. Verificado a jun-2026.

> ⚠️ **Nota sobre "Ley 2300 de 2024":** El brief de contexto la menciona como "Ley 2300/2024". El número correcto es **Ley 2300 de 2023**. No existe una "Ley 2300 de 2024". Programar referencias normativas con el año **2023**.

Texto oficial: [Gestor Normativo – Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990) · [Secretaría del Senado](http://www.secretariasenado.gov.co/senado/basedoc/ley_2300_2023.html) · [SUIN-Juriscol](https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes/30046853).

### 1.2 Ámbito de aplicación — ¿aplica al cobro de arriendo? **SÍ.**

El art. 1 cubre "todas las **personas naturales y jurídicas que adelanten gestiones de cobranzas de forma directa, por medio de terceros o por cesión de la obligación**". El parágrafo lo reitera para cobranza "directa, por tercerización o por cesión de la obligación financiera o crediticia".

**Punto crítico para una inmobiliaria:** Aunque el texto nombra a "entidades vigiladas por la Superintendencia Financiera", la **SIC en el Concepto N° 23-463720** confirmó que la **Ley 2300 también aplica a cobranzas derivadas de contratos civiles, incluyendo arrendamientos**. La protección al consumidor/deudor opera **independientemente** de si el acreedor es entidad financiera. Para acreedores **no** vigilados por Superfinanciera (caso de las inmobiliarias), la autoridad competente es la **SIC**.
Fuente: [Concepto SIC 23-463720 (análisis G&D Consulting)](https://www.gydconsulting.com/como-aplica-la-ley-2300-del-2023-a-cobranzas-por-contratos-civiles-concepto-sic-n-23-463720/).

∴ **El arrendatario en mora es un "consumidor" protegido por la Ley 2300; el agente DEBE cumplirla en su totalidad.**

### 1.3 Texto de los artículos operativos (verbatim, fuente oficial Función Pública)

**ARTÍCULO 2 — Canales autorizados.**
> "...sólo podrán contactar a los consumidores mediante los **canales que estos autoricen** para tal efecto, los cuales deberán ser **informados y socializados previamente** por parte de las entidades de cobranza con el fin de que los consumidores elijan cuáles autoriza."

**ARTÍCULO 3 — Horarios y periodicidad.**
> "Una vez establecido un **contacto directo** con el consumidor, este **no podrá ser contactado** por parte de gestores de cobranza **mediante varios canales dentro de una misma semana ni en más de una ocasión durante el mismo día**.
> Las prácticas de cobranza deberán realizarse de manera **respetuosa y sin afectar la intimidad personal ni familiar** del consumidor, dentro del horario de **lunes a viernes y de 7:00 am a 7:00 pm, y sábados de 8:00 am a 3:00 pm**, excluyendo cualquier tipo de contacto con el consumidor los **domingos y días festivos**."
> *Parágrafo:* el consumidor puede pedir ser contactado en horarios distintos solo si lo manifiesta expresamente "a través de un instrumento distinto al contrato... y posterior a la suscripción del mismo".

**ARTÍCULO 4 — Terceros.**
> "En ningún caso... podrán contactar a las **referencias personales o de otra índole**. Al avalista, codeudor o deudor solidario se le contactará en la misma condición que establece la presente ley."

**ARTÍCULO 6 — Visitas.**
> "Las personas naturales y jurídicas se **abstendrán de adelantar gestiones de cobranza mediante visitas al domicilio o lugar de trabajo** del consumidor financiero o de servicios."
> *(Excepción art. 6 Par. 1: microcrédito, crédito de fomento, desarrollo agropecuario o rural con autorización expresa — **no aplica a arriendo residencial**.)*

**ARTÍCULO 7 — Motivo de la mora.**
> "Las entidades que adelanten gestiones de cobranza deberán **abstenerse de consultar al consumidor financiero el motivo del incumplimiento** de la obligación."
> *Parágrafo:* "Lo dispuesto en este artículo no obsta para que se consulten al deudor **alternativas de pago** que sean acordes con su situación financiera." → **El agente SÍ puede ofrecer acuerdos/planes de pago.**

**ARTÍCULO 8 — Excepciones** (confirmaciones de operaciones, alertas de fraude, información solicitada por el consumidor). De alcance financiero; **no habilita** insistir en cobranza fuera de horario.

**ARTÍCULO 9 — Sanciones.** Las impone la **Superintendencia Financiera** y la **SIC**, conforme al marco de la Ley Estatutaria 1266 de 2008.

### 1.4 Interpretación clave: ¿qué cuenta como "contacto"?

La Superfinanciera precisó que **basta enviar el mensaje o realizar la llamada** a un canal autorizado para que se configure el "contacto directo": *el legislador no exigió como condición una "interacción con el cliente"*. **Una llamada no contestada al canal autorizado YA cuenta** como contacto y dispara las restricciones de frecuencia.
Fuente: [Concepto Superfinanciera s/Ley 2300 (vía OCH Group)](https://www.ochgroup.co/wp-content/uploads/2025/08/2023111476.pdf) · [Ámbito Jurídico](https://www.ambitojuridico.com/noticias/mercantil/financiero-cambiario-y-seguros/entidades-financieras-no-podran-llamar-cobrar-los).

∴ **Regla a programar (interpretación conservadora y defensible):** el contador de frecuencia (1/día, 1 canal/semana) debe incrementarse con **cada intento saliente** (llamada timbrada aunque no conteste, o mensaje enviado), **no** solo con conversaciones efectivas. Esta es la postura segura para evitar sanción.

---

## 2. Sentencia T-323 de 2024 — IA y supervisión humana

### 2.1 Qué es y qué alcance tiene (framing honesto)

La **Sentencia T-323 de 2024** de la Corte Constitucional resolvió una tutela (caso de un menor con TEA vs. EPS) en la que un **juez** usó ChatGPT para motivar su decisión. **El caso es específicamente sobre IA en la administración de justicia**, **no** sobre cobranza. Por tanto, **no impone directamente** una "pausa de revisión humana" a los agentes de cobranza.
Fuente: [Corte Constitucional T-323/2024](https://www.corteconstitucional.gov.co/relatoria/2024/t-323-24.htm) · [U. Externado – PropIntel](https://propintel.uexternado.edu.co/resumen-de-la-sentencia-t-323-de-2024-de-la-corte-constitucional-de-colombia-sobre-el-uso-de-ia-por-jueces-de-la-republica/).

> ⚠️ **No sobre-citar.** Sería incorrecto afirmar que "la T-323 obliga a pausar el contacto automatizado para revisión humana en cobranza". Lo correcto es: la T-323 fijó **principios constitucionales sobre uso ético de IA** que la doctrina y la SIC trasladan, por analogía, a todo uso de IA que afecte derechos — incluida la cobranza automatizada.

### 2.2 Principios transferibles (lo que SÍ debemos aplicar)

La Corte fijó principios para el uso de IA, entre ellos:
- **No-sustitución del razonamiento humano:** la IA no puede reemplazar el juicio humano en decisiones que afectan derechos ("imposibilidad ética y jurídica de sustituir la acción y la responsabilidad del individuo... en la gestión de las actuaciones y decisiones").
- **Transparencia:** revelar cuándo y cómo se usa IA.
- **Control humano / supervisión:** debe permitirse "la realización efectiva de escrutinios sobre las actuaciones y decisiones en que se usen herramientas de IA, mediante el acceso a la debida información".
- **Responsabilidad, verificación seria, prevención de riesgos (alucinaciones/sesgos), igualdad y no discriminación, privacidad, monitoreo continuo.**
- Ordenó al **Consejo Superior de la Judicatura** expedir guías de uso de IA (plazo 4 meses).

### 2.3 Traducción a guardarraíles del agente

1. **"Human-in-the-loop" en decisiones sensibles:** escalamiento obligatorio a un humano antes de acciones de alto impacto — p. ej. iniciar etapa **prejudicial (S5)**, amenazar reporte a centrales, o cualquier decisión sobre acuerdos no estandarizados.
2. **Transparencia:** el deudor debe poder saber que interactúa con un sistema automatizado y cómo se generó una decisión que lo afecte.
3. **Explicabilidad y trazabilidad:** logs de cada contacto (canal, hora, contenido, resultado) accesibles para escrutinio humano.
4. **No discriminación:** los nudges y la priorización no pueden basarse en variables sensibles ni producir trato discriminatorio.

---

## 3. Régimen de datos personales y decisiones automatizadas

### 3.1 Ley Estatutaria 1581 de 2012 (Habeas Data general)

- **Principio de libertad / consentimiento previo, expreso e informado:** el tratamiento de datos personales solo procede con **autorización previa, expresa e informada** del titular, salvo mandato legal o judicial. Fuente: [Ley 1581/2012 – Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981).
- **Derechos ARCO/Habeas Data:** conocer, actualizar, rectificar y **suprimir** sus datos; revocar la autorización.
- El tratamiento debe ser **idóneo, necesario, razonable y proporcional** a la finalidad (estándar reiterado por la SIC para IA).

### 3.2 Circular Externa SIC 001 de 2025 (capa moderna — la más relevante para IA en cobranza)

Emitida el **18 de septiembre de 2025**, redefine cómo bancos, fintech y **empresas de cobranza** deben tratar datos personales. Instrucciones clave:
- **Autorización informada, previa, libre y explícita** (Instrucción 3).
- **Explicar de manera clara las decisiones automatizadas que afecten al titular** (Instrucción 8) — aplica a priorización de cobranza y scoring.
- **Prohibido usar referencias o contactos sin autorización** (Instrucción 10) — refuerza el art. 4 de la Ley 2300.
- Identifica riesgos de **opacidad algorítmica** y **decisiones sin intervención humana**.
Fuente: [COLCOB – Protección de datos / Circular 001/2025](https://colcob.com/proteccion-de-datos-personales-en-colombia).

### 3.3 CONPES 4144 / proyecto de ley de datos / regulación de IA (en curso)

- **CONPES 4144 (2025):** política nacional de IA con pilares de ética, gobernanza y supervisión humana ("los sistemas de IA deberán operar siempre bajo control humano").
- **Proyecto de reforma a la Ley de datos:** reconoce un **derecho a no ser sometido a decisiones automatizadas sin intervención humana** y exige algoritmos explicables, transparentes y sin sesgos. **(Proyecto, no ley vigente — monitorear).**
Fuente: [Guía legal IA 2025 (CONPES 4144 + SIC)](https://blog.arielapp.co/inteligencia-artificial-en-colombia-2025-guia-legal-del-conpes-4144-y-la-sic-para-abogados-y-empresas/) · [ABC del Proyecto de Ley de Datos – SIC](https://sedeelectronica.sic.gov.co/noticias/abc-del-proyecto-de-ley-de-proteccion-de-datos-personales-en-colombia).

> **Guardarraíl de futuro:** diseñar ya el agente con human-in-the-loop y explicabilidad lo deja alineado con la regulación entrante.

---

## 4. Reporte a centrales de riesgo (Datacrédito/TransUnion) — Ley 1266/2008 + Ley 2157/2021

Esta es la zona de **mayor riesgo de la etapa S5 prejudicial**: amenazar o ejecutar reporte negativo sin cumplir los requisitos es ilegal y sancionable.

### 4.1 Requisitos para reportar (acumulativos)

1. **Autorización expresa del deudor** para el reporte (art. 6 Ley 1266). Para arriendo: la decisión de una asamblea/copropiedad **no basta**; se requiere **autorización individual** del arrendatario, conservable (escrito/audio/video). Fuente: [Concepto SIC – reporte y arrendamientos](https://contodapropiedad.com/reporte-a-centrales-de-riesgos-por-no-pago-de-cuotas-de-administracion/).
2. **Comunicación previa** al titular informando que se hará el reporte, con **al menos 20 días calendario** de antelación al reporte (Ley 1266 art. 12 / Ley 2157).
3. **Doble comunicación** (dos comunicaciones en días distintos) cuando la **obligación ≤ 15% de 1 SMLMV**, y deben mediar 20 días entre la última comunicación y el reporte (Ley 2157/2021 art. 3).
Fuente: [Ley 2157/2021 – Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=173246) · [Superfinanciera – Reporte a centrales](https://www.superfinanciera.gov.co/publicaciones/11293/consumidor-financieroinformacion-generalinformacion-al-consumidor-financierolo-que-usted-debe-saberreporte-de-datos-a-las-centrales-de-riesgo-11293/).

### 4.2 Consecuencias de no notificar

Si se reporta **sin** comunicación previa: retiro inmediato del reporte (si la obligación ya se extinguió) o retiro y obligación de surtir la comunicación antes de volver a reportar.

### 4.3 Permanencia del dato negativo

- Regla general: **4 años** desde el pago.
- Mora < 2 años: la permanencia no excede **el doble del tiempo de mora**.

### 4.4 Guardarraíl crítico para el agente

> ⚠️ Muchas inmobiliarias **no** son fuentes habilitadas ante las centrales y a menudo **no** tienen autorización individual del arrendatario para reportar. **El agente NO debe afirmar, insinuar ni amenazar reporte a Datacrédito/centrales** salvo que existan, verificadas: (a) autorización expresa del deudor, (b) comunicación(es) previa(s) cumplida(s), y (c) el plazo de 20 días vencido. Una amenaza de reporte falsa o sin sustento es **afirmación engañosa** (ver §5) y viola la Ley 1266.

---

## 5. Estatuto del Consumidor (Ley 1480 de 2011)

Relevancia transversal:
- **Derecho a información veraz, clara, suficiente y no engañosa** (art. 3, 23): toda comunicación de cobro debe ser exacta sobre monto, mora, consecuencias y entidad.
- **Prohibición de información/publicidad engañosa** (arts. 5.13, 29–30): no se puede inducir a error sobre consecuencias legales, montos o reportes.
- **Vigilancia de la SIC** sobre derechos del consumidor.
Fuente: [Ley 1480/2011 – Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306) · [Estatuto del Consumidor – SIC](https://www.sic.gov.co/estatutos-consumidor).

∴ **Toda afirmación del agente sobre montos, intereses, consecuencias legales o reportes debe ser verificable y exacta. Prohibido inflar cifras, inventar "honorarios", o describir consecuencias legales que no se ejecutarán.**

---

## 6. Checklist operativo DO / DON'T (para validar cada acción del agente)

### ✅ DO (permitido / obligatorio)

- ✅ Contactar **solo** Lun–Vie 7:00–19:00 y Sáb 8:00–15:00 (hora Colombia, America/Bogota).
- ✅ Bloquear **domingos y todos los festivos** (Ley 51/1983 – calendario dinámico; ver §7).
- ✅ **Máximo 1 intento de contacto por día** por deudor, **un solo canal por semana** tras el primer contacto.
- ✅ Usar **únicamente canales autorizados** por el arrendatario (WhatsApp y/o voz, según lo que firmó/eligió).
- ✅ **Identificarse** en cada contacto: nombre de la inmobiliaria, que es una gestión de cobranza, obligación a la que se refiere, y **que es un asistente/sistema automatizado** (transparencia T-323/Circular 001).
- ✅ Ofrecer **alternativas y planes de pago** (art. 7 par.) y rutas de pago fáciles.
- ✅ Tratar al deudor con respeto, "usted" neutral-formal, lenguaje claro y de baja complejidad.
- ✅ Respetar de inmediato la **revocatoria de autorización / solicitud de no ser contactado** y el cambio de canal.
- ✅ **Escalar a humano** antes de S5 prejudicial, antes de cualquier mención de reporte a centrales, y cuando la confianza del modelo sea baja.
- ✅ Registrar (log) cada contacto para auditoría/escrutinio humano.
- ✅ Manejar **hardship** con empatía: acuerdos, prórrogas, derivación a un humano.

### ❌ DON'T (prohibido — excluir de toda skill)

- ❌ Contactar domingos, festivos, o fuera del horario.
- ❌ Más de 1 contacto/día o varios canales en la misma semana.
- ❌ Contactar **referencias, familiares, vecinos, empleador** o cualquier tercero (art. 4). *(Codeudor/avalista solo bajo las mismas reglas del deudor.)*
- ❌ **Visitas** al domicilio o lugar de trabajo (art. 6).
- ❌ **Preguntar por qué no pagó** (art. 7).
- ❌ Hostigar: insistencia repetida, tono amenazante, lenguaje intimidatorio, presión psicológica.
- ❌ **Vergüenza pública / shaming:** divulgar la deuda a terceros, grupos de WhatsApp, redes, o "listas de morosos" no autorizadas.
- ❌ **Amenazas** de cárcel, embargo inmediato, "lista negra", o consecuencias legales falsas/ inexistentes.
- ❌ **Afirmaciones falsas/engañosas:** sobre montos, intereses, reportes a Datacrédito, o estatus legal (viola Ley 1480 y Ley 1266).
- ❌ Amenazar/ejecutar **reporte a centrales** sin autorización expresa + comunicación previa + 20 días (Ley 1266/2157).
- ❌ Suplantar abogados, jueces o autoridades.
- ❌ Tomar **decisiones automatizadas de alto impacto sin posibilidad de intervención humana** (T-323, Circular 001, proyecto de datos).
- ❌ Usar datos del deudor para fines distintos al cobro autorizado.

---

## 7. Parámetros exactos a codificar (configuración del agente)

```yaml
contacto:
  zona_horaria: America/Bogota
  ventanas_permitidas:
    lunes_a_viernes: { inicio: "07:00", fin: "19:00" }
    sabado:          { inicio: "08:00", fin: "15:00" }
    domingo:         bloqueado
    festivos:        bloqueado        # calendario dinámico Ley 51/1983
  festivos_fuente: "calendario oficial Colombia (Ley 51/1983 - Ley Emiliani); recalcular por año"

frecuencia:
  max_contactos_por_dia: 1            # por deudor, sumando TODOS los canales
  max_canales_por_semana: 1          # tras el primer 'contacto directo'
  cuenta_como_contacto:
    - llamada_timbrada_sin_responder  # SÍ cuenta (interpretación Superfinanciera)
    - mensaje_enviado                 # SÍ cuenta
  # => incrementar contador con cada INTENTO saliente, no solo con respuestas

canales:
  permitidos: [whatsapp, voz]         # SOLO si autorizados por el deudor
  requiere_autorizacion_previa: true
  respetar_revocatoria: inmediata
  respetar_cambio_de_canal: inmediato

terceros:
  contactar_referencias: false
  contactar_familiares: false
  contactar_empleador: false
  contactar_vecinos: false
  codeudor_avalista: "mismas reglas que el deudor"

prohibiciones_de_conducta:
  preguntar_motivo_mora: false
  visitas_domicilio_o_trabajo: false
  amenazas: false
  shaming_publico: false
  afirmaciones_enganiosas: false
  suplantacion_autoridad: false

disclosures_obligatorios_por_contacto:
  - identidad_inmobiliaria
  - es_gestion_de_cobranza
  - obligacion_referida
  - es_asistente_automatizado   # transparencia IA (T-323 / Circular 001)
  - mecanismo_para_acordar_pago_o_pedir_no_contacto

reporte_centrales_de_riesgo:
  permitido_solo_si:
    - autorizacion_expresa_del_deudor: true
    - comunicacion_previa_enviada: true
    - dias_de_antelacion: 20
    - doble_comunicacion_si_obligacion_<=_15pct_SMLMV: true
  prohibido_amenazar_sin_cumplir_lo_anterior: true

supervision_humana:
  escalar_a_humano_antes_de:
    - etapa_prejudicial_S5
    - cualquier_mencion_de_reporte_a_centrales
    - acuerdos_no_estandarizados
    - confianza_modelo_baja
  logging_auditable: true
  explicabilidad_decisiones: true
```

---

## 8. Matriz de sanciones y autoridad

| Acreedor | Autoridad competente | Marco sancionatorio |
|---|---|---|
| Inmobiliaria / arriendo (no vigilada por Superfinanciera) | **SIC** | Ley 2300 art. 9 + Ley 1266/2008; Estatuto del Consumidor (Ley 1480) |
| Entidad vigilada (banco, fintech) | **Superfinanciera** + SIC | Ley 2300 art. 9 + Ley 1266/2008 |
| Tratamiento indebido de datos / decisiones automatizadas | **SIC (Deleg. Protección de Datos)** | Ley 1581/2012 + Circular 001/2025 |

Las sanciones por habeas data/protección de datos pueden alcanzar **miles de SMLMV** y suspensión de actividades de tratamiento; la SIC sanciona reincidentes. Fuentes: [SIC – sanciones consumidor](https://www.sic.gov.co/sanciones-impuestas-por-la-direcci%C3%B3n-de-investigaciones-de-protecci%C3%B3n-al-consumidor) · [SIC – sanciones protección de datos 2025](https://www.sic.gov.co/sanciones-proteccion-datos-personales-2025).

---

## 9. Banderas de cumplimiento — técnicas globales que SE EXCLUYEN en Colombia

Técnicas comunes en cobranza internacional que **son ilegales o de alto riesgo en Colombia y NO deben usarse**:

1. **Contactar referencias/empleador** ("skip tracing" social) → ilegal (Ley 2300 art. 4).
2. **Llamadas/mensajes de alta frecuencia ("relentless follow-up", power dialing)** → ilegal (1/día, 1 canal/semana).
3. **Contacto nocturno / fines de semana completos / festivos** → ilegal (art. 3).
4. **"Public shaming" / listas de morosos / divulgación a terceros** → ilegal (intimidad + datos).
5. **Amenazas de cárcel/embargo inmediato o consecuencias legales exageradas** → engañoso/intimidatorio (Ley 1480, Ley 2300).
6. **Amenazar reporte a buró sin autorización ni comunicación previa** → ilegal (Ley 1266/2157).
7. **Visitas sorpresa al hogar/trabajo** → ilegal (art. 6).
8. **Preguntar/forzar explicación del impago** → ilegal (art. 7).
9. **Decisiones 100% automatizadas de alto impacto sin opción de intervención humana** → contrario a T-323 / Circular 001 / proyecto de datos.
10. **Tono de culpa/vergüenza, presión psicológica, "guilt nudges" deshonestos** → contrario al deber de trato respetuoso y no engañoso.

---

## 10. Fuentes (primarias y de referencia)

**Primarias / oficiales:**
- Ley 2300 de 2023 — [Función Pública (texto)](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990) · [Secretaría del Senado](http://www.secretariasenado.gov.co/senado/basedoc/ley_2300_2023.html) · [SUIN-Juriscol](https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes/30046853)
- Sentencia T-323 de 2024 — [Corte Constitucional](https://www.corteconstitucional.gov.co/relatoria/2024/t-323-24.htm)
- Ley 1581 de 2012 (Habeas Data) — [Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981)
- Ley 1266 de 2008 (Habeas Data financiero) — [Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=34488)
- Ley 2157 de 2021 (Borrón y Cuenta Nueva) — [Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=173246)
- Ley 1480 de 2011 (Estatuto del Consumidor) — [Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306) · [SIC](https://www.sic.gov.co/estatutos-consumidor)
- Reporte a centrales de riesgo — [Superfinanciera](https://www.superfinanciera.gov.co/publicaciones/11293/consumidor-financieroinformacion-generalinformacion-al-consumidor-financierolo-que-usted-debe-saberreporte-de-datos-a-las-centrales-de-riesgo-11293/)
- Circular Externa SIC 001 de 2025 / Proyecto de Ley de datos — [SIC – ABC proyecto datos](https://sedeelectronica.sic.gov.co/noticias/abc-del-proyecto-de-ley-de-proteccion-de-datos-personales-en-colombia)

**Análisis / doctrina de referencia:**
- Concepto SIC N° 23-463720 (aplicación a contratos civiles/arriendo) — [G&D Consulting](https://www.gydconsulting.com/como-aplica-la-ley-2300-del-2023-a-cobranzas-por-contratos-civiles-concepto-sic-n-23-463720/)
- Interpretación "contacto directo" — [OCH Group (concepto Superfinanciera)](https://www.ochgroup.co/wp-content/uploads/2025/08/2023111476.pdf) · [Ámbito Jurídico](https://www.ambitojuridico.com/noticias/mercantil/financiero-cambiario-y-seguros/entidades-financieras-no-podran-llamar-cobrar-los)
- Circular 001/2025 y datos — [COLCOB](https://colcob.com/proteccion-de-datos-personales-en-colombia)
- CONPES 4144 / IA — [Guía legal IA 2025](https://blog.arielapp.co/inteligencia-artificial-en-colombia-2025-guia-legal-del-conpes-4144-y-la-sic-para-abogados-y-empresas/)
- Ley 2300 práctica — [TusDatos](https://www.tusdatos.co/blog/ley-2300-dejen-de-fregar) · [Ciclo de Riesgo – 15 aspectos](https://www.cicloderiesgo.com/colombia/viviendo-la-cobranza/15-aspectos-relevantes-de-la-ley-2300)
- T-323 análisis — [U. Externado](https://propintel.uexternado.edu.co/resumen-de-la-sentencia-t-323-de-2024-de-la-corte-constitucional-de-colombia-sobre-el-uso-de-ia-por-jueces-de-la-republica/)
- Reporte arriendo a centrales — [Con Toda Propiedad](https://contodapropiedad.com/reporte-a-centrales-de-riesgos-por-no-pago-de-cuotas-de-administracion/)

---

*Documento de cumplimiento. Vigencia verificada a junio 2026. La regulación de IA y datos en Colombia está en evolución (Circular 001/2025, CONPES 4144, proyecto de ley de datos): revisar cada 6 meses. No constituye asesoría legal; validar con counsel antes del despliegue en producción.*
