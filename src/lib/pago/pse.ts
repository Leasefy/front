/**
 * Lo que PSE pide de verdad para debitar una cuenta.
 *
 * No es «banco + documento». ACH Colombia exige distinguir persona natural de
 * jurídica, porque el tipo de documento válido cambia con eso (una empresa
 * paga con NIT, una persona con cédula) y el banco valida contra ese par. Un
 * formulario que sólo pide cédula falla en el banco, no acá — y ahí la persona
 * ya salió de nuestra pantalla y no entiende qué pasó.
 *
 * El correo tampoco es opcional: es a donde PSE manda el comprobante, y es el
 * único papel que le queda a quien pagó si algo sale mal.
 */

export type TipoDePersona = 'natural' | 'juridica'

/** Los que acepta PSE. `NIT` sólo aplica a persona jurídica. */
export type TipoDeDocumento = 'CC' | 'CE' | 'PP' | 'NIT'

export interface DatosDePagoPSE {
  tipoDePersona: TipoDePersona
  tipoDeDocumento: TipoDeDocumento
  numeroDeDocumento: string
  /** Nombre completo, o razón social si es jurídica. */
  titular: string
  correo: string
  /** Código del banco, tal como lo devuelve el backend. */
  banco: string
}

export interface DocumentoAceptado {
  valor: TipoDeDocumento
  etiqueta: string
  /** Un ejemplo real, para el placeholder. */
  ejemplo: string
  ayuda?: string
}

const CEDULA: DocumentoAceptado = {
  valor: 'CC',
  etiqueta: 'Cédula',
  ejemplo: '1020304050',
}
const EXTRANJERIA: DocumentoAceptado = {
  valor: 'CE',
  etiqueta: 'Extranjería',
  ejemplo: '123456',
}
const PASAPORTE: DocumentoAceptado = {
  valor: 'PP',
  etiqueta: 'Pasaporte',
  ejemplo: 'AP123456',
}
const NIT: DocumentoAceptado = {
  valor: 'NIT',
  etiqueta: 'NIT',
  ejemplo: '900123456',
  ayuda: 'Sin el dígito de verificación.',
}

/**
 * Qué documentos puede usar cada tipo de persona. Ofrecerle NIT a una persona
 * natural es ofrecerle un camino que el banco va a rechazar.
 */
export function documentosDe(tipo: TipoDePersona): DocumentoAceptado[] {
  return tipo === 'juridica' ? [NIT] : [CEDULA, EXTRANJERIA, PASAPORTE]
}

export function documentoPorDefecto(tipo: TipoDePersona): TipoDeDocumento {
  return tipo === 'juridica' ? 'NIT' : 'CC'
}

export function ejemploDeDocumento(tipo: TipoDeDocumento): string {
  return (
    [CEDULA, EXTRANJERIA, PASAPORTE, NIT].find((d) => d.valor === tipo)?.ejemplo ?? ''
  )
}

export type CampoDePago = keyof DatosDePagoPSE
export type ErroresDePago = Partial<Record<CampoDePago, string>>

// Un correo con espacios o sin punto en el dominio no llega. No se valida más
// que eso: la lista de TLD cambia y rechazar un correo bueno es peor que
// dejar pasar uno malo, que el banco igual va a rebotar.
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Sólo dígitos, sin puntos ni espacios: es lo que viaja al banco. */
export function soloDigitos(v: string): string {
  return v.replace(/\D/g, '')
}

export function validarPago(d: Partial<DatosDePagoPSE>): ErroresDePago {
  const e: ErroresDePago = {}

  if (!d.banco) e.banco = 'Elegí tu banco'

  const doc = (d.numeroDeDocumento ?? '').trim()
  if (!doc) {
    e.numeroDeDocumento = 'Escribí tu número de documento'
  } else if (d.tipoDeDocumento === 'PP') {
    // El pasaporte es alfanumérico y su largo cambia por país.
    if (doc.length < 5) e.numeroDeDocumento = 'Parece incompleto'
  } else {
    const n = soloDigitos(doc)
    if (n.length !== doc.length) {
      e.numeroDeDocumento = 'Sólo números, sin puntos ni espacios'
    } else if (d.tipoDeDocumento === 'NIT') {
      if (n.length < 9 || n.length > 10) e.numeroDeDocumento = 'El NIT tiene 9 o 10 dígitos'
    } else if (n.length < 6 || n.length > 10) {
      e.numeroDeDocumento = 'Entre 6 y 10 dígitos'
    }
  }

  const titular = (d.titular ?? '').trim()
  if (!titular) {
    e.titular =
      d.tipoDePersona === 'juridica' ? 'Escribí la razón social' : 'Escribí tu nombre completo'
  } else if (titular.length < 3) {
    e.titular = 'Parece incompleto'
  }

  const correo = (d.correo ?? '').trim()
  if (!correo) e.correo = 'Escribí tu correo'
  else if (!CORREO.test(correo)) e.correo = 'Ese correo no parece válido'

  return e
}

export function estaCompleto(d: Partial<DatosDePagoPSE>): boolean {
  return Object.keys(validarPago(d)).length === 0
}

/** Estado inicial. Persona natural con cédula es el caso de casi todos. */
export function datosVacios(): DatosDePagoPSE {
  return {
    tipoDePersona: 'natural',
    tipoDeDocumento: 'CC',
    numeroDeDocumento: '',
    titular: '',
    correo: '',
    banco: '',
  }
}

/**
 * Cambiar de persona natural a jurídica no puede dejar un `CC` seleccionado
 * con NIT en pantalla: se reajusta el tipo de documento y se limpia el número,
 * que ya no sirve.
 */
export function alCambiarTipoDePersona(
  d: DatosDePagoPSE,
  tipo: TipoDePersona,
): DatosDePagoPSE {
  if (d.tipoDePersona === tipo) return d
  return {
    ...d,
    tipoDePersona: tipo,
    tipoDeDocumento: documentoPorDefecto(tipo),
    numeroDeDocumento: '',
  }
}
