// @ts-nocheck
/* eslint-disable */
/**
 * products-data — datos de las 8 páginas de producto de la landing-v2,
 * portados 1:1 del renderer del index.html standalone (objeto PRODUCTS + TEXOF).
 * Data pura (sin funciones). Algunos strings contienen HTML inline (<em>, <b>,
 * <span class="lb">…) que se renderiza con dangerouslySetInnerHTML en ProductPage.
 */

export type ProductSlug =
  | "crm" | "erp" | "cobranza" | "inquilino"
  | "avaluos" | "conciliacion" | "matching" | "asegurabilidad";

export const PRODUCTS: Record<string, any> = {
    crm: { k:'Sistema · Módulo 01', badge:'CRM', t:'CRM inmobiliario',
      promise:'Tu comercial, de punta a punta',
      lead:'Cada interesado, cada inmueble y cada asesor viviendo en un solo pipeline — sin planillas ni chats sueltos.',
      win:{ t:'Leasefy · CRM — Pipeline', tag:'En vivo', v:[
        { t:'rows', hd:['Hoy','23 solicitudes','sys'], d:{ r:[['Sin atender','0','ok'],['Respuesta media','12 min'],['Visitas agendadas','7','mb']] } },
        { t:'steps', hd:['Caso L-2481','Pipeline','sys'], d:{ s:[['Solicitud capturada','WhatsApp · 8:02 a.m.','done'],['Contexto armado','presupuesto, fechas, mascotas','done'],['Asignada a Laura','SLA 15 min','on'],['Visita','por agendar','']] } },
        { t:'chat', hd:['WhatsApp · Laura','8:14 a.m.','chat'], d:{ m:[['in','Busco apto de 2 alcobas en Laureles, presupuesto $3M','8:02'],['out','Te tengo 3 opciones que encajan. ¿Te las envío y agendamos visita hoy?','8:14']] } } ] },
      feats:[
        { k:'Captura', h:'Todo entra solo, con contexto', p:'WhatsApp, portales y referidos caen al mismo pipeline con presupuesto, fechas y necesidad ya organizados. Nada de copiar y pegar entre chats y planillas.',
          v:{ t:'chat', hd:['WhatsApp · entrada','8:02 a.m.','chat'], d:{ m:[['in','Hola! vi el apto de la Cra 34, ¿sigue disponible? Tengo un perrito 🐶','8:02'],['out','¡Sigue! Y acepta mascotas. ¿Para cuándo lo necesitas?','8:03'],['in','Para el 1 de agosto','8:04']] } } },
        { k:'Seguimiento', h:'Cada asesor sabe qué sigue', p:'Tareas, tiempos de respuesta y recordatorios viven en el caso. Si una conversación se enfría, el CRM la sube antes de que se pierda el cierre.',
          v:{ t:'rows', hd:['Equipo','Hoy','sys'], d:{ r:[['Laura','8 casos · 12 min resp.'],['Andrés','6 casos · 9 min resp.'],['Sin atender','0','ok']] } } },
        { k:'Cierre', h:'La historia completa en el expediente', p:'Cada visita, oferta y documento queda en su caso. Cuando llega la firma, el contrato se arma con lo que ya existe — y pasa directo al ERP.',
          v:{ t:'doc', hd:['Expediente','CT-1042','sys'], st:'Listo para firma', d:{ t:'CT-1042 · Apto 402', l:['3 visitas · oferta aceptada','Estudio del inquilino aprobado','Documentos completos','Pasa a ERP de arriendos'] } } } ],
      caps:[ ['Pipeline en tiempo real','Cada solicitud con su etapa, su dueño y su siguiente paso, visible para todos.'],['Matching automático','Cruza interesado e inventario al instante y sugiere opciones que sí van a cerrar.'],['Tiempos por asesor','Sabes quién responde en minutos y quién deja enfriar — sin perseguir a nadie.'],['Historial completo','Cada conversación, visita y oferta queda en el caso, no en el teléfono de alguien.'] ],
      specs:[ ['Módulo','<b>CRM inmobiliario</b> · núcleo comercial del sistema'],['Reemplaza a','Planillas, chats sueltos y agendas personales'],['Se conecta con','WhatsApp, portales, correo'],['Alimenta a','Matching, Estudio del inquilino, ERP'],['Entrada en operación','Primera semana, con tu inventario cargado'],['Incluido en','Todos los planes'] ],
      steps:[ ['Cargamos tu inventario y tu equipo','Inmuebles, asesores y etapas quedan montados contigo, no a punta de manuales.'],['Conectamos tus canales','WhatsApp, portales y correo empiezan a alimentar el pipeline solos.'],['Tu pipeline queda vivo','Desde ese día, ninguna solicitud vuelve a depender de la memoria de nadie.'] ],
      night:{ k:'Un martes cualquiera, 8:02 a.m.', h:'Ningún interesado se queda <em>sin respuesta</em>', q:'El pipeline deja de depender de la memoria del equipo: cada conversación queda donde toca, con su historia completa.', logs:[ ['08:02','Nueva solicitud · Apto 402 · Laureles → <span class="lb">pipeline</span>'],['08:02','Contexto armado: presupuesto, fechas, mascotas'],['08:03','Asignada a Laura · SLA de respuesta 15 min'],['08:14','Primera respuesta enviada · <span class="lb">WhatsApp</span>'],['18:40','Resumen del día: 23 solicitudes · 0 sin atender'] ] },
      cx:'Te mostramos el CRM operando con tu inventario y tus canales reales.' },

    erp: { k:'Sistema · Módulo 02', badge:'ERP', t:'ERP de arriendos',
      promise:'La plata, en orden y sola',
      lead:'La parte más pesada del arriendo, el dinero, en una operación trazable y sin sorpresas al cierre de mes.',
      win:{ t:'Leasefy · ERP — Recaudo de marzo', tag:'Conciliado', v:[
        { t:'stat', hd:['Recaudo','Marzo','sys'], d:{ big:'$182.4M', l:'Recaudado este mes', s:'de $184.2M · 214 contratos' } },
        { t:'ledger', hd:['Cobros de hoy','Banco','sys'], d:{ c:['Contrato','Pago','Estado'], r:[['CT-1042','$2.450.000','Conciliado','ok'],['CT-1103','$1.980.000','Conciliado','ok'],['CT-0977','$3.120.000','→ Cobranza','mb']] } },
        { t:'rows', hd:['Salidas','Programadas','sys'], d:{ r:[['Propietarios','41 pagos · viernes'],['Comisiones','Liquidadas solas','ok'],['Cierre de mes','En horas','mb']] } } ] },
      feats:[
        { k:'Contratos', h:'Vigencias que se cuidan solas', p:'Cada contrato sabe cuándo vence, cuándo ajusta canon y qué debe cobrar este mes. Las renovaciones avisan antes de volverse un problema.',
          v:{ t:'steps', hd:['CT-1042','Vigencia','sys'], d:{ s:[['Contrato firmado','CT-1042 · hace 4 meses','done'],['Ajuste de canon','enero · IPC aplicado','done'],['Aviso de renovación','8 meses antes del vencimiento','on'],['Renovación anticipada','+12 meses aceptada','']] } } },
        { k:'Recaudo', h:'Cada pago, cuadrado contra el banco', p:'El cobro sale solo, el pago entra y se concilia contra el extracto. Lo que no cuadra salta de una — no en la semana del cierre.',
          v:{ t:'ledger', hd:['Extracto','6:12 a.m.','sys'], d:{ c:['Movimiento','Contrato','Match'], r:[['$2.450.000','CT-1042','Exacto','ok'],['$1.980.000','CT-1103','Exacto','ok'],['$840.000','—','Revisar','mb']] } } },
        { k:'Propietarios', h:'Pagos e informes puntuales', p:'Cada propietario recibe su pago programado y su informe mensual sin que nadie los arme a mano. La retención empieza por ahí.',
          v:{ t:'doc', hd:['Informe mensual','Marzo','sys'], st:'Enviado ✓', d:{ t:'Carlos M. · Propietario', l:['Informe enviado · pago recibido','Pago programado · viernes','Renovación anticipada · +12 meses'] } } } ],
      caps:[ ['Contratos y vigencias','Cánones, ajustes y vencimientos bajo control, con alertas antes de que duelan.'],['Cobros automáticos','El cobro del mes se genera y se recuerda solo, contrato por contrato.'],['Conciliación bancaria','Cada pago encuentra su contrato contra el extracto, todos los días.'],['Comisiones solas','Se calculan y liquidan con cada recaudo, sin planilla de fin de mes.'] ],
      specs:[ ['Módulo','<b>ERP de arriendos</b> · núcleo financiero del sistema'],['Reemplaza a','El Excel del cierre y las planillas de cobros'],['Se conecta con','Tu banco (extractos), CRM, agentes de Cobranza y Conciliación'],['Cierre de mes','<b>Horas, no semanas</b>'],['Entrada en operación','Desde la segunda semana, con contratos migrados'],['Incluido en','Planes con módulo financiero'] ],
      steps:[ ['Migramos tus contratos','Cánones, vigencias y condiciones entran al sistema tal como son.'],['Conectamos extractos y cobros','El recaudo y la conciliación empiezan a correr en automático.'],['El mes se cierra solo','Tesorería revisa excepciones, no persigue pagos.'] ],
      night:{ k:'Día 1 del mes, 1:00 a.m.', h:'El cierre de mes deja de ser <em>una pelea</em>', q:'Contratos, cobros, pagos y comisiones en una sola línea trazable — sin el Excel de los viernes.', logs:[ ['01:00','Cobros del mes generados · 214 contratos'],['06:12','Pago recibido · CT-1042 · <span class="lb">$2.450.000</span>'],['06:12','Conciliado contra el banco · match exacto'],['09:00','Pago a propietario programado · viernes'],['09:01','Comisión liquidada sola · sin planilla'] ] },
      cx:'Te mostramos el ERP con contratos y cobros como los tuyos.' },

    cobranza: { k:'Agentes AI · 01', badge:'Agente', t:'Cobranza',
      promise:'La mora se persigue sola',
      lead:'Recordatorios, seguimiento y escalamiento con tono humano, sin que nadie de tu equipo levante el teléfono.',
      win:{ t:'Leasefy · Agente de cobranza', tag:'Corriendo 24/7', v:[
        { t:'rows', hd:['Cartera','Hoy','ag'], d:{ r:[['En mora','3 de 214','mb'],['Promesas de pago','2 registradas'],['Escalados a humano','1 · con contexto','ok']] } },
        { t:'chat', hd:['WhatsApp · CT-1077','2:14 a.m.','chat'], d:{ m:[['out','Hola Carlos, ¿cómo estás? Te recuerdo el pago del apto 402, venció hace 3 días. ¿Te reenvío los datos?','2:14'],['in','Uy sí, se me pasó. El viernes pago','2:20'],['out','Listo, queda registrada tu promesa para el viernes ✓','2:20']] } },
        { t:'steps', hd:['Escalamiento','Reglas tuyas','ag'], d:{ s:[['Día 1 · recordatorio suave','WhatsApp · tono cordial','done'],['Día 5 · seguimiento','con datos de pago','done'],['Día 10 · tono firme','aviso de reporte','on'],['Día 14 · escala a humano','llamada sugerida','']] } } ] },
      feats:[
        { k:'Detección', h:'La mora se ve venir', p:'El agente cruza cobros y pagos todos los días: detecta el atraso el día uno, no cuando el propietario llama a preguntar por su plata.',
          v:{ t:'stat', hd:['Detección','Cruce diario','ag'], d:{ big:'Día <em>1</em>', l:'Detección del atraso', s:'no el día 30 · cruce diario banco–contratos' } } },
        { k:'Gestión', h:'Cobra con tono humano', p:'Recordatorios por WhatsApp que suenan a tu inmobiliaria — cordiales primero, firmes después. Cada respuesta queda registrada en el contrato.',
          v:{ t:'chat', hd:['WhatsApp · seguimiento','9:00 a.m.','chat'], d:{ m:[['out','Carlos, seguimos sin registrar tu pago. ¿Pasa algo con lo acordado del viernes?','9:00'],['in','Disculpa, hoy en la tarde queda','9:12'],['out','Gracias por confirmar. Queda anotado — cualquier cosa me escribes','9:12']] } } },
        { k:'Escalamiento', h:'Tu equipo entra al final', p:'Solo los casos que necesitan criterio humano llegan a tu equipo — con la historia completa y el siguiente paso sugerido.',
          v:{ t:'doc', hd:['Caso escalado','Día 14','ag'], st:'→ Humano', d:{ t:'CT-0912 · Sin respuesta', l:['6 gestiones registradas','2 promesas incumplidas','Contexto completo en el caso','Siguiente paso: llamada directa'] } } } ],
      caps:[ ['Recordatorios automáticos','Por WhatsApp y correo, con la voz de tu inmobiliaria, sin turnos ni festivos.'],['Detección temprana','El atraso se ve el día uno, cuando todavía es fácil de resolver.'],['Escalamiento con criterio','De suave a firme, y a humano solo cuando de verdad hace falta.'],['Registro completo','Cada gestión y cada respuesta quedan en el contrato, auditable.'] ],
      specs:[ ['Agente','<b>Cobranza</b> · L-AG-01'],['Corre','24/7, sin turnos ni festivos'],['Canales','WhatsApp, correo'],['Se alimenta de','ERP de arriendos (cobros y pagos)'],['Supervisión','Tu equipo aprueba los casos escalados'],['Incluido en','Planes con agentes AI'] ],
      steps:[ ['Define tono y reglas','Decides cómo suena tu cobranza y cuándo escala. El agente obedece eso.'],['El agente toma tu cartera','Desde el primer día gestiona la mora existente, no solo la nueva.'],['Solo revisas los escalados','Tu equipo ve excepciones con contexto, no listas de morosos.'] ],
      night:{ k:'Mientras duermes, 2:14 a.m.', h:'A las 2 a.m. el agente <em>sigue cobrando</em>', q:'Recordatorios con tono humano, cada gestión registrada, y tu equipo solo entra cuando de verdad hace falta.', logs:[ ['02:14','Recordatorio enviado · CT-1077 · día 3 · <span class="lb">WhatsApp</span>'],['02:15','Respuesta recibida: promesa de pago · viernes'],['02:15','Promesa registrada en el contrato'],['08:00','Caso escalado a humano · día 14 · llamada sugerida'],['08:01','Resumen: 12 gestiones · 9 respuestas · 3 promesas'] ] },
      cx:'Te mostramos al agente gestionando una cartera como la tuya.' },

    inquilino: { k:'Agentes AI · 02', badge:'Agente', t:'Estudio del inquilino',
      promise:'Verificación real, en minutos',
      lead:'Identidad, capacidad de pago y comportamiento de cada candidato, verificados contra fuentes reales — sin papeleo.',
      win:{ t:'Leasefy · Estudio A-118', tag:'4 minutos', v:[
        { t:'steps', hd:['Estudio A-118','4 minutos','ag'], d:{ s:[['Identidad verificada','documento válido · 10:22','done'],['Capacidad de pago','ingresos 2.4× el canon','done'],['Comportamiento','sin moras en 24 meses','done'],['Veredicto','riesgo bajo → firma','on']] } },
        { t:'rows', hd:['Andrés F.','CC 1.043.···','ag'], d:{ r:[['Ingresos vs canon','2.4×','ok'],['Obligaciones','Al día'],['Moras últimos 24 m.','0','ok']] } },
        { t:'doc', hd:['Veredicto','A-118','ag'], st:'Riesgo bajo', d:{ t:'Andrés Felipe R.', l:['Identidad y antecedentes en orden','Capacidad de pago verificada','Listo para Asegurabilidad'] } } ] },
      feats:[
        { k:'Identidad', h:'Sabes quién es, de verdad', p:'Documento, antecedentes y consistencia de datos se verifican solos. Lo que un asistente tarda una mañana en llamar, el agente lo resuelve en minutos.',
          v:{ t:'steps', hd:['Identidad','90 segundos','ag'], d:{ s:[['Documento válido','registro nacional','done'],['Antecedentes','sin señales','done'],['Datos cruzados','teléfono, correo, empleador','done'],['Identidad confirmada','en 90 segundos','on']] } } },
        { k:'Capacidad', h:'Sabes si puede pagar', p:'Ingresos contra canon, obligaciones vigentes y comportamiento de pago, leídos de las fuentes — no del formulario que llenó el candidato.',
          v:{ t:'stat', hd:['Capacidad de pago','Verificada','ag'], d:{ big:'2.4×', l:'Ingresos sobre el canon', s:'obligaciones al día · sin moras 24 m.' } } },
        { k:'Veredicto', h:'Decides con score, no con corazonadas', p:'Un semáforo claro con su sustento: por qué sí, por qué no, y qué condiciones mitigarían el riesgo. Listo para pasar a la firma o a Asegurabilidad.',
          v:{ t:'doc', hd:['Estudio A-118','4 min','ag'], st:'Riesgo bajo', d:{ t:'Veredicto con sustento', l:['Score claro por candidato','Razones detalladas en el caso','Pase directo a Asegurabilidad'] } } } ],
      caps:[ ['Identidad y antecedentes','Verificación real contra fuentes, no una foto de la cédula en un chat.'],['Capacidad de pago','Ingresos, obligaciones y comportamiento leídos en minutos.'],['Score de riesgo','Un veredicto claro con sustento, por candidato.'],['Minutos, no días','El candidato bueno no se enfría esperando un estudio de 3 días.'] ],
      specs:[ ['Agente','<b>Estudio del inquilino</b> · L-AG-02'],['Tiempo por estudio','Minutos'],['Revisa','Identidad, ingresos, obligaciones, comportamiento de pago'],['Se conecta con','CRM (candidatos), Asegurabilidad'],['Entrega','Score + veredicto con sustento, listo para firma'],['Incluido en','Planes con agentes AI'] ],
      steps:[ ['El candidato llega del CRM','Con su caso ya armado: inmueble, canon y datos de contacto.'],['El agente verifica y puntúa','Identidad, capacidad y comportamiento, contra fuentes reales.'],['Firmas con el semáforo claro','Veredicto con sustento — y pase directo a Asegurabilidad.'] ],
      night:{ k:'10:21 a.m., un estudio real', h:'El estudio deja de tardar <em>tres días</em>', q:'Identidad, capacidad de pago y comportamiento en un solo veredicto — antes de que el candidato se enfríe.', logs:[ ['10:21','Solicitud de estudio · Andrés F. · CC 1.043.···'],['10:22','Identidad verificada · documento válido'],['10:23','Capacidad de pago: ingresos <span class="lb">2.4×</span> el canon'],['10:24','Señales de riesgo: ninguna'],['10:24','Veredicto: <span class="lb">riesgo bajo</span> → listo para firmar'] ] },
      cx:'Corremos un estudio real de principio a fin contigo.' },

    avaluos: { k:'Agentes AI · 03', badge:'Agente', t:'Avalúos',
      promise:'El precio correcto, con datos',
      lead:'Cada inmueble con el canon del mercado real de tu ciudad: ni sobrevalorado ni regalado.',
      win:{ t:'Leasefy · Avalúo — Apto 301, Envigado', tag:'En segundos', v:[
        { t:'ledger', hd:['Comparables','Envigado','ag'], d:{ c:['Comparable','Canon','m²'], r:[['Apto 502 · Envigado','$2.65M','70'],['Apto 218 · Envigado','$2.58M','66'],['Casa 12 · Envigado','$2.90M','84']] } },
        { t:'stat', hd:['Canon sugerido','Apto 301','ag'], d:{ big:'$2.6–2.75M', l:'Canon sugerido', s:'14 comparables reales de la zona' } },
        { t:'rows', hd:['Ajustes','Apto 301','ag'], d:{ r:[['Piso alto + balcón','+4%','ok'],['Parqueadero','+6%','ok'],['Tiempo estimado','3 semanas','mb']] } } ] },
      feats:[
        { k:'Comparables', h:'Tu zona, no promedios nacionales', p:'El agente arma el comparativo con arriendos reales del sector — mismo estrato, misma tipología, mismo momento del mercado.',
          v:{ t:'ledger', hd:['Comparables','Zona real','ag'], d:{ c:['Comparable','Canon','Estado'], r:[['Apto 502 · Envigado','$2.65M','Activo','ok'],['Apto 218 · Envigado','$2.58M','Arrendado'],['Apto 114 · Envigado','$2.70M','Activo','ok']] } } },
        { k:'Ajustes', h:'El inmueble real, no el ideal', p:'Piso, estado, parqueadero, años del edificio: cada ajuste queda explícito, para que el canon refleje lo que se está arrendando de verdad.',
          v:{ t:'rows', hd:['Ajustes aplicados','Apto 301','ag'], d:{ r:[['Piso alto + balcón','+4%','ok'],['8 años · buen estado','—'],['Parqueadero doble','+6%','ok']] } } },
        { k:'Sustento', h:'Un precio que se puede defender', p:'Cuando el propietario pida más, no discutes con opiniones: le muestras el comparativo, los ajustes y el tiempo estimado de arriendo a cada precio.',
          v:{ t:'stat', hd:['Sustento','Propietario','ag'], d:{ big:'3 sem <em>vs</em> 8+', l:'Tiempo de arriendo estimado', s:'a $2.7M vs a $3.1M · con sustento' } } } ],
      caps:[ ['Comparables de zona','Arriendos reales del sector, no promedios de portal.'],['Canon en segundos','Pides el avalúo y sale el rango con su sustento.'],['Ajustes explícitos','Estado, piso, amenidades: cada peso del ajuste se explica.'],['Historial del sector','Cómo se ha movido el precio de la zona, para conversar con datos.'] ],
      specs:[ ['Agente','<b>Avalúos</b> · L-AG-03'],['Datos','Mercado real de tu ciudad, por zona'],['Responde en','Segundos'],['Entrega','Rango de canon + comparativo + tiempo estimado'],['Se conecta con','CRM (inventario), Matching'],['Incluido en','Planes con agentes AI'] ],
      steps:[ ['Cargas el inmueble','Dirección, tipología y estado. Lo demás lo trae el agente.'],['El agente arma el comparativo','Comparables, ajustes y rango sugerido, con sustento.'],['Publicas con precio defendible','Y el propietario recibe el porqué, no una cifra suelta.'] ],
      night:{ k:'11:02 a.m., un avalúo real', h:'Ni sobrevalorado <em>ni regalado</em>', q:'Un canon anclado al mercado real de tu ciudad arrienda más rápido y discute menos.', logs:[ ['11:02','Solicitud de canon · Apto 301 · Envigado'],['11:02','14 comparables reales encontrados en la zona'],['11:03','Ajustes aplicados: piso alto, parqueadero, 8 años'],['11:03','Canon sugerido: <span class="lb">$2.6M – $2.75M</span>'],['11:04','Tiempo estimado de arriendo: 3 semanas'] ] },
      cx:'Avaluamos en vivo un inmueble tuyo, con comparables reales.' },

    conciliacion: { k:'Agentes AI · 04', badge:'Agente', t:'Conciliación',
      promise:'Cuadre contra el banco, sin Excel',
      lead:'El match entre extracto y contrato deja de ser un Excel de viernes: cada pago encuentra su contrato solo.',
      win:{ t:'Leasefy · Conciliación — Extracto de hoy', tag:'6:12 a.m.', v:[
        { t:'stat', hd:['Match','Hoy 6:12 a.m.','ag'], d:{ big:'209<em>/214</em>', l:'Match exacto automático', s:'3 ambiguas con sugerencia · 2 alertas' } },
        { t:'ledger', hd:['Extracto','214 mov.','ag'], d:{ c:['Movimiento','Contrato','Match'], r:[['$2.450.000','CT-1042','Exacto','ok'],['$1.980.000','CT-1103','Exacto','ok'],['$840.000','—','Revisar','mb']] } },
        { t:'rows', hd:['Excepciones','Hoy','ag'], d:{ r:[['Referencia ambigua','3 · sugerencia lista','mb'],['Sin identificar','2 · alerta enviada'],['Duplicados','0','ok']] } } ] },
      feats:[
        { k:'Match', h:'Banco y contratos, en la misma línea', p:'El agente lee el extracto y encuentra el contrato de cada pago: por referencia, por monto, por historia. El cuadre deja de ser un deporte de viernes.',
          v:{ t:'ledger', hd:['Match banco','Automático','ag'], d:{ c:['Movimiento','Contrato','Match'], r:[['$2.450.000','CT-1042','Exacto','ok'],['$1.980.000','CT-1103','Exacto','ok'],['$3.120.000','CT-0977','Exacto','ok']] } } },
        { k:'Excepciones', h:'Lo raro salta solo', p:'Referencias ambiguas, montos parciales, pagos duplicados: el agente los separa con una sugerencia de resolución, en vez de esconderlos en el promedio.',
          v:{ t:'rows', hd:['Excepciones','2 de 214','ag'], d:{ r:[['Ref. ambigua','Sugerencia lista','mb'],['Pago parcial','Marcado al contrato'],['Duplicado','Ninguno','ok']] } } },
        { k:'Trazabilidad', h:'Cada peso con su historia', p:'De cada movimiento del extracto puedes llegar al contrato, al cobro y al informe del propietario. Auditoría sin arqueología.',
          v:{ t:'steps', hd:['Trazabilidad','Mov. #118','ag'], d:{ s:[['Movimiento #118','extracto · 6:12 a.m.','done'],['Cobro de marzo','generado el día 1','done'],['Contrato CT-1042','canon $2.450.000','done'],['Informe al propietario','enviado ✓','done']] } } } ],
      caps:[ ['Match automático','Extracto contra contratos, todos los días, sin planilla.'],['Alertas de no identificados','Lo que no cuadra se ve hoy, no al cierre.'],['Cierre en horas','La conciliación deja de definir la fecha del cierre de mes.'],['Trazabilidad total','Del peso en el banco al contrato y al informe, en clics.'] ],
      specs:[ ['Agente','<b>Conciliación</b> · L-AG-04'],['Corre','Con cada extracto, todos los días'],['Se alimenta de','Extractos bancarios + ERP de arriendos'],['Resuelve','Match banco–contrato, referencias ambiguas, parciales'],['Escala','Solo pagos sin identificar'],['Incluido en','Planes con agentes AI'] ],
      steps:[ ['Conectas el extracto','El banco entra al sistema tal como llega.'],['El agente cruza todo','Match por referencia, monto e historia de pago.'],['Tesorería solo ve excepciones','Dos casos con sugerencia, no doscientas filas.'] ],
      night:{ k:'6:10 a.m., llega el extracto', h:'El extracto se cuadra <em>solo</em>', q:'Cada peso del extracto sabe a qué contrato pertenece — y lo que no cuadra salta de una.', logs:[ ['06:10','Extracto recibido · 214 movimientos'],['06:11','209 pagos con match exacto · <span class="lb">automático</span>'],['06:11','3 referencias ambiguas → sugerencia lista'],['06:12','2 sin identificar → alerta a tesorería'],['06:12','Conciliado: 209 de 214 · quedan 5 con gestión'] ] },
      cx:'Conciliamos un extracto real contigo en la demo.' },

    matching: { k:'Agentes AI · 05', badge:'Agente', t:'Matching',
      promise:'Opciones reales, el mismo día',
      lead:'El agente cruza necesidad, presupuesto e inventario al instante — cada interesado recibe opciones que sí aplican.',
      win:{ t:'Leasefy · Matching — Interesado M-77', tag:'Mismo día', v:[
        { t:'rows', hd:['Interesado M-77','9:31 a.m.','ag'], d:{ r:[['Necesidad','2 alcobas · Laureles'],['Presupuesto','$2.5M – $3M'],['Aplican','6 de 86','mb']] } },
        { t:'ledger', hd:['Opciones','Top 3','ag'], d:{ c:['Opción','Canon','Encaje'], r:[['Apto 402 · Laureles','$2.8M','Alto','ok'],['Casa 12 · Conquistadores','$2.9M','Alto','ok'],['Apto 118 · Estadio','$2.6M','Alterna']] } },
        { t:'chat', hd:['WhatsApp · M-77','9:33 a.m.','chat'], d:{ m:[['out','Te tengo 3 opciones que encajan con lo que buscas. ¿Agendamos visita para hoy?','9:33'],['in','¡La del 402 me gustó! ¿A las 4?','10:05']] } } ] },
      feats:[
        { k:'Cruce', h:'Inventario y necesidad, al instante', p:'Zona, presupuesto, alcobas, mascotas, fechas: el agente cruza todo contra el inventario vivo y descarta lo que no aplica antes de que nadie pierda una visita.',
          v:{ t:'rows', hd:['Cruce','M-77','ag'], d:{ r:[['Inventario vivo','86 inmuebles'],['Aplican','6 candidatos','mb'],['Descartados','Fuera de presupuesto']] } } },
        { k:'Prioridad', h:'Primero lo que sí va a cerrar', p:'No son 20 links: son 3 opciones ordenadas por probabilidad de cierre, con el porqué de cada una. El asesor sale a visitar con tiro hecho.',
          v:{ t:'ledger', hd:['Prioridad','Por cierre','ag'], d:{ c:['Opción','Encaje','Por qué'], r:[['Apto 402','Alto','zona + canon','ok'],['Casa 12','Alto','espacio + fecha','ok'],['Apto 118','Alterna','canon menor']] } } },
        { k:'Aprendizaje', h:'Cada cierre lo vuelve mejor', p:'El agente registra qué se visitó, qué gustó y qué cerró. Con cada arriendo, las próximas opciones llegan más afinadas para tu zona.',
          v:{ t:'chat', hd:['Feedback · M-77','5:05 p.m.','chat'], d:{ m:[['in','Al final el parqueadero fue lo que definió','17:05'],['out','Anotado ✓ — lo tendré en cuenta para las próximas opciones de la zona','17:06']] } } } ],
      caps:[ ['Cruce automático','Necesidad contra inventario vivo, sin repasar listas a mano.'],['Mismo día','Las opciones salen mientras el interesado sigue caliente.'],['Prioriza por cierre','Pocas opciones bien ordenadas, no un catálogo.'],['Menos visitas perdidas','El asesor visita lo que tiene probabilidad real.'] ],
      specs:[ ['Agente','<b>Matching</b> · L-AG-05'],['Responde en','El mismo día, normalmente en minutos'],['Cruza','Necesidad, presupuesto, inventario vivo'],['Se alimenta de','CRM + Avalúos'],['Mejora con','Cada arriendo cerrado'],['Incluido en','Planes con agentes AI'] ],
      steps:[ ['Llega el interesado','Del CRM, con su necesidad ya estructurada.'],['El agente cruza y prioriza','Contra el inventario vivo, con probabilidad de cierre.'],['El asesor visita con tiro hecho','Opciones enviadas, visita agendada, feedback registrado.'] ],
      night:{ k:'9:31 a.m., entra un interesado', h:'Nadie espera <em>una semana</em> por opciones', q:'El agente cruza necesidad, presupuesto e inventario al instante — y aprende de cada arriendo cerrado.', logs:[ ['09:31','Interesado nuevo · 2 alcobas · $2.5M – $3M · Laureles'],['09:31','Inventario cruzado: 6 candidatos'],['09:32','3 opciones priorizadas por probabilidad de cierre'],['09:33','Enviadas por <span class="lb">WhatsApp</span> · visita sugerida'],['17:05','Feedback registrado → aprende para la próxima'] ] },
      cx:'Cruzamos tu inventario real con casos de interesados.' },

    asegurabilidad: { k:'Agentes AI · 06', badge:'Agente', t:'Asegurabilidad',
      promise:'Contratos protegidos desde la firma',
      lead:'El agente evalúa y gestiona la asegurabilidad de cada contrato — propietarios tranquilos desde el día uno.',
      win:{ t:'Leasefy · Asegurabilidad — CT-1103', tag:'Firma hoy', v:[
        { t:'steps', hd:['CT-1103','Firma hoy','ag'], d:{ s:[['Estudio del inquilino','riesgo bajo · aprobado','done'],['Cotización en paralelo','3 aseguradoras · 12:05','done'],['Veredicto','póliza sugerida · 12:07','done'],['Cobertura activa','desde la firma','on']] } },
        { t:'ledger', hd:['Cotización','En paralelo','ag'], d:{ c:['Aseguradora','Respuesta','Tiempo'], r:[['Aseguradora A','Cotizó','2 min','ok'],['Aseguradora B','Cotizó','3 min','ok'],['Aseguradora C','Cotizó','5 min','ok']] } },
        { t:'doc', hd:['Póliza','CT-1103','ag'], st:'Aprobado ✓', d:{ t:'Póliza recomendada', l:['Mejor cobertura/costo','Activa desde la firma','Renovación vigilada'] } } ] },
      feats:[
        { k:'Evaluación', h:'Asegurable o no, antes de firmar', p:'Con el estudio del inquilino en la mano, el agente evalúa la asegurabilidad del contrato antes de que se firme — no cuando ya hay un problema.',
          v:{ t:'steps', hd:['Evaluación','CT-1103','ag'], d:{ s:[['Estudio recibido','riesgo bajo','done'],['Canon vs cobertura','dentro de póliza','done'],['Evaluación','asegurable','on']] } } },
        { k:'Gestión', h:'Las aseguradoras cotizan a la vez', p:'Nada de mandar correos uno por uno: las aseguradoras integradas cotizan en paralelo y llega un veredicto listo para firmar.',
          v:{ t:'ledger', hd:['Aseguradoras','Paralelo','ag'], d:{ c:['Aseguradora','Respuesta','Tiempo'], r:[['Aseguradora A','Cotizó','2 min','ok'],['Aseguradora B','Cotizó','3 min','ok'],['Recomendada','Mejor c/c','—','mb']] } } },
        { k:'Vigencia', h:'Renovaciones que avisan solas', p:'Las pólizas no se vencen en silencio: el agente avisa con tiempo, gestiona la renovación y deja el rastro en el contrato.',
          v:{ t:'rows', hd:['Vigencias','Cartera','ag'], d:{ r:[['Pólizas activas','198','ok'],['Por renovar','4 · avisadas','mb'],['Vencidas sin gestión','0','ok']] } } } ],
      caps:[ ['Evaluación por contrato','Cada firma pasa por su filtro de asegurabilidad, sin excepción.'],['Cotización integrada','Aseguradoras en paralelo, veredicto en minutos.'],['Cobertura desde la firma','El contrato nace protegido, no queda en trámite.'],['Alertas de renovación','Vencimientos avisados con tiempo, gestionados y registrados.'] ],
      specs:[ ['Agente','<b>Asegurabilidad</b> · L-AG-06'],['Evalúa','Cada contrato antes de la firma'],['Cotiza con','Aseguradoras integradas, en paralelo'],['Se conecta con','Estudio del inquilino, ERP'],['Avisa','Vencimientos y renovaciones, con tiempo'],['Incluido en','Planes con agentes AI'] ],
      steps:[ ['El contrato llega del CRM','Con el estudio del inquilino ya resuelto.'],['El agente evalúa y cotiza','Aseguradoras en paralelo, veredicto listo para firma.'],['Se firma con cobertura activa','Y las renovaciones quedan vigiladas desde el día uno.'] ],
      night:{ k:'12:04 p.m., contrato nuevo', h:'El propietario duerme <em>tranquilo</em>', q:'Cada contrato se firma con su protección resuelta — y las renovaciones no se vencen en silencio.', logs:[ ['12:04','Contrato nuevo · CT-1103 → evaluación'],['12:05','Cotizado con 3 aseguradoras a la vez'],['12:07','Veredicto: <span class="lb">aprobado</span> · póliza sugerida'],['12:08','Cobertura activa desde la firma'],['—30 d','Renovación: avisada sola, antes de vencer'] ] },
      cx:'Evaluamos la asegurabilidad de un contrato tuyo en vivo.' }
  };

export const TEXOF: Record<string, string> = { crm:'t2', erp:'t5', cobranza:'t1', inquilino:'t4', avaluos:'t7', conciliacion:'t6', matching:'t3', asegurabilidad:'t6' };

export const PRODUCT_SLUGS = Object.keys(PRODUCTS) as ProductSlug[];
