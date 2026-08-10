/**
 * filterAgencyNav — per-role sidebar visibility must match the backend
 * permission matrix (AGENCY_ROLE_DEFAULTS). The nav array below mirrors the
 * (audited/fixed) gates in src/app/panel/inmobiliaria/layout.tsx.
 */
import { describe, it, expect } from 'vitest';
import { House } from '@phosphor-icons/react';
import { filterAgencyNav, type NavItemWithModule } from './agency-nav-filter';

// View-access per role, transcribed from the backend AGENCY_ROLE_DEFAULTS matrix.
// (ADMIN bypasses everything and is handled separately.)
const VIEW: Record<'AGENTE' | 'CONTADOR' | 'VIEWER', Record<string, boolean>> = {
  AGENTE: {
    dashboard: true, propietarios: true, portafolio: true, pipeline: true, agentes: true,
    cobros: true, dispersiones: false, operaciones: true, reportes: false, configuracion: false,
    documentos: true, analytics: false, contratos: true,
  },
  CONTADOR: {
    dashboard: true, propietarios: true, portafolio: false, pipeline: false, agentes: false,
    cobros: true, dispersiones: true, operaciones: true, reportes: true, configuracion: false,
    documentos: true, analytics: true, contratos: true,
  },
  VIEWER: {
    dashboard: true, propietarios: true, portafolio: true, pipeline: false, agentes: false,
    cobros: true, dispersiones: false, operaciones: true, reportes: true, configuracion: false,
    documentos: true, analytics: false, contratos: true,
  },
};

type Role = 'ADMIN' | 'AGENTE' | 'CONTADOR' | 'VIEWER' | null;

/** Mirrors PermissionsContext.canAccess: isAdmin ⇒ true; loading ⇒ false. */
function ctxFor(role: Role) {
  const isAdmin = role === 'ADMIN';
  return {
    isAdmin,
    agencyRole: role,
    canAccess: (module: string, _action: string) => {
      if (isAdmin) return true;
      if (role === null) return false; // permissions still loading
      return VIEW[role][module] ?? false;
    },
  };
}

// Nav array mirroring the layout's gates (agency modules + finance role gates +
// one always-visible item + section headers to exercise the section-drop).
// icon/href are filled in with a shared default (irrelevant to the filter).
const RAW: Array<Partial<NavItemWithModule> & { label: string }> = [
  { label: 'inicio', module: null },
  { kind: 'section', label: 'sec-portafolio' },
  { label: 'propiedades', module: 'portafolio' },
  { label: 'contratos', module: 'contratos' },
  { label: 'portafolio', module: 'portafolio' },
  { label: 'propietarios', module: 'propietarios' },
  { label: 'pipeline', module: 'pipeline' },
  { label: 'equipo', module: 'agentes' },
  { kind: 'section', label: 'sec-finanzas' },
  { label: 'cobros', module: 'cobros' },
  { label: 'dispersiones', module: 'dispersiones' },
  { label: 'tesoreria', module: null, roles: ['ADMIN', 'CONTADOR'] },
  { label: 'facturacion', module: null, roles: ['ADMIN', 'CONTADOR'] },
  { kind: 'section', label: 'sec-analisis' },
  { label: 'dashboard', module: 'dashboard' },
  { label: 'reportes', module: 'reportes' },
  { label: 'analitica', module: 'analytics' },
  { label: 'operaciones', module: 'operaciones' },
  { label: 'documentos', module: 'documentos' },
  { label: 'configuracion', module: 'configuracion' },
];

const NAV: NavItemWithModule[] = RAW.map((r) => ({ href: '/x', icon: House, ...r }));

const visibleLabels = (role: Role) =>
  filterAgencyNav(NAV, ctxFor(role))
    .filter((i) => i.kind !== 'section')
    .map((i) => i.label);

describe('filterAgencyNav — per-role visible tabs', () => {
  it('ADMIN sees everything', () => {
    expect(visibleLabels('ADMIN')).toEqual([
      'inicio', 'propiedades', 'contratos', 'portafolio', 'propietarios', 'pipeline',
      'equipo', 'cobros', 'dispersiones', 'tesoreria', 'facturacion', 'dashboard',
      'reportes', 'analitica', 'operaciones', 'documentos', 'configuracion',
    ]);
  });

  it('AGENTE sees operational modules, NOT finance/reports/analytics/config', () => {
    const v = visibleLabels('AGENTE');
    expect(v).toContain('propiedades');
    expect(v).toContain('contratos');
    expect(v).toContain('pipeline');
    expect(v).toContain('equipo');
    expect(v).toContain('cobros');
    expect(v).toContain('operaciones');
    expect(v).toContain('documentos');
    expect(v).toContain('dashboard');
    // Hidden:
    expect(v).not.toContain('dispersiones');
    expect(v).not.toContain('reportes');
    expect(v).not.toContain('analitica');
    expect(v).not.toContain('tesoreria');
    expect(v).not.toContain('facturacion');
    expect(v).not.toContain('configuracion');
  });

  it('CONTADOR sees finance + reports + contratos(read), NOT portafolio/pipeline/agentes/config', () => {
    const v = visibleLabels('CONTADOR');
    expect(v).toContain('cobros');
    expect(v).toContain('dispersiones');
    expect(v).toContain('tesoreria');
    expect(v).toContain('facturacion');
    expect(v).toContain('reportes');
    expect(v).toContain('analitica');
    expect(v).toContain('dashboard');
    expect(v).toContain('contratos'); // the FIX — was hidden by the old 'portafolio' gate
    expect(v).toContain('propietarios');
    expect(v).toContain('operaciones');
    expect(v).toContain('documentos');
    // Hidden:
    expect(v).not.toContain('propiedades');
    expect(v).not.toContain('portafolio');
    expect(v).not.toContain('pipeline');
    expect(v).not.toContain('equipo');
    expect(v).not.toContain('configuracion');
  });

  it('VIEWER sees only its read modules', () => {
    const v = visibleLabels('VIEWER');
    expect(v).toContain('propiedades');
    expect(v).toContain('portafolio');
    expect(v).toContain('contratos');
    expect(v).toContain('propietarios');
    expect(v).toContain('cobros');
    expect(v).toContain('reportes');
    expect(v).toContain('operaciones');
    expect(v).toContain('documentos');
    expect(v).toContain('dashboard');
    // Hidden:
    expect(v).not.toContain('pipeline');
    expect(v).not.toContain('equipo');
    expect(v).not.toContain('dispersiones');
    expect(v).not.toContain('analitica');
    expect(v).not.toContain('tesoreria');
    expect(v).not.toContain('facturacion');
    expect(v).not.toContain('configuracion');
  });

  it('NO ONE except ADMIN sees Configuración', () => {
    expect(visibleLabels('AGENTE')).not.toContain('configuracion');
    expect(visibleLabels('CONTADOR')).not.toContain('configuracion');
    expect(visibleLabels('VIEWER')).not.toContain('configuracion');
    expect(visibleLabels('ADMIN')).toContain('configuracion');
  });
});

describe('filterAgencyNav — fail-closed while permissions load', () => {
  it('shows ONLY ungated items and drops emptied section headers when loading', () => {
    const result = filterAgencyNav(NAV, ctxFor(null));
    // Only the ungated 'inicio' survives; every section header is dropped
    // because its following items were all gated away.
    expect(result.map((i) => i.label)).toEqual(['inicio']);
  });
})

describe('filterAgencyNav — el agente no contestó ≠ no tenés permiso', () => {
  // `cobranza` y `cotizador` fallan cerrado a propósito. Distinguimos las dos
  // razones por las que `canAccess` devuelve false: «el agente dijo que no»
  // (se oculta) y «no pudimos preguntar» (se muestra, y la pantalla explica).
  // Mismo armado que NAV arriba: href/icon son obligatorios en NavItem y no
  // aportan nada al gate, así que se rellenan igual para todas las filas.
  const NAV_AGENTE: NavItemWithModule[] = [
    { label: 'inicio', module: null },
    { label: 'cobranza', module: 'cobranza' },
    { label: 'cotizador', module: 'cotizador' },
    { label: 'contratos', module: 'contratos' },
  ].map((r) => ({ href: '/x', icon: House, ...r }))
  const todoNegado = {
    canAccess: () => false,
    isAdmin: false,
    agencyRole: 'ADMIN' as const,
  }

  it('sin respuesta del agente, sus módulos SIGUEN en el menú', () => {
    const v = filterAgencyNav(NAV_AGENTE, { ...todoNegado, agentUnverified: true })
      .map((i) => i.label)
    expect(v).toContain('cobranza')
    expect(v).toContain('cotizador')
  })

  it('pero NO abre módulos del monolito: eso sigue siendo permiso', () => {
    const v = filterAgencyNav(NAV_AGENTE, { ...todoNegado, agentUnverified: true })
      .map((i) => i.label)
    expect(v).not.toContain('contratos')
  })

  it('con el agente resuelto y negando, se ocultan como siempre', () => {
    const v = filterAgencyNav(NAV_AGENTE, { ...todoNegado, agentUnverified: false })
      .map((i) => i.label)
    expect(v).not.toContain('cobranza')
    expect(v).not.toContain('cotizador')
  })
})
