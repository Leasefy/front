/**
 * Mock data for the automatic reminder system.
 * Default configuration + sample reminder log entries.
 * All monetary amounts in COP (Colombian Pesos).
 */

import type {
  ReminderConfig,
  ReminderLogEntry,
} from '@/lib/types/reminders';

// ============================================================================
// Default Reminder Configuration
// ============================================================================

export const mockReminderConfig: ReminderConfig = {
  globalEnabled: true,
  types: [
    {
      type: 'pre-payment',
      enabled: true,
      days: 5, // 5 days before due date
      channels: ['email', 'push'],
    },
    {
      type: 'overdue',
      enabled: true,
      days: 3, // 3 days after due date
      channels: ['email', 'whatsapp'],
    },
    {
      type: 'escalation',
      enabled: true,
      days: 7, // 7 days after due date (second notice)
      channels: ['email', 'whatsapp', 'push'],
    },
    {
      type: 'contract-expiry',
      enabled: true,
      days: 90, // 90 days before expiry (also sends at 60 and 30 days)
      channels: ['email', 'push'],
    },
  ],
};

// ============================================================================
// Helper: Generate dates relative to today
// ============================================================================

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 0, 0, 0);
  return d;
}

// ============================================================================
// Mock Reminder Log (18 entries)
// ============================================================================

export const mockReminderLog: ReminderLogEntry[] = [
  // --- Pre-payment reminders (sent) ---
  {
    id: 'rem-001',
    type: 'pre-payment',
    recipientName: 'Carlos Andres Mejia',
    recipientType: 'tenant',
    propertyTitle: 'Apto 302 - Torres del Parque',
    scheduledAt: daysAgo(5),
    sentAt: daysAgo(5),
    status: 'sent',
    channel: 'email',
    message: 'Tu arriendo de $1.850.000 vence en 5 dias. Recuerda realizar el pago a tiempo.',
    amount: 1850000,
    daysReference: 5,
  },
  {
    id: 'rem-002',
    type: 'pre-payment',
    recipientName: 'Laura Patricia Gomez',
    recipientType: 'tenant',
    propertyTitle: 'Casa 15 - Cedritos',
    scheduledAt: daysAgo(3),
    sentAt: daysAgo(3),
    status: 'sent',
    channel: 'push',
    message: 'Recordatorio: tu arriendo de $2.400.000 vence en 5 dias.',
    amount: 2400000,
    daysReference: 5,
  },
  {
    id: 'rem-003',
    type: 'pre-payment',
    recipientName: 'Andres Felipe Rojas',
    recipientType: 'tenant',
    propertyTitle: 'Apto 801 - Edificio Sabana',
    scheduledAt: daysFromNow(2),
    status: 'scheduled',
    channel: 'email',
    message: 'Tu arriendo de $1.600.000 vence en 5 dias.',
    amount: 1600000,
    daysReference: 5,
  },

  // --- Overdue reminders ---
  {
    id: 'rem-004',
    type: 'overdue',
    recipientName: 'Maria Fernanda Lopez',
    recipientType: 'tenant',
    propertyTitle: 'Apto 204 - Colina Campestre',
    scheduledAt: daysAgo(10),
    sentAt: daysAgo(10),
    status: 'sent',
    channel: 'whatsapp',
    message: 'Han pasado 3 dias desde el vencimiento de tu arriendo ($1.950.000). Comunicate con nosotros.',
    amount: 1950000,
    daysReference: 3,
  },
  {
    id: 'rem-005',
    type: 'overdue',
    recipientName: 'Juan Sebastian Prieto',
    recipientType: 'tenant',
    propertyTitle: 'Local 3 - Centro Comercial Chia',
    scheduledAt: daysAgo(7),
    sentAt: daysAgo(7),
    status: 'sent',
    channel: 'email',
    message: 'Tu arriendo de $3.200.000 se encuentra en mora. Han pasado 3 dias desde la fecha de vencimiento.',
    amount: 3200000,
    daysReference: 3,
  },
  {
    id: 'rem-006',
    type: 'overdue',
    recipientName: 'Diana Carolina Ruiz',
    recipientType: 'tenant',
    propertyTitle: 'Apto 1501 - Reserva de la Sierra',
    scheduledAt: daysAgo(2),
    sentAt: daysAgo(2),
    status: 'sent',
    channel: 'whatsapp',
    message: 'Recordatorio de mora: $2.100.000 pendiente de pago (3 dias de mora).',
    amount: 2100000,
    daysReference: 3,
  },
  {
    id: 'rem-007',
    type: 'overdue',
    recipientName: 'Santiago Restrepo',
    recipientType: 'tenant',
    propertyTitle: 'Apto 602 - Edificio Portal del Norte',
    scheduledAt: daysFromNow(1),
    status: 'scheduled',
    channel: 'email',
    message: 'Aviso de mora programado para 3 dias despues del vencimiento.',
    amount: 1750000,
    daysReference: 3,
  },

  // --- Escalation reminders ---
  {
    id: 'rem-008',
    type: 'escalation',
    recipientName: 'Maria Fernanda Lopez',
    recipientType: 'tenant',
    propertyTitle: 'Apto 204 - Colina Campestre',
    scheduledAt: daysAgo(6),
    sentAt: daysAgo(6),
    status: 'sent',
    channel: 'email',
    message: 'Segundo aviso: tu arriendo de $1.950.000 acumula 7 dias de mora. Se procedera con acciones adicionales.',
    amount: 1950000,
    daysReference: 7,
  },
  {
    id: 'rem-009',
    type: 'escalation',
    recipientName: 'Juan Sebastian Prieto',
    recipientType: 'tenant',
    propertyTitle: 'Local 3 - Centro Comercial Chia',
    scheduledAt: daysAgo(3),
    sentAt: daysAgo(3),
    status: 'sent',
    channel: 'whatsapp',
    message: 'Escalacion: $3.200.000 pendiente con 7 dias de mora. Contactenos urgentemente.',
    amount: 3200000,
    daysReference: 7,
  },
  {
    id: 'rem-010',
    type: 'escalation',
    recipientName: 'Ricardo Andres Vargas',
    recipientType: 'tenant',
    propertyTitle: 'Bodega 5 - Zona Industrial Fontibon',
    scheduledAt: daysAgo(1),
    status: 'failed',
    channel: 'whatsapp',
    message: 'No se pudo enviar la escalacion de mora. Numero de WhatsApp no disponible.',
    amount: 4500000,
    daysReference: 7,
  },
  {
    id: 'rem-011',
    type: 'escalation',
    recipientName: 'Sandra Milena Torres',
    recipientType: 'tenant',
    propertyTitle: 'Apto 403 - Ciudadela Colsubsidio',
    scheduledAt: daysFromNow(3),
    status: 'scheduled',
    channel: 'email',
    message: 'Escalacion programada: segundo aviso de mora a 7 dias.',
    amount: 1450000,
    daysReference: 7,
  },

  // --- Contract expiry reminders ---
  {
    id: 'rem-012',
    type: 'contract-expiry',
    recipientName: 'Carlos Andres Mejia',
    recipientType: 'tenant',
    propertyTitle: 'Apto 302 - Torres del Parque',
    scheduledAt: daysAgo(15),
    sentAt: daysAgo(15),
    status: 'sent',
    channel: 'email',
    message: 'Tu contrato de arriendo vence en 90 dias. Comunicate con la inmobiliaria para renovacion.',
    daysReference: 90,
  },
  {
    id: 'rem-013',
    type: 'contract-expiry',
    recipientName: 'Laura Patricia Gomez',
    recipientType: 'tenant',
    propertyTitle: 'Casa 15 - Cedritos',
    scheduledAt: daysAgo(8),
    sentAt: daysAgo(8),
    status: 'sent',
    channel: 'push',
    message: 'Faltan 60 dias para el vencimiento de tu contrato. Revisa las condiciones de renovacion.',
    daysReference: 60,
  },
  {
    id: 'rem-014',
    type: 'contract-expiry',
    recipientName: 'Pedro Alejandro Castillo',
    recipientType: 'landlord',
    propertyTitle: 'Apto 1102 - Edificio Montearroyo',
    scheduledAt: daysAgo(4),
    sentAt: daysAgo(4),
    status: 'sent',
    channel: 'email',
    message: 'El contrato de su inmueble vence en 30 dias. Confirme si desea renovar o terminar.',
    daysReference: 30,
  },
  {
    id: 'rem-015',
    type: 'contract-expiry',
    recipientName: 'Valentina Herrera',
    recipientType: 'tenant',
    propertyTitle: 'Apto 205 - Conjunto Residencial Los Robles',
    scheduledAt: daysFromNow(5),
    status: 'scheduled',
    channel: 'email',
    message: 'Recordatorio programado: vencimiento de contrato a 90 dias.',
    daysReference: 90,
  },

  // --- Additional mixed entries ---
  {
    id: 'rem-016',
    type: 'pre-payment',
    recipientName: 'Oscar Ivan Bermudez',
    recipientType: 'tenant',
    propertyTitle: 'Apto 701 - Torres de Mazuren',
    scheduledAt: daysAgo(12),
    sentAt: daysAgo(12),
    status: 'sent',
    channel: 'email',
    message: 'Recordatorio de pago: $2.300.000 vence en 5 dias.',
    amount: 2300000,
    daysReference: 5,
  },
  {
    id: 'rem-017',
    type: 'overdue',
    recipientName: 'Natalia Andrea Ospina',
    recipientType: 'tenant',
    propertyTitle: 'Casa 8 - Suba Rincon',
    scheduledAt: daysAgo(1),
    status: 'cancelled',
    channel: 'whatsapp',
    message: 'Recordatorio cancelado: inquilino realizo el pago antes del envio.',
    amount: 1300000,
    daysReference: 3,
  },
  {
    id: 'rem-018',
    type: 'pre-payment',
    recipientName: 'Camilo Andres Parra',
    recipientType: 'tenant',
    propertyTitle: 'Oficina 504 - Centro Empresarial Calle 100',
    scheduledAt: daysAgo(20),
    sentAt: daysAgo(20),
    status: 'sent',
    channel: 'push',
    message: 'Tu arriendo de $5.800.000 vence en 5 dias. Realiza el pago oportunamente.',
    amount: 5800000,
    daysReference: 5,
  },
];
