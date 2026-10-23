/* ════════════════════════════════════════════════════════════════════
   Los textos de producción, tal cual (src/lib/landing/products.ts) y las
   pantallas REALES del panel (src/lib/landing/capturas.ts): «Tu Inmobiliaria»,
   la inmobiliaria de demostración. Coordenadas en % de la captura.
   ════════════════════════════════════════════════════════════════════ */
window.ALT = {
  "p/crm-pipeline": "Embudo comercial de Leasefy con los interesados de cada etapa",
  "p/crm-detalle": "Detalle de un interesado con su asesor y su siguiente acción",
  "p/crm-origenes": "Origen de los leads por portal y su conversión",
  "p/crm-postulaciones": "Postulaciones de inquilinos con su estudio",
  "p/erp-tablero": "Tablero financiero: lo que entró, lo que deben y el porcentaje recaudado",
  "p/erp-recaudo": "Recaudo del mes contra el mes anterior, día a día",
  "p/erp-dispersiones": "Dispersiones a propietarios con su comisión y su neto",
  "p/erp-renovaciones": "Renovaciones de contratos con el canon propuesto por IPC",
  "p/cob-resumen": "Agente de cobranza: lo que espera tu decisión y lo que recuperó",
  "p/cob-cartera": "Cartera partida por días de mora",
  "p/cob-whatsapp": "Conversación de WhatsApp del agente con un inquilino que pide plazo",
  "p/conc-resumen": "Conciliación bancaria: lo que cruzó el agente y lo que dejó para revisar",
  "p/conc-movimientos": "Movimientos del extracto con el cruce que sugiere el agente",
  "p/aseg-resumen": "Asegurabilidad: cotizaciones del día contra varias aseguradoras",
  "p/match-ofrecer": "Qué ofrecer: los inmuebles que le sirven a un interesado y por qué",
  "p/inq-detalle": "Detalle de una postulante con su estudio de asegurabilidad",
  "p/ava-lista": "Avalúos de la inmobiliaria con su valor y su certificado",
  "clips/ava-comparables": "Comparables de arriendo de la zona usados para el canon",
  "clips/ava-estado": "Puntaje de estado del inmueble, área por área",
  "clips/ava-tiempo": "Estrategias de precio: el canon y la vacancia estimada de cada una"
};
window.ORDEN = ["crm", "erp", "cobranza", "inquilino", "avaluos", "conciliacion", "matching", "asegurabilidad"];
window.PROD = {
  crm: {
    grupo: "sistema", n: "01", eyebrow: "Sistema · Módulo 01", badge: "CRM", name: "CRM inmobiliario", tag: "Tu comercial de punta a punta", hora: "08:02",
    h1: "Tu comercial, de punta a punta",
    lead: "Cada interesado, cada inmueble y cada asesor viviendo en un solo embudo — sin planillas ni chats sueltos.",
    stories: [
      ["Captura", "Todo entra solo, con contexto", "WhatsApp, portales y referidos caen al mismo embudo con presupuesto, fechas y necesidad ya organizados. Nada de copiar y pegar entre chats y planillas."],
      ["Seguimiento", "Cada asesor sabe qué sigue", "Tareas, tiempos de respuesta y recordatorios viven en el caso. Si una conversación se enfría, el CRM la sube antes de que se pierda el cierre."],
      ["Cierre", "La historia completa en el expediente", "Cada visita, oferta y documento queda en su caso. Cuando llega la firma, el contrato se arma con lo que ya existe — y pasa directo al ERP."]
    ],
    caps: [
      ["Pipeline en tiempo real", "Cada solicitud con su etapa, su dueño y su siguiente paso, visible para todos."],
      ["Matching automático", "Cruza interesado e inventario al instante y sugiere opciones que sí van a cerrar."],
      ["Comisiones y metas por asesor", "Lo que gana cada uno en el mes y cómo va contra su meta."],
      ["Origen de cada lead", "Qué portal trae a cada interesado y cuántos terminan en contrato."]
    ],
    ficha: [
      ["Módulo", "<b>CRM inmobiliario</b> · núcleo comercial del sistema"],
      ["Reemplaza a", "Planillas, chats sueltos y agendas personales"],
      ["Se conecta con", "WhatsApp, portales, correo"],
      ["Alimenta a", "Matching, Estudio del inquilino, ERP"],
      ["Entrada en operación", "Primera semana, con tu inventario cargado"],
      ["Incluido en", "Todos los planes"]
    ],
    pasos: [
      ["Cargamos tu inventario y tu equipo", "Inmuebles, asesores y etapas quedan montados contigo, no a punta de manuales."],
      ["Conectamos tus canales", "WhatsApp, portales y correo empiezan a alimentar el embudo solos."],
      ["Tu embudo queda vivo", "Desde ese día, ninguna solicitud vuelve a depender de la memoria de nadie."]
    ],
    noche: ["Un martes cualquiera, 8:02 a.m.", "Ningún interesado se queda <em>sin respuesta</em>", "El embudo deja de depender de la memoria del equipo: cada conversación queda donde toca, con su historia completa."],
    demo: "Te mostramos el CRM operando con tu inventario y tus canales reales.",
    obj: "equipo",
    portada: "p/crm-pipeline", oscura: "p/crm-pipeline-oscuro",
    notas: [[41, 80, "Cada interesado con su siguiente paso"], [63, 33, "Los arriendos cerrados del mes"]],
    reco: [["p/crm-origenes", [19, 52, 79, 46], "Cada portal, con sus leads y su conversión"], ["p/crm-detalle", [61, 66, 37, 27], "Asesor, días en la etapa y lo que sigue"], ["p/crm-postulaciones", [18, 44, 80, 52], "Cada postulación con su estado y su estudio"]],
    clips: [["pipeline", [26, 62, 72, 38], "Embudo"], ["matching", [18, 52, 80, 46], "Qué ofrecer"], ["crm-comisiones", [18, 14, 80, 72], "Comisiones y metas"], ["p/crm-origenes", [19, 52, 79, 46], "Orígenes"]]
  },
  erp: {
    grupo: "sistema", n: "02", eyebrow: "Sistema · Módulo 02", badge: "ERP", name: "ERP de arriendos", tag: "La plata en orden, sola", hora: "01:00",
    h1: "La plata, en orden y sola",
    lead: "La parte más pesada del arriendo, el dinero, en una operación trazable y sin sorpresas al cierre de mes.",
    stories: [
      ["Contratos", "Vigencias que se cuidan solas", "Cada contrato sabe cuándo vence, cuándo ajusta canon y qué debe cobrar este mes. Las renovaciones avisan antes de volverse un problema."],
      ["Recaudo", "Cada pago, cuadrado contra el banco", "El cobro sale solo, el pago entra y se concilia contra el extracto. Lo que no cuadra salta de una — no en la semana del cierre."],
      ["Propietarios", "Pagos e informes puntuales", "Cada propietario recibe su pago programado y su informe mensual sin que nadie los arme a mano. La retención empieza por ahí."]
    ],
    caps: [
      ["Contratos y vigencias", "Cánones, ajustes y vencimientos bajo control, con alertas antes de que duelan."],
      ["Cobros automáticos", "El cobro del mes se genera y se recuerda solo, contrato por contrato."],
      ["Conciliación bancaria", "Cada pago encuentra su contrato contra el extracto, todos los días."],
      ["Comisiones solas", "Se calculan y liquidan con cada recaudo, sin planilla de fin de mes."]
    ],
    ficha: [
      ["Módulo", "<b>ERP de arriendos</b> · núcleo financiero del sistema"],
      ["Reemplaza a", "El Excel del cierre y las planillas de cobros"],
      ["Se conecta con", "Tu banco (extractos), CRM, agentes de Cobranza y Conciliación"],
      ["Cierre de mes", "<b>Horas, no semanas</b>"],
      ["Entrada en operación", "Desde la segunda semana, con contratos migrados"],
      ["Incluido en", "Planes con módulo financiero"]
    ],
    pasos: [
      ["Migramos tus contratos", "Cánones, vigencias y condiciones entran al sistema tal como son."],
      ["Conectamos extractos y cobros", "El recaudo y la conciliación empiezan a correr en automático."],
      ["El mes se cierra solo", "Tesorería revisa excepciones, no persigue pagos."]
    ],
    noche: ["Día 1 del mes, 1:00 a.m.", "El cierre de mes deja de ser <em>una pelea</em>", "Contratos, cobros, pagos y comisiones en una sola línea trazable — sin el Excel de los viernes."],
    demo: "Te mostramos el ERP con contratos y cobros como los tuyos.",
    obj: "datafono",
    portada: "p/erp-tablero", oscura: "p/erp-tablero-oscuro",
    notas: [[88, 58, "Cuánto va recaudado, al día"], [48, 58, "Lo que entró este mes"]],
    reco: [["p/erp-renovaciones", [18, 40, 80, 55], "Cada vencimiento con su canon propuesto"], ["p/erp-recaudo", [18, 41, 80, 32], "Lo que se debe, lo que llegó y lo que falta"], ["p/erp-dispersiones", [18, 26, 80, 32], "Lo girado a cada propietario, con su neto"]],
    clips: [["erp-renovaciones", [18, 40, 80, 55], "Renovaciones"], ["recaudo", [18, 41, 80, 32], "Recaudo"], ["conc-movimientos", [18, 8, 80, 62], "Conciliación"], ["dispersiones", [18, 66, 80, 34], "Dispersiones"]]
  },
  cobranza: {
    grupo: "agentes", n: "01", eyebrow: "Agentes IA · 01", badge: "Agente", name: "Cobranza", tag: "La mora se persigue sola", hora: "02:14",
    h1: "La mora se persigue sola",
    lead: "Recordatorios, seguimiento y escalamiento con tono humano, sin que nadie de tu equipo levante el teléfono.",
    stories: [
      ["Detección", "La mora se ve venir", "El agente cruza cobros y pagos todos los días: detecta el atraso el día uno, no cuando el propietario llama a preguntar por su plata."],
      ["Gestión", "Cobra con tono humano", "Recordatorios por WhatsApp que suenan a tu inmobiliaria — cordiales primero, firmes después. Cada respuesta queda registrada en el contrato."],
      ["Escalamiento", "Tu equipo entra al final", "Solo los casos que necesitan criterio humano llegan a tu equipo — con la historia completa y el siguiente paso sugerido."]
    ],
    caps: [
      ["Recordatorios automáticos", "Por WhatsApp y correo, con la voz de tu inmobiliaria, sin turnos ni festivos."],
      ["Detección temprana", "El atraso se ve el día uno, cuando todavía es fácil de resolver."],
      ["Escalamiento con criterio", "De suave a firme, y a humano solo cuando de verdad hace falta."],
      ["Registro completo", "Cada llamada, pago y nota quedan en el caso del deudor, con su hora."]
    ],
    ficha: [
      ["Agente", "<b>Cobranza</b> · L-AG-01"],
      ["Corre", "24/7, sin turnos ni festivos"],
      ["Canales", "WhatsApp, correo"],
      ["Se alimenta de", "ERP de arriendos (cobros y pagos)"],
      ["Supervisión", "Tu equipo aprueba los casos escalados"],
      ["Incluido en", "Planes con agentes IA"]
    ],
    pasos: [
      ["Define tono y reglas", "Decides cómo suena tu cobranza y cuándo escala. El agente obedece eso."],
      ["El agente toma tu cartera", "Desde el primer día gestiona la mora existente, no solo la nueva."],
      ["Solo revisas los escalados", "Tu equipo ve excepciones con contexto, no listas de morosos."]
    ],
    noche: ["Mientras duermes, 2:14 a.m.", "A las 2 a.m. el agente <em>sigue cobrando</em>", "Recordatorios con tono humano, cada gestión registrada, y tu equipo solo entra cuando de verdad hace falta."],
    demo: "Te mostramos al agente gestionando una cartera como la tuya.",
    obj: "campana",
    portada: "p/cob-resumen", oscura: "p/cob-resumen-oscuro",
    notas: [[56, 42, "Sólo lo que pide tu decisión"], [38, 74, "Lo que recuperó el agente"]],
    reco: [["p/cob-cartera", [18, 30, 80, 34], "La cartera partida por días de mora"], ["p/cob-whatsapp", [18, 26, 56, 58], "Mori escribe con la voz de tu inmobiliaria"], ["p/cob-resumen", [18, 25, 80, 35], "A tu equipo le llega lo que necesita una persona"]],
    clips: [["cob-whatsapp", [18, 26, 56, 58], "WhatsApp"], ["cob-cartera", [18, 30, 80, 34], "Cartera"], ["cob-resumen", [18, 25, 80, 35], "Te toca a ti"], ["cob-deudor", [18, 22, 80, 58], "Historial del caso"]]
  },
  inquilino: {
    grupo: "agentes", n: "02", eyebrow: "Agentes IA · 02", badge: "Agente", name: "Estudio del inquilino", tag: "Verificación en minutos", hora: "10:21",
    h1: "Verificación real, en minutos",
    lead: "Identidad, capacidad de pago y comportamiento de cada candidato, verificados contra fuentes reales — sin papeleo.",
    stories: [
      ["Identidad", "Sabes quién es, de verdad", "Documento, antecedentes y consistencia de datos se verifican solos. Lo que un asistente tarda una mañana en llamar, el agente lo resuelve en minutos."],
      ["Capacidad", "Sabes si puede pagar", "Ingresos contra canon, obligaciones vigentes y comportamiento de pago, leídos de las fuentes — no del formulario que llenó el candidato."],
      ["Veredicto", "Decides con score, no con corazonadas", "Un semáforo claro con su sustento: por qué sí, por qué no, y qué condiciones mitigarían el riesgo. Listo para pasar a la firma o a Asegurabilidad."]
    ],
    caps: [
      ["Documentos en un lugar", "Cédula, extractos y carta laboral adjuntos al candidato."],
      ["Hasta cuánto respaldan las aseguradoras", "El monto máximo y el veredicto de cada una."],
      ["Score de riesgo", "Un veredicto claro con sustento, por candidato."],
      ["Todas las postulaciones a la vista", "Estado y estudio de cada candidato en una lista, para decidir sin perseguir a nadie."]
    ],
    ficha: [
      ["Agente", "<b>Estudio del inquilino</b> · L-AG-02"],
      ["Tiempo por estudio", "Minutos"],
      ["Revisa", "Identidad, ingresos, obligaciones, comportamiento de pago"],
      ["Se conecta con", "CRM (candidatos), Asegurabilidad"],
      ["Entrega", "Score + veredicto con sustento, listo para firma"],
      ["Incluido en", "Planes con agentes IA"]
    ],
    pasos: [
      ["El candidato llega del CRM", "Con su caso ya armado: inmueble, canon y datos de contacto."],
      ["El agente verifica y puntúa", "Identidad, capacidad y comportamiento, contra fuentes reales."],
      ["Firmas con el semáforo claro", "Veredicto con sustento — y pase directo a Asegurabilidad."]
    ],
    noche: ["10:21 a.m., un estudio real", "El estudio deja de tardar <em>tres días</em>", "Identidad, capacidad de pago y comportamiento en un solo veredicto — antes de que el candidato se enfríe."],
    demo: "Corremos un estudio real de principio a fin contigo.",
    obj: "sello",
    portada: "p/inq-detalle", oscura: "p/inq-detalle-oscuro",
    notas: [[75, 62, "El monto máximo asegurable"], [75, 30, "Candidata aprobada, lista para contrato"]],
    reco: [["p/crm-postulaciones", [18, 44, 80, 52], "Cada candidato con su estudio"], ["p/inq-detalle", [53, 42, 45, 42], "Hasta cuánto respaldan las aseguradoras"], ["p/inq-detalle", [53, 20, 45, 20], "Un veredicto claro para decidir"]],
    clips: [["inq-documentos", [57, 10, 42, 60], "Documentos"], ["inq-aseguradoras", [57, 10, 42, 60], "Aseguradoras"], ["inq-riesgo", [57, 8, 42, 70], "Riesgo"], ["crm-postulaciones", [18, 26, 80, 70], "Postulaciones"]]
  },
  avaluos: {
    grupo: "agentes", n: "03", eyebrow: "Agentes IA · 03", badge: "Agente", name: "Avalúos", tag: "El precio correcto", hora: "11:02",
    h1: "El precio correcto, con datos",
    lead: "Cada inmueble con el canon del mercado real de tu ciudad: ni sobrevalorado ni regalado.",
    stories: [
      ["Comparables", "Tu zona, no promedios nacionales", "El agente arma el comparativo con arriendos reales del sector — mismo estrato, misma tipología, mismo momento del mercado."],
      ["Ajustes", "El inmueble real, no el ideal", "Acabados, cocina, baños y conservación se califican área por área, y el puntaje se entrega junto al canon: se ve lo que se está arrendando de verdad."],
      ["Sustento", "Un precio que se puede defender", "Cuando el propietario pida más, no discutes con opiniones: le muestras el comparativo, los ajustes y el tiempo estimado de arriendo a cada precio."]
    ],
    caps: [
      ["Comparables de zona", "Arriendos reales del sector, no promedios de portal."],
      ["Canon en segundos", "Pides el avalúo y sale el rango con su sustento."],
      ["Estado del inmueble", "Acabados, cocina, baños y conservación, calificados uno por uno."],
      ["Tiempo de arriendo a cada precio", "Arrendar rápido, el recomendado o maximizar: cada canon con su vacancia estimada."]
    ],
    ficha: [
      ["Agente", "<b>Avalúos</b> · L-AG-03"],
      ["Datos", "Mercado real de tu ciudad, por zona"],
      ["Responde en", "Segundos"],
      ["Entrega", "Rango de canon + comparativo + tiempo estimado"],
      ["Se conecta con", "CRM (inventario), Matching"],
      ["Incluido en", "Planes con agentes IA"]
    ],
    pasos: [
      ["Cargas el inmueble", "Dirección, tipología y estado. Lo demás lo trae el agente."],
      ["El agente arma el comparativo", "Comparables, ajustes y rango sugerido, con sustento."],
      ["Publicas con precio defendible", "Y el propietario recibe el porqué, no una cifra suelta."]
    ],
    noche: ["11:02 a.m., un avalúo real", "Ni sobrevalorado <em>ni regalado</em>", "Un canon anclado al mercado real de tu ciudad arrienda más rápido y discute menos."],
    demo: "Avaluamos en vivo un inmueble tuyo, con comparables reales.",
    obj: "calculadora",
    portada: "p/ava-lista", oscura: "p/ava-lista-oscuro",
    notas: [[71, 49, "El valor de cada inmueble, firmado"], [88, 56, "El certificado, listo para el propietario"]],
    reco: [["clips/ava-comparables", [17, 8, 66, 62], "Arriendos de la zona, uno por uno"], ["clips/ava-estado", [17, 8, 66, 58], "El estado de cada área, calificado"], ["clips/ava-tiempo", [17, 8, 66, 80], "Cada canon con su vacancia estimada"]],
    clips: [["ava-comparables", [17, 6, 66, 66], "Comparables"], ["ava-canon", [17, 14, 66, 70], "Canon"], ["ava-estado", [17, 6, 66, 62], "Estado"], ["ava-tiempo", [17, 6, 66, 82], "Tiempo de arriendo"]]
  },
  conciliacion: {
    grupo: "agentes", n: "04", eyebrow: "Agentes IA · 04", badge: "Agente", name: "Conciliación", tag: "Cuadre contra el banco", hora: "06:10",
    h1: "Cuadre contra el banco, sin Excel",
    lead: "El cruce entre extracto y contrato deja de ser un Excel de viernes: cada pago encuentra su contrato solo.",
    stories: [
      ["Cruce", "Banco y contratos, en la misma línea", "El agente lee el extracto y encuentra el contrato de cada pago: por referencia, por monto, por historia. El cuadre deja de ser un deporte de viernes."],
      ["Excepciones", "Lo raro salta solo", "Referencias ambiguas, montos parciales, pagos duplicados: el agente los separa con una sugerencia de resolución, en vez de esconderlos en el promedio."],
      ["Trazabilidad", "Cada peso con su historia", "De cada movimiento del extracto puedes llegar al contrato, al cobro y al informe del propietario. Auditoría sin arqueología."]
    ],
    caps: [
      ["Cruce automático", "Extracto contra contratos, todos los días, sin planilla."],
      ["Alertas de no identificados", "Lo que no cuadra se ve hoy, no al cierre."],
      ["Avance a la vista", "Cuántos movimientos cruzó el agente, con su tasa y el monto conciliado."],
      ["Trazabilidad total", "Cada peso del banco con su inquilino, su cuota y su inmueble, y quién lo concilió."]
    ],
    ficha: [
      ["Agente", "<b>Conciliación</b> · L-AG-04"],
      ["Corre", "Con cada extracto, todos los días"],
      ["Se alimenta de", "Extractos bancarios + ERP de arriendos"],
      ["Resuelve", "Cruce banco–contrato, referencias ambiguas, parciales"],
      ["Escala", "Solo pagos sin identificar"],
      ["Incluido en", "Planes con agentes IA"]
    ],
    pasos: [
      ["Conectas el extracto", "El banco entra al sistema tal como llega."],
      ["El agente cruza todo", "Cruce por referencia, monto e historia de pago."],
      ["Tesorería solo ve excepciones", "Dos casos con sugerencia, no doscientas filas."]
    ],
    noche: ["6:10 a.m., llega el extracto", "El extracto se cuadra <em>solo</em>", "Cada peso del extracto sabe a qué contrato pertenece — y lo que no cuadra salta de una."],
    demo: "Conciliamos un extracto real contigo en la demo.",
    obj: "banco",
    portada: "p/conc-resumen", oscura: "p/conc-resumen-oscuro",
    notas: [[52, 40, "Sólo lo que pide tu ojo"], [78, 59, "Cuánto concilió el agente"]],
    reco: [["p/conc-movimientos", [18, 8, 80, 62], "Cada línea del banco con su cuota"], ["p/conc-resumen", [18, 34, 80, 18], "Lo que no cuadra, dicho en palabras"], ["p/conc-resumen", [18, 63, 80, 34], "Quién concilió qué, y cuándo"]],
    clips: [["conc-movimientos", [55, 8, 30, 62], "Cruce sugerido"], ["conc-resumen", [18, 34, 80, 18], "Hallazgos"], ["conc-avance", [18, 50, 80, 30], "Avance"], ["conc-actividad", [18, 10, 80, 76], "Actividad"]]
  },
  matching: {
    grupo: "agentes", n: "05", eyebrow: "Agentes IA · 05", badge: "Agente", name: "Matching", tag: "Opciones el mismo día", hora: "09:31",
    h1: "Opciones reales, el mismo día",
    lead: "El agente cruza necesidad, presupuesto e inventario al instante — cada interesado recibe opciones que sí aplican.",
    stories: [
      ["Cruce", "Inventario y necesidad, al instante", "Zona, presupuesto, alcobas, mascotas, fechas: el agente cruza todo contra el inventario vivo y descarta lo que no aplica antes de que nadie pierda una visita."],
      ["Prioridad", "Primero lo que sí va a cerrar", "No son 20 links: son 3 opciones ordenadas por probabilidad de cierre, con el porqué de cada una. El asesor sale a visitar con tiro hecho."],
      ["Aprendizaje", "Cada cierre lo vuelve mejor", "El agente registra qué se visitó, qué gustó y qué cerró. Con cada arriendo, las próximas opciones llegan más afinadas para tu zona."]
    ],
    caps: [
      ["Cruce automático", "Necesidad contra inventario vivo, sin repasar listas a mano."],
      ["Se liberó un inmueble", "Te dice a qué interesados del embudo les sirve, con su porqué."],
      ["Prioriza por cierre", "Pocas opciones bien ordenadas, no un catálogo."],
      ["Menos visitas perdidas", "Ninguna se confirma sin asesor, y el recordatorio queda listo 24 horas antes."]
    ],
    ficha: [
      ["Agente", "<b>Matching</b> · L-AG-05"],
      ["Responde en", "El mismo día, normalmente en minutos"],
      ["Cruza", "Necesidad, presupuesto, inventario vivo"],
      ["Se alimenta de", "CRM + Avalúos"],
      ["Mejora con", "Cada arriendo cerrado"],
      ["Incluido en", "Planes con agentes IA"]
    ],
    pasos: [
      ["Llega el interesado", "Del CRM, con su necesidad ya estructurada."],
      ["El agente cruza y prioriza", "Contra el inventario vivo, con probabilidad de cierre."],
      ["El asesor visita con tiro hecho", "Opciones enviadas, visita agendada, comentarios registrados."]
    ],
    noche: ["9:31 a.m., entra un interesado", "Nadie espera <em>una semana</em> por opciones", "El agente cruza necesidad, presupuesto e inventario al instante — y aprende de cada arriendo cerrado."],
    demo: "Cruzamos tu inventario real con casos de interesados.",
    obj: "mapa",
    portada: "p/match-ofrecer", oscura: "p/match-ofrecer-oscuro",
    notas: [[92, 55, "El calce de cada inmueble, con su porqué"], [40, 46, "Presupuesto y tope asegurable a la vista"]],
    reco: [["p/match-ofrecer", [18, 44, 80, 10], "Lo que busca, con su presupuesto real"], ["p/match-ofrecer", [18, 52, 80, 46], "Primero lo que sí va a cerrar"], ["p/crm-pipeline", [26, 62, 72, 38], "Lo que se cierra vuelve al embudo"]],
    clips: [["matching", [18, 34, 80, 62], "Cruce"], ["match-liberado", [18, 32, 80, 62], "Se liberó"], ["match-calce", [18, 42, 80, 56], "Prioridad"], ["crm-visitas", [18, 14, 80, 74], "Visitas"]]
  },
  asegurabilidad: {
    grupo: "agentes", n: "06", eyebrow: "Agentes IA · 06", badge: "Agente", name: "Asegurabilidad", tag: "Contratos protegidos", hora: "12:04",
    h1: "Contratos protegidos desde la firma",
    lead: "El agente evalúa y gestiona la asegurabilidad de cada contrato — propietarios tranquilos desde el día uno.",
    stories: [
      ["Evaluación", "Asegurable o no, antes de firmar", "Con el estudio del inquilino en la mano, el agente evalúa la asegurabilidad del contrato antes de que se firme — no cuando ya hay un problema."],
      ["Gestión", "Las aseguradoras cotizan a la vez", "Nada de mandar correos uno por uno: las aseguradoras integradas cotizan en paralelo y llega un veredicto listo para firmar."],
      ["Vigencia", "Renovaciones que avisan solas", "Las pólizas no se vencen en silencio: el agente avisa con tiempo, gestiona la renovación y deja el rastro en el contrato."]
    ],
    caps: [
      ["Radar del día", "Cotizaciones de hoy, tasa de aprobación y prima promedio, de un vistazo."],
      ["Cotización integrada", "Aseguradoras en paralelo, veredicto en minutos."],
      ["Cobertura desde la firma", "El contrato nace protegido, no queda en trámite."],
      ["Alertas de renovación", "Vencimientos avisados con tiempo, gestionados y registrados."]
    ],
    ficha: [
      ["Agente", "<b>Asegurabilidad</b> · L-AG-06"],
      ["Evalúa", "Cada contrato antes de la firma"],
      ["Cotiza con", "Aseguradoras integradas, en paralelo"],
      ["Se conecta con", "Estudio del inquilino, ERP"],
      ["Avisa", "Vencimientos y renovaciones, con tiempo"],
      ["Incluido en", "Planes con agentes IA"]
    ],
    pasos: [
      ["El contrato llega del CRM", "Con el estudio del inquilino ya resuelto."],
      ["El agente evalúa y cotiza", "Aseguradoras en paralelo, veredicto listo para firma."],
      ["Se firma con cobertura activa", "Y las renovaciones quedan vigiladas desde el día uno."]
    ],
    noche: ["12:04 p.m., contrato nuevo", "El propietario duerme <em>tranquilo</em>", "Cada contrato se firma con su protección resuelta — y las renovaciones no se vencen en silencio."],
    demo: "Evaluamos la asegurabilidad de un contrato tuyo en vivo.",
    obj: "escudo",
    portada: "p/aseg-resumen", oscura: "p/aseg-resumen-oscuro",
    notas: [[30, 27, "Las cotizaciones del día"], [88, 45, "El veredicto de cada aseguradora"]],
    reco: [["p/aseg-resumen", [18, 36, 80, 58], "Varias aseguradoras a la vez"], ["p/inq-detalle", [53, 42, 45, 42], "Hasta cuánto respalda cada una"], ["p/crm-postulaciones", [18, 44, 80, 52], "El estudio viaja con la postulación"]],
    clips: [["aseg-indicadores", [18, 24, 80, 24], "Indicadores"], ["asegurabilidad", [18, 36, 80, 58], "Cotizaciones"], ["ctr-respaldo", [2, 20, 96, 34], "Respaldo"], ["erp-renovaciones", [18, 40, 80, 55], "Renovaciones"]]
  }
};
