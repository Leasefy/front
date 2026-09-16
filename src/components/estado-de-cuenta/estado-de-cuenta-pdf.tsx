'use client';

/**
 * El PDF del estado de cuenta: el papel que la inmobiliaria le entrega —o le
 * manda— a su cliente.
 *
 * CEO (vía Nico, 2026-09-13): «algo de lo importante y la magia está en qué tan
 * BONITO se exponga esta información». Este archivo es ese documento.
 *
 * ── Qué NO se copia del formato de Nui ──────────────────────────────────────
 * 1. PORTADA. Nui arranca en la primera fila de la primera tabla y esconde el
 *    número que importa —lo que resta por pagar— en una cajita de 9 pt abajo a
 *    la derecha de cada contrato, sin total general en ninguna página. Acá la
 *    hoja 1 es el resumen: ese número en 30 pt, y debajo los contratos con su
 *    barra de amortización. Es lo primero que ve quien abre el archivo.
 * 2. HAIRLINES, no bandas azules llenas. El cobalto se gasta una vez por
 *    momento: el punto de quiebre y la regla del pie. Si todo grita, nada se oye.
 * 3. El período se lee UNA vez, bajo el concepto y en mono, en vez de repetir
 *    «. De 22-May-2024 hasta 21-Jun-2024» en los sesenta renglones.
 * 4. Las columnas de impuestos aparecen si existen (`columnasDeImpuestos`) y el
 *    pie del contrato dice cuáles se omitieron: cuatro columnas de `$0.00`
 *    empujan el concepto a dos renglones y el documento a una hoja más, pero
 *    omitir en silencio sí sería esconder un dato.
 *
 * ── Reglas duras ────────────────────────────────────────────────────────────
 * • SÓLO las fuentes que trae `@react-pdf/renderer`: Helvetica, Helvetica-Bold
 *   y Courier. Registrar una por URL ataría el documento a la red, y un PDF que
 *   a veces no sale no es un PDF. Texto en Helvetica, TODO número en Courier —
 *   es monoespaciada, así que las columnas de plata quedan alineadas por dígito.
 * • Los números salen de `filas.ts` y `resumen.ts`, los mismos que usa la
 *   pantalla. Si el PDF calculara los suyos, el papel y la pantalla dirían
 *   cosas distintas y el cliente tendría razón en no creerle a ninguno de los dos.
 */

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

import { formatCurrency } from '@/lib/format';
import type {
  ContratoDelEstadoDeCuenta,
  EstadoDeCuenta,
  EstadoDeFila,
  FilaDelEstadoDeCuenta,
  InmobiliariaDelEstadoDeCuenta,
  PuntoDeQuiebre,
  RolEnElContrato,
} from '@/lib/types/estado-de-cuenta';
import {
  columnasDeImpuestos,
  columnasOmitidas,
  comoSeLlamaElRol,
  conceptoLimpio,
  estaVencida,
  ETIQUETA_DE_COLUMNA,
  fechaLegible,
  intercalarCortes,
  periodoLegible,
  pintaDelEstado,
  type ColumnaDeImpuesto,
} from './filas';
import {
  amortizacionDe,
  proximaCuotaDe,
  resumirElCliente,
  type AmortizacionDelContrato,
} from './resumen';
import { texto } from './textos';
import { numeroDelContratoDelEstado } from './numero';
import { interesesDelContrato, interesesDelEstado } from './intereses';

// ══ Paleta ══════════════════════════════════════════════════════════════════
//
// Los tokens de Cadence en hexadecimal: `@react-pdf/renderer` no entiende
// variables CSS, así que acá se escriben a mano. Son los MISMOS valores que la
// pantalla, para que el PDF no se lea como otro producto.

const COLOR = {
  papel: '#FFFFFF',
  tinta: '#14130F',
  apagado: '#6E6A63',
  tenue: '#726E68',
  hairline: '#E5E2DC',
  gris: '#F4F2EF',
  cobalto: '#1A40FF',
  verde: '#307E57',
  verdeSuave: '#E8F4EA',
  rojo: '#C0392B',
  rojoSuave: '#FBE9E6',
  ambar: '#8A5A00',
  ambarSuave: '#FBF1DC',
} as const;

const SANS = 'Helvetica';
const SANS_FUERTE = 'Helvetica-Bold';
const MONO = 'Courier';

/**
 * El color de cada estado. Las PALABRAS las pone `pintaDelEstado`, que además
 * sabe que una cuota saldada se lee «Cancelada» del lado del inquilino y
 * «Pagada» del lado del propietario.
 */
const TONO_DEL_ESTADO: Record<EstadoDeFila, { color: string; fondo: string }> = {
  CANCELADA: { color: COLOR.verde, fondo: COLOR.verdeSuave },
  PENDIENTE: { color: COLOR.tinta, fondo: COLOR.gris },
  ANULADA: { color: COLOR.tenue, fondo: COLOR.gris },
  ANTERIOR: { color: COLOR.tenue, fondo: COLOR.gris },
};

// ══ Geometría ═══════════════════════════════════════════════════════════════

/** A4 horizontal en puntos. Horizontal porque la tabla tiene hasta 14 columnas. */
const ANCHO_A4_HORIZONTAL = 841.89;
const MARGEN = 28;
/** Lo que queda para el contenido. Las columnas suman exactamente esto. */
const ANCHO_UTIL = Math.floor(ANCHO_A4_HORIZONTAL - MARGEN * 2);

/** El ancho que le queda al número insignia de la portada dentro de su celda. */
const ANCHO_DEL_HEROE = 285;

export interface MedidasDeLaTabla {
  fuente: number;
  concepto: number;
  estado: number;
  fechaDePago: number;
  bruto: number;
  impuesto: number;
  neto: number;
  vence: number;
  documento: number;
}

/**
 * El ancho de cada columna, en puntos, para un contrato con `cuantosImpuestos`
 * columnas de impuestos.
 *
 * Se calcula y no se deja en flex por una razón: el encabezado de la tabla vive
 * en un bloque `fixed` (se repite en cada hoja) y las filas viven en el flujo.
 * Son dos subárboles distintos, y dos repartos de flex independientes no caen
 * en la misma columna. Con números explícitos, sí.
 *
 * Un contrato de propietario puede traer las siete columnas de impuestos; a
 * partir de ahí la fuente cede antes que el ancho, porque una columna de plata
 * que se parte en dos renglones deja de poder leerse hacia abajo.
 */
export function medidasDeLaTabla(cuantosImpuestos: number): MedidasDeLaTabla {
  // Un contrato de propietario con retenciones sobre la comisión llega a NUEVE
  // columnas de impuestos. A partir de cinco, todo se aprieta a la vez: si sólo
  // se encogieran las de impuestos, el concepto se quedaría con 60 puntos.
  const denso = cuantosImpuestos >= 5;
  const fuente =
    cuantosImpuestos <= 2 ? 7.5 : cuantosImpuestos <= 4 ? 7 : cuantosImpuestos <= 7 ? 6 : 5.5;
  const impuesto =
    cuantosImpuestos <= 2 ? 58 : cuantosImpuestos <= 4 ? 50 : cuantosImpuestos <= 7 ? 44 : 38;

  const estado = denso ? 46 : 52;
  // «27 ene 2024» en Courier mide 11 caracteres: con menos ancho la fecha se
  // parte en dos renglones y la tabla se llena de filas de doble alto.
  const fechaDePago = denso ? 54 : 60;
  const bruto = denso ? 52 : 58;
  const neto = denso ? 58 : 64;
  const vence = denso ? 56 : 62;

  const resto =
    ANCHO_UTIL -
    (estado + fechaDePago + bruto + neto + vence) -
    cuantosImpuestos * impuesto;

  // El concepto se lleva la mayor parte de lo que sobra: es la única columna
  // que de verdad dice qué se está cobrando.
  const concepto = Math.max(96, Math.round(resto * 0.62));
  const documento = Math.max(66, resto - concepto);

  return { fuente, concepto, estado, fechaDePago, bruto, impuesto, neto, vence, documento };
}

/**
 * El tamaño del número insignia: el más grande que quepa en un solo renglón.
 *
 * Courier gasta 0,6 em por carácter, así que el ancho se sabe sin medir. Que
 * «$ 1.234.567.890» se parta en dos renglones arruinaría justamente lo que la
 * portada existe para mostrar.
 */
export function tamanoDelHeroe(monto: string): number {
  for (const pt of [30, 27, 24]) {
    if (monto.length * pt * 0.6 <= ANCHO_DEL_HEROE) return pt;
  }
  return 22;
}

/**
 * El logo sólo se intenta si la URL es absoluta o un `data:`.
 *
 * `@react-pdf/renderer` resuelve las imágenes aparte y una que falla sólo deja
 * un `console.warn` —el renderizador salta el nodo sin datos—, así que un logo
 * caído NO tumba el documento. La guarda es para no pedirle siquiera que
 * intente con una ruta relativa, que en un PDF no significa nada.
 */
export function urlDeLogoUsable(url: string | null | undefined): string | null {
  if (!url) return null;
  const limpia = url.trim();
  return /^(https?:\/\/|data:image\/)/i.test(limpia) ? limpia : null;
}

/**
 * Lo que las fuentes internas NO saben dibujar, cambiado por lo que sí.
 *
 * Helvetica y Courier de `@react-pdf/renderer` sólo traen WinAnsi: una flecha
 * `→` —la que `periodoLegible` pone entre las dos fechas del período— sale en
 * el papel como un apóstrofo suelto («22 may 2024 ' 21 jun 2024»), que se lee
 * como un error de impresión en cada uno de los sesenta renglones. Se cambia
 * por la raya que el papel usa para los rangos desde siempre. Registrar una
 * fuente con flechas no es opción: ataría el documento a la red.
 *
 * Sólo se tocan los signos que no existen en WinAnsi; las tildes, la ñ y las
 * comillas españolas sí están y pasan tal cual.
 */
const FUERA_DE_LA_FUENTE: [RegExp, string][] = [
  [/\s*[\u2192\u21D2\u2794\u21A6]\s*/g, ' \u2013 '],
  [/[\u2190\u21D0\u2194\u21C4]/g, '\u2013'],
  [/[\u2022\u2219\u22C5]/g, '\u00B7'],
];

export function paraElPapel(entrada: string): string {
  return FUERA_DE_LA_FUENTE.reduce((texto, [busca, pone]) => texto.replace(busca, pone), entrada);
}

/** `texto()` pasado por el filtro. TODO rótulo del documento sale por acá. */
/**
 * «Contrato 1686 · Leasefy #1839» en un migrado, «Contrato #14» en un nativo:
 * el papel dice de quién es cada número, igual que la pantalla.
 */
function tituloDelContratoEnElPapel(
  contrato: Pick<ContratoDelEstadoDeCuenta, 'numero' | 'numeroDeLeasefy'>,
): string {
  const numero = numeroDelContratoDelEstado(contrato);
  const titulo = frase('estadoDeCuenta.contrato', { numero: numero.principal });
  return numero.numeroDeLeasefy != null
    ? `${titulo} · ${frase('estadoDeCuenta.numeroDeLeasefy', { numero: numero.numeroDeLeasefy })}`
    : titulo;
}

function frase(clave: string, params?: Record<string, string | number>): string {
  return paraElPapel(texto(clave, params));
}

/**
 * El concepto de la fila, sin decir dos veces lo mismo.
 *
 * El back ya nombra la fila partida «Saldo pendiente por Canon De
 * Arrendamiento…». Anteponerle otra vez el rótulo dejaba «Saldo pendiente ·
 * Saldo pendiente por Canon…» en el papel. El rótulo se pone sólo cuando el
 * concepto no lo trae, que es lo que pasa con los conceptos que no vienen de Nui.
 */
export function conceptoDeLaFila(fila: FilaDelEstadoDeCuenta): string {
  const limpio = paraElPapel(conceptoLimpio(fila));
  if (!fila.parcial) return limpio;
  const rotulo = texto('estadoDeCuenta.saldoDe');
  return limpio.toLowerCase().startsWith(rotulo.toLowerCase())
    ? limpio
    : `${rotulo} \u00B7 ${limpio}`;
}

/** Las líneas del emisor. Sin datos se DICE; un bloque vacío parece un error. */
export function lineasDelEmisor(inmobiliaria: InmobiliariaDelEstadoDeCuenta): string[] {
  const lineas = [
    inmobiliaria.nit ? `${frase('estadoDeCuenta.nit')} ${inmobiliaria.nit}` : null,
    inmobiliaria.matricula
      ? `${frase('estadoDeCuenta.matricula')} ${inmobiliaria.matricula}`
      : null,
    inmobiliaria.telefono
      ? `${frase('estadoDeCuenta.telefono')} ${inmobiliaria.telefono}`
      : null,
  ].filter((l): l is string => l !== null);
  return lineas.length > 0
    ? lineas.map(paraElPapel)
    : [frase('estadoDeCuenta.sinEmisor')];
}

// ══ Estilos ═════════════════════════════════════════════════════════════════

const estilos = StyleSheet.create({
  pagina: {
    paddingTop: MARGEN,
    paddingHorizontal: MARGEN,
    // Más abajo que a los lados: es la franja que le queda al pie, que va
    // pegado al borde del papel y fuera del flujo.
    paddingBottom: 48,
    backgroundColor: COLOR.papel,
    fontFamily: SANS,
    fontSize: 8,
    color: COLOR.tinta,
  },

  // ── Portada ───────────────────────────────────────────────────────────────
  membrete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo: { height: 44, width: 120, objectFit: 'contain' },
  emisor: { alignItems: 'flex-end', maxWidth: 300 },
  emisorNombre: { fontFamily: SANS_FUERTE, fontSize: 11, textAlign: 'right' },
  emisorLinea: { fontSize: 8, color: COLOR.apagado, marginTop: 2, textAlign: 'right' },

  regla: { borderBottomWidth: 0.7, borderBottomColor: COLOR.hairline, marginVertical: 14 },

  rotulo: { fontSize: 6.5, letterSpacing: 0.9, textTransform: 'uppercase', color: COLOR.tenue },
  titular: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cliente: { fontFamily: SANS_FUERTE, fontSize: 20, marginTop: 5 },
  clienteDatos: { fontFamily: MONO, fontSize: 8, color: COLOR.apagado, marginTop: 5 },
  ciudadYFecha: { fontFamily: MONO, fontSize: 8, color: COLOR.apagado },

  nota: {
    marginTop: 12,
    backgroundColor: COLOR.gris,
    borderLeftWidth: 2,
    borderLeftColor: COLOR.cobalto,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  notaTexto: { fontSize: 8, color: COLOR.apagado },

  heroe: {
    marginTop: 18,
    flexDirection: 'row',
    borderWidth: 0.7,
    borderColor: COLOR.hairline,
    borderRadius: 3,
    padding: 14,
  },
  heroeCelda: { paddingLeft: 14, borderLeftWidth: 0.7, borderLeftColor: COLOR.hairline },
  heroeNumero: { fontFamily: MONO, marginTop: 8 },
  heroePie: { fontSize: 7.5, color: COLOR.tenue, marginTop: 7 },
  cifraMedia: { fontFamily: MONO, fontSize: 13, marginTop: 8 },
  cifraChica: { fontFamily: MONO, fontSize: 9, color: COLOR.apagado, marginTop: 3 },

  chip: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 8,
  },

  // ── Los contratos en la portada ───────────────────────────────────────────
  filaDeCartera: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR.hairline,
    paddingVertical: 8,
  },
  numeroDeContrato: { fontFamily: MONO, fontSize: 9 },
  direccion: { fontSize: 7.5, color: COLOR.apagado, marginTop: 2 },

  barra: {
    flexDirection: 'row',
    height: 3,
    borderRadius: 2,
    backgroundColor: COLOR.gris,
    marginTop: 5,
  },
  barraTramo: { height: 3 },
  barraPie: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  barraTexto: { fontFamily: MONO, fontSize: 7, color: COLOR.apagado },

  vacio: { fontSize: 9, color: COLOR.apagado, marginTop: 4 },

  // ── Encabezado del contrato ───────────────────────────────────────────────
  banda: { backgroundColor: COLOR.papel },
  bandaTitulo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.7,
    borderBottomColor: COLOR.tinta,
    paddingBottom: 5,
  },
  bandaNumero: { fontFamily: MONO, fontSize: 11 },
  bandaDireccion: { fontSize: 8, color: COLOR.apagado, marginTop: 2 },
  bandaChip: { borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7, fontSize: 7.5 },

  // ── Tabla ─────────────────────────────────────────────────────────────────
  encabezado: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR.hairline,
    paddingTop: 7,
    paddingBottom: 5,
  },
  encabezadoCelda: {
    fontFamily: SANS_FUERTE,
    fontSize: 6.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: COLOR.tenue,
    paddingRight: 6,
  },
  seccion: {
    backgroundColor: COLOR.gris,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 8,
  },
  seccionTexto: {
    fontFamily: SANS_FUERTE,
    fontSize: 6.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: COLOR.apagado,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR.hairline,
    paddingVertical: 4,
  },
  celda: { paddingRight: 6 },
  periodo: { fontFamily: MONO, color: COLOR.tenue, marginTop: 1.5 },
  numero: { fontFamily: MONO, textAlign: 'right' },
  pildora: { alignSelf: 'flex-start', borderRadius: 7, paddingVertical: 1.5, paddingHorizontal: 5 },

  quiebre: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 2,
    borderLeftColor: COLOR.cobalto,
    backgroundColor: COLOR.gris,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginVertical: 4,
  },
  quiebreFecha: { fontFamily: MONO, fontSize: 7.5, color: COLOR.cobalto },
  quiebrePartes: { fontSize: 7.5, color: COLOR.apagado, marginLeft: 10 },

  omitidas: { fontSize: 7, color: COLOR.tenue, marginTop: 8 },

  totales: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    borderTopWidth: 0.7,
    borderTopColor: COLOR.tinta,
    marginTop: 10,
    paddingTop: 7,
  },
  totalesRotulo: { fontSize: 7, color: COLOR.tenue, marginRight: 'auto' },

  // ── Intereses de mora: aparte del capital ─────────────────────────────────
  interesFila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR.hairline,
    paddingVertical: 4,
  },
  interesConcepto: { flexGrow: 1, flexShrink: 1, fontSize: 7.5, paddingRight: 8 },
  interesNota: { fontSize: 6.5, color: COLOR.tenue, marginTop: 1.5 },
  interesDias: { width: 70, fontFamily: MONO, fontSize: 7.5, color: COLOR.apagado, textAlign: 'right' },
  interesCifra: { width: 90, fontFamily: MONO, fontSize: 8, textAlign: 'right' },
  totalCelda: { marginLeft: 28, alignItems: 'flex-end' },
  totalCifra: { fontFamily: MONO, fontSize: 12, marginTop: 3 },
  totalCifraApagada: { fontFamily: MONO, fontSize: 10, color: COLOR.apagado, marginTop: 3 },

  // ── Pie ───────────────────────────────────────────────────────────────────
  // Absoluto y `fixed`: se repite en TODAS las hojas, incluidas las que el
  // motor parte solo. `bottom/left/right` se miden desde el borde del papel
  // (comprobado renderizando), por eso llevan el margen escrito.
  pie: {
    position: 'absolute',
    bottom: 16,
    left: MARGEN,
    right: MARGEN,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: COLOR.hairline,
    paddingTop: 5,
  },
  pieTexto: { fontSize: 6.5, color: COLOR.tenue },
  pieNumero: { fontFamily: MONO, fontSize: 6.5, color: COLOR.tenue },
});

// ══ El documento ════════════════════════════════════════════════════════════

export interface EstadoDeCuentaPDFProps {
  doc: EstadoDeCuenta;
  /** `YYYY-MM-DD` local: contra esto se decide qué cuota ya venció. */
  hoy: string;
  /** Lo que dice que el documento sale filtrado. Va bajo el título. */
  nota?: string;
}

export function EstadoDeCuentaPDF({ doc, hoy, nota }: EstadoDeCuentaPDFProps): JSX.Element {
  return (
    <Document
      title={`${frase('estadoDeCuenta.titulo')} · ${doc.cliente.nombre}`}
      author={doc.inmobiliaria.razonSocial}
      subject={frase('estadoDeCuenta.de') + ' ' + doc.cliente.nombre}
      creator="Leasefy"
      producer="@react-pdf/renderer"
    >
      <Portada doc={doc} hoy={hoy} nota={nota} />
      {/* Un contrato por hoja: no hace falta `break` porque cada `<Page>` ya
          empieza en papel nuevo, y así el encabezado `fixed` del contrato sólo
          se repite dentro de SU contrato. */}
      {doc.contratos.map((contrato) => (
        <PaginaDelContrato key={contrato.numero} doc={doc} contrato={contrato} hoy={hoy} />
      ))}
    </Document>
  );
}

// ══ Portada ═════════════════════════════════════════════════════════════════

function Portada({ doc, hoy, nota }: EstadoDeCuentaPDFProps) {
  const resumen = resumirElCliente(doc, hoy);
  const interesesDelDoc = interesesDelEstado(doc);
  const heroe = formatCurrency(resumen.restaPorPagar);
  const logo = urlDeLogoUsable(doc.inmobiliaria.logoUrl);
  const ciudadYFecha = doc.inmobiliaria.ciudad
    ? frase('estadoDeCuenta.ciudadYFecha', {
        ciudad: doc.inmobiliaria.ciudad,
        fecha: fechaLegible(doc.fecha),
      })
    : fechaLegible(doc.fecha);
  const cuantos =
    doc.contratos.length === 1 ? '1 contrato' : `${doc.contratos.length} contratos`;

  return (
    <Page size="A4" orientation="landscape" style={estilos.pagina} data-testid="portada">
      <View style={estilos.membrete}>
        <View>
          {/* El `<Image>` de @react-pdf no es un `<img>` del DOM y no acepta
              `alt`: la regla de accesibilidad de JSX no aplica en el papel. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {logo ? <Image src={logo} style={estilos.logo} /> : null}
        </View>
        <View style={estilos.emisor}>
          <Text style={estilos.emisorNombre}>
            {paraElPapel(doc.inmobiliaria.razonSocial)}
          </Text>
          {lineasDelEmisor(doc.inmobiliaria).map((linea) => (
            <Text key={linea} style={estilos.emisorLinea}>
              {linea}
            </Text>
          ))}
        </View>
      </View>

      <View style={estilos.regla} />

      <View style={estilos.titular}>
        <View>
          <Text style={estilos.rotulo}>{frase('estadoDeCuenta.de')}</Text>
          <Text style={estilos.cliente}>{paraElPapel(doc.cliente.nombre)}</Text>
          <Text style={estilos.clienteDatos}>
            {[
              doc.cliente.documento ? `NIT/CC ${doc.cliente.documento}` : null,
              comoSeLlamaElRol(doc.cliente.tipo),
              cuantos,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </Text>
        </View>
        <Text style={estilos.ciudadYFecha}>{ciudadYFecha}</Text>
      </View>

      {nota ? (
        <View style={estilos.nota}>
          <Text style={estilos.notaTexto}>{paraElPapel(nota)}</Text>
        </View>
      ) : null}

      {/* El héroe: el número que el CEO dijo de memoria. Todo lo demás baja la voz. */}
      <View style={estilos.heroe}>
        <View style={{ width: 299, paddingRight: 14 }}>
          <Text style={estilos.rotulo}>{frase('estadoDeCuenta.restaPorPagar')}</Text>
          <Text
            data-testid="resta-por-pagar"
            style={[estilos.heroeNumero, { fontSize: tamanoDelHeroe(heroe) }]}
          >
            {heroe}
          </Text>
          <Text style={estilos.heroePie}>{frase('estadoDeCuenta.totalGeneral')}</Text>
          {/* El héroe es CAPITAL. El interés de mora va aparte, con su total. */}
          {interesesDelDoc && interesesDelDoc.pendiente > 0 ? (
            <Text style={[estilos.heroePie, { color: COLOR.rojo }]}>
              {`${frase('estadoDeCuenta.masIntereses', {
                monto: formatCurrency(interesesDelDoc.pendiente),
              })}  ·  ${frase('estadoDeCuenta.conIntereses')} ${formatCurrency(
                interesesDelDoc.restaPorPagarConIntereses,
              )}`}
            </Text>
          ) : null}
        </View>

        <View style={[estilos.heroeCelda, { width: 140 }]}>
          <Text style={estilos.rotulo}>{frase('estadoDeCuenta.cancelado')}</Text>
          <Text style={estilos.cifraMedia}>{formatCurrency(resumen.cancelado)}</Text>
        </View>

        <View style={[estilos.heroeCelda, { width: 160 }]}>
          <Text style={estilos.rotulo}>{frase('estadoDeCuenta.proximaCuota')}</Text>
          {resumen.proxima ? (
            <>
              <Text style={estilos.cifraMedia}>{fechaLegible(resumen.proxima.fecha)}</Text>
              <Text style={estilos.cifraChica}>{formatCurrency(resumen.proxima.valor)}</Text>
            </>
          ) : (
            /* Sin cuota futura no se inventa una: o el contrato terminó, o todo
               lo que queda ya venció, y eso lo dice la celda de al lado. */
            <Text style={estilos.heroePie}>{frase('estadoDeCuenta.sinProxima')}</Text>
          )}
        </View>

        <View style={[estilos.heroeCelda, { width: 156 }]}>
          <Text style={estilos.rotulo}>{frase('estadoDeCuenta.estado')}</Text>
          <Text
            data-testid="estado-del-cliente"
            style={[
              estilos.chip,
              resumen.enMora
                ? { color: COLOR.rojo, backgroundColor: COLOR.rojoSuave }
                : resumen.enPlazo
                  ? { color: COLOR.ambar, backgroundColor: COLOR.ambarSuave }
                  : { color: COLOR.verde, backgroundColor: COLOR.verdeSuave },
            ]}
          >
            {resumen.enMora
              ? frase('estadoDeCuenta.enMoraDias', { dias: resumen.diasDeMora })
              : resumen.enPlazo
                ? frase('estadoDeCuenta.vencidoEnPlazo')
                : frase('estadoDeCuenta.alDia')}
          </Text>
          {resumen.enPlazo ? (
            <Text style={estilos.heroePie}>
              {frase('estadoDeCuenta.vencidoEnPlazoDetalle', { n: resumen.cuotasEnPlazo })}
            </Text>
          ) : null}
          {resumen.enMora ? (
            <Text style={estilos.heroePie}>
              {/* «1 cuotas vencidas» en la portada del documento insignia, no. */}
              {resumen.cuotasVencidas === 1
                ? frase('estadoDeCuenta.unaCuotaVencida')
                : frase('estadoDeCuenta.cuotasVencidas', { n: resumen.cuotasVencidas })}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <Text style={estilos.rotulo}>{cuantos}</Text>
        {doc.contratos.length === 0 ? (
          <>
            <Text style={estilos.vacio}>{frase('estadoDeCuenta.sinContratos')}</Text>
            <Text style={estilos.heroePie}>
              {frase('estadoDeCuenta.sinContratosDetalle')}
            </Text>
          </>
        ) : (
          doc.contratos.map((contrato) => (
            <ContratoEnLaPortada key={contrato.numero} contrato={contrato} hoy={hoy} />
          ))
        )}
      </View>

      <PieDePagina doc={doc} />
    </Page>
  );
}

function ContratoEnLaPortada({
  contrato,
  hoy,
}: {
  contrato: ContratoDelEstadoDeCuenta;
  hoy: string;
}) {
  const amortizacion = amortizacionDe(contrato);
  const proxima = proximaCuotaDe(contrato, hoy);

  return (
    <View style={estilos.filaDeCartera} wrap={false}>
      <View style={{ width: 250, paddingRight: 12 }}>
        <Text style={estilos.numeroDeContrato}>
          {tituloDelContratoEnElPapel(contrato)}
        </Text>
        <Text style={estilos.direccion}>
          {texto(
            contrato.rol === 'PROPIETARIO'
              ? 'estadoDeCuenta.comoPropietario'
              : 'estadoDeCuenta.comoInquilino',
            { direccion: contrato.inmueble.direccion },
          )}
        </Text>
      </View>

      <View style={{ flexGrow: 1, paddingRight: 18 }}>
        <BarraDeAmortizacion amortizacion={amortizacion} numero={contrato.numero} />
      </View>

      <View style={{ width: 150, alignItems: 'flex-end' }}>
        <Text style={estilos.rotulo}>{frase('estadoDeCuenta.restaPorPagar')}</Text>
        <Text style={[estilos.numeroDeContrato, { fontSize: 11, marginTop: 3 }]}>
          {formatCurrency(contrato.totales.restaPorPagar)}
        </Text>
        {proxima ? (
          <Text style={estilos.barraTexto}>
            {`${frase('estadoDeCuenta.proximaCuota')} ${fechaLegible(proxima.fecha)}`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * La barra de amortización: «14 de 24 cuotas».
 *
 * Dos tramos y no uno. Verde: lo cancelado en NUESTRO sistema. Gris: lo que
 * vino del sistema anterior —ocurrió, pero no lo registramos nosotros—.
 * Pintarlos del mismo color diría que respondemos por un recaudo que no
 * tenemos; sacar el gris del total diría que el contrato tiene menos cuotas de
 * las que tiene.
 */
function BarraDeAmortizacion({
  amortizacion,
  numero,
}: {
  amortizacion: AmortizacionDelContrato;
  numero: string;
}) {
  if (amortizacion.total === 0) return null;

  return (
    <View data-testid={`amortizacion-${numero}`}>
      <View style={estilos.barra}>
        <View
          style={[
            estilos.barraTramo,
            { width: `${amortizacion.porcentaje}%`, backgroundColor: COLOR.verde },
          ]}
        />
        {amortizacion.porcentajeAnterior > 0 ? (
          <View
            style={[
              estilos.barraTramo,
              {
                width: `${amortizacion.porcentajeAnterior}%`,
                backgroundColor: COLOR.apagado,
              },
            ]}
          />
        ) : null}
      </View>
      <View style={estilos.barraPie}>
        <Text style={estilos.barraTexto}>
          {frase('estadoDeCuenta.cuotasDe', {
            pagadas: amortizacion.pagadas,
            total: amortizacion.total,
          })}
          {amortizacion.anteriores > 0
            ? ` · ${frase('estadoDeCuenta.delSistemaAnterior', {
                n: amortizacion.anteriores,
              })}`
            : ''}
        </Text>
        <Text style={estilos.barraTexto}>
          {`${formatCurrency(amortizacion.pagadoCop)} / ${formatCurrency(
            amortizacion.pactadoCop,
          )}`}
        </Text>
      </View>
    </View>
  );
}

// ══ La hoja de un contrato ══════════════════════════════════════════════════

function PaginaDelContrato({
  doc,
  contrato,
  hoy,
}: {
  doc: EstadoDeCuenta;
  contrato: ContratoDelEstadoDeCuenta;
  hoy: string;
}) {
  const todas = [...contrato.secciones.arriendos, ...contrato.secciones.otrosConceptos];
  const intereses = interesesDelContrato(contrato);
  const conIntereses = Boolean(intereses && intereses.filas.length > 0);
  const columnas = columnasDeImpuestos(todas);
  const omitidas = columnasOmitidas(todas, contrato.rol === 'PROPIETARIO');
  const medidas = medidasDeLaTabla(columnas.length);

  return (
    <Page
      size="A4"
      orientation="landscape"
      style={estilos.pagina}
      data-testid={`contrato-${contrato.numero}`}
    >
      {/* `fixed`: el motor puede partir un contrato de 60 cuotas en tres hojas,
          y una tabla sin encabezado en la hoja 2 no se puede leer. */}
      <View style={estilos.banda} fixed>
        <View style={estilos.bandaTitulo}>
          <View>
            <Text style={estilos.bandaNumero}>
              {tituloDelContratoEnElPapel(contrato)}
            </Text>
            <Text style={estilos.bandaDireccion}>
              {texto(
                contrato.rol === 'PROPIETARIO'
                  ? 'estadoDeCuenta.comoPropietario'
                  : 'estadoDeCuenta.comoInquilino',
                { direccion: contrato.inmueble.direccion },
              )}
            </Text>
          </View>
          <Text
            style={[
              estilos.bandaChip,
              contrato.vigente
                ? { color: COLOR.verde, backgroundColor: COLOR.verdeSuave }
                : { color: COLOR.tenue, backgroundColor: COLOR.gris },
            ]}
          >
            {texto(
              contrato.vigente ? 'estadoDeCuenta.vigente' : 'estadoDeCuenta.terminado',
            )}
          </Text>
        </View>
        <EncabezadoDeColumnas columnas={columnas} medidas={medidas} />
      </View>

      <SeccionDeLaTabla
        titulo={frase('estadoDeCuenta.arriendos')}
        filas={contrato.secciones.arriendos}
        cortes={contrato.cortes}
        columnas={columnas}
        medidas={medidas}
        rol={contrato.rol}
        hoy={hoy}
        vacio={frase('estadoDeCuenta.sinArriendos')}
      />

      <SeccionDeLaTabla
        titulo={frase('estadoDeCuenta.otrosConceptos')}
        filas={contrato.secciones.otrosConceptos}
        /* Los puntos de quiebre se intercalan UNA vez, entre los arriendos:
           son cuotas mensuales y marcan la línea del tiempo del contrato. */
        cortes={[]}
        columnas={columnas}
        medidas={medidas}
        rol={contrato.rol}
        hoy={hoy}
        vacio={frase('estadoDeCuenta.sinOtrosConceptos')}
      />

      {omitidas.length > 0 ? (
        <Text style={estilos.omitidas}>
          {frase('estadoDeCuenta.columnasOmitidas', {
            columnas: omitidas.map((c) => ETIQUETA_DE_COLUMNA[c]).join(', '),
          })}
        </Text>
      ) : null}

      {/* Los intereses de mora, en su propia sección: el mismo número que la
          pantalla y la prefactura, aparte del capital. */}
      {conIntereses && intereses ? (
        <View>
          <View style={estilos.seccion} minPresenceAhead={40}>
            <Text style={estilos.seccionTexto}>{frase('estadoDeCuenta.intereses')}</Text>
          </View>
          {intereses.filas.map((f) => (
            <View key={f.cuotaId} style={estilos.interesFila} wrap={false}>
              <View style={estilos.interesConcepto}>
                <Text>{paraElPapel(f.concepto)}</Text>
                {f.pagadaEnMora ? (
                  <Text style={estilos.interesNota}>
                    {frase('estadoDeCuenta.pagadaEnMora')}
                  </Text>
                ) : null}
              </View>
              <Text style={estilos.interesDias}>
                {f.diasDeMora === 1
                  ? frase('estadoDeCuenta.unDia')
                  : frase('estadoDeCuenta.nDias', { n: f.diasDeMora })}
              </Text>
              <Text style={estilos.interesCifra}>{formatCurrency(f.pendiente)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={estilos.totales} wrap={false}>
        <Text style={estilos.totalesRotulo}>
          {frase('estadoDeCuenta.totalesDelContrato', { numero: contrato.numero })}
        </Text>
        <View style={estilos.totalCelda}>
          <Text style={estilos.rotulo}>{frase('estadoDeCuenta.cancelado')}</Text>
          <Text style={estilos.totalCifraApagada}>
            {formatCurrency(contrato.totales.cancelado)}
          </Text>
        </View>
        <View style={estilos.totalCelda}>
          <Text style={estilos.rotulo}>{frase('estadoDeCuenta.restaPorPagar')}</Text>
          <Text
            data-testid={`total-contrato-${contrato.numero}`}
            style={conIntereses ? estilos.totalCifraApagada : estilos.totalCifra}
          >
            {formatCurrency(contrato.totales.restaPorPagar)}
          </Text>
        </View>
        {conIntereses && intereses ? (
          <>
            <View style={estilos.totalCelda}>
              <Text style={estilos.rotulo}>{frase('estadoDeCuenta.interesesDeMora')}</Text>
              <Text style={estilos.totalCifraApagada}>
                {formatCurrency(intereses.pendiente)}
              </Text>
            </View>
            <View style={estilos.totalCelda}>
              <Text style={estilos.rotulo}>{frase('estadoDeCuenta.conIntereses')}</Text>
              <Text
                data-testid={`total-con-intereses-${contrato.numero}`}
                style={estilos.totalCifra}
              >
                {formatCurrency(intereses.restaPorPagarConIntereses)}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      <PieDePagina doc={doc} />
    </Page>
  );
}

function EncabezadoDeColumnas({
  columnas,
  medidas,
}: {
  columnas: ColumnaDeImpuesto[];
  medidas: MedidasDeLaTabla;
}) {
  return (
    <View style={estilos.encabezado}>
      <Text data-testid="col-concepto" style={[estilos.encabezadoCelda, { width: medidas.concepto }]}>
        {frase('estadoDeCuenta.colConcepto')}
      </Text>
      <Text data-testid="col-estado" style={[estilos.encabezadoCelda, { width: medidas.estado }]}>
        {frase('estadoDeCuenta.colEstado')}
      </Text>
      <Text data-testid="col-pagado" style={[estilos.encabezadoCelda, { width: medidas.fechaDePago }]}>
        {frase('estadoDeCuenta.colPagado')}
      </Text>
      <Text
        data-testid="col-bruto"
        style={[estilos.encabezadoCelda, { width: medidas.bruto, textAlign: 'right' }]}
      >
        {frase('estadoDeCuenta.colBruto')}
      </Text>
      {columnas.map((c) => (
        <Text
          key={c}
          data-testid={`col-${c}`}
          style={[estilos.encabezadoCelda, { width: medidas.impuesto, textAlign: 'right' }]}
        >
          {ETIQUETA_DE_COLUMNA[c]}
        </Text>
      ))}
      <Text
        data-testid="col-neto"
        style={[estilos.encabezadoCelda, { width: medidas.neto, textAlign: 'right' }]}
      >
        {frase('estadoDeCuenta.colNeto')}
      </Text>
      <Text data-testid="col-vence" style={[estilos.encabezadoCelda, { width: medidas.vence }]}>
        {frase('estadoDeCuenta.colVence')}
      </Text>
      <Text
        data-testid="col-documento"
        style={[estilos.encabezadoCelda, { width: medidas.documento, paddingRight: 0 }]}
      >
        {frase('estadoDeCuenta.colDocumento')}
      </Text>
    </View>
  );
}

function SeccionDeLaTabla({
  titulo,
  filas,
  cortes,
  columnas,
  medidas,
  rol,
  hoy,
  vacio,
}: {
  titulo: string;
  filas: FilaDelEstadoDeCuenta[];
  cortes: readonly PuntoDeQuiebre[];
  columnas: ColumnaDeImpuesto[];
  medidas: MedidasDeLaTabla;
  rol: RolEnElContrato;
  hoy: string;
  vacio: string;
}) {
  const renglones = intercalarCortes(filas, cortes);

  return (
    <View>
      <View style={estilos.seccion} minPresenceAhead={40}>
        <Text style={estilos.seccionTexto}>{titulo}</Text>
      </View>
      {filas.length === 0 ? (
        <Text style={[estilos.vacio, { fontSize: 8, marginTop: 6 }]}>{vacio}</Text>
      ) : (
        renglones.map((renglon) =>
          renglon.tipo === 'corte' ? (
            <BandaDeQuiebre key={renglon.clave} corte={renglon.corte} />
          ) : (
            <FilaDeLaTabla
              key={renglon.clave}
              fila={renglon.fila}
              columnas={columnas}
              medidas={medidas}
              rol={rol}
              hoy={hoy}
            />
          ),
        )
      )}
    </View>
  );
}

/**
 * El punto de quiebre: la única línea con color adentro de la tabla.
 *
 * Es el único lugar del documento que cuenta una SECUENCIA («hasta acá le pagué
 * a X, desde acá a Y»), y por eso es el único que lleva marcador. CEO: «Con eso
 * le digo a la DIAN cuánto le he pagado a cada propietario desde 2022.»
 */
function BandaDeQuiebre({ corte }: { corte: PuntoDeQuiebre }) {
  return (
    <View style={estilos.quiebre} wrap={false} data-testid={`quiebre-${corte.fecha}`}>
      <Text style={estilos.quiebreFecha}>
        {frase('estadoDeCuenta.quiebre', {
          motivo: corte.motivo,
          fecha: fechaLegible(corte.fecha),
        })}
      </Text>
      <Text style={estilos.quiebrePartes}>
        {frase('estadoDeCuenta.quiebreDeA', {
          anterior: corte.parteAnterior,
          nueva: corte.parteNueva,
        })}
      </Text>
    </View>
  );
}

function FilaDeLaTabla({
  fila,
  columnas,
  medidas,
  rol,
  hoy,
}: {
  fila: FilaDelEstadoDeCuenta;
  columnas: ColumnaDeImpuesto[];
  medidas: MedidasDeLaTabla;
  rol: RolEnElContrato;
  hoy: string;
}) {
  const tono = TONO_DEL_ESTADO[fila.estado];
  // `ANULADA` dejó de existir y `ANTERIOR` no está en nuestra cartera: ninguna
  // de las dos suma, así que ninguna de las dos se lee con la tinta de las que sí.
  const apagada = fila.estado === 'ANULADA' || fila.estado === 'ANTERIOR';
  const cuerpo = { fontSize: medidas.fuente, color: apagada ? COLOR.tenue : COLOR.tinta };
  const periodo = periodoLegible(fila);
  const vencida = estaVencida(fila, hoy);

  return (
    <View style={estilos.fila} wrap={false}>
      <View style={[estilos.celda, { width: medidas.concepto }]}>
        <Text style={cuerpo}>{conceptoDeLaFila(fila)}</Text>
        {periodo ? (
          <Text style={[estilos.periodo, { fontSize: medidas.fuente - 1 }]}>
            {paraElPapel(periodo)}
          </Text>
        ) : null}
      </View>

      <View style={[estilos.celda, { width: medidas.estado }]}>
        <Text
          style={[
            estilos.pildora,
            { fontSize: medidas.fuente - 1, color: tono.color, backgroundColor: tono.fondo },
            // Una cuota anulada dejó de existir: se lee tachada, como en la
            // pantalla, no sólo más clarita.
            fila.estado === 'ANULADA' ? { textDecoration: 'line-through' } : {},
          ]}
        >
          {paraElPapel(pintaDelEstado(fila.estado, rol).texto)}
        </Text>
      </View>

      <Text style={[estilos.celda, estilos.numero, cuerpo, { width: medidas.fechaDePago, textAlign: 'left' }]}>
        {fila.fechaDePago ? fechaLegible(fila.fechaDePago) : '—'}
      </Text>

      <Text style={[estilos.celda, estilos.numero, cuerpo, { width: medidas.bruto }]}>
        {formatCurrency(fila.valorBruto)}
      </Text>

      {columnas.map((c) => (
        <Text
          key={c}
          style={[
            estilos.celda,
            estilos.numero,
            { width: medidas.impuesto, fontSize: medidas.fuente, color: COLOR.tenue },
          ]}
        >
          {formatCurrency(fila[c] ?? 0)}
        </Text>
      ))}

      <Text
        style={[
          estilos.celda,
          estilos.numero,
          cuerpo,
          { width: medidas.neto, fontFamily: MONO },
        ]}
      >
        {formatCurrency(fila.valorNeto)}
      </Text>

      <Text style={[estilos.celda, estilos.numero, cuerpo, { width: medidas.vence, textAlign: 'left' }]}>
        {fechaLegible(fila.fechaVencimiento)}
        {/* Que una cuota pendiente ya esté vencida se dice con la PALABRA, no
            cambiándole el tono al renglón: dos filas «Pendiente» que sólo se
            distinguen por el color no se distinguen. */}
        {vencida ? (
          <Text style={{ fontFamily: SANS, color: COLOR.rojo }}>
            {` ${frase('estadoDeCuenta.vencida')}`}
          </Text>
        ) : null}
      </Text>

      <View style={{ width: medidas.documento }}>
        {fila.documentoDePago ? (
          <>
            <Text style={[estilos.numero, cuerpo, { textAlign: 'left', fontSize: medidas.fuente - 1 }]}>
              {paraElPapel(`${fila.documentoDePago.numero} · ${fila.documentoDePago.tipo}`)}
            </Text>
            <Text style={{ fontSize: medidas.fuente - 1, color: COLOR.tenue, marginTop: 1 }}>
              {paraElPapel(fila.documentoDePago.descripcion)}
            </Text>
          </>
        ) : (
          <Text style={{ fontSize: medidas.fuente - 1, color: COLOR.tenue }}>
            {frase('estadoDeCuenta.sinPago')}
          </Text>
        )}
      </View>
    </View>
  );
}

/**
 * El pie de TODAS las hojas.
 *
 * La numeración es la REAL: `render` recibe la página y el total después de
 * paginar, así que «Página 3 de 12» no se puede desfasar por más que el motor
 * parta un contrato largo en hojas que nadie contó.
 */
function PieDePagina({ doc }: { doc: EstadoDeCuenta }) {
  return (
    <View style={estilos.pie} fixed>
      <Text style={estilos.pieTexto}>
        {paraElPapel(`${doc.cliente.nombre}  ·  ${doc.inmobiliaria.razonSocial}`)}
      </Text>
      <Text style={estilos.pieTexto}>
        {frase('estadoDeCuenta.pie', { fecha: fechaLegible(doc.fecha) })}
      </Text>
      <Text
        style={estilos.pieNumero}
        render={({ pageNumber, totalPages }) =>
          frase('estadoDeCuenta.pagina', { n: pageNumber, total: totalPages })
        }
      />
    </View>
  );
}
