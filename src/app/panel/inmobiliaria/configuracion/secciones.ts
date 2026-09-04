import type { Icon } from '@phosphor-icons/react';
import {
  Bell,
  Brain,
  Buildings,
  CreditCard,
  Globe,
  Plugs,
  Shield,
  ShieldCheck,
  Users,
  Wallet,
} from '@phosphor-icons/react';

/**
 * Configuración: UNA sola, con su propia navegación interna.
 *
 * ── Por qué existe este archivo ─────────────────────────────────────────────
 *
 * Había dos puertas a lo mismo —la fila «Configuración» del sidebar y el ítem
 * «Configuración» del menú del perfil— y, adentro, dos niveles de navegación
 * turnándose: el riel de secciones del módulo (Configuración · Equipo ·
 * Agentes IA · Automatización IA) arriba y diez pestañas debajo. Nico:
 * «deberíamos quitar eso de Configuración del sidebar y setear todo en el
 * perfil… las de arriba no deberían estar arriba sino ser una tab de las que
 * ya hay». Así que Configuración salió de `arquitectura-del-panel.ts` (por eso
 * el riel se esconde solo: `moduloDeLaRuta` no la encuentra) y todo lo que
 * estaba arriba bajó a esta lista, que es la única fuente de la nav interna.
 *
 * ── Las reglas que sostiene ─────────────────────────────────────────────────
 *
 * · Cada sección es una URL de verdad (`/configuracion/<slug>`), así se puede
 *   compartir y volver con el botón atrás. La raíz `/configuracion` es Perfil.
 * · El `gate` de cada sección es EXACTAMENTE el que tenía su pantalla antes de
 *   la unificación: el grueso era `PageGuard adminOnly` (la página de tabs),
 *   Equipo era `module: 'agentes'` y Automatización IA no tenía guard (la veía
 *   todo miembro). Unificar no le abre a nadie una pantalla nueva ni le cierra
 *   una que tenía.
 * · «Agentes IA» y «Branding» no están: Nico pidió ocultarlas
 *   (`/configuracion/agentes` y `/configuracion/branding` redirigen a la
 *   raíz). El id de Branding sigue en `SeccionId` y su pantalla sigue viva en
 *   `contenido.tsx` — esconderla es sacarla del menú, no borrar el trabajo.
 */

export const RAIZ_CONFIGURACION = '/panel/inmobiliaria/configuracion';

export type SeccionId =
  | 'perfil'
  | 'branding'
  | 'facturacion'
  | 'equipo'
  | 'permisos'
  | 'medios-de-pago'
  | 'integraciones'
  | 'notificaciones'
  | 'preferencias'
  | 'seguridad'
  | 'ia';

export type GrupoDeConfiguracion = 'inmobiliaria' | 'equipo' | 'dinero' | 'sistema';

/**
 * Quién puede abrir la sección.
 *
 *   admin  → sólo el ADMIN de la agencia (lo que hacía `PageGuard adminOnly`).
 *   modulo → el gate granular de permisos (`canAccess(module, 'view')`).
 *   todos  → cualquier miembro; la pantalla se cuida sola.
 */
export type GateDeSeccion =
  | { tipo: 'admin' }
  | { tipo: 'modulo'; module: string }
  | { tipo: 'todos' };

export interface SeccionDeConfiguracion {
  id: SeccionId;
  grupo: GrupoDeConfiguracion;
  /** Segmento bajo `/configuracion`. Perfil vive en la raíz. */
  slug: string;
  labelKey: string;
  descKey: string;
  icon: Icon;
  gate: GateDeSeccion;
}

export interface GrupoDelMenu {
  id: GrupoDeConfiguracion;
  labelKey: string;
}

export const GRUPOS_DE_CONFIGURACION: readonly GrupoDelMenu[] = [
  { id: 'inmobiliaria', labelKey: 'inmobiliaria.config.grupos.inmobiliaria' },
  { id: 'equipo', labelKey: 'inmobiliaria.config.grupos.equipo' },
  { id: 'dinero', labelKey: 'inmobiliaria.config.grupos.dinero' },
  { id: 'sistema', labelKey: 'inmobiliaria.config.grupos.sistema' },
];

export const SECCIONES_DE_CONFIGURACION: readonly SeccionDeConfiguracion[] = [
  {
    id: 'perfil',
    grupo: 'inmobiliaria',
    slug: 'perfil',
    labelKey: 'inmobiliaria.config.tabs.perfil',
    descKey: 'inmobiliaria.config.tabs.perfilDesc',
    icon: Buildings,
    gate: { tipo: 'admin' },
  },
  {
    id: 'facturacion',
    grupo: 'inmobiliaria',
    slug: 'facturacion',
    labelKey: 'inmobiliaria.config.tabs.facturacion',
    descKey: 'inmobiliaria.config.tabs.facturacionDesc',
    icon: CreditCard,
    gate: { tipo: 'admin' },
  },
  {
    // La única lista de personas del panel: miembros, roles, estados e
    // invitaciones. Antes vivía en dos lugares (la pestaña «Usuarios» y la
    // pantalla «Equipo»), con dos formularios de invitación distintos.
    id: 'equipo',
    grupo: 'equipo',
    slug: 'equipo',
    labelKey: 'inmobiliaria.config.tabs.equipo',
    descKey: 'inmobiliaria.config.tabs.equipoDesc',
    icon: Users,
    gate: { tipo: 'modulo', module: 'agentes' },
  },
  {
    id: 'permisos',
    grupo: 'equipo',
    slug: 'permisos',
    labelKey: 'inmobiliaria.config.tabs.permisos',
    descKey: 'inmobiliaria.config.tabs.permisosDesc',
    icon: ShieldCheck,
    gate: { tipo: 'admin' },
  },
  {
    id: 'medios-de-pago',
    grupo: 'dinero',
    slug: 'medios-de-pago',
    labelKey: 'inmobiliaria.config.tabs.mediosDePago',
    descKey: 'inmobiliaria.config.tabs.mediosDePagoDesc',
    icon: Wallet,
    gate: { tipo: 'admin' },
  },
  {
    id: 'integraciones',
    grupo: 'sistema',
    slug: 'integraciones',
    labelKey: 'inmobiliaria.config.tabs.integraciones',
    descKey: 'inmobiliaria.config.tabs.integracionesDesc',
    icon: Plugs,
    gate: { tipo: 'admin' },
  },
  {
    id: 'notificaciones',
    grupo: 'sistema',
    slug: 'notificaciones',
    labelKey: 'inmobiliaria.config.tabs.notificaciones',
    descKey: 'inmobiliaria.config.tabs.notificacionesDesc',
    icon: Bell,
    gate: { tipo: 'admin' },
  },
  {
    id: 'preferencias',
    grupo: 'sistema',
    slug: 'preferencias',
    labelKey: 'inmobiliaria.config.tabs.preferencias',
    descKey: 'inmobiliaria.config.tabs.preferenciasDesc',
    icon: Globe,
    gate: { tipo: 'admin' },
  },
  {
    id: 'seguridad',
    grupo: 'sistema',
    slug: 'seguridad',
    labelKey: 'inmobiliaria.config.tabs.seguridad',
    descKey: 'inmobiliaria.config.tabs.seguridadDesc',
    icon: Shield,
    gate: { tipo: 'admin' },
  },
  {
    // Sin gate, como la pantalla que absorbe (`/configuracion/ia` no tenía
    // guard: la veía todo miembro).
    id: 'ia',
    grupo: 'sistema',
    slug: 'ia',
    labelKey: 'inmobiliaria.config.tabs.automatizacionIa',
    descKey: 'inmobiliaria.config.tabs.automatizacionIaDesc',
    icon: Brain,
    gate: { tipo: 'todos' },
  },
];

/** La que se abre en `/configuracion` a secas. */
export const SECCION_POR_DEFECTO: SeccionId = 'perfil';

/**
 * Enlaces viejos que llegan con `?tab=`.
 *
 * El buscador del panel (`src/lib/search/sources/navigation-source.ts`) todavía
 * apunta a `/configuracion?tab=medios-de-pago`, y los ids de las diez pestañas
 * de ayer coinciden con los slugs de hoy salvo «usuarios», que ahora es Equipo.
 */
const TAB_VIEJA: Record<string, SeccionId> = { usuarios: 'equipo' };

export function seccionPorId(id: SeccionId): SeccionDeConfiguracion {
  const s = SECCIONES_DE_CONFIGURACION.find((x) => x.id === id);
  if (!s) throw new Error(`Sección de configuración desconocida: ${id}`);
  return s;
}

export function seccionPorSlug(slug: string): SeccionDeConfiguracion | null {
  return SECCIONES_DE_CONFIGURACION.find((s) => s.slug === slug) ?? null;
}

/** Perfil vive en la raíz; el resto en su segmento. */
export function hrefDeSeccion(id: SeccionId): string {
  return id === SECCION_POR_DEFECTO ? RAIZ_CONFIGURACION : `${RAIZ_CONFIGURACION}/${seccionPorId(id).slug}`;
}

/**
 * La sección que corresponde a una URL del panel, o null si la ruta no es de
 * Configuración. La ficha de un miembro (`/configuracion/equipo/<id>`)
 * pertenece a Equipo.
 */
export function seccionDeLaRuta(pathname: string): SeccionDeConfiguracion | null {
  const ruta = (pathname.split('?')[0] ?? pathname).replace(/\/+$/, '');
  if (ruta === RAIZ_CONFIGURACION) return seccionPorId(SECCION_POR_DEFECTO);
  if (!ruta.startsWith(`${RAIZ_CONFIGURACION}/`)) return null;
  const segmento = ruta.slice(RAIZ_CONFIGURACION.length + 1).split('/')[0] ?? '';
  return seccionPorSlug(segmento);
}

/** ¿La URL es la ficha de un miembro? Ahí la nav de settings estorba. */
export function esFichaDeMiembro(pathname: string): boolean {
  const ruta = (pathname.split('?')[0] ?? pathname).replace(/\/+$/, '');
  return new RegExp(`^${RAIZ_CONFIGURACION}/equipo/[^/]+$`).test(ruta);
}

/**
 * A dónde mandar un `/configuracion?seccion=X` o `?tab=X` viejo. `null` = la
 * URL ya es la buena (o el parámetro no dice nada) y no hay que moverse.
 */
export function destinoDeParametrosViejos(params: { get(clave: string): string | null }): string | null {
  const crudo = params.get('seccion') ?? params.get('tab');
  if (!crudo) return null;
  const id = TAB_VIEJA[crudo] ?? seccionPorSlug(crudo)?.id;
  if (!id || id === SECCION_POR_DEFECTO) return null;
  return hrefDeSeccion(id);
}

export interface ContextoDePermisos {
  isAdmin: boolean;
  canAccess: (module: string, action: string) => boolean;
}

export function puedeVerSeccion(seccion: SeccionDeConfiguracion, ctx: ContextoDePermisos): boolean {
  if (seccion.gate.tipo === 'todos') return true;
  if (ctx.isAdmin) return true;
  if (seccion.gate.tipo === 'admin') return false;
  return ctx.canAccess(seccion.gate.module, 'view');
}

export function seccionesVisibles(ctx: ContextoDePermisos): SeccionDeConfiguracion[] {
  return SECCIONES_DE_CONFIGURACION.filter((s) => puedeVerSeccion(s, ctx));
}

/** Los grupos que quedan con al menos una sección visible, en orden. */
export function menuDeConfiguracion(ctx: ContextoDePermisos): Array<{ grupo: GrupoDelMenu; secciones: SeccionDeConfiguracion[] }> {
  const visibles = seccionesVisibles(ctx);
  return GRUPOS_DE_CONFIGURACION.map((grupo) => ({
    grupo,
    secciones: visibles.filter((s) => s.grupo === grupo.id),
  })).filter((g) => g.secciones.length > 0);
}
