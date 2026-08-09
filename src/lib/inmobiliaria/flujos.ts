/**
 * flujos.ts — los flujos que una inmobiliaria puede *empezar*, en un solo lugar.
 *
 * Por qué existe: el panel tiene 156 rutas y ninguna dice "empezá acá". Para
 * abrir una consignación hay que saber que vive dentro de Consignaciones, y
 * para evaluar a un candidato hay que saber que está bajo Evaluación de
 * candidatos → Nueva evaluación. Quien entra por primera vez no lo sabe, y el
 * sidebar —agrupado por módulo de negocio— tampoco se lo dice.
 *
 * Esta lista alimenta el botón «Nuevo» que vive debajo del buscador. No
 * reemplaza ninguna ruta: es un atajo a lo que ya existe.
 *
 * Sobre el nombre del botón: **no** es "Nuevo ingreso". En este mismo sidebar
 * hay una sección Finanzas con Cobros, Tesorería y Facturación, donde "ingreso"
 * es plata que entra. Dos conceptos con una palabra rompe la regla madre de
 * `docs/VOCABULARIO.md` («un nombre, una cosa»), así que el botón dice «Nuevo»
 * y cada opción se nombra completa.
 */

import {
  Buildings,
  House,
  Scales,
  ShieldCheck,
  FileText,
  FilePlus,
  type Icon,
} from '@phosphor-icons/react'

export type FlujoKey =
  | 'consignacion'
  | 'inmueble'
  | 'avaluo'
  | 'evaluacion'
  | 'asegurabilidad'
  | 'contrato'

/** Los momentos del negocio, en el orden en que ocurren. */
export type GrupoFlujo = 'captar' | 'evaluar' | 'cerrar'

export interface FlujoNuevo {
  key: FlujoKey
  grupo: GrupoFlujo
  icon: Icon
  /**
   * Ruta interna. Para `avaluo` va vacía: ese flujo vive en el front del micro
   * de avalúos y la URL se resuelve en runtime (`AVALUO_WIZARD_URL`), que puede
   * no estar configurada — ahí la opción se esconde en vez de llevar a nada.
   */
  href: string
  /** Vive fuera de este front: se abre en pestaña nueva para no matar el panel. */
  externo?: boolean
  /**
   * En vez de navegar, abre un selector: el flujo necesita elegir algo antes de
   * poder empezar. Preparar un contrato no arranca en frío —`/contratos/nuevo`
   * lee `?applicationId=`—, así que primero se pregunta sobre qué postulación
   * aprobada se arma. Sin esto el ítem llevaba a "Falta el parámetro
   * applicationId", que es como estuvo un rato.
   */
  selector?: 'postulacion'
  /**
   * Módulo de `PermissionsContext.canAccess`. `null` = sin compuerta.
   * Mismos valores que usa el sidebar, para que el menú no ofrezca algo que la
   * navegación esconde.
   */
  module: string | null
}

const I18N = 'inmobiliaria.nuevo.flujos'

type Definicion = Omit<FlujoNuevo, never>

export const FLUJOS: readonly FlujoNuevo[] = [
  // ── Captar: traer inmueble y propietario ──────────────────────────────
  {
    key: 'consignacion',
    grupo: 'captar',
    icon: Buildings,
    href: '/panel/inmobiliaria/portafolio/nuevo',
    module: 'portafolio',
  },
  {
    key: 'inmueble',
    grupo: 'captar',
    icon: House,
    href: '/panel/inmobiliaria/propiedades/nueva',
    module: 'portafolio',
  },
  {
    key: 'avaluo',
    grupo: 'captar',
    icon: Scales,
    href: '',
    externo: true,
    module: 'avaluos',
  },

  // ── Evaluar: decidir sobre una persona ────────────────────────────────
  {
    key: 'evaluacion',
    grupo: 'evaluar',
    icon: ShieldCheck,
    href: '/panel/inmobiliaria/ai/estudio/nuevo',
    module: 'estudio',
  },
  {
    key: 'asegurabilidad',
    grupo: 'evaluar',
    icon: FileText,
    href: '/panel/inmobiliaria/ai/asegurabilidad/nueva',
    module: 'cotizador',
  },

  // ── Cerrar ────────────────────────────────────────────────────────────
  {
    key: 'contrato',
    grupo: 'cerrar',
    icon: FilePlus,
    // Sin ruta directa: la resuelve el selector con el applicationId elegido.
    href: '',
    selector: 'postulacion',
    module: 'contratos',
  },
] satisfies readonly Definicion[]

/** Los grupos, en orden. El menú los muestra así. */
export const GRUPOS: readonly GrupoFlujo[] = ['captar', 'evaluar', 'cerrar']

/**
 * Con qué arranca el segmento principal del `SplitButton` **la primera vez**,
 * antes de que la persona haya usado ninguno.
 *
 * De ahí en adelante manda `ultimoFlujoUsado()`: el botón muestra lo último que
 * esa persona abrió. Se hizo así porque elegir un principal fijo era una
 * apuesta que no teníamos cómo ganar:
 *
 *  · **Todos los flujos ya tienen su botón donde viven** — `/portafolio` tiene
 *    "Nueva consignación", `/propiedades` "Nueva propiedad", `/contratos`
 *    "Nuevo contrato". Un principal fijo duplica algo que está a un clic.
 *  · **Por frecuencia gana evaluación, no consignación**: una consignación se
 *    firma una vez por inmueble y dura un año; los candidatos se evalúan cada
 *    vez que el inmueble rota.
 *  · **El costo del error no es simétrico**: el wizard de consignación tiene
 *    seis pasos, así que un clic equivocado en la barra lateral se paga caro.
 *
 * La consignación queda de arranque porque es lo único que se hace **en frío**,
 * sin venir de ningún contexto previo: llama un propietario y se abre de cero.
 * Las evaluaciones casi siempre salen de una postulación que ya se está viendo.
 */
export const FLUJO_INICIAL: FlujoKey = 'consignacion'

/** Dónde se recuerda el último flujo abierto. Mismo prefijo legacy. */
export const CLAVE_ULTIMO = 'arriendo-facil-flujo-ultimo'

/** El último flujo que esta persona abrió, si sigue existiendo. */
export function ultimoFlujoUsado(): FlujoKey | null {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(CLAVE_ULTIMO)
    // Se valida contra FLUJOS: una clave vieja de un flujo que ya no existe
    // dejaría el botón principal sin destino.
    return FLUJOS.some((f) => f.key === v) ? (v as FlujoKey) : null
  } catch {
    return null
  }
}

export function recordarUltimoFlujo(k: FlujoKey): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CLAVE_ULTIMO, k)
  } catch {
    // Que no se pueda recordar no debe impedir abrir el flujo.
  }
}

export const flujoLabelKey = (k: FlujoKey) => `${I18N}.${k}.label`
export const flujoDescKey = (k: FlujoKey) => `${I18N}.${k}.desc`
export const grupoLabelKey = (g: GrupoFlujo) => `inmobiliaria.nuevo.grupos.${g}`

/** Claves de la explicación que se muestra la primera vez. */
export const flujoIntro = (k: FlujoKey) => ({
  titulo: `${I18N}.${k}.intro.titulo`,
  resumen: `${I18N}.${k}.intro.resumen`,
  pasos: [1, 2, 3].map((n) => `${I18N}.${k}.intro.paso${n}`),
  necesitas: `${I18N}.${k}.intro.necesitas`,
})

/**
 * Clave de "ya vio la explicación de este flujo".
 *
 * El prefijo `arriendo-facil-` es anterior al rebrand y NO se renombra: hay
 * datos guardados con él en navegadores reales.
 */
export const claveVisto = (k: FlujoKey) => `arriendo-facil-flujo-visto-${k}`

/** `true` si a esta persona ya se le explicó este flujo. */
export function yaVioElFlujo(k: FlujoKey): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(claveVisto(k)) === '1'
  } catch {
    // Safari en privado tira al leer. Ante la duda, explicar de más.
    return false
  }
}

export function marcarFlujoVisto(k: FlujoKey): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(claveVisto(k), '1')
  } catch {
    // Que no se pueda recordar no debe impedir arrancar el flujo.
  }
}
