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

/** Los tres momentos del negocio, en el orden en que ocurren. */
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
    href: '/panel/inmobiliaria/contratos/nuevo',
    module: 'contratos',
  },
] satisfies readonly Definicion[]

/** Los grupos, en orden. El menú los muestra así. */
export const GRUPOS: readonly GrupoFlujo[] = ['captar', 'evaluar', 'cerrar']

/**
 * El flujo que queda en el segmento principal del `SplitButton`: se abre con un
 * clic, sin pasar por el menú.
 *
 * Es **una decisión de producto, no una restricción técnica** — cambiar esta
 * línea mueve el botón. Va la consignación porque es la boca del embudo: sin
 * inventario no hay nada que arrendar, y es el flujo que más veces al día
 * arranca una inmobiliaria que está creciendo. Si la operación real dice otra
 * cosa, se cambia acá y nada más.
 *
 * Si la persona no tiene permiso sobre este flujo, el botón cae al primero que
 * sí pueda abrir (ver `BotonNuevo`): el segmento principal nunca queda muerto.
 */
export const FLUJO_PRINCIPAL: FlujoKey = 'consignacion'

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
