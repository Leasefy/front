/**
 * Client-side search index for in-app navigation
 * Moved from mock-search.ts - this is a UI utility, not mock data
 */

export type SearchCategory =
  | 'property'
  | 'candidate'
  | 'contract'
  | 'lease'
  | 'payment'
  | 'application'
  | 'document'
  | 'message';

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: SearchCategory;
  href: string;
  icon?: string;
}

// Tenant search data
const TENANT_SEARCH_DATA: SearchResult[] = [
  { id: 'app-1', title: 'Apartamento Chapinero', subtitle: 'Aplicación en revisión', category: 'application', href: '/inquilino/aplicaciones' },
  { id: 'app-2', title: 'Studio Zona Rosa', subtitle: 'Aplicación pre-aprobada', category: 'application', href: '/inquilino/aplicaciones' },
  { id: 'pay-1', title: 'Pago Febrero 2026', subtitle: '$2,500,000 - Pendiente', category: 'payment', href: '/inquilino/pagos' },
  { id: 'pay-2', title: 'Pago Enero 2026', subtitle: '$2,500,000 - Pagado', category: 'payment', href: '/inquilino/pagos' },
  { id: 'doc-1', title: 'Contrato de Arrendamiento', subtitle: 'PDF - Firmado', category: 'document', href: '/inquilino/documentos' },
  { id: 'doc-2', title: 'Recibo Enero 2026', subtitle: 'PDF - Disponible', category: 'document', href: '/inquilino/documentos' },
  { id: 'lease-1', title: 'Mi Arriendo Actual', subtitle: 'Apartamento 501 - Chapinero', category: 'lease', href: '/inquilino/arriendo' },
  { id: 'msg-1', title: 'Nicolás Rodriguez', subtitle: 'Propietario - Último mensaje hace 2 días', category: 'message', href: '/inquilino/mensajes' },
];

// Landlord search data
const LANDLORD_SEARCH_DATA: SearchResult[] = [
  { id: 'prop-1', title: 'Apartamento Chapinero Alto', subtitle: 'Calle 85 #15-23 - 5 candidatos', category: 'property', href: '/panel/prop-001' },
  { id: 'prop-2', title: 'Studio Zona Rosa', subtitle: 'Carrera 13 #82-15 - 3 candidatos', category: 'property', href: '/panel/prop-002' },
  { id: 'prop-3', title: 'Casa Cedritos', subtitle: 'Calle 140 #10-45 - 2 candidatos', category: 'property', href: '/panel/prop-003' },
  { id: 'cand-1', title: 'María García', subtitle: 'Riesgo A - Chapinero Alto', category: 'candidate', href: '/panel/prop-001' },
  { id: 'cand-2', title: 'Juan Pérez', subtitle: 'Riesgo B - Studio Zona Rosa', category: 'candidate', href: '/panel/prop-002' },
  { id: 'cand-3', title: 'Ana Martínez', subtitle: 'Riesgo A - Chapinero Alto', category: 'candidate', href: '/panel/prop-001' },
  { id: 'cand-4', title: 'Pedro López', subtitle: 'Riesgo C - Casa Cedritos', category: 'candidate', href: '/panel/prop-003' },
  { id: 'cont-1', title: 'Contrato María García', subtitle: 'Pendiente firma - Chapinero Alto', category: 'contract', href: '/panel/contratos' },
  { id: 'cont-2', title: 'Contrato Luis Rodríguez', subtitle: 'Activo - Studio Zona Rosa', category: 'contract', href: '/panel/contratos' },
  { id: 'lease-1', title: 'Arriendo Apartamento 501', subtitle: 'Laura Sánchez - $2,500,000/mes', category: 'lease', href: '/panel/leases' },
  { id: 'lease-2', title: 'Arriendo Studio 302', subtitle: 'Nicolás Mejía - $1,800,000/mes', category: 'lease', href: '/panel/leases' },
  { id: 'pay-1', title: 'Pago Laura Sánchez', subtitle: '$2,500,000 - Recibido Feb 2026', category: 'payment', href: '/panel/leases' },
  { id: 'pay-2', title: 'Pago Nicolás Mejía', subtitle: '$1,800,000 - Pendiente', category: 'payment', href: '/panel/leases' },
];

const CATEGORY_LABELS: Record<SearchCategory, string> = {
  property: 'Propiedades',
  candidate: 'Candidatos',
  contract: 'Contratos',
  lease: 'Arriendos',
  payment: 'Pagos',
  application: 'Aplicaciones',
  document: 'Documentos',
  message: 'Mensajes',
};

const CATEGORY_ORDER_TENANT: SearchCategory[] = ['application', 'lease', 'payment', 'document', 'message'];
const CATEGORY_ORDER_LANDLORD: SearchCategory[] = ['property', 'candidate', 'contract', 'lease', 'payment'];

export function searchData(query: string, isLandlord: boolean): SearchResult[] {
  const data = isLandlord ? LANDLORD_SEARCH_DATA : TENANT_SEARCH_DATA;
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];
  return data.filter(item =>
    item.title.toLowerCase().includes(normalizedQuery) ||
    item.subtitle.toLowerCase().includes(normalizedQuery)
  );
}

export function groupSearchResults(results: SearchResult[], isLandlord: boolean): Record<SearchCategory, SearchResult[]> {
  const order = isLandlord ? CATEGORY_ORDER_LANDLORD : CATEGORY_ORDER_TENANT;
  const grouped: Record<SearchCategory, SearchResult[]> = {} as Record<SearchCategory, SearchResult[]>;
  order.forEach(category => {
    const items = results.filter(r => r.category === category);
    if (items.length > 0) {
      grouped[category] = items;
    }
  });
  return grouped;
}

export function getCategoryLabel(category: SearchCategory): string {
  return CATEGORY_LABELS[category];
}

export function getRecentSearches(isLandlord: boolean): string[] {
  if (isLandlord) {
    return ['María García', 'Chapinero', 'contrato pendiente'];
  }
  return ['pago febrero', 'contrato', 'recibo'];
}

export function getQuickLinks(isLandlord: boolean): SearchResult[] {
  if (isLandlord) {
    return [
      { id: 'quick-1', title: 'Ver candidatos pendientes', subtitle: '3 por revisar', category: 'candidate', href: '/panel' },
      { id: 'quick-2', title: 'Contratos por firmar', subtitle: '1 pendiente', category: 'contract', href: '/panel/contratos' },
      { id: 'quick-3', title: 'Pagos del mes', subtitle: 'Ver resumen', category: 'payment', href: '/panel/leases' },
    ];
  }
  return [
    { id: 'quick-1', title: 'Próximo pago', subtitle: 'Ver detalles', category: 'payment', href: '/inquilino/pagos' },
    { id: 'quick-2', title: 'Mis aplicaciones', subtitle: '2 activas', category: 'application', href: '/inquilino/aplicaciones' },
    { id: 'quick-3', title: 'Documentos', subtitle: 'Ver todos', category: 'document', href: '/inquilino/documentos' },
  ];
}
