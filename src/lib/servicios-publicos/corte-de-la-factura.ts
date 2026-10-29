/**
 * EL CORTE DE UNA FACTURA DE SERVICIOS (reunión con Portofino, 29-10-2026): «esas facturas llegan con un corte
 * atrasado: lo que se liquida de agosto a septiembre se liquidaría en octubre»; «que el agente lea la FECHA DE CORTE…
 * solo liquidamos cuando es un contrato que ya inició»; «cada factura puede venir cargada de un ACUERDO DE PAGO o una
 * REVISIÓN PERIÓDICA que no le corresponde al inquilino sino al propietario».
 *
 * PURO: lo que la pantalla dice de una factura —su corte, el mes en que se facturó, cómo cae en el contrato, lo que es
 * del propietario y lo que Servi leyó— con lo que manda el back y, si es un back anterior, deducido del período.
 */
import type {
  ComoCaeEnElContrato,
  ConceptoDelPropietario,
  FacturaDeServicio,
  TipoDeConceptoDelPropietario,
} from '@/lib/api/servicios-publicos.service';

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const FECHA = /^(\d{4})-(\d{2})-(\d{2})/;
const MES = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DIA_MS = 86_400_000;

/** Días calendario del corte, inclusive (del 15 ago al 15 sep = 32), como el back. */
export function diasEntre(desde: string, hasta: string): number {
  const ms = Date.parse(`${hasta.slice(0, 10)}T00:00:00Z`) - Date.parse(`${desde.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(ms)) return 0;
  return Math.round(ms / DIA_MS) + 1; // redondeo: no es plata (días)
}

/** `2026-09` → `2026-10`. */
export function mesSiguiente(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
}

/** «15 ago» (con el año si se pide): la fecha corta de las frases del corte. */
export function diaCorto(iso: string, conAnio = false): string {
  const p = FECHA.exec(iso ?? '');
  if (!p) return '—';
  const texto = `${Number(p[3])} ${MESES_CORTOS[Number(p[2]) - 1]}`;
  return conAnio ? `${texto} ${p[1]}` : texto;
}

/** `2026-10` → «octubre» (o «octubre de 2026» con el año). */
export function nombreDelMesCorto(mes: string, conAnio = false): string {
  const p = MES.exec(mes ?? '');
  if (!p) return mes;
  const nombre = MESES[Number(p[2]) - 1];
  return conAnio ? `${nombre} de ${p[1]}` : nombre;
}

type ConCorte = Pick<FacturaDeServicio, 'periodoDesde' | 'periodoHasta'> &
  Partial<Pick<FacturaDeServicio, 'corte' | 'mesDelCorte' | 'mesFacturado' | 'mesFacturadoSegun'>>;

/** El corte de la factura (el período de consumo), con sus días. */
export function corteDe(f: ConCorte): { desde: string; hasta: string; dias: number } {
  if (f.corte && f.corte.dias > 0) return f.corte;
  const desde = f.periodoDesde.slice(0, 10);
  const hasta = f.periodoHasta.slice(0, 10);
  return { desde, hasta, dias: diasEntre(desde, hasta) };
}

/** El mes al que cuenta la factura en el tablero: el del último día del corte. */
export function mesDelCorteDe(f: ConCorte): string {
  return f.mesDelCorte ?? corteDe(f).hasta.slice(0, 7);
}

/** El mes en que se facturó: el que trae la factura o, si no lo trae, el siguiente al corte (estimado). */
export function mesFacturadoDe(f: ConCorte): { mes: string; estimado: boolean } {
  if (f.mesFacturado && MES.test(f.mesFacturado)) return { mes: f.mesFacturado, estimado: f.mesFacturadoSegun === 'ESTIMADO' };
  return { mes: mesSiguiente(mesDelCorteDe(f)), estimado: true };
}

/** «Consumo del 15 ago al 15 sep · 32 días» (el año sólo si el corte cruza de año). */
export function fraseDelCorte(f: ConCorte): string {
  const c = corteDe(f);
  const cruzaDeAnio = c.desde.slice(0, 4) !== c.hasta.slice(0, 4);
  const dias = c.dias === 1 ? '1 día' : `${c.dias} días`;
  return `Consumo del ${diaCorto(c.desde, cruzaDeAnio)} al ${diaCorto(c.hasta, cruzaDeAnio)} · ${dias}`;
}

/**
 * «facturada en octubre» o, si la factura no dice el mes, «se factura en octubre» (estimado: el siguiente al corte).
 * El año sólo si no es el del corte.
 */
export function fraseDelMesFacturado(f: ConCorte): { texto: string; estimado: boolean } {
  const { mes, estimado } = mesFacturadoDe(f);
  const otroAnio = mes.slice(0, 4) !== corteDe(f).hasta.slice(0, 4);
  const nombre = nombreDelMesCorto(mes, otroAnio);
  return { texto: estimado ? `se factura en ${nombre}` : `facturada en ${nombre}`, estimado };
}

/** Por qué el mes es estimado, para el `title` y el lector de pantalla. */
export const POR_QUE_ES_ESTIMADO = 'La factura no dice el mes en que se cobró: es el siguiente al corte.';

/** Cómo cae el corte en el contrato, en una frase (DENTRO no dice nada: es lo normal). */
export const COMO_CAE: Record<ComoCaeEnElContrato, string | null> = {
  ANTES_DEL_INICIO: 'Consumo de antes del contrato: es del propietario o del inquilino anterior.',
  CRUZA_EL_INICIO: 'Es de entrada: se parte por días.',
  DENTRO: null,
};

/** El nombre de cada cobro del propietario, como lo dice el back. */
export const NOMBRE_DEL_CONCEPTO_DEL_PROPIETARIO: Record<TipoDeConceptoDelPropietario, string> = {
  ACUERDO_DE_PAGO: 'Acuerdo de pago',
  REVISION_PERIODICA: 'Revisión periódica del gas',
  FINANCIACION: 'Financiación',
  INTERESES_DE_MORA: 'Intereses de mora de antes del contrato',
  OTRO: 'Otro cobro del propietario',
};

/** La regla que se dice junto a cada cobro del propietario. */
export const FRASE_DEL_PROPIETARIO = 'No son del inquilino: se le descuentan al propietario.';

/** Los cobros del propietario que trae la factura (de la factura o, si no, de lo que leyó Servi). */
export function conceptosDelPropietarioDe(f: Partial<Pick<FacturaDeServicio, 'conceptosDelPropietario' | 'revisionDeServi'>>): ConceptoDelPropietario[] {
  const propios = Array.isArray(f.conceptosDelPropietario) ? f.conceptosDelPropietario : [];
  const lista = propios.length > 0 ? propios : (revisionDeServiDe(f)?.conceptosDelPropietario ?? []);
  return lista.filter((c) => !!c && typeof c.concepto === 'string' && typeof c.valorCop === 'number' && c.valorCop > 0);
}

/** Lo que suman los cobros del propietario, tal cual. */
export function totalDelPropietario(conceptos: readonly ConceptoDelPropietario[]): number {
  return conceptos.reduce((s, c) => s + c.valorCop, 0);
}

// ── Lo que Servi leyó y propuso ─────────────────────────────────────────────────────────────────────────────────────

export interface LoQueLeyoServi {
  empresa: string | null;
  numeroDeCuenta: string | null;
  periodoDesde: string | null;
  periodoHasta: string | null;
  valorCop: number | null;
  pagada: boolean | null;
  evidenciaDelPago: string | null;
  mesFacturado: string | null;
  fechaDeEmision: string | null;
}

export interface PropuestaDeServi {
  proceso: string;
  clave: string;
  resumen: string;
  montoCop: number | null;
}

export interface RevisionDeServi {
  veredicto: 'CUADRA' | 'NO_CUADRA' | null;
  motivos: string[];
  leido: LoQueLeyoServi | null;
  ajuste: { valorCop: number; concepto: string; periodo: string | null } | null;
  conceptosDelPropietario: ConceptoDelPropietario[];
  comoCaeEnElContrato: ComoCaeEnElContrato | null;
  /** La factura cruza el inicio: cómo la partiría por días. */
  entrada: { entrega: string | null; diasDelPropietario: number; diasDelInquilino: number; partePropietarioCop: number; parteInquilinoCop: number } | null;
  propuestas: PropuestaDeServi[];
  revisadaEn: string | null;
}

const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const objeto = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const COMO_CAE_VALIDOS: readonly ComoCaeEnElContrato[] = ['ANTES_DEL_INICIO', 'CRUZA_EL_INICIO', 'DENTRO'];
const TIPOS_VALIDOS = Object.keys(NOMBRE_DEL_CONCEPTO_DEL_PROPIETARIO) as TipoDeConceptoDelPropietario[];

/**
 * Lo que Servi dejó en la factura, en limpio (el back lo guarda como un objeto libre). `null` si Servi no la revisó.
 * No confía en la forma: lo que no se entiende se calla, nunca se inventa.
 */
export function revisionDeServiDe(f: Partial<Pick<FacturaDeServicio, 'revisionDeServi'>>): RevisionDeServi | null {
  const r = objeto(f.revisionDeServi);
  if (!r) return null;
  const veredicto = r.veredicto === 'CUADRA' || r.veredicto === 'NO_CUADRA' ? r.veredicto : null;
  const propuestas = (Array.isArray(r.propuestas) ? r.propuestas : [])
    .map(objeto)
    .filter((p): p is Record<string, unknown> => !!p && !!texto(p.resumen))
    .map((p) => ({ proceso: texto(p.proceso) ?? '', clave: texto(p.clave) ?? '', resumen: texto(p.resumen)!, montoCop: numero(p.montoCop) }));
  if (!veredicto && propuestas.length === 0) return null;
  const l = objeto(r.leido);
  const a = objeto(r.ajuste);
  const e = objeto(r.entrada);
  const cae = COMO_CAE_VALIDOS.includes(r.comoCaeEnElContrato as ComoCaeEnElContrato) ? (r.comoCaeEnElContrato as ComoCaeEnElContrato) : null;
  return {
    veredicto,
    motivos: (Array.isArray(r.motivos) ? r.motivos : []).map(texto).filter((m): m is string => !!m),
    leido: l
      ? {
          empresa: texto(l.empresa),
          numeroDeCuenta: texto(l.numeroDeCuenta),
          periodoDesde: texto(l.periodoDesde),
          periodoHasta: texto(l.periodoHasta),
          valorCop: numero(l.valorCop),
          pagada: typeof l.pagada === 'boolean' ? l.pagada : null,
          evidenciaDelPago: texto(l.evidenciaDelPago),
          mesFacturado: texto(l.mesFacturado),
          fechaDeEmision: texto(l.fechaDeEmision),
        }
      : null,
    ajuste: a && numero(a.valorCop) !== null && texto(a.concepto) ? { valorCop: numero(a.valorCop)!, concepto: texto(a.concepto)!, periodo: texto(a.periodo) } : null,
    conceptosDelPropietario: (Array.isArray(r.conceptosDelPropietario) ? r.conceptosDelPropietario : [])
      .map(objeto)
      .filter((c): c is Record<string, unknown> => !!c && !!texto(c.concepto) && (numero(c.valorCop) ?? 0) > 0)
      .map((c) => ({
        tipo: TIPOS_VALIDOS.includes(c.tipo as TipoDeConceptoDelPropietario) ? (c.tipo as TipoDeConceptoDelPropietario) : 'OTRO',
        concepto: texto(c.concepto)!,
        valorCop: numero(c.valorCop)!,
      })),
    comoCaeEnElContrato: cae,
    entrada:
      e && numero(e.diasDelPropietario) !== null && numero(e.diasDelInquilino) !== null
        ? {
            entrega: texto(e.entrega),
            diasDelPropietario: numero(e.diasDelPropietario)!,
            diasDelInquilino: numero(e.diasDelInquilino)!,
            partePropietarioCop: numero(e.partePropietarioCop) ?? 0,
            parteInquilinoCop: numero(e.parteInquilinoCop) ?? 0,
          }
        : null,
    propuestas,
    revisadaEn: texto(r.revisadaEn),
  };
}

/** Cómo cae el corte: el del back, el que leyó Servi, o deducido con el inicio del contrato. */
export function comoCaeDe(
  f: Pick<FacturaDeServicio, 'periodoDesde' | 'periodoHasta'> & Partial<Pick<FacturaDeServicio, 'comoCaeEnElContrato' | 'revisionDeServi' | 'corte'>>,
  inicio?: string | null,
): ComoCaeEnElContrato | null {
  if (f.comoCaeEnElContrato) return f.comoCaeEnElContrato;
  const deServi = revisionDeServiDe(f)?.comoCaeEnElContrato;
  if (deServi) return deServi;
  if (!inicio) return null;
  const c = corteDe(f);
  if (c.hasta < inicio) return 'ANTES_DEL_INICIO';
  if (c.desde < inicio) return 'CRUZA_EL_INICIO';
  return 'DENTRO';
}

/**
 * Lo que la persona tiene que hacer con lo que Servi revisó:
 *   · `POR_DECIDIR` — Servi propuso algo y la factura sigue por revisar: se decide en la Bandeja del Piloto;
 *   · `REVISADA` — Servi la revisó (y ya no espera nada, o no propuso nada);
 *   · `null` — Servi no la ha revisado.
 */
export function estadoDeServi(f: Pick<FacturaDeServicio, 'estado'> & Partial<Pick<FacturaDeServicio, 'revisionDeServi'>>): 'POR_DECIDIR' | 'REVISADA' | null {
  const r = revisionDeServiDe(f);
  if (!r) return null;
  return f.estado === 'POR_REVISAR' && r.propuestas.length > 0 ? 'POR_DECIDIR' : 'REVISADA';
}

/** La Bandeja del Piloto, donde se deciden las propuestas de Servi. */
export const RUTA_DE_LA_BANDEJA = '/panel/inmobiliaria/piloto?bandeja=1';
