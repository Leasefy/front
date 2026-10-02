/**
 * Los topes del inmueble y del mandato, con sus frases (02-10-2026).
 *
 * ESPEJO de `back/src/properties/dto/limites-del-inmueble.ts` y de
 * `back/src/inmobiliaria/consignaciones/dto/limites-del-mandato.ts`: los
 * MISMOS números y las MISMAS frases que el DTO responde en `campos[]`. Así lo
 * que el back rechazaría se ataja antes de mandar, con la frase que la persona
 * vería igual si llegara al servidor. Si cambias algo allá, cámbialo acá.
 *
 * Los largos del título, la dirección, la ciudad y el barrio son los de
 * `POST /properties` (100/200/50/100): el asistente manda el mismo texto al
 * inmueble y al mandato, y el inmueble es el más corto. Sus frases son las que
 * arma el pipe del back con la etiqueta del campo (`etiquetas-de-campos.ts`).
 */

export const CANON_MINIMO_COP = 1_000
/** El tope de un monto MENSUAL (Nico, 02-10-2026). */
export const MONTO_MENSUAL_MAXIMO_COP = 100_000_000
export const DEPOSITO_MAXIMO_COP = 1_000_000_000
export const HABITACIONES_MAXIMAS = 20
export const BANOS_MAXIMOS = 10
export const AREA_MAXIMA_M2 = 10_000
export const PISO_MAXIMO = 100
export const PARQUEADEROS_MAXIMOS = 10
export const TERMINO_MINIMO_MAXIMO_MESES = 120

export const LARGO_DEL_TITULO = 100
export const LARGO_DE_LA_DIRECCION = 200
export const LARGO_DE_LA_CIUDAD = 50
export const LARGO_DEL_BARRIO = 100
/** `current_tenant_name` VarChar(200), en el mandato. */
export const LARGO_DEL_INQUILINO = 200

/**
 * Los largos de las columnas del MANDATO (`Consignacion`, VarChar). Rigen
 * cuando el mandato no tiene inmueble detrás (cartera migrada) y su copia es
 * la única verdad; con inmueble, manda el de `POST /properties` (más corto).
 */
export const LARGOS_DEL_MANDATO = { titulo: 200, direccion: 300, ciudad: 50, barrio: 100 } as const

export const FECHA_DE_CONSIGNACION_DESDE = '1950-01-01'
export const FECHA_DE_CONSIGNACION_HASTA = '2100-12-31'
export const FECHA_DEL_MANDATO_DESDE = '1950-01-01'
export const FECHA_DEL_MANDATO_HASTA = '2100-12-31'

export const MENSAJES_DEL_INMUEBLE = {
  canonEntero: 'El canon debe ser un número entero de pesos, sin decimales.',
  canonMinimo: 'El canon mínimo es de $1.000.',
  canonMaximo: 'El canon no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.',
  administracionEntera: 'La administración debe ser un número entero de pesos, sin decimales.',
  administracionNegativa: 'La administración no puede ser negativa.',
  administracionMaxima:
    'La administración no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.',
  depositoEntero: 'El depósito debe ser un número entero de pesos, sin decimales.',
  depositoNegativo: 'El depósito no puede ser negativo.',
  depositoMaximo: 'El depósito no puede pasar de $1.000.000.000. Revisa que no sobren ceros.',
  habitacionesEnteras: 'Las habitaciones deben ser un número entero, sin decimales.',
  habitacionesMaximas: 'Las habitaciones no pueden pasar de 20.',
  banosEnteros: 'Los baños deben ser un número entero, sin decimales.',
  banosMaximos: 'Los baños no pueden pasar de 10.',
  areaEntera: 'El área debe ser un número entero de metros cuadrados.',
  areaMinima: 'El área debe ser de al menos 1 m².',
  areaMaxima: 'El área no puede pasar de 10.000 m².',
  pisoEntero: 'El piso debe ser un número entero.',
  pisoMaximo: 'El piso no puede pasar de 100.',
  parqueaderosEnteros: 'Los parqueaderos deben ser un número entero, sin decimales.',
  parqueaderosMaximos: 'Los parqueaderos no pueden pasar de 10.',
  fechaDeConsignacion: 'La fecha de consignación no es un día real del calendario (usa AAAA-MM-DD).',
  fechaDeConsignacionFueraDeRango: 'La fecha de consignación debe estar entre 1950 y 2100.',
  // Las del pipe del back (etiqueta + regla), para los largos de `POST /properties`.
  tituloLargo: 'El título no puede tener más de 100 caracteres.',
  direccionLarga: 'La dirección no puede tener más de 200 caracteres.',
  ciudadLarga: 'La ciudad no puede tener más de 50 caracteres.',
  barrioLargo: 'El barrio no puede tener más de 100 caracteres.',
} as const

export const MENSAJES_DEL_MANDATO = {
  tituloLargo: 'El título puede tener hasta 200 caracteres.',
  direccionLarga: 'La dirección puede tener hasta 300 caracteres.',
  ciudadLarga: 'La ciudad puede tener hasta 50 caracteres.',
  barrioLargo: 'El barrio puede tener hasta 100 caracteres.',
  canonMaximo: 'El canon no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.',
  administracionMaxima:
    'La administración no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.',
  terminoMaximo: 'El término mínimo no puede pasar de 120 meses.',
  fechaDelMandato: 'La fecha del mandato no es un día real del calendario (usa AAAA-MM-DD).',
  fechaDelMandatoFueraDeRango: 'La fecha del mandato debe estar entre 1950 y 2100.',
  fechaDeFin: 'La fecha de fin del mandato no es un día real del calendario (usa AAAA-MM-DD).',
  fechaDeFinFueraDeRango: 'La fecha de fin del mandato debe estar entre 1950 y 2100.',
  inquilinoLargo: 'El nombre del inquilino puede tener hasta 200 caracteres.',
  finDelArriendo: 'La fecha de fin del arriendo no es un día real del calendario (usa AAAA-MM-DD).',
  finDelArriendoFueraDeRango: 'La fecha de fin del arriendo debe estar entre 1950 y 2100.',
} as const

// ── Los chequeos (devuelven la frase, o null si está bien) ──────────────────

type Numero = number | null | undefined

function vacio(n: Numero): n is null | undefined {
  return n === null || n === undefined || Number.isNaN(n)
}

/** Un monto de pesos: entero, no negativo y debajo de su tope. Vacío = bien. */
function errorDeMonto(
  n: Numero,
  { maximo, entero, negativo, tope }: { maximo: number; entero: string; negativo?: string; tope: string },
): string | null {
  if (vacio(n)) return null
  if (!Number.isInteger(n)) return entero
  if (n < 0 && negativo) return negativo
  if (n > maximo) return tope
  return null
}

export function errorDelCanon(n: Numero): string | null {
  if (vacio(n)) return null
  if (!Number.isInteger(n)) return MENSAJES_DEL_INMUEBLE.canonEntero
  if (n > MONTO_MENSUAL_MAXIMO_COP) return MENSAJES_DEL_INMUEBLE.canonMaximo
  if (n > 0 && n < CANON_MINIMO_COP) return MENSAJES_DEL_INMUEBLE.canonMinimo
  return null
}

export function errorDeLaAdministracion(n: Numero): string | null {
  return errorDeMonto(n, {
    maximo: MONTO_MENSUAL_MAXIMO_COP,
    entero: MENSAJES_DEL_INMUEBLE.administracionEntera,
    negativo: MENSAJES_DEL_INMUEBLE.administracionNegativa,
    tope: MENSAJES_DEL_INMUEBLE.administracionMaxima,
  })
}

export function errorDelDeposito(n: Numero): string | null {
  return errorDeMonto(n, {
    maximo: DEPOSITO_MAXIMO_COP,
    entero: MENSAJES_DEL_INMUEBLE.depositoEntero,
    negativo: MENSAJES_DEL_INMUEBLE.depositoNegativo,
    tope: MENSAJES_DEL_INMUEBLE.depositoMaximo,
  })
}

function errorDeConteo(n: Numero, maximo: number, entero: string, tope: string): string | null {
  if (vacio(n)) return null
  if (!Number.isInteger(n)) return entero
  if (n > maximo) return tope
  return null
}

export function errorDeLasHabitaciones(n: Numero): string | null {
  return errorDeConteo(n, HABITACIONES_MAXIMAS, MENSAJES_DEL_INMUEBLE.habitacionesEnteras, MENSAJES_DEL_INMUEBLE.habitacionesMaximas)
}

export function errorDeLosBanos(n: Numero): string | null {
  return errorDeConteo(n, BANOS_MAXIMOS, MENSAJES_DEL_INMUEBLE.banosEnteros, MENSAJES_DEL_INMUEBLE.banosMaximos)
}

export function errorDelPiso(n: Numero): string | null {
  return errorDeConteo(n, PISO_MAXIMO, MENSAJES_DEL_INMUEBLE.pisoEntero, MENSAJES_DEL_INMUEBLE.pisoMaximo)
}

export function errorDeLosParqueaderos(n: Numero): string | null {
  return errorDeConteo(
    n,
    PARQUEADEROS_MAXIMOS,
    MENSAJES_DEL_INMUEBLE.parqueaderosEnteros,
    MENSAJES_DEL_INMUEBLE.parqueaderosMaximos,
  )
}

export function errorDelArea(n: Numero): string | null {
  if (vacio(n)) return null
  if (!Number.isInteger(n)) return MENSAJES_DEL_INMUEBLE.areaEntera
  if (n < 1) return MENSAJES_DEL_INMUEBLE.areaMinima
  if (n > AREA_MAXIMA_M2) return MENSAJES_DEL_INMUEBLE.areaMaxima
  return null
}

export function errorDelTermino(n: Numero): string | null {
  if (vacio(n)) return null
  return n > TERMINO_MINIMO_MAXIMO_MESES ? MENSAJES_DEL_MANDATO.terminoMaximo : null
}

/** `texto` más largo que `maximo` → la frase; vacío o en el tope = bien. */
export function errorDelLargo(texto: string | null | undefined, maximo: number, frase: string): string | null {
  return texto && texto.length > maximo ? frase : null
}

/** `AAAA-MM-DD` y un día que existe (2026-02-31 no). Espejo de `esDiaDelCalendario`. */
export function esDiaDelCalendario(valor: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim())
  if (!m) return false
  const fecha = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`)
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === `${m[1]}-${m[2]}-${m[3]}`
}

/** Una fecha opcional: día real y dentro del rango. Vacía = bien. */
export function errorDeLaFecha(
  valor: string | null | undefined,
  { desde, hasta, noEsDia, fueraDeRango }: { desde: string; hasta: string; noEsDia: string; fueraDeRango: string },
): string | null {
  if (!valor) return null
  if (!esDiaDelCalendario(valor)) return noEsDia
  const dia = valor.trim()
  return dia < desde || dia > hasta ? fueraDeRango : null
}

export function errorDeLaFechaDeConsignacion(valor: string | null | undefined): string | null {
  return errorDeLaFecha(valor, {
    desde: FECHA_DE_CONSIGNACION_DESDE,
    hasta: FECHA_DE_CONSIGNACION_HASTA,
    noEsDia: MENSAJES_DEL_INMUEBLE.fechaDeConsignacion,
    fueraDeRango: MENSAJES_DEL_INMUEBLE.fechaDeConsignacionFueraDeRango,
  })
}

export function errorDeLaFechaDelMandato(valor: string | null | undefined): string | null {
  return errorDeLaFecha(valor, {
    desde: FECHA_DEL_MANDATO_DESDE,
    hasta: FECHA_DEL_MANDATO_HASTA,
    noEsDia: MENSAJES_DEL_MANDATO.fechaDelMandato,
    fueraDeRango: MENSAJES_DEL_MANDATO.fechaDelMandatoFueraDeRango,
  })
}

export function errorDelFinDelArriendo(valor: string | null | undefined): string | null {
  return errorDeLaFecha(valor, {
    desde: FECHA_DEL_MANDATO_DESDE,
    hasta: FECHA_DEL_MANDATO_HASTA,
    noEsDia: MENSAJES_DEL_MANDATO.finDelArriendo,
    fueraDeRango: MENSAJES_DEL_MANDATO.finDelArriendoFueraDeRango,
  })
}

/**
 * Los datos del inmueble que el asistente, la ficha y el modal mandan. Cada
 * clave es el campo del DTO (`POST/PATCH /properties`), que es como vuelven
 * en `campos[]`.
 */
export interface DatosDelInmueble {
  title?: string | null
  address?: string | null
  city?: string | null
  neighborhood?: string | null
  monthlyRent?: Numero
  adminFee?: Numero
  deposit?: Numero
  bedrooms?: Numero
  bathrooms?: Numero
  area?: Numero
  floor?: Numero
  parkingSpaces?: Numero
  consignedAt?: string | null
}

export type CampoDelInmueble = keyof DatosDelInmueble

/** Los errores de los topes, por campo del DTO. Vacío = se puede mandar. */
export function erroresDelInmueble(d: DatosDelInmueble): Partial<Record<CampoDelInmueble, string>> {
  const errores: Partial<Record<CampoDelInmueble, string | null>> = {
    title: errorDelLargo(d.title, LARGO_DEL_TITULO, MENSAJES_DEL_INMUEBLE.tituloLargo),
    address: errorDelLargo(d.address, LARGO_DE_LA_DIRECCION, MENSAJES_DEL_INMUEBLE.direccionLarga),
    city: errorDelLargo(d.city, LARGO_DE_LA_CIUDAD, MENSAJES_DEL_INMUEBLE.ciudadLarga),
    neighborhood: errorDelLargo(d.neighborhood, LARGO_DEL_BARRIO, MENSAJES_DEL_INMUEBLE.barrioLargo),
    monthlyRent: errorDelCanon(d.monthlyRent),
    adminFee: errorDeLaAdministracion(d.adminFee),
    deposit: errorDelDeposito(d.deposit),
    bedrooms: errorDeLasHabitaciones(d.bedrooms),
    bathrooms: errorDeLosBanos(d.bathrooms),
    area: errorDelArea(d.area),
    floor: errorDelPiso(d.floor),
    parkingSpaces: errorDeLosParqueaderos(d.parkingSpaces),
    consignedAt: errorDeLaFechaDeConsignacion(d.consignedAt),
  }
  const limpios: Partial<Record<CampoDelInmueble, string>> = {}
  for (const [campo, mensaje] of Object.entries(errores) as [CampoDelInmueble, string | null][]) {
    if (mensaje) limpios[campo] = mensaje
  }
  return limpios
}
