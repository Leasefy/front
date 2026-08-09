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

import { Buildings, Scales, ShieldCheck, FilePlus, type Icon } from '@phosphor-icons/react'

export type FlujoKey = 'consignacion' | 'avaluo' | 'asegurabilidad' | 'contrato'

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
  //
  // Acá hubo un rato «Nuevo inmueble» (`/propiedades/nueva`) al lado de la
  // consignación, y se sacó por una regla de negocio: **una inmobiliaria nunca
  // administra un inmueble que no tiene propietario.** Ese formulario no pide
  // propietario —ni comisión, ni agente, ni inventario— y publica igual al
  // catálogo, así que desde este panel solo servía para crear una ficha a
  // medias. Es un formulario del panel del propietario, que es dueño de lo
  // suyo y no tiene a quién declarar. Para una agencia, entrar un inmueble es
  // siempre una consignación.
  {
    key: 'consignacion',
    grupo: 'captar',
    icon: Buildings,
    href: '/panel/inmobiliaria/portafolio/nuevo',
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
  //
  // Hay UNA sola cosa que se le hace a una persona en frío, y es preguntarle a
  // las aseguradoras si la respaldan. **La evaluación A/B/C/D no va acá**: es
  // posterior a la postulación y arranca sola cuando la postulación entra (paso
  // 8 de `lib/recorrido/pasos.ts`; `docs/VOCABULARIO.md` §Evaluación). A demanda
  // se puede volver a correr, pero sobre una postulación que ya existe — no es
  // algo que se empiece desde cero.
  //
  // Había un ítem «Nueva evaluación de candidato» → `/ai/estudio/nuevo`, y esa
  // pantalla ni siquiera guarda: su botón responde "Próximamente: esto creará
  // el estudio…". Prometía un flujo que no existe, en un orden que tampoco es.
  {
    key: 'asegurabilidad',
    grupo: 'evaluar',
    icon: ShieldCheck,
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
 * Qué muestra el segmento principal del `SplitButton`. Es fijo, y es la
 * consignación.
 *
 * Hubo una versión que mostraba el último flujo que esa persona había abierto.
 * Se cambió: un botón que dice algo distinto cada vez que se mira deja de ser
 * un punto de partida y pasa a ser un historial, y el lanzador existe
 * justamente para quien todavía no sabe a dónde ir. Además el que ganaba en la
 * práctica era el último abierto por casualidad —quedó mostrando "Nuevo
 * contrato"—, que es el flujo que MENOS se puede empezar en frío: necesita una
 * postulación aprobada.
 *
 * La consignación es lo contrario: es lo único que arranca sin venir de ningún
 * contexto previo —llama un propietario y se abre de cero— y es la puerta de
 * entrada de todo lo demás, porque sin inmueble consignado no hay postulación,
 * ni evaluación, ni contrato.
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
