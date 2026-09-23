/**
 * Traduce el motivo técnico del back a algo que una inmobiliaria pueda leer.
 *
 * ── 🔴 El defecto (Nico, 18-09-2026) ───────────────────────────────────────
 *
 * En la ficha de un contrato, encima del giro al propietario, salía esto:
 *
 *     ⚠ Falta aplicar la migración 20260917120000_modalidad_del_mandato:
 *       este mandato se liquida como hoy.
 *
 * Nico preguntó «¿por qué sale ese mensaje ahí?», y tiene toda la razón: el
 * identificador de una migración de Postgres no le sirve de nada a quien
 * administra inmuebles. No puede aplicarla, no sabe qué es, y lo único que
 * aprende es que el producto tiene piezas sueltas.
 *
 * ── Por qué el back escribe eso, y por qué está bien que lo escriba ────────
 *
 * Esos mensajes se escribieron para VÍCTOR: son la lista de lo que falta
 * desplegar, y el identificador es exactamente lo que él necesita. El error no
 * fue escribirlos; fue mandarle al usuario final el mensaje del operador sin
 * traducirlo. Son dos audiencias y era un solo texto.
 *
 * Por eso esto NO toca el back: el `motivo` sigue viajando entero —queda en el
 * DOM, en el log y en la respuesta para quien lo necesite—, y lo que cambia es
 * lo que se pinta. La traducción vive en un solo lado y sirve para las doce
 * frases que hoy existen y para las que vengan.
 */

/** El identificador de una migración: `20260917120000_modalidad_del_mandato`. */
const ID_DE_MIGRACION = /\b\d{14}_[a-z0-9_]+\b/i

/**
 * Las formas en que el back anuncia «falta la migración». Cada una captura, si
 * la hay, la CONSECUENCIA — que es lo único que le importa a la inmobiliaria:
 * «este mandato se liquida como hoy».
 */
const FORMAS: RegExp[] = [
  // «Falta [aplicar] la migración <id> (a, b): <consecuencia>»
  // El grupo 1 es la consecuencia. Sin nombre: el `target` del proyecto no
  // llega a ES2018 y los grupos con nombre no compilan.
  /^falta (?:aplicar )?la migraci[óo]n\s+\S+(?:\s*\([^)]*\))?\s*[:.]\s*(.*)$/i,
  // «Falta [aplicar] la migración <id>.» — sin consecuencia
  /^falta (?:aplicar )?la migraci[óo]n\s+\S+\.?$/i,
  // «Todavía no se puede … en esta base: <lo que falta>. <consecuencia>»
  /^todav[íi]a no se puede .*? en esta base:\s*[^.]*\.\s*(.*)$/i,
]

export interface MotivoEnCristiano {
  /** Lo que se le muestra a la inmobiliaria. `null` si no había motivo. */
  texto: string | null
  /**
   * El motivo original, entero. Va al atributo `title` y al DOM para soporte:
   * no se pierde, sólo deja de gritarse.
   */
  tecnico: string | null
  /** ¿Se reconoció como un motivo técnico y se tradujo? */
  seTradujo: boolean
}

/**
 * 🔴 20-09 · EL MISMO DEFECTO DE NICO, UN NIVEL MÁS ADENTRO.
 *
 * El 18-09 se dejó de mostrar el identificador de la migración. Pero la
 * consecuencia que se captura venía con la frase del operador pegada al final,
 * y esa sí llegaba entera a la pantalla:
 *
 *     «Esta función todavía no está disponible. Por ahora, el cálculo se ve,
 *      pero no se puede proponer ni aprobar. **La aplica Víctor.**»
 *
 * Quien administra inmuebles no sabe quién es Víctor, no puede escribirle y lo
 * único que aprende es que hay una persona suelta entre él y su contabilidad.
 * Es exactamente el mismo error que el identificador: el mensaje del operador
 * mandado al usuario final.
 *
 * El motivo técnico sigue viajando entero en `tecnico` —al `title`, al DOM y
 * al log—, así que no se pierde nada para quien sí necesita leerlo.
 */
const FRASE_DEL_OPERADOR =
  /\s*(?:la\s+)?(?:la\s+)?(?:migraci[óo]n\s+)?(?:la\s+)?aplica\s+(?:v[íi]ctor|el\s+equipo|soporte)\s*\.?/gi

/** Quita del texto las frases dirigidas a quien despliega, no al usuario. */
export function sinLaFraseDelOperador(texto: string): string {
  return texto.replace(FRASE_DEL_OPERADOR, ' ').replace(/\s+/g, ' ').trim()
}

/** Deja la consecuencia con mayúscula inicial y un punto al final. */
function comoFrase(bruto: string): string {
  const limpio = bruto.trim().replace(/\s+/g, ' ')
  if (!limpio) return ''
  const conMayuscula = limpio.charAt(0).toUpperCase() + limpio.slice(1)
  return /[.!?]$/.test(conMayuscula) ? conMayuscula : `${conMayuscula}.`
}

/**
 * El motivo, en cristiano.
 *
 * Lo que devuelve para el caso de Nico:
 *   «Esta función todavía no está disponible. Por ahora, este mandato se
 *    liquida como hoy.»
 *
 * 🔴 Cuando NO reconoce la forma, devuelve el texto tal cual. Es a propósito:
 * inventar una traducción de algo que no se entendió es peor que mostrar el
 * original, porque el original al menos es cierto.
 */
export function enCristiano(motivo: string | null | undefined): MotivoEnCristiano {
  const bruto = (motivo ?? '').trim()
  if (!bruto) return { texto: null, tecnico: null, seTradujo: false }

  for (const forma of FORMAS) {
    const m = forma.exec(bruto)
    if (!m) continue
    const consecuencia = sinLaFraseDelOperador(m[1]?.trim() ?? '')
    const texto = consecuencia
      ? `Esta función todavía no está disponible. Por ahora, ${consecuencia.charAt(0).toLowerCase()}${consecuencia.slice(1)}`
      : 'Esta función todavía no está disponible.'
    return { texto: comoFrase(texto), tecnico: bruto, seTradujo: true }
  }

  // No se reconoció la forma, pero si trae un identificador de migración
  // suelto, ese identificador no tiene por qué verse.
  if (ID_DE_MIGRACION.test(bruto)) {
    return {
      texto: 'Esta función todavía no está disponible.',
      tecnico: bruto,
      seTradujo: true,
    }
  }

  // Aunque no se reconozca la forma, la frase del operador nunca se muestra.
  const limpio = sinLaFraseDelOperador(bruto)
  return { texto: limpio || bruto, tecnico: bruto, seTradujo: limpio !== bruto }
}

/** Atajo para pintar: sólo el texto. */
export function motivoEnCristiano(motivo: string | null | undefined): string | null {
  return enCristiano(motivo).texto
}

/**
 * El mensaje de un error, en cristiano y listo para un `toast`.
 *
 * 🔴 El `catch` que se agregó al botón «Crear enlace de firma» hizo visible el
 * fallo —que era el arreglo— pero lo mostró con el texto crudo del back, o sea
 * con el identificador de la migración adentro. Un error que por fin se ve no
 * puede seguir hablándole al operador.
 */
export function errorEnCristiano(error: unknown, porDefecto: string): string {
  const crudo =
    error && typeof error === 'object' && 'message' in error
      ? (error as { message?: unknown }).message
      : null
  if (typeof crudo !== 'string' || !crudo.trim()) return porDefecto
  return enCristiano(crudo).texto ?? porDefecto
}
