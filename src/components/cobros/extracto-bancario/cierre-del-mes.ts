/**
 * El cierre mensual, la relación de las aseguradoras y la planilla de caja —
 * lo que la pantalla calcula sin red (Nico, P9/P6/P12, 03-10-2026).
 *
 *   · Exportar el cierre a Excel y PDF: SIEMPRE desde la foto inmutable que
 *     guardó el back (lo que firmó el contador), nunca recalculado. El PDF y la
 *     hoja llevan la huella sha256 para que el revisor la compare.
 *   · Leer la relación de pagos de una aseguradora con el mapeo de columnas que
 *     eligió la persona (no hay ejemplo real todavía: el mapeo es genérico).
 */

import { fechaEscritaComoIso } from '@/lib/fechas/fecha-escrita';
import { decimalesEnDocumento, decimalesEnPantalla, seMuestranLosCentavos } from '@/lib/plata/escribir-plata';
import { aCentavos } from '@/lib/plata/plata';
import {
  NOMBRE_DEL_ORIGEN,
  NOMBRE_DEL_RANGO,
  NOMBRE_DEL_TIPO_DE_PARTIDA,
  type CampoDeLaRelacion,
  type CierreConFoto,
  type FotoDelCierre,
  type MapeoDeColumnas,
} from '@/lib/api/cierre-de-conciliacion';

// ── Formatos ─────────────────────────────────────────────────────────────

/**
 * $1.234.567 (con signo menos tipográfico). P8 a («centavos en todo»): los
 * centavos SÓLO si el valor los tiene ($1.234.567,29); un entero, como siempre.
 * Ya no redondea: la plata se trae tal cual.
 */
export function pesos(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const cifra = seMuestranLosCentavos(n)
    ? Math.abs(n).toLocaleString('es-CO', decimalesEnPantalla(n))
    : Math.abs(Math.round(n)).toLocaleString('es-CO');
  const s = `$${cifra}`;
  return n < 0 ? `−${s}` : s;
}

/**
 * La plata del cierre como DOCUMENTO (Excel y PDF): con la llave de la
 * tesorería (`conCentavos`), SIEMPRE dos decimales ($1.234.567,00); sin ella,
 * igual que `pesos`.
 */
export function pesosEnDocumento(n: number | null | undefined, conCentavos: boolean): string {
  if (!conCentavos) return pesos(n);
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const s = `$${Math.abs(n).toLocaleString('es-CO', decimalesEnDocumento(n, true))}`;
  return n < 0 ? `−${s}` : s;
}

/** La llave de la tesorería para los documentos del cierre. */
export interface OpcionesDelDocumento {
  conCentavos?: boolean;
}

export function porcentaje(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `${n.toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`;
}

const FUENTE_DEL_SALDO: Record<string, string> = {
  carga: 'el extracto cargado',
  calculado: 'calculado con el extracto',
  persona: 'escrito por el contador',
};

// ── Lo que va en el Excel y en el PDF ────────────────────────────────────

export interface SeccionDelCierre {
  titulo: string;
  filas: (string | number)[][];
}

/** El cierre en secciones (mismo contenido para el Excel y el PDF). */
export function seccionesDelCierre(
  c: CierreConFoto,
  { conCentavos = false }: OpcionesDelDocumento = {},
): SeccionDelCierre[] {
  const plata = (n: number | null | undefined) => pesosEnDocumento(n, conCentavos);
  const f: FotoDelCierre = c.foto;
  const firma = f.firma;
  const resumen: (string | number)[][] = [
    ['Cuenta', f.cuenta.nombre],
    ['Banco', f.cuenta.banco ?? '—'],
    ['Mes', f.mesEnPalabras],
    ['Período', `${f.periodo.desde} a ${f.periodo.hasta}`],
    ['Versión del cierre', c.version],
    ['Estado', c.estado === 'CERRADO' ? 'Cerrado y firmado' : 'Reabierto'],
    ['Saldo según el extracto', plata(f.saldos.extracto.valorCop)],
    ['De dónde sale', f.saldos.extracto.fuente ? FUENTE_DEL_SALDO[f.saldos.extracto.fuente] : f.saldos.extracto.detalle],
    ['Saldo en libros', plata(f.saldos.libros.compartida ? null : f.saldos.libros.valorCop)],
    ['Cuenta contable', f.saldos.libros.cuentaPuc ? `${f.saldos.libros.cuentaPuc.codigo} ${f.saldos.libros.cuentaPuc.nombre}` : 'Sin asignar'],
    ['Diferencia (extracto − libros)', plata(f.saldos.diferenciaCop)],
    ['Partidas conciliatorias (neto)', plata(f.saldos.efectoDeLasPartidasCop)],
    ['Diferencia sin explicar', plata(f.saldos.diferenciaSinExplicarCop)],
    ['Conciliado por número', porcentaje(f.conciliado.porNumeroPct)],
    ['Conciliado por valor', porcentaje(f.conciliado.porValorPct)],
    ['Firmó', firma ? `${firma.nombre ?? 'Sin nombre'} (${firma.rol === 'CONTADOR' ? 'contador' : firma.rol})` : 'Sin firmar (borrador)'],
    ['Tarjeta profesional', firma?.tarjetaProfesional ?? '—'],
    ['Firmado el', firma ? new Date(firma.firmadoAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '—'],
    ['Huella (sha256)', c.huella],
  ];
  if (c.reapertura) {
    resumen.push(['Reabierto el', new Date(c.reapertura.at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })]);
    resumen.push(['Reabierto por', c.reapertura.nombre ?? '—']);
    resumen.push(['Motivo', c.reapertura.motivo ?? '—']);
  }
  const porTipo: (string | number)[][] = [
    ['Tipo', 'Antigüedad', 'Partidas', 'Valor'],
    ...f.partidas.porTipoYRango
      .filter((g) => g.n > 0)
      .map((g) => [NOMBRE_DEL_TIPO_DE_PARTIDA[g.tipo], NOMBRE_DEL_RANGO[g.rango], g.n, g.valorCop]),
    ['Total', '', f.partidas.total.n, f.partidas.total.valorCop],
  ];
  const lista: (string | number)[][] = [
    ['Fecha', 'Tipo', 'Días', 'Antigüedad', 'Valor', 'Descripción', 'Referencia'],
    ...f.partidas.lista.map((p) => [
      p.fecha,
      NOMBRE_DEL_TIPO_DE_PARTIDA[p.tipo],
      p.dias,
      NOMBRE_DEL_RANGO[p.rango],
      p.valorCop,
      p.descripcion,
      p.referencia ?? '',
    ]),
  ];
  const quien: (string | number)[][] = [
    ['Quién concilió', 'Líneas', 'Valor'],
    ...f.quien.flatMap((q) => [
      [NOMBRE_DEL_ORIGEN[q.origen], q.n, q.valorCop],
      ...q.personas.map((p) => [`   ${p.nombre}`, p.n, p.valorCop]),
    ]),
  ];
  const secciones: SeccionDelCierre[] = [
    { titulo: 'Resumen', filas: resumen },
    { titulo: 'Partidas por tipo y antigüedad', filas: porTipo },
    { titulo: 'Partidas conciliatorias', filas: lista },
    { titulo: 'Quién concilió', filas: quien },
  ];
  if (f.terceros) {
    secciones.push({
      titulo: 'Plata de terceros (toda la inmobiliaria)',
      filas: [
        ['Saldo de la cuenta de recaudo', plata(f.terceros.saldoDeLaCuentaCop)],
        ['Plata de terceros que debería haber', plata(f.terceros.plataDeTercerosCop)],
        ['Partidas por identificar', plata(f.terceros.partidasPorIdentificarCop)],
        ['Diferencia', plata(f.terceros.diferenciaCop)],
        ['La diferencia es la comisión por trasladar', f.terceros.laDiferenciaEsLaComision ? 'Sí' : 'No'],
      ],
    });
  }
  if (f.avisos.length > 0) secciones.push({ titulo: 'Avisos', filas: f.avisos.map((a) => [a]) });
  return secciones;
}

export function nombreDelArchivoDelCierre(c: CierreConFoto, extension: 'xlsx' | 'pdf'): string {
  const cuenta = c.foto.cuenta.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `cierre-${c.foto.mes}-${cuenta || 'cuenta'}-v${c.version}.${extension}`;
}

/** El Excel: una hoja por sección. */
export async function exportarElCierreAExcel(c: CierreConFoto, opciones: OpcionesDelDocumento = {}): Promise<void> {
  const XLSX = await import('xlsx');
  const libro = XLSX.utils.book_new();
  for (const s of seccionesDelCierre(c, opciones)) {
    const hoja = XLSX.utils.aoa_to_sheet(s.filas);
    XLSX.utils.book_append_sheet(libro, hoja, s.titulo.slice(0, 31));
  }
  XLSX.writeFile(libro, nombreDelArchivoDelCierre(c, 'xlsx'));
}

/** El PDF: texto plano, paginado, con la huella al pie de cada página. */
export async function exportarElCierreAPdf(c: CierreConFoto, opciones: OpcionesDelDocumento = {}): Promise<void> {
  const conCentavos = opciones.conCentavos === true;
  const { default: JsPdf } = await import('jspdf');
  const doc = new JsPdf({ unit: 'pt', format: 'letter' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const margen = 48;
  let y = margen;
  const pie = () => {
    doc.setFontSize(8);
    doc.text(`Huella sha256: ${c.huella}`, margen, alto - 24);
  };
  const salto = (h: number) => {
    if (y + h > alto - 48) {
      pie();
      doc.addPage();
      y = margen;
    }
  };
  doc.setFontSize(16);
  doc.text(`Cierre de la conciliación — ${c.foto.mesEnPalabras}`, margen, y);
  y += 22;
  doc.setFontSize(11);
  doc.text(c.foto.cuenta.nombre, margen, y);
  y += 20;
  for (const s of seccionesDelCierre(c, opciones)) {
    salto(30);
    doc.setFontSize(12);
    doc.text(s.titulo, margen, y);
    y += 16;
    doc.setFontSize(9);
    for (const fila of s.filas) {
      const texto = fila.map((x) => (typeof x === 'number' ? pesosSiEsPlata(x, conCentavos) : x)).join('   ·   ');
      const lineas = doc.splitTextToSize(texto, ancho - margen * 2) as string[];
      salto(lineas.length * 12);
      doc.text(lineas, margen, y);
      y += lineas.length * 12;
    }
    y += 8;
  }
  pie();
  doc.save(nombreDelArchivoDelCierre(c, 'pdf'));
}

/**
 * En el PDF, un número grande es plata; uno chico (días, conteos) se deja como
 * está. Uno con centavos también es plata: los días y los conteos son enteros.
 */
function pesosSiEsPlata(n: number, conCentavos: boolean): string {
  return Math.abs(n) >= 1_000 || !Number.isInteger(n) ? pesosEnDocumento(n, conCentavos) : String(n);
}

// ── La relación de pagos de una aseguradora ──────────────────────────────

/**
 * «$ 1.234.567», «1234567», «1,234,567.00» → 1234567. Con centavos de verdad,
 * `'mal'`… salvo con la llave de la tesorería (`conCentavos`, «centavos en
 * todo»): entonces «1.234.567,29» → 1234567.29 tal cual (el back los acepta
 * con la misma llave, `leerLaLinea({ conCentavos })`).
 */
export function aPesos(valor: unknown, conCentavos = false): number | null | 'mal' {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') {
    if (Number.isInteger(valor)) return valor;
    if (!conCentavos || !Number.isFinite(valor)) return 'mal';
    try {
      return aCentavos(valor, { talCual: true }) / 100;
    } catch {
      return 'mal';
    }
  }
  if (typeof valor !== 'string') return 'mal';
  let s = valor.replace(/[$\s]/g, '');
  if (!s) return null;
  const ultimoPunto = s.lastIndexOf('.');
  const ultimaComa = s.lastIndexOf(',');
  const decimal = ultimoPunto > ultimaComa ? '.' : ',';
  const partes = s.split(decimal);
  let centavos = '';
  // Un separador decimal sólo si le siguen 1 o 2 cifras (si no, es de miles).
  if (partes.length > 1 && /^\d{1,2}$/.test(partes[partes.length - 1])) {
    const cent = partes.pop()!;
    if (/[1-9]/.test(cent)) {
      if (!conCentavos) return 'mal';
      centavos = cent;
    }
    s = partes.join(decimal);
  }
  s = s.replace(/[.,]/g, '');
  if (!/^-?\d+$/.test(s)) return 'mal';
  if (!centavos) return Number(s);
  try {
    return aCentavos(`${s}.${centavos}`) / 100;
  } catch {
    return 'mal';
  }
}

export interface LecturaDeLaRelacion {
  filas: Record<string, unknown>[];
  malas: { fila: number; motivo: string }[];
}

/**
 * Las filas del archivo como las espera el back (`netoCop`, `siniestro`…),
 * leídas con el mapeo. Lo que no se entiende se dice por fila y no se manda:
 * el back no guarda una relación a medias.
 */
export function leerLaRelacion(
  filas: readonly Record<string, unknown>[],
  mapeo: MapeoDeColumnas,
  /** La llave de la tesorería («centavos en todo»): con ella, hasta dos decimales. */
  { conCentavos = false }: { conCentavos?: boolean } = {},
): LecturaDeLaRelacion {
  const salida: Record<string, unknown>[] = [];
  const malas: { fila: number; motivo: string }[] = [];
  const celda = (fila: Record<string, unknown>, campo: CampoDeLaRelacion) => {
    const columna = mapeo[campo];
    return columna ? fila[columna] : undefined;
  };
  const texto = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');
  filas.forEach((fila, i) => {
    const n = i + 1;
    const neto = aPesos(celda(fila, 'neto'), conCentavos);
    // Una fila del todo vacía (el total al pie, una línea en blanco) no cuenta.
    const algo = Object.values(fila).some((v) => texto(v) !== '');
    if (!algo) return;
    if (neto === null || neto === 'mal' || neto <= 0) {
      malas.push({
        fila: n,
        motivo: conCentavos
          ? 'El valor pagado no es un número de pesos mayor que cero (con hasta dos decimales).'
          : 'El valor pagado no es un número de pesos mayor que cero (sin centavos).',
      });
      return;
    }
    const bruto = aPesos(celda(fila, 'bruto'), conCentavos);
    const retencion = aPesos(celda(fila, 'retencion'), conCentavos);
    if (bruto === 'mal' || retencion === 'mal') {
      malas.push({ fila: n, motivo: 'El valor bruto o la retención no son un número de pesos.' });
      return;
    }
    let fecha: string | null = null;
    const crudaDeFecha = celda(fila, 'fecha');
    if (crudaDeFecha !== undefined && texto(crudaDeFecha) !== '') {
      fecha = crudaDeFecha instanceof Date ? crudaDeFecha.toISOString().slice(0, 10) : fechaEscritaComoIso(crudaDeFecha);
      if (!fecha) {
        malas.push({ fila: n, motivo: 'La fecha no se entiende (escríbela como 01/12/2026).' });
        return;
      }
    }
    const siniestro = texto(celda(fila, 'siniestro')) || null;
    const contrato = texto(celda(fila, 'contrato')) || null;
    const documento = texto(celda(fila, 'documento')) || null;
    if (!siniestro && !contrato && !documento) {
      malas.push({ fila: n, motivo: 'No trae siniestro, contrato ni documento: no hay con qué cruzarla.' });
      return;
    }
    salida.push({
      fecha,
      netoCop: neto,
      brutoCop: bruto,
      retencionCop: retencion,
      siniestro,
      contrato,
      documento,
      nombre: texto(celda(fila, 'nombre')) || null,
      periodo: texto(celda(fila, 'periodo')) || null,
    });
  });
  return { filas: salida, malas };
}

/** Propone el mapeo por el nombre de la columna (la persona lo corrige). */
export function mapeoSugerido(columnas: readonly string[]): MapeoDeColumnas {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const busca = (...claves: string[]) => columnas.find((c) => claves.some((k) => norm(c).includes(k)));
  const mapeo: MapeoDeColumnas = {};
  const poner = (campo: CampoDeLaRelacion, col: string | undefined) => {
    if (col && !Object.values(mapeo).includes(col)) mapeo[campo] = col;
  };
  poner('siniestro', busca('siniestro', 'reclamo'));
  poner('retencion', busca('retenc', 'rete'));
  poner('bruto', busca('bruto', 'valor siniestro', 'liquidado'));
  poner('neto', busca('neto', 'pagado', 'valor pago', 'valor a pagar', 'valor'));
  poner('fecha', busca('fecha'));
  poner('contrato', busca('contrato', 'poliza'));
  poner('documento', busca('cedula', 'documento', 'nit', 'identific'));
  poner('nombre', busca('nombre', 'arrendatario', 'inquilino'));
  poner('periodo', busca('periodo', 'mes'));
  return mapeo;
}
