/**
 * faltantesInmuebles — Spanish labels for the `faltantes` vocabulary the
 * durable import backend reports per row (wu-4-report.md §6).
 *
 * "An UNKNOWN string must render as a generic 'falta un dato', never be
 * dropped" — the exact rule `resolveListingType`/`resolveConversationKind`
 * apply elsewhere in this task for an unrecognised enum member (C19), here
 * applied to a string the row-review list must still show *something* for.
 */

export type FaltanteInmueble =
  | 'titulo'
  | 'direccion'
  | 'ciudad'
  | 'barrio'
  | 'tipo'
  | 'area'
  | 'canon'
  | 'precio_venta'
  | 'precio_inconsistente'
  | 'tipo_de_negocio'
  | 'departamento'
  | 'fecha_consignacion'
  | 'posible_duplicado'
  | 'reparto'
  | 'codigo_repetido'
  /** EN-38 / NI-07 (QA-MIGRACION-95): una cifra trae centavos y la llave está apagada. */
  | 'plata_con_centavos';

const ETIQUETAS: Record<FaltanteInmueble, string> = {
  titulo: 'título',
  direccion: 'dirección',
  ciudad: 'ciudad',
  barrio: 'barrio',
  tipo: 'tipo de inmueble',
  area: 'área',
  canon: 'canon mensual',
  precio_venta: 'precio de venta',
  precio_inconsistente: 'canon y precio de venta juntos (elige uno)',
  tipo_de_negocio: 'tipo de operación (arriendo/venta)',
  departamento: 'departamento',
  fecha_consignacion: 'fecha de consignación',
  posible_duplicado: 'posible duplicado — revisar antes de continuar',
  codigo_repetido: 'código repetido en el archivo',
  plata_con_centavos: 'una cifra con centavos (tu plataforma todavía no guarda centavos: escríbela al peso; no se redondea por ti)',
  reparto: 'reparto entre los dueños (los porcentajes o la plata no cuadran; corrige el archivo o quita esa columna del mapeo para que queden en partes iguales)',
};

const GENERICA = 'falta un dato';

/** Never throws — an unrecognised string degrades to a generic label
 * instead of being dropped from the list (wu-4-report.md §6). */
export function etiquetaDeFaltante(faltante: string): string {
  return ETIQUETAS[faltante as FaltanteInmueble] ?? GENERICA;
}

/**
 * El nombre del GRUPO en «Completar de golpe»: «Sin título», «Sin dirección»…
 * Los que no son un dato que falta (un posible duplicado, el código repetido
 * en el archivo, el reparto que no cuadra) no llevan «Sin»: «Sin el código
 * viene otra vez…» no se entiende (MIG-C, 04-10).
 */
const NO_SON_UN_DATO_QUE_FALTA = new Set(['posible_duplicado', 'codigo_repetido', 'precio_inconsistente', 'reparto', 'plata_con_centavos']);
export function etiquetaDelGrupoDeFaltante(faltante: string): string {
  const etiqueta = etiquetaDeFaltante(faltante);
  if (!NO_SON_UN_DATO_QUE_FALTA.has(faltante)) return `Sin ${etiqueta}`;
  return etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1);
}

/** `posible_duplicado` is the one faltante whose only exit is a dedicated
 * action (`PATCH filas/:id { permitirDuplicado: true }`), not a form field. */
export function esPosibleDuplicado(faltantes: string[]): boolean {
  return faltantes.includes('posible_duplicado');
}

/**
 * Qué decía la celda del archivo para este faltante.
 *
 * «Falta el tipo de inmueble» sobre una celda que dice `APTO` manda a buscar
 * un dato que SÍ está escrito, sólo que con una palabra que el catálogo no
 * conoce. El valor sigue en `datos` —la validación del importador es holgada
 * a propósito y no descarta la celda— así que mostrarlo no cuesta una
 * consulta ni un campo nuevo.
 *
 * Sólo para los faltantes donde el valor original ES la explicación: un
 * `titulo` vacío no tiene nada que mostrar.
 */
export function celdaDelFaltanteInmueble(
  datos: Record<string, unknown> | null | undefined,
  faltante: string,
): string | null {
  const texto = (v: unknown) => {
    const t = String(v ?? '').trim();
    if (!t) return null;
    return t.length > 60 ? `${t.slice(0, 60)}…` : t;
  };
  switch (faltante) {
    case 'tipo':
      return texto(datos?.type);
    case 'tipo_de_negocio':
      return texto(datos?.listingType);
    case 'departamento':
      return texto(datos?.department);
    case 'fecha_consignacion':
      return texto(datos?.consignedAt);
    case 'area':
      return texto(datos?.area);
    default:
      return null;
  }
}

/**
 * MG-36 — los datos de una fila de inmuebles con el nombre que les da la
 * persona. Una clave nueva del back se dice «otro dato», nunca la clave cruda.
 */
const NOMBRES_DE_CAMPO: Record<string, string> = {
  title: 'título',
  description: 'descripción',
  type: 'tipo de inmueble',
  listingType: 'operación',
  address: 'dirección',
  city: 'ciudad',
  department: 'departamento',
  neighborhood: 'barrio',
  monthlyRent: 'canon',
  salePrice: 'precio de venta',
  adminFee: 'administración',
  deposit: 'depósito',
  consignedAt: 'fecha de consignación',
  bedrooms: 'habitaciones',
  bathrooms: 'baños',
  area: 'área',
  floor: 'piso',
  parkingSpaces: 'parqueaderos',
  stratum: 'estrato',
  yearBuilt: 'año de construcción',
  amenities: 'comodidades',
  propietarioDocumento: 'documento del propietario',
  propietarioNombre: 'propietario',
  propietarioTelefono: 'teléfono del propietario',
  propietarios: 'propietarios',
  estadoOrigen: 'estado',
  urbanizacion: 'urbanización',
  llavesEn: 'llaves en',
  creadaPor: 'creado por',
  comisionPorcentaje: 'comisión',
};

const CAMPOS_DE_PLATA = new Set(['monthlyRent', 'salePrice', 'adminFee', 'deposit']);

export function nombreDelCampoInmueble(campo: string): string {
  return NOMBRES_DE_CAMPO[campo] ?? 'otro dato';
}

/** El valor como lo lee una persona: plata con puntos, vacío dicho, listas resumidas. */
export function valorDelCampoInmueble(campo: string, texto: string): string {
  const t = texto.trim();
  if (!t) return 'vacío';
  if (CAMPOS_DE_PLATA.has(campo) && /^\d+$/.test(t)) {
    return `$${Number(t).toLocaleString('es-CO')}`;
  }
  if (t.startsWith('[') || t.startsWith('{')) {
    try {
      const v: unknown = JSON.parse(t);
      if (Array.isArray(v)) {
        const nombres = v
          .map((x) => (x && typeof x === 'object' ? (x as { nombre?: unknown; documento?: unknown }) : null))
          .map((x) => String(x?.nombre ?? x?.documento ?? '').trim())
          .filter(Boolean);
        return nombres.length > 0 ? nombres.join(', ') : `${v.length}`;
      }
    } catch {
      /* se muestra recortado */
    }
  }
  return t.length > 60 ? `${t.slice(0, 60)}…` : t;
}

/**
 * EN-38 / NI-07 (QA-MIGRACION-95, 06-10-2026): la frase de la fila con una
 * cifra con centavos y la llave apagada — la MISMA que dice el back al crear
 * (`plataConCentavosSinLlave`), para que la revisión no diga «lista» y la
 * creación después falle.
 */
export function fraseDeLaPlataConCentavos(datos: {
  monthlyRent?: number | null
  salePrice?: number | null
  adminFee?: number | null
  deposit?: number | null
}): string | null {
  const columnas: ReadonlyArray<[keyof typeof datos, string, string]> = [
    ['monthlyRent', 'El canon', 'el canon'],
    ['salePrice', 'El precio de venta', 'el precio de venta'],
    ['adminFee', 'La administración', 'la administración'],
    ['deposit', 'El depósito', 'el depósito'],
  ]
  for (const [campo, etiqueta, minuscula] of columnas) {
    const v = datos[campo]
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || Number.isInteger(v)) continue
    const cifra = v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `${etiqueta} del archivo trae centavos ($ ${cifra}) y tu plataforma todavía no guarda centavos: escribe ${minuscula} al peso en la fila, o pide que se activen los centavos. No se redondea por ti.`
  }
  return null
}
