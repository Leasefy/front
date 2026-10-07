/**
 * La regla de la dirección y del código postal de una inmobiliaria — UNA sola,
 * para el registro (paso «Datos de tu inmobiliaria») y para Configuración →
 * Perfil. El micro la repite tal cual en `src/onboarding/direccion.ts`.
 *
 * Reporte de QA (01-10-2026): la dirección aceptaba «!@#$%^&*()(*&^%$» y el
 * código postal cualquier cosa.
 *
 * ── Dirección ─────────────────────────────────────────────────────────────
 * Una dirección colombiana plausible, como sale en un recibo:
 *  - al menos una letra (la vía: «Calle», «Cra.», «Km») y al menos un número;
 *  - sólo letras (con tildes, ü y ñ), números, espacios y `# - . , ° º / ( )`
 *    («Calle 10 # 43-20», «Cra. 76 No. 32-15 Apto 301», «Km 5 Vía Las
 *    Palmas», «Diagonal 75B Bis # 2A-80»);
 *  - nada de `! @ $ % ^ & * = + < > { } [ ] | \ ~`, comillas ni emojis;
 *  - hasta `LARGO_MAXIMO_DE_LA_DIRECCION` caracteres.
 *
 * ── Código postal ─────────────────────────────────────────────────────────
 * Opcional. Si se escribe: 6 dígitos, y los dos primeros son el código DANE
 * del departamento (así lo arma 4-72). Con el departamento elegido se cruza el
 * prefijo; un departamento que no se reconoce sólo exige los 6 dígitos.
 */

export const LARGO_MAXIMO_DE_LA_DIRECCION = 120
export const DIGITOS_DEL_CODIGO_POSTAL = 6

export const EJEMPLO_DE_DIRECCION = 'Calle 10 # 43-20'
const COMO_ESCRIBIRLA = `Escríbela como aparece en un recibo: ${EJEMPLO_DE_DIRECCION}.`

/** Lo único que puede llevar una dirección. */
const PERMITIDO = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 #\-.,°º/()]*$/
const UN_PERMITIDO = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 #\-.,°º/()]/
const UNA_LETRA = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/
const UN_NUMERO = /[0-9]/

/**
 * NFC antes de mirar: el teclado del Mac y algunos pegados traen la tilde
 * suelta («a» + «´» combinante), que a la vista es una «á» y para la regla un
 * símbolo. Los espacios de más (o un salto de línea pegado) quedan en uno.
 */
export function limpiarDireccion(valor: string): string {
  return valor.normalize('NFC').replace(/\s+/g, ' ').trim()
}

/**
 * El mensaje de error de la dirección, o `null` si está bien.
 * Vacía es `null`: si es obligatoria lo dice quien la pide.
 */
export function errorDeDireccion(valor: string): string | null {
  const direccion = limpiarDireccion(valor)
  if (!direccion) return null
  if (!PERMITIDO.test(direccion)) {
    // Los que sobran, sin repetir y por punto de código (un emoji simple no se parte en dos).
    const sobran = [...new Set(Array.from(direccion).filter((c) => !UN_PERMITIDO.test(c)))]
    const lista = sobran.slice(0, 4).map((c) => `«${c}»`).join(' ')
    const verbo = sobran.length === 1 ? 'no va' : 'no van'
    return `${lista} ${verbo} en una dirección. ${COMO_ESCRIBIRLA}`
  }
  if (direccion.length > LARGO_MAXIMO_DE_LA_DIRECCION) {
    return `La dirección es muy larga: hasta ${LARGO_MAXIMO_DE_LA_DIRECCION} caracteres. ${COMO_ESCRIBIRLA}`
  }
  if (!UNA_LETRA.test(direccion)) {
    return `A la dirección le falta la vía (Calle, Carrera, Km…). ${COMO_ESCRIBIRLA}`
  }
  if (!UN_NUMERO.test(direccion)) {
    return `A la dirección le falta el número. ${COMO_ESCRIBIRLA}`
  }
  return null
}

/**
 * Lo que deja pasar el campo del código postal mientras se escribe: sólo
 * dígitos, hasta seis. Se limpia en `onChange` y no con `maxLength`: el
 * `maxLength` del navegador ya cortó dígitos de un celular pegado con espacios.
 */
export function limpiarCodigoPostalAlEscribir(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, DIGITOS_DEL_CODIGO_POSTAL)
}

/**
 * Código DANE (DIVIPOLA) de cada departamento: son los dos primeros dígitos de
 * su código postal. Los nombres son los de `colombia-geo.ts`.
 */
export const CODIGO_DANE_DEL_DEPARTAMENTO: Readonly<Record<string, string>> = {
  Antioquia: '05',
  Atlántico: '08',
  'Bogotá D.C.': '11',
  Bolívar: '13',
  Boyacá: '15',
  Caldas: '17',
  Caquetá: '18',
  Cauca: '19',
  Cesar: '20',
  Córdoba: '23',
  Cundinamarca: '25',
  Chocó: '27',
  Huila: '41',
  'La Guajira': '44',
  Magdalena: '47',
  Meta: '50',
  Nariño: '52',
  'Norte de Santander': '54',
  Quindío: '63',
  Risaralda: '66',
  Santander: '68',
  Sucre: '70',
  Tolima: '73',
  'Valle del Cauca': '76',
  Arauca: '81',
  Casanare: '85',
  Putumayo: '86',
  'San Andrés y Providencia': '88',
  Amazonas: '91',
  Guainía: '94',
  Guaviare: '95',
  Vaupés: '97',
  Vichada: '99',
}

function llave(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const POR_LLAVE = new Map(
  Object.entries(CODIGO_DANE_DEL_DEPARTAMENTO).map(([nombre, codigo]) => [llave(nombre), { nombre, codigo }]),
)
const POR_CODIGO = new Map(
  Object.entries(CODIGO_DANE_DEL_DEPARTAMENTO).map(([nombre, codigo]) => [codigo, nombre]),
)

/**
 * El departamento tal como lo guardó cualquier pantalla: con o sin tildes,
 * «Bogotá», «Bogotá D.C.», «Valle», «San Andrés…». `null` si no se reconoce.
 */
export function departamentoConocido(departamento: string | null | undefined): { nombre: string; codigo: string } | null {
  if (!departamento) return null
  const k = llave(departamento)
  if (!k) return null
  const directo = POR_LLAVE.get(k)
  if (directo) return directo
  if (k === 'bogota' || k.startsWith('bogota ')) return POR_LLAVE.get('bogota d c') ?? null
  if (k === 'valle') return POR_LLAVE.get('valle del cauca') ?? null
  if (k.startsWith('san andres') || k.startsWith('archipielago de san andres')) {
    return POR_LLAVE.get('san andres y providencia') ?? null
  }
  return null
}

/**
 * El mensaje de error del código postal, o `null` si está bien (o vacío: es
 * opcional). Con `departamento` reconocido, cruza el prefijo.
 */
export function errorDeCodigoPostal(valor: string, departamento?: string | null): string | null {
  const codigo = valor.trim()
  if (!codigo) return null
  if (!/^\d+$/.test(codigo)) {
    return `El código postal sólo lleva números: son ${DIGITOS_DEL_CODIGO_POSTAL} dígitos.`
  }
  if (codigo.length !== DIGITOS_DEL_CODIGO_POSTAL) {
    return `El código postal tiene ${DIGITOS_DEL_CODIGO_POSTAL} dígitos; este tiene ${codigo.length}.`
  }
  const prefijo = codigo.slice(0, 2)
  const delPrefijo = POR_CODIGO.get(prefijo)
  if (!delPrefijo) {
    return `Ningún código postal de Colombia empieza por ${prefijo}: los dos primeros dígitos son los del departamento.`
  }
  const elegido = departamentoConocido(departamento)
  if (elegido && elegido.codigo !== prefijo) {
    // «Bogotá D.C.» ya trae su punto: sin esto saldría «D.C..».
    return `Ese código postal es de ${delPrefijo.replace(/\.$/, '')}. Los de ${elegido.nombre} empiezan por ${elegido.codigo}.`
  }
  return null
}
