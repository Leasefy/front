/**
 * mock-naira.ts — los ejemplos de Naira (Fase 13, plan 13-01). Un ejemplo por endpoint, y cada uno ES el contrato.
 *
 * Todo lo de este archivo es INVENTADO: no sale de ninguna agencia ni de ningún agente vivo. Existe porque 16 de los 17
 * endpoints de Naira todavía no están publicados por el servicio de agentes (planes 9.5-06, 10-06, 11-07 y 12-07 sin
 * ejecutar) y la superficie tiene que poder verse con datos de ejemplo.
 *
 * Reglas (D13-6, UI-SPEC §8.6 y §9):
 *   · Se importa SOLO desde src/lib/api/naira/cliente.ts, con import dinámico y detrás de la guarda única del modo
 *     simulado de src/lib/api/config.ts (nunca en producción). Ningún otro archivo que no sea test lo importa.
 *   · Cada ejemplo pasa su esquema en modo ESTRICTO en todos los niveles (mock-naira.test.ts): si un campo no existe en
 *     el contrato, el ejemplo no compila ni pasa. No es la medida de un componente.
 *   · Nada puede parecer medido: toda fecha es del año 2000, todo texto libre lleva «(ejemplo)», los ids son imposibles
 *     (00000000-0000-4000-8000-0000000000NN) y ningún monto, dirección ni nombre es de una agencia real. Donde el
 *     servidor real pondría un corte dentro de un texto, el ejemplo dice «(corte: dato de ejemplo)».
 *   · Los `userId` son centinelas (USER_IDS_DE_EJEMPLO): las guardias B-5 de 13-02 y 13-07 los buscan en el DOM para
 *     probar que ninguna vista pinta a una persona del equipo.
 *   · Todo texto va en TUTEO (E13-8): el guardián src/lib/i18n/el-producto-tutea.test.ts barre src/lib.
 *   · Sin reloj: ninguna fecha se calcula en ejecución.
 */

import type { IdDeEndpoint, RespuestasDeNaira } from '@/lib/api/naira/contrato'

/** Un lunes del año 2000: ningún ejemplo parece de hoy. */ // +
export const FECHA_DE_EJEMPLO = '2000-01-03'

const USUARIO_QUE_ESCRIBE = '00000000-0000-4000-8000-0000000b5001'
const USUARIO_QUE_BORRA = '00000000-0000-4000-8000-0000000b5002'

/** Todo `userId` que aparece en los ejemplos (centinelas para las guardias B-5). */ // +
export const USER_IDS_DE_EJEMPLO: readonly string[] = [USUARIO_QUE_ESCRIBE, USUARIO_QUE_BORRA]

const CORTE = '2000-01-03T11:00:00.000Z'
const CONGELADA_EN = '2000-01-03T11:30:00.000Z'
const MAS_TARDE = '2000-01-03T12:00:00.000Z'
const MANANA = '2000-01-04T11:00:00.000Z'

const ITEM_CREIDO = '00000000-0000-4000-8000-000000000001'
const ITEM_DICHO = '00000000-0000-4000-8000-000000000002'
const ITEM_INFERIDO = '00000000-0000-4000-8000-000000000003'
const ITEM_BORRADO = '00000000-0000-4000-8000-000000000004'
const PROPUESTA_PROCEDURAL = '00000000-0000-4000-8000-000000000005'
const AUDITORIA = '00000000-0000-4000-8000-000000000006'
const PREGUNTA = '00000000-0000-4000-8000-000000000010'
const INVESTIGACION = '00000000-0000-4000-8000-000000000011'
const PROMOCION_ATENCION = '00000000-0000-4000-8000-000000000020'
const PROMOCION_INFORMATIVO = '00000000-0000-4000-8000-000000000021'
const INVESTIGACION_DE_LA_SENAL = '00000000-0000-4000-8000-000000000022'
const INMUEBLE = '00000000-0000-4000-8000-000000000030'
const RESPUESTA_DE_RECALL = '00000000-0000-4000-8000-000000000040'
const VOTO = '00000000-0000-4000-8000-000000000041'
const LOOP_EN_SEGUIMIENTO = '00000000-0000-4000-8000-000000000050'
const LOOP_EN_CONFIRMACION = '00000000-0000-4000-8000-000000000051'
const PROPUESTA_DE_ACCION = '00000000-0000-4000-8000-000000000060'
const PROPUESTA_VENCIDA = '00000000-0000-4000-8000-000000000064'
const SENAL = '00000000-0000-4000-8000-000000000061'
const HECHO = '00000000-0000-4000-8000-000000000062'
const DECISION = '00000000-0000-4000-8000-000000000063'
const TAREA = '00000000-0000-4000-8000-000000000070'

const DETECTOR = 'morosidad_sube@1'
const CLAVE_DE_CAUSA = 'morosidad_sube@1:cartera.morosidad_rate:2000-01-03'

// ── Memoria ──

const ITEM_ESCRITO = {
  id: ITEM_DICHO,
  layer: 'preference',
  provenance: 'stated_by_human',
  trust: 'staff',
  writtenBy: { kind: 'user', userId: USUARIO_QUE_ESCRIBE },
  derivedFrom: { kind: 'human_statement' },
  recordedAt: MAS_TARDE,
  revision: '42',
  content: { kind: 'present', text: 'La agencia prefiere recibir el resumen antes de las siete de la mañana (ejemplo).' },
} as const

const MEMORIA: RespuestasDeNaira['memoria.vista'] = {
  snapshot: { revision: '41' },
  items: [
    {
      id: ITEM_CREIDO,
      layer: 'semantic',
      provenance: 'observed',
      trust: 'system',
      writtenBy: { kind: 'system' },
      derivedFrom: { kind: 'fact', source: 'agent.debtor_states', ref: 'estado-de-la-cartera (ejemplo)' },
      recordedAt: CORTE,
      revision: '38',
      content: { kind: 'present', text: 'La mora se concentra en contratos de más de un año (ejemplo).' },
    },
    {
      id: ITEM_DICHO,
      layer: 'preference',
      provenance: 'stated_by_human',
      trust: 'staff',
      writtenBy: { kind: 'user', userId: USUARIO_QUE_ESCRIBE },
      derivedFrom: { kind: 'human_statement' },
      recordedAt: CORTE,
      revision: '39',
      content: { kind: 'present', text: 'La agencia prefiere recibir el resumen temprano (ejemplo).' },
    },
    {
      id: ITEM_INFERIDO,
      layer: 'episodic',
      provenance: 'inferred',
      trust: 'system',
      writtenBy: { kind: 'system' },
      derivedFrom: { kind: 'memory', itemId: ITEM_CREIDO },
      recordedAt: CORTE,
      revision: '40',
      content: { kind: 'present', text: 'Los contratos nuevos pagan a tiempo con más frecuencia (ejemplo).' },
    },
    {
      id: ITEM_BORRADO,
      layer: 'procedural',
      provenance: 'stated_by_human',
      trust: 'staff',
      writtenBy: { kind: 'user', userId: USUARIO_QUE_ESCRIBE },
      derivedFrom: { kind: 'human_statement' },
      recordedAt: CORTE,
      revision: '41',
      content: { kind: 'erased', erasedAt: MAS_TARDE, erasedBy: { kind: 'user', userId: USUARIO_QUE_BORRA } },
    },
  ],
  pendingProposals: [
    {
      id: PROPUESTA_PROCEDURAL,
      proposedBy: { kind: 'user', userId: USUARIO_QUE_ESCRIBE },
      proposedAt: CORTE,
      text: 'Revisa primero los acuerdos de pago vencidos (ejemplo).',
    },
  ],
  generatedAt: MAS_TARDE,
}

const ESCRITURA: RespuestasDeNaira['memoria.corregir'] = { item: ITEM_ESCRITO, snapshot: { revision: '42' } }

// ── Conversación ──

const ORACION_CON_CIFRA = 'La morosidad de la cartera es de 12,5 % (corte: dato de ejemplo) (ejemplo).'
const ORACION_DECLARADA = 'Solo te respondo con las métricas de tu agencia (ejemplo).'

const RESPUESTA: RespuestasDeNaira['conversacion.preguntar'] = {
  kind: 'respondida',
  preguntaId: PREGUNTA,
  texto: [ORACION_CON_CIFRA, ORACION_DECLARADA].join('\n'),
  refsServidas: ['catalogo:cartera.morosidad_rate (ejemplo)'],
  asOfs: [CORTE],
  alcance: { kind: 'toda_la_agencia' },
  noServidos: [],
  oraciones: [
    {
      seccion: 'LIVE_DATA',
      texto: ORACION_CON_CIFRA,
      claimClass: 'aritmetica',
      cifras: [{ metricId: 'cartera.morosidad_rate', asOf: CORTE }],
    },
    { seccion: 'declaracion', texto: ORACION_DECLARADA, claimClass: null, cifras: [] },
  ],
  refs: [
    { kind: 'chunk', source: 'politica', sourceRef: 'politica-de-cobro (ejemplo)' },
    { kind: 'investigacion', id: INVESTIGACION },
  ],
}

// ── Briefing y señal ──

const TITULO_DE_ATENCION = 'La morosidad de la cartera subió por encima de su umbral (ejemplo).'

const ITEM_DE_ATENCION = {
  seccion: 'atencion',
  posicion: 1,
  metricId: 'cartera.morosidad_rate',
  valor: '12.5',
  unidad: 'pct',
  asOf: CORTE,
  fuente: 'agent.debtor_states',
  trust: 'system',
  clave: CLAVE_DE_CAUSA,
  urgencyClass: 'degradacion_con_realimentacion',
  titulo: TITULO_DE_ATENCION,
  promocion: { kind: 'promovida', promocionId: PROMOCION_ATENCION },
  causa: { kind: 'investigada', razon: 'Se concentra en contratos firmados este trimestre (ejemplo).' },
  entidades: { kind: 'agregada' },
  valorRenderizado: '12,5%',
  nombreDeMetrica: 'Morosidad de la cartera (ejemplo)',
} as const

const BRIEFING: RespuestasDeNaira['briefing.dia'] = {
  dia: FECHA_DE_EJEMPLO,
  corte: CORTE,
  resultado: {
    kind: 'entregado',
    entregas: [
      {
        canal: 'email',
        tipo: 'briefing',
        congeladaEn: CONGELADA_EN,
        estadoDelEnvio: 'enviado',
        items: [
          ITEM_DE_ATENCION,
          {
            seccion: 'informativo',
            posicion: 2,
            metricId: 'cartera.recovered_cop_30d',
            valor: '1500000',
            unidad: 'cop',
            asOf: CORTE,
            fuente: 'agent.payments',
            trust: 'system',
            clave: 'recaudo_baja@1:cartera.recovered_cop_30d:2000-01-03',
            urgencyClass: 'reversible',
            titulo: 'El recaudo de los últimos treinta días quedó por debajo de lo usual (ejemplo).',
            promocion: { kind: 'promovida', promocionId: PROMOCION_INFORMATIVO },
            causa: { kind: 'investigacion_no_disponible' },
            entidades: { kind: 'lista', items: [{ tipo: 'inmueble', id: INMUEBLE }] },
            valorRenderizado: '$ 1.500.000',
            nombreDeMetrica: 'Recaudo de los últimos 30 días (ejemplo)',
          },
          {
            seccion: 'estado',
            posicion: 3,
            metricId: 'portafolio.available_units_count',
            valor: '4',
            unidad: 'count',
            asOf: CORTE,
            fuente: 'public.consignaciones',
            trust: 'system',
            clave: 'estado:portafolio.available_units_count:2000-01-03',
            urgencyClass: 'reversible',
            titulo: 'Inmuebles disponibles (ejemplo).',
            promocion: { kind: 'sin_promocion' },
            causa: { kind: 'investigacion_no_disponible' },
            entidades: { kind: 'agregada' },
            valorRenderizado: '4',
            nombreDeMetrica: 'Inmuebles disponibles (ejemplo)',
          },
          {
            seccion: 'seguimiento',
            posicion: 4,
            metricId: 'cartera.escalations_open_count',
            valor: '3',
            unidad: 'count',
            asOf: CORTE,
            fuente: 'agent.escalations',
            trust: 'system',
            clave: 'escalaciones_abiertas@1:cartera.escalations_open_count:2000-01-03',
            urgencyClass: 'reversible',
            titulo: 'Sigue abierto el seguimiento de las escalaciones (ejemplo).',
            promocion: { kind: 'sin_promocion' },
            causa: { kind: 'investigacion_no_disponible' },
            entidades: { kind: 'agregada' },
            valorRenderizado: '3',
            nombreDeMetrica: 'Escalaciones abiertas (ejemplo)',
          },
        ],
      },
    ],
    ocultosPorRol: 0,
  },
}

const CITA = 'La subida coincide con los contratos firmados este trimestre (corte: dato de ejemplo) (ejemplo).'

const SENAL_DETALLE: RespuestasDeNaira['senal.detalle'] = {
  promocionId: PROMOCION_ATENCION,
  dia: FECHA_DE_EJEMPLO,
  corte: CORTE,
  congeladaEn: CONGELADA_EN,
  item: { ...ITEM_DE_ATENCION, entidades: { kind: 'lista', items: [{ tipo: 'inmueble', id: INMUEBLE }] } },
  causa: {
    kind: 'citada',
    investigacionId: INVESTIGACION_DE_LA_SENAL,
    citas: [CITA],
    citasConClase: [
      {
        texto: CITA,
        claimClass: 'hipotesis',
        hipotesis: {
          banda: 'probable',
          alternativa: { kind: 'sin_driver_alternativo_en_la_descomposicion' },
          discriminador: { metricId: 'cartera.morosidad_rate', direccionEsperada: 'sube' },
        },
      },
    ],
  },
}

// ── Seguimiento ──

const LOOP_EN_SEGUIMIENTO_EJEMPLO = {
  loopId: LOOP_EN_SEGUIMIENTO,
  detectorId: DETECTOR,
  metricId: 'cartera.morosidad_rate',
  clase: 'state',
  familia: 'cartera',
  episodio: FECHA_DE_EJEMPLO,
  claveDeCausa: CLAVE_DE_CAUSA,
  promocionId: PROMOCION_ATENCION,
  owner: 'role:cartera',
  ownerRazon: 'sin_fuente_de_asignacion',
  estado: 'en_seguimiento',
  ciclos: 1,
  forma: 'recordatorio',
  nextCheckAt: { kind: 'programada', en: MANANA },
  candidato: { kind: 'ninguno' },
  huerfanoDeRol: false,
  ultimoDiaVerificado: FECHA_DE_EJEMPLO,
  abiertoEn: CORTE,
  expiraEn: '2000-01-31T11:00:00.000Z',
  comunicacion: { kind: 'comunicado', primerDia: FECHA_DE_EJEMPLO },
} as const

const SEGUIMIENTO: RespuestasDeNaira['seguimiento.lista'] = {
  generadoEn: MAS_TARDE,
  loops: [
    LOOP_EN_SEGUIMIENTO_EJEMPLO,
    {
      ...LOOP_EN_SEGUIMIENTO_EJEMPLO,
      loopId: LOOP_EN_CONFIRMACION,
      metricId: 'cartera.escalations_open_count',
      claveDeCausa: 'escalaciones_abiertas@1:cartera.escalations_open_count:2000-01-03',
      estado: 'en_confirmacion',
      ciclos: 2,
      candidato: { kind: 'en_curso', desenlace: 'resuelto_por_dato', confirmaciones: 1, desde: FECHA_DE_EJEMPLO },
      comunicacion: { kind: 'sin_comunicar' },
    },
  ],
  ocultosPorRol: 0,
}

const LOOP_DETALLE: RespuestasDeNaira['seguimiento.detalle'] = {
  loop: {
    loopId: LOOP_EN_SEGUIMIENTO,
    detectorId: DETECTOR,
    metricId: 'cartera.morosidad_rate',
    clase: 'state',
    familia: 'cartera',
    episodio: FECHA_DE_EJEMPLO,
    claveDeCausa: CLAVE_DE_CAUSA,
    promocionId: PROMOCION_ATENCION,
    abiertoEn: CORTE,
    expiraEn: '2000-01-31T11:00:00.000Z',
    ownerAlNacer: 'role:cartera',
    owner: 'role:cartera',
    ownerRazon: 'sin_fuente_de_asignacion',
    huerfanoDeRol: false,
    cierre: { kind: 'abierto' },
    comunicacion: { kind: 'comunicado', primerDia: FECHA_DE_EJEMPLO },
  },
  eventos: [
    {
      tipo: 'nacimiento',
      seguimiento: {
        estado: 'abierto',
        ciclos: 0,
        forma: 'recordatorio',
        nextCheckAt: { kind: 'programada', en: MANANA },
        candidato: { kind: 'ninguno' },
        rachaSinReincidencia: 0,
        ultimoDiaVerificado: FECHA_DE_EJEMPLO,
      },
      cambioDeForma: { kind: 'sin_cambio' },
      memoria: { kind: 'ninguna' },
      owner: 'role:cartera',
      ownerRazon: 'sin_fuente_de_asignacion',
      cambioDeDueno: { kind: 'sin_cambio' },
      huerfanoDeRol: false,
      verificacion: { kind: 'nacimiento' },
      corte: CORTE,
      recordedAt: CONGELADA_EN,
    },
    {
      tipo: 'ciclo',
      seguimiento: {
        estado: 'en_seguimiento',
        ciclos: 1,
        forma: 'recordatorio',
        nextCheckAt: { kind: 'programada', en: '2000-01-05T11:00:00.000Z' },
        candidato: { kind: 'ninguno' },
        rachaSinReincidencia: 0,
        ultimoDiaVerificado: '2000-01-04',
      },
      cambioDeForma: { kind: 'sin_cambio' },
      memoria: { kind: 'ninguna' },
      owner: 'role:cartera',
      ownerRazon: 'sin_fuente_de_asignacion',
      cambioDeDueno: { kind: 'sin_cambio' },
      huerfanoDeRol: false,
      verificacion: { kind: 'del_dia' },
      corte: MANANA,
      recordedAt: '2000-01-04T11:30:00.000Z',
    },
  ],
}

// ── Acciones y tareas ──

const CONSECUENCIA = 'Crear una tarea para el rol de cartera: revisar los acuerdos de pago vencidos (ejemplo).'

const ACCIONES: RespuestasDeNaira['acciones.lista'] = {
  generadoEn: MAS_TARDE,
  desde: '2000-01-01T00:00:00.000Z',
  acciones: [
    {
      proposalId: PROPUESTA_DE_ACCION,
      consecuencia: { kind: 'reproducible', texto: CONSECUENCIA },
      tipo: 'crear_tarea',
      clase: 'interna_reversible',
      destinatario: { kind: 'rol', rol: 'role:cartera' },
      reversible: true,
      estado: 'pendiente',
      venceEn: MANANA,
      propuestaEn: CORTE,
      puedeDecidir: true,
      asOfs: [CORTE],
    },
    {
      proposalId: PROPUESTA_VENCIDA,
      consecuencia: { kind: 'no_reproducible' },
      tipo: 'aviso_interno',
      clase: 'interna_reversible',
      destinatario: { kind: 'rol', rol: 'role:portafolio' },
      reversible: true,
      estado: 'vencida',
      venceEn: CORTE,
      propuestaEn: '2000-01-02T11:00:00.000Z',
      puedeDecidir: false,
      asOfs: ['2000-01-02T11:00:00.000Z'],
    },
  ],
  ocultasPorRol: 0,
}

const ACCION_DETALLE: RespuestasDeNaira['acciones.detalle'] = {
  consecuencia: {
    texto: CONSECUENCIA,
    tipo: 'crear_tarea',
    clase: 'interna_reversible',
    destinatario: { kind: 'rol', rol: 'role:cartera' },
    reversible: true,
    venceEn: MANANA,
  },
  razonamiento: {
    senal: { senalId: SENAL, promocionId: PROMOCION_ATENCION, detectorId: DETECTOR, metricId: 'cartera.morosidad_rate' },
    hechos: [
      {
        factId: HECHO,
        value: 0.125,
        source: 'agent.debtor_states',
        asOf: CORTE,
        confidence: 1,
        volatility: 'slow',
        trust: 'system',
      },
    ],
    investigacion: { kind: 'referencia', id: PROMOCION_ATENCION },
  },
  huella: '00000000000000000000000000000000000000000000000000000000000000e1',
  estado: 'pendiente',
  puedeDecidir: true,
}

// ── Un ejemplo por endpoint ──

export const EJEMPLOS_DE_NAIRA: { readonly [K in IdDeEndpoint]: RespuestasDeNaira[K] } = {
  'memoria.vista': MEMORIA,
  'memoria.corregir': ESCRITURA,
  'memoria.borrar': { erasedItemIds: [ITEM_BORRADO], erasedAt: MAS_TARDE, auditId: AUDITORIA },
  'memoria.resolverPropuesta': { kind: 'rejected', proposalId: PROPUESTA_PROCEDURAL },
  'memoria.promover': ESCRITURA,
  'conversacion.preguntar': RESPUESTA,
  'briefing.dia': BRIEFING,
  'senal.detalle': SENAL_DETALLE,
  'recall.responder': { respuestaId: RESPUESTA_DE_RECALL },
  'senal.voto': { kind: 'registrado', votoId: VOTO, valor: 'util', diaDelVoto: FECHA_DE_EJEMPLO },
  'whatsapp.consentimiento': { otorgado: false, texto: 'Autorizo a la inmobiliaria a enviarme, por WhatsApp y al número de mi usuario, el briefing diario de Naira con información de la operación de mi área. Puedo retirar esta autorización cuando quiera desde aquí (ejemplo).', version: 'naira-whatsapp-v1', verificadoHasta: null, telefonoRegistrado: true },
  'whatsapp.consentir': { otorgado: true, texto: 'Autorizo a la inmobiliaria a enviarme, por WhatsApp y al número de mi usuario, el briefing diario de Naira con información de la operación de mi área. Puedo retirar esta autorización cuando quiera desde aquí (ejemplo).', version: 'naira-whatsapp-v1', verificadoHasta: null, telefonoRegistrado: true },
  'whatsapp.codigo': { codigo: '004217', venceEn: '2026-10-16T15:10:00.000Z', minutos: 10 },
  'persona.autorizacion': { estado: 'sin_decidir', texto: 'Autorizo a la inmobiliaria a tratar los datos de mi gestión dentro de Leasefy (ejemplo).', version: 'naira-gestion-v1' },
  'persona.autorizar': { estado: 'autorizada', texto: 'Autorizo a la inmobiliaria a tratar los datos de mi gestión dentro de Leasefy (ejemplo).', version: 'naira-gestion-v1' },
  'persona.deMi': {
    persona: { userId: '00000000-0000-4000-8000-000000000001', nombre: 'Persona de ejemplo', esQuienPregunta: true },
    autorizacion: 'autorizada',
    corte: '2026-10-16T15:00:00.000Z',
    datos: { dias: 30, memoriaVigente: 2, briefingsPorCanal: [{ clave: 'email', n: 12 }] },
    gestion: { dias: 90, votos: [{ clave: 'util', n: 5 }], aprobaciones: 2, rechazos: 1, cancelaciones: 0, motivos: [{ tipo: 'rechazo', motivo: 'El propietario ya pagó (ejemplo)', en: '2026-10-14T15:00:00.000Z' }], escalacionesAbiertas: 1, escalacionesVencidas: 0, acuerdosAprobados: 3 },
  },
  'persona.equipo': { personas: [{ userId: '00000000-0000-4000-8000-000000000002', nombre: 'Persona de ejemplo' }] },
  'persona.ficha': {
    persona: { userId: '00000000-0000-4000-8000-000000000002', nombre: 'Persona de ejemplo', esQuienPregunta: false },
    autorizacion: 'autorizada',
    corte: '2026-10-16T15:00:00.000Z',
    datos: { dias: 30, memoriaVigente: 0, briefingsPorCanal: [{ clave: 'email', n: 10 }] },
    gestion: { dias: 90, votos: [], aprobaciones: 0, rechazos: 0, cancelaciones: 0, motivos: [], escalacionesAbiertas: 0, escalacionesVencidas: 0, acuerdosAprobados: 0 },
  },
  'seguimiento.lista': SEGUIMIENTO,
  'seguimiento.detalle': LOOP_DETALLE,
  'acciones.lista': ACCIONES,
  'acciones.detalle': ACCION_DETALLE,
  'acciones.decidir': { kind: 'decidida', proposalId: PROPUESTA_DE_ACCION, decision: 'aprobada', decisionId: DECISION },
  'tareas.lista': {
    generadoEn: MAS_TARDE,
    tareas: [
      {
        tareaId: TAREA,
        proposalId: PROPUESTA_DE_ACCION,
        loopId: LOOP_EN_SEGUIMIENTO,
        detectorId: DETECTOR,
        owner: 'role:cartera',
        estado: 'abierta',
        creadaEn: MAS_TARDE,
      },
    ],
    ocultasPorRol: 0,
  },
  'tareas.cancelar': { kind: 'cancelada', tareaId: TAREA },
}
