/**
 * Mock notification data for landlords and tenants
 * Includes comprehensive examples of all notification types
 */

import type {
  LandlordNotification,
  TenantNotification,
  LandlordNotificationCategory,
  TenantNotificationCategory,
} from '@/lib/types/notification';

// ============================================================================
// Landlord Notifications
// ============================================================================

export const MOCK_LANDLORD_NOTIFICATIONS: LandlordNotification[] = [
  // === APPLICATIONS ===
  {
    id: 'notif-l-001',
    type: 'APP_NEW',
    category: 'application',
    title: 'Nueva aplicación',
    message: 'Carlos Rodríguez aplicó para Apartamento Chapinero',
    read: false,
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(), // 12 min ago
    actionUrl: '/panel/prop-001?tab=candidates',
    actionLabel: 'Ver aplicación',
    metadata: {
      tenantName: 'Carlos Rodríguez',
      tenantEmail: 'carlos@email.com',
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
      applicationId: 'app-001',
      score: 85,
    },
  },
  {
    id: 'notif-l-002',
    type: 'APP_DOCS_UPLOADED',
    category: 'application',
    title: 'Documentos recibidos',
    message: 'María García subió sus documentos para Casa Usaquén',
    read: false,
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(), // 45 min ago
    actionUrl: '/panel/prop-002?tab=candidates&app=app-002',
    actionLabel: 'Ver documentos',
    metadata: {
      tenantName: 'María García',
      propertyName: 'Casa Usaquén',
      propertyId: 'prop-002',
      applicationId: 'app-002',
    },
  },

  // === VERIFICATIONS ===
  {
    id: 'notif-l-003',
    type: 'VER_COMPLETED',
    category: 'verification',
    title: 'Verificación completada',
    message: 'La verificación de Ana López está lista - Score: 92/100',
    read: false,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    actionUrl: '/panel/prop-001?tab=candidates&app=app-003',
    actionLabel: 'Ver resultado',
    metadata: {
      tenantName: 'Ana López',
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
      applicationId: 'app-003',
      score: 92,
    },
  },
  {
    id: 'notif-l-004',
    type: 'VER_RED_FLAGS',
    category: 'alert',
    title: 'Alertas detectadas',
    message: 'Se encontraron 2 alertas en la verificación de Pedro Sánchez',
    read: false,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(), // 3 hours ago
    actionUrl: '/panel/prop-003?tab=candidates&app=app-004',
    actionLabel: 'Ver alertas',
    metadata: {
      tenantName: 'Pedro Sánchez',
      propertyName: 'Studio Poblado',
      propertyId: 'prop-003',
      applicationId: 'app-004',
      score: 58,
    },
  },

  // === PAYMENTS ===
  {
    id: 'notif-l-005',
    type: 'PAY_RECEIVED',
    category: 'payment',
    title: 'Pago recibido',
    message: 'Recibiste $2,500,000 de Roberto Silva',
    read: true,
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(), // 5 hours ago
    actionUrl: '/panel?tab=payments',
    actionLabel: 'Ver pago',
    metadata: {
      tenantName: 'Roberto Silva',
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
      amount: 2500000,
      paymentId: 'pay-001',
    },
  },
  {
    id: 'notif-l-006',
    type: 'PAY_OVERDUE',
    category: 'alert',
    title: 'Pago vencido',
    message: 'El arriendo de Casa Usaquén está vencido (5 días)',
    read: true,
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
    actionUrl: '/panel/leases?lease=lea-001',
    actionLabel: 'Ver detalles',
    metadata: {
      tenantName: 'Juan Martínez',
      propertyName: 'Casa Usaquén',
      propertyId: 'prop-002',
      daysRemaining: -5,
    },
  },
  {
    id: 'notif-l-007',
    type: 'PAY_DEPOSITED',
    category: 'payment',
    title: 'Depósito realizado',
    message: '$4,200,000 fue depositado en tu cuenta ****4532',
    read: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    actionUrl: '/panel/configuracion',
    actionLabel: 'Ver detalles',
    metadata: {
      amount: 4200000,
    },
  },

  // === CONTRACTS ===
  {
    id: 'notif-l-008',
    type: 'CON_TENANT_SIGNED',
    category: 'contract',
    title: 'Inquilino firmó contrato',
    message: 'Laura Gómez firmó el contrato de Apartamento Laureles',
    read: true,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
    actionUrl: '/panel/prop-004/contract/con-001',
    actionLabel: 'Firmar contrato',
    metadata: {
      tenantName: 'Laura Gómez',
      propertyName: 'Apartamento Laureles',
      propertyId: 'prop-004',
      contractId: 'con-001',
    },
  },
  {
    id: 'notif-l-009',
    type: 'CON_COMPLETED',
    category: 'contract',
    title: 'Contrato completado',
    message: 'El contrato de Casa Usaquén fue firmado por ambas partes',
    read: true,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
    actionUrl: '/panel/contratos?con=con-002',
    actionLabel: 'Ver contrato',
    metadata: {
      tenantName: 'Roberto Silva',
      propertyName: 'Casa Usaquén',
      propertyId: 'prop-002',
      contractId: 'con-002',
    },
  },

  // === LEASES ===
  {
    id: 'notif-l-010',
    type: 'LEA_EXPIRING_30',
    category: 'lease',
    title: 'Arriendo por vencer',
    message: 'El arriendo de Studio Poblado vence en 30 días',
    read: true,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(), // 4 days ago
    actionUrl: '/panel/leases?lease=lea-002',
    actionLabel: 'Ver opciones',
    metadata: {
      tenantName: 'Diana Torres',
      propertyName: 'Studio Poblado',
      propertyId: 'prop-003',
      leaseId: 'lea-002',
      daysRemaining: 30,
    },
  },
  {
    id: 'notif-l-011',
    type: 'LEA_EARLY_TERMINATION',
    category: 'lease',
    title: 'Terminación anticipada',
    message: 'Miguel Herrera solicitó terminar anticipadamente',
    read: true,
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(), // 6 days ago
    actionUrl: '/panel/leases?lease=lea-003',
    actionLabel: 'Ver solicitud',
    metadata: {
      tenantName: 'Miguel Herrera',
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
      leaseId: 'lea-003',
    },
  },

  // === VISITS ===
  {
    id: 'notif-l-012',
    type: 'VIS_SCHEDULED',
    category: 'visit',
    title: 'Visita programada',
    message: 'Sofía Martínez agendó visita a Casa Usaquén para mañana',
    read: true,
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(), // 8 hours ago
    actionUrl: '/panel/visitas?visit=vis-001',
    actionLabel: 'Ver visita',
    metadata: {
      tenantName: 'Sofía Martínez',
      propertyName: 'Casa Usaquén',
      propertyId: 'prop-002',
      visitId: 'vis-001',
    },
  },
  {
    id: 'notif-l-013',
    type: 'VIS_CANCELLED',
    category: 'visit',
    title: 'Visita cancelada',
    message: 'Fernando López canceló la visita a Apartamento Chapinero',
    read: true,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), // 7 days ago
    actionUrl: '/panel/visitas',
    actionLabel: 'Ver detalles',
    metadata: {
      tenantName: 'Fernando López',
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
    },
  },

  // === PROPERTIES ===
  {
    id: 'notif-l-014',
    type: 'PRO_PUBLISHED',
    category: 'property',
    title: 'Propiedad publicada',
    message: 'Penthouse El Poblado está ahora visible en Leasefy',
    read: true,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), // 10 days ago
    actionUrl: '/propiedades/prop-005',
    actionLabel: 'Ver publicación',
    metadata: {
      propertyName: 'Penthouse El Poblado',
      propertyId: 'prop-005',
    },
  },
  {
    id: 'notif-l-015',
    type: 'PRO_VIEWS_MILESTONE',
    category: 'property',
    title: 'Hito de visitas',
    message: 'Apartamento Chapinero alcanzó 100 visitas',
    read: true,
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(), // 12 days ago
    actionUrl: '/panel/propiedades?prop=prop-001',
    actionLabel: 'Ver estadísticas',
    metadata: {
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
    },
  },

  // === MAINTENANCE ===
  {
    id: 'notif-l-016',
    type: 'MNT_REQUEST',
    category: 'maintenance',
    title: 'Solicitud de mantenimiento',
    message: 'Roberto Silva reportó un problema de plomería',
    read: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    actionUrl: '/panel?tab=maintenance',
    actionLabel: 'Ver solicitud',
    metadata: {
      tenantName: 'Roberto Silva',
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
    },
  },

  // === MESSAGES ===
  {
    id: 'notif-l-017',
    type: 'MSG_NEW',
    category: 'message',
    title: 'Nuevo mensaje',
    message: 'Ana López te envió un mensaje sobre Apartamento Chapinero',
    read: true,
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(), // 6 hours ago
    actionUrl: '/panel/mensajes?conv=conv-001',
    actionLabel: 'Responder',
    metadata: {
      tenantName: 'Ana López',
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
    },
  },

  // === REVIEWS ===
  {
    id: 'notif-l-018',
    type: 'REV_RECEIVED',
    category: 'review',
    title: 'Nueva reseña',
    message: 'Diana Torres dejó una reseña de 5 estrellas',
    read: true,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), // 14 days ago
    actionUrl: '/panel/propiedades?prop=prop-003&tab=reviews',
    actionLabel: 'Ver reseña',
    metadata: {
      tenantName: 'Diana Torres',
      propertyName: 'Studio Poblado',
      propertyId: 'prop-003',
    },
  },

  // === SYSTEM ===
  {
    id: 'notif-l-019',
    type: 'SYS_REPORT_READY',
    category: 'system',
    title: 'Informe listo',
    message: 'Tu informe mensual de enero está listo',
    read: true,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), // 7 days ago
    actionUrl: '/panel?tab=reports',
    actionLabel: 'Ver informe',
  },
  {
    id: 'notif-l-020',
    type: 'SYS_SUBSCRIPTION_EXPIRING',
    category: 'alert',
    title: 'Suscripción por vencer',
    message: 'Tu plan Profesional vence en 7 días',
    read: true,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
    actionUrl: '/panel/upgrade',
    actionLabel: 'Renovar',
  },
];

// ============================================================================
// Tenant Notifications
// ============================================================================

export const MOCK_TENANT_NOTIFICATIONS: TenantNotification[] = [
  // === APPLICATIONS ===
  {
    id: 'notif-t-001',
    type: 'APP_APPROVED',
    category: 'application',
    title: '¡Felicitaciones! Fuiste aprobado',
    message: 'Tu aplicación para Apartamento Chapinero fue aprobada',
    read: false,
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(), // 15 min ago
    actionUrl: '/inquilino/aplicaciones/app-001',
    actionLabel: 'Siguiente paso',
    metadata: {
      landlordName: 'María González',
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
      applicationId: 'app-001',
    },
  },
  {
    id: 'notif-t-002',
    type: 'APP_PREAPPROVED',
    category: 'application',
    title: '¡Pre-aprobado!',
    message: 'Fuiste pre-aprobado para Casa Usaquén',
    read: false,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    actionUrl: '/inquilino/aplicaciones/app-002',
    actionLabel: 'Ver detalles',
    metadata: {
      landlordName: 'Carlos Rodríguez',
      propertyName: 'Casa Usaquén',
      propertyId: 'prop-002',
      applicationId: 'app-002',
    },
  },
  {
    id: 'notif-t-003',
    type: 'APP_DOCS_REQUESTED',
    category: 'application',
    title: 'Documentos solicitados',
    message: 'Juan Martínez solicita: Certificado laboral',
    read: false,
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(), // 4 hours ago
    actionUrl: '/inquilino/aplicaciones/app-003?tab=documents',
    actionLabel: 'Subir documento',
    metadata: {
      landlordName: 'Juan Martínez',
      propertyName: 'Studio Poblado',
      propertyId: 'prop-003',
      applicationId: 'app-003',
    },
  },
  {
    id: 'notif-t-004',
    type: 'APP_UNDER_REVIEW',
    category: 'application',
    title: 'En revisión',
    message: 'Tu aplicación para Apartamento Laureles está siendo revisada',
    read: true,
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
    actionUrl: '/inquilino/aplicaciones/app-004',
    actionLabel: 'Ver estado',
    metadata: {
      landlordName: 'Ana Torres',
      propertyName: 'Apartamento Laureles',
      propertyId: 'prop-004',
      applicationId: 'app-004',
    },
  },

  // === CONTRACTS ===
  {
    id: 'notif-t-005',
    type: 'CON_READY',
    category: 'contract',
    title: 'Contrato listo para firmar',
    message: 'El contrato de Apartamento Chapinero está listo',
    read: false,
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(), // 30 min ago
    actionUrl: '/inquilino/aplicaciones/app-001?step=contract',
    actionLabel: 'Firmar contrato',
    metadata: {
      landlordName: 'María González',
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
      contractId: 'con-001',
    },
  },
  {
    id: 'notif-t-006',
    type: 'CON_COMPLETED',
    category: 'contract',
    title: 'Contrato completado',
    message: 'El contrato de Casa Usaquén está completo',
    read: true,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
    actionUrl: '/inquilino/documentos?doc=con-002',
    actionLabel: 'Ver contrato',
    metadata: {
      landlordName: 'Carlos Rodríguez',
      propertyName: 'Casa Usaquén',
      propertyId: 'prop-002',
      contractId: 'con-002',
    },
  },

  // === PAYMENTS ===
  {
    id: 'notif-t-007',
    type: 'PAY_CONFIRMED',
    category: 'payment',
    title: 'Pago confirmado',
    message: 'Tu pago de $2,500,000 fue confirmado',
    read: true,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
    actionUrl: '/inquilino/pagos?pay=pay-001',
    actionLabel: 'Ver recibo',
    metadata: {
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
      amount: 2500000,
      paymentId: 'pay-001',
    },
  },
  {
    id: 'notif-t-008',
    type: 'PAY_REMINDER_7',
    category: 'reminder',
    title: 'Recordatorio de pago',
    message: 'Tu arriendo vence en 7 días',
    read: false,
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(), // 6 hours ago
    actionUrl: '/inquilino/pagos',
    actionLabel: 'Pagar ahora',
    metadata: {
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
      amount: 2500000,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    },
  },
  {
    id: 'notif-t-009',
    type: 'PAY_REMINDER_3',
    category: 'reminder',
    title: 'Recordatorio de pago',
    message: 'Tu arriendo vence en 3 días',
    read: true,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(), // 4 days ago
    actionUrl: '/inquilino/pagos',
    actionLabel: 'Pagar ahora',
    metadata: {
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
      amount: 2500000,
    },
  },

  // === LEASES ===
  {
    id: 'notif-t-010',
    type: 'LEA_STARTED',
    category: 'lease',
    title: '¡Bienvenido a tu nuevo hogar!',
    message: 'Tu arriendo en Apartamento Chapinero comenzó',
    read: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), // 30 days ago
    actionUrl: '/inquilino/arriendo/lea-001',
    actionLabel: 'Ver arriendo',
    metadata: {
      landlordName: 'María González',
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
      leaseId: 'lea-001',
    },
  },
  {
    id: 'notif-t-011',
    type: 'LEA_RENEWAL_OFFERED',
    category: 'lease',
    title: 'Oferta de renovación',
    message: 'María González ofrece renovar tu arriendo',
    read: true,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), // 10 days ago
    actionUrl: '/inquilino/arriendo/lea-001?tab=renewal',
    actionLabel: 'Ver oferta',
    metadata: {
      landlordName: 'María González',
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
      leaseId: 'lea-001',
    },
  },

  // === VISITS ===
  {
    id: 'notif-t-012',
    type: 'VIS_CONFIRMED',
    category: 'visit',
    title: 'Visita confirmada',
    message: 'Tu visita a Casa Usaquén fue confirmada para mañana 3:00 PM',
    read: true,
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(), // 8 hours ago
    actionUrl: '/inquilino/aplicaciones?visit=vis-001',
    actionLabel: 'Ver detalles',
    metadata: {
      landlordName: 'Carlos Rodríguez',
      propertyName: 'Casa Usaquén',
      propertyId: 'prop-002',
      visitId: 'vis-001',
    },
  },
  {
    id: 'notif-t-013',
    type: 'VIS_REMINDER_24H',
    category: 'visit',
    title: 'Recordatorio de visita',
    message: 'Tu visita a Studio Poblado es mañana',
    read: true,
    createdAt: new Date(Date.now() - 20 * 3600000).toISOString(), // 20 hours ago
    actionUrl: '/inquilino/aplicaciones?visit=vis-002',
    actionLabel: 'Ver ubicación',
    metadata: {
      landlordName: 'Juan Martínez',
      propertyName: 'Studio Poblado',
      propertyId: 'prop-003',
      visitId: 'vis-002',
    },
  },

  // === DOCUMENTS ===
  {
    id: 'notif-t-014',
    type: 'DOC_APPROVED',
    category: 'document',
    title: 'Documento aprobado',
    message: 'Tu cédula fue aprobada',
    read: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    actionUrl: '/inquilino/documentos',
    actionLabel: 'Ver estado',
    metadata: {
      propertyName: 'Apartamento Chapinero',
      applicationId: 'app-001',
    },
  },
  {
    id: 'notif-t-015',
    type: 'DOC_CONTRACT_READY',
    category: 'document',
    title: 'Contrato disponible',
    message: 'Tu contrato firmado está disponible para descargar',
    read: true,
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(), // 6 days ago
    actionUrl: '/inquilino/documentos?doc=con-001',
    actionLabel: 'Descargar',
    metadata: {
      propertyName: 'Apartamento Chapinero',
      contractId: 'con-001',
    },
  },

  // === MESSAGES ===
  {
    id: 'notif-t-016',
    type: 'MSG_NEW',
    category: 'message',
    title: 'Nuevo mensaje',
    message: 'María González te envió un mensaje',
    read: true,
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(), // 12 hours ago
    actionUrl: '/inquilino/mensajes?conv=conv-001',
    actionLabel: 'Responder',
    metadata: {
      landlordName: 'María González',
      propertyName: 'Apartamento Chapinero',
      propertyId: 'prop-001',
    },
  },

  // === PROPERTIES (FAVORITES) ===
  {
    id: 'notif-t-017',
    type: 'FAV_PRICE_DROP',
    category: 'property',
    title: '¡Precio rebajado!',
    message: 'Penthouse El Poblado bajó de precio: $5,000,000 → $4,500,000',
    read: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    actionUrl: '/propiedades/prop-005',
    actionLabel: 'Ver propiedad',
    metadata: {
      propertyName: 'Penthouse El Poblado',
      propertyId: 'prop-005',
      amount: 4500000,
    },
  },
  {
    id: 'notif-t-018',
    type: 'FAV_AVAILABLE',
    category: 'property',
    title: '¡Disponible de nuevo!',
    message: 'Loft La Candelaria está disponible otra vez',
    read: true,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(), // 4 days ago
    actionUrl: '/propiedades/prop-006',
    actionLabel: 'Ver propiedad',
    metadata: {
      propertyName: 'Loft La Candelaria',
      propertyId: 'prop-006',
    },
  },

  // === MAINTENANCE ===
  {
    id: 'notif-t-019',
    type: 'MNT_SCHEDULED',
    category: 'maintenance',
    title: 'Visita de mantenimiento programada',
    message: 'Un técnico visitará el 10 de febrero',
    read: true,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(), // 1 day ago
    actionUrl: '/inquilino/arriendo/lea-001?tab=maintenance',
    actionLabel: 'Ver detalles',
    metadata: {
      propertyName: 'Apartamento Chapinero',
      leaseId: 'lea-001',
    },
  },

  // === SYSTEM ===
  {
    id: 'notif-t-020',
    type: 'SYS_SCORE_UPDATED',
    category: 'system',
    title: 'Score actualizado',
    message: 'Tu score de inquilino subió a 85 puntos',
    read: true,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), // 7 days ago
    actionUrl: '/inquilino/perfil?tab=score',
    actionLabel: 'Ver score',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getLandlordNotifications(): LandlordNotification[] {
  return MOCK_LANDLORD_NOTIFICATIONS;
}

export function getTenantNotifications(): TenantNotification[] {
  return MOCK_TENANT_NOTIFICATIONS;
}

export function getUnreadCount(
  notifications: (LandlordNotification | TenantNotification)[]
): number {
  return notifications.filter((n) => !n.read).length;
}

export function filterByCategory<T extends { category: string }>(
  notifications: T[],
  category: string
): T[] {
  if (category === 'all') return notifications;
  if (category === 'unread') return notifications.filter((n) => !(n as T & { read: boolean }).read);
  return notifications.filter((n) => n.category === category);
}

export function getLandlordFilterOptions(): { value: string; label: string }[] {
  return [
    { value: 'all', label: 'Todas' },
    { value: 'unread', label: 'No leídas' },
    { value: 'payment', label: 'Pagos' },
    { value: 'application', label: 'Candidatos' },
    { value: 'contract', label: 'Contratos' },
    { value: 'lease', label: 'Arriendos' },
    { value: 'visit', label: 'Visitas' },
    { value: 'property', label: 'Propiedades' },
  ];
}

export function getTenantFilterOptions(): { value: string; label: string }[] {
  return [
    { value: 'all', label: 'Todas' },
    { value: 'unread', label: 'No leídas' },
    { value: 'payment', label: 'Pagos' },
    { value: 'application', label: 'Aplicaciones' },
    { value: 'message', label: 'Mensajes' },
    { value: 'document', label: 'Documentos' },
  ];
}

// ============================================================================
// Notification Action URLs
// ============================================================================

export const LANDLORD_NOTIFICATION_ROUTES: Record<string, string> = {
  // Applications
  APP_NEW: '/panel/{propertyId}?tab=candidates',
  APP_DOCS_UPLOADED: '/panel/{propertyId}?tab=candidates',
  APP_DOCS_PENDING: '/panel/{propertyId}?tab=candidates',
  APP_WITHDRAWN: '/panel/{propertyId}?tab=candidates',
  // Verifications
  VER_COMPLETED: '/panel/{propertyId}?tab=candidates',
  VER_SCORE_HIGH: '/panel/{propertyId}?tab=candidates',
  VER_SCORE_LOW: '/panel/{propertyId}?tab=candidates',
  VER_RED_FLAGS: '/panel/{propertyId}?tab=candidates',
  VER_INCOME_VERIFIED: '/panel/{propertyId}?tab=candidates',
  // Contracts
  CON_READY: '/panel/{propertyId}/contract/{contractId}',
  CON_TENANT_SIGNED: '/panel/{propertyId}/contract/{contractId}',
  CON_COMPLETED: '/panel/contratos',
  CON_PENDING_SIGNATURE: '/panel/{propertyId}/contract/{contractId}',
  CON_CANCELLED: '/panel/contratos',
  // Payments
  PAY_RECEIVED: '/panel?tab=payments',
  PAY_DEPOSITED: '/panel/configuracion',
  PAY_OVERDUE: '/panel/leases',
  PAY_PARTIAL: '/panel?tab=payments',
  PAY_FAILED: '/panel?tab=payments',
  // Leases
  LEA_STARTED: '/panel/leases',
  LEA_EXPIRING_90: '/panel/leases',
  LEA_EXPIRING_30: '/panel/leases',
  LEA_EXPIRED: '/panel/leases',
  LEA_RENEWED: '/panel/leases',
  LEA_TERMINATED: '/panel/leases',
  LEA_EARLY_TERMINATION: '/panel/leases',
  // Visits
  VIS_SCHEDULED: '/panel/visitas',
  VIS_REMINDER: '/panel/visitas',
  VIS_COMPLETED: '/panel/visitas',
  VIS_CANCELLED: '/panel/visitas',
  VIS_RESCHEDULED: '/panel/visitas',
  VIS_NO_SHOW: '/panel/visitas',
  // Properties
  PRO_PUBLISHED: '/propiedades/{propertyId}',
  PRO_VIEWS_MILESTONE: '/panel/propiedades',
  PRO_FEATURED: '/panel/propiedades',
  PRO_EXPIRED: '/panel/propiedades',
  PRO_DEACTIVATED: '/panel/propiedades',
  // Messages
  MSG_NEW: '/panel/mensajes',
  MSG_REPLY: '/panel/mensajes',
  // Maintenance
  MNT_REQUEST: '/panel?tab=maintenance',
  MNT_UPDATED: '/panel?tab=maintenance',
  MNT_COMPLETED: '/panel?tab=maintenance',
  // Reviews
  REV_RECEIVED: '/panel/propiedades',
  REV_RESPONSE_NEEDED: '/panel/propiedades',
  // System
  SYS_SUBSCRIPTION_EXPIRING: '/panel/upgrade',
  SYS_SUBSCRIPTION_EXPIRED: '/panel/upgrade',
  SYS_PAYMENT_METHOD_EXPIRING: '/panel/configuracion',
  SYS_SECURITY_ALERT: '/panel/configuracion',
  SYS_WELCOME: '/panel',
  SYS_PROFILE_INCOMPLETE: '/panel/configuracion',
  SYS_NEW_FEATURE: '/panel',
  SYS_REPORT_READY: '/panel',
};

export const TENANT_NOTIFICATION_ROUTES: Record<string, string> = {
  // Applications
  APP_SUBMITTED: '/inquilino/aplicaciones/{applicationId}',
  APP_PREAPPROVED: '/inquilino/aplicaciones/{applicationId}',
  APP_APPROVED: '/inquilino/aplicaciones/{applicationId}',
  APP_REJECTED: '/inquilino/aplicaciones/{applicationId}',
  APP_DOCS_REQUESTED: '/inquilino/aplicaciones/{applicationId}?tab=documents',
  APP_UNDER_REVIEW: '/inquilino/aplicaciones/{applicationId}',
  // Contracts
  CON_READY: '/inquilino/aplicaciones/{applicationId}?step=contract',
  CON_PENDING_SIGNATURE: '/inquilino/aplicaciones/{applicationId}?step=contract',
  CON_LANDLORD_SIGNED: '/inquilino/aplicaciones/{applicationId}',
  CON_COMPLETED: '/inquilino/documentos',
  CON_CANCELLED: '/inquilino/aplicaciones/{applicationId}',
  // Payments
  PAY_CONFIRMED: '/inquilino/pagos',
  PAY_REMINDER_7: '/inquilino/pagos',
  PAY_REMINDER_3: '/inquilino/pagos',
  PAY_REMINDER_1: '/inquilino/pagos',
  PAY_DUE_TODAY: '/inquilino/pagos',
  PAY_OVERDUE: '/inquilino/pagos',
  PAY_FAILED: '/inquilino/pagos',
  PAY_RECEIPT: '/inquilino/pagos',
  PAY_AUTO_SCHEDULED: '/inquilino/pagos',
  // Leases
  LEA_STARTED: '/inquilino/arriendo/{leaseId}',
  LEA_EXPIRING_90: '/inquilino/arriendo/{leaseId}',
  LEA_EXPIRING_30: '/inquilino/arriendo/{leaseId}',
  LEA_RENEWAL_OFFERED: '/inquilino/arriendo/{leaseId}?tab=renewal',
  LEA_RENEWED: '/inquilino/arriendo/{leaseId}',
  LEA_TERMINATED: '/inquilino/arriendo/{leaseId}',
  LEA_TERMINATION_APPROVED: '/inquilino/arriendo/{leaseId}',
  // Visits
  VIS_CONFIRMED: '/inquilino/aplicaciones',
  VIS_REMINDER_24H: '/inquilino/aplicaciones',
  VIS_REMINDER_1H: '/inquilino/aplicaciones',
  VIS_CANCELLED_BY_LANDLORD: '/inquilino/aplicaciones',
  VIS_RESCHEDULED: '/inquilino/aplicaciones',
  // Documents
  DOC_REQUESTED: '/inquilino/aplicaciones/{applicationId}?tab=documents',
  DOC_APPROVED: '/inquilino/documentos',
  DOC_REJECTED: '/inquilino/documentos',
  DOC_EXPIRING: '/inquilino/documentos',
  DOC_CONTRACT_READY: '/inquilino/documentos',
  // Messages
  MSG_NEW: '/inquilino/mensajes',
  MSG_REPLY: '/inquilino/mensajes',
  // Properties
  FAV_PRICE_DROP: '/propiedades/{propertyId}',
  FAV_AVAILABLE: '/propiedades/{propertyId}',
  FAV_ABOUT_TO_RENT: '/propiedades/{propertyId}',
  SEARCH_NEW_MATCH: '/propiedades/{propertyId}',
  // Maintenance
  MNT_RECEIVED: '/inquilino/arriendo/{leaseId}?tab=maintenance',
  MNT_IN_PROGRESS: '/inquilino/arriendo/{leaseId}?tab=maintenance',
  MNT_SCHEDULED: '/inquilino/arriendo/{leaseId}?tab=maintenance',
  MNT_COMPLETED: '/inquilino/arriendo/{leaseId}?tab=maintenance',
  // System
  SYS_WELCOME: '/inquilino',
  SYS_PROFILE_INCOMPLETE: '/inquilino/perfil',
  SYS_SCORE_UPDATED: '/inquilino/perfil?tab=score',
  SYS_SECURITY_ALERT: '/inquilino/configuracion',
  SYS_NEW_FEATURE: '/inquilino',
};

export function resolveNotificationUrl(
  route: string,
  metadata?: Record<string, unknown>
): string {
  if (!metadata) return route;

  let resolved = route;
  Object.entries(metadata).forEach(([key, value]) => {
    resolved = resolved.replace(`{${key}}`, String(value));
  });

  return resolved;
}
