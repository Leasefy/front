/**
 * pasos-inquilino.ts — el mismo recorrido de `pasos.ts`, leído desde el lado
 * del inquilino.
 *
 * Por qué hace falta una segunda lectura y no alcanza con la de `pasos.ts`:
 *
 * Los 11 pasos canónicos son el mapa de **la inmobiliaria**. Cinco de ellos
 * (7 al 11) son trabajo suyo. Mostrarle «paso 3 de 11» a un inquilino le dice
 * que le faltan ocho cosas por hacer, y no es cierto: después de postularse la
 * pelota sale de sus manos y no vuelve.
 *
 * Acá se colapsa toda la cola de la inmobiliaria en **un solo paso** —
 * "la inmobiliaria decide"— y quedan 7. El colapso es derivado, no escrito a
 * mano, para que agregar un paso en `pasos.ts` no desincronice este archivo.
 *
 * Lo que `actor` no puede responder: `pasos.ts` tiene dos valores porque la
 * inmobiliaria solo necesita saber *«¿es mío o estoy esperando?»*. El inquilino
 * necesita tres — hay pasos donde **le toca**, pasos donde **nosotros** estamos
 * trabajando y él espera, y el final donde espera a **la inmobiliaria**. Eso es
 * `turno`, y se declara acá.
 *
 * Vocabulario de `docs/VOCABULARIO.md`, audiencia = inquilino: se dice
 * **"aprobación"** y **"tope"**. Nunca "asegurabilidad" (palabra de seguros) ni
 * "estudio" (colisiona con apartaestudio) ni "evaluación" (no se le muestra).
 */

import { PASOS_RECORRIDO, type PasoKey } from './pasos'

/** De quién es la pelota, desde donde está parado el inquilino. */
export type Turno = 'tuyo' | 'nuestro' | 'inmobiliaria'

/** El paso final, que no existe en `pasos.ts`: colapsa los cinco de la agencia. */
export const PASO_FINAL = 'decideLaInmobiliaria' as const

export type PasoInquilinoKey = PasoKey | typeof PASO_FINAL

export interface PasoInquilino {
  /** 1..7 — el número que se le muestra. */
  numero: number
  key: PasoInquilinoKey
  turno: Turno
  /** Etiqueta corta. Clave i18n + texto, como el resto del panel del inquilino. */
  labelKey: string
  label: string
  /** Qué pasa acá, en una línea. */
  descKey: string
  desc: string
  /** Dónde lo atiende. Siempre dentro del panel: nunca se lo saca de acá. */
  href: string
  /** Qué pasos canónicos cubre. El final cubre cinco; el resto, uno. */
  cubre: readonly PasoKey[]
}

const NS = 'inquilino.recorrido'

/** Lo declarado a mano por paso propio del inquilino. El resto se deriva. */
interface Declaracion {
  turno: Turno
  label: string
  desc: string
  href: string
}

const DECLARADO: Record<PasoKey, Declaracion | null> = {
  catalogo: {
    turno: 'tuyo',
    label: 'Miras propiedades',
    desc: 'Para saber qué hay y en qué rango se mueve lo que te gusta.',
    href: '/inquilino/explorar',
  },
  asegurabilidad: {
    turno: 'tuyo',
    label: 'Pides tu aprobación',
    desc: 'Llenas tus datos una sola vez. No necesitas haber elegido una propiedad.',
    href: '/inquilino/aprobacion',
  },
  pago: {
    turno: 'tuyo',
    label: 'Pagas',
    desc: 'Un solo pago que te sirve para todas las propiedades que te interesen.',
    // El pago vivo está adentro del mismo formulario que pide la aprobación
    // (T-0010): no hay una pantalla de cobro aparte, así que este paso apunta
    // al mismo destino que «asegurabilidad». Se conserva como paso propio
    // porque la etiqueta y el turno describen una acción real del inquilino
    // (pagar), aunque hoy comparta pantalla con pedir la aprobación — ver
    // reporte de T-0010/WU-1 sobre si conviene fusionarlos.
    href: '/inquilino/aprobacion',
  },
  aseguradoras: {
    turno: 'nuestro',
    label: 'Consultamos a las aseguradoras',
    // NO decir «te avisamos por correo»: la asegurabilidad es inmediata
    // (decisión 2026-08-09). El correo sí aplica a que se acredite el pago
    // —eso lo dice la pantalla de pago— y a la respuesta a una postulación.
    desc: 'A todas con las que trabajamos, no solo a una. La respuesta sale al momento.',
    href: '/inquilino/aprobacion',
  },
  compatibles: {
    turno: 'nuestro',
    label: 'Te mostramos las que te caben',
    desc: 'Con tu tope ya sabemos a cuáles puedes postularte sin perder tiempo.',
    href: '/inquilino/para-ti',
  },
  postulacion: {
    turno: 'tuyo',
    label: 'Te postulas',
    desc: 'A las que quieras, con la misma aprobación y sin volver a pagar.',
    href: '/inquilino/para-ti',
  },
  // Los cinco de la inmobiliaria no se declaran: se colapsan abajo.
  alerta: null,
  evaluacion: null,
  comparacion: null,
  decision: null,
  contrato: null,
}

const FINAL: Omit<PasoInquilino, 'numero' | 'cubre'> = {
  key: PASO_FINAL,
  turno: 'inmobiliaria',
  labelKey: `${NS}.${PASO_FINAL}.label`,
  label: 'La inmobiliaria decide',
  descKey: `${NS}.${PASO_FINAL}.desc`,
  desc: 'Revisa a todos los postulados y elige. Te avisamos apenas haya respuesta.',
  href: '/inquilino/aplicaciones',
}

/**
 * Los pasos propios del inquilino, en orden, más el final que colapsa toda la
 * cola de la inmobiliaria.
 *
 * Se deriva de `PASOS_RECORRIDO` a propósito: si mañana se agrega un paso del
 * inquilino en `pasos.ts` sin declararlo acá, el `assert` de abajo lo caza en
 * el primer test en vez de dejarlo desaparecer del mapa en silencio.
 */
function construir(): readonly PasoInquilino[] {
  const propios: PasoInquilino[] = []
  const deLaInmobiliaria: PasoKey[] = []

  for (const paso of PASOS_RECORRIDO) {
    const d = DECLARADO[paso.key]
    if (d === null) {
      deLaInmobiliaria.push(paso.key)
      continue
    }
    if (!d) {
      // Un paso nuevo en pasos.ts que nadie declaró acá.
      throw new Error(
        `pasos-inquilino: falta declarar «${paso.key}». Agregalo a DECLARADO ` +
          `(o ponelo en null si es de la inmobiliaria).`,
      )
    }
    propios.push({
      numero: propios.length + 1,
      key: paso.key,
      turno: d.turno,
      labelKey: `${NS}.${paso.key}.label`,
      label: d.label,
      descKey: `${NS}.${paso.key}.desc`,
      desc: d.desc,
      href: d.href,
      cubre: [paso.key],
    })
  }

  return [...propios, { ...FINAL, numero: propios.length + 1, cubre: deLaInmobiliaria }]
}

export const PASOS_INQUILINO = construir()

export const TOTAL_PASOS_INQUILINO = PASOS_INQUILINO.length

export function pasoInquilinoPorKey(key: PasoInquilinoKey): PasoInquilino | undefined {
  return PASOS_INQUILINO.find((p) => p.key === key)
}

/** El paso siguiente, o `undefined` si este es el último. */
export function siguientePasoInquilino(key: PasoInquilinoKey): PasoInquilino | undefined {
  const actual = pasoInquilinoPorKey(key)
  if (!actual) return undefined
  // `numero` es 1-based, así que sirve directo como índice del siguiente.
  return PASOS_INQUILINO[actual.numero]
}

/** El paso anterior, que es a donde se vuelve. `undefined` en el primero. */
export function anteriorPasoInquilino(key: PasoInquilinoKey): PasoInquilino | undefined {
  const actual = pasoInquilinoPorKey(key)
  if (!actual || actual.numero === 1) return undefined
  return PASOS_INQUILINO[actual.numero - 2]
}
