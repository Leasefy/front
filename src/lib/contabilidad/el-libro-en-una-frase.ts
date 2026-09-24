/**
 * El estado del libro, dicho como una FRASE.
 *
 * ── 🔴 Nico, 22-09, sobre la portada de Contabilidad ───────────────────────
 *
 * «Esto también parece un vómito y tiene cosas por un lado y por el otro.»
 *
 * Arriba había tres fichas del mismo tamaño y el mismo peso —CUENTAS ACTIVAS
 * 2.790 · ASIENTOS ESTE MES 0 · ASIENTOS EN EL LIBRO 0—, y las tres juntas no
 * decían nada: un 0 al lado de un 2.790 se lee como un error, no como «el plan
 * de cuentas está cargado y el libro todavía no arrancó». Es la regla 1 del
 * molde: **el resumen es una frase que dice la RELACIÓN entre los números**.
 *
 * Esta función arma esa frase. Vive aparte de la pantalla porque es la parte
 * que se puede probar sin montar nada, y porque los casos raros son varios:
 * el libro vacío, el mes en cero con libro lleno, y cualquiera de los tres
 * números sin poder leerse (cada consulta falla por separado).
 */

export interface DatosDelLibro {
  /** `null` = esa consulta falló; el número no se inventa. */
  cuentasActivas: number | null
  asientosEnElLibro: number | null
  asientosDelMes: number | null
  /** El día del último asiento, ya legible. `null` si no hay ninguno. */
  ultimoDia: string | null
}

/** Un pedazo de la frase: texto suelto o una cifra que se destaca. */
export type TrozoDeLaFrase =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'cifra'; valor: number | null; rotulo: string }

const texto = (t: string): TrozoDeLaFrase => ({ tipo: 'texto', texto: t })
const cifra = (valor: number | null, rotulo: string): TrozoDeLaFrase => ({
  tipo: 'cifra',
  valor,
  rotulo,
})

/** Singular y plural, sin «(s)». */
function asientos(n: number): string {
  return n === 1 ? 'asiento' : 'asientos'
}

export function elLibroEnUnaFrase(d: DatosDelLibro): TrozoDeLaFrase[] {
  const { cuentasActivas, asientosEnElLibro, asientosDelMes, ultimoDia } = d

  /*
   * 🔴 El libro VACÍO se dice distinto. «0 asientos sobre 2.790 cuentas» es
   * cierto y alarma; lo que pasa de verdad es que el plan está cargado y el
   * libro todavía no empezó, que es el estado normal de una inmobiliaria recién
   * migrada.
   */
  if (asientosEnElLibro === 0) {
    return [
      texto('Todavía no hay ningún asiento en el libro. El plan de cuentas tiene '),
      cifra(cuentasActivas, 'cuentas activas'),
      texto(' cuentas activas y está listo para recibirlos.'),
    ]
  }

  const trozos: TrozoDeLaFrase[] = [
    texto('El libro tiene '),
    cifra(asientosEnElLibro, 'asientos en el libro'),
    texto(
      asientosEnElLibro === null
        ? ' asientos sobre un plan de '
        : ` ${asientos(asientosEnElLibro)} sobre un plan de `,
    ),
    cifra(cuentasActivas, 'cuentas activas'),
    texto(' cuentas activas. '),
  ]

  // Un cero de ESTE MES no significa un libro vacío: si el último asiento es de
  // agosto y estamos en septiembre, el 0 es correcto y engañoso a la vez.
  if (asientosDelMes === 0) {
    trozos.push(
      texto(
        ultimoDia
          ? `Este mes todavía no se ha asentado ninguno; el último fue el ${ultimoDia}.`
          : 'Este mes todavía no se ha asentado ninguno.',
      ),
    )
  } else {
    trozos.push(texto('De este mes son '))
    trozos.push(cifra(asientosDelMes, 'asientos de este mes'))
    trozos.push(texto(asientosDelMes === null ? '.' : `.`))
  }

  return trozos
}
