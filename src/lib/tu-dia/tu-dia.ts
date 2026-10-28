/**
 * «Tu día» (investigación de agentes, 27-10-2026: Zillow Premier Agent, Follow Up Boss y Compass le dicen al agente a
 * quién llamar HOY y le preparan la llamada). Se arma con lo que ya hay —el embudo de Arrendamientos y la agenda—, sin
 * IA de pago: no gasta la bolsa de preguntas (decisión del 27-10). Puro: la pantalla sólo pinta.
 *
 *   · Visitas de hoy (de la agenda).
 *   · Te escribieron y no has respondido: interesados nuevos sin contacto, el más reciente primero (la rapidez gana).
 *   · Seguimientos que vencen hoy o ya vencieron (`nextActionDate`).
 *   · Procesos quietos: postulación, estudio, aprobado o contrato con 3 días o más sin moverse.
 */
import type { EventoAgenda } from '@/lib/api/agenda.types';
import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';

const HORA = 3_600_000;
const DIA = 24 * HORA;
/** Un interesado que escribió hace más de esto sin respuesta ya está «esperando». */
export const HORAS_SIN_RESPUESTA = 2;
export const DIAS_QUIETO = 3;

const CERRADAS: ReadonlySet<PipelineStage> = new Set(['completed', 'lost']);
const EN_PROCESO: ReadonlySet<PipelineStage> = new Set(['application', 'evaluation', 'approved', 'contract', 'handover']);

/** El día de Colombia (UTC−5) de un instante, `YYYY-MM-DD`. */
export function diaEnColombia(iso: string | Date): string {
  const t = typeof iso === 'string' ? Date.parse(iso) : iso.getTime();
  return new Date(t - 5 * HORA).toISOString().slice(0, 10);
}

export type MotivoDeLaLlamada = 'sin_respuesta' | 'seguimiento' | 'quieto';

export interface Llamada {
  item: PipelineItem;
  motivo: MotivoDeLaLlamada;
  /** Para ordenar: lo más urgente primero. */
  peso: number;
  /** «Te escribió hace 3 horas», «El seguimiento venció ayer», «4 días en estudio». */
  porQue: string;
}

export interface TuDia {
  visitas: EventoAgenda[];
  llamadas: Llamada[];
  cuantas: { visitas: number; sinRespuesta: number; seguimientos: number; quietos: number };
}

function haceCuanto(ms: number): string {
  if (ms < HORA) return 'hace menos de una hora';
  const horas = Math.floor(ms / HORA);
  if (horas < 24) return horas === 1 ? 'hace 1 hora' : `hace ${horas} horas`;
  const dias = Math.floor(ms / DIA);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
}

const NOMBRE_DE_LA_ETAPA: Record<PipelineStage, string> = {
  lead: 'interesado',
  visit_scheduled: 'visita programada',
  visit_done: 'visita hecha',
  application: 'postulación',
  evaluation: 'estudio',
  approved: 'aprobado',
  contract: 'contrato en firma',
  handover: 'entrega',
  completed: 'arrendado',
  lost: 'perdido',
};

export function nombreDeLaEtapa(etapa: PipelineStage): string {
  return NOMBRE_DE_LA_ETAPA[etapa] ?? etapa;
}

/** A quién llamar hoy y por qué, lo más urgente primero. Un interesado sale una sola vez (con su motivo más fuerte). */
export function armarTuDia(items: readonly PipelineItem[], agenda: readonly EventoAgenda[], ahora = new Date()): TuDia {
  const hoy = diaEnColombia(ahora);
  const t = ahora.getTime();
  const visitas = agenda
    .filter((e) => e.tipo === 'visita' && diaEnColombia(e.fecha) === hoy && e.estado !== 'cancelado')
    .sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha));

  const llamadas: Llamada[] = [];
  for (const item of items) {
    if (CERRADAS.has(item.stage)) continue;
    const ultimo = item.lastContactDate ? Date.parse(item.lastContactDate) : NaN;
    const creado = Date.parse(item.createdAt);
    // 1. Te escribió y nadie le ha hablado.
    if (item.stage === 'lead' && Number.isNaN(ultimo) && t - creado >= HORAS_SIN_RESPUESTA * HORA) {
      llamadas.push({ item, motivo: 'sin_respuesta', peso: 3_000 - Math.min(2_999, (t - creado) / HORA), porQue: `Te escribió ${haceCuanto(t - creado)} y no le has respondido` });
      continue;
    }
    // 2. El seguimiento que quedó para hoy o antes.
    if (item.nextActionDate && diaEnColombia(item.nextActionDate) <= hoy) {
      const vencio = diaEnColombia(item.nextActionDate) < hoy;
      llamadas.push({
        item,
        motivo: 'seguimiento',
        peso: 2_000 + (vencio ? 500 : 0),
        porQue: vencio
          ? `${item.nextAction ? `«${item.nextAction}»` : 'El seguimiento'} venció ${haceCuanto(t - Date.parse(item.nextActionDate))}`
          : `${item.nextAction ? `«${item.nextAction}»` : 'Tienes un seguimiento'} para hoy`,
      });
      continue;
    }
    // 3. Un proceso que se quedó quieto.
    if (EN_PROCESO.has(item.stage) && item.daysInStage >= DIAS_QUIETO) {
      llamadas.push({
        item,
        motivo: 'quieto',
        peso: 1_000 + item.daysInStage,
        porQue: `${item.daysInStage} días en ${nombreDeLaEtapa(item.stage)} sin moverse`,
      });
    }
  }
  llamadas.sort((a, b) => b.peso - a.peso);
  return {
    visitas,
    llamadas,
    cuantas: {
      visitas: visitas.length,
      sinRespuesta: llamadas.filter((l) => l.motivo === 'sin_respuesta').length,
      seguimientos: llamadas.filter((l) => l.motivo === 'seguimiento').length,
      quietos: llamadas.filter((l) => l.motivo === 'quieto').length,
    },
  };
}

export interface PreparacionDeLaLlamada {
  saludo: string;
  preguntas: string[];
  siguientePaso: string;
  /** El mensaje de WhatsApp, listo para mandar si no contesta. */
  whatsapp: string;
}

const primerNombre = (n: string) => n.trim().split(/\s+/)[0] || n;
const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

/** Qué decir, qué preguntar y a dónde llevar la conversación, según la etapa. Sin IA: siempre igual de rápido. */
export function prepararLaLlamada(item: PipelineItem, quienLlama: string): PreparacionDeLaLlamada {
  const nombre = primerNombre(item.candidateName || 'hola');
  const inmueble = item.propertyTitle || item.propertyAddress || 'el inmueble';
  const canon = item.monthlyRent ? ` (${pesos(item.monthlyRent)} al mes)` : '';
  const yo = primerNombre(quienLlama || 'tu agente');
  const porEtapa: Record<PipelineStage, { preguntas: string[]; paso: string; msg: string }> = {
    lead: {
      preguntas: ['¿Para cuándo necesita mudarse?', '¿Con cuántas personas vivirá?', '¿Tiene codeudor o prefiere un estudio sin fiador?'],
      paso: 'Agendar la visita: ofrécele dos horarios concretos.',
      msg: `Hola ${nombre}, soy ${yo}. Vi que te interesó ${inmueble}${canon}. ¿Te queda bien visitarlo esta semana? Te propongo dos horarios.`,
    },
    visit_scheduled: {
      preguntas: ['¿Sigue en pie la visita?', '¿Viene con alguien más?'],
      paso: 'Confirmar la visita y mandarle la ubicación.',
      msg: `Hola ${nombre}, soy ${yo}. Te confirmo la visita a ${inmueble}. ¿Sigue en pie?`,
    },
    visit_done: {
      preguntas: ['¿Qué le pareció?', '¿Hay algo que le haga dudar?', '¿Quiere postularse?'],
      paso: 'Mandarle el enlace para postularse.',
      msg: `Hola ${nombre}, soy ${yo}. ¿Qué te pareció ${inmueble}? Si te gustó, te mando el enlace para postularte en un minuto.`,
    },
    application: {
      preguntas: ['¿Pudo subir todos los documentos?', '¿Necesita ayuda con algo del formulario?'],
      paso: 'Completar los documentos que faltan para el estudio.',
      msg: `Hola ${nombre}, soy ${yo}. Vi tu postulación a ${inmueble}. ¿Te ayudo con algún documento que falte?`,
    },
    evaluation: {
      preguntas: ['¿Le escribió la aseguradora o el estudio?', '¿Tiene a mano los soportes de ingresos?'],
      paso: 'Acompañar el estudio para que no se caiga.',
      msg: `Hola ${nombre}, soy ${yo}. Tu estudio para ${inmueble} va en camino. ¿Te pidieron algo más?`,
    },
    approved: {
      preguntas: ['¿Qué día quiere firmar?', '¿Desde cuándo empieza el contrato?'],
      paso: 'Enviar el contrato para la firma electrónica.',
      msg: `¡Hola ${nombre}! Soy ${yo}: quedaste aprobado para ${inmueble}. ¿Te mando el contrato para firmar hoy?`,
    },
    contract: {
      preguntas: ['¿Recibió el contrato?', '¿Tiene alguna duda antes de firmar?'],
      paso: 'Que firme y coordinar la entrega.',
      msg: `Hola ${nombre}, soy ${yo}. Te recuerdo el contrato de ${inmueble}: firmas desde el celular en un minuto.`,
    },
    handover: {
      preguntas: ['¿Qué día recibe las llaves?', '¿Ya tiene el inventario?'],
      paso: 'Cuadrar la entrega y el inventario.',
      msg: `Hola ${nombre}, soy ${yo}. ¿Cuadramos la entrega de ${inmueble}?`,
    },
    completed: { preguntas: [], paso: 'Ya está arrendado.', msg: `Hola ${nombre}, soy ${yo}.` },
    lost: { preguntas: [], paso: 'Se perdió.', msg: `Hola ${nombre}, soy ${yo}.` },
  };
  const e = porEtapa[item.stage];
  return {
    saludo: `Hola ${nombre}, te habla ${yo}. Te llamo por ${inmueble}${canon}.`,
    preguntas: e.preguntas,
    siguientePaso: e.paso,
    whatsapp: e.msg,
  };
}

/** El celular para `tel:` y WhatsApp: sólo dígitos y con 57 si es un celular de Colombia de 10 dígitos. */
export function celularParaMarcar(telefono: string | null | undefined): string | null {
  const d = (telefono ?? '').replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('3')) return `57${d}`;
  if (d.length === 12 && d.startsWith('57')) return d;
  return d.length >= 7 ? d : null;
}
