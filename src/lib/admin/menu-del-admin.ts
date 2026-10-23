/**
 * El menú del admin, con la forma del menú de la plataforma (Cadence).
 *
 * Nico, 19-10-2026: «nuestro admin tiene todo un diseño anterior que era de
 * Nest, necesito que todo esté con el diseño pero de CADENCE, TODO». Antes el
 * menú era una columna de 40 filas con un código (`00`…`38`) y una pista en
 * inglés debajo de cada nombre. Ahora es el `PlanSidebar` de la plataforma:
 * secciones plegables, un ícono por fila y el nombre en español.
 *
 * La LISTA de pantallas sigue viviendo en `NAV_ITEMS` (`components/admin/Nav.tsx`)
 * y este archivo sólo le pone sección, ícono y nombre a cada `href`. Así una
 * pantalla nueva que alguien agregue a `NAV_ITEMS` en otra rama (el Maestro,
 * en `account-manager`) aparece sola en el menú sin chocar con este archivo:
 * si todavía no tiene datos acá, cae en «Otras» con su nombre de `NAV_ITEMS`.
 */

import type { Icon } from '@phosphor-icons/react'
import {
  AirTrafficControl,
  Binoculars,
  Buildings,
  Calculator,
  Certificate,
  ChartLineUp,
  ChatsCircle,
  ChatText,
  Coins,
  CreditCard,
  Flag,
  Flask,
  GraduationCap,
  HandCoins,
  Heartbeat,
  HouseLine,
  IdentificationCard,
  Key,
  ListChecks,
  PhoneCall,
  Power,
  PuzzlePiece,
  Receipt,
  Robot,
  RocketLaunch,
  Scales,
  SealCheck,
  ShieldCheck,
  SquaresFour,
  Stack,
  Tag,
  Target,
  ThumbsUp,
  Timer,
  BellSlash,
  UserCirclePlus,
  UsersThree,
  UserSwitch,
  Wallet,
  WarningOctagon,
} from '@phosphor-icons/react'

import type { NavItem } from '@/components/ui/plan/PlanSidebar'

/** Las secciones del menú, en el orden en que se pintan. */
export const SECCIONES_DEL_ADMIN = [
  { clave: 'inmobiliarias', nombre: 'Inmobiliarias' },
  { clave: 'agentes', nombre: 'Agentes e IA' },
  { clave: 'cobranza', nombre: 'Cobranza' },
  { clave: 'plata', nombre: 'Plata' },
  { clave: 'productos', nombre: 'Productos' },
  { clave: 'cumplimiento', nombre: 'Cumplimiento' },
  { clave: 'sistema', nombre: 'Sistema' },
  { clave: 'otras', nombre: 'Otras' },
] as const

export type SeccionDelAdmin = (typeof SECCIONES_DEL_ADMIN)[number]['clave']

export interface DatosDeLaPantalla {
  /** `null` = fila suelta arriba de todo (sólo el Resumen). */
  seccion: SeccionDelAdmin | null
  icono: Icon
  /** Nombre en el menú, en el buscador y en la miga de la cabecera. */
  nombre: string
  /** Qué hay adentro, en una línea: lo muestra el buscador (⌘K). */
  queHay: string
}

/**
 * Sección, ícono y nombre de cada pantalla. El orden dentro de cada sección
 * es el de este objeto (no el de `NAV_ITEMS`): lo que más se usa, primero.
 */
export const PANTALLAS_DEL_ADMIN: Record<string, DatosDeLaPantalla> = {
  '/admin': { seccion: null, icono: SquaresFour, nombre: 'Resumen', queHay: 'La operación de hoy de un vistazo' },

  '/admin/tenants': { seccion: 'inmobiliarias', icono: Buildings, nombre: 'Inmobiliarias', queHay: 'Cada inmobiliaria, su plan y su actividad' },
  '/admin/onboarding': { seccion: 'inmobiliarias', icono: RocketLaunch, nombre: 'Inmobiliarias nuevas', queHay: 'Cómo arrancan las inmobiliarias' },
  '/admin/registration-profiles': { seccion: 'inmobiliarias', icono: UserCirclePlus, nombre: 'Perfiles de registro', queHay: 'Qué perfiles se pueden registrar' },
  '/admin/plans': { seccion: 'inmobiliarias', icono: Stack, nombre: 'Planes', queHay: 'El catálogo de planes de las inmobiliarias' },
  '/admin/pricing-config': { seccion: 'inmobiliarias', icono: Tag, nombre: 'Precios', queHay: 'El modelo de cobro a las inmobiliarias' },
  '/admin/modulos-pagos': { seccion: 'inmobiliarias', icono: PuzzlePiece, nombre: 'Módulos', queHay: 'Qué módulo de pago compró cada una' },
  '/admin/agency-targets': { seccion: 'inmobiliarias', icono: Target, nombre: 'Metas', queHay: 'Metas mensuales por inmobiliaria' },
  '/admin/feature-flags': { seccion: 'inmobiliarias', icono: Flag, nombre: 'Banderas', queHay: 'Funciones prendidas por inmobiliaria' },
  '/admin/kill-switch': { seccion: 'inmobiliarias', icono: Power, nombre: 'Pausa de emergencia', queHay: 'Pausar los agentes de una inmobiliaria' },

  '/admin/piloto': { seccion: 'agentes', icono: AirTrafficControl, nombre: 'Piloto automático', queHay: 'En prueba, contratado o apagado' },
  '/admin/agents': { seccion: 'agentes', icono: Robot, nombre: 'Agentes de voz', queHay: 'Las instrucciones de cada agente' },
  '/admin/maestro': { seccion: 'agentes', icono: GraduationCap, nombre: 'Maestro', queHay: 'Lo que aprende de todas las Nairas' },
  '/admin/chat-preguntas': { seccion: 'agentes', icono: ChatsCircle, nombre: 'Preguntas del chat', queHay: 'Qué pregunta la gente y qué falta' },
  '/admin/chat-feedback': { seccion: 'agentes', icono: ThumbsUp, nombre: 'Pulgares del chat', queHay: 'Dónde falla el chat' },
  '/admin/qa': { seccion: 'agentes', icono: ListChecks, nombre: 'Calidad de llamadas', queHay: 'Puntaje y alertas de cada llamada' },
  '/admin/ab-tests': { seccion: 'agentes', icono: Flask, nombre: 'Experimentos', queHay: 'Pruebas A/B de los agentes' },
  '/admin/templates': { seccion: 'agentes', icono: ChatText, nombre: 'Plantillas', queHay: 'Plantillas de WhatsApp por idioma' },

  '/admin/calls': { seccion: 'cobranza', icono: PhoneCall, nombre: 'Llamadas', queHay: 'Todas las llamadas, de todas las inmobiliarias' },
  '/admin/cartera': { seccion: 'cobranza', icono: Wallet, nombre: 'Cartera', queHay: 'La cartera por etapa de cobro' },
  '/admin/approvals': { seccion: 'cobranza', icono: SealCheck, nombre: 'Aprobaciones', queHay: 'Lo que espera un visto bueno humano' },
  '/admin/escalations': { seccion: 'cobranza', icono: UserSwitch, nombre: 'Escalaciones', queHay: 'Casos que pasaron a una persona' },
  '/admin/debtors': { seccion: 'cobranza', icono: IdentificationCard, nombre: 'Deudores', queHay: 'Buscar un deudor en todas (datos personales)' },
  '/admin/opt-outs': { seccion: 'cobranza', icono: BellSlash, nombre: 'Bajas de contacto', queHay: 'Quién pidió no ser contactado' },

  '/admin/payments': { seccion: 'plata', icono: CreditCard, nombre: 'Pagos', queHay: 'El embudo de pagos en línea' },
  '/admin/recaudo-en-linea': { seccion: 'plata', icono: HandCoins, nombre: 'Recaudo en línea', queHay: 'Reporte de Wompi y liquidaciones' },
  '/admin/billing': { seccion: 'plata', icono: ChartLineUp, nombre: 'Ingresos', queHay: 'Lo que Leasefy cobra a cada inmobiliaria' },
  '/admin/costs': { seccion: 'plata', icono: Coins, nombre: 'Costos', queHay: 'Lo que cuesta operar la plataforma' },
  '/admin/exogena': { seccion: 'plata', icono: Receipt, nombre: 'Exógena', queHay: 'Conceptos por año y publicación' },

  '/admin/avaluos': { seccion: 'productos', icono: Certificate, nombre: 'Avalúos', queHay: 'Revisar y firmar certificados' },
  '/admin/cotizador': { seccion: 'productos', icono: Calculator, nombre: 'Cotizador', queHay: 'Aseguradoras y credenciales' },
  '/admin/inmuebles': { seccion: 'productos', icono: HouseLine, nombre: 'Inmuebles', queHay: 'Riesgo e historial interno' },

  '/admin/audits': { seccion: 'cumplimiento', icono: ShieldCheck, nombre: 'Auditoría', queHay: 'Eventos de cumplimiento' },
  '/admin/audit-explorer': { seccion: 'cumplimiento', icono: Binoculars, nombre: 'Buscar en auditoría', queHay: 'Consultas para SIC y SAGRILAFT' },
  '/admin/ley-2300': { seccion: 'cumplimiento', icono: Scales, nombre: 'Ley 2300', queHay: 'Ventanas y frecuencia de contacto' },

  '/admin/health': { seccion: 'sistema', icono: Heartbeat, nombre: 'Salud del sistema', queHay: 'Si cada servicio responde' },
  '/admin/inngest-monitor': { seccion: 'sistema', icono: Timer, nombre: 'Tareas programadas', queHay: 'Crons y flujos de Inngest' },
  '/admin/failed-states': { seccion: 'sistema', icono: WarningOctagon, nombre: 'Procesos fallidos', queHay: 'Lo que se cayó y espera a alguien' },
  '/admin/keys': { seccion: 'sistema', icono: Key, nombre: 'Llaves', queHay: 'Rotación de llaves cada 90 días' },
  '/admin/users': { seccion: 'sistema', icono: UsersThree, nombre: 'Equipo Leasefy', queHay: 'Quién entra al admin y qué hizo' },
}

/** Lo mínimo que hace falta de una fila de `NAV_ITEMS`. */
export interface PantallaListada {
  href: string
  label: string
  hint?: string
}

/** Los datos de una pantalla; las que no están en el mapa caen en «Otras». */
export function datosDeLaPantalla(item: PantallaListada): DatosDeLaPantalla {
  return (
    PANTALLAS_DEL_ADMIN[item.href] ?? {
      seccion: 'otras',
      icono: SquaresFour,
      nombre: item.label,
      queHay: item.hint ?? '',
    }
  )
}

/**
 * La pantalla a la que pertenece una ruta: la más específica que calce
 * (`/admin/agents/123` → Agentes de voz). `null` fuera del menú.
 */
export function pantallaDeLaRuta(
  ruta: string,
  items: readonly PantallaListada[],
): (PantallaListada & DatosDeLaPantalla) | null {
  let mejor: PantallaListada | null = null
  for (const item of items) {
    const calza = item.href === '/admin' ? ruta === '/admin' : ruta === item.href || ruta.startsWith(item.href + '/')
    if (calza && (!mejor || item.href.length > mejor.href.length)) mejor = item
  }
  return mejor ? { ...mejor, ...datosDeLaPantalla(mejor) } : null
}

/** El nombre de la sección de una pantalla («Cobranza»), o `null` para el Resumen. */
export function nombreDeLaSeccion(seccion: SeccionDelAdmin | null): string | null {
  if (!seccion) return null
  return SECCIONES_DEL_ADMIN.find((s) => s.clave === seccion)?.nombre ?? null
}

/**
 * La lista plana que entiende `PlanSidebar`: la fila suelta del Resumen y,
 * debajo, cada sección con su cabecera (`kind: 'section'`) y sus filas. Las
 * secciones vacías no se pintan (las descarta `agruparEnSecciones`).
 */
export function filasDelMenuDelAdmin(items: readonly PantallaListada[]): NavItem[] {
  const conDatos = items.map((item) => ({ item, datos: datosDeLaPantalla(item) }))
  const orden = Object.keys(PANTALLAS_DEL_ADMIN)
  const posicion = (href: string) => {
    const i = orden.indexOf(href)
    return i < 0 ? Number.MAX_SAFE_INTEGER : i
  }
  const fila = ({ item, datos }: (typeof conDatos)[number]): NavItem => ({
    label: datos.nombre,
    href: item.href,
    icon: datos.icono,
    exact: item.href === '/admin',
  })

  const filas: NavItem[] = conDatos.filter((x) => x.datos.seccion === null).map(fila)
  for (const seccion of SECCIONES_DEL_ADMIN) {
    const deLaSeccion = conDatos
      .filter((x) => x.datos.seccion === seccion.clave)
      .sort((a, b) => posicion(a.item.href) - posicion(b.item.href))
    if (deLaSeccion.length === 0) continue
    filas.push({
      kind: 'section',
      label: seccion.nombre,
      href: `#sec-${seccion.clave}`,
      icon: deLaSeccion[0]!.datos.icono,
    })
    filas.push(...deLaSeccion.map(fila))
  }
  return filas
}
