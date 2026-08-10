import { describe, it, expect } from 'vitest';
import {
  deriveCategoryFromTemplateCode,
  mapRealtimeRowToBackendNotification,
} from './notifications.types';

// ============================================================================
// deriveCategoryFromTemplateCode
// ============================================================================
// notification_logs has no `category` column — the REST layer derives it from
// the templateCode. Realtime INSERT rows must replicate that same derivation so
// an inbox item added via Realtime lands in the same filter bucket as one
// loaded via REST. Mapping confirmed by the backend.

describe('deriveCategoryFromTemplateCode', () => {
  it.each([
    ['APPLICATION_RECEIVED', 'application'],
    ['APPLICATION_APPROVED', 'application'],
    ['PAYMENT_RECEIPT_UPLOADED', 'payment'],
    ['PAYMENT_OVERDUE', 'payment'],
    ['RECEIPT_GENERATED', 'payment'],
    ['VISIT_REQUESTED', 'visit'],
    ['VISIT_REMINDER_24H', 'visit'],
    ['CONTRACT_READY_TO_SIGN', 'contract'],
    ['LEASE_EXPIRING_SOON', 'lease'],
    ['PROPERTY_PUBLISHED', 'property'],
    ['DOCUMENT_UPLOADED', 'document'],
  ])('maps %s → %s', (code, expected) => {
    expect(deriveCategoryFromTemplateCode(code)).toBe(expected);
  });

  it('falls back to "general" for unknown codes', () => {
    expect(deriveCategoryFromTemplateCode('SOMETHING_WEIRD')).toBe('general');
  });

  it('falls back to "general" for an empty code', () => {
    expect(deriveCategoryFromTemplateCode('')).toBe('general');
  });
});

// ============================================================================
// mapRealtimeRowToBackendNotification
// ============================================================================
// postgres_changes payloads carry raw DB columns (snake_case), unlike the REST
// response (camelCase). This maps a notification_logs row to the same
// BackendNotification shape the REST mappers already consume, so a single
// downstream mapping path (mapToLandlord/TenantNotification) stays in play.

describe('mapRealtimeRowToBackendNotification', () => {
  it('maps a snake_case notification_logs row to BackendNotification', () => {
    const row = {
      id: 'notif-1',
      template_code: 'APPLICATION_RECEIVED',
      subject: 'Nueva aplicación',
      body: 'Juan aplicó a tu propiedad',
      action_url: '/panel/candidatos/1',
      metadata: { applicationId: 'app-1' },
      read_at: null,
      created_at: '2026-08-09T10:00:00Z',
      channel: 'IN_APP',
      user_id: 'user-1',
    };

    expect(mapRealtimeRowToBackendNotification(row)).toEqual({
      id: 'notif-1',
      type: 'APPLICATION_RECEIVED',
      category: 'application',
      title: 'Nueva aplicación',
      message: 'Juan aplicó a tu propiedad',
      read: false,
      createdAt: '2026-08-09T10:00:00Z',
      actionUrl: '/panel/candidatos/1',
      metadata: { applicationId: 'app-1' },
    });
  });

  it('marks read=true when read_at is set', () => {
    const row = {
      id: 'n2',
      template_code: 'PAYMENT_APPROVED',
      subject: 'Pago aprobado',
      read_at: '2026-08-09T11:00:00Z',
      created_at: '2026-08-09T10:00:00Z',
      channel: 'IN_APP',
      user_id: 'user-1',
    };
    expect(mapRealtimeRowToBackendNotification(row).read).toBe(true);
  });

  it('leaves actionUrl undefined when action_url is null/absent', () => {
    const row = {
      id: 'n3',
      template_code: 'LEASE_EXPIRED',
      subject: 'Arriendo vencido',
      action_url: null,
      read_at: null,
      created_at: '2026-08-09T10:00:00Z',
      channel: 'IN_APP',
      user_id: 'user-1',
    };
    expect(mapRealtimeRowToBackendNotification(row).actionUrl).toBeUndefined();
  });

  it('defaults message to empty string when body is absent', () => {
    const row = {
      id: 'n4',
      template_code: 'CONTRACT_COMPLETED',
      subject: 'Contrato completo',
      read_at: null,
      created_at: '2026-08-09T10:00:00Z',
      channel: 'IN_APP',
      user_id: 'user-1',
    };
    expect(mapRealtimeRowToBackendNotification(row).message).toBe('');
  });
});
