# Estrategia Global + Digital de Cobranza y Cobranza Conductual

**Para:** Agente autónomo de cobranza ("cobranza") de Leasefy — arrendamiento residencial, Colombia
**Alcance de este documento:** Estrategia global y digital + cobranza conductual. Diseño de cadencia omnicanal, segmentación y scoring conductual (capacidad vs. voluntad de pago), self-cure / autoservicio y reducción de fricción, mejores prácticas digital-first, gestión de promesas de pago (PTP), estrategia temprana vs. tardía, selección de "tratamiento", y las métricas que de verdad mueven la aguja.
**Fecha:** 2026-06-02
**Confianza general:** Alta en hallazgos cuantitativos de fuentes tier-1/tier-2 (McKinsey, PNAS, TransUnion vía ACA, TrueAccord). Media en cifras de proveedores (Symend, Colektia, agregadores de vendors) — se marcan como tales. El marco legal colombiano es restrictivo y **manda sobre cualquier técnica global**: lo que choca con la ley se EXCLUYE explícitamente al final.

---

## 0. Marco de cumplimiento colombiano (LÍMITES DUROS — leer primero)

Todo lo que sigue está filtrado por estas reglas. **Ninguna táctica de "lift" justifica violarlas.** El creador legítimo (la inmobiliaria) cobra arriendo residencial legítimamente adeudado; eso no autoriza presión, engaño ni acoso.

### 0.1 Ley 2300 de 2023 — "Ley dejen de fregar" (conducta de cobranza)
> Nota de exactitud: la norma es **Ley 2300 de 2023** (sancionada el 10 de octubre de 2023), no "2024". El brief la cita como "2300/2024"; se corrige aquí. Vigila a la **Superintendencia Financiera** y a la **Superintendencia de Industria y Comercio (SIC)**, y aplica a personas naturales y jurídicas que adelanten gestiones de cobranza directa, por terceros o por cesión. ([Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990), [tusdatos.co](https://www.tusdatos.co/blog/ley-2300-dejen-de-fregar))

Reglas operativas que el agente DEBE codificar:
- **Horarios permitidos:** Lunes a viernes 7:00 a.m.–7:00 p.m.; sábados 8:00 a.m.–3:00 p.m. **Prohibido** domingos y festivos. ([tusdatos.co](https://www.tusdatos.co/blog/ley-2300-dejen-de-fregar), [clickabogados](https://www.clickabogadosyasociados.com/post/ley-2300-regula-canales-autorizados-horarios-y-periodicidad-para-adelantar-gestiones-de-cobranza))
- **Frecuencia:** Una vez establecido contacto directo con el consumidor, **no más de un contacto por día** y **no se le puede contactar por varios canales dentro de una misma semana**. En la práctica: **máximo 1 contacto/día y, tras contacto directo establecido, esencialmente 1 gestión/semana**. ([tusdatos.co](https://www.tusdatos.co/blog/ley-2300-dejen-de-fregar))
- **Canales:** Solo los **autorizados por el consumidor**: llamada telefónica, WhatsApp, correo electrónico y/o SMS. ([tusdatos.co](https://www.tusdatos.co/blog/ley-2300-dejen-de-fregar))
- **Prohibido:** contactar **referencias personales o terceros**; visitas al **domicilio o lugar de trabajo** con fines de cobro; **indagar las razones del no pago**; cualquier contacto en domingos/festivos. ([tusdatos.co](https://www.tusdatos.co/blog/ley-2300-dejen-de-fregar))
- **Excepción:** comunicaciones que **confirman operaciones monetarias** (p. ej. confirmación de un pago recibido) pueden ocurrir sin restricción de horario. ([tusdatos.co](https://www.tusdatos.co/blog/ley-2300-dejen-de-fregar))

### 0.2 Sentencia T-323 de 2024 (Corte Constitucional — IA y control humano)
Emitida el 2 de agosto de 2024. Aunque surgió en contexto de un juez usando IA, fija principios transversales: **la IA no puede sustituir el criterio humano**; debe existir **"control humano significativo"**; la responsabilidad por decisiones asistidas por IA recae **íntegramente en el humano** (no exime alegar "el sistema lo recomendó"); y principios de transparencia, supervisión humana, seguridad, no discriminación e inclusión. ([propintel.uexternado](https://propintel.uexternado.edu.co/resumen-de-la-sentencia-t-323-de-2024-de-la-corte-constitucional-de-colombia-sobre-el-uso-de-ia-por-jueces-de-la-republica/), [Escuela Judicial Rama Judicial](https://escuelajudicial.ramajudicial.gov.co/noticia/decision-innovadora-sentencia-t-323-de-2024-la-inteligencia-artificial-ia-no-puede))

**Implicación de diseño:** decisiones de alto impacto (escalamiento a pre-jurídico, reporte negativo, aserciones legales) requieren **pausa de revisión humana** antes de ejecutarse. Un agente que decide y comunica acciones legales/crediticias de forma totalmente autónoma es riesgoso bajo este precedente.

### 0.3 Ley 1581 de 2012 (Habeas Data) + reglas SIC
- El **tratamiento de datos requiere autorización previa, expresa e informada**; el responsable debe conservar copia de la autorización e informar la finalidad. ([Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981), [tusdatos.co](https://www.tusdatos.co/blog/proteccion-de-datos-personales-en-colombia-ley-1581-de-2012-como-proteger-la-informacion))
- El titular tiene **habeas data**: acceso, rectificación, actualización, supresión, y limitación de divulgación. La SIC es la autoridad: **consultas en máx. 10 días hábiles, reclamos en máx. 15 días hábiles**. ([Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981))
- **Implicación:** el canal (WhatsApp/SMS/email/voz) debe estar **autorizado** y el deudor debe poder ejercer derechos (opt-out, rectificación) fácilmente.

### 0.4 Estatuto del Consumidor (Ley 1480 de 2011)
- Prohíbe **publicidad/información engañosa** (mensaje que no corresponde a la realidad o induce a error) y **cláusulas/prácticas abusivas**. Vigila la SIC; multas hasta **2.000 SMLMV**. ([Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306), [asuntoslegales](https://www.asuntoslegales.com.co/consultorio/proteccion-al-consumidor-consecuencias-de-incumplir-la-ley-1480-de-2011-3875237))
- **Implicación directa a cobranza conductual:** muchas tácticas de "lift" se basan en *framing* de consecuencias. **Toda consecuencia comunicada debe ser verdadera y exacta** (no inventar plazos legales, no exagerar reporte a centrales, no amenazar con acciones que no se van a ejecutar).

---

## 1. La tesis central: qué concretamente sube la tasa de recuperación

La evidencia converge en cinco palancas, en orden aproximado de impacto/ROI para una cartera de arriendo residencial:

1. **Contacto digital-first en el canal y momento preferidos** → mucho mayor tasa de pago que llamada/carta.
2. **Self-cure / autoservicio de bajísima fricción** (link de pago, plan de pagos auto-gestionado) → el deudor resuelve sin agente.
3. **Segmentación conductual** (capacidad vs. voluntad) → tratamiento correcto a la persona correcta.
4. **Mensajería conductual honesta** (claridad, simplicidad, framing veraz, prueba social honesta) → convierte intención en acción.
5. **Test-and-learn (champion/challenger) + métricas que importan** → mejora continua sostenible.

Bancos líderes que aplican **segmentación conductual** han demostrado mejoras de **20–30% en montos recuperados y número de créditos castigados** en segmentos seleccionados. ([McKinsey – customer mandate to digitize](https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/the-customer-mandate-to-digitize-collections-strategies)) Organizaciones que despliegan IA avanzada en cobranza reportan **~40% de caída en costos operativos** con recuperación incrementada; algunos proveedores reportan **hasta +10% en tasa de recuperación y −50% en costos**. ([businessnext](https://www.businessnext.com/blogs/reducing-cost-to-collect-in-mid-sized-banks-while-improving-cure-rates-with-intelligent-collections/), [Symend](https://www.symend.com/blog/7-behavioral-science-tactics-debt-collection)) *(Confianza: cifras de McKinsey alta; cifras de proveedores media — son rangos de marketing.)*

---

## 2. Diseño de cadencia omnicanal (WhatsApp / SMS / email / voz)

### 2.1 Por qué digital-first gana (evidencia dura)

La investigación de McKinsey sobre experiencia del cliente en mora muestra tasas de pago (total o parcial) por canal de **primer contacto**:

| Canal | % que pagó (total/parcial) tras el contacto |
|---|---|
| Pop-up en línea | **92%** |
| Notificación push | **88%** |
| Mensaje de texto (SMS) | **77%** |
| Carta física | **50%** |
| Llamada del cobrador | **48%** |
| Email | (58% según reporte; ver nota) |

Fuente: McKinsey vía resumen de ACA International (cita: 58% email, 77% texto, 88% push, 92% pop-up, 48% llamada, 50% carta). ([ACA International](https://www.acainternational.org/news/the-future-of-debt-collection-compliance-ai-and-the-shift-toward-digital-engagement/)) Los canales favoritos *de los prestamistas* (teléfono, carta, voicemail) son ahora **los menos efectivos** para generar pago; email, texto y notificaciones son los preferidos por el cliente y dan los mejores resultados. ([McKinsey – customer mandate](https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/the-customer-mandate-to-digitize-collections-strategies))

Además, contactar al cliente en su **canal digital preferido** lo hace **12% más propenso a pagar en mora temprana**, subiendo a **30% en mora tardía**; y la proporción que paga *en su totalidad* **se duplica** al contactar por canales digitales. ([McKinsey – customer mandate](https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/the-customer-mandate-to-digitize-collections-strategies))

### 2.2 WhatsApp en Colombia/LatAm es el canal ancla
- WhatsApp es la app de mensajería más usada en Latinoamérica; **80% de los mensajes se abren en los primeros 5 minutos**. ([Truora vía resumen de búsqueda](https://blog.truora.com/en/debt-collection-messages), [resolvepay](https://resolvepay.com/blog/statistics-illustrating-collections-success-by-communication-channel))
- SMS: **open rate >98%**, hasta **45% más de tasa de respuesta que email**. ([resolvepay](https://resolvepay.com/blog/statistics-illustrating-collections-success-by-communication-channel))
- En LatAm, plataformas como Colektia integran **WhatsApp Business + SMS + email + voz automatizada** como infraestructura base, con despliegues que reportan **hasta +25% en recuperación y −30% en costos operativos** en 3–8 semanas. ([Colektia](https://colektia.com/blog/ai-in-debt-collection)) *(Confianza media — cifras de proveedor.)*

### 2.3 Omnicanal supera monocanal (pero respetando el cap legal)
- Estrategias omnicanal elevan la tasa de éxito de cobranza **hasta 25%**; enfoques multicanal muestran **200–300% más respuesta** vs. monocanal, y **~60% de las cobranzas exitosas involucran ≥2 canales**. ([resolvepay](https://resolvepay.com/blog/statistics-illustrating-collections-success-by-communication-channel))
- Clientes contactados por su **canal preferido pagan 15% más rápido**; **teléfono + texto mejora tasa de contacto 40%** y **PTP 18%**. ([resolvepay](https://resolvepay.com/blog/statistics-illustrating-collections-success-by-communication-channel))

> ⚠️ **Choque con Ley 2300:** la regla "no varios canales en una misma semana" tras contacto directo **limita fuertemente** la mezcla simultánea de canales que la literatura global recomienda. El agente NO puede correr una secuencia tipo "SMS → email → llamada en 72h" sobre el mismo deudor en la misma semana una vez establecido contacto directo. Ver §9 (reconciliación legal de cadencia).

### 2.4 Secuenciación de canal por respuesta (patrón global) → adaptado a Colombia

Patrón global de alto rendimiento (NO usar tal cual en Colombia):
> SMS con link de pago → esperar 24h → email con detalle → esperar 48h → llamada de voz. Los que iban a auto-resolver lo hacen por SMS/email; la voz se reserva para quien necesita conversación. ([resumen de búsqueda – Ainora/Tratta](https://ainora.lt/blog/ai-debt-collection-omnichannel-sms-email-voice-rcs))

**Adaptación legal colombiana (recomendada):**
- Usar **un canal preferido como primario por semana**; reservar otros canales para **semanas distintas** o para cuando el deudor **responde/abre conversación** (la respuesta del deudor habilita continuar el hilo dentro de límites razonables).
- La voz como **escalón de tratamiento de mayor esfuerzo**, no como spam paralelo: úsala cuando el digital no resuelve y siempre dentro de horario y del cap de frecuencia.
- Confirmaciones de pago (recibo) van por la **excepción** del Art. de Ley 2300 (operaciones monetarias) y refuerzan el ciclo positivo.

---

## 3. Estrategia temprana vs. tardía (cadencia por etapa S0→S5)

La etapa cambia el **objetivo, el tono y el tratamiento**, no solo la intensidad.

| Etapa | Días aprox. | Objetivo | Tono | Tratamiento recomendado |
|---|---|---|---|---|
| **S0 – Pre-vencimiento / recordatorio** | −3 a +2 | Prevenir el roll a mora; "self-cure" silencioso | Servicio, neutro | Recordatorio amable + link de pago de 1 clic. Aquí está la mayor evidencia de prevención (ver §3.1). |
| **S1 – Mora temprana** | 3–15 | Resolver rápido; activar autoservicio | Empático, asume olvido/imprevisto | Canal preferido digital; link de pago; opción de plan visible. |
| **S2 – Mora establecida** | 16–30 | Diagnóstico capacidad vs. voluntad; PTP o plan | Empático + claro sobre consecuencias *verdaderas* | Ofrecer plan de pagos asequible; capturar PTP estructurada. |
| **S3 – Mora media** | 31–60 | Acuerdo formal; reducir roll a 60+ | Firme-respetuoso, orientado a solución | Plan negociado; recordatorios de PTP; posible llamada de voz. |
| **S4 – Mora tardía** | 61–90 | Maximizar recuperación antes de castigo | Serio, transparente sobre proceso | Tratamiento de mayor esfuerzo; condiciones de pago; **revisión humana** antes de pasos legales. |
| **S5 – Pre-jurídico** | 90+ | Decisión de escalamiento | Formal, factual | **Pausa de control humano (T-323)**; comunicación factual de pasos legales reales, sin amenazas vacías. |

### 3.1 La prevención temprana es la palanca de mayor ROI
Un experimento de campo con **13 millones de personas (PNAS, 2025)** mostró que mensajes diseñados conductualmente **redujeron las moras a 60 días en 0.42 puntos porcentuales** (≈79.800 moras evitadas a escala). Un detalle accionable: describir el ahorro **en términos de porcentaje en vez de pesos** redujo moras **0.14 p.p.** adicionales. ([PNAS](https://www.pnas.org/doi/10.1073/pnas.2416708122), [Symend](https://www.symend.com/blog/7-behavioral-science-tactics-debt-collection)) → **Recordatorios pre-vencimiento (S0) bien diseñados evitan que la deuda entre en mora**, que es más barato que recuperarla.

---

## 4. Segmentación y scoring conductual: capacidad vs. voluntad de pago

### 4.1 El eje central
La distinción operativa más importante: **capacidad de pago** (limitación financiera real) ≠ **voluntad de pago** (lo que el deudor está dispuesto a comprometer). El tratamiento correcto depende de en qué cuadrante cae. ([McKinsey – behavioral insights](https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/behavioral-insights-and-innovative-treatments-in-collections), [C&R Software](https://blog.crsoftware.com/behavioral-segmentation-in-debt-collections))

**Matriz de tratamiento 2×2 (capacidad × voluntad):**

| | **Alta voluntad** | **Baja voluntad** |
|---|---|---|
| **Alta capacidad** | *Olvido / fricción.* Recordatorio simple + link 1-clic. Suele auto-resolver. | *No quiere pagar pese a poder.* Framing de pérdida honesto (qué pierde real y legalmente), claridad de consecuencias verdaderas. Mayor esfuerzo. |
| **Baja capacidad** | *Quiere pero no puede (hardship genuino).* Plan de pagos asequible, empatía, opciones de alivio. **No presionar montos insostenibles.** | *Ni puede ni quiere / en crisis.* Diagnóstico, plan mínimo viable, posible escalamiento humano. |

Symend mapea esto a **arquetipos conductuales**: clientes de *alta capacidad / baja disposición* reciben framing de **aversión a la pérdida y endowment**; clientes de *baja capacidad / alta disposición* reciben **prueba social y simplicidad** (menos fricción, planes fáciles). ([Symend](https://www.symend.com/blog/7-behavioral-science-tactics-debt-collection))

### 4.2 Insumos de scoring (qué predice pago)
- **Value-at-Risk (VAR) segmentation** para priorizar: enrutar a tratamientos low/medium/high/ultra-high según monto en riesgo. ([McKinsey – seven pillars](https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/the-seven-pillars-of-collections-wisdom))
- Modelos de **propensión al repago, predicción de roll, timing óptimo de contacto y next-best-action**. ([Experian / indebted](https://www.indebted.co/blog/guides/putting-your-collections-strategy-to-the-test-with-a-champion-challenger-model/))
- Señales conductuales: respuesta a contactos previos, canal donde responde, historial de PTP cumplidas/rotas, tiempo a apertura del mensaje.

### 4.3 Resultado: menos derivación a atención humana, más auto-resolución
Mejor segmentación permite **derivar menos clientes a atención personal** y desviar a los de **bajo riesgo / self-cure** hacia soluciones digitales orquestadas. ([McKinsey – customer mandate](https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/the-customer-mandate-to-digitize-collections-strategies)) Para arriendo residencial, esto significa: **no llames con voz al inquilino que solo olvidó pagar — mándale un link**; reserva el esfuerzo humano para hardship real o conflicto.

> ⚠️ **Nota T-323:** el scoring que dispara acciones de alto impacto (reporte negativo, pre-jurídico) debe tener **control humano significativo**. El score informa, no decide solo.

---

## 5. Self-cure / autoservicio y reducción de fricción

Esta es, junto con el canal correcto, la palanca con evidencia más fuerte y de mejor ROI.

### 5.1 La magnitud del autoservicio digital
TrueAccord (cobranza 100% digital): **96–98% de los consumidores resuelven su deuda sin ninguna interacción humana**, vía portal de autoservicio; **29% de los pagos ocurren fuera del horario tradicional** de cobranza. En un piloto de 6 meses con tres telcos de EE.UU.: **+35%, +7% y +32% de liquidación**. Un cliente fintech recaudó **USD 500.000 en 9 meses con 95% usando autoservicio**. ([TrueAccord](https://blog.trueaccord.com/2024/10/the-low-friction-way-for-consumers-to-repay-self-serve-options-for-debt-collection/), [debexpert](https://www.debexpert.com/blog/trueaccord-debt-collection)) *(Confianza media-alta; TrueAccord es referente del sector pero es proveedor.)*

Lección clave: **mucha gente prefiere resolver sola, en su horario, sin hablar con nadie.** El 29% pagando fuera de horario laboral muestra demanda real de 24/7 — algo que la voz humana y la Ley 2300 limitan, pero que un **portal/link de autopago siempre disponible sí permite** (el deudor inicia el pago cuando quiere; eso no es "contacto de cobranza").

### 5.2 Tácticas concretas de reducción de fricción
- **Pay-by-link / link de pago de 1 clic** que elimine login y navegación. "Cuando el consumidor puede resolver de inmediato, la recuperación mejora dramáticamente." ([PayNearMe](https://home.paynearme.com/blog/streamline-collections-with-self-service-payments/), [REPAY](https://repay.com/blog/payment-tools-that-help-collections-firms-improve-cure-rates))
- **Plan de pagos autogestionado**: el deudor elige cuánto y cada cuánto, ve opciones de hardship, o disputa — todo sin agente. ([TrueAccord](https://blog.trueaccord.com/2024/10/the-low-friction-way-for-consumers-to-repay-self-serve-options-for-debt-collection/))
- **Pre-llenar el plan** y usar framing de "fácil/rápido" (ver §6.7 ease framing).
- **24/7** disponibilidad del medio de pago (no del contacto saliente).
- Aceptar **débito** para reducir verificación de cuenta. ([REPAY](https://repay.com/blog/payment-tools-that-help-collections-firms-improve-cure-rates))

### 5.3 Diseño de plan de pagos que *se cumple*
- El monto debe ser **sostenible incluso en un "mes apretado"**; los defaults ocurren cuando la cuota se fija demasiado agresiva. ([resumen – planes de pago](https://www.numberanalytics.com/blog/affordability-assessments-101))
- Para hardship genuino: **términos extendidos, cuotas ajustadas**, evaluación de asequibilidad para no comprometer crédito que el deudor no puede sostener. ([numberanalytics](https://www.numberanalytics.com/blog/affordability-assessments-101))
- En arriendo: el objetivo no es solo recuperar el atraso, sino **mantener al inquilino al día hacia adelante** — un plan insostenible rompe ambas cosas.

---

## 6. Cobranza conductual: las 7 tácticas (honestas) y cómo usarlas

Marco de Symend, respaldado por evidencia de campo. **Filtro ético/legal:** cada táctica se usa con información **verdadera** (Estatuto del Consumidor prohíbe info engañosa) y sin acoso. Resultados agregados reportados por Symend: **+152% engagement vs. enfoques legados, hasta +10% recuperación, −85% interacciones de agente**; PNAS: **−0.42 p.p. moras a 60 días**. ([Symend](https://www.symend.com/blog/7-behavioral-science-tactics-debt-collection), [PNAS](https://www.pnas.org/doi/10.1073/pnas.2416708122)) *(Confianza: agregados de Symend media; PNAS alta.)*

1. **Aversión a la pérdida** — la pérdida pesa ~2× una ganancia equivalente. Enmarcar lo que el deudor *realmente* arriesga (no inventado). Framing como pérdida puede ser **~2× más efectivo** que como recompensa. ([McKinsey – behavioral](https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/behavioral-insights-and-innovative-treatments-in-collections), [Symend](https://www.symend.com/blog/7-behavioral-science-tactics-debt-collection))
   - ✅ Permitido en CO: "Si te pones al día hoy evitas el reporte a centrales de riesgo" — **solo si el reporte es real y procede legalmente**.
   - ❌ Prohibido: inventar un embargo inminente o un plazo legal falso.
2. **Descuento temporal** — la gente valora el presente; hacer la recompensa de resolver **inmediata y concreta**: "Al pagar hoy, tu estado se actualiza de una vez."
3. **Sesgo de simplicidad** — bajo estrés financiero baja el ancho de banda cognitivo; ofrecer **2–3 opciones máximo, una pre-seleccionada**. El **54% de clientes en mora quiere soluciones a su medida, no menús indiferenciados**. ([Symend](https://www.symend.com/blog/7-behavioral-science-tactics-debt-collection))
4. **Prueba social (honesta)** — normalizar resolver: "La mayoría de inquilinos en tu situación se pone al día en pocos días." **Solo si es verdad** (Estatuto del Consumidor).
5. **Efecto dotación** — la gente sobrevalora lo que ya tiene; enmarcar en proteger la relación/historial existente: "Llevas X años al día; un pago protege ese historial."
6. **Anclaje** — mostrar primero el saldo total, luego la cuota del plan, luego el desglose diario/semanal. (PNAS: porcentaje vs. pesos cambia comportamiento.)
7. **Ease framing** — enmarcar la acción como fácil/rápida; pre-llenar, opt-out en vez de opt-in, una sola pulsación: "Te dejamos listo un plan de 3 meses. [Confirmar] o [Cambiar]."

Dato de tono: **71% de los clientes se sienten abrumados o ansiosos** al recibir mensajes del acreedor → la empatía no es opcional, es palanca de conversión. ([Symend](https://www.symend.com/blog/7-behavioral-science-tactics-debt-collection))

### 6.1 Personalización (lift medible y honesto)
- Email **personalizado con datos del cliente**: **+20% engagement**, **+29% open rate** vs. genérico. ([resolvepay](https://resolvepay.com/blog/statistics-illustrating-collections-success-by-communication-channel))
- Personalización + segmentación puede multiplicar CTR varias veces (segmentar elevó CTR de 3.45% a 38.8% en un caso de marketing). ([superoffice](https://www.superoffice.com/blog/email-click-through-rates/)) *(Confianza media; cifra de marketing general, no de cobranza específica.)*
- En voz: **análisis de sentimiento en tiempo real**; al detectar angustia, **bajar el ritmo, tono empático, ofrecer hardship o pago diferido proactivamente**. ([Ainora](https://ainora.lt/ai-debt-collection), [Moveo.AI](https://moveo.ai/humanized-debt-collection-and-repayments))

---

## 7. Gestión de promesas de pago (PTP)

### 7.1 Definiciones y fórmulas
- **PTP rate** = (contactos con compromiso de pago) / (right-party contacts). ([Tratta](https://www.tratta.io/blog/kpi-collection-debt-metrics))
- **PTP kept rate** = (promesas cumplidas) / (promesas hechas) × 100. Ej.: 85/100 = 85%. También medible en dinero: **dólares recibidos en/antes de la fecha prometida / dólares prometidos**. ([Tratta](https://www.tratta.io/blog/kpi-collection-debt-metrics), [OpsDog](https://opsdog.com/products/percentage-of-inbound-promises-to-pay-kept))
- PTP + RPC juntos dan la mejor foto de eficiencia operativa. ([Tratta](https://www.tratta.io/blog/kpi-collection-debt-metrics))

### 7.2 Qué sube la tasa de PTP cumplidas
- **PTP estructurada con fecha y monto concretos** (no "le pago luego"); anclar a fecha específica.
- **Recordatorio de PTP antes de la fecha prometida** por el canal preferido (refuerza compromiso) — respetando cap de frecuencia.
- **Link de pago adjunto a la promesa** para que cumplir sea de 1 clic (ease framing).
- **PTP asequible**: una promesa demasiado alta se rompe; mejor un monto que el deudor pueda sostener.
- Llamada + texto de seguimiento mejora PTP **18%** (úsese sin violar el cap semanal). ([resolvepay](https://resolvepay.com/blog/statistics-illustrating-collections-success-by-communication-channel))
- Un PTP kept rate **bajo** suele indicar guiones/handling ineficientes, disputas o promesas mal calibradas → señal de mejora de tratamiento. ([Tratta](https://www.tratta.io/blog/kpi-collection-debt-metrics))

> ⚠️ La **confirmación de pago recibido** cae en la excepción de Ley 2300 (operación monetaria) y cierra el loop positivo. El **recordatorio de PTP** sí cuenta como gestión de cobranza y consume el cap de frecuencia.

---

## 8. Métricas que de verdad mueven la aguja

Norte estratégico: maximizar **recuperación neta por peso gastado**, no actividad.

| Métrica | Fórmula | Por qué importa | Fuente |
|---|---|---|---|
| **Liquidation / recovery rate** | Total recaudado / total asignado × 100 (recoveries / placements) | KPI maestro de resultado | [OpsDog](https://opsdog.com/products/collections-liquidation-rate) |
| **Roll rate (roll-forward)** | $ que pasó de un bucket de mora al siguiente / $ del bucket origen | Mide si la intervención temprana frena el deterioro | [Tratta](https://www.tratta.io/blog/kpi-collection-debt-metrics) |
| **Cure rate** | Cuentas que vuelven a estar al día / cuentas en mora | Efectividad de etapa temprana | [bridgeforce](https://bridgeforce.com/insights/credit-union-collections-kpis-2026/) |
| **Right-Party Contact (RPC) rate** | Contactos con el deudor correcto / intentos | Precisión de datos + estrategia de contacto | [Tratta](https://www.tratta.io/blog/kpi-collection-debt-metrics) |
| **PTP rate** | PTP / RPC | Calidad de negociación | [Tratta](https://www.tratta.io/blog/kpi-collection-debt-metrics) |
| **PTP kept rate** | Promesas cumplidas / hechas | Fiabilidad del compromiso y del cash-flow | [OpsDog](https://opsdog.com/products/percentage-of-inbound-promises-to-pay-kept) |
| **Cost per peso/dollar collected** | Gasto total de cobranza / total recaudado | ROI; crítico al pasar de humano a tech | [OpsDog](https://opsdog.com/categories/kpis-and-metrics/collections) |

**Métricas secundarias / operativas:** open rate y CTR por canal, tiempo a primera resolución, % auto-resuelto sin humano (proxy de éxito digital), tasa de opt-out/quejas (proxy de fricción/cumplimiento), tasa de escalamiento a humano.

**Cómo se mueven juntas (cadena causal):**
> Canal+momento correcto → ↑RPC/engagement → ↑PTP → (link 1-clic + PTP asequible) → ↑PTP kept → ↑cure / ↓roll → ↑liquidation, y con automatización → ↓cost-per-peso.

### 8.1 Test-and-learn (champion/challenger) — el motor de mejora
Probar la estrategia vigente (**champion**) contra una variante (**challenger**) en una **muestra**, antes de desplegar a toda la cartera. Permite optimizar timing, tono, frecuencia, canal y next-best-action de forma data-driven, mejorando cure/roll/liquidation/cost-to-collect. ([Experian](https://www.experian.com/blogs/insights/championchallenger-collections-strategy-testing/), [indebted](https://www.indebted.co/blog/guides/putting-your-collections-strategy-to-the-test-with-a-champion-challenger-model/), [FICO](https://www.fico.com/blogs/benefits-championchallenger-testing-decision-management)) → Para el agente: cada guion/secuencia debe ser **versionable y A/B-testeable** con holdout.

---

## 9. Reconciliación: estrategia global ⇄ ley colombiana (la parte crítica)

La literatura global asume EE.UU./Europa con caps de frecuencia mucho más laxos. **Colombia es más estricta.** Cómo conservar el "lift" sin violar la ley:

| Práctica global de lift | Estado en Colombia | Adaptación |
|---|---|---|
| Secuencia multicanal en 72h (SMS→email→voz) sobre mismo deudor | ❌ Viola "no varios canales en una semana" tras contacto directo | Un canal primario/semana; cambia de canal entre semanas o cuando el deudor responde |
| Múltiples toques/día para subir contactabilidad | ❌ Máx 1 contacto/día | Cadencia espaciada; calidad > volumen |
| Cobranza 24/7 saliente | ❌ Solo L-V 7–19, sáb 8–15; no domingos/festivos | Autoservicio (link/portal) sí 24/7 — lo inicia el deudor, no es contacto saliente |
| Contactar referencias / empleador / vecinos | ❌ Prohibido | Nunca. Solo el deudor, canal autorizado |
| Framing de pérdida agresivo / consecuencias | ⚠️ Permitido si es VERDADERO | Solo consecuencias reales y procedentes; nada inventado (Estatuto Consumidor) |
| Prueba social ("87% resolvió en 7 días") | ⚠️ Permitido si es VERDADERO | Usar cifras reales de la cartera, no inventadas |
| Decisión autónoma de escalamiento legal/reporte | ⚠️ Riesgo bajo T-323 | Pausa de control humano antes de pasos de alto impacto |
| Indagar por qué no paga (para diagnóstico) | ❌ La ley prohíbe "indagar las razones del no pago" | Ofrecer opciones/planes sin interrogar; dejar que el deudor comparta voluntariamente |

---

## 10. Recomendaciones accionables para el agente de cobranza

1. **Digital-first, canal preferido, dentro de horario legal.** WhatsApp como ancla en Colombia; voz como escalón de mayor esfuerzo, no spam paralelo. (Lift: pago 12–30% mayor por canal preferido; texto/push/pop-up >> llamada/carta.)
2. **Self-cure por defecto.** Cada mensaje lleva **link de pago de 1 clic** y acceso a **plan de pagos autogestionado 24/7**. Meta: que la mayoría resuelva sin humano (referente TrueAccord ~96%).
3. **Segmentar por capacidad × voluntad** y enrutar tratamiento (matriz §4.1). Score informa, **humano decide** lo de alto impacto (T-323).
4. **Mensajería conductual honesta**: simplicidad (2–3 opciones), framing veraz de consecuencias reales, empatía explícita, pre-llenado. Nada engañoso (Estatuto del Consumidor).
5. **PTP estructurada**: fecha + monto + link adjunto + recordatorio pre-fecha (respetando cap). Confirmar pago recibido (excepción legal) para cerrar loop positivo.
6. **Cadencia por etapa S0→S5** con objetivo/tono distintos; **invertir fuerte en S0–S1** (prevención = mayor ROI, PNAS).
7. **Caps de frecuencia legales como restricción dura** en el orquestador: ≤1 contacto/día, no multicanal en una semana tras contacto directo, horario L-V 7–19 / sáb 8–15, nunca domingos/festivos, nunca terceros.
8. **Medir lo que importa**: liquidation, roll, cure, RPC, PTP, PTP-kept, cost-per-peso, %auto-resuelto, opt-out/quejas. Correr **champion/challenger con holdout** sobre cada guion/secuencia.
9. **Hardship con dignidad**: planes asequibles ("mes apretado"), sin presión a montos insostenibles; el objetivo en arriendo es mantener al inquilino al día hacia adelante, no romperlo.
10. **Opt-out y habeas data fáciles** en todos los canales (Ley 1581) — además de cumplimiento, reduce quejas y protege reputación.

---

## 11. Técnicas globales EXCLUIDAS por ilegales/no éticas en Colombia

(Marcadas para que NUNCA entren al agente.)

- **Contactar referencias, terceros, empleador, vecinos o familiares** del deudor. (Ley 2300)
- **Visitas al domicilio o lugar de trabajo** con fines de cobro. (Ley 2300)
- **Contacto en domingos/festivos o fuera de 7–19 L-V / 8–15 sáb.** (Ley 2300)
- **Múltiples contactos por día o multicanal en una misma semana** tras contacto directo. (Ley 2300)
- **Indagar las razones del no pago** (interrogatorio). (Ley 2300)
- **Amenazas, hostigamiento, lenguaje vejatorio, "shaming"**, llamadas reiteradas para presionar. (Ley 2300 / dignidad)
- **Afirmaciones legales/crediticias falsas o exageradas**: amenazar embargo/cárcel/plazos inexistentes, exagerar el reporte a centrales. (Estatuto del Consumidor — info engañosa; Ley 2300)
- **Usar canales no autorizados** por el titular o tratar datos sin autorización. (Ley 1581)
- **Decisiones autónomas de alto impacto sin control humano** (reporte negativo, pre-jurídico decidido 100% por IA). (Sentencia T-323/2024)
- **Prueba social o consecuencias inventadas** ("87% ya pagó" si no es cierto). (Estatuto del Consumidor)

---

## 12. Fuentes principales

**Tier-1 / referentes de industria**
- McKinsey — *The customer mandate to digitize collections strategies*: https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/the-customer-mandate-to-digitize-collections-strategies
- McKinsey — *Behavioral insights and innovative treatments in collections*: https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/behavioral-insights-and-innovative-treatments-in-collections
- McKinsey — *The seven pillars of (collections) wisdom*: https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/the-seven-pillars-of-collections-wisdom
- McKinsey — *Going digital in collections*: https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/going-digital-in-collections-to-improve-resilience-against-credit-losses
- PNAS (2025) — *Behavioral nudges prevent loan delinquencies at scale (13M field experiment)*: https://www.pnas.org/doi/10.1073/pnas.2416708122
- ACA International — *The Future of Debt Collection: Compliance, AI and the Shift Toward Digital Engagement* (cita stats McKinsey/TransUnion): https://www.acainternational.org/news/the-future-of-debt-collection-compliance-ai-and-the-shift-toward-digital-engagement/

**Proveedores / industria (confianza media — marcado en texto)**
- TrueAccord — *Self-serve options for debt collection*: https://blog.trueaccord.com/2024/10/the-low-friction-way-for-consumers-to-repay-self-serve-options-for-debt-collection/
- Symend — *7 Behavioral Science Tactics in Debt Collection*: https://www.symend.com/blog/7-behavioral-science-tactics-debt-collection
- Colektia (LatAm) — *AI in Debt Collection*: https://colektia.com/blog/ai-in-debt-collection
- Experian — *Champion/Challenger collections strategy testing*: https://www.experian.com/blogs/insights/championchallenger-collections-strategy-testing/
- C&R Software — *Behavioral segmentation in debt collections*: https://blog.crsoftware.com/behavioral-segmentation-in-debt-collections
- resolvepay — *Statistics illustrating collections success by communication channel*: https://resolvepay.com/blog/statistics-illustrating-collections-success-by-communication-channel
- Tratta — *KPIs to measure debt collection success*: https://www.tratta.io/blog/kpi-collection-debt-metrics
- OpsDog — *Collections KPIs (liquidation, PTP kept)*: https://opsdog.com/categories/kpis-and-metrics/collections
- REPAY / PayNearMe — *Payment tools & self-service to improve cure rates*: https://repay.com/blog/payment-tools-that-help-collections-firms-improve-cure-rates · https://home.paynearme.com/blog/streamline-collections-with-self-service-payments/

**Marco legal colombiano (tier-1 oficial)**
- Ley 2300 de 2023 — Función Pública: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990
- Ley 2300 — resumen aplicado (tusdatos.co): https://www.tusdatos.co/blog/ley-2300-dejen-de-fregar
- Ley 2300 — canales/horarios/periodicidad (clickabogados): https://www.clickabogadosyasociados.com/post/ley-2300-regula-canales-autorizados-horarios-y-periodicidad-para-adelantar-gestiones-de-cobranza
- Sentencia T-323 de 2024 — resumen (U. Externado): https://propintel.uexternado.edu.co/resumen-de-la-sentencia-t-323-de-2024-de-la-corte-constitucional-de-colombia-sobre-el-uso-de-ia-por-jueces-de-la-republica/
- Sentencia T-323 de 2024 — Escuela Judicial Rama Judicial: https://escuelajudicial.ramajudicial.gov.co/noticia/decision-innovadora-sentencia-t-323-de-2024-la-inteligencia-artificial-ia-no-puede
- Ley 1581 de 2012 (Habeas Data) — Función Pública: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981
- Ley 1480 de 2011 (Estatuto del Consumidor) — Función Pública: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306

---

*Nota de método: investigación digital-first con búsqueda web + fetch; cifras de fuentes tier-1 (McKinsey, PNAS, normas oficiales) priorizadas; cifras de proveedores marcadas como media confianza por ser material de marketing. Toda táctica de "lift" pasó por el filtro legal colombiano; lo no conforme se excluyó en §11. La corrección "Ley 2300 de 2023 (no 2024)" se verificó contra fuente oficial.*
