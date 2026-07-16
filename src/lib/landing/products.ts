/**
 * PRODUCTS — typed catalog for the 8 product pages (landing-react-port
 * SLICE 4a). Ported from `landing-standalone/index.html`'s `PRODUCTS`
 * object (~L3487-3647) + `TEXOF` texture map (~L3648). Copy is carried over
 * VERBATIM per HANDOFF's "Pendientes" note (copy review is a later gate,
 * not this phase) — do not rewrite Spanish (Colombia) marketing copy here.
 *
 * CTAs are shared across every product page in the standalone (hardcoded
 * in the `#productPage` template, not per-product data — see
 * `landing-standalone/index.html` ~L2836-2839: "Agendar una demo" →
 * `#/contacto`, "Ver planes" → `#planes`). Mapped here to real Next.js
 * routes: `/contacto` (SLICE 7, not yet built — this is a forward
 * reference, same pattern as S3a's `/registro`/`/pricing`) and `/pricing`
 * (already exists).
 */
import type { Product, ProductSlug } from './types'

export const PRODUCT_SLUGS: ProductSlug[] = [
  'crm',
  'erp',
  'cobranza',
  'inquilino',
  'avaluos',
  'conciliacion',
  'matching',
  'asegurabilidad',
]

const SHARED_CTAS = [
  { label: 'Agendar una demo', href: '/contacto' },
  { label: 'Ver planes', href: '/pricing' },
]

export const PRODUCTS: Record<ProductSlug, Product> = {
  crm: {
    slug: 'crm',
    eyebrow: 'Sistema · Módulo 01',
    badge: 'CRM',
    name: 'CRM inmobiliario',
    h1: 'Tu comercial, de punta a punta',
    lead: 'Cada interesado, cada inmueble y cada asesor viviendo en un solo pipeline — sin planillas ni chats sueltos.',
    ctas: SHARED_CTAS,
    textureId: 't2',
    window: {
      title: 'Leasefy · CRM — Pipeline',
      tag: 'En vivo',
      vignettes: [
        {
          kind: 'rows',
          header: { label: 'Hoy', meta: '23 solicitudes', family: 'sys' },
          data: {
            rows: [
              { label: 'Sin atender', value: '0', tone: 'ok' },
              { label: 'Respuesta media', value: '12 min' },
              { label: 'Visitas agendadas', value: '7', tone: 'mb' },
            ],
          },
        },
        {
          kind: 'steps',
          header: { label: 'Caso L-2481', meta: 'Pipeline', family: 'sys' },
          data: {
            steps: [
              { title: 'Solicitud capturada', meta: 'WhatsApp · 8:02 a.m.', status: 'done' },
              { title: 'Contexto armado', meta: 'presupuesto, fechas, mascotas', status: 'done' },
              { title: 'Asignada a Laura', meta: 'SLA 15 min', status: 'on' },
              { title: 'Visita', meta: 'por agendar' },
            ],
          },
        },
        {
          kind: 'chat',
          header: { label: 'WhatsApp · Laura', meta: '8:14 a.m.', family: 'chat' },
          data: {
            messages: [
              { direction: 'in', text: 'Busco apto de 2 alcobas en Laureles, presupuesto $3M', time: '8:02' },
              { direction: 'out', text: 'Te tengo 3 opciones que encajan. ¿Te las envío y agendamos visita hoy?', time: '8:14' },
            ],
          },
        },
      ],
    },
    stories: [
      {
        kicker: 'Captura',
        h3: 'Todo entra solo, con contexto',
        body: 'WhatsApp, portales y referidos caen al mismo pipeline con presupuesto, fechas y necesidad ya organizados. Nada de copiar y pegar entre chats y planillas.',
        vignette: {
          kind: 'chat',
          header: { label: 'WhatsApp · entrada', meta: '8:02 a.m.', family: 'chat' },
          data: {
            messages: [
              { direction: 'in', text: 'Hola! vi el apto de la Cra 34, ¿sigue disponible? Tengo un perrito 🐶', time: '8:02' },
              { direction: 'out', text: '¡Sigue! Y acepta mascotas. ¿Para cuándo lo necesitas?', time: '8:03' },
              { direction: 'in', text: 'Para el 1 de agosto', time: '8:04' },
            ],
          },
        },
      },
      {
        kicker: 'Seguimiento',
        h3: 'Cada asesor sabe qué sigue',
        body: 'Tareas, tiempos de respuesta y recordatorios viven en el caso. Si una conversación se enfría, el CRM la sube antes de que se pierda el cierre.',
        vignette: {
          kind: 'rows',
          header: { label: 'Equipo', meta: 'Hoy', family: 'sys' },
          data: {
            rows: [
              { label: 'Laura', value: '8 casos · 12 min resp.' },
              { label: 'Andrés', value: '6 casos · 9 min resp.' },
              { label: 'Sin atender', value: '0', tone: 'ok' },
            ],
          },
        },
      },
      {
        kicker: 'Cierre',
        h3: 'La historia completa en el expediente',
        body: 'Cada visita, oferta y documento queda en su caso. Cuando llega la firma, el contrato se arma con lo que ya existe — y pasa directo al ERP.',
        vignette: {
          kind: 'doc',
          header: { label: 'Expediente', meta: 'CT-1042', family: 'sys' },
          stamp: 'Listo para firma',
          data: {
            title: 'CT-1042 · Apto 402',
            lines: [
              '3 visitas · oferta aceptada',
              'Estudio del inquilino aprobado',
              'Documentos completos',
              'Pasa a ERP de arriendos',
            ],
          },
        },
      },
    ],
    capabilities: [
      { title: 'Pipeline en tiempo real', body: 'Cada solicitud con su etapa, su dueño y su siguiente paso, visible para todos.' },
      { title: 'Matching automático', body: 'Cruza interesado e inventario al instante y sugiere opciones que sí van a cerrar.' },
      { title: 'Tiempos por asesor', body: 'Sabes quién responde en minutos y quién deja enfriar — sin perseguir a nadie.' },
      { title: 'Historial completo', body: 'Cada conversación, visita y oferta queda en el caso, no en el teléfono de alguien.' },
    ],
    snapshot: [
      { label: 'Módulo', value: '<b>CRM inmobiliario</b> · núcleo comercial del sistema' },
      { label: 'Reemplaza a', value: 'Planillas, chats sueltos y agendas personales' },
      { label: 'Se conecta con', value: 'WhatsApp, portales, correo' },
      { label: 'Alimenta a', value: 'Matching, Estudio del inquilino, ERP' },
      { label: 'Entrada en operación', value: 'Primera semana, con tu inventario cargado' },
      { label: 'Incluido en', value: 'Todos los planes' },
    ],
    steps: [
      { title: 'Cargamos tu inventario y tu equipo', body: 'Inmuebles, asesores y etapas quedan montados contigo, no a punta de manuales.' },
      { title: 'Conectamos tus canales', body: 'WhatsApp, portales y correo empiezan a alimentar el pipeline solos.' },
      { title: 'Tu pipeline queda vivo', body: 'Desde ese día, ninguna solicitud vuelve a depender de la memoria de nadie.' },
    ],
    night: {
      kicker: 'Un martes cualquiera, 8:02 a.m.',
      h2: 'Ningún interesado se queda <em>sin respuesta</em>',
      quote: 'El pipeline deja de depender de la memoria del equipo: cada conversación queda donde toca, con su historia completa.',
      log: [
        { time: '08:02', text: 'Nueva solicitud · Apto 402 · Laureles → <span class="lb">pipeline</span>' },
        { time: '08:02', text: 'Contexto armado: presupuesto, fechas, mascotas' },
        { time: '08:03', text: 'Asignada a Laura · SLA de respuesta 15 min' },
        { time: '08:14', text: 'Primera respuesta enviada · <span class="lb">WhatsApp</span>' },
        { time: '18:40', text: 'Resumen del día: 23 solicitudes · 0 sin atender' },
      ],
    },
    demoPrompt: 'Te mostramos el CRM operando con tu inventario y tus canales reales.',
  },

  erp: {
    slug: 'erp',
    eyebrow: 'Sistema · Módulo 02',
    badge: 'ERP',
    name: 'ERP de arriendos',
    h1: 'La plata, en orden y sola',
    lead: 'La parte más pesada del arriendo, el dinero, en una operación trazable y sin sorpresas al cierre de mes.',
    ctas: SHARED_CTAS,
    textureId: 't5',
    window: {
      title: 'Leasefy · ERP — Recaudo de marzo',
      tag: 'Conciliado',
      vignettes: [
        {
          kind: 'stat',
          header: { label: 'Recaudo', meta: 'Marzo', family: 'sys' },
          data: { big: '$182.4M', label: 'Recaudado este mes', sub: 'de $184.2M · 214 contratos' },
        },
        {
          kind: 'ledger',
          header: { label: 'Cobros de hoy', meta: 'Banco', family: 'sys' },
          data: {
            columns: ['Contrato', 'Pago', 'Estado'],
            rows: [
              { cells: ['CT-1042', '$2.450.000', 'Conciliado'], tone: 'ok' },
              { cells: ['CT-1103', '$1.980.000', 'Conciliado'], tone: 'ok' },
              { cells: ['CT-0977', '$3.120.000', '→ Cobranza'], tone: 'mb' },
            ],
          },
        },
        {
          kind: 'rows',
          header: { label: 'Salidas', meta: 'Programadas', family: 'sys' },
          data: {
            rows: [
              { label: 'Propietarios', value: '41 pagos · viernes' },
              { label: 'Comisiones', value: 'Liquidadas solas', tone: 'ok' },
              { label: 'Cierre de mes', value: 'En horas', tone: 'mb' },
            ],
          },
        },
      ],
    },
    stories: [
      {
        kicker: 'Contratos',
        h3: 'Vigencias que se cuidan solas',
        body: 'Cada contrato sabe cuándo vence, cuándo ajusta canon y qué debe cobrar este mes. Las renovaciones avisan antes de volverse un problema.',
        vignette: {
          kind: 'steps',
          header: { label: 'CT-1042', meta: 'Vigencia', family: 'sys' },
          data: {
            steps: [
              { title: 'Contrato firmado', meta: 'CT-1042 · hace 4 meses', status: 'done' },
              { title: 'Ajuste de canon', meta: 'enero · IPC aplicado', status: 'done' },
              { title: 'Aviso de renovación', meta: '8 meses antes del vencimiento', status: 'on' },
              { title: 'Renovación anticipada', meta: '+12 meses aceptada' },
            ],
          },
        },
      },
      {
        kicker: 'Recaudo',
        h3: 'Cada pago, cuadrado contra el banco',
        body: 'El cobro sale solo, el pago entra y se concilia contra el extracto. Lo que no cuadra salta de una — no en la semana del cierre.',
        vignette: {
          kind: 'ledger',
          header: { label: 'Extracto', meta: '6:12 a.m.', family: 'sys' },
          data: {
            columns: ['Movimiento', 'Contrato', 'Match'],
            rows: [
              { cells: ['$2.450.000', 'CT-1042', 'Exacto'], tone: 'ok' },
              { cells: ['$1.980.000', 'CT-1103', 'Exacto'], tone: 'ok' },
              { cells: ['$840.000', '—', 'Revisar'], tone: 'mb' },
            ],
          },
        },
      },
      {
        kicker: 'Propietarios',
        h3: 'Pagos e informes puntuales',
        body: 'Cada propietario recibe su pago programado y su informe mensual sin que nadie los arme a mano. La retención empieza por ahí.',
        vignette: {
          kind: 'doc',
          header: { label: 'Informe mensual', meta: 'Marzo', family: 'sys' },
          stamp: 'Enviado ✓',
          data: {
            title: 'Carlos M. · Propietario',
            lines: ['Informe enviado · pago recibido', 'Pago programado · viernes', 'Renovación anticipada · +12 meses'],
          },
        },
      },
    ],
    capabilities: [
      { title: 'Contratos y vigencias', body: 'Cánones, ajustes y vencimientos bajo control, con alertas antes de que duelan.' },
      { title: 'Cobros automáticos', body: 'El cobro del mes se genera y se recuerda solo, contrato por contrato.' },
      { title: 'Conciliación bancaria', body: 'Cada pago encuentra su contrato contra el extracto, todos los días.' },
      { title: 'Comisiones solas', body: 'Se calculan y liquidan con cada recaudo, sin planilla de fin de mes.' },
    ],
    snapshot: [
      { label: 'Módulo', value: '<b>ERP de arriendos</b> · núcleo financiero del sistema' },
      { label: 'Reemplaza a', value: 'El Excel del cierre y las planillas de cobros' },
      { label: 'Se conecta con', value: 'Tu banco (extractos), CRM, agentes de Cobranza y Conciliación' },
      { label: 'Cierre de mes', value: '<b>Horas, no semanas</b>' },
      { label: 'Entrada en operación', value: 'Desde la segunda semana, con contratos migrados' },
      { label: 'Incluido en', value: 'Planes con módulo financiero' },
    ],
    steps: [
      { title: 'Migramos tus contratos', body: 'Cánones, vigencias y condiciones entran al sistema tal como son.' },
      { title: 'Conectamos extractos y cobros', body: 'El recaudo y la conciliación empiezan a correr en automático.' },
      { title: 'El mes se cierra solo', body: 'Tesorería revisa excepciones, no persigue pagos.' },
    ],
    night: {
      kicker: 'Día 1 del mes, 1:00 a.m.',
      h2: 'El cierre de mes deja de ser <em>una pelea</em>',
      quote: 'Contratos, cobros, pagos y comisiones en una sola línea trazable — sin el Excel de los viernes.',
      log: [
        { time: '01:00', text: 'Cobros del mes generados · 214 contratos' },
        { time: '06:12', text: 'Pago recibido · CT-1042 · <span class="lb">$2.450.000</span>' },
        { time: '06:12', text: 'Conciliado contra el banco · match exacto' },
        { time: '09:00', text: 'Pago a propietario programado · viernes' },
        { time: '09:01', text: 'Comisión liquidada sola · sin planilla' },
      ],
    },
    demoPrompt: 'Te mostramos el ERP con contratos y cobros como los tuyos.',
  },

  cobranza: {
    slug: 'cobranza',
    eyebrow: 'Agentes AI · 01',
    badge: 'Agente',
    name: 'Cobranza',
    h1: 'La mora se persigue sola',
    lead: 'Recordatorios, seguimiento y escalamiento con tono humano, sin que nadie de tu equipo levante el teléfono.',
    ctas: SHARED_CTAS,
    textureId: 't1',
    window: {
      title: 'Leasefy · Agente de cobranza',
      tag: 'Corriendo 24/7',
      vignettes: [
        {
          kind: 'rows',
          header: { label: 'Cartera', meta: 'Hoy', family: 'ag' },
          data: {
            rows: [
              { label: 'En mora', value: '3 de 214', tone: 'mb' },
              { label: 'Promesas de pago', value: '2 registradas' },
              { label: 'Escalados a humano', value: '1 · con contexto', tone: 'ok' },
            ],
          },
        },
        {
          kind: 'chat',
          header: { label: 'WhatsApp · CT-1077', meta: '2:14 a.m.', family: 'chat' },
          data: {
            messages: [
              { direction: 'out', text: 'Hola Carlos, ¿cómo estás? Te recuerdo el pago del apto 402, venció hace 3 días. ¿Te reenvío los datos?', time: '2:14' },
              { direction: 'in', text: 'Uy sí, se me pasó. El viernes pago', time: '2:20' },
              { direction: 'out', text: 'Listo, queda registrada tu promesa para el viernes ✓', time: '2:20' },
            ],
          },
        },
        {
          kind: 'steps',
          header: { label: 'Escalamiento', meta: 'Reglas tuyas', family: 'ag' },
          data: {
            steps: [
              { title: 'Día 1 · recordatorio suave', meta: 'WhatsApp · tono cordial', status: 'done' },
              { title: 'Día 5 · seguimiento', meta: 'con datos de pago', status: 'done' },
              { title: 'Día 10 · tono firme', meta: 'aviso de reporte', status: 'on' },
              { title: 'Día 14 · escala a humano', meta: 'llamada sugerida' },
            ],
          },
        },
      ],
    },
    stories: [
      {
        kicker: 'Detección',
        h3: 'La mora se ve venir',
        body: 'El agente cruza cobros y pagos todos los días: detecta el atraso el día uno, no cuando el propietario llama a preguntar por su plata.',
        vignette: {
          kind: 'stat',
          header: { label: 'Detección', meta: 'Cruce diario', family: 'ag' },
          data: { big: 'Día <em>1</em>', label: 'Detección del atraso', sub: 'no el día 30 · cruce diario banco–contratos' },
        },
      },
      {
        kicker: 'Gestión',
        h3: 'Cobra con tono humano',
        body: 'Recordatorios por WhatsApp que suenan a tu inmobiliaria — cordiales primero, firmes después. Cada respuesta queda registrada en el contrato.',
        vignette: {
          kind: 'chat',
          header: { label: 'WhatsApp · seguimiento', meta: '9:00 a.m.', family: 'chat' },
          data: {
            messages: [
              { direction: 'out', text: 'Carlos, seguimos sin registrar tu pago. ¿Pasa algo con lo acordado del viernes?', time: '9:00' },
              { direction: 'in', text: 'Disculpa, hoy en la tarde queda', time: '9:12' },
              { direction: 'out', text: 'Gracias por confirmar. Queda anotado — cualquier cosa me escribes', time: '9:12' },
            ],
          },
        },
      },
      {
        kicker: 'Escalamiento',
        h3: 'Tu equipo entra al final',
        body: 'Solo los casos que necesitan criterio humano llegan a tu equipo — con la historia completa y el siguiente paso sugerido.',
        vignette: {
          kind: 'doc',
          header: { label: 'Caso escalado', meta: 'Día 14', family: 'ag' },
          stamp: '→ Humano',
          data: {
            title: 'CT-0912 · Sin respuesta',
            lines: ['6 gestiones registradas', '2 promesas incumplidas', 'Contexto completo en el caso', 'Siguiente paso: llamada directa'],
          },
        },
      },
    ],
    capabilities: [
      { title: 'Recordatorios automáticos', body: 'Por WhatsApp y correo, con la voz de tu inmobiliaria, sin turnos ni festivos.' },
      { title: 'Detección temprana', body: 'El atraso se ve el día uno, cuando todavía es fácil de resolver.' },
      { title: 'Escalamiento con criterio', body: 'De suave a firme, y a humano solo cuando de verdad hace falta.' },
      { title: 'Registro completo', body: 'Cada gestión y cada respuesta quedan en el contrato, auditable.' },
    ],
    snapshot: [
      { label: 'Agente', value: '<b>Cobranza</b> · L-AG-01' },
      { label: 'Corre', value: '24/7, sin turnos ni festivos' },
      { label: 'Canales', value: 'WhatsApp, correo' },
      { label: 'Se alimenta de', value: 'ERP de arriendos (cobros y pagos)' },
      { label: 'Supervisión', value: 'Tu equipo aprueba los casos escalados' },
      { label: 'Incluido en', value: 'Planes con agentes AI' },
    ],
    steps: [
      { title: 'Define tono y reglas', body: 'Decides cómo suena tu cobranza y cuándo escala. El agente obedece eso.' },
      { title: 'El agente toma tu cartera', body: 'Desde el primer día gestiona la mora existente, no solo la nueva.' },
      { title: 'Solo revisas los escalados', body: 'Tu equipo ve excepciones con contexto, no listas de morosos.' },
    ],
    night: {
      kicker: 'Mientras duermes, 2:14 a.m.',
      h2: 'A las 2 a.m. el agente <em>sigue cobrando</em>',
      quote: 'Recordatorios con tono humano, cada gestión registrada, y tu equipo solo entra cuando de verdad hace falta.',
      log: [
        { time: '02:14', text: 'Recordatorio enviado · CT-1077 · día 3 · <span class="lb">WhatsApp</span>' },
        { time: '02:15', text: 'Respuesta recibida: promesa de pago · viernes' },
        { time: '02:15', text: 'Promesa registrada en el contrato' },
        { time: '08:00', text: 'Caso escalado a humano · día 14 · llamada sugerida' },
        { time: '08:01', text: 'Resumen: 12 gestiones · 9 respuestas · 3 promesas' },
      ],
    },
    demoPrompt: 'Te mostramos al agente gestionando una cartera como la tuya.',
  },

  inquilino: {
    slug: 'inquilino',
    eyebrow: 'Agentes AI · 02',
    badge: 'Agente',
    name: 'Estudio del inquilino',
    h1: 'Verificación real, en minutos',
    lead: 'Identidad, capacidad de pago y comportamiento de cada candidato, verificados contra fuentes reales — sin papeleo.',
    ctas: SHARED_CTAS,
    textureId: 't4',
    window: {
      title: 'Leasefy · Estudio A-118',
      tag: '4 minutos',
      vignettes: [
        {
          kind: 'steps',
          header: { label: 'Estudio A-118', meta: '4 minutos', family: 'ag' },
          data: {
            steps: [
              { title: 'Identidad verificada', meta: 'documento válido · 10:22', status: 'done' },
              { title: 'Capacidad de pago', meta: 'ingresos 2.4× el canon', status: 'done' },
              { title: 'Comportamiento', meta: 'sin moras en 24 meses', status: 'done' },
              { title: 'Veredicto', meta: 'riesgo bajo → firma', status: 'on' },
            ],
          },
        },
        {
          kind: 'rows',
          header: { label: 'Andrés F.', meta: 'CC 1.043.···', family: 'ag' },
          data: {
            rows: [
              { label: 'Ingresos vs canon', value: '2.4×', tone: 'ok' },
              { label: 'Obligaciones', value: 'Al día' },
              { label: 'Moras últimos 24 m.', value: '0', tone: 'ok' },
            ],
          },
        },
        {
          kind: 'doc',
          header: { label: 'Veredicto', meta: 'A-118', family: 'ag' },
          stamp: 'Riesgo bajo',
          data: {
            title: 'Andrés Felipe R.',
            lines: ['Identidad y antecedentes en orden', 'Capacidad de pago verificada', 'Listo para Asegurabilidad'],
          },
        },
      ],
    },
    stories: [
      {
        kicker: 'Identidad',
        h3: 'Sabes quién es, de verdad',
        body: 'Documento, antecedentes y consistencia de datos se verifican solos. Lo que un asistente tarda una mañana en llamar, el agente lo resuelve en minutos.',
        vignette: {
          kind: 'steps',
          header: { label: 'Identidad', meta: '90 segundos', family: 'ag' },
          data: {
            steps: [
              { title: 'Documento válido', meta: 'registro nacional', status: 'done' },
              { title: 'Antecedentes', meta: 'sin señales', status: 'done' },
              { title: 'Datos cruzados', meta: 'teléfono, correo, empleador', status: 'done' },
              { title: 'Identidad confirmada', meta: 'en 90 segundos', status: 'on' },
            ],
          },
        },
      },
      {
        kicker: 'Capacidad',
        h3: 'Sabes si puede pagar',
        body: 'Ingresos contra canon, obligaciones vigentes y comportamiento de pago, leídos de las fuentes — no del formulario que llenó el candidato.',
        vignette: {
          kind: 'stat',
          header: { label: 'Capacidad de pago', meta: 'Verificada', family: 'ag' },
          data: { big: '2.4×', label: 'Ingresos sobre el canon', sub: 'obligaciones al día · sin moras 24 m.' },
        },
      },
      {
        kicker: 'Veredicto',
        h3: 'Decides con score, no con corazonadas',
        body: 'Un semáforo claro con su sustento: por qué sí, por qué no, y qué condiciones mitigarían el riesgo. Listo para pasar a la firma o a Asegurabilidad.',
        vignette: {
          kind: 'doc',
          header: { label: 'Estudio A-118', meta: '4 min', family: 'ag' },
          stamp: 'Riesgo bajo',
          data: {
            title: 'Veredicto con sustento',
            lines: ['Score claro por candidato', 'Razones detalladas en el caso', 'Pase directo a Asegurabilidad'],
          },
        },
      },
    ],
    capabilities: [
      { title: 'Identidad y antecedentes', body: 'Verificación real contra fuentes, no una foto de la cédula en un chat.' },
      { title: 'Capacidad de pago', body: 'Ingresos, obligaciones y comportamiento leídos en minutos.' },
      { title: 'Score de riesgo', body: 'Un veredicto claro con sustento, por candidato.' },
      { title: 'Minutos, no días', body: 'El candidato bueno no se enfría esperando un estudio de 3 días.' },
    ],
    snapshot: [
      { label: 'Agente', value: '<b>Estudio del inquilino</b> · L-AG-02' },
      { label: 'Tiempo por estudio', value: 'Minutos' },
      { label: 'Revisa', value: 'Identidad, ingresos, obligaciones, comportamiento de pago' },
      { label: 'Se conecta con', value: 'CRM (candidatos), Asegurabilidad' },
      { label: 'Entrega', value: 'Score + veredicto con sustento, listo para firma' },
      { label: 'Incluido en', value: 'Planes con agentes AI' },
    ],
    steps: [
      { title: 'El candidato llega del CRM', body: 'Con su caso ya armado: inmueble, canon y datos de contacto.' },
      { title: 'El agente verifica y puntúa', body: 'Identidad, capacidad y comportamiento, contra fuentes reales.' },
      { title: 'Firmas con el semáforo claro', body: 'Veredicto con sustento — y pase directo a Asegurabilidad.' },
    ],
    night: {
      kicker: '10:21 a.m., un estudio real',
      h2: 'El estudio deja de tardar <em>tres días</em>',
      quote: 'Identidad, capacidad de pago y comportamiento en un solo veredicto — antes de que el candidato se enfríe.',
      log: [
        { time: '10:21', text: 'Solicitud de estudio · Andrés F. · CC 1.043.···' },
        { time: '10:22', text: 'Identidad verificada · documento válido' },
        { time: '10:23', text: 'Capacidad de pago: ingresos <span class="lb">2.4×</span> el canon' },
        { time: '10:24', text: 'Señales de riesgo: ninguna' },
        { time: '10:24', text: 'Veredicto: <span class="lb">riesgo bajo</span> → listo para firmar' },
      ],
    },
    demoPrompt: 'Corremos un estudio real de principio a fin contigo.',
  },

  avaluos: {
    slug: 'avaluos',
    eyebrow: 'Agentes AI · 03',
    badge: 'Agente',
    name: 'Avalúos',
    h1: 'El precio correcto, con datos',
    lead: 'Cada inmueble con el canon del mercado real de tu ciudad: ni sobrevalorado ni regalado.',
    ctas: SHARED_CTAS,
    textureId: 't7',
    window: {
      title: 'Leasefy · Avalúo — Apto 301, Envigado',
      tag: 'En segundos',
      vignettes: [
        {
          kind: 'ledger',
          header: { label: 'Comparables', meta: 'Envigado', family: 'ag' },
          data: {
            columns: ['Comparable', 'Canon', 'm²'],
            rows: [
              { cells: ['Apto 502 · Envigado', '$2.65M', '70'] },
              { cells: ['Apto 218 · Envigado', '$2.58M', '66'] },
              { cells: ['Casa 12 · Envigado', '$2.90M', '84'] },
            ],
          },
        },
        {
          kind: 'stat',
          header: { label: 'Canon sugerido', meta: 'Apto 301', family: 'ag' },
          data: { big: '$2.6–2.75M', label: 'Canon sugerido', sub: '14 comparables reales de la zona' },
        },
        {
          kind: 'rows',
          header: { label: 'Ajustes', meta: 'Apto 301', family: 'ag' },
          data: {
            rows: [
              { label: 'Piso alto + balcón', value: '+4%', tone: 'ok' },
              { label: 'Parqueadero', value: '+6%', tone: 'ok' },
              { label: 'Tiempo estimado', value: '3 semanas', tone: 'mb' },
            ],
          },
        },
      ],
    },
    stories: [
      {
        kicker: 'Comparables',
        h3: 'Tu zona, no promedios nacionales',
        body: 'El agente arma el comparativo con arriendos reales del sector — mismo estrato, misma tipología, mismo momento del mercado.',
        vignette: {
          kind: 'ledger',
          header: { label: 'Comparables', meta: 'Zona real', family: 'ag' },
          data: {
            columns: ['Comparable', 'Canon', 'Estado'],
            rows: [
              { cells: ['Apto 502 · Envigado', '$2.65M', 'Activo'], tone: 'ok' },
              { cells: ['Apto 218 · Envigado', '$2.58M', 'Arrendado'] },
              { cells: ['Apto 114 · Envigado', '$2.70M', 'Activo'], tone: 'ok' },
            ],
          },
        },
      },
      {
        kicker: 'Ajustes',
        h3: 'El inmueble real, no el ideal',
        body: 'Piso, estado, parqueadero, años del edificio: cada ajuste queda explícito, para que el canon refleje lo que se está arrendando de verdad.',
        vignette: {
          kind: 'rows',
          header: { label: 'Ajustes aplicados', meta: 'Apto 301', family: 'ag' },
          data: {
            rows: [
              { label: 'Piso alto + balcón', value: '+4%', tone: 'ok' },
              { label: '8 años · buen estado', value: '—' },
              { label: 'Parqueadero doble', value: '+6%', tone: 'ok' },
            ],
          },
        },
      },
      {
        kicker: 'Sustento',
        h3: 'Un precio que se puede defender',
        body: 'Cuando el propietario pida más, no discutes con opiniones: le muestras el comparativo, los ajustes y el tiempo estimado de arriendo a cada precio.',
        vignette: {
          kind: 'stat',
          header: { label: 'Sustento', meta: 'Propietario', family: 'ag' },
          data: { big: '3 sem <em>vs</em> 8+', label: 'Tiempo de arriendo estimado', sub: 'a $2.7M vs a $3.1M · con sustento' },
        },
      },
    ],
    capabilities: [
      { title: 'Comparables de zona', body: 'Arriendos reales del sector, no promedios de portal.' },
      { title: 'Canon en segundos', body: 'Pides el avalúo y sale el rango con su sustento.' },
      { title: 'Ajustes explícitos', body: 'Estado, piso, amenidades: cada peso del ajuste se explica.' },
      { title: 'Historial del sector', body: 'Cómo se ha movido el precio de la zona, para conversar con datos.' },
    ],
    snapshot: [
      { label: 'Agente', value: '<b>Avalúos</b> · L-AG-03' },
      { label: 'Datos', value: 'Mercado real de tu ciudad, por zona' },
      { label: 'Responde en', value: 'Segundos' },
      { label: 'Entrega', value: 'Rango de canon + comparativo + tiempo estimado' },
      { label: 'Se conecta con', value: 'CRM (inventario), Matching' },
      { label: 'Incluido en', value: 'Planes con agentes AI' },
    ],
    steps: [
      { title: 'Cargas el inmueble', body: 'Dirección, tipología y estado. Lo demás lo trae el agente.' },
      { title: 'El agente arma el comparativo', body: 'Comparables, ajustes y rango sugerido, con sustento.' },
      { title: 'Publicas con precio defendible', body: 'Y el propietario recibe el porqué, no una cifra suelta.' },
    ],
    night: {
      kicker: '11:02 a.m., un avalúo real',
      h2: 'Ni sobrevalorado <em>ni regalado</em>',
      quote: 'Un canon anclado al mercado real de tu ciudad arrienda más rápido y discute menos.',
      log: [
        { time: '11:02', text: 'Solicitud de canon · Apto 301 · Envigado' },
        { time: '11:02', text: '14 comparables reales encontrados en la zona' },
        { time: '11:03', text: 'Ajustes aplicados: piso alto, parqueadero, 8 años' },
        { time: '11:03', text: 'Canon sugerido: <span class="lb">$2.6M – $2.75M</span>' },
        { time: '11:04', text: 'Tiempo estimado de arriendo: 3 semanas' },
      ],
    },
    demoPrompt: 'Avaluamos en vivo un inmueble tuyo, con comparables reales.',
  },

  conciliacion: {
    slug: 'conciliacion',
    eyebrow: 'Agentes AI · 04',
    badge: 'Agente',
    name: 'Conciliación',
    h1: 'Cuadre contra el banco, sin Excel',
    lead: 'El match entre extracto y contrato deja de ser un Excel de viernes: cada pago encuentra su contrato solo.',
    ctas: SHARED_CTAS,
    textureId: 't6',
    window: {
      title: 'Leasefy · Conciliación — Extracto de hoy',
      tag: '6:12 a.m.',
      vignettes: [
        {
          kind: 'stat',
          header: { label: 'Match', meta: 'Hoy 6:12 a.m.', family: 'ag' },
          data: { big: '209<em>/214</em>', label: 'Match exacto automático', sub: '3 ambiguas con sugerencia · 2 alertas' },
        },
        {
          kind: 'ledger',
          header: { label: 'Extracto', meta: '214 mov.', family: 'ag' },
          data: {
            columns: ['Movimiento', 'Contrato', 'Match'],
            rows: [
              { cells: ['$2.450.000', 'CT-1042', 'Exacto'], tone: 'ok' },
              { cells: ['$1.980.000', 'CT-1103', 'Exacto'], tone: 'ok' },
              { cells: ['$840.000', '—', 'Revisar'], tone: 'mb' },
            ],
          },
        },
        {
          kind: 'rows',
          header: { label: 'Excepciones', meta: 'Hoy', family: 'ag' },
          data: {
            rows: [
              { label: 'Referencia ambigua', value: '3 · sugerencia lista', tone: 'mb' },
              { label: 'Sin identificar', value: '2 · alerta enviada' },
              { label: 'Duplicados', value: '0', tone: 'ok' },
            ],
          },
        },
      ],
    },
    stories: [
      {
        kicker: 'Match',
        h3: 'Banco y contratos, en la misma línea',
        body: 'El agente lee el extracto y encuentra el contrato de cada pago: por referencia, por monto, por historia. El cuadre deja de ser un deporte de viernes.',
        vignette: {
          kind: 'ledger',
          header: { label: 'Match banco', meta: 'Automático', family: 'ag' },
          data: {
            columns: ['Movimiento', 'Contrato', 'Match'],
            rows: [
              { cells: ['$2.450.000', 'CT-1042', 'Exacto'], tone: 'ok' },
              { cells: ['$1.980.000', 'CT-1103', 'Exacto'], tone: 'ok' },
              { cells: ['$3.120.000', 'CT-0977', 'Exacto'], tone: 'ok' },
            ],
          },
        },
      },
      {
        kicker: 'Excepciones',
        h3: 'Lo raro salta solo',
        body: 'Referencias ambiguas, montos parciales, pagos duplicados: el agente los separa con una sugerencia de resolución, en vez de esconderlos en el promedio.',
        vignette: {
          kind: 'rows',
          header: { label: 'Excepciones', meta: '2 de 214', family: 'ag' },
          data: {
            rows: [
              { label: 'Ref. ambigua', value: 'Sugerencia lista', tone: 'mb' },
              { label: 'Pago parcial', value: 'Marcado al contrato' },
              { label: 'Duplicado', value: 'Ninguno', tone: 'ok' },
            ],
          },
        },
      },
      {
        kicker: 'Trazabilidad',
        h3: 'Cada peso con su historia',
        body: 'De cada movimiento del extracto puedes llegar al contrato, al cobro y al informe del propietario. Auditoría sin arqueología.',
        vignette: {
          kind: 'steps',
          header: { label: 'Trazabilidad', meta: 'Mov. #118', family: 'ag' },
          data: {
            steps: [
              { title: 'Movimiento #118', meta: 'extracto · 6:12 a.m.', status: 'done' },
              { title: 'Cobro de marzo', meta: 'generado el día 1', status: 'done' },
              { title: 'Contrato CT-1042', meta: 'canon $2.450.000', status: 'done' },
              { title: 'Informe al propietario', meta: 'enviado ✓', status: 'done' },
            ],
          },
        },
      },
    ],
    capabilities: [
      { title: 'Match automático', body: 'Extracto contra contratos, todos los días, sin planilla.' },
      { title: 'Alertas de no identificados', body: 'Lo que no cuadra se ve hoy, no al cierre.' },
      { title: 'Cierre en horas', body: 'La conciliación deja de definir la fecha del cierre de mes.' },
      { title: 'Trazabilidad total', body: 'Del peso en el banco al contrato y al informe, en clics.' },
    ],
    snapshot: [
      { label: 'Agente', value: '<b>Conciliación</b> · L-AG-04' },
      { label: 'Corre', value: 'Con cada extracto, todos los días' },
      { label: 'Se alimenta de', value: 'Extractos bancarios + ERP de arriendos' },
      { label: 'Resuelve', value: 'Match banco–contrato, referencias ambiguas, parciales' },
      { label: 'Escala', value: 'Solo pagos sin identificar' },
      { label: 'Incluido en', value: 'Planes con agentes AI' },
    ],
    steps: [
      { title: 'Conectas el extracto', body: 'El banco entra al sistema tal como llega.' },
      { title: 'El agente cruza todo', body: 'Match por referencia, monto e historia de pago.' },
      { title: 'Tesorería solo ve excepciones', body: 'Dos casos con sugerencia, no doscientas filas.' },
    ],
    night: {
      kicker: '6:10 a.m., llega el extracto',
      h2: 'El extracto se cuadra <em>solo</em>',
      quote: 'Cada peso del extracto sabe a qué contrato pertenece — y lo que no cuadra salta de una.',
      log: [
        { time: '06:10', text: 'Extracto recibido · 214 movimientos' },
        { time: '06:11', text: '209 pagos con match exacto · <span class="lb">automático</span>' },
        { time: '06:11', text: '3 referencias ambiguas → sugerencia lista' },
        { time: '06:12', text: '2 sin identificar → alerta a tesorería' },
        { time: '06:12', text: 'Conciliado: 209 de 214 · quedan 5 con gestión' },
      ],
    },
    demoPrompt: 'Conciliamos un extracto real contigo en la demo.',
  },

  matching: {
    slug: 'matching',
    eyebrow: 'Agentes AI · 05',
    badge: 'Agente',
    name: 'Matching',
    h1: 'Opciones reales, el mismo día',
    lead: 'El agente cruza necesidad, presupuesto e inventario al instante — cada interesado recibe opciones que sí aplican.',
    ctas: SHARED_CTAS,
    textureId: 't3',
    window: {
      title: 'Leasefy · Matching — Interesado M-77',
      tag: 'Mismo día',
      vignettes: [
        {
          kind: 'rows',
          header: { label: 'Interesado M-77', meta: '9:31 a.m.', family: 'ag' },
          data: {
            rows: [
              { label: 'Necesidad', value: '2 alcobas · Laureles' },
              { label: 'Presupuesto', value: '$2.5M – $3M' },
              { label: 'Aplican', value: '6 de 86', tone: 'mb' },
            ],
          },
        },
        {
          kind: 'ledger',
          header: { label: 'Opciones', meta: 'Top 3', family: 'ag' },
          data: {
            columns: ['Opción', 'Canon', 'Encaje'],
            rows: [
              { cells: ['Apto 402 · Laureles', '$2.8M', 'Alto'], tone: 'ok' },
              { cells: ['Casa 12 · Conquistadores', '$2.9M', 'Alto'], tone: 'ok' },
              { cells: ['Apto 118 · Estadio', '$2.6M', 'Alterna'] },
            ],
          },
        },
        {
          kind: 'chat',
          header: { label: 'WhatsApp · M-77', meta: '9:33 a.m.', family: 'chat' },
          data: {
            messages: [
              { direction: 'out', text: 'Te tengo 3 opciones que encajan con lo que buscas. ¿Agendamos visita para hoy?', time: '9:33' },
              { direction: 'in', text: '¡La del 402 me gustó! ¿A las 4?', time: '10:05' },
            ],
          },
        },
      ],
    },
    stories: [
      {
        kicker: 'Cruce',
        h3: 'Inventario y necesidad, al instante',
        body: 'Zona, presupuesto, alcobas, mascotas, fechas: el agente cruza todo contra el inventario vivo y descarta lo que no aplica antes de que nadie pierda una visita.',
        vignette: {
          kind: 'rows',
          header: { label: 'Cruce', meta: 'M-77', family: 'ag' },
          data: {
            rows: [
              { label: 'Inventario vivo', value: '86 inmuebles' },
              { label: 'Aplican', value: '6 candidatos', tone: 'mb' },
              { label: 'Descartados', value: 'Fuera de presupuesto' },
            ],
          },
        },
      },
      {
        kicker: 'Prioridad',
        h3: 'Primero lo que sí va a cerrar',
        body: 'No son 20 links: son 3 opciones ordenadas por probabilidad de cierre, con el porqué de cada una. El asesor sale a visitar con tiro hecho.',
        vignette: {
          kind: 'ledger',
          header: { label: 'Prioridad', meta: 'Por cierre', family: 'ag' },
          data: {
            columns: ['Opción', 'Encaje', 'Por qué'],
            rows: [
              { cells: ['Apto 402', 'Alto', 'zona + canon'], tone: 'ok' },
              { cells: ['Casa 12', 'Alto', 'espacio + fecha'], tone: 'ok' },
              { cells: ['Apto 118', 'Alterna', 'canon menor'] },
            ],
          },
        },
      },
      {
        kicker: 'Aprendizaje',
        h3: 'Cada cierre lo vuelve mejor',
        body: 'El agente registra qué se visitó, qué gustó y qué cerró. Con cada arriendo, las próximas opciones llegan más afinadas para tu zona.',
        vignette: {
          kind: 'chat',
          header: { label: 'Feedback · M-77', meta: '5:05 p.m.', family: 'chat' },
          data: {
            messages: [
              { direction: 'in', text: 'Al final el parqueadero fue lo que definió', time: '17:05' },
              { direction: 'out', text: 'Anotado ✓ — lo tendré en cuenta para las próximas opciones de la zona', time: '17:06' },
            ],
          },
        },
      },
    ],
    capabilities: [
      { title: 'Cruce automático', body: 'Necesidad contra inventario vivo, sin repasar listas a mano.' },
      { title: 'Mismo día', body: 'Las opciones salen mientras el interesado sigue caliente.' },
      { title: 'Prioriza por cierre', body: 'Pocas opciones bien ordenadas, no un catálogo.' },
      { title: 'Menos visitas perdidas', body: 'El asesor visita lo que tiene probabilidad real.' },
    ],
    snapshot: [
      { label: 'Agente', value: '<b>Matching</b> · L-AG-05' },
      { label: 'Responde en', value: 'El mismo día, normalmente en minutos' },
      { label: 'Cruza', value: 'Necesidad, presupuesto, inventario vivo' },
      { label: 'Se alimenta de', value: 'CRM + Avalúos' },
      { label: 'Mejora con', value: 'Cada arriendo cerrado' },
      { label: 'Incluido en', value: 'Planes con agentes AI' },
    ],
    steps: [
      { title: 'Llega el interesado', body: 'Del CRM, con su necesidad ya estructurada.' },
      { title: 'El agente cruza y prioriza', body: 'Contra el inventario vivo, con probabilidad de cierre.' },
      { title: 'El asesor visita con tiro hecho', body: 'Opciones enviadas, visita agendada, feedback registrado.' },
    ],
    night: {
      kicker: '9:31 a.m., entra un interesado',
      h2: 'Nadie espera <em>una semana</em> por opciones',
      quote: 'El agente cruza necesidad, presupuesto e inventario al instante — y aprende de cada arriendo cerrado.',
      log: [
        { time: '09:31', text: 'Interesado nuevo · 2 alcobas · $2.5M – $3M · Laureles' },
        { time: '09:31', text: 'Inventario cruzado: 6 candidatos' },
        { time: '09:32', text: '3 opciones priorizadas por probabilidad de cierre' },
        { time: '09:33', text: 'Enviadas por <span class="lb">WhatsApp</span> · visita sugerida' },
        { time: '17:05', text: 'Feedback registrado → aprende para la próxima' },
      ],
    },
    demoPrompt: 'Cruzamos tu inventario real con casos de interesados.',
  },

  asegurabilidad: {
    slug: 'asegurabilidad',
    eyebrow: 'Agentes AI · 06',
    badge: 'Agente',
    name: 'Asegurabilidad',
    h1: 'Contratos protegidos desde la firma',
    lead: 'El agente evalúa y gestiona la asegurabilidad de cada contrato — propietarios tranquilos desde el día uno.',
    ctas: SHARED_CTAS,
    textureId: 't6',
    window: {
      title: 'Leasefy · Asegurabilidad — CT-1103',
      tag: 'Firma hoy',
      vignettes: [
        {
          kind: 'steps',
          header: { label: 'CT-1103', meta: 'Firma hoy', family: 'ag' },
          data: {
            steps: [
              { title: 'Estudio del inquilino', meta: 'riesgo bajo · aprobado', status: 'done' },
              { title: 'Cotización en paralelo', meta: '3 aseguradoras · 12:05', status: 'done' },
              { title: 'Veredicto', meta: 'póliza sugerida · 12:07', status: 'done' },
              { title: 'Cobertura activa', meta: 'desde la firma', status: 'on' },
            ],
          },
        },
        {
          kind: 'ledger',
          header: { label: 'Cotización', meta: 'En paralelo', family: 'ag' },
          data: {
            columns: ['Aseguradora', 'Respuesta', 'Tiempo'],
            rows: [
              { cells: ['Aseguradora A', 'Cotizó', '2 min'], tone: 'ok' },
              { cells: ['Aseguradora B', 'Cotizó', '3 min'], tone: 'ok' },
              { cells: ['Aseguradora C', 'Cotizó', '5 min'], tone: 'ok' },
            ],
          },
        },
        {
          kind: 'doc',
          header: { label: 'Póliza', meta: 'CT-1103', family: 'ag' },
          stamp: 'Aprobado ✓',
          data: {
            title: 'Póliza recomendada',
            lines: ['Mejor cobertura/costo', 'Activa desde la firma', 'Renovación vigilada'],
          },
        },
      ],
    },
    stories: [
      {
        kicker: 'Evaluación',
        h3: 'Asegurable o no, antes de firmar',
        body: 'Con el estudio del inquilino en la mano, el agente evalúa la asegurabilidad del contrato antes de que se firme — no cuando ya hay un problema.',
        vignette: {
          kind: 'steps',
          header: { label: 'Evaluación', meta: 'CT-1103', family: 'ag' },
          data: {
            steps: [
              { title: 'Estudio recibido', meta: 'riesgo bajo', status: 'done' },
              { title: 'Canon vs cobertura', meta: 'dentro de póliza', status: 'done' },
              { title: 'Evaluación', meta: 'asegurable', status: 'on' },
            ],
          },
        },
      },
      {
        kicker: 'Gestión',
        h3: 'Las aseguradoras cotizan a la vez',
        body: 'Nada de mandar correos uno por uno: las aseguradoras integradas cotizan en paralelo y llega un veredicto listo para firmar.',
        vignette: {
          kind: 'ledger',
          header: { label: 'Aseguradoras', meta: 'Paralelo', family: 'ag' },
          data: {
            columns: ['Aseguradora', 'Respuesta', 'Tiempo'],
            rows: [
              { cells: ['Aseguradora A', 'Cotizó', '2 min'], tone: 'ok' },
              { cells: ['Aseguradora B', 'Cotizó', '3 min'], tone: 'ok' },
              { cells: ['Recomendada', 'Mejor c/c', '—'], tone: 'mb' },
            ],
          },
        },
      },
      {
        kicker: 'Vigencia',
        h3: 'Renovaciones que avisan solas',
        body: 'Las pólizas no se vencen en silencio: el agente avisa con tiempo, gestiona la renovación y deja el rastro en el contrato.',
        vignette: {
          kind: 'rows',
          header: { label: 'Vigencias', meta: 'Cartera', family: 'ag' },
          data: {
            rows: [
              { label: 'Pólizas activas', value: '198', tone: 'ok' },
              { label: 'Por renovar', value: '4 · avisadas', tone: 'mb' },
              { label: 'Vencidas sin gestión', value: '0', tone: 'ok' },
            ],
          },
        },
      },
    ],
    capabilities: [
      { title: 'Evaluación por contrato', body: 'Cada firma pasa por su filtro de asegurabilidad, sin excepción.' },
      { title: 'Cotización integrada', body: 'Aseguradoras en paralelo, veredicto en minutos.' },
      { title: 'Cobertura desde la firma', body: 'El contrato nace protegido, no queda en trámite.' },
      { title: 'Alertas de renovación', body: 'Vencimientos avisados con tiempo, gestionados y registrados.' },
    ],
    snapshot: [
      { label: 'Agente', value: '<b>Asegurabilidad</b> · L-AG-06' },
      { label: 'Evalúa', value: 'Cada contrato antes de la firma' },
      { label: 'Cotiza con', value: 'Aseguradoras integradas, en paralelo' },
      { label: 'Se conecta con', value: 'Estudio del inquilino, ERP' },
      { label: 'Avisa', value: 'Vencimientos y renovaciones, con tiempo' },
      { label: 'Incluido en', value: 'Planes con agentes AI' },
    ],
    steps: [
      { title: 'El contrato llega del CRM', body: 'Con el estudio del inquilino ya resuelto.' },
      { title: 'El agente evalúa y cotiza', body: 'Aseguradoras en paralelo, veredicto listo para firma.' },
      { title: 'Se firma con cobertura activa', body: 'Y las renovaciones quedan vigiladas desde el día uno.' },
    ],
    night: {
      kicker: '12:04 p.m., contrato nuevo',
      h2: 'El propietario duerme <em>tranquilo</em>',
      quote: 'Cada contrato se firma con su protección resuelta — y las renovaciones no se vencen en silencio.',
      log: [
        { time: '12:04', text: 'Contrato nuevo · CT-1103 → evaluación' },
        { time: '12:05', text: 'Cotizado con 3 aseguradoras a la vez' },
        { time: '12:07', text: 'Veredicto: <span class="lb">aprobado</span> · póliza sugerida' },
        { time: '12:08', text: 'Cobertura activa desde la firma' },
        { time: '—30 d', text: 'Renovación: avisada sola, antes de vencer' },
      ],
    },
    demoPrompt: 'Evaluamos la asegurabilidad de un contrato tuyo en vivo.',
  },
}
