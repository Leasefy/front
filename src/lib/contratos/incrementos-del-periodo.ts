/**
 * La pantalla «Incrementos» (Portofino, 22-10-2026) — lo puro: el mes que se
 * mira, los grupos de la carta y del contrato, y lo que el buscador lee.
 *
 * Departamento financiero de Portofino: «el módulo de renovaciones sirve para
 * renovar porque salen todos los que están por terminar, pero debería tener uno
 * solo de incrementos en donde por fecha se filtre cuáles tienen incremento,
 * renovados o no renovados, porque hay contratos que ya están renovados pero
 * falta esa notificación». Renovaciones sólo lista lo que vence; un contrato ya
 * renovado con incremento no salía en ningún lado más de 30 días antes.
 */
import type { CartaEnLaBandeja, EstadoDelIncremento, PeriodoDeLosIncrementos } from '@/lib/api/ciclo-de-vida.service';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const MES_VALIDO = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** `AAAA-MM` de un día. */
function mesDe(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * El mes que se abre: el de dentro de 30 días. A fin de octubre son las cartas
 * de noviembre (las que hay que mandar ya); a principio de mes, las del mismo.
 */
export function mesPorDefecto(hoy: Date): string {
  return mesDe(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 30));
}

/**
 * «Lo de ahora»: la bandeja de siempre — las cartas de los próximos N días
 * (30 por defecto) y las vencidas sin constancia. Es lo que cuentan las
 * losetas de Renovaciones, así que su enlace abre esto y los números cuadran.
 */
export const LO_DE_AHORA = 'proximos';

/** El mes de la URL si sirve (o `proximos`); si no, el de por defecto. */
export function mesDeLaUrl(valor: string | null | undefined, hoy: Date): string {
  if (valor === LO_DE_AHORA) return LO_DE_AHORA;
  return valor && MES_VALIDO.test(valor) ? valor : mesPorDefecto(hoy);
}

/** El período que se le pide al back; `undefined` = la bandeja de siempre. */
export function periodoPedido(mes: string): PeriodoDeLosIncrementos | undefined {
  return mes === LO_DE_AHORA ? undefined : periodoDelMes(mes);
}

/** Del primero al último día del mes, `AAAA-MM-DD`. */
export function periodoDelMes(mes: string): PeriodoDeLosIncrementos {
  const m = MES_VALIDO.exec(mes);
  if (!m) throw new Error(`«${mes}» no es un mes AAAA-MM.`);
  const anio = Number(m[1]);
  const numero = Number(m[2]);
  const ultimo = new Date(anio, numero, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, '0')}` };
}

/** «noviembre de 2026». */
export function nombreDelMes(mes: string): string {
  if (mes === LO_DE_AHORA) return 'los próximos 30 días';
  const m = MES_VALIDO.exec(mes);
  if (!m) return mes;
  return `${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

/** Los meses que se pueden elegir: seis atrás (lo vencido sin constancia) y once adelante. */
export function mesesParaElegir(hoy: Date): Array<{ valor: string; rotulo: string }> {
  const meses: Array<{ valor: string; rotulo: string }> = [];
  for (let k = -6; k <= 11; k++) {
    const valor = mesDe(new Date(hoy.getFullYear(), hoy.getMonth() + k, 1));
    meses.push({ valor, rotulo: nombreDelMes(valor) });
  }
  return meses;
}

export type GrupoDeLaCarta = 'por-notificar' | 'sin-constancia' | 'notificadas' | 'no-suben';

export const GRUPOS_DE_LA_CARTA: ReadonlyArray<{ clave: GrupoDeLaCarta; rotulo: string }> = [
  { clave: 'por-notificar', rotulo: 'Por notificar' },
  { clave: 'sin-constancia', rotulo: 'Sin constancia' },
  { clave: 'notificadas', rotulo: 'Notificadas' },
  { clave: 'no-suben', rotulo: 'No suben' },
];

/** A qué grupo va una carta. Las enlaces viejos (`?estado=por-enviar`, `enviadas`) caen en el suyo. */
export function grupoDeLaCarta(estado: EstadoDelIncremento): GrupoDeLaCarta {
  switch (estado) {
    case 'ENVIADA':
      return 'notificadas';
    case 'VENCIDA_SIN_CONSTANCIA':
      return 'sin-constancia';
    case 'SIN_INCREMENTO':
      return 'no-suben';
    default:
      return 'por-notificar';
  }
}

/** El `?estado=` de la URL (también el de la cola vieja de cartas). */
export function grupoDeLaUrl(valor: string | null | undefined): GrupoDeLaCarta | 'todas' {
  switch (valor) {
    case 'por-notificar':
    case 'por-enviar':
      return 'por-notificar';
    case 'sin-constancia':
      return 'sin-constancia';
    case 'notificadas':
    case 'enviadas':
      return 'notificadas';
    case 'no-suben':
      return 'no-suben';
    default:
      return 'todas';
  }
}

export type SituacionDelContrato = 'renovados' | 'por-renovar';

export const SITUACIONES_DEL_CONTRATO: ReadonlyArray<{ clave: SituacionDelContrato; rotulo: string }> = [
  { clave: 'renovados', rotulo: 'Ya renovados' },
  { clave: 'por-renovar', rotulo: 'Por renovar' },
];

/** Por renovar = vence en 90 días o menos (también está en Renovaciones). */
export function situacionDelContrato(c: Pick<CartaEnLaBandeja, 'porRenovar'>): SituacionDelContrato {
  return c.porRenovar ? 'por-renovar' : 'renovados';
}

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Lo que el buscador mira: el contrato, el inquilino, su cédula y el inmueble. */
export function coincideConLaBusqueda(c: CartaEnLaBandeja, busqueda: string): boolean {
  const q = normalizar(busqueda);
  if (q === '') return true;
  const texto = normalizar(
    [c.externalId, String(c.code), c.inquilino, c.documentoDelInquilino, c.inmueble].filter(Boolean).join(' '),
  );
  if (texto.includes(q)) return true;
  // La cédula se escribe con o sin puntos: «43.687.485» = «43687485».
  const digitos = q.replace(/\D/g, '');
  return digitos.length >= 4 && (c.documentoDelInquilino ?? '').replace(/\D/g, '').includes(digitos);
}

/** «+5,1 %» del incremento, o `null` si no se sabe. */
export function porcentajeDelIncremento(c: Pick<CartaEnLaBandeja, 'canonAnteriorCop' | 'canonNuevoCop' | 'porcentaje'>): number | null {
  if (c.porcentaje != null) return c.porcentaje;
  if (!(c.canonAnteriorCop > 0)) return null;
  return ((c.canonNuevoCop - c.canonAnteriorCop) / c.canonAnteriorCop) * 100;
}
