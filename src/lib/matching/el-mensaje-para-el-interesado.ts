/**
 * El mensaje que el asesor le manda al interesado.
 *
 * ── Por qué esto es una pieza y no un `join` dentro de la pantalla ─────────
 *
 * La pantalla de «Qué ofrecer» calcula un puntaje y una lista de razones. El
 * comentario que abre `CalceClient` lo dice desde el 18-09 y no se había
 * llevado a la práctica:
 *
 *   «el producto no es el puntaje: es el mensaje que el asesor le manda al
 *    interesado. Un 87 % sin explicación no se puede copiar a un WhatsApp.»
 *
 * Hasta hoy la pantalla mostraba las razones y el asesor tenía que volver a
 * escribirlas a mano en su WhatsApp. Acá se arma el texto, y se arma con
 * reglas que se pueden probar.
 *
 * ── Las reglas ────────────────────────────────────────────────────────────
 *
 *   1. 🔴 **El puntaje NO sale nunca.** Es una cuenta nuestra. Mandarle a un
 *      cliente «este inmueble le calza 87 %» es enseñarle que hay un 13 % que
 *      no le van a explicar, y que hubo otro que sacó más.
 *   2. Se saluda por el PRIMER nombre. La ficha guarda el nombre completo —a
 *      veces con dos apellidos y en mayúsculas, como llegó de la migración— y
 *      eso en un WhatsApp se lee como una notificación de cobro.
 *   3. **Nada que no se sepa se escribe.** Sin canon no hay línea de precio;
 *      sin barrio no se inventa la zona. Un mensaje con un «$0» o un «null» lo
 *      manda el asesor sin mirar y lo lee el cliente.
 *   4. La administración sólo se nombra si la hay y es distinta de cero:
 *      «+ $0 de administración» hace dudar de todo el resto.
 *   5. Las razones van tal cual las calculó el back, que es lo que las hace
 *      ciertas. Acá no se redactan de nuevo.
 */

export interface OpcionParaOfrecer {
  titulo: string
  barrio?: string | null
  ciudad?: string | null
  canonCop?: number | null
  administracionCop?: number | null
  habitaciones?: number | null
  /** El porqué que calculó el back. Va literal. */
  porQue: readonly string[]
}

function pesos(n: number): string {
  return `$${n.toLocaleString('es-CO')}`
}

/** El primer nombre, sin apellidos y con la primera en mayúscula. */
export function primerNombre(nombreCompleto: string): string {
  const primero = nombreCompleto.trim().split(/\s+/)[0] ?? ''
  if (primero === '') return ''
  // La migración trajo nombres en MAYÚSCULA SOSTENIDA; así no se saluda.
  return primero.charAt(0).toUpperCase() + primero.slice(1).toLocaleLowerCase('es-CO')
}

/** La línea del inmueble: título, zona y plata, con lo que de verdad se sabe. */
export function lineaDelInmueble(opcion: OpcionParaOfrecer): string {
  const zona = [opcion.barrio, opcion.ciudad].filter(Boolean).join(', ')
  const partes = [opcion.titulo.trim()]
  if (zona) partes.push(zona)
  if (typeof opcion.canonCop === 'number' && opcion.canonCop > 0) {
    const admin =
      typeof opcion.administracionCop === 'number' && opcion.administracionCop > 0
        ? ` + ${pesos(opcion.administracionCop)} de administración`
        : ''
    partes.push(`${pesos(opcion.canonCop)} al mes${admin}`)
  }
  return partes.join(' · ')
}

/**
 * El mensaje de UNA opción, listo para pegar en un WhatsApp.
 *
 * `nombreDeLaAgencia` es opcional a propósito: si no se sabe, la despedida se
 * omite en vez de firmar con un nombre inventado.
 */
export function mensajeDeUnaOpcion(
  nombreDelInteresado: string,
  opcion: OpcionParaOfrecer,
  nombreDeLaAgencia?: string | null,
): string {
  const nombre = primerNombre(nombreDelInteresado)
  const saludo = nombre ? `Hola, ${nombre}.` : 'Hola.'
  const lineas = [
    `${saludo} Te cuento de un inmueble que creo que te sirve:`,
    '',
    lineaDelInmueble(opcion),
  ]
  const razones = opcion.porQue.filter((r) => r.trim() !== '')
  if (razones.length > 0) {
    lineas.push('')
    lineas.push(...razones.map((r) => `· ${r}`))
  }
  lineas.push('')
  lineas.push(
    nombreDeLaAgencia
      ? `¿Te gustaría verlo? Cuadramos la visita cuando puedas. — ${nombreDeLaAgencia}`
      : '¿Te gustaría verlo? Cuadramos la visita cuando puedas.',
  )
  return lineas.join('\n')
}
