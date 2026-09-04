'use client';

/**
 * navigation-source — federated search over the panel's own navigation:
 * every sidebar destination, every module screen (the tabs) and the in-page
 * actions each destination contains (e.g. Inmuebles → "Nueva consignación",
 * Equipo → "Nuevo agente").
 *
 * The catalog is static and mirrors `src/lib/nav/arquitectura-del-panel.ts`
 * (same deliberate duplication as QUICK_ACTIONS in CommandPalette — no runtime
 * import from a layout). Keep the three in sync when the nav changes. The
 * `context` column is the GROUP or MODULE of the new architecture (Captación y
 * arriendo · Operación · Dinero · Directorio, or the owning module), so what
 * the palette says matches what the sidebar and the tabs say.
 *
 * Per-item permission gating uses ctx.canAccess when provided; items with
 * `module: null` are visible to every role (their pages self-guard).
 */

import type { SearchSource, SearchResult } from '@/lib/hooks/useFederatedSearch';
import { Compass } from '@phosphor-icons/react';

interface NavEntry {
  /** Label as shown in the sidebar / tab / page. */
  title: string;
  /** Group or module of the architecture (pages) or parent page (actions). */
  context: string;
  href: string;
  /** Extra search terms (synonyms, OLD names) — matched but never shown. */
  keywords?: string;
  /** Permission gate, mirrors the nav item's module (null = everyone). */
  permission?: { module: string; action: string };
  /** Actions get an "Acción" badge; pages a "Página" badge. */
  kind: 'page' | 'action';
}

const P = '/panel/inmobiliaria';

const NAV_CATALOG: NavEntry[] = [
  // ── Cabecera ──────────────────────────────────────────────────────────────
  { kind: 'page', title: 'Inicio', context: 'Inicio', href: `${P}/piloto`, keywords: 'inicio piloto automatico torre control bandeja briefing autonomia agentes home' },
  { kind: 'page', title: 'Chat', context: 'Inicio', href: P, keywords: 'asistente chat ia preguntar' },

  // ── Captación y arriendo ──────────────────────────────────────────────────
  { kind: 'page', title: 'Pipeline', context: 'Captación y arriendo', href: `${P}/pipeline`, keywords: 'prospeccion leads captacion kanban', permission: { module: 'pipeline', action: 'view' } },
  { kind: 'page', title: 'Inmuebles', context: 'Captación y arriendo', href: `${P}/inmuebles`, keywords: 'propiedades apartamentos casas portafolio consignaciones inventario', permission: { module: 'portafolio', action: 'view' } },
  // No hay "Nueva propiedad": una inmobiliaria nunca administra un inmueble sin
  // propietario, así que entrar uno es siempre una consignación.
  { kind: 'action', title: 'Nueva consignación', context: 'Inmuebles', href: `${P}/inmuebles/nuevo`, keywords: 'crear consignar propiedad inmueble publicar', permission: { module: 'portafolio', action: 'create' } },
  { kind: 'action', title: 'Importar propiedades', context: 'Inmuebles', href: `${P}/inmuebles/importar`, keywords: 'importar excel csv masivo', permission: { module: 'portafolio', action: 'create' } },
  { kind: 'page', title: 'Avalúos', context: 'Inmuebles', href: `${P}/inmuebles/avaluos`, keywords: 'valoracion precio canon avaluo ia', permission: { module: 'avaluos', action: 'view' } },
  { kind: 'action', title: 'Solicitar avalúo', context: 'Avalúos', href: `${P}/inmuebles/avaluos`, keywords: 'crear avaluo valoracion solicitar nuevo', permission: { module: 'avaluos', action: 'create' } },
  { kind: 'page', title: 'Postulaciones', context: 'Captación y arriendo', href: `${P}/postulaciones`, keywords: 'candidatos aplicaciones solicitudes recorrido' },
  { kind: 'page', title: 'Matching', context: 'Postulaciones', href: `${P}/postulaciones/matching`, keywords: 'buscar propiedades perfil compatibles ia', permission: { module: 'matching', action: 'view' } },
  { kind: 'page', title: 'Evaluación de candidatos', context: 'Postulaciones', href: `${P}/postulaciones/estudio`, keywords: 'estudio scoring evaluacion candidato riesgo ia', permission: { module: 'estudio', action: 'view' } },
  { kind: 'page', title: 'Soportes', context: 'Postulaciones', href: `${P}/postulaciones/soportes`, keywords: 'soportes de candidatos documentos revision papeles', permission: { module: 'documentos', action: 'view' } },
  { kind: 'page', title: 'Asegurabilidad', context: 'Postulaciones', href: `${P}/postulaciones/asegurabilidad`, keywords: 'cotizador seguros polizas garantias afianzable', permission: { module: 'cotizador', action: 'view' } },
  { kind: 'page', title: 'Contratos', context: 'Captación y arriendo', href: `${P}/contratos`, keywords: 'arriendos leasing', permission: { module: 'contratos', action: 'view' } },
  // Al listado, no a /contratos/nuevo: esa pantalla exige `?applicationId=` y
  // desde el buscador no hay de dónde sacarlo.
  { kind: 'action', title: 'Nuevo contrato', context: 'Contratos', href: `${P}/contratos`, keywords: 'crear contrato arriendo', permission: { module: 'contratos', action: 'create' } },
  { kind: 'action', title: 'Migrar contratos', context: 'Contratos', href: `${P}/contratos/migrar`, keywords: 'importar traer contratos cartera excel', permission: { module: 'contratos', action: 'create' } },
  { kind: 'page', title: 'Renovaciones', context: 'Contratos', href: `${P}/contratos/renovaciones`, keywords: 'renovar incremento ipc vencimiento', permission: { module: 'operaciones', action: 'view' } },

  // ── Operación ─────────────────────────────────────────────────────────────
  { kind: 'page', title: 'Mantenimientos', context: 'Operación', href: `${P}/mantenimientos`, keywords: 'reparaciones arreglos operaciones', permission: { module: 'operaciones', action: 'view' } },
  { kind: 'page', title: 'Solicitudes', context: 'Operación', href: `${P}/solicitudes`, keywords: 'pqrs peticiones quejas reclamos soporte' },
  { kind: 'page', title: 'Mensajes', context: 'Operación', href: `${P}/mensajes`, keywords: 'chat conversaciones inbox' },
  { kind: 'page', title: 'Agenda', context: 'Operación', href: `${P}/agenda`, keywords: 'calendario citas visitas' },

  // ── Dinero ────────────────────────────────────────────────────────────────
  { kind: 'page', title: 'Cobros', context: 'Dinero', href: `${P}/cobros`, keywords: 'recaudo pagos recibir recibo de caja abono', permission: { module: 'cobros', action: 'view' } },
  { kind: 'page', title: 'Recaudo', context: 'Cobros', href: `${P}/cobros/recaudo`, keywords: 'recaudo cuanto llego disponible mensual recibos', permission: { module: 'cobros', action: 'view' } },
  { kind: 'page', title: 'Cartera', context: 'Cobros', href: `${P}/cobros/cartera`, keywords: 'cartera mora edades deuda vencido', permission: { module: 'cobros', action: 'view' } },
  { kind: 'page', title: 'Cobranza', context: 'Cobros', href: `${P}/cobros/cobranza`, keywords: 'deudores cartera mora agente ia llamadas acuerdos', permission: { module: 'cobranza', action: 'view' } },
  { kind: 'page', title: 'Reglas de mora', context: 'Cobros', href: `${P}/cobros/reglas-de-mora`, keywords: 'mora interes gasto administrativo plazo reglas cobro', permission: { module: 'cobros', action: 'view' } },
  { kind: 'page', title: 'Pagos', context: 'Dinero', href: `${P}/pagos`, keywords: 'agente ia pagos por aprobar facturas proveedores recaudos transacciones' },
  { kind: 'page', title: 'Liquidaciones', context: 'Pagos', href: `${P}/pagos/liquidaciones`, keywords: 'tesoreria caja bancos saldos egresos neto propietarios' },
  { kind: 'page', title: 'Dispersiones', context: 'Pagos', href: `${P}/pagos/dispersiones`, keywords: 'giros transferencias propietarios', permission: { module: 'dispersiones', action: 'view' } },
  { kind: 'page', title: 'Lotes al banco', context: 'Dispersiones', href: `${P}/pagos/dispersiones/lotes`, keywords: 'lote archivo plano bancolombia pab codigo aprobacion pagos masivos', permission: { module: 'dispersiones', action: 'view' } },
  { kind: 'page', title: 'Facturación', context: 'Dinero', href: `${P}/facturacion`, keywords: 'facturas cobrar dian' },
  { kind: 'page', title: 'Conciliación', context: 'Dinero', href: `${P}/conciliacion`, keywords: 'conciliacion bancos extractos pagos ia' },
  { kind: 'page', title: 'Extracto bancario', context: 'Conciliación', href: `${P}/conciliacion/movimientos`, keywords: 'conciliacion bancaria extracto banco movimientos recibos automaticos', permission: { module: 'cobros', action: 'view' } },
  { kind: 'page', title: 'Contabilidad', context: 'Dinero', href: `${P}/contabilidad`, keywords: 'puc cuentas asientos partida doble balance de prueba libro auxiliar estado de cuenta cierre contabilidad general' },
  { kind: 'page', title: 'Mapeo contable', context: 'Contabilidad', href: `${P}/contabilidad/mapeo`, keywords: 'contabilidad mapeo cuentas asientos automaticos puc eventos' },
  { kind: 'action', title: 'Migrar el plan de cuentas (PUC)', context: 'Contabilidad', href: `${P}/migracion/puc`, keywords: 'importar puc cuentas contabilidad excel', permission: { module: 'configuracion', action: 'view' } },
  { kind: 'action', title: 'Migrar registros contables', context: 'Contabilidad', href: `${P}/migracion/contables`, keywords: 'importar asientos apertura saldos contabilidad excel', permission: { module: 'configuracion', action: 'view' } },

  // ── Directorio ────────────────────────────────────────────────────────────
  { kind: 'page', title: 'Propietarios', context: 'Directorio', href: `${P}/propietarios`, keywords: 'dueños landlords', permission: { module: 'propietarios', action: 'view' } },
  { kind: 'page', title: 'Inquilinos', context: 'Directorio', href: `${P}/inquilinos`, keywords: 'arrendatarios tenants quien vive', permission: { module: 'contratos', action: 'view' } },
  { kind: 'action', title: 'Migrar propietarios e inquilinos', context: 'Directorio', href: `${P}/migracion/terceros`, keywords: 'importar traer terceros propietarios inquilinos excel', permission: { module: 'configuracion', action: 'view' } },
  { kind: 'page', title: 'Documentos', context: 'Directorio', href: `${P}/documentos`, keywords: 'archivos adjuntos actas plantillas', permission: { module: 'documentos', action: 'view' } },

  // ── Pie ───────────────────────────────────────────────────────────────────
  { kind: 'page', title: 'Reportes', context: 'Reportes', href: `${P}/reportes`, keywords: 'informes estadisticas', permission: { module: 'reportes', action: 'view' } },
  { kind: 'page', title: 'Resumen del negocio', context: 'Reportes', href: `${P}/reportes/resumen`, keywords: 'dashboard resumen indicadores kpi', permission: { module: 'dashboard', action: 'view' } },
  { kind: 'page', title: 'Rentabilidad', context: 'Reportes', href: `${P}/reportes/rentabilidad`, keywords: 'rentabilidad margen ingresos egresos', permission: { module: 'reportes', action: 'view' } },
  { kind: 'page', title: 'Desempeño IA', context: 'Reportes', href: `${P}/reportes/ia`, keywords: 'analytics analitica metricas ia agentes desempeño', permission: { module: 'analytics', action: 'view' } },
  { kind: 'page', title: 'Configuración', context: 'Configuración', href: `${P}/configuracion`, keywords: 'ajustes settings plan cuenta' },
  { kind: 'page', title: 'Medios de pago', context: 'Configuración', href: `${P}/configuracion/medios-de-pago`, keywords: 'medios de pago transferencia efectivo pse nequi enlace cobre', permission: { module: 'configuracion', action: 'view' } },
  { kind: 'page', title: 'Equipo', context: 'Configuración', href: `${P}/configuracion/equipo`, keywords: 'agentes usuarios miembros equipo humano', permission: { module: 'agentes', action: 'view' } },
  { kind: 'action', title: 'Nuevo agente', context: 'Equipo', href: `${P}/configuracion/equipo`, keywords: 'invitar crear agente miembro equipo', permission: { module: 'agentes', action: 'create' } },
  { kind: 'page', title: 'Automatización IA', context: 'Configuración', href: `${P}/configuracion/ia`, keywords: 'aprendizaje del asistente entrenamiento memoria ia lecciones' },
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
        // Sólo las acciones llevan chip. El «Página» que llevaban las páginas
        // no decía nada que el grupo «Navegación» y el contexto de la derecha
        // no dijeran ya, y le ponía una cápsula a cada fila de la lista.
        badges:
          entry.kind === 'action' ? [{ label: 'Acción', color: 'violet' as const }] : [],
        href: entry.href,
        preview: { type: entry.kind === 'action' ? 'accion' : 'pagina' },
      }));
  },
};
