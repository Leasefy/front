/**
 * 🔴 LAS FECHAS DE UN DÍA, COMO LAS ESCRIBE LA CASA (QA de Pagos, PG-13 /
 * PG-R11, 03-10-2026). PURA.
 *
 * En Pagos se veían fechas crudas: «Vence el 2026-11-01» en el recibo de caja,
 * «Leído contra el 2026-10-03» al pie de la deuda del mes, «Datos al
 * 2026-10-03» en el tablero, la columna del calendario de festivos en ISO y el
 * rango de Nui «De 01-Sep-2026 hasta 30-Sep-2026» en el concepto de una cuota.
 * Una persona no lee `AAAA-MM-DD`: lee «1 nov 2026».
 *
 * Dos formas, las mismas del estado de cuenta (`estado-de-cuenta/filas.ts::
 * fechaLegible`):
 *   · `fechaCorta`   — «1 nov 2026», para tablas, listas y rótulos;
 *   · `fechaLarga`   — «1 de noviembre de 2026», dentro de una frase.
 *
 * Sin `Intl` a propósito: `toLocaleDateString('es-CO')` cambia de un motor a
 * otro («nov» / «nov.»), y la pantalla y sus pruebas tienen que decir lo mismo.
 * Y sin `new Date(iso)`: un `2026-11-01` leído así es medianoche UTC y en
 * Colombia cae el 31 de octubre.
 */

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
] as const;

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

const DIA = /^(\d{4})-(\d{2})-(\d{2})/;

interface DiaCivil {
  anio: number;
  mes: number;
  dia: number;
}

function leerDia(iso: string | null | undefined): DiaCivil | null {
  const m = DIA.exec(String(iso ?? '').trim());
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return { anio, mes, dia };
}

/**
 * «1 nov 2026». Lo que no es una fecha se devuelve tal cual (nunca se inventa
 * un día) y lo vacío es «—».
 */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = leerDia(iso);
  if (!d) return String(iso);
  return `${d.dia} ${MESES_CORTOS[d.mes - 1]} ${d.anio}`;
}

/** «1 de noviembre de 2026», para ir dentro de una frase. */
export function fechaLarga(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = leerDia(iso);
  if (!d) return String(iso);
  return `${d.dia} de ${MESES[d.mes - 1]} de ${d.anio}`;
}

/** El día de hoy en Colombia, `AAAA-MM-DD`. A las 7 p. m. de Bogotá ya es mañana en UTC. */
export function hoyEnColombia(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

/**
 * El DÍA de Colombia de un valor que puede ser un día (`2026-10-03`) o un
 * instante (`2026-10-04T00:30:00.000Z`, lo que el back manda de una columna
 * `DateTime`). Un día se respeta tal cual; un instante se pasa a Bogotá: el
 * recordatorio que salió a las 7:30 p. m. del 3 salió el 3, no el 4. `null`
 * si no se deja leer.
 */
export function diaEnColombia(valor: string | null | undefined): string | null {
  const texto = String(valor ?? '').trim();
  if (!texto) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  const instante = new Date(texto);
  return Number.isNaN(instante.getTime()) ? null : hoyEnColombia(instante);
}

/** ¿El rango cubre el mes entero (del 1 al último día)? */
function esElMesEntero(desde: DiaCivil, hasta: DiaCivil): boolean {
  if (desde.anio !== hasta.anio || desde.mes !== hasta.mes || desde.dia !== 1) return false;
  const ultimo = new Date(Date.UTC(hasta.anio, hasta.mes, 0)).getUTCDate();
  return hasta.dia === ultimo;
}

const MES_DE_NUI: Record<string, number> = {
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dic: 12,
};

/** «01-Sep-2026» (como lo escribe Nui) o «2026-09-01» → el día; `null` si no es una fecha. */
function diaDeLaCola(texto: string): DiaCivil | null {
  const iso = leerDia(texto);
  if (iso) return iso;
  const m = /^(\d{1,2})-([A-Za-zñÑ]{3,4})-(\d{4})$/.exec(texto);
  if (!m) return null;
  const mes = MES_DE_NUI[m[2]!.toLowerCase()];
  return mes ? { anio: Number(m[3]), mes, dia: Number(m[1]) } : null;
}

/** La cola «. De 01-Sep-2026 hasta 30-Sep-2026» con la que Nui (y el back) cierran el concepto. */
const COLA_DEL_PERIODO = /\.?\s*De\s+(\S+)\s+hasta\s+(\S+)\s*$/i;

/**
 * El nombre de un concepto de cuota sin el rango crudo del final.
 *
 *   · «Canon de arrendamiento. De 01-Sep-2026 hasta 30-Sep-2026» → «Canon de
 *     arrendamiento» (el mes ya lo dice el renglón);
 *   · un mes PARTIDO (prorrateo, cambio de inquilino) conserva el rango, en
 *     la forma de la casa: «Canon de arrendamiento (7 jun 2026 → 30 jun 2026)»;
 *   · si la cola no se deja leer, el texto queda entero: nunca se borra un
 *     dato que no se vuelve a mostrar en otro lado.
 */
export function conceptoSinElRango(concepto: string): string {
  const texto = String(concepto ?? '');
  const m = COLA_DEL_PERIODO.exec(texto);
  if (!m) return texto;
  const desde = diaDeLaCola(m[1]!);
  const hasta = diaDeLaCola(m[2]!);
  if (!desde || !hasta) return texto;
  const nombre = texto.slice(0, m.index).trim().replace(/\.$/, '');
  if (!nombre) return texto;
  if (esElMesEntero(desde, hasta)) return nombre;
  const iso = (d: DiaCivil) =>
    `${d.anio}-${String(d.mes).padStart(2, '0')}-${String(d.dia).padStart(2, '0')}`;
  return `${nombre} (${fechaCorta(iso(desde))} → ${fechaCorta(iso(hasta))})`;
}
