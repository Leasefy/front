/** Document templates, property documents, and actas de entrega */
import type {
  DocumentTemplate,
  PropertyDocument,
  DocumentCategory,
  ActaEntrega,
  ActaInventoryItem,
  ItemCondition,
  RoomType,
} from '@/lib/types/inmobiliaria';
import { MOCK_PROPIETARIOS, MOCK_AGENTES, MOCK_CONSIGNACIONES } from './mock-inmobiliaria-core';

// ============================================================================
// Document Templates & Documents (Phase 10 - Plan 04)
// ============================================================================

export const MOCK_DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-contrato-arrendamiento',
    name: 'Contrato de Arrendamiento',
    description: 'Contrato estandar de arrendamiento de vivienda urbana (Ley 820/2003)',
    category: 'contrato',
    icon: 'FileText',
    version: '2.1',
    lastUpdated: '2026-01-15',
    usageCount: 156,
    isDefault: true,
    variables: ['{{tenant_name}}', '{{tenant_cedula}}', '{{property_address}}', '{{monthly_rent}}', '{{start_date}}', '{{end_date}}'],
  },
  {
    id: 'tpl-acta-entrega',
    name: 'Acta de Entrega',
    description: 'Acta de entrega del inmueble al inicio del arriendo',
    category: 'acta',
    icon: 'ClipboardText',
    version: '1.5',
    lastUpdated: '2026-01-10',
    usageCount: 142,
    isDefault: true,
    variables: ['{{tenant_name}}', '{{property_address}}', '{{delivery_date}}', '{{inventory_items}}'],
  },
  {
    id: 'tpl-acta-devolucion',
    name: 'Acta de Devolucion',
    description: 'Acta de devolucion del inmueble al finalizar arriendo',
    category: 'acta',
    icon: 'ClipboardText',
    version: '1.5',
    lastUpdated: '2026-01-10',
    usageCount: 98,
    isDefault: true,
    variables: ['{{tenant_name}}', '{{property_address}}', '{{return_date}}', '{{damages}}', '{{deposit_deductions}}'],
  },
  {
    id: 'tpl-inventario',
    name: 'Inventario del Inmueble',
    description: 'Lista detallada de muebles y estado del inmueble',
    category: 'inventario',
    icon: 'ListChecks',
    version: '1.2',
    lastUpdated: '2025-12-01',
    usageCount: 134,
    isDefault: true,
    variables: ['{{property_address}}', '{{rooms}}', '{{appliances}}', '{{furniture}}'],
  },
  {
    id: 'tpl-carta-terminacion',
    name: 'Carta de Terminacion',
    description: 'Notificacion de terminacion de contrato con 3 meses de anticipacion',
    category: 'carta',
    icon: 'EnvelopeSimple',
    version: '1.0',
    lastUpdated: '2025-11-15',
    usageCount: 23,
    isDefault: false,
    variables: ['{{tenant_name}}', '{{property_address}}', '{{termination_date}}', '{{reason}}'],
  },
  {
    id: 'tpl-carta-incremento',
    name: 'Carta de Incremento',
    description: 'Notificacion de incremento de canon (IPC)',
    category: 'carta',
    icon: 'TrendUp',
    version: '1.1',
    lastUpdated: '2025-12-20',
    usageCount: 67,
    isDefault: false,
    variables: ['{{tenant_name}}', '{{current_rent}}', '{{new_rent}}', '{{ipc_rate}}', '{{effective_date}}'],
  },
  {
    id: 'tpl-poliza-seguro',
    name: 'Solicitud de Poliza',
    description: 'Formulario para solicitar poliza de arrendamiento',
    category: 'poliza',
    icon: 'ShieldCheck',
    version: '1.0',
    lastUpdated: '2025-10-01',
    usageCount: 45,
    isDefault: false,
    variables: ['{{tenant_name}}', '{{property_address}}', '{{coverage_amount}}'],
  },
];

export function generateMockDocuments(): PropertyDocument[] {
  const documents: PropertyDocument[] = [];
  const categories: DocumentCategory[] = ['contrato', 'acta', 'inventario', 'poliza', 'carta'];
  const statuses: PropertyDocument['status'][] = ['draft', 'pending_signature', 'signed', 'expired'];

  MOCK_CONSIGNACIONES.forEach((consignacion, index) => {
    // Each property has multiple documents
    const numDocs = 2 + (index % 4);

    for (let i = 0; i < numDocs; i++) {
      const category = categories[(index + i) % categories.length];
      const status = statuses[(index + i) % statuses.length];
      const template = MOCK_DOCUMENT_TEMPLATES.find(t => t.category === category);
      const propietario = MOCK_PROPIETARIOS.find(p => p.id === consignacion.propietarioId);

      documents.push({
        id: `doc-${consignacion.id}-${i + 1}`,
        templateId: template?.id,
        propertyId: consignacion.propertyId,
        propertyTitle: consignacion.propertyTitle,
        consignacionId: consignacion.id,
        tenantId: consignacion.currentLeaseId ? `tenant-${index}-${i}` : undefined,
        tenantName: consignacion.currentTenantName,
        propietarioId: consignacion.propietarioId,
        propietarioName: propietario?.name || 'Propietario',
        name: template?.name || `Documento ${i + 1}`,
        category,
        status,
        fileSize: 150000 + Math.random() * 500000,
        mimeType: 'application/pdf',
        signatures: status === 'pending_signature' ? [
          { signerName: consignacion.currentTenantName || 'Inquilino', signerEmail: 'tenant@email.com', status: 'pending' },
          { signerName: propietario?.name || 'Propietario', signerEmail: 'owner@email.com', status: 'signed', signedAt: new Date().toISOString() },
        ] : status === 'signed' ? [
          { signerName: consignacion.currentTenantName || 'Inquilino', signerEmail: 'tenant@email.com', status: 'signed', signedAt: new Date().toISOString() },
          { signerName: propietario?.name || 'Propietario', signerEmail: 'owner@email.com', status: 'signed', signedAt: new Date().toISOString() },
        ] : undefined,
        createdAt: new Date(Date.now() - (30 + index * 5) * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'user-1',
      });
    }
  });

  return documents;
}

export const MOCK_PROPERTY_DOCUMENTS = generateMockDocuments();

// ============================================================================
// Actas de Entrega (Delivery/Return Actas) - Phase 10
// ============================================================================

function generateActaInventoryItems(rooms: RoomType[]): ActaInventoryItem[] {
  const items: ActaInventoryItem[] = [];
  const conditions: ItemCondition[] = ['excelente', 'bueno', 'regular', 'malo'];

  // Import common items mapping inline to avoid circular dependency
  const ITEMS_BY_ROOM: Record<RoomType, string[]> = {
    sala: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Puertas', 'Tomas electricos', 'Interruptores'],
    comedor: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Lampara'],
    cocina: ['Piso', 'Paredes', 'Meson', 'Lavaplatos', 'Estufa', 'Horno', 'Campana extractora', 'Gabinetes', 'Grifo'],
    habitacion_principal: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Closet', 'Puertas', 'Tomas electricos'],
    habitacion_2: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Closet', 'Puertas'],
    habitacion_3: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Closet', 'Puertas'],
    bano_principal: ['Piso', 'Paredes', 'Sanitario', 'Lavamanos', 'Ducha', 'Grifo', 'Espejo', 'Gabinete'],
    bano_2: ['Piso', 'Paredes', 'Sanitario', 'Lavamanos', 'Ducha', 'Grifo'],
    estudio: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Tomas electricos'],
    balcon: ['Piso', 'Barandas', 'Techo'],
    terraza: ['Piso', 'Barandas', 'Drenaje'],
    garaje: ['Piso', 'Paredes', 'Puerta', 'Iluminacion'],
    cuarto_util: ['Piso', 'Paredes', 'Conexiones lavadora', 'Lavadero'],
    otro: ['Piso', 'Paredes', 'Techo'],
  };

  rooms.forEach((room, roomIndex) => {
    const roomItems = ITEMS_BY_ROOM[room] || [];
    roomItems.forEach((itemName, itemIndex) => {
      const condition = conditions[(roomIndex + itemIndex) % conditions.length];
      items.push({
        id: `acta-item-${room}-${itemIndex}`,
        room,
        name: itemName,
        quantity: 1,
        condition,
        hasDefects: condition === 'malo' || condition === 'regular',
        defectDescription: condition === 'malo' ? 'Requiere reparacion' : undefined,
      });
    });
  });

  return items;
}

export function generateMockActas(): ActaEntrega[] {
  const actas: ActaEntrega[] = [];
  const statusOptions: ActaEntrega['status'][] = ['draft', 'in_progress', 'pending_signatures', 'completed'];

  MOCK_CONSIGNACIONES.slice(0, 6).forEach((consignacion, index) => {
    const rooms: RoomType[] = ['sala', 'comedor', 'cocina', 'habitacion_principal', 'bano_principal'];
    const status = statusOptions[index % statusOptions.length];
    const propietario = MOCK_PROPIETARIOS.find(p => p.id === consignacion.propietarioId);
    const agente = MOCK_AGENTES.find(a => a.id === consignacion.agenteId);

    const acta: ActaEntrega = {
      id: `acta-${index + 1}`,
      type: index % 2 === 0 ? 'entrega' : 'devolucion',
      propertyId: consignacion.propertyId,
      propertyTitle: consignacion.propertyTitle,
      propertyAddress: consignacion.propertyAddress,
      consignacionId: consignacion.id,
      leaseId: consignacion.currentLeaseId || `lease-${index}`,
      tenantId: `tenant-${index}`,
      tenantName: consignacion.currentTenantName || 'Inquilino Demo',
      tenantCedula: '1.234.567.890',
      tenantPhone: '+57 300 123 4567',
      tenantEmail: 'inquilino@email.com',
      propietarioId: consignacion.propietarioId,
      propietarioName: propietario?.name || 'Propietario',
      agenteId: consignacion.agenteId,
      agenteName: agente?.name || 'Agente',
      deliveryDate: new Date(Date.now() - index * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      deliveryTime: '10:00',
      rooms,
      items: generateActaInventoryItems(rooms),
      meterReadings: [
        { type: 'agua', reading: '12345', unit: 'm3' },
        { type: 'luz', reading: '67890', unit: 'kWh' },
        { type: 'gas', reading: '11111', unit: 'm3' },
      ],
      keysDelivered: [
        { type: 'Llave principal', quantity: 2 },
        { type: 'Llave buzon', quantity: 1 },
        { type: 'Control garaje', quantity: 1 },
      ],
      generalCondition: 'bueno',
      generalObservations: 'Inmueble en buen estado general. Se recomienda revision de griferia en bano.',
      signatures: status === 'completed' ? [
        { party: 'tenant', name: consignacion.currentTenantName || 'Inquilino', cedula: '1.234.567.890', signedAt: new Date().toISOString() },
        { party: 'owner', name: propietario?.name || 'Propietario', cedula: '9.876.543.210', signedAt: new Date().toISOString() },
        { party: 'agent', name: agente?.name || 'Agente', cedula: '5.555.555.555', signedAt: new Date().toISOString() },
      ] : status === 'pending_signatures' ? [
        { party: 'tenant', name: consignacion.currentTenantName || 'Inquilino', cedula: '1.234.567.890' },
        { party: 'owner', name: propietario?.name || 'Propietario', cedula: '9.876.543.210' },
      ] : [],
      depositAmount: index % 2 === 1 ? 3000000 : undefined,
      deductions: index % 2 === 1 ? [
        { concept: 'Reparacion grifo', amount: 150000, notes: 'Grifo del bano roto' },
        { concept: 'Limpieza', amount: 200000, notes: 'Limpieza profunda necesaria' },
      ] : undefined,
      depositToReturn: index % 2 === 1 ? 2650000 : undefined,
      status,
      createdAt: new Date(Date.now() - (index + 5) * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: status === 'completed' ? new Date().toISOString() : undefined,
    };

    actas.push(acta);
  });

  return actas;
}

export const MOCK_ACTAS_ENTREGA = generateMockActas();
