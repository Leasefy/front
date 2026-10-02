/**
 * novedades-del-buscador — qué dice cada fila de «Novedades» en el ⌘K.
 *
 * Nico (02-10-2026) abrió el buscador y vio cuatro filas IDÉNTICAS:
 *
 *     Piloto retenido por autonomia · piloto retencion · hace 19 min
 *
 * Tres problemas en una línea:
 *   1. `piloto_retenido_por_autonomia` no estaba en el diccionario y salía
 *      del humanizador: sin tilde y diciendo lo contrario (lo retenido no es
 *      el piloto, es una acción que esperó la aprobación de la inmobiliaria).
 *   2. `piloto_retencion` (el `entity_type`) era la clave cruda en minúscula.
 *   3. El agente escribe UNA huella por agente y por día (dedupe de
 *      `piloto/gobierno.ts`): el mismo «se retuvo» de prospectos el lunes,
 *      el martes y el miércoles son tres filas que dicen lo mismo.
 *
 * Acá se arma la fila: `describirEvento` saca título, contexto y familia
 * (para el ícono) usando también `details` — el payload que el agente guardó,
 * ya sin datos personales (`redactPii` del lado del micro) — y
 * `agruparNovedades` junta las que dicen lo mismo en una sola, con «3 veces»
 * y el tiempo de la más reciente.
 *
 * Funciones puras (reciben `ahora`) para probarlas sin relojes falsos.
 */

import {
  auditEntityLabel,
  auditEventLabel,
  relativeTimeLabel,
  type EventLocale,
} from './audit-event-labels';

/** Lo que el buscador necesita de una fila del audit log. */
export interface EventoDeAuditoria {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id?: string | null;
  occurred_at: string;
  details?: unknown;
}

/** Para el ícono de la fila; la paleta decide cuál dibuja. */
export type FamiliaDeNovedad =
  | 'retenida'
  | 'piloto'
  | 'llamada'
  | 'mensaje'
  | 'dinero'
  | 'legal'
  | 'persona'
  | 'general';

export interface DescripcionDeEvento {
  titulo: string;
  /** «Piloto automático · prospectos», «Deudor»… `null` si no hay qué decir. */
  contexto: string | null;
  familia: FamiliaDeNovedad;
}

export interface Novedad extends DescripcionDeEvento {
  /** Estable entre renders: el id del evento más reciente del grupo. */
  clave: string;
  /** Tiempo relativo del evento más reciente («hace 19 min»). */
  cuando: string;
  /** Cuántos eventos del feed dicen exactamente lo mismo. */
  veces: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Nombres que el agente guarda como clave
// ──────────────────────────────────────────────────────────────────────────────

/** Igual que `NOMBRE_DEL_AGENTE` en `agent/src/piloto/motivos.ts`. */
const NOMBRE_DEL_AGENTE: Record<EventLocale, Readonly<Record<string, string>>> = {
  es: {
    cobranza: 'cobranza',
    conciliacion: 'conciliación',
    pagos: 'pagos',
    retencion: 'retención',
    calidad: 'calidad de publicaciones',
    prospectos: 'prospectos',
    aprobaciones: 'aprobaciones del propietario',
    mantenimiento: 'mantenimiento',
    matching: 'matching',
    estudio: 'estudio del inquilino',
    cotizador: 'cotizador',
    avaluos: 'avalúos',
    chat: 'el chat',
    contratos: 'contratos',
    facturacion: 'facturación y caja',
    propietarios: 'propietarios',
    contabilidad: 'contabilidad',
    gerente: 'el Gerente',
  },
  en: {
    cobranza: 'collections',
    conciliacion: 'reconciliation',
    pagos: 'payments',
    retencion: 'retention',
    calidad: 'listing quality',
    prospectos: 'leads',
    aprobaciones: 'owner approvals',
    mantenimiento: 'maintenance',
    matching: 'matching',
    estudio: 'tenant screening',
    cotizador: 'quotes',
    avaluos: 'appraisals',
    chat: 'the chat',
    contratos: 'contracts',
    facturacion: 'billing and cash',
    propietarios: 'owners',
    contabilidad: 'accounting',
    gerente: 'the Manager',
  },
};

/** Los modos como se llaman en pantalla (en la base: sombra/copiloto/autonomo). */
const MODO_EN_PANTALLA: Record<EventLocale, Readonly<Record<string, string>>> = {
  es: { sombra: 'Manual', copiloto: 'Copiloto', autonomo: 'Automático' },
  en: { sombra: 'Manual', copiloto: 'Copilot', autonomo: 'Automatic' },
};

/** Los eventos del negocio que cruzan al feed del piloto (`eventoDelNegocio` del agente). */
const EVENTO_DEL_NEGOCIO: Record<EventLocale, Readonly<Record<string, string>>> = {
  es: {
    'cobro.vencido': 'Venció un cobro',
    'cobro.aviso-aseguradora': 'Un cobro llegó al día de avisarle a la aseguradora',
    'cobro.siniestro': 'Un cobro pasó a siniestro',
    'payment.confirmed': 'Entró un pago',
    'contract.signed': 'Se firmó un contrato',
    'contract.activated': 'Se activó un contrato',
    'visit.status_changed': 'Una visita cambió de estado',
    'application.status_changed': 'Una postulación cambió de estado',
    'extracto.cargado': 'Subieron un extracto del banco',
    'extracto.conciliado': 'Un movimiento del banco quedó contra su cobro',
    'contabilidad.sin-mapeo': 'La contabilidad se quedó sin cuenta para un movimiento',
    'extracto-propietario.enviado': 'Salieron los extractos del mes a los propietarios',
  },
  en: {
    'cobro.vencido': 'A charge became overdue',
    'cobro.aviso-aseguradora': 'A charge reached the day to notify the insurer',
    'cobro.siniestro': 'A charge became an insurance claim',
    'payment.confirmed': 'A payment came in',
    'contract.signed': 'A contract was signed',
    'contract.activated': 'A contract was activated',
    'visit.status_changed': 'A visit changed status',
    'application.status_changed': 'An application changed status',
    'extracto.cargado': 'A bank statement was uploaded',
    'extracto.conciliado': 'A bank movement was matched to its charge',
    'contabilidad.sin-mapeo': 'Accounting had no account for a movement',
    'extracto-propietario.enviado': "This month's owner statements went out",
  },
};

const PILOTO: Record<EventLocale, string> = { es: 'Piloto automático', en: 'Autopilot' };

// ──────────────────────────────────────────────────────────────────────────────
// Describir un evento
// ──────────────────────────────────────────────────────────────────────────────

function comoRegistro(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim().length > 0 ? valor.trim() : null;
}

function nombreDelAgente(agente: string | null, locale: EventLocale): string | null {
  if (!agente) return null;
  return NOMBRE_DEL_AGENTE[locale][agente] ?? agente.replaceAll('_', ' ');
}

function conMayuscula(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function familiaPorAccion(action: string): FamiliaDeNovedad {
  if (/held_for_approval|retenido|decision_vencida/.test(action)) return 'retenida';
  if (action.startsWith('piloto_')) return 'piloto';
  if (/^(precall|dialer|speed_to_lead|qa)\.|call|llamada/.test(action)) return 'llamada';
  if (/^followup\.|wa_|whatsapp|template|plantilla|opciones_enviadas/.test(action)) return 'mensaje';
  if (/pago|payment|payout|invoice|factura|cartera\.|conciliacion|cotizacion|cotizador/.test(action)) return 'dinero';
  if (/^legal|legal_artifact|bureau|dispute|pre_judicial|siniestro|insurance/.test(action)) return 'legal';
  if (/escalat|escalacion|escalation|intervene|intervention|force_stage|manual_/.test(action)) return 'persona';
  return 'general';
}

/** El título de una huella `piloto_*`, usando lo que el agente guardó en el payload. */
function tituloDelPiloto(evento: EventoDeAuditoria, detalles: Record<string, unknown>, locale: EventLocale): string {
  const es = locale === 'es';
  // Las huellas recientes del Gerente, la conciliación y los topes ya traen su
  // frase escrita por el agente (`titulo`): es la más precisa que hay.
  const titulo = texto(detalles.titulo);
  if (titulo) return titulo;

  const modo = texto(detalles.modo);
  const modoEnPantalla = modo ? (MODO_EN_PANTALLA[locale][modo] ?? modo) : null;

  switch (evento.action) {
    case 'piloto_retenido_por_autonomia': {
      const que = texto(detalles.queSeRetuvo);
      if (que) return es ? `Esperando tu aprobación: ${que}` : `Waiting for your approval: ${que}`;
      break;
    }
    case 'piloto_reporte_enviado': {
      const tipo = texto(detalles.tipo);
      if (tipo === 'manana') return es ? 'El resumen de la mañana salió por correo' : 'The morning summary was emailed';
      if (tipo === 'cierre') return es ? 'El cierre del día salió por correo' : 'The end-of-day summary was emailed';
      break;
    }
    case 'piloto_autonomia_flota_cambiada':
      if (modoEnPantalla) return es ? `Pasaste el piloto automático a ${modoEnPantalla}` : `You set the autopilot to ${modoEnPantalla}`;
      break;
    case 'piloto_autonomia_cambiada': {
      // El agente vive en `entity_id` (el `entity_type` es `agent_autonomy`).
      const agente = nombreDelAgente(texto(evento.entity_id ?? null), locale);
      if (modoEnPantalla && agente) return es ? `Pusiste ${agente} en ${modoEnPantalla}` : `You set ${agente} to ${modoEnPantalla}`;
      break;
    }
    case 'piloto_habilitacion_cambiada': {
      const agente = nombreDelAgente(texto(detalles.agente) ?? texto(evento.entity_id ?? null), locale);
      if (agente && typeof detalles.habilitado === 'boolean') {
        if (es) return `${detalles.habilitado ? 'Encendiste' : 'Apagaste'} ${agente}`;
        return `You turned ${agente} ${detalles.habilitado ? 'on' : 'off'}`;
      }
      break;
    }
    case 'piloto_evento_dominio': {
      const tipo = texto(evento.entity_type);
      if (tipo && EVENTO_DEL_NEGOCIO[locale][tipo]) return EVENTO_DEL_NEGOCIO[locale][tipo]!;
      break;
    }
  }
  return auditEventLabel(evento.action, locale);
}

/**
 * Título, contexto y familia de una fila del audit log. Nunca devuelve una
 * clave cruda: lo que no está en ningún diccionario sale humanizado.
 */
export function describirEvento(evento: EventoDeAuditoria, locale: EventLocale): DescripcionDeEvento {
  const detalles = comoRegistro(evento.details);
  const familia = familiaPorAccion(evento.action);

  if (evento.action.startsWith('piloto_')) {
    const agente = nombreDelAgente(texto(detalles.agente), locale);
    return {
      titulo: tituloDelPiloto(evento, detalles, locale),
      contexto: agente ? `${PILOTO[locale]} · ${agente}` : PILOTO[locale],
      familia,
    };
  }

  const entidad = auditEntityLabel(evento.entity_type, locale);
  return {
    titulo: auditEventLabel(evento.action, locale),
    contexto: entidad ? conMayuscula(entidad) : null,
    familia,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Agrupar lo que dice lo mismo
// ──────────────────────────────────────────────────────────────────────────────

function instante(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * Junta los eventos cuyo título y contexto son idénticos —lo que en pantalla
 * eran filas repetidas— en una sola fila con `veces` y el tiempo del más
 * reciente. Las filas salen de la más reciente a la más vieja y se cortan en
 * `maximo` DESPUÉS de agrupar: con seis eventos iguales arriba, el feed ya no
 * se come el cupo con copias.
 */
export function agruparNovedades(
  eventos: readonly EventoDeAuditoria[],
  locale: EventLocale,
  { maximo = 5, ahora = Date.now() }: { maximo?: number; ahora?: number } = {},
): Novedad[] {
  const ordenados = [...eventos].sort((a, b) => instante(b.occurred_at) - instante(a.occurred_at));
  const porClave = new Map<string, Novedad>();
  const orden: Novedad[] = [];

  for (const evento of ordenados) {
    const descripcion = describirEvento(evento, locale);
    if (!descripcion.titulo) continue;
    const llave = `${descripcion.titulo}␟${descripcion.contexto ?? ''}`;
    const existente = porClave.get(llave);
    if (existente) {
      existente.veces += 1;
      continue;
    }
    const novedad: Novedad = {
      ...descripcion,
      clave: evento.id,
      cuando: relativeTimeLabel(evento.occurred_at, locale, ahora),
      veces: 1,
    };
    porClave.set(llave, novedad);
    orden.push(novedad);
  }

  return orden.slice(0, maximo);
}
