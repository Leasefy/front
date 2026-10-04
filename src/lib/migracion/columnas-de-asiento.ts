/**
 * Las columnas del archivo de asientos históricos y cómo se convierten en el
 * lote que espera `POST /inmobiliaria/contabilidad/migracion/{revisar,aplicar}`.
 *
 * ── La forma del archivo ────────────────────────────────────────────────────
 *
 * Una fila por MOVIMIENTO (una pata del asiento), que es como exportan el
 * libro diario Siigo, World Office, Helisa y un Excel a mano. Las filas con
 * el mismo número de comprobante Y la misma fecha forman un asiento (los
 * consecutivos se reinician por mes en varios sistemas); si el archivo no
 * trae número, se agrupan las que comparten fecha y descripción.
 *
 * ── Qué se reusa de terceros ───────────────────────────────────────────────
 *
 * El auto-mapeo (`mapearColumnas`, `remapear`, `obligatoriasSinMapear`) es
 * genérico: recibe `ColumnaDePlantilla[]` y no sabe de terceros. Lo único
 * propio de acá es el catálogo de columnas —el back no tiene un
 * `GET /plantilla` para asientos— y `armarAsientos`, que agrupa.
 */

import type { ColumnaDePlantilla } from '@/lib/api/migracion-terceros.service';
import type { AsientoMigrado, MovimientoMigrado } from '@/lib/api/contabilidad.service';
import type { MapeoDeColumna } from './columnas-de-tercero';

export type CampoDeAsiento =
  | 'tipoComprobante'
  | 'numero'
  | 'fecha'
  | 'descripcion'
  | 'codigoCuenta'
  | 'debito'
  | 'credito'
  | 'valor'
  | 'naturalezaDelValor'
  | 'terceroDocumento'
  | 'terceroNombre'
  | 'detalle';

/**
 * Los alias son los encabezados con que esos programas exportan; se comparan
 * normalizados (sin tildes, minúsculas) y los de menos de 4 letras sólo por
 * igualdad exacta.
 */
export const COLUMNAS_DE_ASIENTO: readonly (ColumnaDePlantilla & { campo: CampoDeAsiento })[] = [
  /*
   * 🔴 QA-MIG-B (04-10). World Office, Alegra y Helisa exportan el TIPO del
   * comprobante (RC, CE, FV, NC…) y el NÚMERO en columnas separadas, y el
   * número se repite entre tipos: RC 1, CE 1 y FV 1 del mismo día. Sin el
   * tipo en la llave, los tres se fundían en UN asiento que cuadra —cada uno
   * cuadra solo— y entraba mal sin que nadie lo viera (24 comprobantes → 6).
   */
  {
    campo: 'tipoComprobante',
    titulo: 'Tipo de comprobante',
    obligatoria: false,
    ejemplo: 'RC',
    alias: ['tipo', 'tipo doc', 'tipo documento', 'tipo de documento', 'tipo comprobante', 'tipo de comprobante', 'clase de documento', 'clase documento', 'prefijo', 'fuente', 'codigo comprobante', 'cod comprobante'],
    ayuda: 'RC, CE, FV, NC… Si el número se repite entre tipos, el tipo y el número juntos forman el asiento.',
  },
  {
    campo: 'numero',
    titulo: 'Número del comprobante',
    obligatoria: false,
    ejemplo: 'CE-0001',
    alias: ['numero', 'comprobante', 'numero comprobante', 'consecutivo', 'asiento', 'documento', 'numero documento', 'nro', 'no', 'doc', 'no comprobante', 'nro comprobante', 'n comprobante', 'numero asiento'],
    ayuda: 'Las filas con el mismo número forman un asiento. Sin esta columna se agrupan por fecha y descripción.',
  },
  {
    campo: 'fecha',
    titulo: 'Fecha',
    obligatoria: true,
    ejemplo: '15/01/2025',
    alias: ['fecha', 'fecha comprobante', 'fecha asiento', 'fecha documento', 'date'],
    ayuda: 'AAAA-MM-DD o DD/MM/AAAA; con hora también sirve.',
  },
  {
    campo: 'descripcion',
    titulo: 'Descripción',
    obligatoria: true,
    ejemplo: 'Canon enero apto 301',
    alias: ['descripcion', 'concepto', 'glosa', 'observaciones', 'observacion'],
  },
  {
    campo: 'codigoCuenta',
    titulo: 'Código de cuenta',
    obligatoria: true,
    ejemplo: '110505',
    alias: ['codigo cuenta', 'cuenta', 'codigo', 'cuenta contable', 'codigo puc', 'puc', 'cta', 'cod cta', 'cod cuenta', 'cta contable', 'codigo contable'],
    ayuda: 'Sólo el código; con puntos o guiones también se entiende (1105-05 → 110505).',
  },
  {
    campo: 'debito',
    titulo: 'Débito',
    obligatoria: false,
    ejemplo: '1.500.000',
    alias: ['debito', 'debe', 'debitos', 'valor debito', 'valor debe', 'db', 'movimiento debito'],
  },
  {
    campo: 'credito',
    titulo: 'Crédito',
    obligatoria: false,
    ejemplo: '',
    alias: ['credito', 'haber', 'creditos', 'valor credito', 'valor haber', 'cr', 'movimiento credito'],
  },
  /*
   * QA-MIG-B (04-10): el valor en UNA columna. Muchos saldos iniciales y
   * libros auxiliares traen «Valor» con signo (negativo = crédito) o «Valor»
   * más una columna «D/C». Antes no había dónde decirlo y el archivo entero
   * salía «el movimiento está en cero». El back lo lee (`valor` +
   * `naturalezaDelValor`) sólo cuando Débito y Crédito vienen vacíos.
   */
  {
    campo: 'valor',
    titulo: 'Valor (una sola columna)',
    obligatoria: false,
    ejemplo: '-1.500.000',
    alias: ['valor', 'monto', 'importe', 'valor movimiento', 'valor neto', 'valor del movimiento'],
    ayuda: 'Cuando débito y crédito vienen en una sola columna: con signo (positivo débito, negativo crédito) o con la columna D/C al lado.',
  },
  {
    campo: 'naturalezaDelValor',
    titulo: 'D/C del valor',
    obligatoria: false,
    ejemplo: 'C',
    alias: ['d c', 'dc', 'naturaleza', 'nat', 'debito credito', 'db cr', 'tipo movimiento', 'signo', 'naturaleza movimiento'],
    ayuda: 'D o C (Débito o Crédito) para la columna «Valor».',
  },
  /*
   * QA-MIG-B (04-10): el tercero de la línea. En los saldos iniciales por
   * tercero (la cartera de cada inquilino, lo que se le debe a cada
   * propietario) es lo que dice DE QUIÉN es el saldo; antes la columna
   * quedaba «Ignorar» y se perdía. El back lo enlaza si el documento es de
   * un propietario o inquilino de la inmobiliaria y, si no, lo guarda en el
   * detalle de la línea y lo dice.
   */
  {
    campo: 'terceroDocumento',
    titulo: 'Documento del tercero',
    obligatoria: false,
    ejemplo: '1036111001',
    alias: ['nit', 'nit tercero', 'tercero nit', 'identificacion', 'identificacion tercero', 'documento tercero', 'documento del tercero', 'cedula', 'cc nit', 'nit cc', 'numero identificacion', 'id tercero', 'nro identificacion'],
    ayuda: 'Cédula o NIT de quien es el saldo de esa línea.',
  },
  {
    campo: 'terceroNombre',
    titulo: 'Nombre del tercero',
    obligatoria: false,
    ejemplo: 'Laura Mejía',
    alias: ['tercero', 'nombre tercero', 'nombre del tercero', 'razon social', 'nombre razon social', 'beneficiario'],
  },
  {
    campo: 'detalle',
    titulo: 'Detalle de la línea',
    obligatoria: false,
    ejemplo: 'Apto 301 — enero',
    alias: ['detalle', 'detalle movimiento', 'descripcion movimiento', 'nota'],
  },
];

function texto(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    // Una fecha que SheetJS no pudo armar (Invalid Date) haría reventar
    // `toISOString` y con él la pantalla entera. Viaja vacía y el back
    // rechaza la fila con un mensaje que se entiende.
    return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  }
  return String(v).trim();
}

/**
 * Los `@MaxLength` de `MigrarAsientoDto`/`MigrarMovimientoDto`. Una sola celda
 * más larga que esto haría que class-validator devuelva **400 al lote entero**
 * (las 40.000 filas buenas incluidas). Se recorta ACÁ para que el archivo
 * sucio llegue al back, y sea el back el que diga fila por fila qué entra.
 */
const LIMITES_DTO = { numero: 60, fecha: 30, descripcion: 1000, codigo: 40, detalle: 1000, naturalezaDelValor: 40, terceroDocumento: 40, terceroNombre: 200 } as const;

function cap(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n);
}

/** El valor crudo del monto: el back normaliza «1.500.000» y «1500000.00». */
function montoCrudo(v: unknown): string | number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number') return v === 0 ? undefined : v;
  const s = String(v).trim();
  return s === '' || s === '0' ? undefined : s;
}

/**
 * Filas del archivo → asientos del lote. Se conserva el orden de aparición y
 * las filas sin cuenta ni monto se saltan (son las que quedan al final).
 */
export function armarAsientos(
  filas: readonly Record<string, unknown>[],
  mapeo: readonly MapeoDeColumna[],
): AsientoMigrado[] {
  const columnaDe = new Map<string, string>();
  for (const m of mapeo) if (m.campo) columnaDe.set(m.campo, m.columna);
  const leer = (fila: Record<string, unknown>, campo: CampoDeAsiento): unknown => {
    const col = columnaDe.get(campo);
    return col === undefined ? undefined : fila[col];
  };

  const asientos = new Map<string, AsientoMigrado>();
  for (const fila of filas) {
    const codigoCuenta = cap(texto(leer(fila, 'codigoCuenta')), LIMITES_DTO.codigo);
    const debito = montoCrudo(leer(fila, 'debito'));
    const credito = montoCrudo(leer(fila, 'credito'));
    const valor = montoCrudo(leer(fila, 'valor'));
    if (!codigoCuenta && debito === undefined && credito === undefined && valor === undefined) continue;

    const numero = numeroDelComprobante(
      texto(leer(fila, 'tipoComprobante')),
      texto(leer(fila, 'numero')),
    );
    const fecha = cap(texto(leer(fila, 'fecha')), LIMITES_DTO.fecha);
    const descripcion = cap(texto(leer(fila, 'descripcion')), LIMITES_DTO.descripcion);
    /*
     * La clave lleva número Y fecha: Siigo y World Office reinician el
     * consecutivo por mes, así que el «CE-1» de enero y el de febrero son
     * asientos distintos. Agruparlos sólo por número los fundía en uno — y
     * como cada uno cuadra solo, el fundido también cuadra y entraba MAL
     * sin que nadie lo viera. El número ya trae el tipo (`numeroDelComprobante`).
     */
    const clave = numero ? `n:${numero}|${fecha}` : `fd:${fecha}|${descripcion}`;

    let asiento = asientos.get(clave);
    if (!asiento) {
      asiento = { fecha, descripcion, movimientos: [] };
      if (numero) asiento.numeroOriginal = cap(numero, LIMITES_DTO.numero);
      asientos.set(clave, asiento);
    }

    const movimiento: MovimientoMigrado = { codigoCuenta };
    if (debito !== undefined) movimiento.debito = debito;
    if (credito !== undefined) movimiento.credito = credito;
    // El valor de una sola columna viaja SÓLO si débito y crédito vienen
    // vacíos: dos fuentes para el mismo monto sería adivinar cuál manda.
    if (valor !== undefined && debito === undefined && credito === undefined) {
      movimiento.valor = valor;
      const dc = cap(texto(leer(fila, 'naturalezaDelValor')), LIMITES_DTO.naturalezaDelValor);
      if (dc) movimiento.naturalezaDelValor = dc;
    }
    const detalle = cap(texto(leer(fila, 'detalle')), LIMITES_DTO.detalle);
    if (detalle) movimiento.descripcion = detalle;
    const terceroDocumento = cap(texto(leer(fila, 'terceroDocumento')), LIMITES_DTO.terceroDocumento);
    const terceroNombre = cap(texto(leer(fila, 'terceroNombre')), LIMITES_DTO.terceroNombre);
    if (terceroDocumento) movimiento.terceroDocumento = terceroDocumento;
    if (terceroNombre) movimiento.terceroNombre = terceroNombre;
    asiento.movimientos.push(movimiento);
  }
  return [...asientos.values()];
}

/**
 * El número del comprobante tal como lo identifica el sistema viejo: el tipo
 * y el número juntos («RC-1») cuando vienen en columnas separadas. Si el
 * número ya empieza por el tipo («RC-1», «RC00001»), no se repite.
 */
export function numeroDelComprobante(tipo: string, numero: string): string {
  if (!numero) return '';
  if (!tipo) return numero;
  const t = tipo.trim();
  if (numero.toUpperCase().startsWith(t.toUpperCase())) return numero;
  return `${t}-${numero}`;
}

/**
 * ¿Hay de dónde sacar la plata? Débito o crédito, o el valor de una sola
 * columna. Sin ninguno, ninguna línea traería monto.
 */
export function montosSinMapear(mapeo: readonly MapeoDeColumna[]): boolean {
  return !mapeo.some((m) => m.campo === 'debito' || m.campo === 'credito' || m.campo === 'valor');
}

export function nombreDeLoteDeAsientos(ahora = new Date()): string {
  // QA-MIG-B: la hora de la PERSONA, no la UTC (a la 1:40 a. m. el lote salía
  // «…-0640»). Sigue siendo `AAAA-MM-DD-HHMM`.
  const d = (n: number) => String(n).padStart(2, '0');
  const sello = `${ahora.getFullYear()}-${d(ahora.getMonth() + 1)}-${d(ahora.getDate())}-${d(ahora.getHours())}${d(ahora.getMinutes())}`;
  return `asientos-${sello}`.slice(0, 60);
}
