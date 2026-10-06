/**
 * 🔴 MUESTRA — NO SON DATOS REALES. Fase 1 del centro de mando, se BORRA en la
 * fase 2 junto con el conmutador «Real / Muestra encendida».
 *
 * Para qué existe: el laboratorio tiene el piloto automático apagado (Leasefy
 * con el interruptor maestro abajo), sin director ni metas y casi sin
 * actividad. Nico tiene que poder VER y TOCAR cómo se siente cada dirección
 * encendida y con trabajo. Esto es una inmobiliaria mediana inventada:
 * cifras en pesos verosímiles y personas obviamente ficticias (los apellidos
 * «Ejemplo», «Muestra», «Ficticia»…).
 *
 * Está tipado con los tipos de `src/lib/api/piloto.ts` y `piloto-director.ts`:
 * `tsc` obliga a que tenga la forma exacta de los contratos. Ningún id de aquí
 * se manda al micro (la página no abre casos de la muestra).
 *
 * Todo se arma RELATIVO a `ahora`, para que «hoy» sea hoy a cualquier hora.
 */

import type {
  ActivityItem,
  AgenteDeLaFlota,
  InboxItem,
  PilotoBriefing,
  PilotoFlotaResponse,
  PilotoInboxResponse,
  PilotoTendencias,
  PulsoEnCurso,
  PulsoResponse,
} from '@/lib/api/piloto'
import type { DirectorHoy, DirectorMetas, MetaDelDirector, OrdenDelDirector } from '@/lib/api/piloto-director'
import type { ComoSeMideLaTasa } from '@/lib/tasa-de-recaudo'

const MIN = 60_000
const HORA = 60 * MIN
const DIA = 24 * HORA
const ZONA = 'America/Bogota'

const iso = (t: number) => new Date(t).toISOString()

/** La medianoche de HOY en Colombia (UTC−5 fijo), en ms. */
function medianocheDeHoy(ahora: number): number {
  const enColombia = new Date(ahora - 5 * HORA)
  return Date.UTC(enColombia.getUTCFullYear(), enColombia.getUTCMonth(), enColombia.getUTCDate()) + 5 * HORA
}

/** «el lunes 5 de octubre a las 3:00 p. m.» — como `cuandoEnPalabras` del micro. */
function cuandoEnPalabras(t: number): string {
  const d = new Date(t)
  const dia = d.toLocaleDateString('es-CO', { weekday: 'long', timeZone: ZONA })
  const diaYMes = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', timeZone: ZONA })
  const hora = d
    .toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: ZONA })
    .replace(/\s+/g, ' ')
  return `el ${dia} ${diaYMes} a las ${hora}`
}

/**
 * Instantes de HOY repartidos entre las 5:00 a. m. y `ahora` (si es muy
 * temprano, en las últimas tres horas). `f` va de 0 a 1.
 */
function hoyA(ahora: number, f: number): number {
  const cinco = medianocheDeHoy(ahora) + 5 * HORA
  const desde = ahora - cinco > HORA ? cinco : ahora - 3 * HORA
  return Math.round(desde + (ahora - 2 * MIN - desde) * f)
}

/** Un instante de LO QUE QUEDA de hoy (antes de las 9:30 p. m.), o `null` si ya no cabe. */
function masTardeHoy(ahora: number, minutos: number): number | null {
  const t = ahora + minutos * MIN
  const tope = medianocheDeHoy(ahora) + 21.5 * HORA
  return t <= tope ? Math.round(t / (5 * MIN)) * 5 * MIN : null
}

// ── Las personas (ficticias) ───────────────────────────────────────────────

const P = {
  camila: 'Camila Ejemplo Restrepo',
  julian: 'Julián Muestra Arango',
  sofia: 'Sofía Ficticia Henao',
  andres: 'Andrés Prueba Gil',
  valentina: 'Valentina Ejemplo Ruiz',
  mateo: 'Mateo Muestra Ochoa',
  luisa: 'Luisa Ficticia Mejía',
  david: 'David Ejemplo Cano',
  paula: 'Paula Muestra Duque',
  tomas: 'Tomás Ficticio Vélez',
} as const

const INMUEBLES = ['Cra. 43A # 1-50 Apto 1203', 'Cl. 10 # 32-15 Apto 402', 'Cra. 80 # 34-21 Casa 7', 'Cl. 33 # 65-40 Local 2', 'Cra. 25 # 9-80 Apto 701']

// ── El pulso ───────────────────────────────────────────────────────────────

function enCursoDeMuestra(ahora: number): PulsoEnCurso[] {
  return [
    { id: 'muestra:call:1', tipo: 'llamada', titulo: `Laura está llamando a ${P.julian}`, detalle: 'Canon de octubre · 12 días de mora', desde: iso(ahora - 3 * MIN), agente: 'cobranza' },
    { id: 'muestra:wa:1', tipo: 'conversacion', titulo: `WhatsApp abierto con ${P.valentina}`, detalle: 'Pidió el estado de cuenta', desde: iso(ahora - 9 * MIN), agente: 'cobranza' },
    { id: 'muestra:mov:1', tipo: 'deposito', titulo: 'Conciliando un depósito de $ 2.350.000', detalle: 'Bancolombia · un solo candidato', desde: iso(ahora - 1 * MIN), agente: 'conciliacion' },
  ]
}

function pulsoDeMuestra(ahora: number): PulsoResponse {
  return {
    estado: 'atencion',
    titular: '3 acuerdos de pago vencen hoy y ninguno está confirmado.',
    enCurso: enCursoDeMuestra(ahora),
    alertas: [
      {
        id: 'muestra:alerta:acuerdos',
        severidad: 'alta',
        titulo: '3 acuerdos de pago vencen hoy y ninguno está confirmado',
        detalle: 'Laura los llama después de las 10:00 a. m. si no entra el pago.',
      },
      {
        id: 'muestra:alerta:mora',
        severidad: 'critica',
        titulo: '2 contratos pasan hoy de 60 días de mora',
        detalle: `${P.mateo} y ${P.tomas}. El director propone revisar si van a cobro jurídico.`,
      },
      {
        id: 'muestra:alerta:renovaciones',
        severidad: 'media',
        titulo: '4 renovaciones vencen esta semana',
        detalle: 'Vinci tiene listas las cartas de incremento por IPC.',
      },
      {
        id: 'muestra:alerta:extracto',
        severidad: 'info',
        titulo: 'El extracto de Davivienda tiene 3 días sin cargar',
        detalle: 'La conciliación de esa cuenta está en pausa.',
      },
    ],
    hoy: { llamadas: 37, conversacionesActivas: 6, decisionesResueltas: 14, contactosPlaneados: 52 },
    tardoMs: 840,
  }
}

// ── La Bandeja ─────────────────────────────────────────────────────────────

/** Ninguna acción de la muestra se ejecuta: la página no abre sus casos. */
const accion = (label: string): InboxItem['accion'] => ({
  label,
  method: 'POST',
  path: '/api/muestra/no-se-ejecuta',
  permitida: true,
})

function bandejaDeMuestra(ahora: number): PilotoInboxResponse {
  const items: InboxItem[] = [
    { id: 'muestra:inbox:1', fuente: 'acciones', agente: 'cobranza', prioridad: 'alta', titulo: `Llamar a ${P.mateo}: 63 días de mora`, resumen: 'Debe $ 4.860.000 (canon de agosto, septiembre y octubre). Laura propone ofrecerle un acuerdo de 3 cuotas.', montoCop: 4_860_000, desde: iso(ahora - 26 * HORA), href: '/panel/inmobiliaria/piloto', accion: accion('Aprobar y llamar') },
    { id: 'muestra:inbox:2', fuente: 'acciones', agente: 'facturacion', prioridad: 'alta', titulo: 'Emitir 41 facturas de octubre por $ 78.420.000', resumen: 'Cada una con su cobro del mes. Las revisó la regla de escenarios tributarios.', montoCop: 78_420_000, desde: iso(ahora - 5 * HORA), href: '/panel/inmobiliaria/piloto', accion: accion('Emitir las 41') },
    { id: 'muestra:inbox:3', fuente: 'acciones', agente: 'propietarios', prioridad: 'alta', titulo: 'Girar a 12 propietarios $ 31.275.400', resumen: 'Liquidaciones de septiembre ya conciliadas. Mueve plata: siempre pide tu clic.', montoCop: 31_275_400, desde: iso(ahora - 3 * HORA), href: '/panel/inmobiliaria/piloto', accion: accion('Revisar el lote') },
    { id: 'muestra:inbox:4', fuente: 'acciones', agente: 'retencion', prioridad: 'media', titulo: `Carta de incremento para ${P.sofia}`, resumen: `${INMUEBLES[1]} · IPC 5,2 % · el contrato vence el 30 de octubre.`, desde: iso(ahora - 9 * DIA), href: '/panel/inmobiliaria/piloto', accion: accion('Aprobar la carta') },
    { id: 'muestra:inbox:5', fuente: 'acciones', agente: 'inspeccion', prioridad: 'media', titulo: `Agendar la inspección de salida de ${INMUEBLES[2]}`, resumen: `${P.andres} entrega el 8 de octubre.`, desde: iso(ahora - 2 * DIA), href: '/panel/inmobiliaria/piloto', accion: accion('Agendar') },
    { id: 'muestra:inbox:6', fuente: 'acciones', agente: 'conciliacion', prioridad: 'media', titulo: 'Confirmar 3 depósitos con dos candidatos', resumen: 'Montos iguales de dos inquilinos distintos: hace falta tu ojo.', desde: iso(ahora - 30 * HORA), href: '/panel/inmobiliaria/piloto', accion: accion('Ver los candidatos') },
    { id: 'muestra:inbox:7', fuente: 'acciones', agente: 'mantenimiento', prioridad: 'media', titulo: 'Aprobar la cotización de plomería por $ 640.000', resumen: `Fuga en ${INMUEBLES[0]}. Fixi pidió 3 cotizaciones; ésta es la más barata.`, montoCop: 640_000, desde: iso(ahora - 11 * DIA), href: '/panel/inmobiliaria/piloto', accion: accion('Aprobar') },
    { id: 'muestra:inbox:8', fuente: 'acciones', agente: 'contratos', prioridad: 'media', titulo: `Invitar a su portal a ${P.paula}`, resumen: 'Contrato nuevo firmado ayer.', desde: iso(ahora - 20 * HORA), href: '/panel/inmobiliaria/piloto', accion: accion('Invitar') },
    { id: 'muestra:inbox:9', fuente: 'acciones', agente: 'calidad', prioridad: 'baja', titulo: `Mejorar la publicación de ${INMUEBLES[4]}`, resumen: 'Niti sugiere 4 fotos con más luz y un título más claro.', desde: iso(ahora - 4 * DIA), href: '/panel/inmobiliaria/piloto', accion: accion('Ver la sugerencia') },
    { id: 'muestra:inbox:10', fuente: 'acciones', agente: 'aprobaciones', prioridad: 'baja', titulo: `Recordarle a ${P.david} que apruebe el inquilino`, resumen: 'Lleva 2 días sin responder.', desde: iso(ahora - 2 * DIA), href: '/panel/inmobiliaria/piloto', accion: accion('Mandar el recordatorio') },
  ]
  return { items, total: 12, porPrioridad: { alta: 3, media: 6, baja: 3 } }
}

// ── Lo que hicieron (el feed) ──────────────────────────────────────────────

interface Semilla {
  agente: string
  tipo: string
  titulo: string
  detalle?: string
}

const DE_HOY: Semilla[] = [
  { agente: 'cobranza', tipo: 'llamada', titulo: `Laura llamó a ${P.camila}: promete pagar el viernes`, detalle: 'Acuerdo registrado por $ 1.850.000' },
  { agente: 'conciliacion', tipo: 'pago', titulo: 'Concilié 6 depósitos de Bancolombia', detalle: '$ 9.420.000 aplicados a la cuota más vieja de cada uno' },
  { agente: 'facturacion', tipo: 'piloto', titulo: 'Preparé 41 facturas de octubre para tu clic' },
  { agente: 'cobranza', tipo: 'whatsapp', titulo: `Le mandé el estado de cuenta a ${P.valentina}` },
  { agente: 'inspeccion', tipo: 'piloto', titulo: `Vidi agendó la inspección de entrada de ${INMUEBLES[3]}` },
  { agente: 'cobranza', tipo: 'llamada', titulo: `Laura llamó a ${P.andres}: no contestó`, detalle: 'Reintenta a las 4:00 p. m.' },
  { agente: 'retencion', tipo: 'piloto', titulo: 'Vinci preparó 4 cartas de renovación' },
  { agente: 'cobranza', tipo: 'promesa', titulo: `${P.sofia} confirmó su acuerdo de pago`, detalle: 'Primera cuota: $ 620.000' },
  { agente: 'conciliacion', tipo: 'pago', titulo: 'Concilié el giro de Leasefy del 4 de octubre', detalle: 'Liquidación del recaudo en línea: $ 3.812.500 neto' },
  { agente: 'mantenimiento', tipo: 'piloto', titulo: 'Fixi pidió 3 cotizaciones de plomería' },
  { agente: 'cobranza', tipo: 'llamada', titulo: `Laura llamó a ${P.tomas}: pide hablar con un asesor`, detalle: 'Escalado a tu equipo' },
  { agente: 'contabilidad', tipo: 'piloto', titulo: 'Asenté 18 recibos de caja del fin de semana' },
  { agente: 'prospectos', tipo: 'whatsapp', titulo: 'Imana respondió a 5 interesados en Laureles' },
  { agente: 'cobranza', tipo: 'llamada', titulo: `Laura llamó a ${P.julian}: pagará hoy por PSE` },
  { agente: 'aprobaciones', tipo: 'piloto', titulo: `${P.paula} aprobó al inquilino para ${INMUEBLES[4]}` },
  { agente: 'conciliacion', tipo: 'pago', titulo: 'Concilié 3 pagos PSE de la mañana', detalle: '$ 5.310.000' },
  { agente: 'calidad', tipo: 'piloto', titulo: 'Niti revisó 9 publicaciones: 2 necesitan fotos' },
  { agente: 'cobranza', tipo: 'promesa', titulo: `${P.mateo} pidió un acuerdo de 3 cuotas` },
  { agente: 'facturacion', tipo: 'piloto', titulo: 'Las 3 facturas de intereses quedaron listas' },
  { agente: 'cobranza', tipo: 'llamada', titulo: `Laura llamó a ${P.luisa}: ya pagó, mandará el soporte` },
  { agente: 'equipo', tipo: 'piloto', titulo: 'Pusiste Conciliación en Automático' },
]

const DE_AYER: Semilla[] = [
  { agente: 'cobranza', tipo: 'llamada', titulo: `Laura llamó a ${P.david}: promete pagar el lunes` },
  { agente: 'conciliacion', tipo: 'pago', titulo: 'Concilié 11 depósitos de Bancolombia' },
  { agente: 'contratos', tipo: 'piloto', titulo: `Firmé el contrato de ${P.paula}` },
  { agente: 'cobranza', tipo: 'whatsapp', titulo: `Le recordé el pago a ${P.camila}` },
  { agente: 'propietarios', tipo: 'piloto', titulo: 'Preparé 12 liquidaciones de septiembre' },
  { agente: 'mantenimiento', tipo: 'piloto', titulo: 'Fixi cerró la solicitud de cerrajería' },
  { agente: 'cobranza', tipo: 'promesa', titulo: `${P.tomas} incumplió su acuerdo` },
  { agente: 'inspeccion', tipo: 'piloto', titulo: 'Vidi subió el acta de entrega con 24 fotos' },
  { agente: 'conciliacion', tipo: 'pago', titulo: 'Concilié 4 pagos PSE' },
  { agente: 'retencion', tipo: 'piloto', titulo: `Vinci llamó a ${P.sofia} para renovar` },
  { agente: 'cobranza', tipo: 'llamada', titulo: `Laura llamó a ${P.julian}: no contestó` },
  { agente: 'contabilidad', tipo: 'piloto', titulo: 'Cerré el día con 23 asientos' },
  { agente: 'prospectos', tipo: 'whatsapp', titulo: 'Imana agendó 3 visitas para el sábado' },
  { agente: 'calidad', tipo: 'piloto', titulo: 'Niti publicó 2 inmuebles en los portales' },
  { agente: 'equipo', tipo: 'piloto', titulo: 'Pusiste Cobranza en Automático' },
]

const DE_ANTIER: Semilla[] = [
  { agente: 'cobranza', tipo: 'llamada', titulo: `Laura llamó a ${P.andres}: acuerdo de 2 cuotas` },
  { agente: 'conciliacion', tipo: 'pago', titulo: 'Concilié 9 depósitos' },
  { agente: 'facturacion', tipo: 'piloto', titulo: 'Emití 6 notas crédito de ajuste' },
  { agente: 'aprobaciones', tipo: 'piloto', titulo: `Le mandé a ${P.david} el estudio del inquilino` },
  { agente: 'cobranza', tipo: 'whatsapp', titulo: 'Envié 14 recordatorios de pago' },
  { agente: 'mantenimiento', tipo: 'piloto', titulo: 'Fixi recibió una solicitud de humedad' },
  { agente: 'contabilidad', tipo: 'piloto', titulo: 'Concilié la cuenta puente del recaudo' },
  { agente: 'prospectos', tipo: 'whatsapp', titulo: 'Imana calificó 7 interesados' },
  { agente: 'cobranza', tipo: 'llamada', titulo: `Laura llamó a ${P.valentina}: pagó en la tarde` },
  { agente: 'retencion', tipo: 'piloto', titulo: 'Vinci detectó 4 contratos por vencer' },
  { agente: 'inspeccion', tipo: 'piloto', titulo: 'Vidi agendó 2 inspecciones' },
  { agente: 'conciliacion', tipo: 'pago', titulo: 'Concilié el giro de Leasefy' },
  { agente: 'cobranza', tipo: 'promesa', titulo: `${P.luisa} confirmó su acuerdo` },
  { agente: 'calidad', tipo: 'piloto', titulo: 'Niti mejoró 3 títulos de publicación' },
]

/** Quién (el campo del micro, MANDO-DATOS): los cambios de modo los hizo quien mira; lo demás, los agentes solos. */
const quienDeLaSemilla = (s: Semilla): ActivityItem['quien'] => (s.agente === 'equipo' ? 'tu' : 'solo')

function actividadDeMuestra(ahora: number): ActivityItem[] {
  const items: ActivityItem[] = []
  const medianoche = medianocheDeHoy(ahora)
  // De hoy: del más nuevo al más viejo.
  DE_HOY.forEach((s, i) => {
    items.push({ id: `muestra:act:hoy:${i}`, at: iso(hoyA(ahora, 1 - (i + 1) / (DE_HOY.length + 1))), ...s, quien: quienDeLaSemilla(s) })
  })
  DE_AYER.forEach((s, i) => {
    items.push({ id: `muestra:act:ayer:${i}`, at: iso(medianoche - DIA + (20 - i) * 50 * MIN + 6 * HORA), ...s, quien: quienDeLaSemilla(s) })
  })
  DE_ANTIER.forEach((s, i) => {
    items.push({ id: `muestra:act:antier:${i}`, at: iso(medianoche - 2 * DIA + (20 - i) * 50 * MIN + 6 * HORA), ...s, quien: quienDeLaSemilla(s) })
  })
  return items.slice(0, 50)
}

/**
 * Lo que va LLEGANDO mientras la muestra está abierta (`useMuestraViva`): una
 * acción cada pocos segundos, con su efecto en los números del día. Así se ve
 * la franja en vivo y las cifras que cuentan.
 */
export interface GotaDeLaMuestra {
  semilla: Semilla
  efecto?: Partial<Record<'llamadas' | 'conversaciones' | 'resueltas', number>>
  /** Una decisión de la Bandeja que se resolvió (sale de la lista). */
  resuelve?: string
}

export const GOTAS: GotaDeLaMuestra[] = [
  { semilla: { agente: 'conciliacion', tipo: 'pago', titulo: 'Concilié el depósito de $ 2.350.000', detalle: `Era de ${P.camila}` } },
  { semilla: { agente: 'cobranza', tipo: 'llamada', titulo: `Laura llamó a ${P.julian}: pagará hoy a las 5:00 p. m.` }, efecto: { llamadas: 1 } },
  { semilla: { agente: 'cobranza', tipo: 'whatsapp', titulo: `${P.valentina} recibió su estado de cuenta` }, efecto: { conversaciones: -1 } },
  { semilla: { agente: 'equipo', tipo: 'piloto', titulo: 'Aprobaste la invitación al portal de Paula' }, efecto: { resueltas: 1 }, resuelve: 'muestra:inbox:8' },
  { semilla: { agente: 'prospectos', tipo: 'whatsapp', titulo: 'Imana respondió a un interesado en Envigado' }, efecto: { conversaciones: 1 } },
  { semilla: { agente: 'cobranza', tipo: 'llamada', titulo: `Laura llamó a ${P.david}: promete pagar mañana` }, efecto: { llamadas: 1 } },
  { semilla: { agente: 'contabilidad', tipo: 'piloto', titulo: 'Asenté 2 recibos de caja' } },
  { semilla: { agente: 'cobranza', tipo: 'promesa', titulo: `${P.camila} confirmó el pago del viernes` } },
  { semilla: { agente: 'inspeccion', tipo: 'piloto', titulo: 'Vidi confirmó la inspección de las 3:00 p. m.' } },
  { semilla: { agente: 'cobranza', tipo: 'llamada', titulo: `Laura llamó a ${P.tomas}: no contestó` }, efecto: { llamadas: 1 } },
  { semilla: { agente: 'conciliacion', tipo: 'pago', titulo: 'Concilié 2 pagos PSE', detalle: '$ 3.100.000' } },
  { semilla: { agente: 'equipo', tipo: 'piloto', titulo: 'Aprobaste la cotización de plomería' }, efecto: { resueltas: 1 }, resuelve: 'muestra:inbox:7' },
]

// ── El briefing ────────────────────────────────────────────────────────────

function briefingDeMuestra(): PilotoBriefing {
  return {
    saludo: 'Buenos días',
    resumen: ['La cartera de octubre va 4 puntos mejor que la de septiembre a esta altura del mes.'],
    numeros: { pendientes: 12, altas: 3, llamadasHoy: 37, promesasCreadasHoy: 9, recuperadoMesCop: 48_750_000 },
  }
}

// ── La flota ───────────────────────────────────────────────────────────────

function agente(
  id: string,
  modo: AgenteDeLaFlota['modo'],
  corre: boolean,
  actua: boolean,
  efectoReal: string,
  porQueNoCorre: string | null = null,
): AgenteDeLaFlota {
  return { agente: id, modo, origen: 'piloto', corre, actua, gobierna: actua, efectoReal, porQueNoCorre }
}

function flotaDeMuestra(ahora: number): PilotoFlotaResponse {
  const agentes: AgenteDeLaFlota[] = [
    agente('cobranza', 'autonomo', true, true, 'Laura llama, escribe y registra acuerdos sola, dentro de tus topes y del horario de ley.'),
    agente('conciliacion', 'autonomo', true, true, 'Concilia sola los depósitos con un solo candidato; los dudosos te los deja.'),
    agente('facturacion', 'copiloto', true, true, 'Prepara cada factura y te la deja con un clic.'),
    agente('propietarios', 'copiloto', true, true, 'Prepara las liquidaciones; los giros siempre piden tu clic.'),
    agente('contabilidad', 'autonomo', true, true, 'Asienta sola los recibos y cierra el día.'),
    agente('retencion', 'copiloto', true, true, 'Vinci prepara las renovaciones y las cartas de incremento.'),
    agente('inspeccion', 'autonomo', true, true, 'Vidi agenda sola las inspecciones de entrada y salida.'),
    agente('mantenimiento', 'copiloto', true, true, 'Fixi pide cotizaciones; aprobarlas es tuyo.'),
    agente('aprobaciones', 'autonomo', true, true, 'Avali le recuerda al propietario lo que tiene pendiente.'),
    agente('contratos', 'copiloto', true, true, 'Prepara cada paso del contrato y te lo deja con un clic.'),
    agente('prospectos', 'autonomo', true, true, 'Imana responde a los interesados y agenda visitas.'),
    agente('calidad', 'copiloto', true, true, 'Niti revisa las publicaciones y te sugiere mejoras.'),
    agente('pagos', 'copiloto', true, true, 'Cobri arma los cobros del mes y los recordatorios.'),
    agente('matching', 'copiloto', true, false, 'Todavía no actúa solo: cruza inquilinos e inmuebles cuando se lo pides.'),
    agente('estudio', 'copiloto', true, false, 'Todavía no actúa solo: el estudio corre cuando alguien lo pide.'),
    agente('cotizador', 'copiloto', true, false, 'Todavía no actúa solo: cotiza cuando se lo pides.'),
    agente('avaluos', 'sombra', false, false, 'Apagado para tu inmobiliaria.', 'Tu inmobiliaria lo apagó en Autonomía.'),
    agente('chat', 'copiloto', true, true, 'Cada acción te la deja lista con «¿Lo hago?».'),
  ]
  return {
    activo: true,
    piloto: {
      activo: true,
      motivo: 'activo',
      frase: 'El piloto automático está activo: los agentes en Automático actúan solos dentro de tus topes.',
      prueba: { desde: iso(ahora - 12 * DIA), hasta: iso(ahora + 18 * DIA), diasRestantes: 18, terminada: false },
      sinVencimiento: false,
      maestro: true,
      sePuedeActivar: true,
    },
    modo: 'copiloto',
    actuan: 14,
    agentes,
    resumen: { sombra: 1, copiloto: 11, autonomo: 6 },
    enVivo: { llamadas: 1, conciliando: 1, esperando: 12 },
    tomadoAt: iso(ahora),
  }
}

// ── El director ────────────────────────────────────────────────────────────

function orden(
  n: number,
  agenteId: string,
  agenteNombre: string,
  procesoNombre: string,
  entidad: string,
  cuando: string | null,
  estado: OrdenDelDirector['estado'],
  porQue: string,
): OrdenDelDirector {
  return {
    ordenId: `muestra:orden:${n}`,
    agente: agenteId,
    agenteNombre,
    proceso: `${agenteId}.muestra`,
    procesoNombre,
    entidad: { tipo: 'contrato', id: `muestra:${n}`, nombre: entidad, enlace: null },
    cuando,
    prioridad: 100 - n * 7,
    porQue,
    evidencia: [],
    meta: null,
    alternativaDescartada: null,
    conflictoResuelto: null,
    estado,
    accionId: null,
    motivoDeLaPerilla: null,
  }
}

function hoyDeMuestra(ahora: number): DirectorHoy {
  const plan = hoyA(ahora, 0.02)
  const mas = (min: number) => {
    const t = masTardeHoy(ahora, min)
    return t === null ? null : cuandoEnPalabras(t)
  }
  const antes = (f: number) => cuandoEnPalabras(hoyA(ahora, f))
  return {
    encendido: true,
    pilotoActivo: true,
    fecha: new Date(ahora).toLocaleDateString('en-CA', { timeZone: ZONA }),
    ciclo: { id: 'muestra:ciclo', tipo: 'dia', estado: 'listo', inicio: iso(plan), fin: iso(plan + 2 * MIN), modelo: null, esfuerzo: null, costoCop: 1_850, sinModeloPorque: null },
    resumen:
      'Hoy el foco es la cartera de octubre: 23 inquilinos con el canon vencido y 4 renovaciones que vencen esta semana. Laura llama primero a los de más de 30 días; Vinci deja listas las cartas de incremento.',
    pensamiento: null,
    prioridades: [],
    ordenes: [
      orden(1, 'cobranza', 'Laura', 'Llamar a los de más de 30 días de mora', P.mateo, antes(0.15), 'ejecutada', 'Lleva 63 días y no tiene acuerdo.'),
      orden(2, 'conciliacion', 'Conciliación', 'Conciliar los depósitos de la mañana', 'Bancolombia', antes(0.3), 'ejecutada', 'Entraron 6 depósitos antes de las 9.'),
      orden(3, 'facturacion', 'Facturación', 'Emitir las facturas de octubre', '41 contratos', antes(0.45), 'en_bandeja', 'Es día 5: la ley pide emitirlas dentro del mes.'),
      orden(4, 'retencion', 'Vinci', 'Preparar las cartas de incremento', '4 renovaciones', antes(0.55), 'ejecutada', 'Vencen esta semana.'),
      orden(5, 'cobranza', 'Laura', 'Confirmar los acuerdos que vencen hoy', '3 acuerdos', mas(45), 'la_hace_el_agente', 'Ninguno está confirmado.'),
      orden(6, 'inspeccion', 'Vidi', 'Inspección de salida', INMUEBLES[2] as string, mas(150), 'la_hace_el_agente', 'El inquilino entrega el 8 de octubre.'),
      orden(7, 'propietarios', 'Propietarios', 'Girar a los propietarios', '12 propietarios', mas(240), 'en_bandeja', 'Las liquidaciones ya están conciliadas.'),
      orden(8, 'cobranza', 'Laura', 'Volver a llamar a quien no contestó', P.andres, mas(300), 'la_hace_el_agente', 'Pidió que lo llamaran en la tarde.'),
      orden(9, 'mantenimiento', 'Fixi', 'Pedir la cotización de pintura', INMUEBLES[0] as string, 'hoy', 'la_hace_el_agente', 'La fuga ya se arregló.'),
      orden(10, 'calidad', 'Niti', 'Revisar las publicaciones sin fotos', '2 inmuebles', antes(0.2), 'descartada', 'El asesor ya las está tomando.'),
    ],
    retenciones: [],
    sugerencias: [],
    propuestasDeAutonomia: [],
    alertas: [],
    rechazadas: [],
    grupoDeControl: { activo: false, omitidas: 0 },
  }
}

function serie(ahora: number, desde: number, hasta: number, ruido: number): Array<{ fecha: string; valor: number }> {
  const puntos: Array<{ fecha: string; valor: number }> = []
  for (let i = 13; i >= 0; i -= 1) {
    const f = (13 - i) / 13
    // Una curva suave con un vaivén chico y determinista (sin azar: la misma muestra cada vez).
    const valor = desde + (hasta - desde) * f + Math.sin(i * 1.7) * ruido
    puntos.push({ fecha: new Date(ahora - i * DIA).toLocaleDateString('en-CA', { timeZone: ZONA }), valor: Math.round(valor * 1000) / 1000 })
  }
  return puntos
}

function meta(
  ahora: number,
  m: Pick<MetaDelDirector, 'id' | 'metrica' | 'nombre' | 'direccion' | 'unidad' | 'lineaBase' | 'objetivo' | 'actual' | 'estimada' | 'porQue'>,
  ruido: number,
): MetaDelDirector {
  return {
    ...m,
    estado: 'activa',
    desde: new Date(ahora - 20 * DIA).toLocaleDateString('en-CA', { timeZone: ZONA }),
    hasta: new Date(ahora + 70 * DIA).toLocaleDateString('en-CA', { timeZone: ZONA }),
    serie: serie(ahora, m.lineaBase ?? 0, m.actual ?? 0, ruido),
    historial: [],
  }
}

function metasDeMuestra(ahora: number): DirectorMetas {
  return {
    encendido: true,
    metas: [
      meta(ahora, { id: 'muestra:meta:1', metrica: 'recaudo_a_tiempo', nombre: 'Recaudo a tiempo', direccion: 'subir', unidad: 'porcentaje', lineaBase: 0.86, objetivo: 0.92, actual: 0.894, estimada: false, porQue: 'Subirlo 6 puntos en el trimestre es lo que ya logran las inmobiliarias del mismo tamaño.' }, 0.004),
      meta(ahora, { id: 'muestra:meta:2', metrica: 'mora_30', nombre: 'Mora de más de 30 días (días de facturación)', direccion: 'bajar', unidad: 'dias', lineaBase: 9.4, objetivo: 7, actual: 8.1, estimada: false, porQue: 'La mora larga es la que termina en cobro jurídico.' }, 0.25),
      meta(ahora, { id: 'muestra:meta:3', metrica: 'renovacion', nombre: 'Renovación', direccion: 'subir', unidad: 'porcentaje', lineaBase: 0.71, objetivo: 0.8, actual: 0.76, estimada: false, porQue: 'Cada renovación evita un mes de vacancia.' }, 0.006),
      meta(ahora, { id: 'muestra:meta:4', metrica: 'horas_ahorradas', nombre: 'Horas ahorradas', direccion: 'subir', unidad: 'horas', lineaBase: 0, objetivo: 120, actual: 84, estimada: true, porQue: 'Estimadas por acción hecha sola.' }, 3),
      meta(ahora, { id: 'muestra:meta:5', metrica: 'recuperado', nombre: 'Plata recuperada (30 días)', direccion: 'subir', unidad: 'pesos', lineaBase: 41_200_000, objetivo: 55_000_000, actual: 48_750_000, estimada: false, porQue: 'Lo que los agentes ayudaron a cobrar en 30 días: la sexta meta.' }, 900_000),
    ],
    sinMeta: [],
  }
}

// ── Todo junto ─────────────────────────────────────────────────────────────

export interface DatosDeMuestra {
  pulso: PulsoResponse
  bandeja: PilotoInboxResponse
  actividad: ActivityItem[]
  briefing: PilotoBriefing
  flota: PilotoFlotaResponse
  hoy: DirectorHoy
  metas: DirectorMetas
  tendencias: PilotoTendencias
  recaudo: ComoSeMideLaTasa
}

// ── Las tendencias (MANDO-DATOS) ───────────────────────────────────────────

const diaDe = (t: number) => new Date(t).toLocaleDateString('en-CA', { timeZone: ZONA })

/** 30 días de lo recuperado, 14 de acciones, las horas y la mora: inventados y deterministas (sin azar). */
function tendenciasDeMuestra(ahora: number): PilotoTendencias {
  const hoy = diaDe(ahora)
  const recuperado = Array.from({ length: 30 }, (_, i) => {
    const dia = 29 - i
    const base = [0, 1_850_000, 620_000, 3_812_500, 0, 2_350_000, 940_000][dia % 7] as number
    return { fecha: diaDe(ahora - dia * DIA), cop: dia === 0 ? 1_850_000 : base }
  })
  const agentes = ['cobranza', 'conciliacion', 'facturacion', 'contabilidad', 'mantenimiento']
  const acciones = Array.from({ length: 14 }, (_, i) => {
    const dia = 13 - i
    const finDeSemana = [0, 6].includes(new Date(ahora - dia * DIA).getUTCDay())
    const porAgente = agentes.map((agente, k) => ({
      agente,
      solos: Math.max(0, (finDeSemana ? 3 : 9) - k * 2 + ((dia + k) % 3)),
      conPersona: k === 0 && !finDeSemana ? 2 : 0,
    }))
    const solos = porAgente.reduce((s, a) => s + a.solos, 0)
    const conPersona = porAgente.reduce((s, a) => s + a.conPersona, 0)
    return { fecha: diaDe(ahora - dia * DIA), total: solos + conPersona, solos, conPersona, porAgente: porAgente.filter((a) => a.solos + a.conPersona > 0) }
  })
  const mora = Array.from({ length: 30 }, (_, i) => {
    const dia = 29 - i
    const saldo = 38_400_000 - (29 - dia) * 310_000 + (dia % 4) * 120_000
    return { fecha: diaDe(ahora - dia * DIA), valor: Math.round((saldo / 141_000_000) * 30 * 10) / 10, saldoCop: saldo }
  })
  return {
    hoy,
    recuperado: { desde: recuperado[0]?.fecha ?? hoy, hasta: hoy, dias: recuperado },
    acciones: { desde: acciones[0]?.fecha ?? hoy, hasta: hoy, dias: acciones, recortada: false },
    horas: {
      desde: diaDe(ahora - 29 * DIA),
      hasta: hoy,
      total: 84,
      medidas: 12,
      estimadas: 72,
      llamadas: 146,
      acciones: 612,
      estimada: true,
      supuesto:
        'Medidas: el tiempo real al teléfono de Laura. Estimadas: cada acción que el Piloto hizo, por los minutos que le tomaría a una persona con todo a la vista (una tabla conservadora por proceso; ninguno pasa de una hora).',
    },
    mora: { desde: mora[0]?.fecha ?? hoy, hasta: hoy, dias: mora, definicion: 'Saldo de las cuotas con más de 30 días de mora.' },
  }
}

function recaudoDeMuestra(ahora: number): ComoSeMideLaTasa {
  return {
    month: diaDe(ahora).slice(0, 7),
    base: 'CAUSADO',
    porDefecto: true,
    disponible: true,
    opciones: [
      { base: 'CAUSADO', porDefecto: true, rotulo: 'Recaudo sobre lo causado', definicion: '', numeradorCop: 98_460_000, denominadorCop: 141_000_000, pct: 69.8298 },
      { base: 'EMITIDO', porDefecto: false, rotulo: 'Pagado de lo emitido', definicion: '', numeradorCop: 98_460_000, denominadorCop: 118_200_000, pct: 83.2995 },
    ],
  }
}

export function crearMuestra(ahora: number): DatosDeMuestra {
  return {
    pulso: pulsoDeMuestra(ahora),
    bandeja: bandejaDeMuestra(ahora),
    actividad: actividadDeMuestra(ahora),
    briefing: briefingDeMuestra(),
    flota: flotaDeMuestra(ahora),
    hoy: hoyDeMuestra(ahora),
    metas: metasDeMuestra(ahora),
    tendencias: tendenciasDeMuestra(ahora),
    recaudo: recaudoDeMuestra(ahora),
  }
}

/** ¿Es un id de la muestra? (la página no los manda al micro). */
export function esDeLaMuestra(id: string): boolean {
  return id.startsWith('muestra:')
}
