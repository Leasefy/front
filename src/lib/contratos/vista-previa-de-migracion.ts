/**
 * vista-previa-de-migracion — qué quedaría guardado, ANTES de guardar nada.
 *
 * El 2026-09-03 se crearon 110 filas vacías y el aviso llegó después. Un
 * mapeo se puede leer en la pantalla y parecer razonable: lo que no miente es
 * el DATO ya interpretado. Por eso esto no vuelve a leer el archivo a su
 * manera — pasa por `armarFilaAMigrar`, exactamente la misma función que arma
 * lo que viaja al back. Si la vista previa muestra un canon vacío, el back va
 * a recibir un canon vacío; no hay un segundo camino donde eso se arregle.
 */

import {
  armarFilaAMigrar,
  leerFilaDelArchivo,
  type DatosDeOrigenDeContrato,
} from './armar-fila'
import { comoEntero, hayValor, valorDe } from './leer-celdas'
import {
  faltantesEsenciales,
  REQUISITOS_ESENCIALES,
  type CampoDeContrato,
  type ClaveEsencial,
  type FaltanteEsencial,
  type MapeoDeColumna,
} from './columnas-de-contrato'
import { formatCurrency } from '@/lib/format'
import type { FilaAMigrar } from '@/lib/api/contracts.service'

/** Un campo del contrato con lo que quedaría en las primeras filas. */
export interface RenglonDeVistaPrevia {
  campo: CampoDeContrato
  /** Un valor por fila de muestra. `null` = esa fila queda sin ese dato. */
  valores: Array<string | null>
}

/** Cuántas filas quedan sin un dato esencial, con el número exacto. */
export interface HuecoEsencial {
  clave: ClaveEsencial
  /** Entra en «38 de 110 filas quedan sin ___». */
  nombreCorto: string
  sinDato: number
  total: number
}

/** El orden en que se muestran los campos: primero lo que identifica y cobra. */
const ORDEN: CampoDeContrato[] = [
  'propiedadCodigoYDireccion',
  'direccionInmueble',
  'codigoInmueble',
  'ciudadInmueble',
  'consecutivoContrato',
  'inquilinoNombre',
  'inquilinoCorreo',
  'inquilinoDocumento',
  'inquilinoTelefono',
  'fechaInicio',
  'fechaFin',
  'canon',
  'canonTotal',
  'diaDePago',
  'deposito',
  'uso',
  'periodicidad',
  'comision',
  'propietarioNombre',
  'propietarioDocumento',
  'propietarioCorreo',
  'propietarioTelefono',
  'estratoInmueble',
  'escenario',
  'estadoContrato',
  'fechaTerminacion',
  'observaciones',
  'fechaCreacionOrigen',
  'creadoPor',
]

const USO_LEGIBLE: Record<'VIVIENDA' | 'COMERCIAL', string> = {
  VIVIENDA: 'Vivienda',
  COMERCIAL: 'Comercial',
}

const PERIODICIDAD_LEGIBLE: Record<
  NonNullable<FilaAMigrar['periodicidad']>,
  string
> = {
  MENSUAL: 'Mensual',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
}

/**
 * Cómo se ve un campo ya interpretado. `null` significa «esta fila no trae
 * ese dato» — y se muestra como tal, nunca como un 0 o un guion que se
 * pueda confundir con un valor.
 */
function valorLegible(
  campo: CampoDeContrato,
  f: FilaAMigrar,
  origen: DatosDeOrigenDeContrato,
): string | null {
  switch (campo) {
    /*
     * ── Lo que el archivo trae y el back todavía no recibe ────────────────
     *
     * Se muestra igual: la vista previa existe para que alguien vea el dato
     * ANTES de guardar, y esconder una columna que sí se leyó es la forma
     * más fácil de que nadie note que el archivo la traía.
     */
    case 'propiedadCodigoYDireccion':
      return origen.codigoDeOrigen ? `${origen.codigoDeOrigen} · ${f.direccion}` : f.direccion || null
    case 'consecutivoContrato':
      return origen.consecutivo ?? null
    case 'canonTotal':
      return f.monthlyRent === undefined ? null : formatCurrency(f.monthlyRent)
    case 'estratoInmueble':
      return origen.estrato === undefined ? null : String(origen.estrato)
    case 'escenario':
      return origen.escenario ?? null
    case 'estadoContrato':
      return origen.estado ?? null
    case 'fechaTerminacion':
      return origen.fechaTerminacion ?? null
    case 'observaciones':
      // Multilínea en el archivo real: en una tabla, una sola línea.
      return origen.observaciones?.replace(/\s+/g, ' ').trim() || null
    case 'fechaCreacionOrigen':
      return origen.fechaCreacion ?? null
    case 'creadoPor':
      return origen.creadoPor ?? null
    case 'direccionInmueble':
      return f.direccion || null
    // Sin el «#» de antes: el valor ya no es el consecutivo de Leasefy sino el
    // código con el que la inmobiliaria nombra su inmueble, y escribirlo
    // «#0007» lo hace pasar por otra cosa.
    case 'codigoInmueble':
      return f.codigoInmueble ?? null
    case 'ciudadInmueble':
      return f.ciudad ?? null
    case 'inquilinoNombre':
      return f.inquilino.nombre || null
    case 'inquilinoCorreo':
      return f.inquilino.correo || null
    case 'inquilinoTelefono':
      return f.inquilino.telefono ?? null
    case 'inquilinoDocumento':
      return f.inquilino.documento ?? null
    case 'fechaInicio':
      return f.startDate ?? null
    case 'fechaFin':
      return f.endDate ?? null
    case 'canon':
      return f.monthlyRent === undefined ? null : formatCurrency(f.monthlyRent)
    case 'deposito':
      return f.deposit === undefined ? null : formatCurrency(f.deposit)
    case 'diaDePago':
      return f.paymentDay === undefined ? null : `el ${f.paymentDay} de cada mes`
    case 'uso':
      return f.usoInmueble ? USO_LEGIBLE[f.usoInmueble] : null
    case 'periodicidad':
      return f.periodicidad ? PERIODICIDAD_LEGIBLE[f.periodicidad] : null
    case 'comision':
      return f.comisionPorcentaje === undefined
        ? null
        : `${f.comisionPorcentaje} %`
    case 'propietarioNombre':
      return f.propietario?.nombre ?? null
    case 'propietarioDocumento':
      return f.propietario?.documento ?? null
    case 'propietarioCorreo':
      return f.propietario?.correo ?? null
    case 'propietarioTelefono':
      return f.propietario?.telefono ?? null
  }
}

/**
 * Las primeras `cuantas` filas ya interpretadas, campo por campo.
 *
 * Sólo aparecen los campos que ALGUIEN mapeó: mostrar 19 renglones de los
 * cuales 12 dicen «sin dato» no ayuda a decidir si el mapeo está bien.
 */
export function vistaPreviaDeFilas(
  filas: Array<Record<string, unknown>>,
  mapeo: MapeoDeColumna[],
  cuantas = 3,
): RenglonDeVistaPrevia[] {
  const mapeados = new Set(
    mapeo.map((m) => m.campo).filter((c): c is CampoDeContrato => Boolean(c)),
  )
  if (mapeados.size === 0 || filas.length === 0) return []

  const muestra = filas.slice(0, cuantas).map((f) => leerFilaDelArchivo(f, mapeo))
  return ORDEN.filter((campo) => mapeados.has(campo)).map((campo) => ({
    campo,
    valores: muestra.map(({ fila, origen }) => valorLegible(campo, fila, origen)),
  }))
}

/** Si esta fila trae el requisito esencial, ya interpretada. */
function cumple(clave: ClaveEsencial, f: FilaAMigrar): boolean {
  switch (clave) {
    case 'inmueble':
      return f.direccion.trim() !== '' || f.codigoInmueble !== undefined
    case 'inquilino':
      return f.inquilino.nombre.trim() !== ''
    case 'contactoInquilino':
      return (
        f.inquilino.correo.trim() !== '' || (f.inquilino.documento ?? '') !== ''
      )
    case 'fechaInicio':
      return f.startDate !== undefined
    case 'fechaFin':
      return f.endDate !== undefined
    case 'canon':
      return f.monthlyRent !== undefined
    case 'diaDePago':
      return f.paymentDay !== undefined
  }
}

/**
 * Cuántas filas quedan sin cada dato esencial, sobre el archivo ENTERO.
 *
 * Una columna bien mapeada no garantiza un archivo bien llenado: la columna
 * «Día de pago» puede existir y estar vacía en 38 de 110 filas, o traer «15
 * de cada mes» —texto que `armarFilaAMigrar` descarta a propósito en vez de
 * inventar un número—. Eso se ve acá, con el número exacto, antes de crear
 * nada.
 *
 * `umbral` es la proporción a partir de la cual vale la pena avisar: por
 * debajo de eso, algunas filas incompletas son el pan de cada día y se
 * completan en la lista de trabajo.
 */
export function huecosEsenciales(
  filas: Array<Record<string, unknown>>,
  mapeo: MapeoDeColumna[],
  umbral = 0.2,
): HuecoEsencial[] {
  if (filas.length === 0) return []
  const mapeados = new Set(
    mapeo.map((m) => m.campo).filter((c): c is CampoDeContrato => Boolean(c)),
  )
  const armadas = filas.map((f) => armarFilaAMigrar(f, mapeo))

  return REQUISITOS_ESENCIALES
    // Lo que no está mapeado ya lo frena la compuerta: acá se avisa de lo que
    // SÍ se mapeó y aun así llega vacío. Repetirlo sería el mismo aviso dos
    // veces con palabras distintas.
    .filter((r) => r.campos.some((c) => mapeados.has(c)))
    .map((r) => ({
      clave: r.clave,
      nombreCorto: r.nombreCorto,
      sinDato: armadas.filter((f) => !cumple(r.clave, f)).length,
      total: armadas.length,
    }))
    .filter((h) => h.sinDato / h.total > umbral)
}

/**
 * La compuerta, mirando también los DATOS y no sólo el mapeo.
 *
 * ── El falso bloqueo que esto arregla ──────────────────────────────────────
 *
 * `faltantesEsenciales` mira qué campos quedaron mapeados a una columna. Con
 * el export real de contratos eso frenaba el archivo por «correo ni documento
 * del inquilino»: no hay una columna de cédula: el documento viene DENTRO de
 * «Inquilino» («[1] 71211270 - NOMBRE») y `armarFilaAMigrar` lo saca. 1.847 de
 * 1.851 filas traían el documento y la pantalla decía que ninguna.
 *
 * Así que un requisito deja de frenar cuando alguna fila de la muestra SÍ lo
 * entrega ya interpretado. Las filas que igual queden sin ese dato no se
 * esconden: `huecosEsenciales` las cuenta y las muestra con el número exacto.
 * La división es esa — la compuerta dice «este archivo no puede funcionar», el
 * aviso dice «a estas filas les falta algo».
 */
export function faltantesEsencialesConDatos(
  filas: Array<Record<string, unknown>>,
  mapeo: MapeoDeColumna[],
  muestra = 200,
): FaltanteEsencial[] {
  const faltan = faltantesEsenciales(mapeo)
  if (filas.length === 0) return faltan
  const leidas = filas.slice(0, muestra).map((f) => armarFilaAMigrar(f, mapeo))
  return faltan.filter((r) => !leidas.some((f) => cumple(r.clave, f)))
}

/* ── El resumen honesto del paso ──────────────────────────────────────────── */

/** Cuántas filas quedan con cada cosa identificada, y cuántas no. */
export interface RenglonDeResumen {
  /** «Inmueble», «Propietario»… */
  que: string;
  /** Cuántas filas traen ese dato ya legible. */
  con: number;
  /** Por qué las otras no. Vacío si no falta ninguna. */
  porque: string;
}

export interface ResumenDeLectura {
  total: number;
  renglones: RenglonDeResumen[];
}

/**
 * Lo que el archivo alcanza a identificar, ANTES de mandar nada.
 *
 * No promete asociación: eso lo decide el back contra el portafolio de la
 * agencia y lo devuelve fila por fila. Lo que sí se puede afirmar acá es
 * cuántas filas traen con qué buscar — y cuántas no traen nada, que es la
 * pregunta que alguien hace al final del paso («¿cuántos quedaron sin
 * inmueble y por qué?»).
 *
 * Se calcula sobre el archivo ENTERO, no sobre una muestra: el promedio de
 * las tres primeras filas no dice nada sobre la 1.400.
 */
export function resumenDeLectura(
  filas: Array<Record<string, unknown>>,
  mapeo: MapeoDeColumna[],
): ResumenDeLectura {
  const leidas = filas.map((f) => leerFilaDelArchivo(f, mapeo));
  const total = leidas.length;
  const cuenta = (predicado: (l: (typeof leidas)[number]) => boolean) =>
    leidas.filter(predicado).length;

  const conCodigo = cuenta(({ origen }) => Boolean(origen.codigoDeOrigen));
  const conDireccion = cuenta(({ fila }) => fila.direccion.trim() !== '');
  const conInmueble = cuenta(
    ({ fila, origen }) => Boolean(origen.codigoDeOrigen) || fila.direccion.trim() !== '',
  );
  const conPropietario = cuenta(({ fila }) => Boolean(fila.propietario?.documento));
  const conInquilino = cuenta(({ fila }) => (fila.inquilino.documento ?? '') !== '');
  const conCorreo = cuenta(({ fila }) => fila.inquilino.correo.trim() !== '');
  const conConsecutivo = cuenta(({ origen }) => Boolean(origen.consecutivo));

  return {
    total,
    renglones: [
      {
        que: 'Inmueble identificable',
        con: conInmueble,
        porque:
          conInmueble === total
            ? ''
            : `${total - conInmueble} filas no traen ni código ni dirección del inmueble.` +
              ` (${conCodigo} traen código de origen, ${conDireccion} traen dirección.)`,
      },
      {
        que: 'Propietario con documento',
        con: conPropietario,
        porque:
          conPropietario === total
            ? ''
            : `${total - conPropietario} filas traen el propietario sin cédula ni NIT: sin documento no hay ficha que resolver y el nombre solo crea homónimos.`,
      },
      {
        que: 'Inquilino con documento',
        con: conInquilino,
        porque:
          conInquilino === total
            ? ''
            : `${total - conInquilino} filas traen al inquilino sin documento.`,
      },
      {
        que: 'Inquilino con correo',
        con: conCorreo,
        porque:
          conCorreo === total
            ? ''
            : `${total - conCorreo} filas no traen correo: esos inquilinos no reciben la invitación al portal hasta que alguien lo complete.`,
      },
      {
        que: 'Consecutivo del sistema anterior',
        con: conConsecutivo,
        porque:
          conConsecutivo === total
            ? ''
            : `${total - conConsecutivo} filas no traen consecutivo: sin él no se les pueden colgar los documentos contables viejos.`,
      },
    ],
  };
}

/** Una columna mapeada cuyos valores no tienen la forma del campo. */
export interface AvisoDeForma {
  /** La columna del archivo, tal como se llama ahí. */
  columna: string
  /** Cuántas filas traen algo que parece plata y no un porcentaje. */
  cuantas: number
  total: number
  /** Hasta dos valores textuales, tal como vienen en el archivo. */
  ejemplos: string[]
}

/** «350.000» / «1,250.50»: un separador de miles delata pesos, no un %. */
function tieneSeparadorDeMiles(texto: string): boolean {
  return /\d[.,]\d{3}(\D|$)/.test(texto)
}

/**
 * La comisión es un PORCENTAJE, y la columna que la trae puede no serlo.
 *
 * Nico (2026-09-04) confirmó que en sus archivos «Cuota de administración» es
 * el porcentaje de la inmobiliaria. En el mercado colombiano, la misma
 * columna suele ser la cuota del edificio en pesos — y si llega así,
 * `comoPorcentaje` la descarta por estar fuera de [0,100]: TODAS esas filas
 * quedan sin comisión, en silencio, con la columna mapeada y verde en
 * pantalla. Eso es exactamente lo que este aviso hace visible, con el número.
 *
 * Avisa, no bloquea: quien sube el archivo sabe qué contrató.
 */
export function comisionQueNoParecePorcentaje(
  filas: Array<Record<string, unknown>>,
  mapeo: MapeoDeColumna[],
): AvisoDeForma | null {
  const columna = mapeo.find((m) => m.campo === 'comision')?.columna
  if (!columna || filas.length === 0) return null

  const textos = filas
    .map((f) => valorDe(f, mapeo, 'comision'))
    .filter((v) => hayValor(v))
    .map((v) => String(v).trim())
  if (textos.length === 0) return null

  const conCaraDePlata = textos.filter((t) => {
    if (tieneSeparadorDeMiles(t)) return true
    const n = comoEntero(t)
    return n !== undefined && n > 100
  })
  // El promedio cubre el caso sin separadores («350000», «12000»); un solo
  // valor con separador de miles alcanza para dudar.
  const numeros = textos
    .map((t) => comoEntero(t))
    .filter((n): n is number => n !== undefined)
  const promedio =
    numeros.length > 0 ? numeros.reduce((a, b) => a + b, 0) / numeros.length : 0
  if (conCaraDePlata.length === 0 && promedio <= 100) return null

  return {
    columna,
    cuantas: conCaraDePlata.length,
    total: textos.length,
    ejemplos: [...new Set(conCaraDePlata.length > 0 ? conCaraDePlata : textos)].slice(0, 2),
  }
}
