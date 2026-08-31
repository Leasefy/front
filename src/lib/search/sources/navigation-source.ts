'use client';

/**
 * navigation-source — federated search over the panel's own navigation:
 * every sidebar destination plus the in-page actions each destination
 * contains (e.g. Consignaciones → "Nueva consignación", Equipo → "Nuevo agente").
 *
 * The catalog is static and mirrors ALL_NAV_ITEMS in
 * src/app/panel/inmobiliaria/layout.tsx (same deliberate duplication as
 * QUICK_ACTIONS in CommandPalette — no runtime import from a layout).
 * Keep the three in sync when the nav changes.
 *
 * Per-item permission gating uses ctx.canAccess when provided; items with
 * `module: null` are visible to every role (their pages self-guard).
 */

import type { SearchSource, SearchResult } from '@/lib/hooks/useFederatedSearch';
import { Compass } from '@phosphor-icons/react';

interface NavEntry {
  /** Label as shown in the sidebar / page. */
  title: string;
  /** Sidebar section (pages) or parent page (actions) — shown as subtitle. */
  context: string;
  href: string;
  /** Extra search terms (synonyms, old names) — matched but never shown. */
  keywords?: string;
  /** Permission gate, mirrors the nav item's module (null = everyone). */
  permission?: { module: string; action: string };
  /** Actions get an "Acción" badge; pages a "Página" badge. */
  kind: 'page' | 'action';
}

const NAV_CATALOG: NavEntry[] = [
  // ── Inicio ────────────────────────────────────────────────────────────────
  { kind: 'page', title: 'Inicio', context: 'Inicio', href: '/panel/inmobiliaria', keywords: 'home asistente chat' },

  // ── Agentes IA ────────────────────────────────────────────────────────────
  { kind: 'page', title: 'Piloto automático', context: 'Inicio', href: '/panel/inmobiliaria/piloto', keywords: 'inicio piloto automatico torre control bandeja briefing autonomia agentes' },
  { kind: 'page', title: 'Cobranza', context: 'Agentes IA', href: '/panel/inmobiliaria/ai/cobranza', keywords: 'deudores cartera mora', permission: { module: 'cobranza', action: 'view' } },
  { kind: 'page', title: 'Asegurabilidad', context: 'Agentes IA', href: '/panel/inmobiliaria/ai/asegurabilidad', keywords: 'cotizador seguros polizas garantias', permission: { module: 'cotizador', action: 'view' } },
  { kind: 'page', title: 'Avalúos', context: 'Agentes IA', href: '/panel/inmobiliaria/ai/avaluos', keywords: 'valoracion precio canon', permission: { module: 'avaluos', action: 'view' } },
  { kind: 'page', title: 'Conciliación', context: 'Agentes IA', href: '/panel/inmobiliaria/ai/conciliacion', keywords: 'bancos extractos pagos' },
  { kind: 'page', title: 'Estudio del inquilino', context: 'Agentes IA', href: '/panel/inmobiliaria/ai/estudio', keywords: 'scoring evaluacion candidato riesgo', permission: { module: 'estudio', action: 'view' } },
  { kind: 'page', title: 'Matching', context: 'Agentes IA', href: '/panel/inmobiliaria/ai/matching', keywords: 'buscar propiedades perfil', permission: { module: 'matching', action: 'view' } },
  { kind: 'page', title: 'Pagos', context: 'Agentes IA', href: '/panel/inmobiliaria/ai/pagos', keywords: 'recaudos transacciones' },
  { kind: 'page', title: 'Aprendizaje del asistente', context: 'Agentes IA', href: '/panel/inmobiliaria/ai/aprendizaje', keywords: 'entrenamiento memoria ia' },
  { kind: 'page', title: 'Postulaciones', context: 'Agentes IA', href: '/panel/inmobiliaria/postulaciones', keywords: 'candidatos aplicaciones solicitudes' },

  // ── Portafolio ────────────────────────────────────────────────────────────
  { kind: 'page', title: 'Inmuebles', context: 'Portafolio', href: '/panel/inmobiliaria/inmuebles', keywords: 'propiedades apartamentos casas', permission: { module: 'portafolio', action: 'view' } },
  // No hay "Nueva propiedad": una inmobiliaria nunca administra un inmueble sin
  // propietario, así que entrar uno es siempre una consignación (más abajo). La
  // entrada que había apuntaba a /publicar, el formulario del propietario, que
  // no pide dueño ni comisión — dejaba una ficha a medias.
  { kind: 'page', title: 'Contratos', context: 'Portafolio', href: '/panel/inmobiliaria/contratos', keywords: 'arriendos leasing', permission: { module: 'portafolio', action: 'view' } },
  // Al listado, no a /contratos/nuevo: esa pantalla exige `?applicationId=` y
  // desde el buscador no hay de dónde sacarlo. En el listado, el botón «Nuevo
  // contrato» pregunta sobre qué postulación aprobada se arma.
  { kind: 'action', title: 'Nuevo contrato', context: 'Contratos', href: '/panel/inmobiliaria/contratos', keywords: 'crear contrato arriendo', permission: { module: 'portafolio', action: 'create' } },
  { kind: 'page', title: 'Consignaciones', context: 'Portafolio', href: '/panel/inmobiliaria/inmuebles', keywords: 'portafolio inventario', permission: { module: 'portafolio', action: 'view' } },
  { kind: 'action', title: 'Nueva consignación', context: 'Consignaciones', href: '/panel/inmobiliaria/inmuebles/nuevo', keywords: 'crear consignar propiedad inmueble publicar', permission: { module: 'portafolio', action: 'create' } },
  { kind: 'action', title: 'Importar propiedades', context: 'Consignaciones', href: '/panel/inmobiliaria/inmuebles/importar', keywords: 'importar excel csv masivo', permission: { module: 'portafolio', action: 'create' } },
  { kind: 'page', title: 'Propietarios', context: 'Portafolio', href: '/panel/inmobiliaria/propietarios', keywords: 'dueños landlords', permission: { module: 'propietarios', action: 'view' } },
  { kind: 'page', title: 'Prospección (Pipeline)', context: 'Portafolio', href: '/panel/inmobiliaria/pipeline', keywords: 'leads captacion kanban', permission: { module: 'pipeline', action: 'view' } },
  { kind: 'page', title: 'Equipo', context: 'Portafolio', href: '/panel/inmobiliaria/agentes', keywords: 'agentes usuarios miembros', permission: { module: 'agentes', action: 'view' } },
  { kind: 'action', title: 'Nuevo agente', context: 'Equipo', href: '/panel/inmobiliaria/agentes', keywords: 'invitar crear agente miembro equipo', permission: { module: 'agentes', action: 'create' } },
  { kind: 'action', title: 'Solicitar avalúo', context: 'Avalúos', href: '/panel/inmobiliaria/ai/avaluos', keywords: 'crear avaluo valoracion solicitar nuevo', permission: { module: 'avaluos', action: 'create' } },

  // ── Finanzas ──────────────────────────────────────────────────────────────
  { kind: 'page', title: 'Cobros manuales', context: 'Finanzas', href: '/panel/inmobiliaria/cobros', keywords: 'recaudo pagos recibir', permission: { module: 'cobros', action: 'view' } },
  { kind: 'page', title: 'Dispersiones', context: 'Finanzas', href: '/panel/inmobiliaria/dispersiones', keywords: 'giros transferencias propietarios', permission: { module: 'dispersiones', action: 'view' } },
  { kind: 'page', title: 'Tesorería', context: 'Finanzas', href: '/panel/inmobiliaria/tesoreria', keywords: 'caja bancos saldos' },
  { kind: 'page', title: 'Facturación', context: 'Finanzas', href: '/panel/inmobiliaria/facturacion', keywords: 'facturas cobrar dian' },

  // ── Análisis ──────────────────────────────────────────────────────────────
  { kind: 'page', title: 'Dashboard', context: 'Análisis', href: '/panel/inmobiliaria/dashboard', keywords: 'resumen indicadores kpi' },
  { kind: 'page', title: 'Reportes', context: 'Análisis', href: '/panel/inmobiliaria/reportes', keywords: 'informes estadisticas', permission: { module: 'reportes', action: 'view' } },
  { kind: 'page', title: 'Métricas IA', context: 'Análisis', href: '/panel/inmobiliaria/analytics', keywords: 'analytics analitica agentes', permission: { module: 'analytics', action: 'view' } },

  // ── Operaciones ───────────────────────────────────────────────────────────
  { kind: 'page', title: 'Mantenimientos', context: 'Operaciones', href: '/panel/inmobiliaria/operaciones', keywords: 'reparaciones arreglos operaciones', permission: { module: 'operaciones', action: 'view' } },
  { kind: 'page', title: 'PQRS', context: 'Operaciones', href: '/panel/inmobiliaria/pqrs', keywords: 'peticiones quejas reclamos soporte' },
  { kind: 'page', title: 'Agenda', context: 'Operaciones', href: '/panel/inmobiliaria/agenda', keywords: 'calendario citas visitas' },
  { kind: 'page', title: 'Mensajes', context: 'Operaciones', href: '/panel/inmobiliaria/mensajes', keywords: 'chat conversaciones inbox' },
  { kind: 'page', title: 'Documentos', context: 'Operaciones', href: '/panel/inmobiliaria/documentos', keywords: 'archivos adjuntos', permission: { module: 'documentos', action: 'view' } },
  { kind: 'page', title: 'Configuración', context: 'Operaciones', href: '/panel/inmobiliaria/configuracion', keywords: 'ajustes settings plan cuenta' },
];

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export const navigationSource: SearchSource = {
  id: 'navegacion',
  labelKey: 'inmobiliaria.commandPalette.sources.navegacion',
  icon: Compass,

  async run(query, ctx) {
    const q = norm(query);
    return NAV_CATALOG.filter((entry) => {
      if (entry.permission && ctx.canAccess && !ctx.canAccess(entry.permission.module, entry.permission.action)) {
        return false;
      }
      return (
        norm(entry.title).includes(q) ||
        norm(entry.context).includes(q) ||
        (entry.keywords ? norm(entry.keywords).includes(q) : false)
      );
    })
      .slice(0, 8)
      .map((entry): SearchResult => ({
        id: `navegacion:${entry.href}:${entry.title}`,
        sourceId: 'navegacion',
        type: entry.kind === 'action' ? 'accion' : 'pagina',
        title: entry.title,
        subtitle: entry.context,
        badges: [
          entry.kind === 'action'
            ? { label: 'Acción', color: 'violet' as const }
            : { label: 'Página', color: 'neutral' as const },
        ],
        href: entry.href,
        preview: { type: entry.kind === 'action' ? 'accion' : 'pagina' },
      }));
  },
};
